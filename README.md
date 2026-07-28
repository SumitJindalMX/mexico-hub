# GDL Site Visibility

Interactive board for **Amdocs Guadalajara (GDL)** site visibility — hackathons, culture, talent, and engagement events.

## Live URL

**https://sumitjindalmx.github.io/gdl-site-visibility/**

Repo: https://github.com/SumitJindalMX/gdl-site-visibility

## Folder model

```
tools/gdl-site-visibility/
├── index.html
├── data/
│   └── events.json          # Live event catalog (editors publish here)
├── css/                     # tokens · base · layout · components
├── js/
│   ├── data.js              # Site pulse / themes / checklist
│   ├── auth-config.js       # Allowlisted GitHub usernames
│   ├── auth.js              # Editor session (PAT → GitHub user)
│   ├── events-store.js      # Load / publish events via GitHub API
│   └── app.js               # UI
├── assets/
├── netlify.toml
├── vercel.json
└── README.md
```

## Create events (authorized people only)

Anyone can **view** the board. Only allowlisted GitHub users can **create** events.

### 1. Add someone to the allowlist

Edit `js/auth-config.js`:

```js
authorizedUsers: [
  "SumitJindalMX",
  "TheirGitHubUsername",
],
```

Commit and push. Invite them as a **collaborator** on the repo (Write access).

### 2. Editor signs in on the site

1. Open the live URL → **Editor sign in**
2. Paste a GitHub **fine-grained PAT** with **Contents: Read and write** on `SumitJindalMX/gdl-site-visibility`
3. Token is kept in `sessionStorage` for this browser tab only (not committed)

### 3. Publish an event

Signed-in editors see **Create event**. Submitting writes to `data/events.json` on `main`. GitHub Pages rebuilds in about a minute; the board updates for everyone.

## Open locally

```bash
Start-Process index.html
# or
npx --yes serve .
```

Local create/publish still uses the GitHub API against the remote repo (needs network + PAT).

## Notes

- Seed catalog started from public LinkedIn posts (Aug 2025 anniversary program).
- Do not commit PATs or secrets.
