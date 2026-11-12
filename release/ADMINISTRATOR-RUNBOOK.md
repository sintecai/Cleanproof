# CleanProof organisation administrator runbook

Prepared 2 November 2026. Execute independently on an organisation-controlled workstation or CI runner. **Do not send any password, passkey, code, token, private key, recovery link, credential file or signing material into ChatGPT. No agent sign-in handoff is needed or authorised.** Reuse your already authorised organisation session where available. Any necessary service authentication is performed by the administrator privately through the official service/CLI, outside this chat.

The approved UI/auth forms are frozen. Twelve production migrations are already applied. Do not run db reset, db push, migration repair or seed against either hosted project. Do not clear browser/device storage, uninstall the existing application with saved work, or export customer data into this source tree.

## A. Production Auth: exact independent setting

1. Open https://supabase.com/dashboard/project/decysnpygturutfyjofi/auth/providers using the organisation's authorised account. Verify **CleanProof-production**, London, SintecAI. Staging is the different ref vmvoeksprlwjiwfxqita; do not edit it here.
2. Authentication → Sign In / Providers → Email: leave email/password enabled and turn **Confirm email OFF**, then Save. In Auth signup settings leave new-user signup enabled. Leave Google disabled. No account deletion, password overwrite or manual account confirmation is needed.
3. Reopen the setting to verify it stayed OFF. Independent public Auth settings must show external.email=true, disable_signup=false, mailer_autoconfirm=true and external.google=false. Current live observation still has mailer_autoconfirm=false; immediate signup must remain blocked until this changes. A saved source flag does not change hosted settings.
4. Authentication → URL Configuration: set Site URL to the approved production HTTPS application origin, and allow **only that origin + /reset-password.html** and **cleanproof://reset-password** for the production native app. The final production web origin has not been supplied; do not paste a staging/private ChatGPT preview as a permanent customer origin. Do not add wildcards, localhost or both .html/extensionless variants without verifying routing. The build emits reset-password.html; native app/reset-password.tsx handles the scheme route.
5. Keep the recovery template at supabase/templates/recovery.html using ConfirmationURL. Registration needs no email confirmation; password recovery still does. Do not use a numeric-code template with this PKCE link flow. Test a fresh link on the requesting browser/device, invalid/reused links and cross-browser restart messaging; never copy a live link into logs or this chat.

## B. Sender and function web configuration

Custom SMTP: https://supabase.com/dashboard/project/decysnpygturutfyjofi/auth/smtp . Use the organisation's approved provider and verified sender. No provider/domain/sender has been established in accessible configuration. Enter **SMTP host, TLS port, username, password, sender address and sender name** directly in protected settings. At the owned domain's DNS service, install the selected provider's exact SPF/DKIM records and approved DMARC policy; do not invent DNS values or add duplicate SPF TXT records. Check sender verification, sandbox/recipient limits, quotas and suppressions. Obtain cost approval before activating any paid plan. Do not put SMTP credentials in Expo/EAS public variables or source files.

Record non-secret delivery outcomes separately: request ID/time → provider event (accepted/rejected/suppressed) → inbox receipt → callback → password changed privately → new-password login and old-password rejection. A 200 response alone does not prove email delivery. Supabase's default sender is restricted and is not a production delivery solution. Use a controlled synthetic mailbox authorised by the administrator, never a personal account recovery experiment.

Both functions are deployed with gateway JWT verification **true** and validate the user again through Auth before privileged work. Supabase supplies their built-in server environment; do not override SUPABASE_SERVICE_ROLE_KEY or move it into a client build. Native requests without an Origin still require a valid user session. Production browser requests are denied until CP_ALLOWED_WEB_ORIGINS contains the exact approved HTTPS origin. Staging/local origins are no longer production fallbacks.

In Supabase → Edge Functions → Secrets, set CP_ALLOWED_WEB_ORIGINS to the approved HTTPS origin (comma-separated exact origins only if multiple are deliberately approved). This is public origin configuration, not a credential. Do not add a wildcard. Alternatively, an administrator with an already authenticated Supabase CLI can check help and set this public value locally:

```sh
supabase secrets set --help
supabase secrets set CP_ALLOWED_WEB_ORIGINS=https://YOUR-APPROVED-PRODUCTION-HOST --project-ref decysnpygturutfyjofi
```

Replace the hostname before running. Do not redeploy either function with --no-verify-jwt. Staging deployments were not changed. Re-run backend/production-functions-smoke.mjs with a local JSON input containing **only** the production public URL/publishable client key; it makes no account/data mutations and never needs a privileged key. Do not place that local input in the ZIP. Positive photo transfer/deletion requires the subsequent authorised synthetic-account tests, not just negative probes.

## C. Register the new app identities and link the organisation

