(() => {
  const cfg = () => window.GDL_GOOGLE;

  function maxPptBytes() {
    return cfg().maxPptBytes || 50 * 1024 * 1024;
  }

  function maxVideoBytes() {
    return cfg().maxVideoBytes || 250 * 1024 * 1024;
  }

  function assertSize(file, kind) {
    const max = kind === "video" ? maxVideoBytes() : maxPptBytes();
    if (file.size > max) {
      const mb = Math.round(max / (1024 * 1024));
      throw new Error(
        `${kind === "video" ? "Video" : "PPT"} is too large (max ${mb} MB). Compress it or paste a link instead.`,
      );
    }
  }

  async function ensureToken() {
    const existing = window.GDLGoogleAuth.getAccessToken?.();
    if (existing) return existing;
    // Re-auth to obtain a Drive-capable access token
    await window.GDLGoogleAuth.loginForDrive?.();
    const token = window.GDLGoogleAuth.getAccessToken?.();
    if (!token) {
      throw new Error(
        "Google access token missing. Sign in with Google again to upload files to Drive.",
      );
    }
    return token;
  }

  async function setAnyoneWithLink(fileId, token) {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      },
    );
    if (!res.ok) {
      // Still usable for the owner; links may be private
      console.warn("Drive permission anyone-with-link failed", await res.text());
    }
  }

  async function uploadFile(file, kind) {
    assertSize(file, kind);
    const token = await ensureToken();
    const metadata = {
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      description: `Mexico Hub ${kind} upload`,
    };

    const boundary = `mxhub_${Date.now().toString(36)}`;
    const metaPart =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n`;
    const fileHeader =
      `--${boundary}\r\n` +
      `Content-Type: ${metadata.mimeType}\r\n\r\n`;
    const footer = `\r\n--${boundary}--`;

    const metaBytes = new TextEncoder().encode(metaPart + fileHeader);
    const footBytes = new TextEncoder().encode(footer);
    const blob = new Blob([metaBytes, file, footBytes]);

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: blob,
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          "Google Drive permission needed. Sign out of Google, sign in again, and approve Drive access. Also enable Drive API in Google Cloud for this project (see google/setup.md).",
        );
      }
      throw new Error(
        `Drive upload failed (${res.status}): ${errText.slice(0, 220)}`,
      );
    }

    const created = await res.json();
    await setAnyoneWithLink(created.id, token);
    const url =
      created.webViewLink ||
      `https://drive.google.com/file/d/${created.id}/view`;
    return { id: created.id, name: created.name, url };
  }

  /**
   * Upload PPT/video file inputs to Drive and return URL fields.
   * Leaves existing URL fields if no file chosen.
   */
  async function resolveMaterialUrls(form, onProgress) {
    const next = {
      pptUrl: (form.pptUrl || "").trim(),
      videoUrl: (form.videoUrl || "").trim(),
    };

    if (form.pptFile) {
      onProgress?.("Uploading PPT to Google Drive…");
      const up = await uploadFile(form.pptFile, "ppt");
      next.pptUrl = up.url;
    }
    if (form.videoFile) {
      onProgress?.("Uploading video to Google Drive…");
      const up = await uploadFile(form.videoFile, "video");
      next.videoUrl = up.url;
    }

    return next;
  }

  window.GDLGoogleDrive = {
    uploadFile,
    resolveMaterialUrls,
  };
})();
