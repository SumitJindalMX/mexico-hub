# GDL Site Visibility

Interactive board for **Amdocs Guadalajara (GDL)** site visibility — hackathons, culture, talent, and engagement events.

## Folder model

```
tools/gdl-site-visibility/
├── index.html
├── css/                 # tokens · base · layout · components
├── js/                  # data.js (model) · app.js (UI)
├── assets/
├── netlify.toml         # Netlify static deploy
├── vercel.json          # Vercel static deploy
├── .github/workflows/   # GitHub Pages auto-deploy
├── deploy-pack.bat      # Builds a zip for drag-and-drop hosts
└── README.md
```

## Deploy so anyone can use it (recommended: 2 minutes)

### Option A — Netlify Drop (fastest, no install)

1. Open [https://app.netlify.com/drop](https://app.netlify.com/drop) (free Netlify account).
2. Drag either:
   - the whole `gdl-site-visibility` folder, or
   - `gdl-site-visibility-deploy.zip` (run `deploy-pack.bat` to rebuild it).
3. Netlify gives a public URL like `https://random-name.netlify.app` — share that link with anyone.
4. Optional: in Netlify site settings, set a custom name (e.g. `gdl-site-visibility.netlify.app`).

### Option B — GitHub Pages (good for ongoing updates)

1. Create a **public** GitHub repo (e.g. `your-org/gdl-site-visibility`).
2. From this folder:

```bash
git remote add origin https://github.com/YOUR_ORG/gdl-site-visibility.git
git commit -m "Initial GDL Site Visibility board"
git push -u origin main
```

3. In the repo: **Settings → Pages → Source: GitHub Actions**.
4. The workflow `.github/workflows/deploy-pages.yml` publishes on every push to `main`.
5. URL will be: `https://YOUR_ORG.github.io/gdl-site-visibility/`

### Option C — Vercel

```bash
npx vercel --prod
```

(Requires Node 18+ and a Vercel login.)

## Open locally

```bash
Start-Process index.html
# or
npx --yes serve .
```

## Update events

Edit `js/data.js` (`window.GDL.events`, `pulse`, `themes`, `checklist`), then redeploy (re-drop on Netlify, or `git push` for Pages).

## Notes

- Seed data is from public LinkedIn posts about the Aug 2025 Amdocs Mexico / GDL anniversary program.
- Upcoming rows are planning placeholders — confirm dates with site ops.
- Do not commit secrets; this site is static and public once deployed.
