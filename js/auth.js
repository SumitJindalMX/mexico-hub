(() => {
  const cfg = window.GDL_AUTH;

  function readSession() {
    try {
      const raw = sessionStorage.getItem(cfg.sessionKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeSession(session) {
    sessionStorage.setItem(cfg.sessionKey, JSON.stringify(session));
  }

  function clearSession() {
    sessionStorage.removeItem(cfg.sessionKey);
  }

  function isAuthorizedLogin(login) {
    const needle = String(login || "").toLowerCase();
    return cfg.authorizedUsers.some((u) => u.toLowerCase() === needle);
  }

  async function githubFetch(path, token, options = {}) {
    const res = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {}),
      },
    });
    return res;
  }

  async function signIn(token) {
    const trimmed = String(token || "").trim();
    if (!trimmed) throw new Error("Paste a GitHub personal access token.");

    const res = await githubFetch("/user", trimmed);
    if (!res.ok) {
      throw new Error(
        res.status === 401
          ? "Token rejected by GitHub. Check the PAT and try again."
          : `GitHub user lookup failed (${res.status}).`,
      );
    }
    const user = await res.json();
    if (!isAuthorizedLogin(user.login)) {
      throw new Error(
        `@${user.login} is not on the GDL editor allowlist. Ask a site admin to add you in js/auth-config.js.`,
      );
    }

    const session = {
      login: user.login,
      name: user.name || user.login,
      avatar: user.avatar_url,
      token: trimmed,
      signedInAt: new Date().toISOString(),
    };
    writeSession(session);
    return session;
  }

  function signOut() {
    clearSession();
  }

  function getSession() {
    const session = readSession();
    if (!session?.token || !session?.login) return null;
    if (!isAuthorizedLogin(session.login)) {
      clearSession();
      return null;
    }
    return session;
  }

  window.GDLAuth = {
    signIn,
    signOut,
    getSession,
    isAuthorizedLogin,
    githubFetch,
    config: cfg,
  };
})();
