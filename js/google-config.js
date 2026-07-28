/**
 * Google Identity Services (OAuth) config — no secrets.
 * Create a Web client in Google Cloud Console, then set clientId.
 * See google/setup.md
 */
window.GDL_GOOGLE = {
  /** Set false to hide Google sign-in */
  enabled: true,

  /**
   * OAuth 2.0 Web client ID from Google Cloud Console
   * (APIs & Services → Credentials → Create OAuth client ID → Web application)
   */
  clientId: "",

  /** Scopes for identity (add drive.file later if you want Drive uploads) */
  scopes: "openid email profile",

  /** Optional: only allow these email domains (empty = any Google account) */
  allowedEmailDomains: [
    // "amdocs.com",
    // "gmail.com",
  ],

  sessionKey: "gdl.google.session",

  isConfigured() {
    return (
      this.enabled &&
      !!this.clientId &&
      !this.clientId.startsWith("YOUR_") &&
      this.clientId.includes(".apps.googleusercontent.com")
    );
  },
};
