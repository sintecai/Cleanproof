# 0.7 scope recovery

Fresh membership-derived recovery scope is checked before/after a new independently encrypted empty receive store. Only permitted server projections/photos enter it; source raw queues/snapshots/key/AAD remain intact and audited. No copied restricted records or automatic merge. Profile activation remounts UI; real native cache/export/privacy acceptance is pending. See RECOVERY-0.7.

---

# Foundation contract and recovery — 0.4

## Implemented boundary

Original native SQLCipher connection/key gate, serial BEGIN IMMEDIATE transactions, original draft editor/repository, frozen completion contexts, AES-GCM attachment format and both legacy queues remain. Additive local schema **v5** adds only `auth_sessions`, `sync_operations`, `sync_inbox`, `sync_cursors`. There is no downgrade, plaintext fallback, auto reset or destructive import. CP001 acknowledged draft/outbox bytes are checked before/after upgrade and fault rollback. A test fixture was corrected to remove v5-only empty tables when constructing a v3 fixture; its rollback assertions remain.

The new sync store deliberately does **not** replace the old outbox. Its consumer currently covers separately queued synthetic connected customer/site metadata. This is a foundation slice, not the completed migration/consumer for inspection saves and local business events. `legacyPending()` performs counts only. No old event is falsely acknowledged. The adapter for both existing queues, identity mapping, attachment manifests and safe incoming business projections are the next prerequisite before enabling local-inspection sync.

## Server model

- `cp_companies`: name, transactional company cursor, access epoch.
- `cp_memberships`: authenticated user/company, Owner or Inspector, active flag. No Manager approval was invented; approved Phase 1 has two roles.
- `cp_assignments`: Inspector site scope. Membership/assignment changes advance the epoch.
- `cp_records`: company-scoped UUID, kind, fixed site/parent scope, JSON payload, revision, tombstone, authenticated actor. This is a **versioned replication envelope**, not the final relational inspection/approval/report schema. Native local relational tables remain authoritative for local work.
- `cp_receipts`: user/company/operation UUID, full canonical request and result in the same transaction as accepted record/change/cursor.
- `cp_changes`: ordered company change snapshots, including tombstones. No retention pruning yet; cursor/snapshot compaction must precede a large pilot.
- `cleanproof-private`: nonpublic bucket, 10 MB/type limits, **no client object policies**. Uploads/downloads denied until manifest validation/recovery and canonical report finalisation exist. Closed storage is not an implemented attachment service.

Clients cannot mutate tables directly. RPCs lock the company row, obtain `auth.uid()` from the verified server token, derive active membership, check role/site/parent scope, compare expected revision, then commit. A supplied company UUID merely selects a resource to check; it grants no authority. Functions have fixed empty search paths and explicit grants; RLS governs reads. No service key belongs in mobile code.

Permission matrix: Owner can create/change customer/site/template metadata in their company; Inspector reads templates and assigned-site records, and can append local-only inspection/action replication events for assigned sites. These immutable event kinds are protocol preparation, not server-validated inspection completion, approval or action execution. Their payload explicitly says `localOnly:true`. Native app currently queues only customer/site metadata. No production domain validation/approval claim is made for JSON events.

## Delivery and recovery

Protocol 1: stable UUID, company/entity/kind/site/parent, expected revision, deletion flag, payload. Requests persist before any network call. Insertion order uses SQLite rowid to preserve dependencies when timestamps tie. Up to 100 operations/pages per foreground run; retry continues later. No background-delivery guarantee.

One worker instance serialises concurrent runs. Full server authorisation precedes delivery. Same ID/same JSON request returns the original receipt without incrementing revision/cursor. Same ID/different JSON rejects. Server record mutation, receipt and change commit atomically. Client checks operation ID, scope, revision and payload of accepted receipts, then commits state/inbox together. Failed transport or failed receipt write leaves work pending. Retry backoff is exponential, capped at five minutes; explicit Retry resets the delay. There is no network-status plug-in/subscription.

Metadata conflicts preserve both copies, mark `conflict`, stop that operation retry and continue unrelated operations. No automatic overwrite/rebase. A new explicitly reviewed operation against the current revision is required to change the server record. Immutable template versions and local completion/action events cannot be rewritten; corrections/new versions have new UUIDs. These rules do not yet implement collaborative draft/action-field merges.

