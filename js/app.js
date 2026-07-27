(() => {
  const { site, pulse, themes, events, checklist, filters } = window.GDL;

  const els = {
    brand: document.getElementById("brand"),
    headline: document.getElementById("headline"),
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
  };

  const state = {
    category: "All",
    status: "All",
    visibility: "All",
    query: "",
    selectedId: events[0]?.id ?? null,
  };

  function chipClass(kind, value) {
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
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
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
    `;
  }

  function renderList() {
    const list = filteredEvents();
    const selected =
      list.find((e) => e.id === state.selectedId) ?? list[0] ?? null;
    if (selected) state.selectedId = selected.id;

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
    els.footer.textContent = `${site.name} · ${site.region} · GDL Site Visibility tool · data as of ${site.asOf}`;
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
  }

  bind();
  renderHero();
  renderPulse();
  renderThemes();
  renderList();
  renderBars();
  renderChecklist();
  renderFooter();
})();
