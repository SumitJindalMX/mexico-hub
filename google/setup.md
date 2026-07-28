# Google sign-in setup (Mexico Hub)

Static GitHub Pages uses **Google Identity Services** (OAuth Web client). No client secret is stored in the repo.

## 1. Create OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project (e.g. `mexico-hub`)
3. **APIs & Services → OAuth consent screen**
   - User type: **External** (or Internal if using a Google Workspace you admin)
   - App name: `Mexico Hub`
   - Support email: your address
   - Authorized domains: add `github.io`
   - Scopes: `openid`, `email`, `profile` (default)
   - Add yourself as a test user while the app is in **Testing**
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Mexico Hub Pages`
   - **Authorized JavaScript origins**
     - `https://sumitjindalmx.github.io`
     - `http://localhost` (optional, for local file/server testing)
   - Redirect URIs: not required for the token popup flow
5. Copy the **Client ID** (`….apps.googleusercontent.com`)

## 2. Wire into the site

In `js/google-config.js`:

```js
enabled: true,
clientId: "PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com",
```

Optional: restrict domains:

```js
allowedEmailDomains: ["amdocs.com", "gmail.com"],
```

Commit and push to `main` (GitHub Pages).

## 3. Verify

1. Open https://sumitjindalmx.github.io/mexico-hub/
2. Hard-refresh
3. Click **Google sign in**
4. Pick account → register form should prefill name/email

## Notes

- While the consent screen is in **Testing**, only listed test users can sign in.
- Publish the app on the consent screen when you want all Google users (or your Workspace).
- If the GIS script is blocked by Zscaler, ask IT to allow `accounts.google.com` / `googleapis.com`.
- Google sign-in identifies the participant; registrations still submit via Gmail compose, GitHub Issue, or GitHub editor publish until SharePoint consent is granted.
