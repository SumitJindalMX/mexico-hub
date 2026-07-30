/**
 * <mexico-hub-events> — embeddable event catalog / register / judge widget.
 * Loads public data from base-url (GitHub Pages). Optional github-token for writes.
 */
const OWNER_DEFAULT = "SumitJindalMX";
const REPO_DEFAULT = "mexico-hub";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function joinBase(base, path) {
  const b = String(base || "").replace(/\/?$/, "/");
  return `${b}${path.replace(/^\//, "")}`;
}

async function loadJson(base, path, key) {
  const res = await fetch(`${joinBase(base, path)}?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) return key ? [] : {};
  const payload = await res.json();
  if (key) return Array.isArray(payload[key]) ? payload[key] : [];
  return payload;
}

function toBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64Utf8(b64) {
  const binary = atob(String(b64).replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function ghContents(owner, repo, path, token, init = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(init.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    ...init,
    headers,
  });
}

async function getRemote(owner, repo, path, token) {
  const res = await ghContents(owner, repo, path, token);
  if (res.status === 404) return { sha: null, payload: null };
  if (!res.ok) throw new Error(`Read ${path} failed (${res.status})`);
  const file = await res.json();
  return {
    sha: file.sha,
    payload: JSON.parse(fromBase64Utf8(file.content)),
  };
}

async function putRemote(owner, repo, path, token, payload, message) {
  const remote = await getRemote(owner, repo, path, token);
  const body = {
    message,
    content: toBase64Utf8(JSON.stringify(payload, null, 2) + "\n"),
    branch: "main",
  };
  if (remote.sha) body.sha = remote.sha;
  const res = await ghContents(owner, repo, path, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Publish failed (${res.status}): ${t.slice(0, 180)}`);
  }
  return res.json();
}

class MexicoHubEvents extends HTMLElement {
  static get observedAttributes() {
    return ["base-url", "view", "event-id", "lang", "github-token", "owner", "repo"];
  }

  constructor() {
    super();
    this._state = {
      events: [],
      registrations: [],
      scores: [],
      selectedId: null,
      q: "",
      status: "All",
      error: "",
      notice: "",
      loading: true,
    };
  }

  connectedCallback() {
    this.classList.add("mhe-host");
    this.renderShell();
    this.refresh();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.refresh();
  }

  get baseUrl() {
    return (
      this.getAttribute("base-url") ||
      "https://sumitjindalmx.github.io/mexico-hub/"
    );
  }

  get view() {
    return this.getAttribute("view") || "catalog";
  }

  get lang() {
    return this.getAttribute("lang") || "en";
  }

  get token() {
    return this.getAttribute("github-token") || this._tokenProp || "";
  }

  set githubToken(v) {
    this._tokenProp = v || "";
  }

  get owner() {
    return this.getAttribute("owner") || OWNER_DEFAULT;
  }

  get repo() {
    return this.getAttribute("repo") || REPO_DEFAULT;
  }

  async refresh() {
    this._state.loading = true;
    this._state.error = "";
    this.render();
    try {
      const [events, registrations, scores] = await Promise.all([
        loadJson(this.baseUrl, "data/events.json", "events"),
        loadJson(this.baseUrl, "data/registrations.json", "registrations"),
        loadJson(this.baseUrl, "data/scores.json", "scores"),
      ]);
      this._state.events = events;
      this._state.registrations = registrations;
      this._state.scores = scores;
      const attrId = this.getAttribute("event-id");
      if (attrId) this._state.selectedId = attrId;
      else if (
        !this._state.selectedId ||
        !events.some((e) => e.id === this._state.selectedId)
      ) {
        this._state.selectedId = events[0]?.id || null;
      }
    } catch (e) {
      this._state.error = e.message || String(e);
    }
    this._state.loading = false;
    this.render();
  }

