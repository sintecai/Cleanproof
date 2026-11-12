# Historical README — superseded

Read the root README, AUTHENTICATION-SETUP and RELEASE-STATUS first. Statements and test counts below retain their original dates and may no longer apply.

# CleanProof — email/password customer access

Current scope: Create account, Sign in and Forgot password. External social sign-in has been removed. See [email-only implementation and acceptance](docs/EMAIL-ONLY-ACCEPTANCE.md). Hosted Auth URL/SMTP settings and successful customer account access still require verification. The older entries below are historical, not current setup instructions.

# CleanProof — browser authentication transport correction

Fixed the native browser fetch receiver defect that threw before requests reached Supabase. Authentication errors now distinguish transport, timeout and service rejection. Read [root-cause evidence and remaining acceptance](docs/AUTH-FETCH-FIX-2026-10-24.md). Successful registration/email delivery remain unverified; staging is not customer-ready. Historical records below retain their original scope.

---

# CleanProof — connected synthetic staging, 24 October 2026

**Real Supabase staging provisioned; customer authentication acceptance remains incomplete.** `npm run build` now builds the connected staging application with demo/local-only flags disabled. Read [current service configuration, actual results and exact external actions](docs/STAGING-SERVICES-2026-10-24.md). Email delivery, successful accounts and customer-release gates remain pending. Do not use real customer data. Historical entries below retain their original scope.

---

# CleanProof customer authentication entry — 24 October 2026

**Implemented entry and adapters; real-service acceptance blocked, not customer-ready.** Default browser entry now shows registration/sign-in before the sidebar. New account storage uses a per-account browser key; legacy encrypted demo work is preserved separately. See [authentication setup, key model and actual evidence](docs/AUTH-ENTRY-2026-10-24.md). Hosted email/redirect configuration requires verification; no live authentication success is claimed.

---

# CleanProof customer-release work — 24 October 2026

**Development/review only; not customer-ready.** Shared native/browser shell, dashboard creation shortcuts and History formatting updated. See [current implementation and actual acceptance](docs/CUSTOMER-RELEASE-2026-10-24.md). `npm run build:staging` validates public backend configuration and disables demo mode; it does not deploy. No real backend staging environment is available yet. Historical results below retain their original scope.

---

# CleanProof — production preparation, 23 October 2026

**Staging-only development candidate; not production ready.** Preserves the native app, latest Stitch UI/backgrounds, encrypted persistence, migrations and Git history. This increment adds verified-email registration, transactional company onboarding (server migration 007), separate company workspace preparation/activation and retry checkpoints, CI and release guards. It does not claim actual Supabase/device acceptance.

Read [implementation/results](docs/PRODUCTION-IMPLEMENTATION.md), [deployment/GitHub/recovery](docs/PRODUCTION-DEPLOYMENT.md), [dependency findings](docs/DEPENDENCY-REVIEW-2026-10-23.md) and [policy draft](docs/PRIVACY-SERVICE-DRAFT.md).

```sh
npm ci
npm ci --prefix backend
npm run secrets:check
npm run check:all
npm run build
```

The build command is deliberately the private synthetic preview, NOT a production release command. Default non-demo installs no longer seed synthetic records; separate company activation requires actual configured Auth/profile/membership. Team invitations/manager role, issued client reports, entitlements, real integration and release/operations acceptance remain open. No paid resource or billing was activated.

Historical verification below retains its original dates and scope.

---

# Current APK execution handoff — 23 October 2026

The unchanged 0.7 ARM64 APK is inspected, not device-tested. Read [minimum phone handoff](docs/APK-EXECUTION-GUIDE.md) and [fresh acceptance/evidence](docs/APK-EXECUTION-ACCEPTANCE.md). `npm run test:device-handoff` checks the new non-destructive installation guards; the tool itself needs your Windows/Android equipment. No new app feature, migration or signing identity. Native, real Supabase, recovery and release-security acceptance remain open. **Not accepted for an internal trial or real customer data.**

Historical implementation documentation follows.

---

# CleanProof 0.7 — exact application preview and recovery increment

**Start with [START-0.7](docs/START-0.7.md)**. Supplied alongside source: a compiled **Android ARM64 Release APK** with embedded JavaScript, and the compiled **same-project Expo browser app** using the real screens/repositories and explicit platform adapters. The browser app is not the historical HTML reconstruction. Android compilation passed; native install/runtime, actual Supabase integration and physical N01–N10 acceptance remain blocked here. **Not pilot-ready.**

- [Opening, installation, demo, backend and app commands](docs/START-0.7.md)
- [Acceptance matrix and remaining gates](docs/ACCEPTANCE-0.7.md)
- [Reduced-site recovery, paired backup/restore and limits](docs/RECOVERY-0.7.md)
- [Observed tests, costs and dependency review](docs/VERIFICATION-0.7.md)
- [Actual APK build/hash/signing and native evidence](docs/NATIVE-0.7.md)

