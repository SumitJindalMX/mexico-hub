# Amdocs Mexico Hub

Platform for **activities across Mexico** — hackathons, culture, talent, sports, leadership visits, and site programs.

## Live URL

**https://sumitjindalmx.github.io/mexico-hub/**

Repo: https://github.com/SumitJindalMX/mexico-hub

## Entra app (update these in Azure Portal)

| Setting | Value |
|---------|--------|
| Display name | **Mexico Hub** (rename from GDL Site Visibility) |
| Application (client) ID | `04d07e0d-5a22-4e10-81bd-6c76f93182fb` |
| SPA redirect URI (add) | `https://sumitjindalmx.github.io/mexico-hub/` |
| SPA redirect URI (remove old) | `https://sumitjindalmx.github.io/gdl-site-visibility/` |
| Logout URL (optional) | `https://sumitjindalmx.github.io/mexico-hub/` |

Path in portal: **Entra ID → App registrations → your app → Authentication** (redirects) and **Branding** / display name.

Full SharePoint setup: [sharepoint/lists-setup.md](sharepoint/lists-setup.md)

## What it does

- Browse and filter Mexico activities
- Editors publish activities (GitHub allowlist + PAT)
- Participants register teams (Google sign-in, Gmail/GitHub fallback, or Microsoft when consented)
- PPT / video uploads to SharePoint (Microsoft) or paste links
- Invite codes via Gmail / GitHub (`google/setup.md`, `sharepoint/lists-setup.md`)

## Open locally

```bash
Start-Process index.html
```

## Notes

- Do not commit PATs, client secrets, or tokens.
- Local folder may still be named `tools/gdl-site-visibility/` — product/repo name is **mexico-hub**.
