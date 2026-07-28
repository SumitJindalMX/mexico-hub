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

  function collectForm() {
    return {
      eventId: $("reg-event-id").value,
      eventName: $("reg-event-name").textContent,
      inviteCode: $("reg-invite").value || "OPEN",
      teamName: $("reg-team-name").value,
      leadName: $("reg-lead-name").value,
      leadEmail: $("reg-lead-email").value,
      members: collectMembers($("reg-members")),
      pptFile: $("reg-ppt").files[0] || null,
      videoFile: $("reg-video").files[0] || null,
      pptUrl: $("reg-ppt-url")?.value || "",
      videoUrl: $("reg-video-url")?.value || "",
    };
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
    $("reg-invite").required = false;
    $("reg-invite").placeholder = "Optional if using GitHub submit";
    const ms = window.GDLM365Auth.getProfile();
    if (ms) {
      $("reg-lead-name").value = ms.name || "";
      $("reg-lead-email").value = ms.email || ms.upn || "";
    }
    const hint = $("reg-submit-hint");
    if (hint) {
      if (ms) {
        hint.textContent =
          "Microsoft session detected — submit will use SharePoint when admin consent is granted.";
      } else if (window.GDLAuth.getSession()) {
        hint.textContent =
          "GitHub editor session detected — submit will save to data/registrations.json (no Microsoft needed). Use PPT/video links (not large file upload).";
      } else {
        hint.textContent =
          "Microsoft login blocked? Use Submit via GitHub Issue (no Entra). Prefer PPT/video links. Or Editor sign in (top bar) to publish into the repo.";
      }
    }
    modal.showModal();
  }

  function renderGithubRegs(eventId, regs) {
    const mine = regs.filter((r) => r.eventId === eventId);
    if (!mine.length) {
      return "<p class='modal__hint'>No GitHub-channel registrations yet.</p>";
    }
    return mine
      .map(
        (r) => `
      <article class="reg-card">
        <h4>${r.teamName} <span class="chip chip--editor">GitHub</span></h4>
        <p>Lead: ${r.leadName || "—"} · ${r.leadEmail || ""}</p>
        <p class="modal__hint">Members:<br>${
          (r.members || [])
            .map(
              (m) =>
                `${m.name}${m.email ? ` &lt;${m.email}&gt;` : ""} (${m.role || "Member"})`,
            )
            .join("<br>") || "—"
        }</p>
        <p>
          ${r.pptUrl ? `<a href="${r.pptUrl}" target="_blank" rel="noopener">PPT</a>` : "No PPT"}
          ·
          ${r.videoUrl ? `<a href="${r.videoUrl}" target="_blank" rel="noopener">Video</a>` : "No video"}
        </p>
      </article>
    `,
      )
      .join("");
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
    const ghRegs = await window.GDLRegistrationsStore.loadPublic().catch(() => []);
    let spBlock = "";
    try {
      if (window.GDLM365Auth.getProfile()) {
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
          : "<p class='modal__hint'>No SharePoint invites yet (needs Microsoft + consent).</p>";

        if (regs.length) {
          const blocks = [];
          for (const r of regs) {
            const members = await window.GDLGraph.listTeamMembers(r.id);
            const memberList = members
              .map(
                (m) =>
                  `${m.name}${m.email ? ` &lt;${m.email}&gt;` : ""} (${m.role || "Member"})`,
              )
              .join("<br>");
            blocks.push(`
              <article class="reg-card">
                <h4>${r.teamName} <span class="chip chip--verified">SharePoint</span></h4>
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
          spBlock = blocks.join("");
        }
      } else {
        $("org-invites").innerHTML =
          "<p class='modal__hint'>Sign in with Microsoft (after admin consent) to manage SharePoint invites.</p>";
      }
    } catch (err) {
      $("org-invites").innerHTML = `<p class='modal__hint'>SharePoint invites unavailable: ${err.message}</p>`;
    }

    $("org-regs").innerHTML =
      (spBlock || "") +
      `<h3 class="modal__subtitle">GitHub fallback registrations</h3>` +
      renderGithubRegs(eventId, ghRegs);
  }

  async function submitM365(form, appApi) {
    let profile = window.GDLM365Auth.getProfile();
    if (!profile) {
      await window.GDLM365Auth.login();
      appApi.onM365AuthChanged();
      profile = window.GDLM365Auth.getProfile();
    }
    if (form.pptFile || form.videoFile) {
      /* ok */
    }
    return window.GDLGraph.registerTeam({
      eventId: form.eventId,
      inviteCode: form.inviteCode || "OPEN",
      teamName: form.teamName,
      leadName: form.leadName,
      leadEmail: form.leadEmail,
      leadUpn: profile?.upn || "",
      members: form.members,
      pptFile: form.pptFile,
      videoFile: form.videoFile,
      pptUrl: form.pptUrl,
      videoUrl: form.videoUrl,
    });
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
      const form = collectForm();
      if (!form.teamName.trim() || !form.leadName.trim() || !form.leadEmail.trim()) {
        showError($("register-error"), "Team name, lead name, and lead email are required.");
        submit.disabled = false;
        return;
      }

      try {
        // 1) Prefer Microsoft / SharePoint when already signed in
        if (window.GDLM365Auth.getProfile()) {
          const result = await submitM365(form, appApi);
          $("modal-register").close();
          alert(`Team "${result.teamName}" registered to SharePoint.`);
          return;
        }

        // 2) GitHub editor session — no Microsoft needed
        const gh = window.GDLAuth.getSession();
        if (gh) {
          if (form.pptFile || form.videoFile) {
            showError(
              $("register-error"),
              "Large file upload needs Microsoft/SharePoint. Clear the file inputs and paste PPT/video URLs instead, then submit again.",
            );
            return;
          }
          const record = await window.GDLRegistrationsStore.submitViaGitHubEditor(
            form,
            gh,
          );
          $("modal-register").close();
          alert(
            `Team "${record.teamName}" saved to GitHub (data/registrations.json). Pages will refresh in about a minute.`,
          );
          return;
        }

        // 3) No MS, no editor — force explicit fallback buttons
        showError(
          $("register-error"),
          "Microsoft sign-in is blocked (admin consent). Use “Submit via GitHub Issue” below, or Editor sign in (top bar) then submit again with PPT/video links.",
        );
      } catch (err) {
        const msg = err.message || "Registration failed.";
        if (/admin|consent|AADSTS|approval/i.test(msg)) {
          showError(
            $("register-error"),
            msg +
              " — Use “Submit via GitHub Issue” or Editor sign-in fallback instead.",
          );
        } else {
          showError($("register-error"), msg);
        }
      } finally {
        submit.disabled = false;
      }
    });

    $("btn-register-github")?.addEventListener("click", () => {
      showError($("register-error"), "");
      const form = collectForm();
      if (!form.teamName.trim() || !form.leadName.trim() || !form.leadEmail.trim()) {
        showError($("register-error"), "Fill team name, lead name, and email first.");
        return;
      }
      if (form.pptFile || form.videoFile) {
        showError(
          $("register-error"),
          "GitHub Issue path supports links only. Clear file uploads and paste PPT/video URLs.",
        );
        return;
      }
      const record = window.GDLRegistrationsStore.buildRecord({
        ...form,
        channel: "github-issue",
      });
      window.GDLRegistrationsStore.downloadJson(record);
      window.GDLRegistrationsStore.openGitHubIssue(record, form.eventName);
      $("modal-register").close();
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
        showError(
          $("organize-error"),
          (err.message || "Could not create invite.") +
            " SharePoint invites need Microsoft admin consent. Registrations can still use the GitHub fallback.",
        );
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
