# Mexico Hub — Google sign-in install guide

Follow these steps once. No code changes are required except pasting your **Client ID** into `js/google-config.js` (or send the Client ID to whoever maintains the repo).

**Live site:** https://sumitjindalmx.github.io/mexico-hub/  
**Repo:** https://github.com/SumitJindalMX/mexico-hub

---

## Prerequisites

- A Google account (personal Gmail or Google Workspace)
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Ability to commit/push to `mexico-hub` **or** someone who can paste the Client ID for you

---

## Step 1 — Create / select a Google Cloud project

1. Open https://console.cloud.google.com/
2. Top bar → project picker → **New Project**
3. Name: `mexico-hub` (or any name)
4. Create → select that project

---

## Step 2 — Configure the OAuth consent screen

1. Left menu → **APIs & Services** → **OAuth consent screen**
2. Choose:
   - **External** — if anyone with a Google account should sign in (typical)
   - **Internal** — only if you admin an Amdocs Google Workspace and want company accounts only
3. Click **Create**
4. Fill:
   - **App name:** `Mexico Hub`
   - **User support email:** your email
   - **Developer contact:** your email
5. **Save and Continue**
6. **Scopes** → leave defaults (`openid`, `email`, `profile`) → **Save and Continue**
7. **Test users** (while app is in Testing):
   - **Add users** → add your Gmail / work Google address
   - Add every person who should test before you publish
8. **Save and Continue** → back to dashboard

**Authorized domains** (if asked):

- Add: `github.io`

---

## Step 3 — Create the OAuth Web client

1. **APIs & Services** → **Credentials**
2. **+ Create credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Mexico Hub Pages`
5. **Authorized JavaScript origins** → **Add URI**:
   - `https://sumitjindalmx.github.io`
   - (Optional) `http://localhost`
6. **Authorized redirect URIs** → **Add URI** (required for redirect sign-in):
   - `https://sumitjindalmx.github.io/mexico-hub/`
   - Exact match, **with** trailing slash
7. Click **Create**
8. Copy the **Client ID**  
   It looks like:  
   `123456789-xxxx.apps.googleusercontent.com`

Do **not** create or download a client secret for this SPA flow. Do **not** commit any secret to GitHub.

---

## Step 4 — Put the Client ID in the site

Edit `js/google-config.js` in the repo:

```js
window.GDL_GOOGLE = {
  enabled: true,
  clientId: "PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com",
  scopes: "openid email profile",
  allowedEmailDomains: [
    // Optional: lock to company / Gmail only
    // "amdocs.com",
    // "gmail.com",
  ],
  sessionKey: "gdl.google.session",
  // …
};
```

Then:

```bash
git add js/google-config.js
git commit -m "Configure Google OAuth client ID"
git push origin main
```

Wait 1–2 minutes for GitHub Pages to update.

---

## Step 5 — Verify on the live site

1. Open https://sumitjindalmx.github.io/mexico-hub/
2. Hard refresh (`Ctrl+Shift+R`)
3. Click **Google sign in** (top bar)
4. Pick your Google account (must be a **test user** if consent screen is still Testing)
5. Confirm the top bar shows your email
6. Open an activity → **Register team** — lead name/email should prefill

---

## Step 6 — (Later) Publish the app for everyone

While status is **Testing**, only listed test users can sign in.

When ready for all users:

1. OAuth consent screen → **Publish app**
2. Complete Google’s verification if prompted (for sensitive scopes; basic email/profile is usually lighter)

---

## Optional — Restrict email domains

In `js/google-config.js`:

```js
allowedEmailDomains: ["amdocs.com", "gmail.com"],
```

Empty array = any Google account allowed (still subject to consent screen / test users).

---

## Drive uploads (PPT / video)

1. Google Cloud → **APIs & Services → Library** → enable **Google Drive API**
2. OAuth consent screen → add scope  
   `https://www.googleapis.com/auth/drive.file`  
   (already requested by the site config)
3. Sign out of Google on Mexico Hub, then **Google** sign in again and approve Drive
4. Register team → choose PPT/video files → Submit

Files land in the signed-in user's Drive and are shared as “anyone with the link”.

---

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| Alert: “Google sign-in is not configured” | `clientId` missing or not pushed to `main` |
| `origin_mismatch` / `redirect_uri_mismatch` | Origins: `https://sumitjindalmx.github.io` · Redirect: `https://sumitjindalmx.github.io/mexico-hub/` (trailing slash) |
| “Access blocked: app is in testing” | Add the user under OAuth consent screen → **Test users** |
| Popup blocked / GIS script error | Site falls back to **full-page Google redirect** — still add the redirect URI above |
| Zscaler blocks `accounts.google.com` | Ask IT to allow Google accounts; redirect still needs that host |
| Button works but email empty | Confirm scopes include `openid email profile` |

---

## What Google sign-in does on Mexico Hub

- Identifies the participant (name + email)
- Prefills the registration form
- **Submit registration** (when signed in with Google) opens Gmail compose to the organizer inbox and downloads a JSON copy

It does **not** replace:

- **Editor sign in** (GitHub PAT) — publishing events / `data/*.json`
- **Microsoft sign in** — SharePoint lists / file uploads (needs Entra admin consent)

---

## Checklist

- [ ] Google Cloud project created
- [ ] OAuth consent screen configured + test users added
- [ ] OAuth Web client created
- [ ] JS origin: `https://sumitjindalmx.github.io`
- [ ] Client ID pasted into `js/google-config.js`
- [ ] Pushed to `main`
- [ ] Live site: Google sign in works
