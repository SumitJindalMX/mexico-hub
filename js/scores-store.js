(() => {
  const PATH = () => window.GDL_AUTH?.scoresPath || "data/scores.json";

  async function loadPublic() {
    return window.GDLJsonStore.loadPublicJson(PATH(), "scores");
  }

  function scoresForEvent(all, eventId) {
    return (all || []).filter((s) => s.eventId === eventId);
  }

  function upsertScore(form, session) {
    if (!session?.token) throw new Error("GitHub sign-in required to save scores.");
    return (async () => {
      const remote = await window.GDLJsonStore.getRemoteJson(PATH(), session.token);
      const scores = Array.isArray(remote.payload?.scores) ? [...remote.payload.scores] : [];
      const id = form.id || `score-${form.eventId}-${form.registrationId}`;
      const next = {
        id,
        eventId: form.eventId,
        registrationId: form.registrationId,
        teamName: form.teamName || "",
        demo: Number(form.demo) || 0,
        deck: Number(form.deck) || 0,
        code: Number(form.code) || 0,
        notes: (form.notes || "").trim(),
        total:
          (Number(form.demo) || 0) +
          (Number(form.deck) || 0) +
          (Number(form.code) || 0),
        published: Boolean(form.published),
        updatedAt: new Date().toISOString(),
        updatedBy: session.login,
      };
      const idx = scores.findIndex((s) => s.id === id);
      if (idx >= 0) scores[idx] = { ...scores[idx], ...next };
      else scores.push(next);
      await window.GDLJsonStore.putRemoteJson(
        PATH(),
        session.token,
        { updatedAt: new Date().toISOString().slice(0, 10), scores },
        `chore: score update by @${session.login}`,
      );
      return next;
    })();
  }

  async function setPublished(eventId, published, session) {
    if (!session?.token) throw new Error("GitHub sign-in required.");
    const remote = await window.GDLJsonStore.getRemoteJson(PATH(), session.token);
    const scores = Array.isArray(remote.payload?.scores) ? [...remote.payload.scores] : [];
    scores.forEach((s) => {
      if (s.eventId === eventId) s.published = published;
    });
    await window.GDLJsonStore.putRemoteJson(
      PATH(),
      session.token,
      { updatedAt: new Date().toISOString().slice(0, 10), scores },
      `chore: ${published ? "publish" : "unpublish"} scores by @${session.login}`,
    );
    return scores.filter((s) => s.eventId === eventId);
  }

  window.GDLScoresStore = {
    loadPublic,
    scoresForEvent,
    upsertScore,
    setPublished,
  };
})();
