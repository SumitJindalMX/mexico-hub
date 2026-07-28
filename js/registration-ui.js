(() => {
  function $(id) {
    return document.getElementById(id);
  }

  function showError(el, message) {
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function memberRowHtml() {
    return `
      <div class="member-row">
        <input type="text" name="memberName" placeholder="Name" required />
        <input type="email" name="memberEmail" placeholder="Email" />
        <input type="text" name="memberRole" placeholder="Role" value="Member" />
        <button type="button" class="btn btn--ghost btn--sm btn-remove-member" title="Remove">Remove</button>
      </div>
    `;
  }

  function collectMembers(container) {
    return [...container.querySelectorAll(".member-row")].map((row) => ({
      name: row.querySelector('[name="memberName"]').value,
      email: row.querySelector('[name="memberEmail"]').value,
      role: row.querySelector('[name="memberRole"]').value,
    }));
  }

  function bindMemberList(container, addBtn) {
    addBtn.addEventListener("click", () => {
      container.insertAdjacentHTML("beforeend", memberRowHtml());
    });
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-remove-member");
      if (!btn) return;
      const rows = container.querySelectorAll(".member-row");
      if (rows.length <= 1) return;
      btn.closest(".member-row")?.remove();
    });
  }

  function openRegisterModal(event) {
    const modal = $("modal-register");
    const form = $("form-register");
    const members = $("reg-members");
    showError($("register-error"), "");
    form.reset();
    $("reg-event-id").value = event.id;
    $("reg-event-name").textContent = event.name;
    members.innerHTML = memberRowHtml();
    const profile = window.GDLM365Auth.getProfile();
    if (profile) {
      $("reg-lead-name").value = profile.name || "";
      $("reg-lead-email").value = profile.email || profile.upn || "";
    }
    modal.showModal();
  }

  async function openOrganizeModal(event) {
    const modal = $("modal-organize");
    showError($("organize-error"), "");
    $("org-event-id").value = event.id;
    $("org-event-name").textContent = event.name;
    $("org-invites").innerHTML = "<p class='modal__hint'>Loading…</p>";
    $("org-regs").innerHTML = "<p class='modal__hint'>Loading…</p>";
    modal.showModal();
    await refreshOrganizePanels(event.id);
  }

  async function refreshOrganizePanels(eventId) {
    try {
      const [invites, regs] = await Promise.all([
        window.GDLGraph.listInvites(eventId),
        window.GDLGraph.listRegistrations(eventId),
      ]);
      $("org-invites").innerHTML = invites.length
        ? `<table class="data"><thead><tr><th>Code</th><th>Used</th><th>Max</th><th>Active</th></tr></thead><tbody>${invites
            .map(
              (i) =>
                `<tr><td><code>${i.code}</code></td><td>${i.usedCount ?? 0}</td><td>${i.maxUses ?? "—"}</td><td>${i.active}</td></tr>`,
            )
            .join("")}</tbody></table>`
        : "<p class='modal__hint'>No invites yet. Generate one below.</p>";

      if (!regs.length) {
        $("org-regs").innerHTML =
          "<p class='modal__hint'>No team registrations yet.</p>";
        return;
      }

      const blocks = [];
      for (const r of regs) {
        const members = await window.GDLGraph.listTeamMembers(r.id);
        const memberList = members
          .map((m) => `${m.name}${m.email ? ` &lt;${m.email}&gt;` : ""} (${m.role || "Member"})`)
          .join("<br>");
        blocks.push(`
          <article class="reg-card">
            <h4>${r.teamName}</h4>
            <p>Lead: ${r.leadName || "—"} · ${r.leadEmail || r.leadUpn || ""}</p>
            <p class="modal__hint">Members:<br>${memberList || "—"}</p>
            <p>
              ${r.pptUrl ? `<a href="${r.pptUrl}" target="_blank" rel="noopener">PPT</a>` : "No PPT"}
              ·
              ${r.videoUrl ? `<a href="${r.videoUrl}" target="_blank" rel="noopener">Video</a>` : "No video"}
            </p>
          </article>
        `);
      }
      $("org-regs").innerHTML = blocks.join("");
    } catch (err) {
      showError($("organize-error"), err.message || "Failed to load organizer data.");
    }
  }

  function wire(appApi) {
    const members = $("reg-members");
    const addMember = $("btn-add-member");
    if (members && addMember) bindMemberList(members, addMember);

    $("btn-ms-signin")?.addEventListener("click", async () => {
      try {
        await window.GDLM365Auth.login();
        appApi.onM365AuthChanged();
      } catch (err) {
        alert(err.message || "Microsoft sign-in failed.");
      }
    });

    $("btn-ms-signout")?.addEventListener("click", async () => {
      try {
        await window.GDLM365Auth.logout();
      } catch {
        /* ignore */
      }
      appApi.onM365AuthChanged();
    });

    $("btn-register-cancel")?.addEventListener("click", () => {
      $("modal-register")?.close();
    });

    $("form-register")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submit = $("btn-register-submit");
      submit.disabled = true;
      showError($("register-error"), "");
      try {
        if (!window.GDLM365Auth.getProfile()) {
          await window.GDLM365Auth.login();
          appApi.onM365AuthChanged();
        }
        const profile = window.GDLM365Auth.getProfile();
        const eventId = $("reg-event-id").value;
        const result = await window.GDLGraph.registerTeam({
          eventId,
          inviteCode: $("reg-invite").value,
          teamName: $("reg-team-name").value,
          leadName: $("reg-lead-name").value,
          leadEmail: $("reg-lead-email").value,
          leadUpn: profile?.upn || "",
          members: collectMembers($("reg-members")),
          pptFile: $("reg-ppt").files[0] || null,
          videoFile: $("reg-video").files[0] || null,
        });
        $("modal-register").close();
        alert(
          `Team "${result.teamName}" registered.\n` +
            (result.pptUrl ? `PPT: ${result.pptUrl}\n` : "") +
            (result.videoUrl ? `Video: ${result.videoUrl}` : ""),
        );
      } catch (err) {
        showError($("register-error"), err.message || "Registration failed.");
      } finally {
        submit.disabled = false;
      }
    });

    $("btn-organize-cancel")?.addEventListener("click", () => {
      $("modal-organize")?.close();
    });

    $("form-invite")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submit = $("btn-invite-submit");
      submit.disabled = true;
      showError($("organize-error"), "");
      try {
        if (!window.GDLM365Auth.getProfile()) {
          await window.GDLM365Auth.login();
          appApi.onM365AuthChanged();
        }
        const eventId = $("org-event-id").value;
        const maxUses = Number($("org-max-uses").value) || 50;
        const expiresOn = $("org-expires").value || null;
        const created = await window.GDLGraph.createInvite({
          eventId,
          maxUses,
          expiresOn,
        });
        alert(`Invite created: ${created.code}`);
        await refreshOrganizePanels(eventId);
      } catch (err) {
        showError($("organize-error"), err.message || "Could not create invite.");
      } finally {
        submit.disabled = false;
      }
    });
  }

  window.GDLRegistrationUI = {
    wire,
    openRegisterModal,
    openOrganizeModal,
  };
})();
