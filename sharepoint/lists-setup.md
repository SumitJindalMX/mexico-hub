# SharePoint / Entra setup for Mexico Hub

The public GitHub Pages app uses **MSAL (SPA)** + **Microsoft Graph** with **delegated** permissions. No client secrets are stored in the site.

## 1. Entra ID app registration

1. Azure Portal → **Microsoft Entra ID** → **App registrations**
2. Open the existing app (client ID `04d07e0d-5a22-4e10-81bd-6c76f93182fb`) **or** create new:
   - Name: **Mexico Hub**
   - Supported accounts: **This organizational directory only** (Amdocs tenant)
3. **Branding / display name:** set to **Mexico Hub**
4. Redirect URI → **Single-page application (SPA)**:
   - `https://sumitjindalmx.github.io/mexico-hub/`  ← **required (new)**
   - `http://localhost:5500/` (optional, local)
   - Remove obsolete: `https://sumitjindalmx.github.io/gdl-site-visibility/`
5. Confirm:
   - **Application (client) ID** → `js/m365-config.js` → `clientId`
   - **Directory (tenant) ID** → `tenantId` (`c8eca3ca-1276-46d5-9d9d-a0f2a028920f`)
6. **API permissions** (delegated):
   - `Microsoft Graph` → `User.Read`
   - `Microsoft Graph` → `Sites.ReadWrite.All`  
     (or `Sites.Selected` + grant on the target site)
7. Click **Grant admin consent** for the tenant  
   (**Who:** Amdocs Entra / Identity admins — not end users.  
   **Where:** Azure Portal → **Entra ID** → **Enterprise applications** → app **Mexico Hub** → **Permissions** → **Grant admin consent**,  
   **or** **Entra ID** → **Admin consent requests** → **Review** → Approve.)
8. **Authentication** → SPA platform; no client secret required

### If users see “request submitted / needs approval”

| Who approves | Where |
|--------------|--------|
| Entra ID / Identity admins (Amdocs IT) | [Admin consent requests](https://portal.azure.com/#view/Microsoft_AAD_IAM/ConsentPoliciesMenuBlade/~/AdminConsentRequests) |
| Or Cloud Application Administrator | Enterprise app → Permissions → **Grant admin consent for Amdocs** |

Tell IT:

- App name: **Mexico Hub**
- Application (client) ID: `04d07e0d-5a22-4e10-81bd-6c76f93182fb`
- Tenant: Amdocs (`c8eca3ca-1276-46d5-9d9d-a0f2a028920f`)
- Permissions (delegated): `User.Read`, `Sites.ReadWrite.All` (or `Sites.Selected`)
- Redirect URI: `https://sumitjindalmx.github.io/mexico-hub/`

## 2. SharePoint site

Create (or reuse) a site, e.g. `https://amdocs.sharepoint.com/sites/MexicoHub` or `…/GDLVisibility`.

Grant participants and organizers at least **Contribute**.

Set `siteUrl` in `js/m365-config.js`.

## 3. Lists

### GDL_Invites (or rename display to MexicoHub_Invites — keep internal name in sync with config)

| Column | Type | Notes |
|--------|------|--------|
| Title | Single line | Invite **code** |
| EventId | Single line | Matches `events.json` `id` |
| MaxUses | Number | e.g. 50 |
| UsedCount | Number | Default 0 |
| ExpiresOn | Date | Optional |
| Active | Yes/No | Default Yes |

### GDL_Registrations

| Column | Type | Notes |
|--------|------|--------|
| Title | Single line | Team name |
| EventId | Single line | |
| TeamName | Single line | |
| LeadName | Single line | |
| LeadEmail | Single line | |
| LeadUpn | Single line | |
| InviteCode | Single line | |
| PptUrl | Hyperlink or Single line | |
| VideoUrl | Hyperlink or Single line | |
| Status | Single line | |
| UploadFolder | Single line | |

### GDL_TeamMembers

| Column | Type | Notes |
|--------|------|--------|
| Title | Single line | Member name |
| RegistrationId | Single line | Registration item id |
| MemberName | Single line | |
| MemberEmail | Single line | |
| Role | Single line | |

List names must match `js/m365-config.js` → `lists`.

## 4. Document library

**GDL_Uploads** (or rename; keep config `uploadsLibrary` in sync).

## 5. Enable the app

In `js/m365-config.js`: `enabled: true`, real `tenantId` / `clientId`, `siteUrl`, `organizerUpns`.

## 6. Smoke test

1. Open https://sumitjindalmx.github.io/mexico-hub/ → **Microsoft sign in**
2. Organizer → **Manage invites**
3. Participant → **Register team** with invite + files

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| AADSTS50011 redirect mismatch | Old redirect still only; add `…/mexico-hub/` |
| 401 No access in Azure Portal | Your account is not an Entra admin — ask IT |
| Graph 403 | Missing Contribute / admin consent |
