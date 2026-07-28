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
      message: `chore: add event by @${actor}`,
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
      audience: form.audience.trim() || "GDL",
      highlight: form.highlight.trim() || "",
      visibility: form.visibility,
      registrationOpen: Boolean(form.registrationOpen),
      confidence: form.confidence || "Editor",
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
    slugify,
  };
})();
