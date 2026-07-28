(() => {
  const cfg = () => window.GDL_M365;

  let pca = null;
  let account = null;

  function ensureMsal() {
    if (typeof window.msal === "undefined" || !window.msal.PublicClientApplication) {
      throw new Error(
        "MSAL library not loaded. Use the site URL with a trailing slash " +
          "(…/mexico-hub/) and hard-refresh. Check Network that " +
          "js/vendor/msal-browser.min.js returns 200.",
      );
    }
    if (!cfg().isConfigured()) {
      throw new Error(
        "M365 app not linked yet. An admin must create an Entra SPA app and set " +
          "clientId + enabled:true in js/m365-config.js (tenantId is already known). " +
          "See sharepoint/lists-setup.md — then push to GitHub Pages.",
      );
    }
    if (!pca) {
      pca = new window.msal.PublicClientApplication({
        auth: {
          clientId: cfg().clientId,
          authority: cfg().authority(),
          redirectUri: cfg().redirectUri,
        },
        cache: {
          cacheLocation: "sessionStorage",
          storeAuthStateInCookie: false,
        },
      });
    }
    return pca;
  }

  async function init() {
    if (!cfg().isConfigured()) return null;
    const app = ensureMsal();
    await app.initialize();
    const result = await app.handleRedirectPromise();
    if (result?.account) {
      account = result.account;
      app.setActiveAccount(account);
    } else {
      account = app.getActiveAccount() || app.getAllAccounts()[0] || null;
      if (account) app.setActiveAccount(account);
    }
    return getProfile();
  }

  function getProfile() {
    if (!account) return null;
    const upn =
      account.username ||
      account.idTokenClaims?.preferred_username ||
      account.idTokenClaims?.email ||
      "";
    return {
      name: account.name || upn,
      upn,
      email: upn,
      account,
    };
  }

  function isOrganizer(profile) {
    if (!profile?.upn) return false;
    const needle = profile.upn.toLowerCase();
    return cfg().organizerUpns.some((u) => u.toLowerCase() === needle);
  }

  async function login() {
    const app = ensureMsal();
    await app.initialize();
    try {
      const result = await app.loginPopup({
        scopes: cfg().scopes,
        prompt: "select_account",
      });
      account = result.account;
      app.setActiveAccount(account);
      return getProfile();
    } catch (err) {
      const msg = String(err?.message || err || "");
      const code = String(err?.errorCode || err?.error || "");
      if (
        /AADSTS65001|AADSTS65004|AADSTS90094|consent_required|access_denied|admin/i.test(
          `${msg} ${code}`,
        ) ||
        /approval|submitted|admin consent/i.test(msg)
      ) {
        throw new Error(
          "Microsoft is waiting for an Amdocs Entra admin to approve this app. " +
            "You cannot approve it yourself. Ask Identity/IT to open Azure Portal → " +
            "Entra ID → Admin consent requests (or Enterprise applications → " +
            "Mexico Hub → Permissions → Grant admin consent). " +
            "App client ID: " +
            cfg().clientId,
        );
      }
      throw err;
    }
  }

  async function logout() {
    if (!pca || !account) {
      account = null;
      return;
    }
    await pca.logoutPopup({ account });
    account = null;
  }

  async function getAccessToken() {
    const app = ensureMsal();
    await app.initialize();
    if (!account) {
      account = app.getActiveAccount() || app.getAllAccounts()[0] || null;
    }
    if (!account) {
      throw new Error("Sign in with your company Microsoft account first.");
    }
    try {
      const silent = await app.acquireTokenSilent({
        account,
        scopes: cfg().scopes,
      });
      return silent.accessToken;
    } catch {
      const interactive = await app.acquireTokenPopup({
        account,
        scopes: cfg().scopes,
      });
      return interactive.accessToken;
    }
  }

  window.GDLM365Auth = {
    init,
    login,
    logout,
    getProfile,
    getAccessToken,
    isOrganizer,
    isConfigured: () => cfg().isConfigured(),
  };
})();
