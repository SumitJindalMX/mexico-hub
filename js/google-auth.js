(() => {
  const cfg = () => window.GDL_GOOGLE;

  let profile = null;
  let accessToken = null;

  function redirectUri() {
    if (typeof location === "undefined") {
      return "https://sumitjindalmx.github.io/mexico-hub/";
    }
    const path = location.pathname.replace(/index\.html$/i, "");
    const withSlash = path.endsWith("/") ? path : `${path}/`;
    return `${location.origin}${withSlash}`;
  }

  function randomNonce() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function parseJwt(token) {
    const part = token.split(".")[1];
    if (!part) throw new Error("Invalid Google ID token.");
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(
      decodeURIComponent(
        [...json]
          .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join(""),
      ),
    );
  }

  function persist() {
    if (!profile) {
      sessionStorage.removeItem(cfg().sessionKey);
      return;
    }
    sessionStorage.setItem(
      cfg().sessionKey,
      JSON.stringify({
        profile,
        accessToken,
        savedAt: Date.now(),
      }),
    );
  }

  function restore() {
    try {
      const raw = sessionStorage.getItem(cfg().sessionKey);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      if (Date.now() - (saved.savedAt || 0) > 55 * 60 * 1000) {
        sessionStorage.removeItem(cfg().sessionKey);
        return null;
      }
      profile = saved.profile || null;
      accessToken = saved.accessToken || null;
      return profile;
    } catch {
      return null;
    }
  }

  function assertDomain(email) {
    const domains = cfg().allowedEmailDomains || [];
    if (!domains.length) return;
    const domain = String(email || "")
      .split("@")[1]
      ?.toLowerCase();
    if (!domain || !domains.some((d) => d.toLowerCase() === domain)) {
      throw new Error(
        `Google account must use one of: ${domains.join(", ")}. Signed in as ${email || "unknown"}.`,
      );
    }
  }

  function profileFromClaims(claims) {
    const email = claims.email || "";
    assertDomain(email);
    return {
      name: claims.name || email,
      email,
      picture: claims.picture || "",
      sub: claims.sub || "",
      provider: "google",
    };
  }

  function clearHashAuthParams() {
    if (!location.hash || location.hash.length < 2) return;
    const params = new URLSearchParams(location.hash.slice(1));
    if (
      !params.has("id_token") &&
      !params.has("access_token") &&
      !params.has("error")
    ) {
      return;
    }
    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}`,
    );
  }

  function consumeRedirectResult() {
    if (!location.hash || location.hash.length < 2) return null;
    const params = new URLSearchParams(location.hash.slice(1));
    const err = params.get("error");
    if (err) {
      clearHashAuthParams();
      const desc = params.get("error_description") || err;
      throw new Error(formatGoogleError(desc));
    }
    const idToken = params.get("id_token");
    if (!idToken) return null;

    const expectedNonce = sessionStorage.getItem("gdl.google.nonce");
    const claims = parseJwt(idToken);
    if (expectedNonce && claims.nonce && claims.nonce !== expectedNonce) {
      clearHashAuthParams();
      throw new Error("Google sign-in nonce mismatch. Try again.");
    }
    sessionStorage.removeItem("gdl.google.nonce");
    accessToken = params.get("access_token") || null;
    profile = profileFromClaims(claims);
    persist();
    clearHashAuthParams();
    return profile;
  }

  function formatGoogleError(raw) {
    const msg = String(raw || "");
    if (/origin_mismatch| Cosmic |redirect_uri_mismatch/i.test(msg) || /redirect_uri/i.test(msg)) {
      return (
        "Google rejected this site origin/redirect.\n\n" +
        "In Google Cloud → Credentials → your Web client, set BOTH:\n" +
        "• Authorized JavaScript origins: https://sumitjindalmx.github.io\n" +
        "• Authorized redirect URIs: https://sumitjindalmx.github.io/mexico-hub/\n\n" +
        `(Expected redirect: ${redirectUri()})`
      );
    }
    if (/access_denied|disallowed|testing/i.test(msg)) {
      return (
        "Google blocked sign-in (app may be in Testing).\n\n" +
        "OAuth consent screen → Test users → add your Google account."
      );
    }
    return msg;
  }

  function buildAuthUrl() {
    const nonce = randomNonce();
    sessionStorage.setItem("gdl.google.nonce", nonce);
    const params = new URLSearchParams({
      client_id: cfg().clientId,
      redirect_uri: redirectUri(),
      response_type: "id_token token",
      scope: cfg().scopes,
      nonce,
      prompt: "select_account",
      include_granted_scopes: "true",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  function waitForGis(timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      const started = Date.now();
      const timer = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(timer);
          resolve();
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(timer);
          reject(new Error("GIS unavailable"));
        }
      }, 50);
    });
  }

  async function fetchUserInfo(token) {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Google userinfo failed (${res.status})`);
    }
    return profileFromClaims(await res.json());
  }

  function loginViaRedirect() {
    if (!cfg().isConfigured()) {
      throw new Error(
        "Google clientId missing in js/google-config.js. See google/setup.md.",
      );
    }
    location.assign(buildAuthUrl());
    return new Promise(() => {});
  }

  async function loginViaGisPopup() {
    await waitForGis();
    return new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: cfg().clientId,
        scope: cfg().scopes,
        callback: async (resp) => {
          if (resp.error) {
            reject(new Error(formatGoogleError(resp.error_description || resp.error)));
            return;
          }
          try {
            accessToken = resp.access_token;
            profile = await fetchUserInfo(accessToken);
            persist();
            resolve(profile);
          } catch (err) {
            accessToken = null;
            profile = null;
            persist();
            reject(err);
          }
        },
        error_callback: (err) => {
          reject(
            new Error(
              formatGoogleError(
                err?.message || err?.type || "Google sign-in cancelled.",
              ),
            ),
          );
        },
      });
      client.requestAccessToken({ prompt: "select_account" });
    });
  }

  async function init() {
    if (!cfg().isConfigured()) return null;
    try {
      const fromRedirect = consumeRedirectResult();
      if (fromRedirect) return fromRedirect;
    } catch (err) {
      console.error(err);
      alert(err.message || "Google sign-in failed.");
    }
    return restore();
  }

  function getProfile() {
    return profile;
  }

  function getAccessToken() {
    return accessToken;
  }

  /**
   * Prefer redirect (works when GIS script is blocked by Zscaler).
   * Optional: try popup first if GIS already loaded.
   */
  async function login() {
    if (!cfg().isConfigured()) {
      throw new Error(
        "Google sign-in is not configured yet. See google/setup.md.",
      );
    }
    // If GIS is already present, try popup (stays on page). Else redirect.
    if (window.google?.accounts?.oauth2) {
      try {
        return await loginViaGisPopup();
      } catch (err) {
        // Fall through to redirect for origin / popup issues
        console.warn("Google popup failed, using redirect:", err);
      }
    }
    return loginViaRedirect();
  }

  async function logout() {
    const token = accessToken;
    profile = null;
    accessToken = null;
    persist();
    sessionStorage.removeItem("gdl.google.nonce");
    if (token && window.google?.accounts?.oauth2?.revoke) {
      await new Promise((resolve) => {
        window.google.accounts.oauth2.revoke(token, () => resolve());
      });
    }
  }

  function isConfigured() {
    return cfg().isConfigured();
  }

  window.GDLGoogleAuth = {
    init,
    login,
    logout,
    getProfile,
    getAccessToken,
    isConfigured,
    redirectUri,
  };
})();
