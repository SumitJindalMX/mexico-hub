(() => {
  const KEY = "gdl.tour.done";

  function stepsForRoles() {
    const t = window.GDLi18n?.t || ((k) => k);
    const f = window.GDLRoles?.getRoleFlags?.() || {};
    const steps = [
      {
        sel: "#events",
        title: t("tour.0.title"),
        body: t("tour.0.body"),
      },
      {
        sel: "#gallery",
        title: t("tour.1.title"),
        body: t("tour.1.body"),
      },
    ];
    if (f.participant) {
      steps.push({
        sel: "#my-regs",
        title: t("tour.myRegs.title"),
        body: t("tour.myRegs.body"),
      });
    }
    if (f.judge) {
      steps.push({
        sel: "#events",
        title: t("tour.judge.title"),
        body: t("tour.judge.body"),
      });
    }
    if (f.organizer) {
      steps.push({
        sel: "#analytics",
        title: t("tour.org.title"),
        body: t("tour.org.body"),
      });
    }
    if (f.editor) {
      steps.push({
        sel: "#btn-create-event",
        title: t("tour.edit.title"),
        body: t("tour.edit.body"),
      });
    }
    return steps;
  }

  function start(force = false) {
    if (!force && localStorage.getItem(KEY)) return;
    const t = window.GDLi18n?.t || ((k) => k);
    const steps = stepsForRoles();
    let i = 0;
    const overlay = document.createElement("div");
    overlay.className = "tour-overlay";
    overlay.innerHTML = `
      <div class="tour-card" role="dialog" aria-modal="true">
        <p class="tour-card__kicker">${t("tour.kicker")}</p>
        <h3 class="tour-card__title"></h3>
        <p class="tour-card__body"></p>
        <div class="tour-card__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-tour-skip>${t("tour.skip")}</button>
          <button type="button" class="btn btn--primary btn--sm" data-tour-next>${t("tour.next")}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const title = overlay.querySelector(".tour-card__title");
    const body = overlay.querySelector(".tour-card__body");

    function paint() {
      const s = steps[i];
      if (!s) {
        cleanup(true);
        return;
      }
      title.textContent = s.title;
      body.textContent = s.body;
      document.querySelectorAll(".tour-highlight").forEach((el) => el.classList.remove("tour-highlight"));
      const target = document.querySelector(s.sel);
      if (target) {
        target.classList.add("tour-highlight");
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      overlay.querySelector("[data-tour-next]").textContent =
        i === steps.length - 1 ? t("tour.done") : t("tour.next");
    }

    function cleanup(done) {
      document.querySelectorAll(".tour-highlight").forEach((el) => el.classList.remove("tour-highlight"));
      overlay.remove();
      if (done) localStorage.setItem(KEY, "1");
    }

    overlay.querySelector("[data-tour-skip]").addEventListener("click", () => cleanup(true));
    overlay.querySelector("[data-tour-next]").addEventListener("click", () => {
      i += 1;
      paint();
    });
    paint();
  }

  window.GDLTour = { start };
})();