Implemented: independently protected permitted-scope workspaces while retaining quarantine/unsent work; separate development-only realistic synthetic fixtures; loopback-only real-account seed tooling; Storage inventory/copy/readback and guarded paired dump/restore tooling. Local schema **8** and server migrations **001–006** unchanged. Fresh checks: **65 host + 20 backend fixture tests**, zero skipped with host SQLCipher configured, and actual browser walkthrough passed. No Docker/service acceptance or native execution is implied. Actual cash expenditure **£0**.

This 0.7 entry and its linked runbooks supersede earlier current-work instructions. Historical documentation/evidence follows unchanged for provenance. Do not use the old `preview:workflows` reconstruction as the working application.

---

# CleanProof 0.6 — integration, recovery and acceptance increment

Continues source/history at 7119898. **Acceptance is incomplete; this is not pilot-ready or an accepted internal-trial release.** Actual Supabase services and physical native devices were unavailable here. Do not confuse passing host tests/bundle generation with those gates.

- [Exact Windows/Android, Mac/iPhone and local Supabase commands](docs/RELEASE-0.6-SETUP.md)
- [Acceptance matrix and device evidence cases](docs/RELEASE-0.6-ACCEPTANCE.md)
- [Recovery, orphan maintenance and backup/restore](docs/RELEASE-0.6-RECOVERY.md)
- [Observed results, ranked defects and costs](docs/RELEASE-0.6-VERIFICATION.md)

Implements durable paged adoption review, bounded record/original-queue delivery, explicit restored-access recovery and protected reduced-scope quarantine, renewable photo intents, guarded service-only local orphan maintenance and synthetic encrypted backup tooling. Native Expo app, SQLCipher/key behaviour, sealed attachment format, snapshots and original queues remain. Local schema 8; apply server migrations 001–006. No new mobile dependency or paid service.

```sh
npm ci
npm ci --prefix backend
npm run check:all
# Requires running local Docker stack and private terminal keys:
npm run test:full-stack
npm run test:auth-live
# Native SDK/device required:
npm run android
# Mac: npm run ios
```

Current host evidence: 63 host tests and 18 backend/plugin tests pass with configured optional host SQLCipher. Actual Auth/REST/Storage/Edge and APK/IPA/device evidence remain blocked. Reduced-site selective working, automated real-Storage backup/restore and release dependency decisions are open. Secure client links, report issuance/finalisation, MFA expansion, billing and publication are not part of 0.6.

Historical documentation below is preserved. The current 0.6 runbook supersedes older statements about all-at-once import, missing maintenance tooling or absent restored-access review, without claiming that their full service/device acceptance passed.

# CleanProof 0.5 — business and photograph synchronisation

Sicy International Ltd · native Android/iOS Expo application · synthetic data only.

Continues the attached 0.4 source and preserves its complete Git history. Adds opt-in reviewed adoption and ID mappings, durable delivery of BOTH original queues, per-aggregate revisions/receipts, incoming relational projection with restartable page staging, reviewable conflicts, private photograph intents/transfer/re-encryption, deletion propagation and a whole-workspace account/offline gate. No new mobile dependency or hosted service.

**Acceptance is still pending:** the combined host-client/PostgreSQL workflow passes, but a full Supabase Auth/PostgREST/Storage stack and physical native devices were unavailable. Do not call this a real-data pilot or claim native acceptance from host tests/bundles. Automatic scope-quarantine recovery, arbitrary company switching/import merges, large import partitioning and remote orphan purge remain operational limitations. Secure client reports/MFA/billing/publication are later phases.

Start here:
- [Setup/run commands and two-client demonstration](docs/SYNC-0.5-SETUP.md)
- [Architecture, migrations and recovery](docs/SYNC-0.5-ARCHITECTURE.md)
- [Actual checks and limitations](docs/SYNC-0.5-VERIFICATION.md)
- [Pending acceptance gates](docs/SYNC-0.5-ACCEPTANCE.md)
- [Cash and pilot cost assumptions](docs/SYNC-0.5-COSTS.md)

```sh
npm ci
npm ci --prefix backend
npm run check:all
npm run android
# Mac/Xcode: npm run ios
```

Native entry: Home / Company & people → **Synchronisation**. Sign in through the existing account screen, verify membership, review exact local contents and explicitly adopt or receive. Offline local workflows are retained. Adopted workspaces lock on background/sign-out; offline access needs device authentication and a valid cached lease. Local schema **7** upgrades baseline v5 and the saved v6 development checkpoint. Apply all Supabase migrations through **202610210004** before connecting.

