(() => {
  const cfg = () => window.GDL_M365;

  let pca = null;
  let account = null;

  function ensureMsal() {
    if (typeof window.msal === "undefined" || !window.msal.PublicClientApplication) {
      throw new Error(
        "MSAL library not loaded. Ensure js/vendor/msal-browser.min.js is reachable (hard-refresh the page).",
      );
    }
    if (!cfg().isConfigured()) {
      throw new Error(
        "M365 is not configured yet. Set tenantId, clientId, and enabled in js/m365-config.js (see sharepoint/lists-setup.md).",
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
    const result = await app.loginPopup({
      scopes: cfg().scopes,
      prompt: "select_account",
    });
    account = result.account;
    app.setActiveAccount(account);
    return getProfile();
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
