# CleanProof 0.5 — observed verification and delivery

21 October 2026 · Sicy International Ltd · synthetic data throughout.

## Provenance and environment

The user-attached CleanProof-M1-CP002-Source(1).zip identified itself as 0.4. Restored its complete bundle through da7e83b, preserving CP001, M1/CP002 and all later commits. Read README, ARCHITECTURE, NEXT-TASK (current 0.4 section), SYNC-ARCHITECTURE, BACKEND setup/acceptance/verification, migrations and attachment lifecycle before implementation. No research/backend-selection restart. A workspace reset interrupted uncommitted work; recovered the saved 0.4 source/history, reran the baseline and saved a durable 0.5 source checkpoint before continuing. No lost prototype was presented as tested.

Linux/Node 24/npm; no Docker/Podman, Android SDK/adb, Xcode, emulators or physical devices. Fresh 0.4 baseline: 52 host tests passed with configured host SQLCipher; eight backend/plugin tests passed. Current results below are separate from old records.

## Current checks actually performed

- TypeScript type check: pass.
- **58/58 host tests, zero skipped** with sqlcipher3-binary 0.6.0 configured. Includes original wrong-key/forced-kill and save/crash/revision tests; new adoption/stale review/transaction rollback, both-queue receipt atomicity, projection/cursor failure, v6/v7 rollback and cached-access boundary tests. Ordinary unconfigured test runs skip the one optional SQLCipher integration.
- **14/14 backend/plugin tests**: actual embedded PostgreSQL RLS/RPC/transactions, synthetic Auth claim fixture and private object test double; not an Auth/REST/Storage server. Combined native-domain/host-client flow, paged incoming restart/late parents, forged identities/protocol/finalisation denial, deletion propagation, inspector relocation attack, per-member scope generations, and retained 0.4 isolation/idempotency/conflict tests.
- Combined flow creates customer/site/template, saves Fail/Pass and notes, seals a genuine synthetic JPEG, creates/resolves an action, completes locally, closes/reopens the host database, recovers lost upload/commit replies, delivers **both original queues**, projects into a second independently scoped host client, re-encrypts using an independently generated key and regenerates the actual report HTML from the immutable snapshot/current action history. Original queue rows are compared exactly before/after. Competing action edits retain both histories and explicit conflict decisions.
- Deletion test found that an incoming tombstone initially hid but did not immediately remove the receiver's sealed file. Fixed by entering the original deleting journal and running vault reconciliation after projection. The regression now verifies file removal and denied future download. A relational ordering failure earlier led to explicit table-order projection; paged tests cover parents updated later than their inspections.
- Deno 2.9.6 type check of the actual photo Edge handler: pass. A runtime-registry restriction prevented the initial npm decoder import; the byte-identical pinned decoder is now vendored with licences, avoiding runtime download. Host tests execute that same decoder. Deno check is not service execution.
- Native Expo prebuild: Android/iOS configuration generation passed. Hermes/Metro Android/iOS export passed. These are not APK/IPA builds or runtime/device acceptance.
- Full-stack harness and support module: Node syntax checks passed. **No actual Supabase Auth/PostgREST/Storage/Edge stack was run** because Docker is unavailable. Prepared `npm run test:full-stack` is intentionally separate and requires explicit loopback-only local keys. No missing-credential/skip result is called a pass.
- Fresh mobile audit: 27 affected entries (19 high, eight moderate), unchanged SDK 58.0.16/RN 0.88.0. Backend development package audit: zero findings including pinned jpeg-js 0.4.4. Current official braces/node-forge advisories still list no patched versions; no forced Expo downgrade/transitive major override or encryption weakening. No mobile dependency added.
- Git diff whitespace checks, full history bundle verification and archive integrity checks performed for delivery. No databases, session/key material, .env, signing files, node_modules or generated builds included.

Raw synthetic logs and bundle metadata are in docs/evidence/0.5. Historical 0.4 evidence remains in its original directory. The source supplies native screens, not a web replacement. The retained browser workflow reconstruction remains labelled simulation; it is not evidence of the new backend/native execution.

## Pending and known limitations

Full-stack and two-native-device acceptance are unperformed. Physical encryption/secure storage, camera/orientation, low-space/power-loss timing, backup exclusions/restore, app-switcher privacy, embedded offline cold launch and PDF/share compatibility remain pending. Known restricted access generations quarantine a workspace for owner/developer review; automatic scope-recovery/multi-account workspace switching is not complete. Large historical import partitioning and remote orphan purging require operational work. Incompatible immutable histories can remain unresolved for correction/review. Local PDFs are not synchronised issued reports or secure links. No pilot-readiness claim.

Actual incremental expenditure: **£0**. No paid service/account, external invitation/mail, public deployment, live customer data, subscription, app publication or other-app change. Pilot estimates and assumptions: SYNC-0.5-COSTS.md.

Official references checked:
- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/pricing
- https://github.com/jpeg-js/jpeg-js
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-86w9-cpqp-85rv
