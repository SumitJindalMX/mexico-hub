(() => {
  const cfg = () => window.GDL_AUTH;
  const PATH = "data/invites.json";

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

  function randomCode(len = 8) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return [...arr].map((n) => alphabet[n % alphabet.length]).join("");
  }

  async function loadPublic() {
    const res = await fetch(`${PATH}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const payload = await res.json();
    return Array.isArray(payload.invites) ? payload.invites : [];
  }

  async function getRemote(token) {
    const { owner, repo } = cfg();
    const res = await window.GDLAuth.githubFetch(
      `/repos/${owner}/${repo}/contents/${PATH}`,
      token,
    );
    if (res.status === 404) return { sha: null, invites: [] };
    if (!res.ok) throw new Error(`Read invites failed (${res.status})`);
    const file = await res.json();
    const parsed = JSON.parse(fromBase64Utf8(file.content.replace(/\n/g, "")));
    return {
      sha: file.sha,
      invites: Array.isArray(parsed.invites) ? parsed.invites : [],
    };
  }

  async function saveRemote(token, invites, sha, actor) {
    const { owner, repo } = cfg();
    const payload = {
      updatedAt: new Date().toISOString().slice(0, 10),
      invites,
    };
    const body = {
      message: `chore: invite codes by @${actor}`,
      content: toBase64Utf8(JSON.stringify(payload, null, 2) + "\n"),
      branch: "main",
    };
    if (sha) body.sha = sha;
    const res = await window.GDLAuth.githubFetch(
      `/repos/${owner}/${repo}/contents/${PATH}`,
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
          ? "Someone else updated invites. Refresh and try again."
          : `Invite publish failed (${res.status}): ${errText.slice(0, 220)}`,
      );
    }
    return res.json();
  }

  function buildInvite({ eventId, maxUses, expiresOn, createdBy }) {
    return {
      id: `inv-${Date.now().toString(36)}`,
      eventId,
      code: randomCode(8),
      maxUses: Number(maxUses) || 50,
      usedCount: 0,
      active: true,
      expiresOn: expiresOn || null,
      channel: "github",
      createdAt: new Date().toISOString(),
      createdBy: createdBy || "",
    };
  }

  function assertValid(invite) {
    if (!invite) throw new Error("Invite code not found for this event.");
    if (!invite.active) throw new Error("This invite code is inactive.");
    if (invite.expiresOn) {
      const end = new Date(`${invite.expiresOn}T23:59:59`);
      if (Date.now() > end.getTime()) {
        throw new Error("This invite code has expired.");
      }
    }
    if (
      typeof invite.maxUses === "number" &&
      invite.usedCount >= invite.maxUses
    ) {
      throw new Error("This invite code has reached its maximum uses.");
    }
  }

  async function findPublic(eventId, code) {
    const needle = (code || "").trim().toUpperCase();
    if (!needle || needle === "OPEN") return null;
    const invites = await loadPublic();
    return (
      invites.find(
        (i) =>
          i.eventId === eventId && (i.code || "").toUpperCase() === needle,
      ) || null
    );
  }

  async function createViaGitHubEditor(fields, session) {
    if (!session?.token) {
      throw new Error("Editor GitHub sign-in required to publish invite codes.");
    }
    const remote = await getRemote(session.token);
    const invite = buildInvite({
      ...fields,
      createdBy: session.login,
    });
    const next = [...remote.invites, invite];
    await saveRemote(session.token, next, remote.sha, session.login);
    return invite;
  }

  function inviteEmailBody(invite, eventName, siteUrl) {
    return [
      `You're invited to register a team for: ${eventName || invite.eventId}`,
      ``,
      `Invite code: ${invite.code}`,
      `Max uses: ${invite.maxUses}`,
      invite.expiresOn ? `Expires: ${invite.expiresOn}` : null,
      ``,
      `Register here:`,
      siteUrl || "https://sumitjindalmx.github.io/mexico-hub/",
      ``,
      `Steps: open the event → Register team → enter the invite code → submit via Gmail or GitHub.`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  function openGmailInvite(invite, eventName, toEmails) {
    const to = (toEmails || "")
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(",");
    const subject = encodeURIComponent(
      `[Mexico Hub] Invite code for ${eventName || invite.eventId}`,
    );
    const body = encodeURIComponent(
      inviteEmailBody(
        invite,
        eventName,
        typeof location !== "undefined" ? location.href.split("#")[0] : "",
      ),
    );
    const url = to
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${subject}&body=${body}`
      : `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
    window.open(url, "_blank", "noopener");
  }

  window.GDLInvitesStore = {
    loadPublic,
    findPublic,
    assertValid,
    buildInvite,
    createViaGitHubEditor,
    openGmailInvite,
    inviteEmailBody,
    randomCode,
  };
})();
