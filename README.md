# Amdocs Mexico Hub

Platform for **activities across Mexico** — hackathons, culture, talent, sports, leadership visits, and site programs.

## Live URL

**https://sumitjindalmx.github.io/mexico-hub/**

Repo (operational / Pages): https://github.com/SumitJindalMX/mexico-hub

## Dual-source (GitHub + Amdocs ADO)

| Purpose | Where |
|---------|--------|
| **Live site + editor publishes** | Public GitHub (`origin`) → GitHub Pages |
| **Internal browse / governance** | Amdocs Azure DevOps Git remote `amdocs` (mirror) |

Public GitHub stays the source of truth for the running site. The ADO copy is a mirror only in this phase.

**First-time mirror setup:** see [docs/internal-mirror.md](docs/internal-mirror.md).

```powershell
# After you create an empty ADO repo and have its clone URL:
Copy-Item .ado-remote.example .ado-remote   # paste real URL into .ado-remote
pwsh -File scripts/sync-amdocs.ps1
```

**Day-to-day** (live + internal):

```powershell
git push origin main
git push amdocs main
# or: pwsh -File scripts/sync-amdocs.ps1
```

## Roles (GitHub allowlists)

Configured in `js/auth-config.js` → `roles`:

| Role | Powers |
|------|--------|
| **Visitor** | Browse, gallery, i18n, tour |
| **Participant** | Google sign-in → My registrations |
| **Judge** | Score demo/deck/code; see unpublished scoreboard |
| **Organizer** | Invites, announce, export judge pack, publish scores, analytics |
| **Editor** | Create/edit activities (+ organizer powers) |

Sign in with a GitHub PAT (top bar **GitHub**) for Judge/Organizer/Editor. Participants use **Google**.

## Entra ID

Microsoft/SharePoint is implemented and gated by:

```js
// js/auth-config.js
entraEnabled: true
```

Requires Entra admin consent + SPA redirect `https://sumitjindalmx.github.io/mexico-hub/`. See `sharepoint/lists-setup.md`. Set `false` to hide Microsoft sign-in again.

## Features

- Activity catalog with capacity, registration deadline countdown, demo slots
- Team registration (Gmail / GitHub / Google Drive materials + optional code pull/validate)
- Judging scoreboard + CSV judge pack + winners gallery
- Activity ICS download from the event brief, deep links `#event/<id>`
- Notifications (in-app + optional browser alerts + Gmail broadcast)
- Analytics for organizers, ES/EN toggle, first-visit tour

## Data files

| Path | Purpose |
|------|---------|
| `data/events.json` | Catalog |
| `data/registrations.json` | Teams |
| `data/scores.json` | Judging |
| `data/gallery.json` | Winners wall |
| `data/notifications.json` | Announcements |
| `data/invites.json` | Invite codes |

## User guide

**[docs/Mexico-Hub-User-Guide.docx](docs/Mexico-Hub-User-Guide.docx)**

Regenerate: `py -3 scripts/build-user-guide.py`

## Open locally

```bash
Start-Process index.html
```

## Notes

- Do not commit PATs, client secrets, tokens, or `.ado-remote`.
- Local folder may still be named `tools/gdl-site-visibility/` — product/repo name is **mexico-hub**.
