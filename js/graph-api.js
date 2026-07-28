(() => {
  const cfg = () => window.GDL_M365;

  const cache = {
    siteId: null,
    listIds: {},
    driveId: null,
  };

  async function graph(path, options = {}) {
    const token = await window.GDLM365Auth.getAccessToken();
    const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
      throw new Error(`Graph ${res.status}: ${detail.slice(0, 280) || res.statusText}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  function sitePath() {
    const url = new URL(cfg().siteUrl);
    const host = url.hostname;
    const path = url.pathname.replace(/\/$/, "") || "/";
    return `/sites/${host}:${path}`;
  }

  async function getSiteId() {
    if (cache.siteId) return cache.siteId;
    const site = await graph(sitePath());
    cache.siteId = site.id;
    return cache.siteId;
  }

  async function getListId(listName) {
    if (cache.listIds[listName]) return cache.listIds[listName];
    const siteId = await getSiteId();
    const list = await graph(
      `/sites/${siteId}/lists/${encodeURIComponent(listName)}`,
    );
    cache.listIds[listName] = list.id;
    return list.id;
  }

  async function getUploadsDriveId() {
    if (cache.driveId) return cache.driveId;
    const siteId = await getSiteId();
    const lists = await graph(`/sites/${siteId}/lists?$select=id,name,displayName`);
    const lib = (lists.value || []).find(
      (l) =>
        l.name === cfg().uploadsLibrary ||
        l.displayName === cfg().uploadsLibrary,
    );
    if (!lib) {
      throw new Error(
        `Document library "${cfg().uploadsLibrary}" not found on the SharePoint site.`,
      );
    }
    const drive = await graph(`/sites/${siteId}/lists/${lib.id}/drive`);
    cache.driveId = drive.id;
    return cache.driveId;
  }

  function field(item, name) {
    const f = item.fields || {};
    return f[name] ?? f[name.replace(/\s/g, "_")] ?? null;
  }

  async function queryListItems(listName, filter) {
    const siteId = await getSiteId();
    const listId = await getListId(listName);
    const parts = ["$expand=fields", "$top=200"];
    if (filter) parts.unshift(`$filter=${encodeURIComponent(filter)}`);
    const data = await graph(
      `/sites/${siteId}/lists/${listId}/items?${parts.join("&")}`,
      {
        headers: {
          Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly",
        },
      },
    );
    return data.value || [];
  }

  async function createListItem(listName, fields) {
    const siteId = await getSiteId();
    const listId = await getListId(listName);
    return graph(`/sites/${siteId}/lists/${listId}/items`, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });
  }

  async function updateListItem(listName, itemId, fields) {
    const siteId = await getSiteId();
    const listId = await getListId(listName);
    return graph(`/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
  }

  function randomCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 8; i++) {
      out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  }

  async function createInvite({ eventId, maxUses = 50, expiresOn = null }) {
    const code = randomCode();
    const item = await createListItem(cfg().lists.invites, {
      Title: code,
      EventId: eventId,
      MaxUses: Number(maxUses) || 50,
      UsedCount: 0,
      ExpiresOn: expiresOn || null,
      Active: true,
    });
    return { code, itemId: item.id };
  }

  async function findInvite(eventId, code) {
    const items = await queryListItems(
      cfg().lists.invites,
      `fields/Title eq '${code.replace(/'/g, "''")}' and fields/EventId eq '${eventId.replace(/'/g, "''")}'`,
    );
    return items[0] || null;
  }

  function assertInviteValid(item) {
    if (!item) throw new Error("Invite code not found for this event.");
    const active = field(item, "Active");
    if (active === false || active === "false") {
      throw new Error("This invite code is inactive.");
    }
    const expires = field(item, "ExpiresOn");
    if (expires && new Date(expires) < new Date()) {
      throw new Error("This invite code has expired.");
    }
    const maxUses = Number(field(item, "MaxUses") ?? 0);
    const used = Number(field(item, "UsedCount") ?? 0);
    if (maxUses > 0 && used >= maxUses) {
      throw new Error("This invite code has reached its maximum uses.");
    }
    return { maxUses, used };
  }

  async function consumeInvite(item) {
    const used = Number(field(item, "UsedCount") ?? 0) + 1;
    await updateListItem(cfg().lists.invites, item.id, { UsedCount: used });
  }

  async function uploadFile(eventId, registrationFolder, file) {
    const driveId = await getUploadsDriveId();
    const safeName = file.name.replace(/[^\w.\-()+ ]+/g, "_");
    const path = `${eventId}/${registrationFolder}/${safeName}`;
    const uploadPath = `/drives/${driveId}/root:/${encodeURI(path).replace(/%2F/g, "/")}:/content`;

    const token = await window.GDLM365Auth.getAccessToken();
    const res = await fetch(`https://graph.microsoft.com/v1.0${uploadPath}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Upload failed (${res.status}): ${detail.slice(0, 220)}`);
    }
    const uploaded = await res.json();
    return {
      webUrl: uploaded.webUrl,
      id: uploaded.id,
      name: uploaded.name,
      size: uploaded.size,
    };
  }

  async function registerTeam({
    eventId,
    inviteCode,
    teamName,
    leadName,
    leadEmail,
    leadUpn,
    members,
    pptFile,
    videoFile,
  }) {
    const invite = await findInvite(eventId, inviteCode.trim().toUpperCase());
    assertInviteValid(invite);

    const folder = `reg-${Date.now().toString(36)}`;
    let pptUrl = "";
    let videoUrl = "";

    if (pptFile) {
      if (pptFile.size > cfg().maxPptBytes) {
        throw new Error(
          `PPT exceeds ${Math.round(cfg().maxPptBytes / (1024 * 1024))} MB limit.`,
        );
      }
      const up = await uploadFile(eventId, folder, pptFile);
      pptUrl = up.webUrl;
    }
    if (videoFile) {
      if (videoFile.size > cfg().maxVideoBytes) {
        throw new Error(
          `Video exceeds ${Math.round(cfg().maxVideoBytes / (1024 * 1024))} MB limit.`,
        );
      }
      const up = await uploadFile(eventId, folder, videoFile);
      videoUrl = up.webUrl;
    }

    const reg = await createListItem(cfg().lists.registrations, {
      Title: teamName,
      EventId: eventId,
      TeamName: teamName,
      LeadName: leadName,
      LeadEmail: leadEmail,
      LeadUpn: leadUpn,
      InviteCode: inviteCode.trim().toUpperCase(),
      PptUrl: pptUrl,
      VideoUrl: videoUrl,
      Status: "Submitted",
      UploadFolder: folder,
    });

    for (const m of members) {
      if (!m.name?.trim()) continue;
      await createListItem(cfg().lists.teamMembers, {
        Title: m.name.trim(),
        RegistrationId: String(reg.id),
        MemberName: m.name.trim(),
        MemberEmail: (m.email || "").trim(),
        Role: (m.role || "Member").trim(),
      });
    }

    await consumeInvite(invite);

    return {
      registrationId: reg.id,
      pptUrl,
      videoUrl,
      teamName,
    };
  }

  async function listRegistrations(eventId) {
    const items = await queryListItems(
      cfg().lists.registrations,
      `fields/EventId eq '${eventId.replace(/'/g, "''")}'`,
    );
    return items.map((item) => ({
      id: item.id,
      teamName: field(item, "TeamName") || field(item, "Title"),
      leadName: field(item, "LeadName"),
      leadEmail: field(item, "LeadEmail"),
      leadUpn: field(item, "LeadUpn"),
      pptUrl: field(item, "PptUrl"),
      videoUrl: field(item, "VideoUrl"),
      status: field(item, "Status"),
      inviteCode: field(item, "InviteCode"),
      created: item.createdDateTime,
    }));
  }

  async function listTeamMembers(registrationId) {
    const items = await queryListItems(
      cfg().lists.teamMembers,
      `fields/RegistrationId eq '${String(registrationId).replace(/'/g, "''")}'`,
    );
    return items.map((item) => ({
      name: field(item, "MemberName") || field(item, "Title"),
      email: field(item, "MemberEmail"),
      role: field(item, "Role"),
    }));
  }

  async function listInvites(eventId) {
    const items = await queryListItems(
      cfg().lists.invites,
      `fields/EventId eq '${eventId.replace(/'/g, "''")}'`,
    );
    return items.map((item) => ({
      id: item.id,
      code: field(item, "Title"),
      maxUses: field(item, "MaxUses"),
      usedCount: field(item, "UsedCount"),
      expiresOn: field(item, "ExpiresOn"),
      active: field(item, "Active"),
    }));
  }

  window.GDLGraph = {
    createInvite,
    registerTeam,
    listRegistrations,
    listTeamMembers,
    listInvites,
    findInvite,
    assertInviteValid,
  };
})();
