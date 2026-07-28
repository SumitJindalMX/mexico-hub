# GDL Site Visibility

Interactive board for **Amdocs Guadalajara (GDL)** site visibility — hackathons, culture, talent, and engagement events.

## Live URL

**https://sumitjindalmx.github.io/gdl-site-visibility/**

Repo: https://github.com/SumitJindalMX/gdl-site-visibility

## Participant registration (SharePoint / M365)

Invite-only registration with company Microsoft accounts:

- Sign in with **Microsoft** (Amdocs tenant)
- Enter an **invite code** from organizers
- Add **team members**, upload **PPT** + **video** → SharePoint `GDL_Uploads`

Setup for IT: [sharepoint/lists-setup.md](sharepoint/lists-setup.md)  
Config: [js/m365-config.js](js/m365-config.js) (`enabled`, `tenantId`, `clientId`, `siteUrl`, `organizerUpns`)

Until M365 is configured, the catalog and GitHub editor flows still work; Register stays disabled.

## Folder model

```
tools/gdl-site-visibility/
├── index.html
├── data/events.json
├── sharepoint/lists-setup.md
├── css/
├── js/
│   ├── data.js
│   ├── auth-config.js / auth.js      # GitHub editors (create events)
│   ├── events-store.js
│   ├── m365-config.js / m365-auth.js # Entra MSAL
│   ├── graph-api.js                  # Invites, regs, uploads
│   ├── registration-ui.js
│   └── app.js
└── README.md
```

## Create events (GitHub editors)

Only allowlisted GitHub users in `js/auth-config.js` can publish events to `data/events.json` (PAT with Contents: Read and write). Check **Open participant registration** when creating an event.

## Open locally

```bash
Start-Process index.html
# or
npx --yes serve .
```

## Notes

- Do not commit PATs, client secrets, or tokens.
- Seed catalog started from public LinkedIn posts (Aug 2025 anniversary program).
