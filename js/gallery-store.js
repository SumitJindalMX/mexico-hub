(() => {
  const PATH = () => window.GDL_AUTH?.galleryPath || "data/gallery.json";

  async function loadPublic() {
    return window.GDLJsonStore.loadPublicJson(PATH(), "items");
  }

  async function addItem(item, session) {
    if (!session?.token) throw new Error("GitHub sign-in required.");
    const remote = await window.GDLJsonStore.getRemoteJson(PATH(), session.token);
    const items = Array.isArray(remote.payload?.items) ? [...remote.payload.items] : [];
    const next = {
      id: item.id || `gal-${Date.now().toString(36)}`,
      eventId: item.eventId,
      eventName: item.eventName || "",
      teamName: item.teamName || "",
      place: item.place || "",
      highlight: item.highlight || "",
      mediaUrl: item.mediaUrl || "",
      repoUrl: item.repoUrl || "",
      createdAt: new Date().toISOString(),
      createdBy: session.login,
    };
    items.unshift(next);
    await window.GDLJsonStore.putRemoteJson(
      PATH(),
      session.token,
      { updatedAt: new Date().toISOString().slice(0, 10), items },
      `chore: gallery item by @${session.login}`,
    );
    return next;
  }

  window.GDLGalleryStore = { loadPublic, addItem };
})();
