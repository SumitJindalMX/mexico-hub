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
        <input type="text" name="memberName" placeholder="Name *" required aria-label="Member name (required)" />
        <input type="email" name="memberEmail" placeholder="Email (optional)" aria-label="Member email (optional)" />
        <input type="text" name="memberRole" placeholder="Role (optional)" value="Member" aria-label="Member role (optional)" />
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
    $("reg-invite").placeholder = "Optional — OPEN or code from organizer";
    const ms = window.GDLM365Auth.getProfile();
    const google = window.GDLGoogleAuth?.getProfile?.();
    if (ms) {
      $("reg-lead-name").value = ms.name || "";
      $("reg-lead-email").value = ms.email || ms.upn || "";
    } else if (google) {
      $("reg-lead-name").value = google.name || "";
      $("reg-lead-email").value = google.email || "";
    }
    const hint = $("reg-submit-hint");
    if (hint) {
      const inbox = window.GDL_AUTH?.registrationInbox || "organizer inbox";
      if (ms) {
        hint.textContent =
          "Microsoft session detected — submit will use SharePoint when admin consent is granted.";
      } else if (google) {
        hint.textContent =
          `Signed in with Google as ${google.email}. Submit registration sends via Gmail to ${inbox} (or use GitHub Issue).`;
      } else if (window.GDLAuth.getSession()) {
        hint.textContent =
          "GitHub editor session — Submit registration saves to the repo. Or use Submit via Gmail / GitHub Issue.";
      } else {
        hint.textContent = `Optional: Google sign in (top bar). Then Submit via Gmail (to ${inbox}) or GitHub Issue. Prefer PPT/video links.`;
      }
    }
    modal.showModal();
  }

  function renderGithubInvites(eventId, invites) {
    const mine = invites.filter((i) => i.eventId === eventId);
    if (!mine.length) {
      return "<p class='modal__hint'>No GitHub invite codes yet for this event.</p>";
    }
    return `<table class="data"><thead><tr><th>Code</th><th>Used</th><th>Max</th><th>Expires</th><th></th></tr></thead><tbody>${mine
      .map(
        (i) =>
          `<tr>
            <td><code>${i.code}</code></td>
            <td>${i.usedCount ?? 0}</td>
            <td>${i.maxUses ?? "—"}</td>
            <td>${i.expiresOn || "—"}</td>
            <td><button type="button" class="btn btn--ghost btn--sm btn-email-invite" data-code="${i.code}">Email via Gmail</button></td>
          </tr>`,
      )
      .join("")}</tbody></table>`;
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
    const last = $("org-invite-last");
    if (last) {
      last.hidden = true;
      last.textContent = "";
    }
    modal.showModal();
    await refreshOrganizePanels(event.id);
  }

  async function refreshOrganizePanels(eventId) {
    const [ghRegs, ghInvites] = await Promise.all([
      window.GDLRegistrationsStore.loadPublic().catch(() => []),
      window.GDLInvitesStore.loadPublic().catch(() => []),
    ]);
    let spBlock = "";
    let spInvitesHtml = "";
    try {
      if (window.GDLM365Auth.getProfile()) {
        const [invites, regs] = await Promise.all([
          window.GDLGraph.listInvites(eventId),
          window.GDLGraph.listRegistrations(eventId),
        ]);
        spInvitesHtml = invites.length
          ? `<p class="modal__hint">SharePoint invites</p><table class="data"><thead><tr><th>Code</th><th>Used</th><th>Max</th><th>Active</th></tr></thead><tbody>${invites
              .map(
                (i) =>
                  `<tr><td><code>${i.code}</code></td><td>${i.usedCount ?? 0}</td><td>${i.maxUses ?? "—"}</td><td>${i.active}</td></tr>`,
              )
              .join("")}</tbody></table>`
          : "<p class='modal__hint'>No SharePoint invites yet.</p>";

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
      }
    } catch (err) {
      spInvitesHtml = `<p class='modal__hint'>SharePoint invites unavailable: ${err.message}</p>`;
    }

    $("org-invites").innerHTML =
      `<p class="modal__hint">GitHub / Gmail invites (no Microsoft needed)</p>` +
      renderGithubInvites(eventId, ghInvites) +
      (spInvitesHtml ||
        "<p class='modal__hint'>SharePoint invites need Microsoft sign-in + admin consent.</p>");

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

  async function maybeValidateGithubInvite(form) {
    const code = (form.inviteCode || "").trim().toUpperCase();
    if (!code || code === "OPEN") return;
    const invite = await window.GDLInvitesStore.findPublic(form.eventId, code);
    if (invite) {
      window.GDLInvitesStore.assertValid(invite);
    }
    // Unknown codes still allowed (organizer may have emailed a one-off code)
  }

  async function attachDriveUploads(form) {
    if (!form.pptFile && !form.videoFile) return form;
    if (!window.GDLGoogleAuth?.getProfile?.()) {
      throw new Error(
        "To upload PPT/video files, click Google in the top bar first (Drive access). Or clear the file inputs and paste links instead.",
      );
    }
    if (!window.GDLGoogleDrive) {
      throw new Error("Google Drive uploader not loaded. Hard-refresh the page.");
    }
    const urls = await window.GDLGoogleDrive.resolveMaterialUrls(form, (msg) => {
      showError($("register-error"), msg);
    });
    return {
      ...form,
      pptFile: null,
      videoFile: null,
      pptUrl: urls.pptUrl,
      videoUrl: urls.videoUrl,
    };
  }

  function requireTeamBasics(form) {
    if (!form.teamName.trim() || !form.leadName.trim() || !form.leadEmail.trim()) {
      return "Team name, lead name, and lead email are required.";
    }
    return "";
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

    $("btn-google-signin")?.addEventListener("click", async () => {
      try {
        if (!window.GDLGoogleAuth.isConfigured()) {
          alert(
            "Google sign-in needs an OAuth Web client ID.\n\n" +
              "1) Google Cloud Console → create OAuth client (Web)\n" +
              "2) JS origin: https://sumitjindalmx.github.io\n" +
              "3) Redirect URI: https://sumitjindalmx.github.io/mexico-hub/\n" +
              "4) Paste clientId into js/google-config.js and push\n\n" +
              "Details: google/setup.md",
          );
          return;
        }
        await window.GDLGoogleAuth.login();
        appApi.onGoogleAuthChanged?.();
      } catch (err) {
        alert(err.message || "Google sign-in failed.");
      }
    });

    $("btn-google-signout")?.addEventListener("click", async () => {
      try {
        await window.GDLGoogleAuth.logout();
      } catch {
        /* ignore */
      }
      appApi.onGoogleAuthChanged?.();
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
      const basicErr = requireTeamBasics(form);
      if (basicErr) {
        showError($("register-error"), basicErr);
        submit.disabled = false;
        return;
      }

      try {
        await maybeValidateGithubInvite(form);
        let payload = form;

        if (window.GDLM365Auth.getProfile()) {
          const result = await submitM365(payload, appApi);
          $("modal-register").close();
          alert(`Team "${result.teamName}" registered to SharePoint.`);
          return;
        }

        // Upload files to Google Drive when present (no SharePoint needed)
        if (payload.pptFile || payload.videoFile) {
          payload = await attachDriveUploads(payload);
          showError($("register-error"), "");
        }

        const gh = window.GDLAuth.getSession();
        if (gh) {
          const record = await window.GDLRegistrationsStore.submitViaGitHubEditor(
            payload,
            gh,
          );
          $("modal-register").close();
          alert(
            `Team "${record.teamName}" saved to GitHub` +
              (record.pptUrl || record.videoUrl
                ? " (materials linked from Google Drive)."
                : ".") +
              " Pages will refresh in about a minute.",
          );
          return;
        }

        const google = window.GDLGoogleAuth?.getProfile?.();
        if (google) {
          const record = window.GDLRegistrationsStore.buildRecord({
            ...payload,
            channel: "google",
            createdBy: google.email,
          });
          window.GDLRegistrationsStore.downloadJson(record);
          window.GDLRegistrationsStore.openGmailCompose(record, payload.eventName);
          $("modal-register").close();
          return;
        }

        showError(
          $("register-error"),
          "Sign in with Google (for file upload + submit), or use Submit via Gmail / GitHub Issue with material links.",
        );
      } catch (err) {
        const msg = err.message || "Registration failed.";
        if (/admin|consent|AADSTS|approval/i.test(msg)) {
          showError(
            $("register-error"),
            msg + " — Or sign in with Google to upload to Drive.",
          );
        } else {
          showError($("register-error"), msg);
        }
      } finally {
        submit.disabled = false;
      }
    });

    function prepareFallbackRecord(form) {
      const basicErr = requireTeamBasics(form);
      if (basicErr) {
        showError($("register-error"), basicErr);
        return null;
      }
      return window.GDLRegistrationsStore.buildRecord({
        ...form,
        channel: "fallback",
      });
    }

    async function runFallbackSubmit(channel) {
      showError($("register-error"), "");
      let form = collectForm();
      try {
        await maybeValidateGithubInvite(form);
        if (form.pptFile || form.videoFile) {
          form = await attachDriveUploads(form);
        }
      } catch (err) {
        showError($("register-error"), err.message);
        return;
      }
      const record = prepareFallbackRecord(form);
      if (!record) return;
      record.channel = channel;
      window.GDLRegistrationsStore.downloadJson(record);
      if (channel === "gmail") {
        window.GDLRegistrationsStore.openGmailCompose(record, form.eventName);
      } else {
        window.GDLRegistrationsStore.openGitHubIssue(record, form.eventName);
      }
      $("modal-register").close();
    }

    $("btn-register-gmail")?.addEventListener("click", () => {
      runFallbackSubmit("gmail");
    });

    $("btn-register-github")?.addEventListener("click", () => {
      runFallbackSubmit("github-issue");
    });

    $("btn-organize-cancel")?.addEventListener("click", () => {
      $("modal-organize")?.close();
    });

    $("org-invites")?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-email-invite");
      if (!btn) return;
      const code = btn.getAttribute("data-code");
      const eventId = $("org-event-id").value;
      const eventName = $("org-event-name").textContent;
      const emails = $("org-invite-emails")?.value || "";
      window.GDLInvitesStore
        .loadPublic()
        .then((list) => {
          const invite = list.find(
            (i) => i.eventId === eventId && i.code === code,
          );
          if (!invite) {
            showError($("organize-error"), "Invite not found in published list yet.");
            return;
          }
          window.GDLInvitesStore.openGmailInvite(invite, eventName, emails);
        })
        .catch((err) => showError($("organize-error"), err.message));
    });

    async function createLocalInviteFields() {
      return {
        eventId: $("org-event-id").value,
        maxUses: Number($("org-max-uses").value) || 50,
        expiresOn: $("org-expires").value || null,
      };
    }

    function showLastInvite(invite) {
      const el = $("org-invite-last");
      if (!el) return;
      el.hidden = false;
      el.innerHTML = `Latest invite code: <code>${invite.code}</code> — copy it or use Email via Gmail.`;
    }

    $("btn-invite-gmail")?.addEventListener("click", async () => {
      showError($("organize-error"), "");
      const fields = await createLocalInviteFields();
      const eventName = $("org-event-name").textContent;
      const emails = $("org-invite-emails")?.value || "";
      const session = window.GDLAuth.getSession();
      try {
        let invite;
        if (session) {
          invite = await window.GDLInvitesStore.createViaGitHubEditor(
            fields,
            session,
          );
          showLastInvite(invite);
          await refreshOrganizePanels(fields.eventId);
        } else {
          invite = window.GDLInvitesStore.buildInvite(fields);
          showLastInvite(invite);
          showError(
            $("organize-error"),
            "Code generated locally (not published). Editor sign-in publishes to data/invites.json. Gmail compose still works with this code.",
          );
        }
        window.GDLInvitesStore.openGmailInvite(invite, eventName, emails);
      } catch (err) {
        showError($("organize-error"), err.message || "Could not create invite.");
      }
    });

    $("form-invite")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submit = $("btn-invite-submit");
      submit.disabled = true;
      showError($("organize-error"), "");
      const fields = await createLocalInviteFields();
      const eventName = $("org-event-name").textContent;
      const emails = $("org-invite-emails")?.value || "";

      try {
        // Prefer GitHub publish (no Microsoft)
        const session = window.GDLAuth.getSession();
        if (session) {
          const invite = await window.GDLInvitesStore.createViaGitHubEditor(
            fields,
            session,
          );
          showLastInvite(invite);
          if (emails.trim()) {
            window.GDLInvitesStore.openGmailInvite(invite, eventName, emails);
          }
          alert(`Invite published: ${invite.code}`);
          await refreshOrganizePanels(fields.eventId);
          return;
        }

        // SharePoint path if Microsoft already signed in
        if (window.GDLM365Auth.getProfile()) {
          const created = await window.GDLGraph.createInvite({
            eventId: fields.eventId,
            maxUses: fields.maxUses,
            expiresOn: fields.expiresOn,
          });
          showLastInvite(created);
          if (emails.trim()) {
            window.GDLInvitesStore.openGmailInvite(created, eventName, emails);
          }
          alert(`SharePoint invite created: ${created.code}`);
          await refreshOrganizePanels(fields.eventId);
          return;
        }

        // Local-only + Gmail
        const invite = window.GDLInvitesStore.buildInvite(fields);
        showLastInvite(invite);
        window.GDLInvitesStore.openGmailInvite(invite, eventName, emails);
        showError(
          $("organize-error"),
          "Editor sign-in required to publish codes to the site. A local code was emailed via Gmail — share it manually until you publish.",
        );
      } catch (err) {
        showError(
          $("organize-error"),
          (err.message || "Could not create invite.") +
            " Try Generate & email via Gmail, or Editor sign-in to publish.",
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
