# Amdocs Mexico Hub

Platform for **activities across Mexico** — hackathons, culture, talent, sports, leadership visits, and site programs (GDL and beyond).

## Live URL

**https://sumitjindalmx.github.io/gdl-site-visibility/**

Repo: https://github.com/SumitJindalMX/gdl-site-visibility  
*(Repo folder name is historical; product name is **Mexico Hub**.)*

## What it does

- Browse and filter Mexico activities
- Editors publish new activities (GitHub allowlist + PAT)
- Participants register teams (invite-only + company Microsoft account)
- Upload PPT / video to SharePoint; organizers manage invites

## Participant registration (SharePoint / M365)

- Sign in with **Microsoft** (Amdocs tenant)
- Enter an **invite code** from organizers
- Add **team members**, upload **PPT** + **video** → SharePoint uploads library

Setup for IT: [sharepoint/lists-setup.md](sharepoint/lists-setup.md)  
Config: [js/m365-config.js](js/m365-config.js)

Entra app display name may still be `GDL Site Visibility` until IT renames it to **Mexico Hub**.

## Folder model

```
tools/gdl-site-visibility/
├── index.html
├── data/events.json
├── sharepoint/lists-setup.md
├── css/
├── js/
└── README.md
```

## Open locally

```bash
Start-Process index.html
```

## Notes

- Do not commit PATs, client secrets, or tokens.
