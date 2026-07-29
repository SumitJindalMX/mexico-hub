# Amdocs Mexico Hub

Platform for **activities across Mexico** — hackathons, culture, talent, sports, leadership visits, and site programs.

## Live URL

**https://sumitjindalmx.github.io/mexico-hub/**

Repo: https://github.com/SumitJindalMX/mexico-hub

## Roles (GitHub allowlists)

Configured in `js/auth-config.js` → `roles`:

| Role | Powers |
|------|--------|
| **Visitor** | Browse, calendar, gallery, i18n, tour |
| **Participant** | Google sign-in → My registrations |
| **Judge** | Score demo/deck/code; see unpublished scoreboard |
| **Organizer** | Invites, announce, export judge pack, publish scores, analytics |
| **Editor** | Create/edit activities (+ organizer powers) |

Sign in with a GitHub PAT (top bar **GitHub**) for Judge/Organizer/Editor. Participants use **Google**.

## Entra ID (disabled by default)

Microsoft/SharePoint is **implemented** but gated:

```js
// js/auth-config.js
entraEnabled: false
```

Set `entraEnabled: true` after Entra admin consent. Until then Microsoft buttons stay hidden.

## Features

- Activity catalog with capacity, registration deadline countdown, demo slots
- Team registration (Gmail / GitHub / Google Drive materials + optional code pull/validate)
- Judging scoreboard + CSV judge pack + winners gallery
- Calendar + ICS download, deep links `#event/<id>`
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

- Do not commit PATs, client secrets, or tokens.
- Local folder may still be named `tools/gdl-site-visibility/` — product/repo name is **mexico-hub**.
