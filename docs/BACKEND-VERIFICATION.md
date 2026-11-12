# New observations — CleanProof 0.4, 21 October 2026

## Provenance and baseline

Resolved/downloaded the current CleanProof-M1-CP002-Source.zip, version 1, SHA-256 `afee983c8d761743ea2efc3128e5fbe8e6e0ecefca610247ef1bed0fff57bd71`. Restored its Git bundle through 8e5dc85; CP001 and M1/CP002 history retained. Read README, architecture, migrations, NEXT-TASK, historical verification/acceptance and attachment lifecycle records before changes. Read the supplied four-page inspection report's first-page output: it explicitly says Completed locally / Not submitted or approved. It was not treated as native acceptance or as source code.

Fresh baseline locked install/typecheck and **40/40 host tests passed**, including the external SQLCipher integration. This confirms source-level local customer/site/template/draft/completion/media/action/report services and failure tests; it does not confirm phone execution.

## Environment and limitations actually observed

Linux, Node 24.19.0/npm 11.9, Java present. No Docker/Podman, PostgreSQL server binaries, Android SDK/adb, Xcode, emulators or physical devices. A free OS PostgreSQL install attempt failed under the environment's UID/group restrictions; no privileges were escalated and no paid service substituted. Used separately locked **PGlite 0.5.10** for actual embedded PostgreSQL SQL/RLS/transaction tests instead. Auth UID and minimal Storage tables are explicitly synthetic test fixtures. PGlite is not GoTrue, PostgREST, the Storage HTTP service or a multi-process server.

## Delivery checks

- Root typecheck passes.
- **52/52 mobile/domain/storage/adapter host tests pass** with external sqlcipher3-binary 0.6.0. Ordinary check: 51 pass / one optional SQLCipher skip. Twelve tests added for encrypted sessions, failed saves/sign-out/expiry/background races, stable delivery, receipt rollback, cursor atomicity/tombstones/scope reset, authorisation and legacy-row preservation.
- **8/8 backend/plugin tests pass**: cross-company/anon/direct-write denial; idempotent receipts/payload-reuse rejection/stale conflicts/tombstones; Inspector site/membership scope; incremental pages/epoch reset; closed private storage SQL policy; iOS generation hook guard/idempotence; two independent host SQLite stores using actual PostgreSQL RPCs with lost ACK/conflicting edits; server receipt-failure rollback.
- Two-host-store integration is not a two-device native test or proof of password/token verification. Auth adapter tests inject HTTP responses; full local Supabase integration remains pending.
- `expo prebuild --no-install` succeeds for Android/iOS. Generated Swift contains the iOS exclusion/protection launch hook; Android backup restriction/SQLCipher remain. No Xcode compile or OS attribute/backup verification is claimed.
- Metro/Hermes Android and iOS bundle export succeeds. Source-only configuration/bundling is not an APK/IPA build, phone runtime or native security acceptance.
- Offline Expo compatibility check says dependencies up to date but warns its validation is unreliable offline. Fresh mobile audit: 27 affected entries, 19 high/8 moderate; backend test package audit: zero. Advisory/root registry review found no compatible braces/node-forge patch; no forced fix/downgrade/crypto weakening.
- Browser reconstruction generated from the retained domain/report functions. Optional jsdom workflow test passes validation, outcomes, action create/resolve, synthetic sample image, completion, report iframe, new site and template version. Label updated to 0.4/local workflow only; backend screen is not simulated. No native/browser visual execution claim.
- `git diff --check` passes. Source delivery excludes keys, session/DB files, .env, signing material, node_modules and generated native/build directories.

The first extended suite run found an old v3 test fixture still containing newly added v5 tables. Corrected only the fixture setup to exclude those tables, preserving its rollback assertions. Re-runs pass. Other historical results in older verification documents remain historical.

## Not accepted / not implemented

No full Supabase Auth/REST/Storage runtime was started; no native binary/device run. Camera permissions/orientation, offline cold launch, native SQLCipher/keychain, low-storage/crash timing, app-switcher privacy, actual iOS backup exclusions and native PDF/share compatibility remain pending. New native sign-in/reset screen has source/type/bundle and adapter test evidence, not full-stack device acceptance.

Existing inspection outbox/local_events remain unsent. The new synthetic customer/site metadata store is separate. No identity/adoption mapping, incoming business projections, photograph/PDF transfer, collaborative inspection/action sync, secure client viewer/link/revocation/access-log endpoint, MFA/invitation administration or complete combined synthetic workflow has been implemented. The bucket is closed rather than exposing incomplete file sharing. Do not describe local events/snapshots as server-submitted/approved reports.

The delivered runnable increment is **backend foundation**, not a dependable real-data pilot. BACKEND-ACCEPTANCE.md specifies the next exit gates. Actual incremental cash expenditure: **£0**. No external account, purchase, deployment, real mail/invitation, billing, app-store publication or other app modification occurred.

Evidence logs are under docs/evidence/backend-foundation; they contain synthetic test output only. Official API and engine references:
- https://github.com/supabase/auth#endpoints
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://pglite.dev/docs/