  filteredEvents() {
    const q = this._state.q.trim().toLowerCase();
    return this._state.events.filter((e) => {
      if (this._state.status !== "All" && e.status !== this._state.status) {
        return false;
      }
      if (q) {
        const hay = `${e.name} ${e.highlight} ${e.audience}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  selected() {
    return (
      this._state.events.find((e) => e.id === this._state.selectedId) || null
    );
  }

  regsFor(eventId) {
    return this._state.registrations.filter((r) => r.eventId === eventId);
  }

  scoresFor(eventId) {
    return this._state.scores.filter((s) => s.eventId === eventId);
  }

  usesRegistration(event) {
    if (!event) return false;
    if (event.registrationOpen) return true;
    if (Number(event.capacity) > 0) return true;
    if (event.registrationClosesAt) return true;
    return this.regsFor(event.id).length > 0;
  }

  renderShell() {
    if (!this.querySelector(".mhe")) {
      this.innerHTML = `<div class="mhe" part="root"></div>`;
    }
  }

  render() {
    this.renderShell();
    const root = this.querySelector(".mhe");
    if (!root) return;
    const view = this.view;
    if (view === "judge") {
      root.innerHTML = this.judgeOnlyHtml();
    } else if (view === "detail") {
      root.innerHTML = this.detailOnlyHtml();
    } else {
      root.innerHTML = this.catalogHtml();
    }
    this.bind(root);
  }

  catalogHtml() {
    const list = this.filteredEvents();
    const selected = this.selected();
    return `
      <div class="mhe__header">
        <h2 class="mhe__title">Mexico Hub Events</h2>
        <span class="mhe__meta">${this._state.loading ? "Loading…" : `${list.length} shown`}</span>
      </div>
      ${this._state.error ? `<p class="mhe__err">${esc(this._state.error)}</p>` : ""}
      ${this._state.notice ? `<p class="mhe__ok">${esc(this._state.notice)}</p>` : ""}
      <div class="mhe__filters">
        <input type="search" data-mhe-q placeholder="Search…" value="${esc(this._state.q)}" />
        <select data-mhe-status>
          <option value="All"${this._state.status === "All" ? " selected" : ""}>All statuses</option>
          <option value="Upcoming"${this._state.status === "Upcoming" ? " selected" : ""}>Upcoming</option>
          <option value="Completed"${this._state.status === "Completed" ? " selected" : ""}>Completed</option>
          <option value="Recurring"${this._state.status === "Recurring" ? " selected" : ""}>Recurring</option>
        </select>
        <button type="button" class="mhe-btn" data-mhe-refresh>Refresh</button>
      </div>
      <div class="mhe__layout mhe__layout--split">
        <ul class="mhe__list">
          ${
            list.length
              ? list
                  .map(
                    (e) => `
            <li>
              <button type="button" class="mhe__item${e.id === this._state.selectedId ? " is-active" : ""}" data-mhe-select="${esc(e.id)}">
                <span class="mhe__item-name">${esc(e.name)}</span>
                <span class="mhe__item-when">${esc(e.when)} · ${esc(e.city || "Mexico")}</span>
                <div class="mhe__chips">
                  <span class="mhe-chip">${esc(e.status)}</span>
                  ${e.registrationOpen ? `<span class="mhe-chip mhe-chip--open">Reg open</span>` : ""}
                </div>
              </button>
            </li>`,
                  )
                  .join("")
              : `<li class="mhe__empty">No events match.</li>`
          }
        </ul>
        <div class="mhe__panel">${selected ? this.detailInner(selected) : `<p class="mhe__empty">Select an event.</p>`}</div>
      </div>`;
  }

  detailOnlyHtml() {
    const selected = this.selected();
    return `
      <div class="mhe__header">
        <h2 class="mhe__title">Event detail</h2>
        <button type="button" class="mhe-btn" data-mhe-refresh>Refresh</button>
      </div>
      ${this._state.error ? `<p class="mhe__err">${esc(this._state.error)}</p>` : ""}
      ${this._state.notice ? `<p class="mhe__ok">${esc(this._state.notice)}</p>` : ""}
      <div class="mhe__panel">${selected ? this.detailInner(selected) : `<p class="mhe__empty">Set event-id.</p>`}</div>`;
  }

  judgeOnlyHtml() {
    const selected = this.selected();
    return `
      <div class="mhe__header">
        <h2 class="mhe__title">Judge scoring</h2>
        <button type="button" class="mhe-btn" data-mhe-refresh>Refresh</button>
      </div>
      ${this._state.error ? `<p class="mhe__err">${esc(this._state.error)}</p>` : ""}
      ${this._state.notice ? `<p class="mhe__ok">${esc(this._state.notice)}</p>` : ""}
      <div class="mhe__panel">${selected ? this.judgeInner(selected) : `<p class="mhe__empty">Set event-id.</p>`}</div>`;
  }

  detailInner(event) {
    const L = event.es && this.lang === "es" ? { ...event, ...event.es } : event;
    const regs = this.regsFor(event.id);
    const scores = this.scoresFor(event.id);
    const surface = this.usesRegistration(event);
    const n = regs.length;
    const cap = Number(event.capacity) || 0;
    const pct = cap > 0 ? Math.min(100, Math.round((n / cap) * 100)) : 0;
    return `
      <h3>${esc(L.name)}</h3>
      <div class="mhe__chips">
        <span class="mhe-chip">${esc(event.category)}</span>
        <span class="mhe-chip">${esc(event.status)}</span>
        ${event.registrationOpen ? `<span class="mhe-chip mhe-chip--open">Registration open</span>` : surface ? `<span class="mhe-chip">Registration closed</span>` : ""}
      </div>
      ${
        cap > 0
          ? `<div class="mhe__cap"><div class="mhe__label">Teams ${n} / ${cap}</div><div class="mhe__cap-bar"><div class="mhe__cap-fill" style="width:${pct}%"></div></div></div>`
          : ""
      }
      <p class="mhe__label">When</p><p>${esc(L.when)}</p>
      <p class="mhe__label">Highlight</p><p>${esc(L.highlight)}</p>
      ${
        surface
          ? `<p class="mhe__label">Registered teams</p>
        ${
          regs.length
            ? `<ul>${regs.map((r) => `<li><strong>${esc(r.teamName)}</strong> — ${esc(r.leadEmail || "")}</li>`).join("")}</ul>`
            : `<p class="mhe__empty">No teams yet.</p>`
        }
        ${this.scoreboardHtml(scores)}
        <div class="mhe__actions">
          ${
            event.registrationOpen
              ? `<button type="button" class="mhe-btn mhe-btn--primary" data-mhe-show-reg>Register team</button>`
              : ""
          }
          ${this.token ? `<button type="button" class="mhe-btn" data-mhe-show-judge>Judge scoring</button>` : ""}
          <a class="mhe-btn" href="${esc(joinBase(this.baseUrl, `#event/${event.id}`))}" target="_blank" rel="noopener">Open in Hub</a>
        </div>
        <div data-mhe-reg-form hidden>${this.registerFormHtml(event)}</div>
        <div data-mhe-judge-wrap hidden>${this.judgeInner(event)}</div>`
          : `<div class="mhe__actions"><a class="mhe-btn" href="${esc(joinBase(this.baseUrl, `#event/${event.id}`))}" target="_blank" rel="noopener">Open in Hub</a></div>`
      }`;
  }

  scoreboardHtml(scores) {
    const visible = scores.filter((s) => s.published || this.token);
    if (!visible.length) {
      return `<p class="mhe__empty">${this.token ? "No scores yet." : "Scoreboard not published yet."}</p>`;
    }
    const sorted = [...visible].sort((a, b) => (b.total || 0) - (a.total || 0));
    return `<table><thead><tr><th>Team</th><th>Demo</th><th>Deck</th><th>Code</th><th>Total</th></tr></thead><tbody>
      ${sorted.map((s) => `<tr><td>${esc(s.teamName)}</td><td>${s.demo}</td><td>${s.deck}</td><td>${s.code}</td><td><strong>${s.total}</strong></td></tr>`).join("")}
    </tbody></table>`;
  }

  registerFormHtml(event) {
    return `
      <form class="mhe__form" data-mhe-register data-event-id="${esc(event.id)}">
        <label>Team name <input name="teamName" required maxlength="120" /></label>
        <label>Lead name <input name="leadName" required /></label>
        <label>Lead email <input name="leadEmail" type="email" required /></label>
        <label>Invite code <input name="inviteCode" value="OPEN" /></label>
        <button type="submit" class="mhe-btn mhe-btn--primary" ${this.token ? "" : "disabled"}>Submit (needs github-token)</button>
        ${this.token ? "" : `<p class="mhe__empty">Host must set github-token for in-widget publish, or use Open in Hub.</p>`}
      </form>`;
  }

  judgeInner(event) {
    const regs = this.regsFor(event.id);
    if (!regs.length) return `<p class="mhe__empty">No teams to score yet.</p>`;
    if (!this.token) {
      return `<p class="mhe__empty">Set github-token on the element to score from the embed.</p>`;
    }
    return regs
      .map((r) => {
        const existing = this.scoresFor(event.id).find(
          (s) => s.registrationId === r.id,
        );
        return `
        <form class="mhe__judge" data-mhe-score data-event-id="${esc(event.id)}" data-reg-id="${esc(r.id)}" data-team="${esc(r.teamName)}">
          <h4>${esc(r.teamName)}</h4>
          <div class="mhe__judge-grid">
            <label>Demo <input type="number" min="1" max="5" name="demo" value="${existing?.demo || 3}" /></label>
            <label>Deck <input type="number" min="1" max="5" name="deck" value="${existing?.deck || 3}" /></label>
            <label>Code <input type="number" min="1" max="5" name="code" value="${existing?.code || 3}" /></label>
          </div>
          <label>Notes <input type="text" name="notes" value="${esc(existing?.notes || "")}" /></label>
          <button type="submit" class="mhe-btn mhe-btn--primary">Save score</button>
        </form>`;
      })
      .join("");
  }

  bind(root) {
    root.querySelector("[data-mhe-refresh]")?.addEventListener("click", () => {
      this._state.notice = "";
      this.refresh();
    });
    root.querySelector("[data-mhe-q]")?.addEventListener("input", (e) => {
      this._state.q = e.target.value;
      this.render();
    });
    root.querySelector("[data-mhe-status]")?.addEventListener("change", (e) => {
      this._state.status = e.target.value;
      this.render();
    });
    root.querySelectorAll("[data-mhe-select]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._state.selectedId = btn.getAttribute("data-mhe-select");
        this._state.notice = "";
        this.setAttribute("event-id", this._state.selectedId);
        this.render();
      });
    });
    root.querySelector("[data-mhe-show-reg]")?.addEventListener("click", () => {
      const el = root.querySelector("[data-mhe-reg-form]");
      if (el) el.hidden = !el.hidden;
    });
    root.querySelector("[data-mhe-show-judge]")?.addEventListener("click", () => {
      const el = root.querySelector("[data-mhe-judge-wrap]");
      if (el) el.hidden = !el.hidden;
    });
    root.querySelector("[data-mhe-register]")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.submitRegistration(new FormData(e.target), e.target.getAttribute("data-event-id"));
    });
    root.querySelectorAll("[data-mhe-score]").forEach((form) => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.submitScore(form);
      });
    });
  }

  async submitRegistration(fd, eventId) {
    if (!this.token) {
      this._state.error = "github-token required to publish registration.";
      this.render();
      return;
    }
    try {
      const remote = await getRemote(
        this.owner,
        this.repo,
        "data/registrations.json",
        this.token,
      );
      const registrations = Array.isArray(remote.payload?.registrations)
        ? [...remote.payload.registrations]
        : [];
      const record = {
        id: `reg-${Date.now().toString(36)}`,
        eventId,
        teamName: String(fd.get("teamName") || "").trim(),
        leadName: String(fd.get("leadName") || "").trim(),
        leadEmail: String(fd.get("leadEmail") || "").trim(),
        inviteCode: String(fd.get("inviteCode") || "OPEN").trim(),
        members: [],
        pptUrl: "",
        videoUrl: "",
        repoUrl: "",
        channel: "embed",
        createdAt: new Date().toISOString(),
        createdBy: "embed",
      };
      if (!record.teamName) throw new Error("Team name required");
      registrations.push(record);
      await putRemote(
        this.owner,
        this.repo,
        "data/registrations.json",
        this.token,
        { updatedAt: new Date().toISOString().slice(0, 10), registrations },
        `chore: embed registration ${record.teamName}`,
      );
      this._state.notice = "Registration published. Refresh in ~1 minute on Pages.";
      this._state.error = "";
      await this.refresh();
    } catch (e) {
      this._state.error = e.message || String(e);
      this.render();
    }
  }

  async submitScore(form) {
    if (!this.token) return;
    const fd = new FormData(form);
    try {
      const remote = await getRemote(
        this.owner,
        this.repo,
        "data/scores.json",
        this.token,
      );
      const scores = Array.isArray(remote.payload?.scores)
        ? [...remote.payload.scores]
        : [];
      const eventId = form.getAttribute("data-event-id");
      const registrationId = form.getAttribute("data-reg-id");
      const id = `score-${eventId}-${registrationId}`;
      const demo = Number(fd.get("demo")) || 0;
      const deck = Number(fd.get("deck")) || 0;
      const code = Number(fd.get("code")) || 0;
      const next = {
        id,
        eventId,
        registrationId,
        teamName: form.getAttribute("data-team") || "",
        demo,
        deck,
        code,
        notes: String(fd.get("notes") || "").trim(),
        total: demo + deck + code,
        published: false,
        updatedAt: new Date().toISOString(),
        updatedBy: "embed",
      };
      const idx = scores.findIndex((s) => s.id === id);
      if (idx >= 0) scores[idx] = { ...scores[idx], ...next };
      else scores.push(next);
      await putRemote(
        this.owner,
        this.repo,
        "data/scores.json",
        this.token,
        { updatedAt: new Date().toISOString().slice(0, 10), scores },
        `chore: embed score ${next.teamName}`,
      );
      this._state.notice = "Score saved.";
      this._state.error = "";
      await this.refresh();
    } catch (e) {
      this._state.error = e.message || String(e);
      this.render();
    }
  }
}

if (!customElements.get("mexico-hub-events")) {
  customElements.define("mexico-hub-events", MexicoHubEvents);
}

export { MexicoHubEvents };