`npm run test:full-stack` is a separate, prepared loopback-only HTTP test requiring an already running local Docker stack and private terminal credentials; it has **not been executed here**. See the setup runbook. It does not auto-create paid infrastructure or send invitations.

Historical 0.4 documentation follows for provenance. Statements below that original business queues are unconsumed or private transfer is absent are superseded by the 0.5 documents above, not by a claim of production acceptance.

# CleanProof 0.4 — local application and backend foundation

**Current increment:** additive schema v5; native Development connection screen; typed GoTrue sign-in/sign-out/recovery adapter with encrypted sessions; PostgreSQL membership/RLS/RPC migrations; durable synthetic metadata sync with receipts, conflict retention, incremental pulls and tombstones; iOS backup/file-protection launch hook. No new mobile dependency.

**Not the complete requested backend phase:** the existing local inspections/photos/actions/PDFs are preserved and still local. Their original queues are not consumed or relabelled synced. The connected metadata store is separate. Full Supabase Auth/Storage integration and physical Android/iPhone acceptance are pending. Secure client links and billing/publication are not implemented. Use synthetic data only.

Start here:
- [Exact local backend/native setup](docs/BACKEND-SETUP.md)
- [Backend comparison and pilot costs](docs/BACKEND-DECISION.md)
- [Schema, session, sync and recovery contract](docs/SYNC-ARCHITECTURE.md)
- [New verification results](docs/BACKEND-VERIFICATION.md)
- [Acceptance checklist and next milestone](docs/BACKEND-ACCEPTANCE.md)

```sh
npm ci
npm ci --prefix backend
npm run check:all
npm run android
# On a Mac with Xcode: npm run ios
```

No backend configuration is needed for the existing local app. For the new native screen use Company & people → Development connection. Local Supabase setup is documented separately and requires Docker, absent here. The test harness runs embedded PostgreSQL, not the Auth/Storage servers.

## Preserved local workflow (0.3 baseline)

Sicy International Ltd · Annmaria, AI-assisted developer · 21 October 2026

This continues CP001 and the M1/CP002 source with preserved Git history. The application remains Expo / React Native / TypeScript for Android and iOS. **Use synthetic data only:** native acceptance, iOS backup exclusion, dependency remediation and real-data release gates remain open.

## What changed

- Consistent navy/teal native screens: Home, searchable Customers/Sites, checklist/version editor, inspection, photos, history, actions, report review and company/local people settings.
- Drafts retain original save/retry, revision, encryption and outbox behaviour. Progress and save states use plain language; diagnostics no longer dominate daily work.
- Explicit local completion requires every answer, Fail/N/A explanations, an inspector and an assigned action/due date for each failure. N/A/unanswered items are excluded from Pass ÷ (Pass + Fail); no percentage when none apply.
- Completed inspection answers, branding/context and evidence manifest are preserved. Corrections create a linked editable draft with a reason; originals are never silently reopened. Photographs and actions are not copied into the correction; add relevant fresh evidence/actions.
- Corrective actions have local assignees, due dates, open/resolved status, required resolution/reopen notes, timestamps, revision checks, optional evidence and append-only history. No notification is sent. Evidence recorded in a resolution stays protected even after an action is reopened.
- The native PDF path now uses a shared professional A4 report builder: branding, customer/site, inspector/date/reference, draft/completed status, score/findings, photos and current action summary. Old encrypted PDF files keep their earlier contents. Long details continue on another page; stress text is confined to test fixtures.

Local-inspection cloud sync, team administration/invitations, submission/approval, secure client links, billing and publication are **not implemented**. Version 0.4 adds the separate account/metadata foundation described above; it is not yet connected to inspection data. Local company identifiers protect relationships; they are not production tenant security. “Completed locally” does not mean submitted, approved or synchronised.

## Run on Android

Prerequisites: Node.js **24**, npm, Android Studio/SDK with compatible Java/toolchain, and a PIN/passcode-protected emulator or USB-connected Android phone (USB debugging enabled). Open a terminal inside the extracted `cleanproof` folder:

```powershell
npm ci
npm run check
npm run android
```

Use the existing native development build; rebuild after plugin/native dependency changes. **Expo Go cannot satisfy the SQLCipher configuration.** There are no backend secrets, paid API keys or EAS account requirements. First local builds may download free build dependencies.

For later development sessions:

```powershell
npm start
```

Metro runs without Expo service lookups, but a development client may still need the development computer at startup. Test true offline cold launch with an embedded-bundle local build:

```powershell
npx expo run:android --variant release
```

This does not publish the app. Do not uninstall or clear storage to resolve errors: that can irreversibly lose unsent work.

## Run on iOS — Mac required

Use compatible Xcode/CocoaPods and existing Sicy signing arrangements where needed. Do not create/purchase duplicate accounts.

```bash
npm ci
npm run check
npm run ios
```

Embedded-bundle local build:

