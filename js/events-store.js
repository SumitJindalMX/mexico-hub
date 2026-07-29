(() => {
  const cfg = () => window.GDL_AUTH;

  function toBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  function fromBase64Utf8(b64) {
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function slugify(name) {
    return String(name || "event")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  async function loadPublicEvents() {
    const url = `data/events.json?t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not load events.json (${res.status})`);
    const payload = await res.json();
    return Array.isArray(payload.events) ? payload.events : [];
  }

  async function getRemoteFile(token) {
    const { owner, repo, eventsPath } = cfg();
    const res = await window.GDLAuth.githubFetch(
      `/repos/${owner}/${repo}/contents/${eventsPath}`,
      token,
    );
    if (res.status === 404) {
      return { sha: null, events: [], updatedAt: null };
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Read events file failed (${res.status}): ${body.slice(0, 180)}`);
    }
    const file = await res.json();
    const parsed = JSON.parse(fromBase64Utf8(file.content.replace(/\n/g, "")));
    return {
      sha: file.sha,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      updatedAt: parsed.updatedAt || null,
    };
  }

  async function saveEvents(token, events, sha, actor) {
    const { owner, repo, eventsPath } = cfg();
    const payload = {
      updatedAt: new Date().toISOString().slice(0, 10),
      events,
    };
    const body = {
      message: `chore: catalog update by @${actor}`,
      content: toBase64Utf8(JSON.stringify(payload, null, 2) + "\n"),
      branch: "main",
    };
    if (sha) body.sha = sha;

    const res = await window.GDLAuth.githubFetch(
      `/repos/${owner}/${repo}/contents/${eventsPath}`,
      token,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(
        res.status === 409
          ? "Someone else updated events at the same time. Refresh and try again."
          : `Publish failed (${res.status}): ${errText.slice(0, 220)}`,
      );
    }
    return res.json();
  }

  async function updateEvent(form, session) {
    if (!session?.token) throw new Error("Sign in as an authorized editor first.");
    const id = (form.id || "").trim();
    if (!id) throw new Error("Missing event id for update.");
    const remote = await getRemoteFile(session.token);
    const idx = remote.events.findIndex((e) => e.id === id);
    if (idx < 0) throw new Error("Event not found in the catalog.");
    const prev = remote.events[idx];
    const sortKey =
      form.sortKey.trim() || prev.sortKey || new Date().toISOString().slice(0, 10);
    const updated = {
      ...prev,
      name: form.name.trim() || prev.name,
      category: form.category || prev.category,
      status: form.status || prev.status,
      when: form.when.trim() || prev.when,
      sortKey,
      audience: form.audience.trim() || prev.audience,
      highlight: form.highlight.trim() || prev.highlight,
      visibility: form.visibility || prev.visibility,
      registrationOpen: Boolean(form.registrationOpen),
      confidence: form.confidence || prev.confidence || "Editor",
      pptUrl: (form.pptUrl || "").trim(),
      videoUrl: (form.videoUrl || "").trim(),
      city: (form.city || prev.city || "Mexico").trim() || "Mexico",
      capacity:
        form.capacity === "" || form.capacity == null
          ? prev.capacity ?? null
          : Number(form.capacity) || null,
      registrationClosesAt: (form.registrationClosesAt || "").trim() || prev.registrationClosesAt || "",
      demoSlots: Array.isArray(form.demoSlots) ? form.demoSlots : prev.demoSlots || [],
      updatedBy: session.login,
      updatedAt: new Date().toISOString(),
      sourceNote:
        form.confidence === "Verified"
          ? "Confirmed against official Mexico / site ops calendar."
          : form.confidence === "Seed"
            ? "Seeded / illustrative — not an official calendar entry."
            : `Updated by GitHub editor @${session.login}`,
    };
    const next = [...remote.events];
    next[idx] = updated;
    await saveEvents(session.token, next, remote.sha, session.login);
    return { event: updated, events: next };
  }

  async function setRegistrationOpen(eventId, open, session) {
    if (!session?.token) throw new Error("Sign in as an authorized editor first.");
    const remote = await getRemoteFile(session.token);
    const idx = remote.events.findIndex((e) => e.id === eventId);
    if (idx < 0) throw new Error("Event not found.");
    const next = [...remote.events];
    next[idx] = {
      ...next[idx],
      registrationOpen: Boolean(open),
      updatedBy: session.login,
      updatedAt: new Date().toISOString(),
    };
    await saveEvents(session.token, next, remote.sha, session.login);
    return { event: next[idx], events: next };
  }

  // enrich create with city
  function buildEvent(form, actor) {
    const name = form.name.trim();
    if (!name) throw new Error("Event name is required.");
    const base = slugify(name) || "event";
    const id = `${base}-${Date.now().toString(36)}`;
    const sortKey = form.sortKey.trim() || new Date().toISOString().slice(0, 10);

    return {
      id,
      name,
      category: form.category,
      status: form.status,
      when: form.when.trim() || "TBD",
      sortKey,
      audience: form.audience.trim() || "Mexico",
      highlight: form.highlight.trim() || "",
      visibility: form.visibility,
      registrationOpen: Boolean(form.registrationOpen),
      confidence: form.confidence || "Editor",
      city: (form.city || "Mexico").trim() || "Mexico",
      capacity:
        form.capacity === "" || form.capacity == null
          ? null
          : Number(form.capacity) || null,
      registrationClosesAt: (form.registrationClosesAt || "").trim(),
      demoSlots: Array.isArray(form.demoSlots) ? form.demoSlots : [],
      pptUrl: (form.pptUrl || "").trim(),
      videoUrl: (form.videoUrl || "").trim(),
      sourceNote:
        form.confidence === "Verified"
          ? "Confirmed against official Mexico / site ops calendar."
          : form.confidence === "Seed"
            ? "Seeded / illustrative — not an official calendar entry."
            : `Published by GitHub editor @${actor}`,
      createdBy: actor,
      createdAt: new Date().toISOString(),
    };
  }

  async function patchEventFields(eventId, patch, session) {
    if (!session?.token) throw new Error("Sign in as an authorized editor first.");
    const remote = await getRemoteFile(session.token);
    const idx = remote.events.findIndex((e) => e.id === eventId);
    if (idx < 0) throw new Error("Event not found.");
    const next = [...remote.events];
    next[idx] = {
      ...next[idx],
      ...patch,
      updatedBy: session.login,
      updatedAt: new Date().toISOString(),
    };
    await saveEvents(session.token, next, remote.sha, session.login);
    return { event: next[idx], events: next };
  }

  async function createEvent(form, session) {
    if (!session?.token) throw new Error("Sign in as an authorized editor first.");
    const remote = await getRemoteFile(session.token);
    const event = buildEvent(form, session.login);
    if (remote.events.some((e) => e.id === event.id)) {
      event.id = `${event.id}-x`;
    }
    const next = [...remote.events, event];
    await saveEvents(session.token, next, remote.sha, session.login);
    return { event, events: next };
  }

  window.GDLEventsStore = {
    loadPublicEvents,
    createEvent,
    updateEvent,
    setRegistrationOpen,
    patchEventFields,
    slugify,
  };
})();
