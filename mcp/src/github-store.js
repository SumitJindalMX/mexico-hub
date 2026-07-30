/**
 * GitHub Contents API helpers for Mexico Hub data/*.json files.
 * Env: MEXICO_HUB_OWNER, MEXICO_HUB_REPO, MEXICO_HUB_GITHUB_TOKEN (writes)
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const API = "https://api.github.com";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function cfg() {
  return {
    owner: process.env.MEXICO_HUB_OWNER || "SumitJindalMX",
    repo: process.env.MEXICO_HUB_REPO || "mexico-hub",
    token: process.env.MEXICO_HUB_GITHUB_TOKEN || "",
    branch: process.env.MEXICO_HUB_BRANCH || "main",
    pagesBase:
      process.env.MEXICO_HUB_PAGES_BASE ||
      "https://sumitjindalmx.github.io/mexico-hub/",
  };
}

function requireToken() {
  const { token } = cfg();
  if (!token) {
    throw new Error(
      "MEXICO_HUB_GITHUB_TOKEN is required for write operations (Contents: Read & Write).",
    );
  }
  return token;
}

function toBase64Utf8(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function fromBase64Utf8(b64) {
  return Buffer.from(String(b64).replace(/\n/g, ""), "base64").toString("utf8");
}

async function githubFetch(path, token, init = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "mexico-hub-events-mcp",
    ...(init.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...init, headers });
  return res;
}

function unwrap(payload, arrayKey) {
  if (arrayKey) {
    return Array.isArray(payload?.[arrayKey]) ? payload[arrayKey] : [];
  }
  return payload || {};
}

/** Read data/*.json: Pages → Contents API (if token) → local checkout. */
async function loadPublicJson(relPath, arrayKey) {
  const base = cfg().pagesBase.replace(/\/?$/, "/");
  try {
    const res = await fetch(`${base}${relPath}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (res.ok) return unwrap(await res.json(), arrayKey);
  } catch {
    /* corporate TLS / offline — fall through */
  }

  const { token } = cfg();
  if (token) {
    try {
      const remote = await getRemoteJson(relPath, token);
      if (remote.payload) return unwrap(remote.payload, arrayKey);
    } catch {
      /* fall through to local */
    }
  }

  try {
    const raw = await readFile(path.join(REPO_ROOT, relPath), "utf8");
    return unwrap(JSON.parse(raw), arrayKey);
  } catch {
    return arrayKey ? [] : {};
  }
}

async function getRemoteJson(path, token) {
  const { owner, repo } = cfg();
  const res = await githubFetch(
    `/repos/${owner}/${repo}/contents/${path}`,
    token || undefined,
  );
  if (res.status === 404) return { sha: null, payload: null };
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Read ${path} failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const file = await res.json();
  const payload = JSON.parse(fromBase64Utf8(file.content));
  return { sha: file.sha, payload };
}

async function putRemoteJson(path, token, payload, message) {
  const { owner, repo, branch } = cfg();
  const remote = await getRemoteJson(path, token);
  const body = {
    message,
    content: toBase64Utf8(JSON.stringify(payload, null, 2) + "\n"),
    branch,
  };
  if (remote.sha) body.sha = remote.sha;
  const res = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      res.status === 409
        ? "Conflict: file changed remotely. Retry."
        : `Publish ${path} failed (${res.status}): ${errText.slice(0, 220)}`,
    );
  }
  return res.json();
}

function slugify(name) {
  return String(name || "event")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function randomCode(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

const PATHS = {
  events: "data/events.json",
  registrations: "data/registrations.json",
  scores: "data/scores.json",
  invites: "data/invites.json",
};

async function listEvents(filters = {}) {
  const events = await loadPublicJson(PATHS.events, "events");
  return events.filter((e) => {
    if (filters.status && e.status !== filters.status) return false;
    if (filters.city && (e.city || "Mexico") !== filters.city) return false;
    if (filters.registrationOpen != null) {
      if (Boolean(e.registrationOpen) !== Boolean(filters.registrationOpen)) {
        return false;
      }
    }
    return true;
  });
}

async function getEvent(id) {
  const events = await loadPublicJson(PATHS.events, "events");
  return events.find((e) => e.id === id) || null;
}

async function upsertEvent(fields) {
  const token = requireToken();
  const remote = await getRemoteJson(PATHS.events, token);
  const events = Array.isArray(remote.payload?.events)
    ? [...remote.payload.events]
    : [];
  const actor = fields.actor || "mcp";
  let id = (fields.id || "").trim();
  if (!id) {
    id = `${slugify(fields.name)}-${Date.now().toString(36)}`;
  }
  const idx = events.findIndex((e) => e.id === id);
  const prev = idx >= 0 ? events[idx] : {};
  const next = {
    ...prev,
    id,
    name: fields.name ?? prev.name ?? "Untitled",
    category: fields.category ?? prev.category ?? "Hackathon",
    status: fields.status ?? prev.status ?? "Upcoming",
    when: fields.when ?? prev.when ?? "TBD",
    sortKey: fields.sortKey ?? prev.sortKey ?? new Date().toISOString().slice(0, 10),
    audience: fields.audience ?? prev.audience ?? "",
    highlight: fields.highlight ?? prev.highlight ?? "",
    visibility: fields.visibility ?? prev.visibility ?? "High",
    registrationOpen:
      fields.registrationOpen != null
        ? Boolean(fields.registrationOpen)
        : Boolean(prev.registrationOpen),
    confidence: fields.confidence ?? prev.confidence ?? "Editor",
    city: fields.city ?? prev.city ?? "Mexico",
    capacity:
      fields.capacity != null
        ? Number(fields.capacity) || null
        : prev.capacity ?? null,
    registrationClosesAt:
      fields.registrationClosesAt ?? prev.registrationClosesAt ?? "",
    demoSlots: fields.demoSlots ?? prev.demoSlots ?? [],
    pptUrl: fields.pptUrl ?? prev.pptUrl ?? "",
    videoUrl: fields.videoUrl ?? prev.videoUrl ?? "",
    sourceNote:
      fields.sourceNote ??
      prev.sourceNote ??
      `Updated via mexico-hub-events MCP by ${actor}`,
    updatedBy: actor,
    updatedAt: new Date().toISOString(),
  };
  if (idx < 0) {
    next.createdBy = actor;
    next.createdAt = new Date().toISOString();
    events.push(next);
  } else {
    events[idx] = next;
  }
  await putRemoteJson(
    PATHS.events,
    token,
    { updatedAt: new Date().toISOString().slice(0, 10), events },
    `chore: event upsert ${id} via mcp`,
  );
  return next;
}

async function setRegistration(eventId, open) {
  const token = requireToken();
  const remote = await getRemoteJson(PATHS.events, token);
  const events = Array.isArray(remote.payload?.events)
    ? [...remote.payload.events]
    : [];
  const idx = events.findIndex((e) => e.id === eventId);
  if (idx < 0) throw new Error(`Event not found: ${eventId}`);
  events[idx] = {
    ...events[idx],
    registrationOpen: Boolean(open),
    updatedAt: new Date().toISOString(),
  };
  await putRemoteJson(
    PATHS.events,
    token,
    { updatedAt: new Date().toISOString().slice(0, 10), events },
    `chore: registration ${open ? "open" : "close"} ${eventId} via mcp`,
  );
  return events[idx];
}

async function listRegistrations(eventId) {
  const regs = await loadPublicJson(PATHS.registrations, "registrations");
  if (!eventId) return regs;
  return regs.filter((r) => r.eventId === eventId);
}

async function addRegistration(form) {
  const token = requireToken();
  const remote = await getRemoteJson(PATHS.registrations, token);
  const registrations = Array.isArray(remote.payload?.registrations)
    ? [...remote.payload.registrations]
    : [];
  const actor = form.actor || "mcp";
  const record = {
    id: form.id || `reg-${Date.now().toString(36)}`,
    eventId: form.eventId,
    teamName: form.teamName,
    leadName: form.leadName || "",
    leadEmail: form.leadEmail || "",
    inviteCode: form.inviteCode || "OPEN",
    members: Array.isArray(form.members) ? form.members : [],
    pptUrl: form.pptUrl || "",
    videoUrl: form.videoUrl || "",
    repoUrl: form.repoUrl || "",
    channel: form.channel || "mcp",
    createdAt: new Date().toISOString(),
    createdBy: actor,
    language: form.language || "auto",
    codeProvided: Boolean(form.codeProvided),
    sourceCode: form.sourceCode || "",
    validation: form.validation || null,
  };
  if (!record.eventId || !record.teamName) {
    throw new Error("eventId and teamName are required");
  }
  registrations.push(record);
  await putRemoteJson(
    PATHS.registrations,
    token,
    { updatedAt: new Date().toISOString().slice(0, 10), registrations },
    `chore: registration ${record.teamName} via mcp`,
  );
  return record;
}

async function listScores(eventId) {
  const scores = await loadPublicJson(PATHS.scores, "scores");
  if (!eventId) return scores;
  return scores.filter((s) => s.eventId === eventId);
}

async function upsertScore(form) {
  const token = requireToken();
  const remote = await getRemoteJson(PATHS.scores, token);
  const scores = Array.isArray(remote.payload?.scores)
    ? [...remote.payload.scores]
    : [];
  const actor = form.actor || "mcp";
  const id =
    form.id || `score-${form.eventId}-${form.registrationId}`;
  const demo = Number(form.demo) || 0;
  const deck = Number(form.deck) || 0;
  const code = Number(form.code) || 0;
  const next = {
    id,
    eventId: form.eventId,
    registrationId: form.registrationId,
    teamName: form.teamName || "",
    demo,
    deck,
    code,
    notes: (form.notes || "").trim(),
    total: demo + deck + code,
    published: Boolean(form.published),
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  };
  const idx = scores.findIndex((s) => s.id === id);
  if (idx >= 0) scores[idx] = { ...scores[idx], ...next };
  else scores.push(next);
  await putRemoteJson(
    PATHS.scores,
    token,
    { updatedAt: new Date().toISOString().slice(0, 10), scores },
    `chore: score update via mcp`,
  );
  return next;
}

async function publishScores(eventId, published = true) {
  const token = requireToken();
  const remote = await getRemoteJson(PATHS.scores, token);
  const scores = Array.isArray(remote.payload?.scores)
    ? [...remote.payload.scores]
    : [];
  scores.forEach((s) => {
    if (s.eventId === eventId) s.published = Boolean(published);
  });
  await putRemoteJson(
    PATHS.scores,
    token,
    { updatedAt: new Date().toISOString().slice(0, 10), scores },
    `chore: ${published ? "publish" : "unpublish"} scores ${eventId} via mcp`,
  );
  return scores.filter((s) => s.eventId === eventId);
}

async function listInvites(eventId) {
  const invites = await loadPublicJson(PATHS.invites, "invites");
  if (!eventId) return invites;
  return invites.filter((i) => i.eventId === eventId);
}

async function createInvite(form) {
  const token = requireToken();
  const remote = await getRemoteJson(PATHS.invites, token);
  const invites = Array.isArray(remote.payload?.invites)
    ? [...remote.payload.invites]
    : [];
  const actor = form.actor || "mcp";
  const invite = {
    code: form.code || randomCode(),
    eventId: form.eventId,
    maxUses: Number(form.maxUses) || 50,
    usedCount: 0,
    expiresOn: form.expiresOn || "",
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: actor,
  };
  if (!invite.eventId) throw new Error("eventId is required");
  invites.push(invite);
  await putRemoteJson(
    PATHS.invites,
    token,
    { updatedAt: new Date().toISOString().slice(0, 10), invites },
    `chore: invite ${invite.code} via mcp`,
  );
  return invite;
}

export {
  cfg,
  listEvents,
  getEvent,
  upsertEvent,
  setRegistration,
  listRegistrations,
  addRegistration,
  listScores,
  upsertScore,
  publishScores,
  listInvites,
  createInvite,
};
