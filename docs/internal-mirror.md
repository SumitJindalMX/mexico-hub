# Internal ADO mirror (dual-source)

Mexico Hub stays live on **public GitHub Pages**. A second copy can live in **Amdocs Azure DevOps Git** for internal browse/review. Public GitHub remains the operational source of truth for the site and editor JSON publishes.

| Role | Location |
|------|----------|
| Live site | https://sumitjindalmx.github.io/mexico-hub/ |
| Operational git (editors / Pages) | https://github.com/SumitJindalMX/mexico-hub |
| Internal mirror | Azure DevOps Git (your team’s `MexicoHub` repo) |

## One-time: create the ADO repo

1. In Azure DevOps, create an empty Git repo (suggested name: `MexicoHub`).
2. Copy the HTTPS clone URL, for example:
   `https://dev.azure.com/<org>/<project>/_git/MexicoHub`
3. Locally, either:
   - Copy `.ado-remote.example` → `.ado-remote` and replace the URL, **or**
   - Pass `-CloneUrl` to the sync script (below).

## Sync from this workspace

Working directory: this repo root (folder may still be named `gdl-site-visibility`).

```powershell
# Option A — URL file (gitignored)
Copy-Item .ado-remote.example .ado-remote
# edit .ado-remote → paste real ADO clone URL

pwsh -File scripts/sync-amdocs.ps1

# Option B — pass URL once
pwsh -File scripts/sync-amdocs.ps1 -CloneUrl "https://dev.azure.com/<org>/<project>/_git/MexicoHub"
```

The script:

1. Adds (or updates) git remote `amdocs`
2. Pushes `main` to that remote (`git push -u amdocs main`)

You need ADO push rights (browser sign-in or ADO PAT when Git prompts).

## Day-to-day dual push

After commits that should update the live site **and** the internal mirror:

```powershell
git push origin main
git push amdocs main
# or: pwsh -File scripts/sync-amdocs.ps1
```

## Out of scope (this phase)

- Hosting the live site from ADO
- Editor publish via ADO REST API
- Changing Entra / Google redirect URIs (still github.io)

## Checklist

- [ ] Empty ADO repo created
- [ ] Real clone URL in `.ado-remote` (or `-CloneUrl`)
- [ ] `scripts/sync-amdocs.ps1` succeeded once
- [ ] Team can browse the ADO repo
- [ ] Continue using GitHub for Pages + editor PAT writes