Use existing organisation accounts only:
- Google Play Console: https://play.google.com/console → select the correct organisation → Create app → CleanProof. Do not open/edit another published app. Confirm the legal organisation and app-specific Internal testing/upload permissions. Candidate Android package is **com.sicyinternational.cleanproof**, not yet verified/registered. Check existing organisation inventory; final global uniqueness is established by Play's first bundle upload, not a public listing search.
- Apple Developer: https://developer.apple.com/account → Certificates, Identifiers & Profiles → Identifiers → add an explicit App ID only after the owner confirms the permanent **com.sicyinternational.cleanproof** candidate and correct organisation Team. App Store Connect https://appstoreconnect.apple.com → Apps → New App → iOS → select that bundle ID and a new CleanProof SKU. Do not reuse the My Transfer Teacher or another app's identifier. Account Holder handles any required agreements privately.
- Expo https://expo.dev: select the organisation and an independently created/confirmed CleanProof project; confirm slug/owner/project UUID in its settings. Do not link another product or blindly create a duplicate. Set the confirmed non-secret owner/UUID values in the EAS **production** environment. The app reads extra.eas.projectId from those settings; no forced project-init is required.

EAS build/credential permissions, Apple signing rights plus app-management access, and Play Internal testing/upload rights must be authorised. An absent connection is not a signing workaround. Approve quota/cost before a cloud build; no charge is authorised by this document.

## D. Reproducible configuration and build commands

Use Node **24.22.1**, committed root/backend lockfiles and EAS CLI **27.2.0**. Production eas.json pins Android ubuntu-26.04-jdk-17-ndk-r27b-sdk-58 and iOS macos-tahoe-26.6-xcode-27.0. These names are listed in current Expo infrastructure documentation; compilation and store acceptance remain unverified. EAS/system services may still apply minor image updates, so this is not a bit-identical-build guarantee. Capture resolved images and full native dependency inventories with the build evidence.

Configure every value in deployment/production.native.example.env through the organisation's EAS production environment. Names/IDs/public backend values are public build configuration; set IDENTIFIERS_CONFIRMED=1 only after independent ownership checks. BACKEND_KEY is the public publishable key, never a service-role key. Keep demo/local-only switches 0. Provide the approved opaque RGB **1024×1024 PNG** at CLEANPROOF_ICON_PATH; current brand images have other dimensions, so the store icon remains an asset/approval prerequisite. Do not stretch or replace the approved logo/UI. Candidate version is 1.0.0 / Android code 1 / iOS build 1; confirm unused build numbers first.

First restore Git history using release/RESTORE-HISTORY.md; work in that cloned delivery branch. Copy deployment/production.native.example.env to the ignored .env.local and fill **only public build configuration**, including the confirmed organisation/project IDs and approved icon path. The administrator helper loads that local file with Node24 before starting the pinned CLI, avoiding shell-specific environment errors. Do not add any credential to this file. If it is not fully configured, the release guard correctly stops the build.

Run on the administrator's machine:

```sh
node --version
npm ci
npm ci --prefix backend
npm run check
npm test --prefix backend
npm run test:release-config
npm run admin:eas -- --version
npm run admin:eas -- whoami
npm run admin:eas -- project:info
```

These commands do not request credentials in chat. If whoami is signed out, the administrator authenticates privately through official Expo tooling on their own machine; the agent does not receive that session. Resolve failures before building. The organisation EAS production environment and local public configuration must agree. The helper intentionally has no login, token, force or automatic-submit command. Administrator authentication, if absent, is performed independently through official service tooling, not this helper or chat:

```sh
npm run admin:eas -- credentials:configure-build --platform android --profile production
npm run admin:eas -- credentials:configure-build --platform ios --profile production
npm run admin:eas -- build --platform android --profile production
npm run admin:eas -- build --platform ios --profile production
```

Use the correct organisation Team and authorised EAS-managed signing. Store API keys, upload keystores, Apple certificates/profiles remain in protected organisation services. Do not echo them, commit credentials.json, use a debug certificate or request that anyone send them to chat. No --auto-submit flag is configured. Record each returned build ID, Git commit, logs, certificate identity and resolved build/version settings. Download the actual .aab and .ipa from their authenticated EAS build detail pages, open/inspect them and compute SHA-256 (PowerShell Get-FileHash or sha256sum). A successful JavaScript export is not a signed build.

## E. Internal testing and TestFlight — not public review

Google's first new-app upload may require a manual signed-bundle upload. Play Console → new CleanProof app → Test and release → Testing → Internal testing → Create release → upload the verified AAB; configure Play App Signing under the organisation and resolve its checks. Keep it in the internal track. Subsequent approved automation can use an app-scoped Google service account configured privately in EAS Credentials, never a key file in this repository. The submit.production profile targets internal/draft:

