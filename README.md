> Current release execution: both production functions are deployed with JWT checks; all twelve migrations remain applied. Approved UI/auth forms are unchanged. Production Confirm email is still ON; signing, recovery and device gates are open. See release/ADMINISTRATOR-RUNBOOK.md and release/SUBMISSION-MATRIX.md. No personal credentials or further agent sign-in handoffs are requested. This archive is not submission-ready.

> Current delivery status: see [release/FINAL-DELIVERY-STATUS.md](release/FINAL-DELIVERY-STATUS.md). Source delivery is not store-submission approval.

> Current implementation and honest release gates: [release/CUSTOMER-RELEASE-PROGRESS.md](release/CUSTOMER-RELEASE-PROGRESS.md). Native and real staging integration work continues from e3b511b; no store release or signed binary is claimed.

> Store preparation (31 October 2026): see [release/STORE-PREPARATION.md](release/STORE-PREPARATION.md) and [release/OWNER-AND-STORE-GUIDE.md](release/OWNER-AND-STORE-GUIDE.md). This source is not approved for customer release; no signed AAB/IPA or installed-device acceptance is available.

> Prepared connected-auth follow-up: [CONNECTED-AUTH-STATUS.md](CONNECTED-AUTH-STATUS.md) explains the isolated demo configuration, verified public staging configuration, direct synthetic service results and remaining protected-backup/deployed-browser gates.

> Mobile-first design work in progress: [MOBILE-REDESIGN-STATUS.md](MOBILE-REDESIGN-STATUS.md). The existing staging deployment and user data remain untouched; real-device and signed-in acceptance are pending.

> Prepared follow-up (not deployed): [WORKSPACE-AND-PDF-RECOVERY-STATUS.md](WORKSPACE-AND-PDF-RECOVERY-STATUS.md) documents the missing customer PDF host, safeguards for company reopening and missing snapshots, and the required backup/acceptance gates.

> Latest correction: [PDF-DOWNLOAD-PRIVACY-ACCEPTANCE.md](PDF-DOWNLOAD-PRIVACY-ACCEPTANCE.md) adds real browser PDF generation/download and removes signed-out remembered-account identity hints. Browser download receipt and authenticated acceptance remain unverified.

> Latest correction: [CHECKLIST-VALIDATION-ACCEPTANCE.md](CHECKLIST-VALIDATION-ACCEPTANCE.md) covers field-specific checklist errors, value preservation, autofill-safe submission and the applied backend constraint. Full authenticated browser acceptance remains pending.

> Latest increment: [INSPECTION-CREATION-ACCEPTANCE.md](INSPECTION-CREATION-ACCEPTANCE.md) covers usable checklist selection, owner publication/return, retry-safe draft creation and fresh-workspace sync registration. Authenticated browser acceptance remains pending.

# Current navigation and account increment

See [ACCOUNT-NAVIGATION-ACCEPTANCE.md](ACCOUNT-NAVIGATION-ACCEPTANCE.md) for the shared workspace gate, visible customer-browser logout, account switching, one-active-tab restriction (the earlier remembered-account selector is now removed) and pending authenticated browser acceptance. [STARTUP-LIFECYCLE-ACCEPTANCE.md](STARTUP-LIFECYCLE-ACCEPTANCE.md) records the preceding startup correction. These are staging changes, not customer-release acceptance.

Email/password immediate signup and removal of Google are retained. The hosted Site URL, single recovery allowlist entry and Confirm email OFF were verified in the preceding configuration work; see [VERIFIED-AUTH-URLS.md](VERIFIED-AUTH-URLS.md). No Supabase settings are changed by this increment. Older documents saying that the switch still needs owner action are historical. Password recovery retains its separate email dependency and acceptance gate.

> Current security/authentication follow-up: see [SECURITY-AND-AUTH-ACCEPTANCE.md](SECURITY-AND-AUTH-ACCEPTANCE.md). The following delivery record is historical baseline evidence; customer authentication remains unverified.

# CleanProof — latest complete source delivery

Sicy International Ltd · 26 October 2026 · proprietary, UNLICENSED.

This is the complete existing Expo/React Native/TypeScript Android/iOS application and its same-project browser target, not a replacement mockup. It contains the current UI, Add Site, local inspection/photo/action/report workflows, encrypted persistence, migrations and Supabase adapters. **Development/staging source; not a production-ready customer release. Google sign-in is removed.**

Start with [RELEASE-STATUS.md](RELEASE-STATUS.md), [AUTHENTICATION-SETUP.md](AUTHENTICATION-SETUP.md) and [HISTORY-RESTORE.md](HISTORY-RESTORE.md). The ZIP's SOURCE-COMMIT.txt identifies the exact packaged commit. VALIDATION-RESULTS.md distinguishes fresh checks from historical evidence. Earlier runbooks in docs/ are retained for architecture/recovery and historical provenance, not as current auth instructions.

## Source provenance

Recovered from the authoritative Site Git repository, HEAD 148cd2085a354f9fce3818e01ec3c5c4a2cc9564, which Sites confirms is deployed version 14. It includes all application changes through email-only authentication. Subsequent local documentation-only commits 46d19d7 and 3c962ae were not pushed; their objects were removed during workspace maintenance and are not present in the recovered history. Their recorded investigation findings are restored in RELEASE-STATUS and AUTHENTICATION-SETUP. This delivery is a new documented successor of the deployed source; it is not falsely represented as a descendant retaining those unavailable objects. No functional newer source change is known or discarded. The available 34-commit baseline history plus this delivery commit is bundled.

## Requirements and installation

Node.js 24.x, npm, Git (for history restoration). Native builds additionally need the appropriate SDKs below. Dependency versions are locked; do not force audit fixes or unsupported downgrades.

