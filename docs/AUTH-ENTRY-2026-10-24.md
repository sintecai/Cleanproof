# Customer authentication entry — 24 October 2026

## Implementation and baseline

Continues a99aa0a636e326fea537af21083eeaa40fcd57bc, with preserved native application and Git history, on feature/customer-auth-entry. Both attached entry/site screenshots were inspected. GitHub sintecai/Cleanproof remains empty; the existing private Site repository is the authoritative source for this increment.

The browser default entry is now a dedicated responsive navy/emerald customer authentication screen, before the sidebar and WorkspaceProvider. It includes full name/email/password/confirmation registration, email sign-in, numeric email verification and resend, password recovery and a Google button. Buttons that require unavailable services are disabled and an availability notice is shown. No account/session or success response is simulated. Full name is profile metadata only, never an authorisation claim.

Email workflows reuse AuthConnection with in-memory pre-login session storage. Only after actual server user/membership verification does the browser open its encrypted local account workspace. Auth sessions subsequently use the existing encrypted SQLite snapshot adapter. Registration without enabled email verification is rejected. Existing transactional cp_register_company onboarding and freshCompany checkpoints are reused, including duplicate/retry guards. Newly opened companies contain no demo customers/sites/templates. Initial owner display name/timezone/contact are collected by the existing company form; optional logo upload and invitation acceptance remain incomplete.

Google web preparation uses a random 256-bit PKCE verifier, SHA-256 challenge, same-tab sessionStorage transaction with 10-minute expiry, exact origin/backend binding and one-time callback consumption. /auth-callback strips callback parameters and exchanges the code with Supabase Auth. Tokens are held in memory then encrypted, not in URLs/localStorage. The server's user endpoint and membership RLS are checked before workspace entry. Supabase manages its provider state; no client-supplied company/role claim authorises access. Error callbacks show cancellation/decline; missing/expired transactions fail closed. Google is unavailable unless EXPO_PUBLIC_CLEANPROOF_GOOGLE_ENABLED=1 and the real backend is configured. Live provider login, cancellation and token exchange are NOT verified here.

Protected-route destinations are restricted to known same-origin application routes. Stack navigation is mounted before per-screen BusinessGate checks, so route restoration need not navigate before a root navigator exists. Company activation requests the dashboard. Returning workspace access still requires fresh membership/scope authorisation; old identities are checked against encrypted binding. These route/onboarding transitions need real-service browser acceptance.

## Browser key model and limitations

New customer entry has no manually chosen browser passphrase. A per-backend/per-user non-extractable AES-GCM CryptoKey is structured-cloned into IndexedDB. It wraps a random database-unlock secret with authenticated additional data binding the backend origin and user UUID. Account-device creation is atomic; concurrent first opens use the existing winner. A missing/corrupt key fails without resetting data. A non-secret local marker detects a previously known key record going missing. Local workspace/profile selection is namespaced per account/backend, separate from legacy cleanproof.preview.active. Account-password changes do not rotate this device key or rewrite old snapshots. Device-key persistence failure does not acknowledge an open workspace.

This is browser-origin protection, NOT hardware-backed storage, protection from same-origin XSS or an unlocked/compromised browser profile, or a claim of production shared-device acceptance. A non-exportable CryptoKey can still be used by compromised origin JavaScript. CSP/security-header and shared-device threat review remain release gates. Clearing browser site data loses device-only unsynchronised work. Server backups recover only server-acknowledged data, not local keys/unsent changes. No account reset is advertised as device-data recovery.

Every reload currently requires online authentication before account key use; offline browser cold-start/unlock remains a release blocker. Backgrounding locks the browser account screen and clears in-memory credentials. Native SQLCipher/SecureStore, offline leases, identifiers and signing configuration are unchanged. Native execution requires retesting after the navigation-layout change. General company/account switching and inspector workspace onboarding are not accepted. Do not use this increment for real customer data.

Existing encrypted demo records, attachments, profile markers and queues are untouched. They are available only through an explicit development-build URL `/?legacyDemo=1` with DEMO_TOOLS=1, using the original passphrase. They are never adopted or uploaded automatically. Production builds disable demo tools, so this legacy entry is inaccessible. The default build remains a review build with unavailable-service notices; it is not a live backend deployment.

## Exact external setup needed

1. Make an authorised CleanProof staging Supabase project accessible through the connected account. Project listing currently returns zero projects. No paid resources were created.
2. Apply the existing forward migrations 001–007; configure private Storage and deploy existing photo-transfer function. Do not deploy to another application's project.
3. Enable verified-email registration and the supplied numeric confirmation/recovery email templates. Configure a test mailbox/synthetic accounts and appropriate SMTP before customer use. No real recipients have been contacted.
4. Configure Google OAuth consent/client through Google Cloud and enable the Google provider in Supabase. Enter the client secret ONLY in the Supabase provider configuration. Use the real project's Supabase callback URI supplied by the dashboard. No Google secret belongs in source/mobile/browser variables.
5. Allow the exact HTTPS staging origin and `<staging-origin>/auth-callback` in Supabase Auth URL configuration. Keep staging/production separate; do not use a broad wildcard for production. The existing private review origin is https://cleanproof-sicy-preview.grassyelf128.chatgpt.site. It also has a separate ChatGPT owner-access gate; that gate is not customer Supabase authentication and has not been bypassed.
6. Set public backend URL/publishable key and GOOGLE_ENABLED only after provider configuration. `npm run build:staging` disables demo/local-only flags and exports staging-dist. Serve SPA paths, including /auth-callback, using index.html fallback and HTTPS. No service-role or signing secret enters the build.
7. Execute real-service acceptance below before approving staging customer access or publication.

## Evidence and open gates

Newly observed: TypeScript passed; 74 host tests passed, one SQLCipher driver test skipped; two build-configuration tests passed; same-project browser build passed. Added account-device tests cover non-exportable keys, identity/AAD separation, concurrent creation, corruption and failed persistence. Added Auth tests cover PKCE request/cancellation and full-name metadata. Prior 22 database fixture passes remain historical and are not real Auth/REST/Storage evidence.

Browser automation inspected the actual compiled sign-in, registration and forgot-password forms. It verified no sidebar or workspace-passphrase field appears at default entry, full registration fields exist, and missing-service actions are disabled. Live registration, verification/resend, incorrect/correct login, Google/cancellation, reset, auth reload/second client, onboarding/site creation, cross-company/photo denial, sync and recovery are BLOCKED by absent backend configuration. Mobile/tablet layout, native Android/iOS security and operational restore/cleanup remain pending. No production readiness or successful Google authentication is claimed.

Secure report issuance/version access, expiry/revocation/logging, staff invitation acceptance, manager role, optional branding asset support, operational recovery and dependency release findings remain incomplete. Existing PDF export is not an issued or revocable client report. Existing release-evidence guard remains mandatory; no billing or publication was activated. GitHub PR remains blocked by unavailable authenticated Git transport; the previously rejected Actions import workaround was not retried. Source remains Git-ready with its complete original history.

Cash expenditure: £0. No paid resources or live invitations. Publication recommendation: do not publish for customer use until the listed actual-service, native, security and customer-workflow gates pass.

## Rollback

No schema migration or key rewrite was introduced. Restore the prior application build while retaining all IndexedDB/native encrypted files and queues. Do not clear storage. The development-only legacy URL still uses the original demo namespace and passphrase. The account device store and account profile markers must be preserved together; there is no silent recovery/reset path.
