/**
 * Microsoft 365 / Entra SPA config (no secrets).
 * Master enable is also gated by window.GDL_AUTH.entraEnabled (keep false until consent).
 */
window.GDL_M365 = {
  /** Local M365 module switch — still requires GDL_AUTH.entraEnabled === true */
  enabled: true,

  tenantId: "c8eca3ca-1276-46d5-9d9d-a0f2a028920f",
  clientId: "04d07e0d-5a22-4e10-81bd-6c76f93182fb",

  redirectUri:
    typeof location !== "undefined"
      ? `${location.origin}${location.pathname.replace(/index\.html$/, "")}`
      : "https://sumitjindalmx.github.io/mexico-hub/",

  scopes: ["User.Read", "Sites.ReadWrite.All"],

  siteUrl: "https://amdocs.sharepoint.com/sites/GDLVisibility",

  lists: {
    invites: "GDL_Invites",
    registrations: "GDL_Registrations",
    teamMembers: "GDL_TeamMembers",
  },

  uploadsLibrary: "GDL_Uploads",

  organizerUpns: [
    // "sumit.jindal@amdocs.com",
  ],

  companyEmailDomains: ["amdocs.com"],

  maxPptBytes: 50 * 1024 * 1024,
  maxVideoBytes: 250 * 1024 * 1024,

  authority() {
    return `https://login.microsoftonline.com/${this.tenantId}`;
  },

  isConfigured() {
    const entraOn = window.GDL_AUTH?.entraEnabled !== false;
    return (
      entraOn &&
      this.enabled &&
      this.tenantId &&
      !this.tenantId.startsWith("YOUR_") &&
      this.clientId &&
      !this.clientId.startsWith("YOUR_")
    );
  },
};