```bash
npx expo run:ios --configuration Release
```

Windows/Linux cannot build or run the iOS simulator locally. Actual iPhone security, camera and sharing acceptance remains mandatory. No APK/IPA was built or executed in the delivery environment.

## Try the native workflow

1. Home → Customers / Sites: search, add or edit a synthetic customer/site. Archived records remain in history.
2. Checklists: clone or edit the latest version; reorder items/sections and save another immutable version.
3. Start inspection: choose a site and checklist, then answer items and add useful comments. Watch the local save state. Fail and N/A require explanations.
4. Use an item's Photos button for camera/single-image selection, captions, preview and recovery. Use a failed item's Create corrective action button to choose a locally named person and due date.
5. Review the saved answers/evidence, enter the inspector and Complete inspection. The inspector name is saved with completion, not with every draft keystroke. Completion preserves a local snapshot.
6. History opens completed read-only records. Create a correction draft with a reason if the inspection needs correction.
7. Actions: resolve with notes and optional photos; reopen with a reason. History keeps prior resolution notes/evidence. No emails or push messages are sent.
8. Preview & export report: review findings/actions, generate an encrypted PDF and explicitly export via the OS share sheet. Exported copies have no expiry/revocation; share-sheet return is not delivery confirmation.

The app-wide provider holds one private keyed connection; the original serial transaction adapter remains. Saving a form commits its change and local event together. Missing keys/cipher/corrupt files never cause a silent reset or plaintext fallback. Unacknowledged keystrokes/captures can be lost on immediate termination; only a committed save is acknowledged. Losing/uninstalling the device can lose unsent work.

## Usable preview and sample report

```powershell
npm run preview:workflows
```

Open `previews/cleanproof-workflows.html` in a modern browser. It is a clearly labelled **browser reconstruction** with synthetic session-only data: try outcomes, actions/resolution, sample photos, completion, report preview, new sites and checklist versions. Reload resets changes. It shares domain/scoring/review functions and the native report HTML builder, but does not execute native screens, encryption, persistence, camera, OS sharing or a backend.

`previews/inspection-report.html` is generated by the same HTML builder used by the native PDF generator. A separately supplied sample PDF was rendered from it with a free host HTML renderer, not expo-print on a phone. No repetitive stress-test content is used in the management preview.

```powershell
npm run preview:report
```

Stress fixtures are generated separately:

```powershell
node scripts/report-stress.mjs
```

Run this after preview:report; outputs go to ignored artifacts/report-stress. Optional host render tools are not application dependencies.

## Verification and optional host tools

```powershell
npm run check
```

The current ordinary suite runs 51 tests and skips the optional host SQLCipher integration (52 total). The configured driver enables all 52. The separate backend suite adds eight tests. Earlier 40-test results below are historical. To enable that test on a compatible Python platform:

```sh
python3 -m pip install --target /absolute/test-tools/python sqlcipher3-binary==0.6.0
CP001_SQLCIPHER_PYTHONPATH=/absolute/test-tools/python npm test
```

PowerShell environment syntax:

```powershell
$env:CP001_SQLCIPHER_PYTHONPATH = "C:\absolute\test-tools\python"
npm test
```

An optional external jsdom installation can rerun the preview DOM check; it is not native execution:

```sh
npm install --prefix ../preview-tools --no-audit --no-fund jsdom@26.1.0
CLEANPROOF_JSDOM_MODULE=/absolute/preview-tools/node_modules/jsdom/lib/api.js node scripts/verify-preview.mjs
```

No new mobile dependencies were added. The separately locked backend development-only test tool is installed with `npm ci --prefix backend`. The existing audit remains unresolved: 27 affected dependency entries, 19 high / 8 moderate. No forced downgrade or suppression. See docs/IMPROVEMENT-VERIFICATION.md and the current acceptance checklist before marking any release gate passed.

## Ownership and history

Proprietary Sicy International Ltd source; third-party dependencies retain their licences. Restore the full history from the delivery:

```sh
git clone cleanproof-history.bundle ../cleanproof-with-history
```

Install/run inside the restored folder. The archive excludes node_modules, generated native projects/builds, databases, keys and signing material. It includes all source, lockfile, tests, fixtures, previews, documentation and Git history. No remote repository, account, deployment or publication was created. Cash expenditure: **£0**.

### Email confirmation-link correction (25 October 2026)

The customer web entry now uses confirmation/reset links with PKCE, explicit HTTPS callbacks, early URL cleanup and protected browser session persistence. This supersedes earlier numeric-code template instructions for web customers. See [evidence, required backend settings and acceptance](docs/EMAIL-LINK-AUTH-FIX.md). The desired hosted Auth patch is prepared but **not applied**: the installed connector cannot change Site URL/templates/provider credentials. Complete customer authentication remains unverified. Do not describe this build as customer-ready.
