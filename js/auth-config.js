/**
 * Authorization config for GDL editors.
 * Add GitHub usernames (case-insensitive) who may create events.
 * Editors need write access to this repo + a PAT with Contents: Read & Write.
 */
window.GDL_AUTH = {
  owner: "SumitJindalMX",
  repo: "mexico-hub",
  eventsPath: "data/events.json",
  /**
   * Inbox that receives team registrations via Gmail compose.
   * Change to your Amdocs / Gmail address.
   */
  registrationInbox: "sumit.jindal@amdocs.com",
  /** GitHub logins allowed to create / publish events */
  authorizedUsers: [
    "SumitJindalMX",
    // "AnotherGitHubUser",
  ],
  sessionKey: "gdl.editor.session",
};
