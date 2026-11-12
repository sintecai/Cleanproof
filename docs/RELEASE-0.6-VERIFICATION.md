# CleanProof 0.6 — observed results and remaining defects

Sicy International Ltd · 21 October 2026 · synthetic data only.

## Provenance

Attached CleanProof-M1-CP002-Source(1)(1).zip and its 0.5 setup/verification were materialised and read. Its history ends at **7119898**, preserving da7e83b and earlier CP001/M1/CP002 work. The native application and working local repositories were retained. Fresh locked installs and baseline checks observed **58 host tests and 14 backend tests passing**, zero skips with the configured host SQLCipher driver. These are new observations, distinct from earlier 0.5 claims.

Environment inspection found Node 24.19.0 on Linux, and **no Docker, Podman, adb, Android SDK/Xcode or native devices**. No attempt to label a missing-credential run as integration acceptance. Actual Supabase Auth/PostgREST/Storage/Edge, physical builds/devices and true server backup restore remain unperformed.

## Implemented increment

Code tested at **055d1d1**; use the exact full hash in evidence/0.6/source.json as authoritative.

- Native Sync uses a durable paged adoption snapshot with source-generation invalidation, bounded capture steps and atomic final identity/binding commit. Original queue rows, IDs, frozen history and attachment AAD are retained.
- Parent-first outgoing state now uses 40-record/~7 MB checkpoints; exact original queues drain in 100-row/~7 MB receipts only after related state is acknowledged. At most 20 batches per foreground run. Stage recovers existing accepted receipts after lost acknowledgements. Remaining original operation count prevents a false Synced state. A single oversized indivisible history remains blocked.
- Fresh authenticated scope RPC, durable quarantine/audit and explicit native restoration review. Fully covering restored permissions recover saved work without replacing the database. Reduced-site workspace isolation is **not complete**, so that path stays locked.
- Seven-day renewable upload intents; service-only audited orphan candidate/claim/finalise RPCs; write freeze, 15-minute grace, 30-day minimum age, active-reference/pending-proposal checks, bounded idempotent local operator tool. Pending/conflicting recovery work never expires automatically. No destructive Storage execution was performed.
- Separate prepared actual Auth/mailbox suite, loopback-only private credentials; synthetic backup envelope/staging tools and an embedded restore experiment. No new mobile dependency, paid service, public deployment, billing, invitations, live data, report finalisation, secure links or MFA expansion.

## Checks actually performed against 055d1d1

- TypeScript: pass.
- **63/63 host tests, zero skipped**, configured sqlcipher3-binary 0.6.0. Retains wrong-key/kill/revision/encryption tests and adds adoption failure/resume/change bounds, quarantine/review and schema-8 rollback tests. This is host SQLCipher, not native acceptance.
- **18/18 backend/plugin tests**, including the original combined two-host-client workflow and PostgreSQL RLS/RPC; new maintenance/scope/expiry tests, real host DB close/reopen during large review, encrypted embedded snapshot+JPEG restore and wrong-passphrase/tamper rejection. Auth claims and object transfer remain fixtures, not actual Auth/Storage services.
- Native Expo prebuild for Android/iOS: pass at c918ca0 (native configuration unchanged in 055d1d1). Android/iOS Hermes bundle export: pass. Neither compiled/installed an APK/IPA or exercised device encryption/camera/PDF/share.
- Deno 2.9.6 type check of actual photo handler: pass at c918ca0 (handler unchanged in 055d1d1). Node syntax checks for full-stack, live Auth, cleanup and backup tools: pass. Syntax checking is not service acceptance.
- Fresh mobile audit: **27 affected entries: 19 high, 8 moderate**. Backend audit: zero. Official GitHub braces/node-forge advisories checked again: no patched versions. No supported patch for those findings was evidenced; no forced override/downgrade or cipher weakening was applied. Exposure paths/mitigations below.
- Source whitespace, complete Git bundle/ancestry and ZIP integrity checked for delivery. Source archive excludes runtime databases, auth/key material, `.env`, signing credentials, generated native projects/builds and dependencies.

Evidence: docs/evidence/0.6. Historical test logs remain in evidence/0.5. During development, a host receipt test initially failed because queue receipts now follow aggregate receipts; its transaction test was updated to inject failure in the correct audit-receipt batch, preserving its rollback assertions. A new maintenance migration initially used a reserved SQL identifier; renamed it before the final pass. These were fixed test/source failures, not real-service findings. Final review also found and fixed a late access-response/sign-out cancellation race; a regression now verifies that no lease or quarantine recovery can be granted by that cancelled verification.

## Defects and release decisions, ranked

| Impact | Open item | Consequence / next action |
|---|---|---|
| Critical acceptance blocker | Actual Auth/REST/Storage/Edge not executed | Run test:full-stack and test:auth-live on Docker; fix real integration failures. No trial acceptance without evidence |
| Critical acceptance blocker | Actual native binaries/devices not tested | Encryption, backup exclusions, cold launch, photo/PDF/share, app-switcher and two-device flow remain unverified |
| High functional gap | Reduced-site isolated recovery | Old workspace stays locked until permissions restored. Build a separate authorised workspace without exposing/resetting quarantine before restricted-role trial |
| High release security gate | Upstream dependency findings | Review compatibility-supported updates and exposure; do not accept a clean audit achieved by unsupported downgrade |
| High operational gap | Actual paired Supabase restore | Manual object inventory/copy and version-compatible Auth/Storage restore rehearsal required; host snapshot proof is insufficient |
| Medium limit | Individual aggregate/source >7 MB | Safely blocked, not silently split/lost; needs explicit archival/history partition protocol if encountered |
| Medium operational gap | Pending/conflict/unknown orphan retention | Preserved indefinitely; quota monitoring/owner-reviewed abandonment and automated Storage adapter remain future work |
| Medium resource concern | Retained adoption/conflict review snapshots | Extra encrypted disk usage; no automated pruning; monitor capacity and preserve recovery evidence |

## Dependency assessment

Fresh `npm explain` establishes braces 3.0.3 through micromatch → Metro file map → Expo tooling; node-forge 1.4.0 through Expo CLI/code-signing-certificate tooling. Current advisories describe stack exhaustion from attacker-controlled nested patterns and RSA signature-verification parsing. These are build/development paths in this app's architecture; this is **not a proof that every generated runtime contains no vulnerable path**. Keep Metro/CLI private, run only trusted project/config/dependency input, avoid processing untrusted patterns/certificates with affected tooling, retain disabled OTA updates and no publication. No claim that mitigations eliminate the finding. Internal synthetic use remains conditional on management/security acceptance after real-stack/native gates; real-data release remains blocked.

Official sources rechecked:
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm — no patched braces version listed.
- https://github.com/advisories/GHSA-86w9-cpqp-85rv — no patched node-forge version listed.
- https://supabase.com/docs/guides/auth/passwords — local mailbox/password recovery workflow.

## Cash and internal-trial assumptions

Actual incremental expenditure: **£0**. Local synthetic testing on existing Windows/Android and Mac/iPhone equipment can remain **£0 service charges**, excluding existing electricity, disk and staff time. No equipment or account purchased. A hosted project is unnecessary for the prescribed local acceptance. If later authorised, the existing 0.5 cost assumptions describe Free limits and a Pro starting point of $25 USD/month, before tax/FX/additional backup/mail services; no hosted charge was incurred or approved. Pending media/audit snapshots and paired backups need measured capacity. No promise of production availability at zero cost.

Next milestone is closing the gates above. Secure report issuance/access follows only after integration/recovery acceptance; it was not silently added to this phase.
