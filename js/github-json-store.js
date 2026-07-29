/**
 * Shared GitHub JSON file helpers for Mexico Hub data/*.json stores.
 */
(() => {
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

  function ownerRepo() {
    const c = window.GDL_AUTH || {};
    return { owner: c.owner, repo: c.repo };
  }

  async function loadPublicJson(path, arrayKey) {
    const res = await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return arrayKey ? [] : {};
    const payload = await res.json();
    if (arrayKey) {
      return Array.isArray(payload[arrayKey]) ? payload[arrayKey] : [];
    }
    return payload;
  }

  async function getRemoteJson(path, token) {
    const { owner, repo } = ownerRepo();
    const res = await window.GDLAuth.githubFetch(
      `/repos/${owner}/${repo}/contents/${path}`,
      token,
    );
    if (res.status === 404) return { sha: null, payload: null };
    if (!res.ok) throw new Error(`Read ${path} failed (${res.status})`);
    const file = await res.json();
    const payload = JSON.parse(fromBase64Utf8(file.content.replace(/\n/g, "")));
    return { sha: file.sha, payload };
  }

  async function putRemoteJson(path, token, payload, message) {
    const { owner, repo } = ownerRepo();
    const remote = await getRemoteJson(path, token);
    const body = {
      message,
      content: toBase64Utf8(JSON.stringify(payload, null, 2) + "\n"),
      branch: "main",
    };
    if (remote.sha) body.sha = remote.sha;
    const res = await window.GDLAuth.githubFetch(
      `/repos/${owner}/${repo}/contents/${path}`,
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
          ? "Someone else updated at the same time. Refresh and try again."
          : `Publish ${path} failed (${res.status}): ${errText.slice(0, 220)}`,
      );
    }
    return res.json();
  }

  window.GDLJsonStore = {
    toBase64Utf8,
    fromBase64Utf8,
    loadPublicJson,
    getRemoteJson,
    putRemoteJson,
  };
})();
