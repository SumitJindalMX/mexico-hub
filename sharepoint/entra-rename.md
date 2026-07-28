# Entra: rename app + update redirect (do in Azure Portal)

You need **Application Administrator** (or ask IT). Client ID stays the same.

## Steps

1. Open [App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Find app **client ID** `04d07e0d-5a22-4e10-81bd-6c76f93182fb`
3. **Branding & properties** (or Overview display name) → set name to **Mexico Hub**
4. **Authentication** → Single-page application:
   - **Add:** `https://sumitjindalmx.github.io/mexico-hub/`
   - **Remove:** `https://sumitjindalmx.github.io/gdl-site-visibility/` (if present)
5. Save
6. (Optional) Enterprise applications → same app → confirm display name **Mexico Hub**

Until step 4 is done, Microsoft login will fail with **redirect URI mismatch** on the new GitHub Pages URL.
