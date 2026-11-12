# 0.5 acceptance status and release gates

The native source and host-proven business/photo path are implemented. **Complete offline synchronisation is not yet accepted for a real-data pilot.** No paid infrastructure, live data, real invitations, subscriptions, public deployment or publication.

| Area | Implemented / newly verified | Pending acceptance or limitation |
|---|---|---|
| Baseline | Restored attached 0.4 history through da7e83b; locked dependencies; fresh original tests pass | Previous verification documents remain historical |
| Adoption | Human review, stale-review rejection, owner server registration, transactional local maps; original IDs/AAD/JSON preserved | One canonical company/account per installation; arbitrary merges/switching blocked |
| Both queues | Exact outbox and local_events rows captured/delivered; consistent aggregate checkpoint; idempotent server/local receipts | Large historic import partitioning beyond 10 MB/1,000 aggregates |
| Incoming | 50-record pages, restartable encrypted staging/cursors, atomic validated relational projection, FK/history triggers retained | Full-stack/PostgREST throughput and native performance |
| Conflicts | Concurrent actions preserve both proposals, current values and divergent histories; explicit choice | Incompatible completed/template histories stay blocked for correction/owner review |
| Photos | Private intents, hash/size/full JPEG decode, retry/dedup, missing-file recovery, second-device re-encryption; no key transfer | Actual Edge/Auth/Storage HTTP execution, native capture/rotation/low-space timing |
| Deletion | Archived metadata retained; photo tombstone denies downloads and deletes receiver sealed copy; old revisions do not resurrect | Remote orphan retention/purge is manual and needs a reviewed service-only procedure |
| Permissions | PostgreSQL negative tests for companies, site scope, identity forging, inspector draft relocation and forbidden finalisation | Real JWT/PostgREST/Storage negative tests in prepared full-stack harness |
| Sessions | Encrypted session adapter, whole-workspace gate, device-auth offline lease, sign-out listener/lease invalidation, role checks | Physical shared-device/app-switcher/clock behaviour; known scope changes quarantine for manual review rather than automatic fresh-workspace recovery |
| Report | Second host client regenerates actual report HTML from preserved completion snapshot and downloaded photo | Native PDF/share compatibility; issued secure report versions are a later phase |
| Native | Android/iOS prebuild configuration and Hermes bundles; iOS protection plugin retained | APK/IPA compilation/execution, Android/iPhone physical acceptance |
| Dependencies | Mobile audit reassessed; no encryption weakening/forced downgrade; server decoder pinned/vendored/licensed | 27 affected mobile dependency entries remain a release blocker |

## Required real local-stack run

On an isolated Docker-equipped machine, follow SYNC-0.5-SETUP.md and run `npm run test:full-stack`. Record actual Auth token/refresh behaviour, RPC calls, private upload/download, second independently signed-in client, duplicate/lost replies, conflict history and denied direct Storage access. This harness is provided but **not run** here. Syntax checks and embedded PostgreSQL tests do not pass this gate. Test real signed-expired JWTs, revoked refresh tokens/rotation timing, invalid recovery codes and local-mailbox reset as separate cases; an invalid token is not evidence of a signed-expired token test.

## Required two-native-client workflow

- Android and iPhone, or available passcode-protected native clients first: original CRUD/template versions, offline draft/results/notes, photograph, action/resolution, completion, immediate kill/restart after acknowledgements, adoption, reconnect/sync and second client reconstruction.
- Verify same template wording, original completion/branding, correction provenance, resolution histories, JPEG bytes/hash/caption and locally regenerated report. Completed locally, Synced and future Submitted/Approved must remain distinct.
- Competing draft/action edits, completion-vs-edit, template version races, lost RPC reply, expired token mid-upload, killed .part/rename/ready stages, low storage, corrupted/missing files, duplicate upload and server/network restart. No false Saved/Synced state.
- Verify local incoming photo tombstone cleanup and denied future private download. Confirm protected historical evidence cannot be deleted. Retained remote bytes need policy/backup/controlled purge, not a public URL.
- Inspector assigned/unassigned sites, forged company/inspection IDs, relocation attempt, revoked membership/site, sign-out with unsent work, another-user sign-in, company-switch block, offline lease expiry/rollback. Known restricted scopes remain quarantined; do not clear/reset data to work around it.
- Physical SQLCipher/keychain/keystore, wrong/missing keys, app-switcher snapshots, offline embedded-bundle cold launch, backup restore, iOS Documents/Support/Caches protection and exclusion (including WAL/SHM and newly created files), Android backup/transfer restrictions.
- Camera denial/cancel, metadata removal/orientation, native A4 photo pagination and receiving share apps after bounded transient cleanup. Host HTML/AES tests are supplementary, not native evidence.

## Operational work before pilot

Choose/approve hosting region, retention, consistent DB plus private-object backups, restore/key-loss/revoked-staff recovery, scope-quarantine recovery UI, monitored quotas/operating cap and unresolved dependency review. Measure adoption size/audit growth and handle import partitioning before large existing histories. No real data until these and full-stack/native security gates pass.

Next phase after sync acceptance: canonical report version/finalisation, owner MFA and protected expiring/revocable client access. Local export cannot be revoked. Billing and publication remain excluded.
