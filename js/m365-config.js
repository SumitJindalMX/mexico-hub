/**
 * Microsoft 365 / Entra SPA config (no secrets).
 * Fill tenantId + clientId after IT creates the Entra app registration.
 * See sharepoint/lists-setup.md
 */
window.GDL_M365 = {
  /** Set to true once Entra + SharePoint lists are ready */
  enabled: false,

  /** Amdocs Entra tenant ID (Directory ID) */
  tenantId: "YOUR_TENANT_ID",

  /** SPA application (client) ID */
  clientId: "YOUR_CLIENT_ID",

  /** Must match Entra redirect URIs */
  redirectUri:
    typeof location !== "undefined"
      ? `${location.origin}${location.pathname.replace(/index\.html$/, "")}`
      : "https://sumitjindalmx.github.io/gdl-site-visibility/",

  /** Graph scopes (delegated) */
  scopes: ["User.Read", "Sites.ReadWrite.All"],

  /**
   * SharePoint site hosting GDL lists/library.
   * Example: https://amdocs.sharepoint.com/sites/GDLVisibility
   */
  siteUrl: "https://amdocs.sharepoint.com/sites/GDLVisibility",

  lists: {
    invites: "GDL_Invites",
    registrations: "GDL_Registrations",
    teamMembers: "GDL_TeamMembers",
  },

  /** Document library for PPT / video */
  uploadsLibrary: "GDL_Uploads",

  /**
   * Organizer UPNs (case-insensitive) who can create invites
   * and view all registrations for an event.
   */
  organizerUpns: [
    // "sumit.jindal@amdocs.com",
  ],

  /** Soft email domain hint (Entra tenant is the real gate) */
  companyEmailDomains: ["amdocs.com"],

  /** Upload caps (bytes) — also constrained by SharePoint tenant */
  maxPptBytes: 50 * 1024 * 1024,
  maxVideoBytes: 250 * 1024 * 1024,

  authority() {
    return `https://login.microsoftonline.com/${this.tenantId}`;
  },

  isConfigured() {
    return (
      this.enabled &&
      this.tenantId &&
      !this.tenantId.startsWith("YOUR_") &&
      this.clientId &&
      !this.clientId.startsWith("YOUR_")
    );
  },
};
