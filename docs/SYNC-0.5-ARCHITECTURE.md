# CleanProof 0.5 — synchronisation and recovery contract

This supersedes 0.4 statements that original queues are unconsumed. Native Expo/React Native/TypeScript, the original keyed SQLCipher connection, serial transactions, save/retry controller, immutable snapshots, template versions and AES-GCM file format remain. No web replacement, new mobile dependency or production service.

## Adoption and identities

The existing local company UUID is a **content/encryption identity**, not server authority. The authenticated Supabase company UUID is separate. An opt-in review captures complete business records and exact pending source rows. Any intervening change invalidates that review. The owner first registers the canonical local company UUID against their authenticated company; local binding and per-kind local→remote identity maps then commit together. A mapping failure rolls back without deleting/rekeying anything. A registered server mapping with a failed local commit is safe to retry: the same pair is idempotent, a different pair is rejected.

0.5 supports one adopted local company/account per encrypted installation. Mappings retain original entity IDs, frozen JSON and AAD. A second authorised device uses the same canonical content identity while encrypting bytes under its own key. Arbitrary legacy-company merging and switching this populated installation to another company are intentionally blocked. Receive mode requires no pending original source rows and explicitly reviews replacement of pristine demo seeds. Acknowledged work is not silently discarded. More general multi-account/import mapping remains an operational extension.

## Durable ownership and ordering

`outbox` remains immutable `save_draft_v1` snapshots with its original pending-only CHECK. `local_events` remains the original event journal. Neither is cleared or rewritten. New v6/v7 tables:

| Table | Purpose |
|---|---|
| business_binding / business_identity | Authenticated company/user/origin and explicit content mappings |
| business_batches | Stable checkpoint ID, exact request, pending/accepted/conflict receipt and errors |
| business_acks | Source kind/ID → acknowledged checkpoint, beside raw original rows |
| business_versions | Last server revision and canonical baseline for each business aggregate |
| business_incoming / business_download | Durable incoming pages, scope and download position |
| business_cursor | Published relational projection position/scope |
| business_decisions | Explicit conflict choice and complete local/server backup copies |
| business_access | Cached membership lease, maximum observed clock, sign-out flag |

A checkpoint is captured in one SQLite transaction: consistent business state plus the exact unsent outbox/event rows. Both raw queues are delivered as audit data; their old effects are **not replayed twice**. Latest state coalesces successive local draft saves while preserving every original source snapshot in the server audit. Stable checkpoint ID/body survives restart and lost replies. New saves during delivery remain outside that checkpoint and are not acknowledged accidentally.

Business aggregates are Customer, Person, Branding, Template + immutable versions, Site, and Inspection + frozen context/lifecycle/actions/history/photo manifest. Dependency order is customer/person/branding/template/site/inspection. Expected revisions are per aggregate. This conservative inspection-level conflict rule includes action edits; it avoids unsafe field-level last-write-wins merges.

Server staging derives user from verified JWT membership, validates company/content mapping, role/site scope, relational identities/dependencies, answer/completion structure, failure actions, immutable history, photo manifests and limits. It freezes the exact request. Photo intents precede storage writes. Commit locks the company, checks every expected revision/current permission and required verified photo, then commits records, original-source receipts and business receipt atomically. Any stale aggregate produces a retained conflict receipt and no business changes. Same checkpoint/body returns its receipt; same ID/different request or user rejects. Direct client table mutation and photo finalisation are denied.

Only a matching receipt with exact record data/revision changes local versions/source acknowledgements. A failed local receipt transaction leaves all work pending. The original draft repository now derives pending count from business_acks when schema v6+ is available; its read-only legacy-schema path still counts all old pending rows during migration-failure tests. No encryption or migration gate is bypassed.

## Incoming records, scope and deletion

Pull returns at most 50 current changed aggregates plus company watermark and a **per-member** permission generation. Company locks prevent commit-order watermark gaps. Adding an unrelated colleague does not invalidate another owner's scope; changing that member's role, activity or site assignment advances their generation.

Each page and its download cursor commit together to staging. No partial relational workspace is published. This matters when a parent Site was edited later than its Inspection and appears on a later page. After all pages arrive, validated whitelisted columns project in dependency order with the published cursor in one transaction. SQLite foreign keys and existing completion/template/history triggers remain enabled. Completed records are skipped when identical, never reopened/replaced to simplify sync. A crash before staging clear merely replays idempotently. Required photo files are downloaded/verified/re-sealed afterwards; missing files keep overall status at Sync needs attention rather than Synced.

An access generation change stops publication and quarantines the existing encrypted workspace. Online unlock also checks scope. This prevents stale authorised data reappearing or being opened after a known restriction. **A fully automated fresh-workspace/scope-quarantine recovery UI is not implemented**; owner/developer review of retained work is required. Membership denial stops all service access; offline revocation is necessarily bounded by the cached lease.

Customers/sites/templates use retained archive flags as logical tombstones; historical parents remain available to frozen inspections. Photographs use retained deleted/deleting tombstones. Incoming deletion enters the existing local delete journal; vault reconciliation removes owned sealed/partial copies and preserves the row. Re-delivered old revisions cannot resurrect it. Completed inspection evidence and resolution-history evidence cannot be deleted through the server protocol. Current table projection never assumes that absence from a page is a deletion.

## Conflict decisions

