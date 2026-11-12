# 0.7 migration status

No new local SQL or server migration is introduced. Existing schema 8 and server 001–006 are preserved. New authorised/demo profiles run the same versioned migrations in different encrypted stores; the legacy default filename/key path is unchanged. Never reset an old database to resolve profile, key, migration or signing errors.

---

# Local migration and recovery notes

CP001's schema SQL remains v1 as the authoritative old fixture. The migrator reads user_version, rejects future versions without resetting and runs the whole upgrade within one keyed-connection BEGIN IMMEDIATE transaction.

- v2 adds media_journal, encrypted-database local_secrets and local_events. All separate durable files are AES-GCM sealed; the media key itself is protected by SQLCipher's existing SecureStore-backed workspace key.
- v3 adds customers, sites, templates, immutable template_versions and inspection_context. It does not alter CP001 draft JSON, local revisions, saved timestamps or existing outbox snapshots. Seed-once INSERT OR IGNORE adds historical context beside CP001's original inspection. Archived/edited seed records are not overwritten on startup.

DDL and user_version updates commit together. A thrown/injected failure rolls back every new table and version step, preserving the old rows and queue. Retrying is idempotent. Catalogue seeding is a separate idempotent transaction after migration. A seed failure never triggers deletion/reseed of an acknowledged inspection.

Migrations are forward-only after successful commit. Do not try to run the old CP001 binary against schema v3, decrement user_version, clear app data or copy a live SQLite main file without its WAL. There is no downgrade conversion in this increment. For synthetic testing, retain a consistent encrypted database backup plus matching encrypted file directory and protected key recovery material under Sicy control before upgrading a populated test device. Use a stopped app / SQLite-aware consistent backup; copying the live main file alone is unsafe. Backup/restore automation and iOS backup exclusion remain acceptance work, not implemented services.

Host tests upgrade a hand-built v1 fixture containing an acknowledged revision/outbox; compare exact bytes; retry migration; inject a failure after v3 DDL and confirm user_version remains 1 with the original draft intact. Real host SQLCipher recovery also runs with the latest migrator. Native upgrade/power-loss and backup tests remain pending.

The existing outbox retains its save_draft_v1 constraint and shape. New catalogue/media events use local_events rather than pretending the old queue already has a compatible remote consumer. Both are durable, unsent local records. A future sync protocol must explicitly migrate/adapt both queues and acknowledge only after a server receipt. Never delete old operations to simplify the protocol.

A draft's inspection_context freezes customer/site name, address/timezone and template version wording at creation. New metadata edits affect new drafts; earlier contexts remain unchanged. There is no production submission snapshot/state machine yet. Company composite keys protect local relationships; the app has no login or server tenant security.

## Version 4 — local completion and corrective actions

The new additive v4 migration introduces company branding, local people, inspection_lifecycle, corrective_actions and append-only action_history; media_journal gains a nullable action_id. Existing CP001/v3 JSON, rows, revisions, template contexts, outbox entries and sealed bytes are unchanged. AES additional authenticated data deliberately retains its v1 shape so old attachments remain readable.

Completion freezes a canonical local snapshot in one transaction with its local event. SQLite triggers reject later answer/deletion/snapshot changes. The service verifies the expected draft revision, review rules, failure actions and a verified photo manifest. It is a local boundary, not a server permission or receipt. Current actions can evolve; each generated PDF freezes their status in its own saved bytes.

Corrections create a new UUID/draft and preserve provenance/reason beside the original snapshot. They copy the original answers/context as a starting point, not photos/actions. Completed inspection evidence is not deletable; action evidence referenced in a resolved history entry stays protected after reopening. Operational missing/recovery states may change without changing the recorded evidence hash/identity.

V4 DDL/user_version changes commit together. A fault injection test verifies v3 rollback and exact old payload retention; v1 upgrade/rollback tests remain. Upgrades are forward-only after success. Never decrement user_version or reinstall to “recover” a database. Consistent encrypted backup/restore and both native upgrade/crash gates remain pending.


## Version 5 — scoped connection foundation

Adds auth_sessions, sync_operations, sync_inbox and sync_cursors in the same keyed-connection migration transaction. The existing outbox/state constraint and local_events remain unchanged. Existing draft payloads/revisions, completed snapshots, action histories and attachment AAD/files remain intact. V5 fault injection rolls back to v4 and preserves exact acknowledged rows. The old v3 fixture now explicitly excludes v5-only empty tables; no assertions were removed.

Server migrations under supabase/migrations are separate PostgreSQL transactions and must never be executed in SQLite. Apply forward with local Supabase migration up, preserve previous local data, and never reset an existing project to fix an error. Failure rolls back the current migration; earlier applied migrations remain. No automatic server downgrade or data-destructive recovery script is supplied. DDL/permission changes require backup/restore and compatibility tests on the full Supabase stack before pilot acceptance.

Schema v5 is forward-only after commit: do not launch an old binary or decrement user_version. Retain consistent SQLCipher/WAL-aware backups and protected matching key/media material before upgrading populated synthetic devices. See SYNC-ARCHITECTURE.md for session and queue quarantine limits.


## Current 0.5 update — 21 October 2026

Local v6 adds binding/identities/business receipts/conflict decisions/access lease beside original tables. V7 adds durable page staging separately so the saved v6 development checkpoint upgrades safely. Both stages are transactional with fault rollback tests. Server migration 003 is preserved from that saved checkpoint; forward migration 004 replaces/hardens RPCs, removes unnecessary per-checkpoint object-path uniqueness for verified byte reuse, adds commit timestamps and per-member scope generations, and retains all rows. Apply both; never edit/reset an existing server to simulate upgrading. Native file AAD and key material are unchanged.


## Current 0.6 update — 21 October 2026

0.6: local schema 8 adds quarantine/access audit, adoption review/snapshot tables and generation triggers, atomically after schema 7. Fault rollback preserves old schema/data. Supabase 005 adds authenticated access-scope RPC; 006 adds renewable intent expiry and service-only maintenance, wrapping retained v05 functions after revoking their client grants. Historical migrations 001–004 are unchanged. Apply forward once using migration up --local; do not reapply 006 manually or reset existing data.
