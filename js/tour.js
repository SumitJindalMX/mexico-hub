(() => {
  const KEY = "gdl.tour.done";

  function stepsForRoles() {
    const f = window.GDLRoles?.getRoleFlags?.() || {};
    const steps = [
      {
        sel: "#events",
        title: "Activities",
        body: "Filter by city, category, and status. Open a card for the brief, materials, and register.",
      },
      {
        sel: "#calendar",
        title: "Calendar",
        body: "See upcoming dates and download an ICS for Outlook or Google Calendar.",
      },
      {
        sel: "#gallery",
        title: "Winners gallery",
        body: "Past highlights and winning teams promoted by organizers.",
      },
    ];
    if (f.participant) {
      steps.push({
        sel: "#my-regs",
        title: "My registrations",
        body: "Sign in with Google to see teams you lead and jump to materials.",
      });
    }
    if (f.judge) {
      steps.push({
        sel: "#events",
        title: "Judging",
        body: "Open an activity to score demo, deck, and code (1–5) for each team.",
      });
    }
    if (f.organizer) {
      steps.push({
        sel: "#analytics",
        title: "Organizer tools",
        body: "Capacity, deadlines, demo slots, announce, export judge pack, publish scoreboard.",
      });
    }
    if (f.editor) {
      steps.push({
        sel: "#btn-create-event",
        title: "Create activity",
        body: "Editors publish to data/events.json via GitHub PAT.",
      });
    }
    return steps;
  }

  function start(force = false) {
    if (!force && localStorage.getItem(KEY)) return;
    const steps = stepsForRoles();
    let i = 0;
    const overlay = document.createElement("div");
    overlay.className = "tour-overlay";
    overlay.innerHTML = `
      <div class="tour-card" role="dialog" aria-modal="true">
        <p class="tour-card__kicker">Mexico Hub tour</p>
        <h3 class="tour-card__title"></h3>
        <p class="tour-card__body"></p>
        <div class="tour-card__actions">
          <button type="button" class="btn btn--ghost btn--sm" data-tour-skip>Skip</button>
          <button type="button" class="btn btn--primary btn--sm" data-tour-next>Next</button>
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
        i === steps.length - 1 ? "Done" : "Next";
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