```sh
npm ci
npm ci --prefix backend
npm run check
npm run test:backend
node --test scripts/email-only.test.mjs scripts/auth-return-bootstrap.test.mjs scripts/static-route-entries.test.mjs scripts/build-customer.test.mjs
npm run secrets:check
```

The optional host SQLCipher-driver test can skip when its separately documented driver is absent. Host/backend fixtures do not prove physical-device security or real Auth/Storage integration.

## Same-project browser preview

```sh
npm run build
node scripts/serve-app-preview.mjs dist
```

Open http://127.0.0.1:8081 for local UI review. `npm run build` embeds the existing public staging URL/key from deployment/staging.public.json, disables demo tools/local-only mode, builds dist, and generates direct callback pages. These public client values are intentionally not secrets. Runtime hosting environment variables do not alter an already exported static bundle. Local HTTP UI review is not an allowed deployed email-callback origin; use the configured HTTPS staging URL for real confirmation/recovery.

Existing hosted review: https://cleanproof-sicy-preview.grassyelf128.chatgpt.site (private hosting access is separate from CleanProof login). The delivered source contains a mail-template correction not applied to hosted Supabase settings; the published app remains version 14.

Optional isolated synthetic browser demo, explicitly separate from connected customer mode:

```sh
npm run build:demo
node scripts/serve-app-preview.mjs dist
```

This is the same application with browser adapters, not evidence of backend login/sync or native SQLCipher. Never use demo data as customer data. Do not run old preview:workflows as customer acceptance; it is a retained historical reconstruction.

## Backend (local development)

Docker and the pinned Supabase CLI are required for the full local stack. Use a disposable synthetic stack. Retain existing data; no reset command is needed.

```sh
npx --yes supabase@2.121.0 start
npx --yes supabase@2.121.0 migration up --local
npx --yes supabase@2.121.0 functions serve photo-transfer
```

Keep Edge serving in a separate terminal. Read docs/BACKEND-SETUP.md, docs/START-0.7.md, docs/RECOVERY-0.7.md and backend scripts for the exact private terminal-only test variables. Root .env.example is public mobile configuration only. Do not put service-role/JWT/SMTP/signing/backup secrets there. Local signup is disabled by default. supabase/config.onboarding.example.toml explicitly enables synthetic local signup and local numeric-code fixtures; those fixtures are separate from the link-based customer templates. Local test-mailbox workflows are not deployed customer verification.

With services and private terminal test variables configured:

```sh
npm run test:full-stack
npm run test:auth-live
npm run test:onboarding-live
```

These commands must actually pass against Auth/REST/Storage/Edge; absent credentials or fixtures do not establish acceptance. Hosted non-destructive smoke: npm run test:staging-smoke. Apply all eight tracked forward SQL migrations to a reviewed target; preserve receipts, snapshots, private objects and pending device work. Hosted project already has these migrations according to earlier evidence; inspect migration history before applying anything again.

## Web deployment

For this exact existing staging build use npm run build and publish dist with the current .openai/hosting.json and existing private audience. For another reviewed environment copy deployment/production.public.example.env values into the build process (public URL/publishable key only), set EXPO_PUBLIC_CLEANPROOF_ENVIRONMENT appropriately, and run npm run build:staging. Despite that script name, its output directory is staging-dist and it uses the supplied HTTPS Supabase origin. Production must be a separately reviewed target; do not silently point it at staging.

Serve all static assets and callback aliases directly, or preserve query parameters through an exact SPA rewrite. scripts/static-route-entries.mjs generates email-callback.html, reset-password.html, directory aliases and business-route entries. Test direct request and reload of each callback before email acceptance. Never use wildcard auth redirects, expose private buckets, or include server keys in exports. See deployment/staging.auth.patch.json for the desired, not yet confirmed applied, hosted Auth settings.

## Android / iOS

The native application identifiers/signing arrangement are preserved. Generated android/ios folders and signing keys are intentionally excluded; Expo config/plugins regenerate native projects. Expo Go does not support this SQLCipher build.

Android: compatible Android SDK/Java toolchain, passcode-protected test device/emulator:

```sh
npm run android
npm start
# Embedded-bundle local Release build (does not publish):
npx expo run:android --variant release
```

Mac only: compatible Xcode/CocoaPods and existing authorised signing setup:

```sh
npm run ios
npx expo run:ios --configuration Release
```

Do not uninstall, clear storage, replace keys or force an incompatible signature to make an upgrade work. Check docs/NATIVE-0.7.md and docs/APK-EXECUTION-ACCEPTANCE.md. No APK/IPA or physical-device acceptance is delivered by this source packaging task.

## Data protection and operations

Native SQLite uses SQLCipher with device-bound secure key storage; attachments are separately encrypted. Browser persistence uses explicit browser adapters and account-scoped protected storage, not native hardware assurance. Preserve the original outbox/local_events, snapshot history and quarantine. Only server receipts plus required attachment acknowledgements justify Synced. Local PDF export is not protected client-link access. Password recovery cannot recover a missing device-only encryption key or unsynchronised data. Review docs/ATTACHMENT-LIFECYCLE.md, docs/MIGRATIONS.md, docs/SYNC-0.5-ARCHITECTURE.md and docs/RECOVERY-0.7.md for limits and recovery.

## Ownership and release

Copyright Sicy International Ltd; no open-source licence granted. Third-party licences remain included. Complete source and available Git history are delivered; GitHub upload, customer publication, SMTP/domain provisioning and production release are separate actions. No paid services were created. Customer readiness requires the open gates in RELEASE-STATUS.md to pass.