```sh
npm run admin:eas -- submit --platform android --profile production --id ANDROID_BUILD_ID
npm run admin:eas -- submit --platform ios --profile production --id IOS_BUILD_ID
```

Replace build IDs with the verified same-commit **UUIDs**, not --latest. The helper rejects ambiguous IDs and auto-submit/forced commands. Uploading iOS places the processed build in App Store Connect/TestFlight; it does not authorise public App Review. Use the new CleanProof app's numeric App Store Connect ID and correct Team in the private submit setup. Internal testers must be authorised; external TestFlight testing can need beta review. Do not invite people, enable a paid service or submit publicly without the relevant approval.

Record successful upload/build references and actual processed status. Complete listing copy from release/store, final binary privacy/SDK/encryption disclosures, age/content questionnaires and functional privacy/support/deletion URLs. Countries, pricing and subscription model remain owner decisions; no billing is implemented. Do not advertise unsupported sharing/invitations or unverified recovery.

## F. Acceptance and operations gates

Once Auth configuration is compatible, use **two new disposable synthetic accounts**, not the owner's account. Test actual signup/session, idempotent company setup, customer/site/checklist, photo with comment, inspection completion, actions, save/reopen, sync into a second authorised session, actual PDF save/open, wrong password, logout/session restoration, account switch and cross-company/private-file denial. Delete only those deliberately disposable accounts through their authenticated in-app flow and verify other companies remain intact. Never manually confirm users or reset passwords to obtain a pass. If local encrypted work exists, keep its keys/queues and explain account-erasure consequences before testing.

Password recovery additionally requires a real authorised mailbox and private password entry. Do not record passwords/links or return recovery tokens in evidence. Native callbacks, OS picker/camera, offline restart/reconnect, interruption/duplicate retry and OS report export must be tested in installed AAB/TestFlight builds. Fill NATIVE-ACCEPTANCE-PENDING.csv with the administrator-assigned named testers, exact build hash, device/OS and evidence; missing results stay pending.

Retention: approve the actual shared-history/erasure-job/log/backup periods and lawful exceptions; the source's 30/90/35-day suggestions are not an approved schedule. Protected recovery needs a paired database/private-object checkpoint, independently protected keys and a separately approved isolated destination. No Docker/PostgreSQL/managed export/restore access is available here; no destination was approved. Follow RETENTION-AND-RESTORE.md, keep outbound email isolated, reconcile erasure metadata/receipts/photos/object hashes/permissions and record RPO/RTO. Do not restore over staging/production or clear the original browser's device-only work. Existing host fixtures are not hosted backup/restore acceptance. This empty production backend does not automatically contain existing staging identities or device-only work; any deliberate migration/adoption needs its own reviewed recovery path.

Submission readiness remains false until these gates pass. Share only non-secret results/build references through approved organisation channels, never credentials. No further agent sign-in handoff is requested.

Official references reviewed: https://docs.expo.dev/eas/cli/ ; https://docs.expo.dev/build-reference/infrastructure/ ; https://docs.expo.dev/submit/android/ ; https://docs.expo.dev/submit/ios/ ; https://supabase.com/docs/guides/auth/auth-smtp ; https://supabase.com/docs/reference/cli/supabase-secrets-set .

## G. New separate review origins (2 November)

The original staging site is untouched. New connected preview: https://cleanproof-release-connected.sintecai26.chatgpt.site (staging backend). Public synthetic showcase: https://cleanproof-release-showcase.sintecai26.chatgpt.site . Use these direct links; the first showcase deployment's in-page link referenced the older preview and is being corrected.

Before connected photo acceptance, the organisation administrator must add exactly https://cleanproof-release-connected.sintecai26.chatgpt.site to the staging function's existing CP_ALLOWED_WEB_ORIGINS value, preserving existing allowed origins. Official dashboard: https://supabase.com/dashboard/project/vmvoeksprlwjiwfxqita/functions/secrets . Verify the deployed function reads that variable; if older code does not, review/deploy the committed serviceCors implementation explicitly rather than weakening CORS. Retest OPTIONS for this exact origin and authenticated upload/download. The current observed response is 403. No configuration-management tool is exposed here; no staging function was redeployed.

For recovery review, append only https://cleanproof-release-connected.sintecai26.chatgpt.site/reset-password.html under staging Authentication → URL Configuration → Redirect URLs. Preserve the original staging Site URL and existing redirects. Reopen to verify saved values; request a fresh recovery email from this preview using an authorised mailbox. This does not configure a permanent production hostname.

Production independent action remains section A: Confirm email OFF in decysnpygturutfyjofi; actual public settings still show ON. Sections B–F contain the single consolidated sender/domain, retention/restore, identifiers/signing, URL/store materials and device acceptance handoff. Do not send credentials here. No new agent sign-in is requested.
