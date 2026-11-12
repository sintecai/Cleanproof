# 0.7 current architecture

Native SQLCipher/SecureStore/media remain the main platform. Added isolated per-profile DB/key/media factories and a remounted boundary for fresh permitted-scope receives; source quarantine is preserved. Added same-project Expo web adapters (encrypted SQL.js snapshot/IndexedDB media, chooser, browser print), never substituted into native code. See START-0.7, RECOVERY-0.7 and NATIVE-0.7. Local schema 8/server migrations 001–006 unchanged.

---

# CP001 implementation decisions

The screen talks to a DraftEditor, which tracks edits and commit acknowledgements separately. A single save pump snapshots the current generation; an older completion cannot replace newer text or label it saved. The inspection repository validates the synthetic scope and payload before committing. SQL parameters bind all form values.

Each committed revision updates inspection_drafts and inserts an outbox operation in one BEGIN IMMEDIATE transaction. Unique revision and operation constraints prevent accidental duplication. Expected-revision comparison rejects stale overwrites. Drafts may be incomplete; review, not persistence, enforces completion. Initial synthetic seeding is revision zero and does not fabricate a completed save.

The SQLCipher capability check precedes schema or inspection writes. A 32-byte random hexadecimal passphrase is generated and persisted securely before a new database is created. Missing/unreadable keys on existing files fail closed; bad keys, future schemas and corrupt data never cause automatic deletion or reseeding. SecureStore uses WHEN_PASSCODE_SET_THIS_DEVICE_ONLY for iOS; Android uses its OS-backed secure storage. The device-lock check and OS behaviour require physical-device verification. The app is local-only and has no authentication/session boundary yet.

Database access uses one private keyed connection and a serial queue, including reads. Expo's separate-connection exclusive transaction helper is intentionally avoided because the additional connection would need its own SQLCipher key. Explicit transactions on the keyed connection preserve atomicity. Foreign keys, WAL, synchronous FULL and a busy timeout are set after unlocking. WAL/checkpoint behaviour must also be tested with the shipped native library. Rollback errors do not hide the original failure.

Schema v1 stores draft JSON with local revision metadata and immutable pending outbox snapshots. This is a CP001 storage slice, not the complete Phase 1 relational cloud schema. Outbox operations have stable UUIDs and versioned kinds, but no remote consumer, retry scheduler, conflict reconciliation or cross-device support exists. Establish the server idempotency/permissions contract before enabling delivery. Do not treat local outbox durability as successful synchronisation.

The app includes no secrets in source. DB files, keys, credentials, signing materials and node_modules are excluded from Git. Android backup is disabled for this demonstration; SecureStore config also excludes its encrypted preference files. iOS key material is device-bound; database restore without a matching key must fail safely. A production retention/recovery design remains a future requirement.

Official implementation references:
- https://docs.expo.dev/versions/latest/sdk/sqlite/
- https://docs.expo.dev/versions/latest/sdk/securestore/
- https://docs.expo.dev/develop/development-builds/introduction/

No analytics, crash-reporting service, paid SDK or backend was added. Native generation and JavaScript exports validate configuration/bundling only, not a signed app or runtime security.

## 21 October continuation

The original CP001 architecture above remains the baseline. Root route is now the local catalogue/history workspace; /inspect opens a selected frozen workspace through the existing DraftEditor and InspectionRepository; /compatibility is the explicitly labelled M1 native experiment. Navigation attempts flush inspection changes and refuses to leave on unsaved/error state; media operations block ordinary screen removal while active. OS process termination still relies on committed storage, not navigation hooks.

Catalogue methods commit metadata changes together with a local event; template versions and per-inspection contexts preserve historical wording. Migrations are additive and transactional. See MIGRATIONS.md. No backend integration or server authorisation was added.

MediaVault is a testable lifecycle service behind file/crypto interfaces. Native adapter uses Expo Crypto AES-GCM, app-private FileSystem directories, ImagePicker/ImageManipulator, Print and Sharing. Native calls are kept outside host-tested domain code. The host crypto adapter uses real AES-GCM but does not execute Expo's native implementation. AAD binds asset identity and scope; SHA-256 verifies expected plaintext bytes. Sealed file contents are never stored as plaintext in the database. The random media key stays inside encrypted local_secrets and is not regenerated if journal/files already exist but its key row is missing.