Pull pages contain protocol, epoch, sequence/record snapshots, cursor and head. Company locks keep watermark and rows consistent with commit order. Client applies each page and cursor in one transaction; interruption replays safely. Revision-monotonic inbox updates do not replace newer records with old pages. Tombstones remain; resurrection is rejected. Deleted parents with active dependent records are rejected. Epoch changes reset only that user's downloaded inbox/cursor, retain queued proposals, and replay authorised history. Revoked membership blocks all calls. Real-time subscription and push notifications are unnecessary.

## Session and device boundary

GoTrue handles passwords/reset/refresh; the app's typed REST adapter performs no password hashing/authentication of its own. Session JSON, including refresh token, is stored in SQLCipher rather than AsyncStorage or a large SecureStore value. SecureStore keeps the existing database key. Session namespace is backend origin; queues/inbox/cursors are additionally user/company scoped. No secrets are logged. HTTP is allowed only for private/loopback development origins; otherwise HTTPS. Requests time out after 20 seconds.

Connected records require a session plus online current-user/membership validation to open/sync. Backgrounding or session expiry locks the connected UI and cancels in-flight sign-in/refresh from reopening it. Recover session is explicit, online. The server enforces JWT expiry; the device-clock timer is only a UI lock and is not a tamper-resistant offline lease. The Phase 1 proposed seven-day authenticated offline lease is **not implemented**; this increment uses the stricter no-offline-cold-open policy for connected data. Original local synthetic inspections are intentionally still accessible without an account; do not use that workspace for confidential data on shared devices.

Sign-out locks memory immediately and removes persisted session before attempting server logout. It retains encrypted queued proposals/inbox for the same identity, so unsent work is not deleted. A failure clearing local credentials is reported, not called success. Network revocation failure is disclosed. Supabase access JWTs may remain valid until expiry; sign-out is not instant global access-token revocation. Shared-device, passcode, keychain and background visibility/app-switcher snapshots need physical acceptance. Per-user encrypted databases and unsent-work recovery/quarantine are required before real shared-device use.

## Native files

Existing sealed-file journal/temporary cleanup is unchanged. New iOS config plugin sets backup exclusion and complete file protection on app Documents, Application Support and Caches plus existing descendants before React opens SQLite. Unsupported launch hooks/failures fail closed and preserve files. Generated Swift checked, **not compiled or OS-tested**. Future-file inheritance, WAL/SHM, locked-device writes, app extensions and actual backup/restore must be verified physically. Android exclusions remain. Keys are not regenerated when data exists. See existing attachment recovery notes; OS-private temporary plaintext and recipient-export copies remain outside the per-file encryption guarantee.

## Next schema/protocol work

Implement reviewed adoption/mapping of the legacy synthetic company into a dedicated authenticated workspace; bridge each legacy operation/event exactly once with durable mapping/receipt while preserving raw rows. Do not rewrite sealed AAD identities or immutable snapshots during import. Add safe incoming local relational projections with completed-history triggers, field-level conflict proposals, revoked-scope quarantine and schema negotiation. Then implement private upload intents/checksums/size validation, immutable file versions, resume/download staging and encrypted re-sealing before acknowledgement.

Secure client access deliberately follows that work: canonical report snapshot/hash and version, private validated PDF, owner MFA, hashed 32-byte bearer secret, default 72-hour/max seven-day scope, short-lived download authorisation, explicit revocation and minimised access log. No viewer/link endpoint or sharing button is delivered. Revocation will block future service access, never recall downloaded PDFs. Local OS export remains an unrevocable copy, not a secure link.


## Current 0.5 update — 21 October 2026

Superseded for current implementation by SYNC-0.5-ARCHITECTURE.md. Both original queues now have a real checkpoint consumer; private photo transfer and relational projections are source-implemented/host-tested. Full Supabase/native acceptance remains pending.


## Current 0.6 update — 21 October 2026

0.6 supersedes all-at-once outgoing assumptions: bounded parent-first aggregate checkpoints precede exact raw-source receipts. Native review snapshots are durable/paged, invalidated by business/source generation changes. Scope generation is checked before upload; quarantined old work opens only after fresh explicit covering authorisation. Reduced scopes remain locked. See RELEASE-0.6-RECOVERY.md and ACCEPTANCE.
