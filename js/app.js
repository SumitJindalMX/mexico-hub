(() => {
  const { site, pulse, themes, checklist, filters } = window.GDL;
  let events = Array.isArray(window.GDL.events) ? window.GDL.events : [];

  const els = {
    brand: document.getElementById("brand"),
    lede: document.getElementById("lede"),
    heroMeta: document.getElementById("hero-meta"),
    pulseGrid: document.getElementById("pulse-grid"),
    themeGrid: document.getElementById("theme-grid"),
    category: document.getElementById("category"),
    status: document.getElementById("status"),
    visibility: document.getElementById("visibility"),
    confidence: document.getElementById("confidence"),
    city: document.getElementById("city"),
    q: document.getElementById("q"),
    resultsMeta: document.getElementById("results-meta"),
    eventList: document.getElementById("event-list"),
    detail: document.getElementById("detail"),
    featuredStrip: document.getElementById("featured-strip"),
    featuredRow: document.getElementById("featured-row"),
    bars: document.getElementById("category-bars"),
    checklistBody: document.getElementById("checklist-body"),
    footer: document.getElementById("footer-copy"),
    authBar: document.getElementById("auth-bar"),
    btnSignIn: document.getElementById("btn-signin"),
    btnGoogleSignIn: document.getElementById("btn-google-signin"),
    btnGoogleSignOut: document.getElementById("btn-google-signout"),
    googleUser: document.getElementById("google-user"),
    btnMsSignIn: document.getElementById("btn-ms-signin"),
    btnMsSignOut: document.getElementById("btn-ms-signout"),
    msUser: document.getElementById("ms-user"),
    btnCreate: document.getElementById("btn-create-event"),
    modalSignIn: document.getElementById("modal-signin"),
    modalCreate: document.getElementById("modal-create"),
    formSignIn: document.getElementById("form-signin"),
    formCreate: document.getElementById("form-create"),
    signInError: document.getElementById("signin-error"),
    createError: document.getElementById("create-error"),
    pat: document.getElementById("pat"),
  };

  const state = {
    category: "All",
    status: "All",
    visibility: "All",
    confidence: "All",
    city: "All",
    query: "",
    selectedId: null,
    session: window.GDLAuth.getSession(),
    m365Profile: null,
    googleProfile: null,
    registrations: [],
    scores: [],
    gallery: [],
    notifications: [],
  };

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cityOf(event) {
    if (event?.city) return event.city;
    const hay = `${event?.name || ""} ${event?.audience || ""}`.toLowerCase();
    if (/\bgdl\b|guadalajara/.test(hay)) return "GDL";
    if (/\bcdmx\b|mexico city/.test(hay)) return "CDMX";
    return "Mexico";
  }

  function chipClass(_kind, value) {
    const v = String(value || "").toLowerCase();
    if (v === "verified" || v === "editor" || v === "seed") {
      return `chip chip--${v}`;
    }
    return `chip chip--${v}`;
  }

  function confidenceOf(event) {
    return event.confidence || (event.createdBy ? "Editor" : "Seed");
  }

  function fillSelectLabeled(select, values, allLabel) {
    select.innerHTML = values
      .map((v) => `<option value="${v}">${v === "All" ? allLabel : v}</option>`)
      .join("");
  }

  function filteredEvents() {
    const q = state.query.trim().toLowerCase();
    return events
      .filter((e) => {
        if (state.category !== "All" && e.category !== state.category) return false;
        if (state.status !== "All" && e.status !== state.status) return false;
        if (state.visibility !== "All" && e.visibility !== state.visibility)
          return false;
        if (state.confidence !== "All" && confidenceOf(e) !== state.confidence)
          return false;
        if (state.city !== "All" && cityOf(e) !== state.city) return false;
        if (q) {
          const hay =
            `${e.name} ${e.audience} ${e.highlight} ${e.category} ${cityOf(e)}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
  }

  function featuredEvents() {
    return events
      .filter(
        (e) =>
          e.status === "Upcoming" ||
          e.registrationOpen ||
          e.status === "Recurring",
      )
      .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)))
      .slice(0, 4);
  }

  function renderFeatured() {
    const list = featuredEvents();
    if (!els.featuredStrip || !els.featuredRow) return;
    if (!list.length) {
      els.featuredStrip.hidden = true;
      els.featuredRow.innerHTML = "";
      return;
    }
    els.featuredStrip.hidden = false;
    els.featuredRow.innerHTML = list
      .map(
        (e) => `
      <button type="button" class="featured__chip" data-featured-id="${esc(e.id)}">
        <strong>${esc(e.name)}</strong>
        <span>${esc(e.when)} · ${esc(cityOf(e))}${
          e.registrationOpen ? " · Reg open" : ""
        }</span>
      </button>
    `,
      )
      .join("");
    els.featuredRow.querySelectorAll("[data-featured-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedId = btn.getAttribute("data-featured-id");
        renderList();
        document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  function regsForEvent(eventId) {
    return (state.registrations || []).filter((r) => r.eventId === eventId);
  }

  function renderRegsBlock(eventId) {
    const regs = regsForEvent(eventId);
    if (!regs.length) {
      return `<p class="detail__text">No published team registrations yet. Submissions via Gmail/GitHub Issue are reviewed by organizers; Editor submits appear here after Pages refresh.</p>`;
    }
    return `<div class="detail-regs">${regs
      .map(
        (r) => `
      <article class="detail-reg">
        <h4>${esc(r.teamName)} <span class="chip chip--editor">${esc(r.channel || "github")}</span></h4>
        <p>${esc(r.leadName || "—")} · ${esc(r.leadEmail || "")}</p>
        <p>
          ${
            r.pptUrl
              ? `<a href="${esc(r.pptUrl)}" target="_blank" rel="noopener">PPT</a>`
              : "No PPT"
          }
          ·
          ${
            r.videoUrl
              ? `<a href="${esc(r.videoUrl)}" target="_blank" rel="noopener">Video</a>`
              : "No video"
          }
          ·
          ${
            r.repoUrl
              ? `<a href="${esc(r.repoUrl)}" target="_blank" rel="noopener">Repo</a>`
              : "No repo"
          }
        </p>
        ${
          r.codeProvided
            ? `<p class="detail__text">Code · ${esc(r.language || "source")} · ${esc(
                r.validation?.summary || r.validation?.status || "submitted",
              )}</p>`
            : ""
        }
      </article>
    `,
      )
      .join("")}</div>`;
  }

  function renderAuthBar() {
    const session = state.session;
    const roles = window.GDLRoles?.getRoleFlags?.() || {};
    els.btnCreate.hidden = !roles.editor;

    const menu = document.getElementById("account-menu");
    const sessionBox = document.getElementById("account-session");
    const label = document.getElementById("account-label");
    const accountBtn = document.getElementById("btn-account");

    // Clear prior GH session UI inside account menu
    sessionBox?.replaceChildren();
    document.getElementById("btn-gh-signout")?.remove();

    if (!session) {
      els.btnSignIn.hidden = false;
      if (label && !state.googleProfile) label.textContent = "Sign in";
    } else {
      els.btnSignIn.hidden = true;
      if (sessionBox) {
        sessionBox.hidden = false;
        sessionBox.innerHTML = `
          <img class="topbar__avatar" src="${session.avatar || ""}" alt="" width="28" height="28" />
          <span>@${session.login}</span>
        `;
      }
      if (label) label.textContent = `@${session.login}`;
      const out = document.createElement("button");
      out.type = "button";
      out.id = "btn-gh-signout";
      out.className = "account__item";
      out.textContent = "Sign out of GitHub";
      out.addEventListener("click", () => {
        window.GDLAuth.signOut();
        state.session = null;
        closeAccountMenu();
        renderAuthBar();
        renderPortalExtras();
        renderList();
      });
      menu?.appendChild(out);
    }

    const googleReady = window.GDLGoogleAuth?.isConfigured?.();
    const googleProfile = state.googleProfile;
    if (!googleReady) {
      els.btnGoogleSignIn.hidden = false;
      els.btnGoogleSignOut.hidden = true;
      els.googleUser.hidden = true;
    } else if (!googleProfile) {
      els.btnGoogleSignIn.hidden = false;
      els.btnGoogleSignOut.hidden = true;
      els.googleUser.hidden = true;
    } else {
      els.btnGoogleSignIn.hidden = true;
      els.btnGoogleSignOut.hidden = false;
      els.googleUser.hidden = true;
      if (label && !session) label.textContent = googleProfile.email || "Google";
    }

    if (!session && !googleProfile && label) label.textContent = "Sign in";

    const m365Ready = window.GDLRoles?.isEntraEnabled?.() && window.GDLM365Auth?.isConfigured?.();
    const profile = state.m365Profile;
    if (!m365Ready) {
      els.btnMsSignIn.hidden = true;
      els.btnMsSignOut.hidden = true;
      els.msUser.hidden = true;
    } else if (!profile) {
      els.btnMsSignIn.hidden = false;
      els.btnMsSignOut.hidden = true;
      els.msUser.hidden = true;
    } else {
      els.btnMsSignIn.hidden = true;
      els.btnMsSignOut.hidden = false;
      els.msUser.hidden = true;
    }

    if (sessionBox && !session) sessionBox.hidden = true;
    if (accountBtn) {
      accountBtn.title = roles.editor
        ? "Editor account"
        : roles.organizer
          ? "Organizer account"
          : roles.judge
            ? "Judge account"
            : roles.participant
              ? "Participant account"
              : "Sign in";
    }

    window.GDLRoles?.applyRoleVisibility?.();
  }

  function closeAccountMenu() {
    const menu = document.getElementById("account-menu");
    const btn = document.getElementById("btn-account");
    if (menu) menu.hidden = true;
    btn?.setAttribute("aria-expanded", "false");
  }

  function toggleAccountMenu() {
    const menu = document.getElementById("account-menu");
    const btn = document.getElementById("btn-account");
    if (!menu) return;
    const open = menu.hidden;
    menu.hidden = !open;
    btn?.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) document.getElementById("notify-panel") && (document.getElementById("notify-panel").hidden = true);
  }

  function onM365AuthChanged() {
    state.m365Profile = window.GDLM365Auth?.getProfile?.() || null;
    renderAuthBar();
    renderList();
  }

  function onGoogleAuthChanged() {
    state.googleProfile = window.GDLGoogleAuth?.getProfile?.() || null;
    renderAuthBar();
    renderPortalExtras();
    renderList();
  }

  function renderHero() {
    els.brand.innerHTML = `${site.brand}<span>.</span>`;
    els.lede.textContent = site.tagline;
    els.heroMeta.innerHTML = `
      <span>${site.name}</span>
      <span>${site.region}</span>
    `;
  }

  function renderPulse() {
    els.pulseGrid.innerHTML = pulse
      .map(
        (p) => `
      <article class="pulse">
        <div class="pulse__value">${p.value}</div>
        <div class="pulse__label">${p.label}</div>
        <p class="pulse__detail">${p.detail}</p>
      </article>
    `,
      )
      .join("");
  }

  function renderThemes() {
    els.themeGrid.innerHTML = themes
      .map(
        (t) => `
      <article class="theme">
        <h3 class="theme__title">${t.title}</h3>
        <p class="theme__body">${t.body}</p>
      </article>
    `,
      )
      .join("");
  }

  function collectCreateForm() {
    let demoSlots = [];
    const rawSlots = document.getElementById("ev-demo-slots")?.value || "";
    if (rawSlots.trim()) {
      try {
        demoSlots = JSON.parse(rawSlots);
        if (!Array.isArray(demoSlots)) throw new Error("Demo slots must be a JSON array.");
      } catch (err) {
        throw new Error(err.message || "Invalid demo slots JSON.");
      }
    }
    const closesLocal = document.getElementById("ev-closes")?.value || "";
    return {
      id: document.getElementById("ev-id")?.value || "",
      name: document.getElementById("ev-name").value,
      category: document.getElementById("ev-category").value,
      status: document.getElementById("ev-status").value,
      visibility: document.getElementById("ev-visibility").value,
      confidence: document.getElementById("ev-confidence").value,
      when: document.getElementById("ev-when").value,
      city: document.getElementById("ev-city")?.value || "Mexico",
      sortKey: document.getElementById("ev-sort").value,
      audience: document.getElementById("ev-audience").value,
      highlight: document.getElementById("ev-highlight").value,
      registrationOpen: document.getElementById("ev-registration-open").checked,
      capacity: document.getElementById("ev-capacity")?.value || "",
      registrationClosesAt: closesLocal ? new Date(closesLocal).toISOString() : "",
      demoSlots,
      pptUrl: document.getElementById("ev-ppt-url").value,
      videoUrl: document.getElementById("ev-video-url").value,
    };
  }

  function openCreateModal() {
    showError(els.createError, "");
    els.formCreate.reset();
    document.getElementById("ev-id").value = "";
    document.getElementById("create-modal-title").textContent = "Create activity";
    document.getElementById("create-modal-lede").textContent =
      "Publishes to the Mexico Hub catalog (GitHub Pages rebuild may take ~1 minute).";
    document.getElementById("btn-create-submit").textContent = "Publish event";
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById("ev-sort").value = today;
    document.getElementById("ev-status").value = "Upcoming";
    document.getElementById("ev-city").value = "Mexico";
    els.modalCreate.showModal();
  }

  function openEditModal(event) {
    showError(els.createError, "");
    els.formCreate.reset();
    document.getElementById("ev-id").value = event.id;
    document.getElementById("create-modal-title").textContent = "Edit activity";
    document.getElementById("create-modal-lede").textContent =
      "Updates the live catalog. Toggle registration open/closed here.";
    document.getElementById("btn-create-submit").textContent = "Save changes";
    document.getElementById("ev-name").value = event.name || "";
    document.getElementById("ev-category").value = event.category || "Hackathon";
    document.getElementById("ev-status").value = event.status || "Upcoming";
    document.getElementById("ev-visibility").value = event.visibility || "High";
    document.getElementById("ev-confidence").value = confidenceOf(event);
    document.getElementById("ev-when").value = event.when || "";
    document.getElementById("ev-city").value = cityOf(event);
    document.getElementById("ev-sort").value = event.sortKey || "";
    document.getElementById("ev-audience").value = event.audience || "";
    document.getElementById("ev-highlight").value = event.highlight || "";
    document.getElementById("ev-registration-open").checked = !!event.registrationOpen;
    document.getElementById("ev-capacity").value = event.capacity || "";
    if (event.registrationClosesAt) {
      const d = new Date(event.registrationClosesAt);
      if (!Number.isNaN(d.getTime())) {
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        document.getElementById("ev-closes").value = local;
      }
    } else {
      document.getElementById("ev-closes").value = "";
    }
    document.getElementById("ev-demo-slots").value = event.demoSlots?.length
      ? JSON.stringify(event.demoSlots, null, 2)
      : "";
    document.getElementById("ev-ppt-url").value = event.pptUrl || "";
    document.getElementById("ev-video-url").value = event.videoUrl || "";
    els.modalCreate.showModal();
  }

  function renderDetail(event) {
    if (!event) {
      els.detail.classList.add("empty");
      els.detail.innerHTML = `<p>No events match these filters. Try clearing City or other filters.</p>`;
      return;
    }
    els.detail.classList.remove("empty");
    window.GDLPortal?.setEventHash?.(event.id);

    const roles = window.GDLRoles?.getRoleFlags?.() || {};
    const gate = window.GDLPortal.isRegistrationClosed(event, state.registrations);
    const byline = event.createdBy
      ? `<p class="detail__text" style="margin-top:0.75rem;font-size:0.85rem">Added by @${esc(event.createdBy)}</p>`
      : "";

    let actions = "";
    if (!gate.closed) {
      actions += `<button type="button" class="btn btn--primary btn--sm" id="btn-open-register">Register team &amp; upload PPT/video</button>`;
    } else {
      actions += `<p class="modal__hint">${esc(gate.reason || "Registration is closed for this activity.")}</p>`;
    }
    actions += `<button type="button" class="btn btn--ghost btn--sm" data-ics-id="${esc(event.id)}">Add to calendar (ICS)</button>`;
    if (roles.organizer || event.registrationOpen) {
      actions += `<button type="button" class="btn btn--ghost btn--sm" id="btn-open-organize">Manage invites</button>`;
    }
    if (roles.editor) {
      actions += `<button type="button" class="btn btn--ghost btn--sm" id="btn-edit-event">Edit activity</button>`;
      actions += `<button type="button" class="btn btn--ghost btn--sm" id="btn-toggle-reg">${
        event.registrationOpen ? "Close registration" : "Open registration"
      }</button>`;
    }
    if (roles.organizer) {
      actions += `<button type="button" class="btn btn--ghost btn--sm" id="btn-export-judge">Export judge pack</button>`;
      actions += `<button type="button" class="btn btn--ghost btn--sm" id="btn-publish-scores">Publish scoreboard</button>`;
      actions += `<button type="button" class="btn btn--ghost btn--sm" id="btn-announce">Announce</button>`;
    }

    const materials =
      event.pptUrl || event.videoUrl
        ? `<div class="detail__block">
        <p class="detail__label">Materials</p>
        <p class="detail__text">
          ${event.pptUrl ? `<a href="${esc(event.pptUrl)}" target="_blank" rel="noopener">PPT / deck</a>` : "No PPT link"}
          ·
          ${event.videoUrl ? `<a href="${esc(event.videoUrl)}" target="_blank" rel="noopener">Video</a>` : "No video link"}
        </p>
      </div>`
        : "";

    const eventScores = window.GDLScoresStore.scoresForEvent(state.scores, event.id);
    const regs = window.GDLPortal.regsForEvent(state.registrations, event.id);

    els.detail.innerHTML = `
      <p class="detail__kicker">Event brief</p>
      <h3 class="detail__title">${esc(event.name)}</h3>
      <div class="chips" style="margin-bottom:1rem">
        <span class="${chipClass("cat", event.category)}">${esc(event.category)}</span>
        <span class="${chipClass("st", event.status)}">${esc(event.status)}</span>
        <span class="chip">${esc(cityOf(event))}</span>
        <span class="${chipClass("vis", event.visibility)}">${esc(event.visibility)} visibility</span>
        <span class="${chipClass("conf", confidenceOf(event))}">${esc(confidenceOf(event))}</span>
        ${
          event.registrationOpen
            ? `<span class="chip chip--upcoming">Registration open</span>`
            : `<span class="chip">Registration closed</span>`
        }
      </div>
      ${window.GDLPortal.countdownHtml(event)}
      ${window.GDLPortal.capacityHtml(event, state.registrations)}
      <div class="detail__block">
        <p class="detail__label">When</p>
        <p class="detail__text">${esc(event.when)}</p>
      </div>
      <div class="detail__block">
        <p class="detail__label">City</p>
        <p class="detail__text">${esc(cityOf(event))}</p>
      </div>
      <div class="detail__block">
        <p class="detail__label">Audience</p>
        <p class="detail__text">${esc(event.audience)}</p>
      </div>
      <div class="detail__block">
        <p class="detail__label">Highlight</p>
        <p class="detail__text">${esc(event.highlight)}</p>
      </div>
      ${materials}
      ${window.GDLPortal.demoSlotsHtml(event)}
      <div class="detail__block">
        <p class="detail__label">Registered teams</p>
        ${renderRegsBlock(event.id)}
      </div>
      <div class="detail__block">
        <p class="detail__label">Scoreboard</p>
        ${window.GDLPortal.scoreboardHtml(event.id, state.scores, window.GDLRoles.can("viewUnpublishedScores"))}
      </div>
      ${
        window.GDLRoles.can("score")
          ? `<div class="detail__block" data-role-required="judge,organizer,editor">
        <p class="detail__label">Judge scoring</p>
        ${window.GDLPortal.judgeFormHtml(event, regs, eventScores)}
      </div>`
          : ""
      }
      <div class="detail__block">
        <p class="detail__label">Data source / authenticity</p>
        <p class="detail__text">${esc(
          event.sourceNote ||
            (confidenceOf(event) === "Verified"
              ? "Confirmed against official Mexico / site ops calendar."
              : confidenceOf(event) === "Editor"
                ? "Published by an allowlisted editor."
                : "Seeded from public LinkedIn mentions — not an official calendar."),
        )}</p>
      </div>
      ${byline}
      <div class="detail-actions">${actions}</div>
    `;

    document.getElementById("btn-open-register")?.addEventListener("click", () => {
      const again = window.GDLPortal.isRegistrationClosed(event, state.registrations);
      if (again.closed) {
        alert(again.reason);
        return;
      }
      window.GDLRegistrationUI.openRegisterModal(event);
    });
    document.getElementById("btn-open-organize")?.addEventListener("click", () => {
      window.GDLRegistrationUI.openOrganizeModal(event);
    });
    document.getElementById("btn-edit-event")?.addEventListener("click", () => {
      openEditModal(event);
    });
    document.getElementById("btn-toggle-reg")?.addEventListener("click", async () => {
      try {
        const { event: updated, events: next } =
          await window.GDLEventsStore.setRegistrationOpen(
            event.id,
            !event.registrationOpen,
            state.session,
          );
        events = next;
        window.GDL.events = next;
        state.selectedId = updated.id;
        renderPortalExtras();
        renderList();
      } catch (err) {
        alert(err.message || "Could not update registration.");
      }
    });
    document.getElementById("btn-export-judge")?.addEventListener("click", () => {
      window.GDLPortal.exportJudgePackCsv(event, regs, eventScores);
    });
    document.getElementById("btn-publish-scores")?.addEventListener("click", async () => {
      try {
        await window.GDLScoresStore.setPublished(event.id, true, state.session);
        state.scores = await window.GDLScoresStore.loadPublic();
        const top = [...eventScores].sort((a, b) => (b.total || 0) - (a.total || 0))[0];
        if (top && confirm(`Promote ${top.teamName} to winners gallery?`)) {
          await window.GDLGalleryStore.addItem(
            {
              eventId: event.id,
              eventName: event.name,
              teamName: top.teamName,
              place: "1st (published scoreboard)",
              highlight: event.highlight || "",
              repoUrl: regs.find((r) => r.id === top.registrationId)?.repoUrl || "",
            },
            state.session,
          );
          state.gallery = await window.GDLGalleryStore.loadPublic();
        }
        renderPortalExtras();
        renderList();
        alert("Scoreboard published.");
      } catch (err) {
        alert(err.message || "Could not publish scores.");
      }
    });
    document.getElementById("btn-announce")?.addEventListener("click", async () => {
      const title = prompt("Announcement title", `${event.name} update`);
      if (!title) return;
      const body = prompt("Announcement body", "Registration / judging update from Mexico Hub organizers.");
      if (!body) return;
      try {
        await window.GDLNotificationsStore.publish({ title, body, eventId: event.id }, state.session);
        state.notifications = await window.GDLNotificationsStore.loadPublic();
        refreshNotifyUi();
        if (confirm("Also open Gmail compose to broadcast?")) {
          window.GDLNotificationsStore.openGmailBroadcast(title, body);
        }
      } catch (err) {
        alert(err.message || "Could not publish announcement.");
      }
    });
    els.detail.querySelectorAll("[data-judge-form]").forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        try {
          await window.GDLScoresStore.upsertScore(
            {
              eventId: form.getAttribute("data-event-id"),
              registrationId: form.getAttribute("data-reg-id"),
              teamName: form.getAttribute("data-team"),
              demo: fd.get("demo"),
              deck: fd.get("deck"),
              code: fd.get("code"),
              notes: fd.get("notes"),
              published: false,
            },
            state.session,
          );
          state.scores = await window.GDLScoresStore.loadPublic();
          renderList();
          alert("Score saved.");
        } catch (err) {
          alert(err.message || "Could not save score.");
        }
      });
    });
    els.detail.querySelectorAll("[data-ics-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ev = events.find((x) => x.id === btn.getAttribute("data-ics-id"));
        if (ev) window.GDLCalendar.downloadEventIcs(ev);
      });
    });
  }

  function renderPortalExtras() {
    const email = state.googleProfile?.email || null;
    window.GDLPortal.renderMyRegs(
      document.getElementById("my-regs-grid"),
      state.registrations,
      events,
      email,
    );
    window.GDLPortal.renderGallery(document.getElementById("gallery-grid"), state.gallery);
    window.GDLPortal.renderAnalytics(
      document.getElementById("analytics-grid"),
      events,
      state.registrations,
    );
    window.GDLRoles.applyRoleVisibility();
    window.GDLi18n.apply();
  }

  function refreshNotifyUi() {
    const derived = window.GDLNotificationsStore.deriveLocal(events, state.registrations);
    const all = [...derived, ...(state.notifications || [])];
    const read = window.GDLNotificationsStore.readSet();
    window.GDLPortal.renderNotifications(document.getElementById("notify-list"), all, read);
    const unread = all.filter((n) => !read.has(n.id)).length;
    const badge = document.getElementById("notify-count");
    if (badge) {
      badge.hidden = unread === 0;
      badge.textContent = String(unread);
    }
    document.getElementById("notify-list")?.querySelectorAll("[data-notify-id]").forEach((el) => {
      el.addEventListener("click", () => {
        window.GDLNotificationsStore.markRead(el.getAttribute("data-notify-id"));
        refreshNotifyUi();
      });
    });
  }

  function renderList() {
    const list = filteredEvents();
    const selected =
      list.find((e) => e.id === state.selectedId) ?? list[0] ?? null;
    state.selectedId = selected?.id ?? null;

    els.resultsMeta.textContent = `${list.length} event${list.length === 1 ? "" : "s"} shown · ${
      events.filter((e) => e.visibility === "High").length
    } high-visibility overall`;

    if (!list.length) {
      els.eventList.innerHTML = "";
      renderDetail(null);
      return;
    }

    els.eventList.innerHTML = list
      .map(
        (e) => `
      <li>
        <button
          type="button"
          class="event-item${e.id === state.selectedId ? " is-active" : ""}"
          data-id="${e.id}"
          aria-pressed="${e.id === state.selectedId}"
        >
          <div class="event-item__top">
            <span class="event-item__name">${esc(e.name)}</span>
            <span class="event-item__when">${esc(e.when)}</span>
          </div>
          <div class="chips">
            <span class="${chipClass("cat", e.category)}">${esc(e.category)}</span>
            <span class="${chipClass("st", e.status)}">${esc(e.status)}</span>
            <span class="chip">${esc(cityOf(e))}</span>
            <span class="${chipClass("vis", e.visibility)}">${esc(e.visibility)}</span>
            <span class="${chipClass("conf", confidenceOf(e))}">${esc(confidenceOf(e))}</span>
            ${e.registrationOpen ? `<span class="chip chip--upcoming">Reg open</span>` : ""}
          </div>
        </button>
      </li>
    `,
      )
      .join("");

    renderDetail(selected);
    renderFeatured();
  }

  function renderBars() {
    const categories = filters.categories.filter((c) => c !== "All");
    const counts = categories.map((c) => ({
      label: c,
      value: events.filter((e) => e.category === c).length,
    }));
    const max = Math.max(...counts.map((c) => c.value), 1);

    els.bars.innerHTML = `
      <p class="section__kicker" style="margin-bottom:0.75rem">Full catalog · by category</p>
      ${counts
        .map(
          (c) => `
        <div class="bar-row">
          <span class="bar-row__label">${c.label}</span>
          <div class="bar-track"><div class="bar-fill" data-width="${(c.value / max) * 100}"></div></div>
          <span class="bar-row__value">${c.value}</span>
        </div>
      `,
        )
        .join("")}
    `;

    requestAnimationFrame(() => {
      els.bars.querySelectorAll(".bar-fill").forEach((el) => {
        el.style.width = `${el.dataset.width}%`;
      });
    });
  }

  function renderChecklist() {
    els.checklistBody.innerHTML = checklist
      .map(
        (row) => `
      <tr>
        <td>${row.action}</td>
        <td>${row.owner}</td>
        <td>${row.why}</td>
      </tr>
    `,
      )
      .join("");
  }

  function renderFooter() {
    els.footer.innerHTML = `<strong>${site.company}</strong> · <em>${site.companyTagline}</em> · ${site.name} · ${site.region} · ${events.length} activities`;
  }

  function showError(el, message) {
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function bind() {
    fillSelectLabeled(els.category, filters.categories, "All categories");
    fillSelectLabeled(els.status, filters.statuses, "All statuses");
    fillSelectLabeled(els.visibility, filters.visibilities, "All visibility");
    fillSelectLabeled(els.confidence, filters.confidences, "All confidence");
    if (els.city) fillSelectLabeled(els.city, filters.cities, "All cities");

    const sync = () => {
      state.category = els.category.value;
      state.status = els.status.value;
      state.visibility = els.visibility.value;
      state.confidence = els.confidence.value;
      state.city = els.city?.value || "All";
      state.query = els.q.value;
      renderList();
    };
    [els.category, els.status, els.visibility, els.confidence, els.city]
      .filter(Boolean)
      .forEach((el) => el.addEventListener("change", sync));
    els.q.addEventListener("input", sync);

    els.eventList.addEventListener("click", (e) => {
      const btn = e.target.closest(".event-item");
      if (!btn) return;
      state.selectedId = btn.dataset.id;
      renderList();
    });

    document.getElementById("btn-lang-en")?.addEventListener("click", () => {
      window.GDLi18n.setLang("en");
    });
    document.getElementById("btn-lang-es")?.addEventListener("click", () => {
      window.GDLi18n.setLang("es");
    });
    document.getElementById("btn-account")?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAccountMenu();
    });
    document.getElementById("account-menu")?.addEventListener("click", (e) => {
      // Keep menu open unless a sign-in path starts; close after sign-in buttons
      const t = e.target.closest("button");
      if (t && t.id && /signin|signout|btn-signin/.test(t.id)) {
        setTimeout(closeAccountMenu, 0);
      }
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".account")) closeAccountMenu();
      if (!e.target.closest(".notify-wrap")) {
        const panel = document.getElementById("notify-panel");
        if (panel) panel.hidden = true;
        document.getElementById("btn-notify")?.setAttribute("aria-expanded", "false");
      }
    });
    document.getElementById("btn-tour")?.addEventListener("click", () => {
      window.GDLTour.start(true);
    });
    document.getElementById("btn-notify")?.addEventListener("click", (e) => {
      e.stopPropagation();
      const panel = document.getElementById("notify-panel");
      const btn = document.getElementById("btn-notify");
      if (!panel) return;
      closeAccountMenu();
      panel.hidden = !panel.hidden;
      btn?.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    });
    document.getElementById("btn-notify-perm")?.addEventListener("click", async () => {
      const p = await window.GDLNotificationsStore.requestBrowserPermission();
      alert(`Browser notifications: ${p}`);
    });
    window.addEventListener("hashchange", () => {
      const id = window.GDLPortal.parseHashEventId();
      if (id) {
        state.selectedId = id;
        renderList();
        document.getElementById("events")?.scrollIntoView({ behavior: "smooth" });
      }
    });

    els.btnSignIn.addEventListener("click", () => {
      showError(els.signInError, "");
      els.pat.value = "";
      els.modalSignIn.showModal();
    });

    document.getElementById("btn-signin-cancel")?.addEventListener("click", () => {
      els.modalSignIn.close();
    });

    els.formSignIn.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("btn-signin-submit");
      submitBtn.disabled = true;
      showError(els.signInError, "");
      try {
        state.session = await window.GDLAuth.signIn(els.pat.value);
        els.modalSignIn.close();
        renderAuthBar();
        renderPortalExtras();
        renderList();
      } catch (err) {
        showError(els.signInError, err.message || "Sign in failed.");
      } finally {
        submitBtn.disabled = false;
      }
    });

    els.btnCreate.addEventListener("click", () => {
      if (!state.session) {
        els.modalSignIn.showModal();
        return;
      }
      openCreateModal();
    });

    document.getElementById("btn-create-cancel")?.addEventListener("click", () => {
      els.modalCreate.close();
    });

    els.formCreate.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById("btn-create-submit");
      submitBtn.disabled = true;
      showError(els.createError, "");
      try {
        const form = collectCreateForm();
        const editing = !!form.id;
        const { event, events: next } = editing
          ? await window.GDLEventsStore.updateEvent(form, state.session)
          : await window.GDLEventsStore.createEvent(form, state.session);
        events = next;
        window.GDL.events = next;
        state.selectedId = event.id;
        els.modalCreate.close();
        renderList();
        renderBars();
        renderFeatured();
        renderFooter();
        renderPortalExtras();
        refreshNotifyUi();
      } catch (err) {
        showError(
          els.createError,
          err.message || (document.getElementById("ev-id").value ? "Could not save." : "Could not publish event."),
        );
      } finally {
        submitBtn.disabled = false;
      }
    });

    async function refreshRegistrations() {
      try {
        state.registrations = await window.GDLRegistrationsStore.loadPublic();
      } catch {
        state.registrations = [];
      }
      renderPortalExtras();
      refreshNotifyUi();
      renderList();
    }

    window.GDLRegistrationUI.wire({
      onM365AuthChanged,
      onGoogleAuthChanged,
      onRegistrationChanged: refreshRegistrations,
    });
  }

  async function boot() {
    bind();
    window.GDLi18n?.apply?.();
    renderAuthBar();
    renderHero();
    renderPulse();
    renderThemes();
    renderChecklist();
    renderFooter();
    renderList();
    renderBars();
    renderFeatured();
    renderPortalExtras();

    try {
      await window.GDLGoogleAuth.init();
      onGoogleAuthChanged();
    } catch {
      renderAuthBar();
    }

    try {
      if (window.GDLRoles?.isEntraEnabled?.()) {
        await window.GDLM365Auth.init();
        onM365AuthChanged();
      } else {
        renderAuthBar();
      }
    } catch {
      renderAuthBar();
    }

    try {
      const loaded = await window.GDLEventsStore.loadPublicEvents();
      events = loaded;
      window.GDL.events = loaded;
      const hashId = window.GDLPortal?.parseHashEventId?.();
      if (hashId) state.selectedId = hashId;
      renderList();
      renderBars();
      renderFeatured();
      renderFooter();
      renderPortalExtras();
    } catch (err) {
      els.resultsMeta.textContent = `Could not load live events file — ${err.message}`;
    }

    try {
      state.registrations = await window.GDLRegistrationsStore.loadPublic();
    } catch {
      state.registrations = [];
    }
    try {
      state.scores = await window.GDLScoresStore.loadPublic();
    } catch {
      state.scores = [];
    }
    try {
      state.gallery = await window.GDLGalleryStore.loadPublic();
    } catch {
      state.gallery = [];
    }
    try {
      state.notifications = await window.GDLNotificationsStore.loadPublic();
    } catch {
      state.notifications = [];
    }
    renderPortalExtras();
    refreshNotifyUi();
    renderList();
    setTimeout(() => window.GDLTour?.start?.(false), 800);
  }

  boot();
})();