The Sync screen presents proposed and current findings, notes, actions, names and revisions. A review decision preserves complete copies in business_decisions. Keep-local rebases only an explicitly chosen proposal against the current server revision; immutable history checks still apply. Use-server chooses current values while retaining divergent append-only action-history branches. The original conflicting receipt remains a conflict audit entry; it is not falsely changed into a successful server receipt. A subsequent accepted checkpoint acknowledges the retained raw source rows.

Different completed snapshots or incompatible immutable template histories can remain blocked and require correction/owner review. 0.5 does not automatically rewrite those records or claim every conflict is automatically resolvable. Corrections retain their new UUID and provenance; they are separate inspection aggregates. Incoming edits concurrent with an in-flight newer local save are preserved and may need another retry to materialise a reviewable server conflict.

## Private photographs

The existing nonpublic bucket still grants **no direct mobile object policies**. Authenticated Edge access is the only photo route. Gateway JWT checking stays enabled; the handler additionally calls Auth `/user`, then user-scoped RPC checks active membership, inspection/site, staged intent/current manifest and ownership. Service credentials remain in the Edge environment and never enter the app.

An intent is bound to company/checkpoint/inspection/asset/hash/size. Whole-file transfers restart safely at the intent boundary; files are capped at 1 MB, so byte-offset/TUS resumability is unnecessary here. Duplicate upload replies recover by verifying existing object bytes. A verified same-company asset/hash can reuse its private object across checkpoints rather than duplicating storage. Upload success is not inspection-sync success: the atomic business commit must still acknowledge it.

Server validation checks actual bytes: bounded stream, JPEG markers/dimensions, EXIF rejection, strict full JPEG decode with resolution/memory limits, size and SHA-256. The pinned jpeg-js 0.4.4 decoder is vendored unchanged with BSD/Apache notices and used by the host fixture too. No runtime package download, image-transformation service or paid API. A changed extension/Content-Type cannot bypass these checks. Decoder/runtime compatibility still needs the full local Edge acceptance run.

Transfer plaintext exists only in process memory and local development transport; production must use HTTPS. Native source photographs decrypt from the vault in memory. The receiver verifies hash/size and seals under its own independently generated device key using the original AAD identity, writes/verifies .part, renames, then marks ready. No key is shared. Imported readiness does not create a new local business event/echo. Interrupted .part/final files remain recoverable; a conflicting corrupt sealed file is preserved for investigation rather than overwritten silently. A source user can retrieve their own verified, uncommitted staged upload for recovery; other members cannot use that pending-upload path. Current tombstones prevent ordinary future downloads.

There is no permanent public photo URL. Private paths/bytes require current service authorisation. Storage objects, database backups and local exported PDFs are distinct. Local PDFs are regenerable derivatives and are not mirrored as issued report versions; their original local events travel as audit evidence. Canonical reports/secure client links follow later.

## Orphans, retention and low storage

Every service-created object has an intent committed before its write. Interrupted uploads therefore have a durable identity for safe retry; lost upload receipts recheck bytes. Local deletion journals retry; unknown local sealed files remain preserved/listed by the existing vault. Missing/corrupt files block full Synced status and report generation. Low storage never acknowledges a failed file/DB write; retry reuses durable state.

Remote superseded/uncommitted objects and intent metadata are currently retained for recovery. **Automatic remote orphan purging is not implemented**; do not delete objects by filename/age alone. Before pilot acceptance choose a retention policy, take a consistent DB + private-object backup, quiesce relevant writes, prove a candidate is absent from every current manifest and pending recoverable checkpoint, delete through an audited service-only procedure, and test restart/retry. Retaining them avoids silent loss but consumes quota; budget/measure this explicitly. No automatic destructive cleanup service or subscription was added.

## Authentication and offline access

The native gate protects the **whole adopted workspace** on background/sign-out, not just the account page. Online unlock verifies saved identity, current membership and scope. Offline unlock requires OS device authentication plus a membership check no more than seven days old; sign-out durably disables that lease before reporting success. It tracks the maximum observed wall clock and rejects rollback beyond five minutes. This is not tamper-proof trusted-time hardware. Unsent records stay encrypted and bound; another account/company cannot use the same database. Inspector catalogue/branding/person mutations are rejected at local repository boundaries as well as on the server.

JWT expiry forces refresh for network operations. Cached offline access is a separate bounded policy and does not label an expired token valid. Server revocation failure is disclosed; issued access JWTs may remain valid until expiry. Known revoked membership/scope quarantines access. OS app-switcher snapshots, lock-screen timing, crash durability, iOS backup exclusion and native PDF/share remain physical acceptance gates. Device loss/key loss recovery is not a completed production service.

## Limits and next acceptance

Protocol 2, local schema 7, one bound workspace, 10 MB/1,000 aggregates per outgoing checkpoint, 50 aggregates per download page, 100 pages per foreground attempt, 20 active photos/inspection and 1 MB/photo. A limit error preserves the queue; large historic imports need partitioning before use. No background-sync guarantee. Original-source audit retention increases DB storage; monitor it.

Next: execute prepared full-stack harness on Docker, fix discovered integration issues, run two native clients/physical devices, complete scope-recovery/orphan-retention/shared-device operations, and obtain dependency/native acceptance. Only after synchronisation passes those gates add report finalisation, MFA and expiring/revocable client access. Actual spend in this increment: £0.