The write journal and file system cannot share a transaction. The protocol reserves metadata, writes/verifies .part, renames, then atomically commits ready/event. Startup and explicit recovery handle the gap; no success is shown until ready commits. Deletion tombstones precede file removal. Orphans are counted/preserved, not purged. Missing/corrupt evidence blocks sample PDF generation. Full production file reconciliation, uploads and submitted evidence immutability remain later work.

Private plaintext exists temporarily during picker conversion and native PDF creation/export; it is not protected by SQLCipher or per-file AES at that moment. OS sandbox/device protection, no gallery writes, finally cleanup and next-media-workspace cache sweep limit exposure. Crash remnants can persist until that next open. Disk secure erasure, iOS backup exclusion, memory inspection and OS security guarantees are not proven. Keep synthetic data only. See ATTACHMENT-LIFECYCLE.md and ACCEPTANCE-CONTINUATION.md.

## Version 0.3 product workflow

WorkspaceProvider now owns a single keyed connection for the application lifetime. Route changes reuse it rather than repeatedly opening connections and sweeping caches during another screen's work. The original SQLCipher gate, keychain policy, serial queue, explicit transactions and DraftEditor remain. Schema v4 is additive; see MIGRATIONS.md.

WorkflowRepository adds local completion, immutable snapshots, corrections, local assignees, corrective actions and append-only action history. It commits business changes with pending local events. Completion is explicitly separate from future server Submitted/Approved states; no queue is marked synchronised. Core validation, scoring, migrations, failure rollback and history protection are host tested.

Screens now provide Home, searchable Customers/Sites, template versions, inspection progress and item-linked photo/action routes, filtered history, action resolution/evidence and report review/export. Shared native presentation primitives provide spacing/type/contrast/touch sizes. Navigation guards protect unsaved inspection edits and catalogue/checklist forms; in-flight media/report operations prevent ordinary route removal. Device-kill durability still depends on committed storage, never navigation hooks.

inspectionReport.ts is the actual native HTML report builder. It escapes text, embeds verified photo bytes, labels draft/completed-local status and includes current action-as-of data. Explicit page sections, bounded note chunks, long-detail continuation and numbered footers support A4 output; native engine differences are still a required device gate. The sample PDF uses the same HTML through WeasyPrint for host-only visual QA. The optional browser reconstruction shares pure domain/report code but has no native storage or server implementation and is labelled accordingly.

No additional application dependency, backend, AI API, cloud service or production role control was added. Cash £0. Real-customer readiness remains blocked by native/backup/share tests, dependency findings, authentication/isolation/sync and operational release work.


## Version 0.4 — backend foundation

See SYNC-ARCHITECTURE.md for the new authoritative foundation boundary. Local schema v5 adds encrypted sessions and a scoped metadata queue/inbox/cursor without altering legacy outbox/event rows or native file format. The original local workflow remains independent. Supabase server migrations enforce active membership/Owner/Inspector site permissions and transactionally acknowledge metadata operations; native GoTrue adapter/UI is implemented with full-stack acceptance pending. No client file policies or secure report links are enabled. Native iOS backup/file protection generation is added; OS verification is pending. Earlier statements above that no server/auth code exists are historical, not descriptions of 0.4.


## Current 0.5 update — 21 October 2026

0.5 now implements original-queue business/photo sync. See SYNC-0.5-ARCHITECTURE.md; earlier 0.4 absence statements are historical. Native SQLCipher/AES formats remain. Full-stack/physical acceptance and operational limitations remain explicit.


## Current 0.6 update — 21 October 2026

0.6 extends the existing native/local-first design. New adoption.ts captures bounded durable encrypted review pages guarded by business_generation. Business batches bound aggregates/audit rows separately; queues remain exact. BusinessAccess adds server-derived scope recovery review and durable quarantine/audit. 005/006 add scope/maintenance RPCs and expiring upload intents. RELEASE-0.6-RECOVERY.md documents limits and operational boundaries.
