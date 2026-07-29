/**
 * Authorization + role allowlists for Mexico Hub.
 * Editors need write access to this repo + a PAT with Contents: Read & Write.
 */
window.GDL_AUTH = {
  owner: "SumitJindalMX",
  repo: "mexico-hub",
  eventsPath: "data/events.json",
  scoresPath: "data/scores.json",
  galleryPath: "data/gallery.json",
  notificationsPath: "data/notifications.json",
  registrationsPath: "data/registrations.json",
  /**
   * Inbox that receives team registrations via Gmail compose.
   */
  registrationInbox: "sumit.jindal@amdocs.com",
  /**
   * Legacy editor list (kept for compatibility). Prefer roles.editors.
   */
  authorizedUsers: ["SumitJindalMX"],
  /**
   * GitHub logins (case-insensitive) per role.
   * Editor implies organizer powers; organizer does not imply judge.
   */
  roles: {
    editors: ["SumitJindalMX"],
    organizers: ["SumitJindalMX"],
    judges: ["SumitJindalMX"],
  },
  /**
   * Master switch for Microsoft Entra / SharePoint.
   * Flip to false to hide Microsoft sign-in if consent / redirect still fails.
   */
  entraEnabled: true,
  sessionKey: "gdl.editor.session",
};
