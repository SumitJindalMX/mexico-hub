(() => {
  const cfg = () => window.GDL_GOOGLE;

  let tokenClient = null;
  let profile = null;
  let accessToken = null;

  function waitForGis(timeoutMs = 12000) {
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
          reject(
            new Error(
              "Google Identity Services did not load. Check that https://accounts.google.com/gsi/client is not blocked (Zscaler/firewall), then hard-refresh.",
            ),
          );
        }
      }, 50);
    });
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
      // Soft TTL — GIS access tokens are short-lived (~1h)
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

  async function fetchUserInfo(token) {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Google userinfo failed (${res.status})`);
    }
    const info = await res.json();
    assertDomain(info.email);
    return {
      name: info.name || info.email || "",
      email: info.email || "",
      picture: info.picture || "",
      sub: info.sub || "",
      provider: "google",
    };
  }

  async function ensureTokenClient() {
    if (!cfg().isConfigured()) {
      throw new Error(
        "Google sign-in is not configured yet. Create an OAuth Web client in Google Cloud Console and set clientId in js/google-config.js. See google/setup.md.",
      );
    }
    await waitForGis();
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: cfg().clientId,
        scope: cfg().scopes,
        callback: () => {},
        error_callback: () => {},
      });
    }
    return tokenClient;
  }

  function requestAccessToken(prompt) {
    return new Promise(async (resolve, reject) => {
      try {
        const client = await ensureTokenClient();
        client.callback = async (resp) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error));
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
        };
        client.error_callback = (err) => {
          reject(
            new Error(
              err?.message ||
                err?.type ||
                "Google sign-in was cancelled or failed.",
            ),
          );
        };
        client.requestAccessToken({ prompt: prompt || "" });
      } catch (err) {
        reject(err);
      }
    });
  }

  async function init() {
    if (!cfg().isConfigured()) return null;
    try {
      await waitForGis();
    } catch {
      return null;
    }
    return restore();
  }

  function getProfile() {
    return profile;
  }

  function getAccessToken() {
    return accessToken;
  }

  async function login() {
    return requestAccessToken("consent");
  }

  async function logout() {
    const token = accessToken;
    profile = null;
    accessToken = null;
    persist();
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
  };
})();
