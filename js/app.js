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
    q: document.getElementById("q"),
    resultsMeta: document.getElementById("results-meta"),
    eventList: document.getElementById("event-list"),
    detail: document.getElementById("detail"),
    bars: document.getElementById("category-bars"),
    checklistBody: document.getElementById("checklist-body"),
    footer: document.getElementById("footer-copy"),
    authBar: document.getElementById("auth-bar"),
    btnSignIn: document.getElementById("btn-signin"),
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
    query: "",
    selectedId: null,
    session: window.GDLAuth.getSession(),
  };

  function chipClass(_kind, value) {
    return `chip chip--${String(value).toLowerCase()}`;
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
        if (q) {
          const hay = `${e.name} ${e.audience} ${e.highlight} ${e.category}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
  }

  function renderAuthBar() {
    const session = state.session;
    els.btnCreate.hidden = !session;

    if (!session) {
      els.authBar.innerHTML = "";
      els.authBar.appendChild(els.btnSignIn);
      els.btnSignIn.hidden = false;
      return;
    }

    els.btnSignIn.hidden = true;
    els.authBar.innerHTML = `
      <div class="topbar__user">
        <img class="topbar__avatar" src="${session.avatar || ""}" alt="" width="28" height="28" />
        <span>@${session.login}</span>
      </div>
      <button type="button" class="btn btn--ghost btn--sm" id="btn-signout">Sign out</button>
    `;
    document.getElementById("btn-signout")?.addEventListener("click", () => {
      window.GDLAuth.signOut();
      state.session = null;
      renderAuthBar();
    });
  }

  function renderHero() {
    els.brand.innerHTML = `${site.brand}<span>.</span>`;
    els.lede.textContent = site.tagline;
    els.heroMeta.innerHTML = `
      <span>${site.name}</span>
      <span>${site.region}</span>
      <span>As of ${site.asOf}</span>
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

  function renderDetail(event) {
    if (!event) {
      els.detail.classList.add("empty");
      els.detail.innerHTML = `<p>No events match these filters.</p>`;
      return;
    }
    els.detail.classList.remove("empty");
    const byline = event.createdBy
      ? `<p class="detail__text" style="margin-top:0.75rem;font-size:0.85rem">Added by @${event.createdBy}</p>`
      : "";
    els.detail.innerHTML = `
      <p class="detail__kicker">Event brief</p>
      <h3 class="detail__title">${event.name}</h3>
      <div class="chips" style="margin-bottom:1rem">
        <span class="${chipClass("cat", event.category)}">${event.category}</span>
        <span class="${chipClass("st", event.status)}">${event.status}</span>
        <span class="${chipClass("vis", event.visibility)}">${event.visibility} visibility</span>
      </div>
      <div class="detail__block">
        <p class="detail__label">When</p>
        <p class="detail__text">${event.when}</p>
      </div>
      <div class="detail__block">
        <p class="detail__label">Audience</p>
        <p class="detail__text">${event.audience}</p>
      </div>
      <div class="detail__block">
        <p class="detail__label">Highlight</p>
        <p class="detail__text">${event.highlight}</p>
      </div>
      ${byline}
    `;
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
            <span class="event-item__name">${e.name}</span>
            <span class="event-item__when">${e.when}</span>
          </div>
          <div class="chips">
            <span class="${chipClass("cat", e.category)}">${e.category}</span>
            <span class="${chipClass("st", e.status)}">${e.status}</span>
            <span class="${chipClass("vis", e.visibility)}">${e.visibility}</span>
          </div>
        </button>
      </li>
    `,
      )
      .join("");

    renderDetail(selected);
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
    els.footer.textContent = `${site.name} · ${site.region} · GDL Site Visibility · ${events.length} events`;
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

    els.category.addEventListener("change", (e) => {
      state.category = e.target.value;
      renderList();
    });
    els.status.addEventListener("change", (e) => {
      state.status = e.target.value;
      renderList();
    });
    els.visibility.addEventListener("change", (e) => {
      state.visibility = e.target.value;
      renderList();
    });
    els.q.addEventListener("input", (e) => {
      state.query = e.target.value;
      renderList();
    });

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
      showError(els.createError, "");
      els.formCreate.reset();
      const today = new Date().toISOString().slice(0, 10);
      document.getElementById("ev-sort").value = today;
      document.getElementById("ev-status").value = "Upcoming";
      els.modalCreate.showModal();
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
        const form = {
          name: document.getElementById("ev-name").value,
          category: document.getElementById("ev-category").value,
          status: document.getElementById("ev-status").value,
          visibility: document.getElementById("ev-visibility").value,
          when: document.getElementById("ev-when").value,
          sortKey: document.getElementById("ev-sort").value,
          audience: document.getElementById("ev-audience").value,
          highlight: document.getElementById("ev-highlight").value,
        };
        const { event, events: next } = await window.GDLEventsStore.createEvent(
          form,
          state.session,
        );
        events = next;
        window.GDL.events = next;
        state.selectedId = event.id;
        els.modalCreate.close();
        renderList();
        renderBars();
        renderFooter();
      } catch (err) {
        showError(els.createError, err.message || "Could not publish event.");
      } finally {
        submitBtn.disabled = false;
      }
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

    try {
      const loaded = await window.GDLEventsStore.loadPublicEvents();
      events = loaded;
      window.GDL.events = loaded;
      renderList();
      renderBars();
      renderFooter();
    } catch (err) {
      els.resultsMeta.textContent = `Could not load live events file — ${err.message}`;
    }
  }

  boot();
})();
