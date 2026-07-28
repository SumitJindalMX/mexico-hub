# SharePoint / Entra setup for GDL registration

The public GitHub Pages app uses **MSAL (SPA)** + **Microsoft Graph** with **delegated** permissions. No client secrets are stored in the site.

## 1. Entra ID app registration

1. Azure Portal → **Microsoft Entra ID** → **App registrations** → **New registration**
2. Name: `GDL Site Visibility`
3. Supported account types: **Accounts in this organizational directory only** (Amdocs tenant)
4. Redirect URI → **Single-page application (SPA)**:
   - `https://sumitjindalmx.github.io/gdl-site-visibility/`
   - `http://localhost:5500/` (or your local static server origin)
5. After create, copy:
   - **Application (client) ID** → `js/m365-config.js` → `clientId`
   - **Directory (tenant) ID** → `tenantId`
6. **API permissions** (delegated):
   - `Microsoft Graph` → `User.Read`
   - `Microsoft Graph` → `Sites.ReadWrite.All`  
     (or `Sites.Selected` + grant the app access to the GDL site — preferred for least privilege)
7. Click **Grant admin consent** for the tenant  
   (**Who:** Amdocs Entra / Identity admins — not end users.  
   **Where:** Azure Portal → **Entra ID** → **Enterprise applications** → app `GDL Site Visibility` → **Permissions** → **Grant admin consent**,  
   **or** **Entra ID** → **Admin consent requests** → find the pending request → **Review** → Approve.)
8. **Authentication** → ensure SPA platform is set; no client secret required

### If users see “request submitted / needs approval”

That is **not** a GDL app queue. Amdocs blocks users from self-consenting to Graph permissions like `Sites.ReadWrite.All`.

| Who approves | Where |
|--------------|--------|
| Entra ID / Identity / Cloud admins (Amdocs IT) | [Admin consent requests](https://portal.azure.com/#view/Microsoft_AAD_IAM/ConsentPoliciesMenuBlade/~/AdminConsentRequests) |
| Or the app owner with **Cloud Application Administrator** | Enterprise app → Permissions → **Grant admin consent for Amdocs** |

Tell IT:

- App name: **GDL Site Visibility**
- Application (client) ID: `04d07e0d-5a22-4e10-81bd-6c76f93182fb`
- Tenant: Amdocs (`c8eca3ca-1276-46d5-9d9d-a0f2a028920f`)
- Permissions needed (delegated): `User.Read`, `Sites.ReadWrite.All` (or `Sites.Selected`)
- Redirect URI: `https://sumitjindalmx.github.io/gdl-site-visibility/`

Until an admin approves, Microsoft sign-in / SharePoint registration will stay blocked.

## 2. SharePoint site

Create (or reuse) a site, e.g. `https://amdocs.sharepoint.com/sites/GDLVisibility`.

Grant a security group of **participants** and **organizers** at least **Contribute** on this site (delegated Graph writes as the signed-in user).

Set `siteUrl` in `js/m365-config.js`.

## 3. Lists

### GDL_Invites

| Column | Type | Notes |
|--------|------|--------|
| Title | Single line | Invite **code** (auto-generated) |
| EventId | Single line | Matches `events.json` `id` |
| MaxUses | Number | e.g. 50 |
| UsedCount | Number | Default 0 |
| ExpiresOn | Date | Optional |
| Active | Yes/No | Default Yes |

### GDL_Registrations

| Column | Type | Notes |
|--------|------|--------|
| Title | Single line | Team name (also TeamName) |
| EventId | Single line | |
| TeamName | Single line | |
| LeadName | Single line | |
| LeadEmail | Single line | |
| LeadUpn | Single line | From Microsoft account |
| InviteCode | Single line | |
| PptUrl | Hyperlink or Single line | |
| VideoUrl | Hyperlink or Single line | |
| Status | Single line | e.g. Submitted |
| UploadFolder | Single line | Folder under library |

### GDL_TeamMembers

| Column | Type | Notes |
|--------|------|--------|
| Title | Single line | Member name |
| RegistrationId | Single line | SharePoint item id of registration |
| MemberName | Single line | |
| MemberEmail | Single line | |
| Role | Single line | |

List **internal names** must match `js/m365-config.js` → `lists` (or rename config to match).

## 4. Document library

Create library **GDL_Uploads**. Participants upload under `{eventId}/{registrationFolder}/`.

## 5. Enable the app

In `js/m365-config.js`:

```js
enabled: true,
tenantId: "<directory-id>",
clientId: "<application-id>",
siteUrl: "https://amdocs.sharepoint.com/sites/GDLVisibility",
organizerUpns: ["you@amdocs.com"],
```

Commit and push so GitHub Pages picks up the config.

## 6. Smoke test

1. Open the live site → **Microsoft sign in**
2. As an organizer UPN → open an event with **Registration open** → **Manage invites** → generate a code
3. As a participant (company account + Contribute) → **Register team** → invite + members + PPT/video → submit
4. Confirm list items and files appear in SharePoint

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| “M365 is not configured” | `enabled` false or placeholder tenant/client IDs |
| AADSTS errors on login | Redirect URI mismatch or wrong tenant |
| Graph 403 on lists | Missing Contribute / admin consent / wrong site URL |
| Graph 404 on library | `GDL_Uploads` name mismatch |
| Invite not found | Code/EventId mismatch; create indexed columns if filters fail |
