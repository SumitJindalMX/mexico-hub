/**
 * Role helpers for Mexico Hub.
 * Roles: visitor | participant | judge | organizer | editor
 */
(() => {
  const ACTIONS = {
    browse: ["visitor", "participant", "judge", "organizer", "editor"],
    register: ["visitor", "participant", "judge", "organizer", "editor"],
    viewMyRegs: ["participant", "judge", "organizer", "editor"],
    score: ["judge", "organizer", "editor"],
    viewUnpublishedScores: ["judge", "organizer", "editor"],
    organize: ["organizer", "editor"],
    publishScores: ["organizer", "editor"],
    exportJudgePack: ["organizer", "editor"],
    editDemoSlots: ["organizer", "editor"],
    announce: ["organizer", "editor"],
    analytics: ["organizer", "editor"],
    editEvents: ["editor"],
    createEvent: ["editor"],
  };

  function cfg() {
    return window.GDL_AUTH || {};
  }

  function list(role) {
    const roles = cfg().roles || {};
    const legacy = cfg().authorizedUsers || [];
    if (role === "editors") {
      return [...new Set([...(roles.editors || []), ...legacy])];
    }
    return roles[role] || [];
  }

  function inList(login, roleKey) {
    const needle = String(login || "").toLowerCase();
    if (!needle) return false;
    return list(roleKey).some((u) => String(u).toLowerCase() === needle);
  }

  function githubLogin() {
    return window.GDLAuth?.getSession?.()?.login || null;
  }

  function googleEmail() {
    return (
      window.GDLGoogleAuth?.getProfile?.()?.email ||
      null
    );
  }

  function isEntraEnabled() {
    if (cfg().entraEnabled === false) return false;
    return Boolean(window.GDL_M365?.isConfigured?.());
  }

  /**
   * Active role flags for the current session.
   */
  function getRoleFlags() {
    const login = githubLogin();
    const editor = Boolean(login && inList(login, "editors"));
    const organizer = editor || Boolean(login && inList(login, "organizers"));
    const judge = editor || Boolean(login && inList(login, "judges"));
    const participant = Boolean(googleEmail()) || judge || organizer || editor;
    return {
      visitor: true,
      participant,
      judge,
      organizer,
      editor,
      login,
      email: googleEmail(),
      entraEnabled: isEntraEnabled(),
    };
  }

  function primaryRoleLabel(flags) {
    const f = flags || getRoleFlags();
    const t = window.GDLi18n?.t || ((k) => k);
    if (f.editor) return t("role.editor");
    if (f.organizer) return t("role.organizer");
    if (f.judge) return t("role.judge");
    if (f.participant) return t("role.participant");
    return t("role.visitor");
  }

  function can(action, flags) {
    const f = flags || getRoleFlags();
    const allowed = ACTIONS[action] || [];
    return allowed.some((r) => f[r]);
  }

  function applyRoleVisibility(root = document) {
    const f = getRoleFlags();
    root.querySelectorAll("[data-role-required]").forEach((el) => {
      const need = (el.getAttribute("data-role-required") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const ok = need.some((r) => f[r]);
      el.hidden = !ok;
    });
    root.querySelectorAll("[data-entra]").forEach((el) => {
      el.hidden = !f.entraEnabled;
    });
    root.querySelectorAll("[data-entra-hint]").forEach((el) => {
      el.hidden = f.entraEnabled;
    });
    const chip = document.getElementById("role-chip");
    if (chip) {
      chip.textContent = primaryRoleLabel(f);
      chip.hidden = false;
    }
  }

  window.GDLRoles = {
    ACTIONS,
    getRoleFlags,
    primaryRoleLabel,
    can,
    applyRoleVisibility,
    isEntraEnabled,
    inList,
  };
})();
