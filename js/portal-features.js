/**
 * Role-aware portal features: my regs, calendar, gallery, analytics,
 * notifications, scoring helpers, judge CSV, capacity/deadline checks.
 */
(() => {
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function regsForEvent(regs, eventId) {
    return (regs || []).filter((r) => r.eventId === eventId);
  }

  function isRegistrationClosed(event, regs) {
    const t = window.GDLi18n?.t || ((k, v) => k);
    if (!event?.registrationOpen) return { closed: true, reason: t("gate.closed") };
    if (event.registrationClosesAt) {
      const ts = Date.parse(event.registrationClosesAt);
      if (Number.isFinite(ts) && Date.now() > ts) {
        return { closed: true, reason: t("gate.deadline") };
      }
    }
    if (event.capacity > 0) {
      const n = regsForEvent(regs, event.id).length;
      if (n >= event.capacity) {
        return { closed: true, reason: t("gate.capacity", { n, cap: event.capacity }) };
      }
    }
    return { closed: false, reason: "" };
  }

  function countdownHtml(event) {
    const t = window.GDLi18n?.t || ((k, v) => k);
    if (!event?.registrationClosesAt) return "";
    const ts = Date.parse(event.registrationClosesAt);
    if (!Number.isFinite(ts)) return "";
    const ms = ts - Date.now();
    if (ms <= 0) {
      return `<p class="detail__countdown is-closed">${t("countdown.passed")}</p>`;
    }
    const h = Math.floor(ms / 36e5);
    const d = Math.floor(h / 24);
    const left = d >= 1 ? t("countdown.days", { d, h: h % 24 }) : t("countdown.hours", { h });
    return `<p class="detail__countdown">${t("countdown.closes", {
      when: esc(new Date(ts).toLocaleString()),
      left: `<strong>${left}</strong>`,
    })}</p>`;
  }

  function capacityHtml(event, regs) {
    const t = window.GDLi18n?.t || ((k, v) => k);
    if (!(event?.capacity > 0)) return "";
    const n = regsForEvent(regs, event.id).length;
    return `<p class="detail__capacity">${t("capacity.teams", {
      n: `<strong>${n}</strong>`,
      cap: `<strong>${event.capacity}</strong>`,
    })}</p>`;
  }

  function demoSlotsHtml(event) {
    const t = window.GDLi18n?.t || ((k) => k);
    const slots = event?.demoSlots || [];
    if (!slots.length) return "";
    return `<div class="detail-block"><h3>${t("demo.title")}</h3><ul class="demo-slots">${slots
      .map(
        (s) =>
          `<li><strong>${esc(new Date(s.at).toLocaleString())}</strong> — ${esc(s.label || t("demo.slot"))}${
            s.link ? ` · <a href="${esc(s.link)}" target="_blank" rel="noopener">${t("demo.join")}</a>` : ""
          }</li>`,
      )
      .join("")}</ul></div>`;
  }

  function scoreboardHtml(eventId, scores, canSeeUnpublished) {
    const t = window.GDLi18n?.t || ((k) => k);
    const mine = (scores || []).filter((s) => s.eventId === eventId);
    const visible = canSeeUnpublished ? mine : mine.filter((s) => s.published);
    if (!visible.length) {
      return canSeeUnpublished
        ? `<p class="detail__text">${t("score.noneJudge")}</p>`
        : `<p class="detail__text">${t("score.nonePublic")}</p>`;
    }
    const sorted = [...visible].sort((a, b) => (b.total || 0) - (a.total || 0));
    return `<table class="data scoreboard"><thead><tr><th>${t("score.team")}</th><th>${t("score.demo")}</th><th>${t("score.deck")}</th><th>${t("score.code")}</th><th>${t("score.total")}</th></tr></thead><tbody>${sorted
      .map(
        (s) =>
          `<tr><td>${esc(s.teamName)}</td><td>${s.demo}</td><td>${s.deck}</td><td>${s.code}</td><td><strong>${s.total}</strong></td></tr>`,
      )
      .join("")}</tbody></table>`;
  }

  function judgeFormHtml(event, regs, scores) {
    const t = window.GDLi18n?.t || ((k) => k);
    if (!regs.length) return `<p class="detail__text">${t("score.noneTeams")}</p>`;
    return regs
      .map((r) => {
        const existing = (scores || []).find(
          (s) => s.eventId === event.id && s.registrationId === r.id,
        );
        return `<form class="judge-form" data-judge-form data-event-id="${esc(event.id)}" data-reg-id="${esc(r.id)}" data-team="${esc(r.teamName)}">
          <h4>${esc(r.teamName)}</h4>
          <div class="judge-form__grid">
            <label>${t("score.demo")} <input type="number" min="1" max="5" name="demo" value="${existing?.demo || 3}" /></label>
            <label>${t("score.deck")} <input type="number" min="1" max="5" name="deck" value="${existing?.deck || 3}" /></label>
            <label>${t("score.code")} <input type="number" min="1" max="5" name="code" value="${existing?.code || 3}" /></label>
          </div>
          <label class="judge-form__notes">${t("score.notes")} <input type="text" name="notes" value="${esc(existing?.notes || "")}" /></label>
          <button type="submit" class="btn btn--primary btn--sm">${t("score.save")}</button>
        </form>`;
      })
      .join("");
  }

  function renderMyRegs(root, regs, events, email) {
    const t = window.GDLi18n?.t || ((k, v) => k);
    if (!root) return;
    if (!email) {
      root.innerHTML = `<p class="modal__hint">${t("myRegs.needGoogle")}</p>`;
      return;
    }
    const mine = (regs || []).filter(
      (r) => String(r.leadEmail || "").toLowerCase() === String(email).toLowerCase(),
    );
    if (!mine.length) {
      root.innerHTML = `<p class="modal__hint">${t("myRegs.empty", { email: `<strong>${esc(email)}</strong>` })}</p>`;
      return;
    }
    root.innerHTML = mine
      .map((r) => {
        const ev = (events || []).find((e) => e.id === r.eventId);
        return `<article class="my-reg-card">
          <h3>${esc(r.teamName)}</h3>
          <p>${esc(ev?.name || r.eventId)}</p>
          <p class="modal__hint">${esc(r.leadName || "")} · ${esc(r.leadEmail || "")}</p>
          <p>
            ${r.pptUrl ? `<a href="${esc(r.pptUrl)}" target="_blank" rel="noopener">${t("detail.ppt")}</a>` : t("detail.noPptShort")}
            · ${r.videoUrl ? `<a href="${esc(r.videoUrl)}" target="_blank" rel="noopener">${t("detail.video")}</a>` : t("detail.noVideoShort")}
            · ${r.repoUrl ? `<a href="${esc(r.repoUrl)}" target="_blank" rel="noopener">${t("detail.repo")}</a>` : t("detail.noRepo")}
          </p>
          <a class="btn btn--ghost btn--sm" href="#event/${esc(r.eventId)}">${t("myRegs.open")}</a>
        </article>`;
      })
      .join("");
  }

  function renderCalendar(root, events) {
    if (!root) return;
    const upcoming = [...(events || [])]
      .filter((e) => e.sortKey)
      .sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
    if (!upcoming.length) {
      root.innerHTML = `<p class="modal__hint">No dated activities yet.</p>`;
      return;
    }
    const byMonth = {};
    upcoming.forEach((e) => {
      const key = String(e.sortKey).slice(0, 7);
      (byMonth[key] ||= []).push(e);
    });
    root.innerHTML = Object.keys(byMonth)
      .sort()
      .map((month) => {
        return `<div class="cal-month"><h3>${esc(month)}</h3><ul>${byMonth[month]
          .map(
            (e) =>
              `<li><a href="#event/${esc(e.id)}"><strong>${esc(e.sortKey)}</strong> — ${esc(e.name)}</a>
              <button type="button" class="btn btn--ghost btn--sm" data-ics-id="${esc(e.id)}">ICS</button></li>`,
          )
          .join("")}</ul></div>`;
      })
      .join("");
  }

  function renderGallery(root, items) {
    const t = window.GDLi18n?.t || ((k) => k);
    if (!root) return;
    if (!items?.length) {
      root.innerHTML = `<p class="modal__hint">${t("gallery.empty")}</p>`;
      return;
    }
    root.innerHTML = items
      .map(
        (g) => `<article class="gallery-card">
        <p class="gallery-card__place">${esc(g.place || t("gallery.highlight"))}</p>
        <h3>${esc(g.teamName)}</h3>
        <p>${esc(g.eventName || g.eventId)}</p>
        <p class="modal__hint">${esc(g.highlight || "")}</p>
        ${g.repoUrl ? `<a href="${esc(g.repoUrl)}" target="_blank" rel="noopener">${t("detail.repo")}</a>` : ""}
        ${g.mediaUrl ? ` · <a href="${esc(g.mediaUrl)}" target="_blank" rel="noopener">Media</a>` : ""}
      </article>`,
      )
      .join("");
  }

  function renderAnalytics(root, events, regs) {
    const t = window.GDLi18n?.t || ((k) => k);
    if (!root) return;
    const byCat = {};
    const byCity = {};
    let open = 0;
    let full = 0;
    (events || []).forEach((e) => {
      byCat[e.category] = (byCat[e.category] || 0) + 1;
      const city = e.city || "Mexico";
      byCity[city] = (byCity[city] || 0) + 1;
      if (e.registrationOpen) open += 1;
      if (e.capacity > 0) {
        const n = regsForEvent(regs, e.id).length;
        if (n >= e.capacity) full += 1;
      }
    });
    root.innerHTML = `
      <div class="analytics-grid">
        <div class="analytics-card"><p class="analytics-card__label">${t("analytics.activities")}</p><p class="analytics-card__value">${(events || []).length}</p></div>
        <div class="analytics-card"><p class="analytics-card__label">${t("analytics.open")}</p><p class="analytics-card__value">${open}</p></div>
        <div class="analytics-card"><p class="analytics-card__label">${t("analytics.full")}</p><p class="analytics-card__value">${full}</p></div>
        <div class="analytics-card"><p class="analytics-card__label">${t("analytics.regs")}</p><p class="analytics-card__value">${(regs || []).length}</p></div>
      </div>
      <div class="analytics-split">
        <div><h3>${t("analytics.byCategory")}</h3><ul>${Object.entries(byCat)
          .map(([k, v]) => `<li>${esc(t(`cat.${k}`) !== `cat.${k}` ? t(`cat.${k}`) : k)}: ${v}</li>`)
          .join("")}</ul></div>
        <div><h3>${t("analytics.byCity")}</h3><ul>${Object.entries(byCity)
          .map(([k, v]) => `<li>${esc(k)}: ${v}</li>`)
          .join("")}</ul></div>
      </div>`;
  }

  function renderNotifications(panel, list, readSet) {
    const t = window.GDLi18n?.t || ((k) => k);
    if (!panel) return;
    if (!list?.length) {
      panel.innerHTML = `<p class="modal__hint">${t("notify.empty")}</p>`;
      return;
    }
    panel.innerHTML = list
      .map((n) => {
        const unread = !readSet.has(n.id);
        return `<article class="notify-item ${unread ? "is-unread" : ""}" data-notify-id="${esc(n.id)}">
          <h4>${esc(n.title)}</h4>
          <p>${esc(n.body)}</p>
          ${n.eventId ? `<a href="#event/${esc(n.eventId)}">${t("myRegs.open")}</a>` : ""}
        </article>`;
      })
      .join("");
  }

  function exportJudgePackCsv(event, regs, scores) {
    const rows = [["team", "lead", "email", "ppt", "video", "repo", "validation", "demo", "deck", "code", "total"]];
    regs.forEach((r) => {
      const s = (scores || []).find((x) => x.registrationId === r.id) || {};
      rows.push([
        r.teamName,
        r.leadName,
        r.leadEmail,
        r.pptUrl || "",
        r.videoUrl || "",
        r.repoUrl || "",
        r.validation?.summary || r.validation?.status || "",
        s.demo ?? "",
        s.deck ?? "",
        s.code ?? "",
        s.total ?? "",
      ]);
    });
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${event.id || "event"}-judge-pack.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function parseHashEventId() {
    const m = location.hash.match(/^#event\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function setEventHash(id) {
    if (!id) return;
    const next = `#event/${id}`;
    if (location.hash !== next) history.replaceState(null, "", next);
  }

  window.GDLPortal = {
    esc,
    regsForEvent,
    isRegistrationClosed,
    countdownHtml,
    capacityHtml,
    demoSlotsHtml,
    scoreboardHtml,
    judgeFormHtml,
    renderMyRegs,
    renderCalendar,
    renderGallery,
    renderAnalytics,
    renderNotifications,
    exportJudgePackCsv,
    parseHashEventId,
    setEventHash,
  };
})();
