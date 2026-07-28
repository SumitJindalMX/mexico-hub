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
  clientId: "552990941460-oa958pl87fbg2b2lrbd7fsqbd257t87c.apps.googleusercontent.com",

  /**
   * Identity + Drive (upload PPT/video without SharePoint).
   * Enable "Google Drive API" in Google Cloud → APIs & Services → Library.
   * Add scope on OAuth consent screen if prompted.
   */
  scopes:
    "openid email profile https://www.googleapis.com/auth/drive.file",

  maxPptBytes: 50 * 1024 * 1024,
  maxVideoBytes: 250 * 1024 * 1024,

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
