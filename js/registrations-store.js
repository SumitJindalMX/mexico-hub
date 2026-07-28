(() => {
  const cfg = () => window.GDL_AUTH;
  const PATH = "data/registrations.json";

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

  async function loadPublic() {
    const res = await fetch(`${PATH}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return [];
    const payload = await res.json();
    return Array.isArray(payload.registrations) ? payload.registrations : [];
  }

  async function getRemote(token) {
    const { owner, repo } = cfg();
    const res = await window.GDLAuth.githubFetch(
      `/repos/${owner}/${repo}/contents/${PATH}`,
      token,
    );
    if (res.status === 404) return { sha: null, registrations: [] };
    if (!res.ok) {
      throw new Error(`Read registrations failed (${res.status})`);
    }
    const file = await res.json();
    const parsed = JSON.parse(fromBase64Utf8(file.content.replace(/\n/g, "")));
    return {
      sha: file.sha,
      registrations: Array.isArray(parsed.registrations)
        ? parsed.registrations
        : [],
    };
  }

  async function saveRemote(token, registrations, sha, actor) {
    const { owner, repo } = cfg();
    const payload = {
      updatedAt: new Date().toISOString().slice(0, 10),
      registrations,
    };
    const body = {
      message: `chore: team registration by @${actor}`,
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
          ? "Someone else submitted at the same time. Refresh and try again."
          : `Registration publish failed (${res.status}): ${errText.slice(0, 220)}`,
      );
    }
    return res.json();
  }

  function buildRecord(form) {
    const base = {
      id: `reg-${Date.now().toString(36)}`,
      eventId: form.eventId,
      teamName: form.teamName.trim(),
      leadName: form.leadName.trim(),
      leadEmail: form.leadEmail.trim(),
      inviteCode: (form.inviteCode || "OPEN").trim().toUpperCase(),
      members: form.members.filter((m) => m.name?.trim()),
      pptUrl: (form.pptUrl || "").trim(),
      videoUrl: (form.videoUrl || "").trim(),
      channel: form.channel || "github",
      createdAt: new Date().toISOString(),
      createdBy: form.createdBy || "",
    };
    const code = form.codeSnapshot || null;
    if (code) {
      base.repoUrl = code.repoUrl || "";
      base.language = code.language || "";
      base.codeProvided = Boolean(code.codeProvided);
      base.sourceCode = code.sourceCode || "";
      base.validation = code.validation || null;
    } else {
      base.repoUrl = (form.repoUrl || "").trim();
      base.language = form.language || "";
      base.codeProvided = Boolean((form.sourceCode || "").trim());
      base.sourceCode = (form.sourceCode || "").trim().slice(0, 12000);
      base.validation = form.validation || null;
    }
    return base;
  }

  async function submitViaGitHubEditor(form, session) {
    if (!session?.token) {
      throw new Error("Editor GitHub sign-in required for this submit path.");
    }
    const remote = await getRemote(session.token);
    const record = buildRecord({
      ...form,
      channel: "github",
      createdBy: session.login,
    });
    const next = [...remote.registrations, record];
    await saveRemote(session.token, next, remote.sha, session.login);
    return record;
  }

  function downloadJson(record) {
    const blob = new Blob([JSON.stringify(record, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${record.teamName || "registration"}-${record.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function registrationPlainText(record, eventName) {
    return [
      `Mexico Hub — team registration`,
      ``,
      `Event: ${eventName || record.eventId}`,
      `Event ID: ${record.eventId}`,
      `Team: ${record.teamName}`,
      `Lead: ${record.leadName} <${record.leadEmail}>`,
      `Invite: ${record.inviteCode}`,
      `PPT: ${record.pptUrl || "(none)"}`,
      `Video: ${record.videoUrl || "(none)"}`,
      `Repo: ${record.repoUrl || "(none)"}`,
      `Language: ${record.language || "(none)"}`,
      `Code provided: ${record.codeProvided ? "yes" : "no"}`,
      `Validation: ${record.validation?.summary || record.validation?.status || "(none)"}`,
      ``,
      `Members:`,
      ...(record.members.length
        ? record.members.map(
            (m) => `- ${m.name} <${m.email || ""}> (${m.role || "Member"})`,
          )
        : ["- (none)"]),
      ``,
      `JSON:`,
      JSON.stringify(record, null, 2),
    ].join("\n");
  }

  function openGitHubIssue(record, eventName) {
    const { owner, repo } = cfg();
    const title = encodeURIComponent(
      `[Registration] ${eventName || record.eventId} — ${record.teamName}`,
    );
    const body = encodeURIComponent(
      [
        `## Team registration (Mexico Hub)`,
        ``,
        `- **Event:** ${eventName || record.eventId}`,
        `- **Event ID:** \`${record.eventId}\``,
        `- **Team:** ${record.teamName}`,
        `- **Lead:** ${record.leadName} <${record.leadEmail}>`,
        `- **Invite:** ${record.inviteCode}`,
        `- **PPT:** ${record.pptUrl || "_none_"}`,
        `- **Video:** ${record.videoUrl || "_none_"}`,
        `- **Repo:** ${record.repoUrl || "_none_"}`,
        `- **Language:** ${record.language || "_none_"}`,
        `- **Code:** ${record.codeProvided ? "provided" : "_none_"}`,
        `- **Validation:** ${record.validation?.summary || record.validation?.status || "_none_"}`,
        ``,
        `### Members`,
        ...(record.members.length
          ? record.members.map(
              (m) => `- ${m.name} <${m.email || ""}> (${m.role || "Member"})`,
            )
          : ["- _none_"]),
        ``,
        `### Raw JSON`,
        "```json",
        JSON.stringify(record, null, 2),
        "```",
      ].join("\n"),
    );
    window.open(
      `https://github.com/${owner}/${repo}/issues/new?title=${title}&body=${body}`,
      "_blank",
      "noopener",
    );
  }

  function openGmailCompose(record, eventName) {
    const to = encodeURIComponent(cfg().registrationInbox || "");
    const subject = encodeURIComponent(
      `[Mexico Hub Registration] ${eventName || record.eventId} — ${record.teamName}`,
    );
    const body = encodeURIComponent(registrationPlainText(record, eventName));
    const url = to
      ? `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`
      : `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
    window.open(url, "_blank", "noopener");
  }

  window.GDLRegistrationsStore = {
    loadPublic,
    submitViaGitHubEditor,
    downloadJson,
    openGitHubIssue,
    openGmailCompose,
    buildRecord,
  };
})();
