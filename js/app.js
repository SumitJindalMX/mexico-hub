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
    els.btnCreate.hidden = !session;

    // GitHub editor controls
    if (!session) {
      els.btnSignIn.hidden = false;
      // remove gh user chip if present
      els.authBar.querySelector("#gh-user-chip")?.remove();
      els.authBar.querySelector("#btn-signout")?.remove();
    } else {
      els.btnSignIn.hidden = true;
      if (!els.authBar.querySelector("#btn-signout")) {
        const chip = document.createElement("div");
        chip.id = "gh-user-chip";
        chip.className = "topbar__user";
        chip.innerHTML = `
          <img class="topbar__avatar" src="${session.avatar || ""}" alt="" width="28" height="28" />
          <span>@${session.login}</span>
        `;
        const out = document.createElement("button");
        out.type = "button";
        out.id = "btn-signout";
        out.className = "btn btn--ghost btn--sm";
        out.textContent = "Sign out";
        out.addEventListener("click", () => {
          window.GDLAuth.signOut();
          state.session = null;
          renderAuthBar();
          renderList();
        });
        els.authBar.insertBefore(chip, els.btnSignIn);
        els.authBar.insertBefore(out, els.btnSignIn);
      }
    }

    // Google participant
    const googleReady = window.GDLGoogleAuth?.isConfigured?.();
    const googleProfile = state.googleProfile;
    if (!googleReady) {
      // Still show the button so people can see setup instructions
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
      els.googleUser.hidden = false;
      els.googleUser.textContent = googleProfile.email || googleProfile.name;
    }

    // Microsoft participant / organizer
    const m365Ready = window.GDLM365Auth?.isConfigured?.();
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
      els.msUser.hidden = false;
      const org = window.GDLM365Auth.isOrganizer(profile) ? " · organizer" : "";
      els.msUser.textContent = `${profile.upn}${org}`;
    }
  }

  function onM365AuthChanged() {
    state.m365Profile = window.GDLM365Auth.getProfile();
    renderAuthBar();
    renderList();
  }

  function onGoogleAuthChanged() {
    state.googleProfile = window.GDLGoogleAuth.getProfile();
    renderAuthBar();
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
    const byline = event.createdBy
      ? `<p class="detail__text" style="margin-top:0.75rem;font-size:0.85rem">Added by @${esc(event.createdBy)}</p>`
      : "";
    const isEditor = !!state.session;

    let actions = "";
    if (event.registrationOpen) {
      actions += `<button type="button" class="btn btn--primary btn--sm" id="btn-open-register">Register team &amp; upload PPT/video</button>`;
      if (!state.m365Profile && !state.googleProfile) {
        actions += `
        <div class="setup-banner">
          <strong>How to register</strong>
          <ol style="margin:0.4rem 0 0;padding-left:1.2rem;color:var(--text-muted);font-size:0.9rem">
            <li>Optional: <em>Google</em> sign-in (top bar) for prefill + Drive uploads</li>
            <li>Fill team / lead (PPT &amp; video optional)</li>
            <li>Submit registration, or use Gmail / GitHub Issue</li>
          </ol>
        </div>`;
      }
    } else {
      actions += `<p class="modal__hint">Registration is closed for this activity.</p>`;
    }
    if (isEditor || event.registrationOpen) {
      actions += `<button type="button" class="btn btn--ghost btn--sm" id="btn-open-organize">Manage invites</button>`;
    }
    if (isEditor) {
      actions += `<button type="button" class="btn btn--ghost btn--sm" id="btn-edit-event">Edit activity</button>`;
      actions += `<button type="button" class="btn btn--ghost btn--sm" id="btn-toggle-reg">${
        event.registrationOpen ? "Close registration" : "Open registration"
      }</button>`;
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
      <div class="detail__block">
        <p class="detail__label">Registered teams</p>
        ${renderRegsBlock(event.id)}
      </div>
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
        renderList();
        renderFeatured();
        renderFooter();
        alert(
          updated.registrationOpen
            ? "Registration is now open."
            : "Registration is now closed.",
        );
      } catch (err) {
        alert(err.message || "Could not update registration.");
      }
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
    renderAuthBar();
    renderHero();
    renderPulse();
    renderThemes();
    renderChecklist();
    renderFooter();
    renderList();
    renderBars();
    renderFeatured();

    try {
      await window.GDLGoogleAuth.init();
      onGoogleAuthChanged();
    } catch {
      renderAuthBar();
    }

    try {
      await window.GDLM365Auth.init();
      onM365AuthChanged();
    } catch {
      renderAuthBar();
    }

    try {
      const loaded = await window.GDLEventsStore.loadPublicEvents();
      events = loaded;
      window.GDL.events = loaded;
      renderList();
      renderBars();
      renderFeatured();
      renderFooter();
    } catch (err) {
      els.resultsMeta.textContent = `Could not load live events file — ${err.message}`;
    }

    try {
      state.registrations = await window.GDLRegistrationsStore.loadPublic();
      renderList();
    } catch {
      /* optional until first registration publish */
    }
  }

  boot();
})();
