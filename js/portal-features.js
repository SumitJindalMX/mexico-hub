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
    if (!event?.registrationOpen) return { closed: true, reason: "Registration is closed." };
    if (event.registrationClosesAt) {
      const t = Date.parse(event.registrationClosesAt);
      if (Number.isFinite(t) && Date.now() > t) {
        return { closed: true, reason: "Registration deadline has passed." };
      }
    }
    if (event.capacity > 0) {
      const n = regsForEvent(regs, event.id).length;
      if (n >= event.capacity) {
        return { closed: true, reason: `Capacity reached (${n}/${event.capacity}).` };
      }
    }
    return { closed: false, reason: "" };
  }

  function countdownHtml(event) {
    if (!event?.registrationClosesAt) return "";
    const t = Date.parse(event.registrationClosesAt);
    if (!Number.isFinite(t)) return "";
    const ms = t - Date.now();
    if (ms <= 0) {
      return `<p class="detail__countdown is-closed">Registration deadline passed</p>`;
    }
    const h = Math.floor(ms / 36e5);
    const d = Math.floor(h / 24);
    const label = d >= 1 ? `${d}d ${h % 24}h left` : `${h}h left`;
    return `<p class="detail__countdown">Closes ${esc(new Date(t).toLocaleString())} · <strong>${label}</strong></p>`;
  }

  function capacityHtml(event, regs) {
    if (!(event?.capacity > 0)) return "";
    const n = regsForEvent(regs, event.id).length;
    return `<p class="detail__capacity">Teams: <strong>${n} / ${event.capacity}</strong></p>`;
  }

  function demoSlotsHtml(event) {
    const slots = event?.demoSlots || [];
    if (!slots.length) return "";
    return `<div class="detail-block"><h3>Demo day schedule</h3><ul class="demo-slots">${slots
      .map(
        (s) =>
          `<li><strong>${esc(new Date(s.at).toLocaleString())}</strong> — ${esc(s.label || "Slot")}${
            s.link ? ` · <a href="${esc(s.link)}" target="_blank" rel="noopener">Join</a>` : ""
          }</li>`,
      )
      .join("")}</ul></div>`;
  }

  function scoreboardHtml(eventId, scores, canSeeUnpublished) {
    const mine = (scores || []).filter((s) => s.eventId === eventId);
    const visible = canSeeUnpublished ? mine : mine.filter((s) => s.published);
    if (!visible.length) {
      return canSeeUnpublished
        ? `<p class="detail__text">No scores yet. Judges can score teams below.</p>`
        : `<p class="detail__text">Scoreboard not published yet.</p>`;
    }
    const sorted = [...visible].sort((a, b) => (b.total || 0) - (a.total || 0));
    return `<table class="data scoreboard"><thead><tr><th>Team</th><th>Demo</th><th>Deck</th><th>Code</th><th>Total</th></tr></thead><tbody>${sorted
      .map(
        (s) =>
          `<tr><td>${esc(s.teamName)}</td><td>${s.demo}</td><td>${s.deck}</td><td>${s.code}</td><td><strong>${s.total}</strong></td></tr>`,
      )
      .join("")}</tbody></table>`;
  }

  function judgeFormHtml(event, regs, scores) {
    if (!regs.length) return `<p class="detail__text">No teams to score yet.</p>`;
    return regs
      .map((r) => {
        const existing = (scores || []).find(
          (s) => s.eventId === event.id && s.registrationId === r.id,
        );
        return `<form class="judge-form" data-judge-form data-event-id="${esc(event.id)}" data-reg-id="${esc(r.id)}" data-team="${esc(r.teamName)}">
          <h4>${esc(r.teamName)}</h4>
          <div class="judge-form__grid">
            <label>Demo <input type="number" min="1" max="5" name="demo" value="${existing?.demo || 3}" /></label>
            <label>Deck <input type="number" min="1" max="5" name="deck" value="${existing?.deck || 3}" /></label>
            <label>Code <input type="number" min="1" max="5" name="code" value="${existing?.code || 3}" /></label>
          </div>
          <label class="judge-form__notes">Notes <input type="text" name="notes" value="${esc(existing?.notes || "")}" /></label>
          <button type="submit" class="btn btn--primary btn--sm">Save score</button>
        </form>`;
      })
      .join("");
  }

  function renderMyRegs(root, regs, events, email) {
    if (!root) return;
    if (!email) {
      root.innerHTML = `<p class="modal__hint">Sign in with Google to see registrations where you are the team lead.</p>`;
      return;
    }
    const mine = (regs || []).filter(
      (r) => String(r.leadEmail || "").toLowerCase() === String(email).toLowerCase(),
    );
    if (!mine.length) {
      root.innerHTML = `<p class="modal__hint">No published registrations for <strong>${esc(email)}</strong> yet.</p>`;
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
            ${r.pptUrl ? `<a href="${esc(r.pptUrl)}" target="_blank" rel="noopener">PPT</a>` : "No PPT"}
            · ${r.videoUrl ? `<a href="${esc(r.videoUrl)}" target="_blank" rel="noopener">Video</a>` : "No video"}
            · ${r.repoUrl ? `<a href="${esc(r.repoUrl)}" target="_blank" rel="noopener">Repo</a>` : "No repo"}
          </p>
          <a class="btn btn--ghost btn--sm" href="#event/${esc(r.eventId)}">Open activity</a>
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
    if (!root) return;
    if (!items?.length) {
      root.innerHTML = `<p class="modal__hint">No gallery items yet. Organizers can promote winners after scoring.</p>`;
      return;
    }
    root.innerHTML = items
      .map(
        (g) => `<article class="gallery-card">
        <p class="gallery-card__place">${esc(g.place || "Highlight")}</p>
        <h3>${esc(g.teamName)}</h3>
        <p>${esc(g.eventName || g.eventId)}</p>
        <p class="modal__hint">${esc(g.highlight || "")}</p>
        ${g.repoUrl ? `<a href="${esc(g.repoUrl)}" target="_blank" rel="noopener">Repo</a>` : ""}
        ${g.mediaUrl ? ` · <a href="${esc(g.mediaUrl)}" target="_blank" rel="noopener">Media</a>` : ""}
      </article>`,
      )
      .join("");
  }

  function renderAnalytics(root, events, regs) {
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
        <div class="analytics-card"><p class="analytics-card__label">Activities</p><p class="analytics-card__value">${(events || []).length}</p></div>
        <div class="analytics-card"><p class="analytics-card__label">Open registration</p><p class="analytics-card__value">${open}</p></div>
        <div class="analytics-card"><p class="analytics-card__label">At capacity</p><p class="analytics-card__value">${full}</p></div>
        <div class="analytics-card"><p class="analytics-card__label">Registrations</p><p class="analytics-card__value">${(regs || []).length}</p></div>
      </div>
      <div class="analytics-split">
        <div><h3>By category</h3><ul>${Object.entries(byCat)
          .map(([k, v]) => `<li>${esc(k)}: ${v}</li>`)
          .join("")}</ul></div>
        <div><h3>By city</h3><ul>${Object.entries(byCity)
          .map(([k, v]) => `<li>${esc(k)}: ${v}</li>`)
          .join("")}</ul></div>
      </div>`;
  }

  function renderNotifications(panel, list, readSet) {
    if (!panel) return;
    if (!list?.length) {
      panel.innerHTML = `<p class="modal__hint" data-i18n="notify.empty">No alerts right now.</p>`;
      return;
    }
    panel.innerHTML = list
      .map((n) => {
        const unread = !readSet.has(n.id);
        return `<article class="notify-item ${unread ? "is-unread" : ""}" data-notify-id="${esc(n.id)}">
          <h4>${esc(n.title)}</h4>
          <p>${esc(n.body)}</p>
          ${n.eventId ? `<a href="#event/${esc(n.eventId)}">Open activity</a>` : ""}
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
