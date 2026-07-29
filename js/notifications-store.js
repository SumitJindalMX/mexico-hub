(() => {
  const PATH = () => window.GDL_AUTH?.notificationsPath || "data/notifications.json";
  const LOCAL_KEY = "gdl.notifications.read";

  async function loadPublic() {
    return window.GDLJsonStore.loadPublicJson(PATH(), "notifications");
  }

  async function publish(note, session) {
    if (!session?.token) throw new Error("GitHub sign-in required.");
    const remote = await window.GDLJsonStore.getRemoteJson(PATH(), session.token);
    const notifications = Array.isArray(remote.payload?.notifications)
      ? [...remote.payload.notifications]
      : [];
    const next = {
      id: `n-${Date.now().toString(36)}`,
      title: (note.title || "").trim(),
      body: (note.body || "").trim(),
      eventId: note.eventId || "",
      createdAt: new Date().toISOString(),
      createdBy: session.login,
    };
    notifications.unshift(next);
    await window.GDLJsonStore.putRemoteJson(
      PATH(),
      session.token,
      { updatedAt: new Date().toISOString().slice(0, 10), notifications },
      `chore: announcement by @${session.login}`,
    );
    return next;
  }

  function readSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }

  function markRead(id) {
    const s = readSet();
    s.add(id);
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...s]));
  }

  function deriveLocal(events, registrations) {
    const t = window.GDLi18n?.t || ((k, v) => k);
    const now = Date.now();
    const out = [];
    (events || []).forEach((e) => {
      if (!e.registrationClosesAt || !e.registrationOpen) return;
      const ts = Date.parse(e.registrationClosesAt);
      if (!Number.isFinite(ts)) return;
      const hours = (ts - now) / 36e5;
      if (hours > 0 && hours <= 72) {
        out.push({
          id: `local-deadline-${e.id}`,
          title: t("notify.closingTitle"),
          body: t("notify.closingBody", {
            name: e.name,
            when: new Date(ts).toLocaleString(),
          }),
          eventId: e.id,
          createdAt: new Date().toISOString(),
          local: true,
        });
      }
      if (hours < 0 && e.registrationOpen) {
        out.push({
          id: `local-closed-${e.id}`,
          title: t("notify.endedTitle"),
          body: t("notify.endedBody", { name: e.name }),
          eventId: e.id,
          createdAt: new Date().toISOString(),
          local: true,
        });
      }
    });
    const cap = (events || []).filter((e) => e.capacity > 0);
    cap.forEach((e) => {
      const n = (registrations || []).filter((r) => r.eventId === e.id).length;
      if (n >= e.capacity && e.registrationOpen) {
        out.push({
          id: `local-full-${e.id}`,
          title: t("notify.fullTitle"),
          body: t("notify.fullBody", { name: e.name, n, cap: e.capacity }),
          eventId: e.id,
          createdAt: new Date().toISOString(),
          local: true,
        });
      }
    });
    return out;
  }

  function openGmailBroadcast(title, body, inbox) {
    const to = encodeURIComponent(inbox || window.GDL_AUTH?.registrationInbox || "");
    const su = encodeURIComponent(`[Mexico Hub] ${title}`);
    const bd = encodeURIComponent(body);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${bd}`, "_blank");
  }

  function maybeBrowserNotify(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        new Notification(title, { body });
      } catch {
        /* ignore */
      }
    }
  }

  async function requestBrowserPermission() {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return Notification.requestPermission();
  }

  window.GDLNotificationsStore = {
    loadPublic,
    publish,
    readSet,
    markRead,
    deriveLocal,
    openGmailBroadcast,
    maybeBrowserNotify,
    requestBrowserPermission,
  };
})();
