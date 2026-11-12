# CleanProof 0.7 — isolated recovery and paired server snapshots

Sicy International Ltd · 22 October 2026 · synthetic development only. Read START-0.7 first.

## Reduced site permissions

The old encrypted workspace is never reset, filtered in place or reassigned. A changed access generation still quarantines it and disables its offline lease. At the lock screen:

1. Sign in/recover the original account online; choose Review protected-work recovery.
2. If the account still belongs to the company but covers fewer stored sites, choose **Open a separate authorised workspace**.
3. The app obtains fresh server-derived user/company/role/site scope, creates a different SQLCipher database with a new device-stored random database key and a different sealed-media directory/key, and starts with **no copied business records, queues, photos or demo seeds**.
4. Only the server's permitted projections and privately authorised photo downloads enter that new store. A second fresh scope check must match before activation. The source records a recovery audit entry first. Failure leaves the source selected and protected; partial target files remain encrypted for investigation. No failed target is advertised as opened.
5. The provider remounts the application boundary on selection, replacing old navigation/component state; transient native photo/PDF caches and browser report windows are cleared. New profile reads/searches/reports/media/sync address only its database and media directory. Previously downloaded/exported files outside the app cannot be recalled.
6. The old workspace, original IDs/AAD, immutable snapshots, acknowledged and unsent work, queues and key remain intact. **Select previous protected workspace** selects it again; fresh authorisation/review is still required to open quarantined records or restore a fully covering scope. Another company/account cannot adopt it. Removed members cannot obtain a fresh permitted workspace.

Browser profiles use separate encrypted IndexedDB SQLite snapshots, KDF salts and media namespaces instead of native SQLCipher/key storage. This is an additional preview adapter, not native security acceptance. Host tests exercise actual relational projections and server scope policies in embedded PostgreSQL, including a restricted-site draft with unsent work. Native cross-route/cache/app-switcher/attachment/export checks remain pending; do not call the entire leakage boundary physically verified.

Sign-out, lease expiry and background locking retain their existing behaviour. Offline revocation cannot be learned until reconnection; previously verified access lasts at most the bounded lease. An offline lease is never silently renewed. Previously exported PDFs remain uncontrolled copies. Do not clear data, replace a missing key or bypass a failed migration to reopen work.

## Real private Storage snapshot adapter

`backend/storage-snapshot.mjs` implements recursive bounded Storage REST inventory, exact-path byte copy, lengths/SHA-256, second inventory checks and upload/readback verification. It rejects traversal, inconsistent inventories, excessive object counts and corrupt backup bytes. `backend/paired-snapshot.mjs` adds actual pg_dump/pg_restore orchestration and a paired manifest. It accepts loopback local services only. No real Storage/Supabase restore was executed here because Docker is absent.

### Capture a paired synthetic snapshot

Use a fresh private output directory outside the repository. Keep service keys only in the private terminal described in START-0.7.

1. Stop synthetic client writes and Auth/password changes. Freeze **every** synthetic company using `cleanup:photos -- freeze` with its CLEANPROOF_CLEANUP_COMPANY. Stop the photo-transfer serve process and let in-flight operations finish. Wait at least 15 minutes. Do not shorten production grace periods; this is not an invitation to operate on real data.
2. Confirm the appropriate source container with `docker ps` (default database container is `supabase_db_cleanproof-local`). The capture tool checks every company's maintenance freeze/grace before copying and requires an explicit operator assertion that other writes are quiesced.

Bash:

```bash
export CLEANPROOF_BACKUP_QUIESCED=YES
npm run backup:paired -- capture ../cp07-private-snapshot
unset CLEANPROOF_BACKUP_QUIESCED
```

PowerShell:

```powershell
$env:CLEANPROOF_BACKUP_QUIESCED = 'YES'
npm run backup:paired -- capture ../cp07-private-snapshot
Remove-Item Env:CLEANPROOF_BACKUP_QUIESCED
```

Optional private `CLEANPROOF_LOCAL_DB_CONTAINER` identifies the source container. The tool writes a binary custom-format `database.dump`, original private paths under `objects/`, `storage-manifest.json` and MANIFEST.md. The manifest records source origin/commit, PostgreSQL version, dump hash, object length/hash/update identity and company inventory. A changing inventory fails; partial output is not marked a complete backup. Database streams go directly to a file, avoiding PowerShell binary redirection damage. Service keys never enter the manifest.

3. Encrypt/verify the paired directory using the existing envelope:

```bash
read -r -s -p 'Separate backup passphrase: ' CLEANPROOF_BACKUP_PASSPHRASE
export CLEANPROOF_BACKUP_PASSPHRASE
npm run backup:files -- seal ../cp07-private-snapshot ../cp07-synthetic.cpbackup
npm run backup:files -- restore ../cp07-synthetic.cpbackup ../cp07-private-restore
unset CLEANPROOF_BACKUP_PASSPHRASE
```

PowerShell: set CLEANPROOF_BACKUP_PASSPHRASE with Read-Host -AsSecureString / System.Net.NetworkCredential as in the 0.6 recovery runbook, then remove it. The existing envelope has a **64 MiB synthetic snapshot limit**. Larger snapshots are refused; do not truncate them. Keep plaintext staging on protected host storage, remove it only after verified recovery according to operator policy, and retain the passphrase separately. File mode 0600 does not establish Windows ACL or physical disk security.

### Restore on a separate disposable local stack

Use a separate checkout/container project and API port, e.g. http://127.0.0.1:55321, configured with nonoverlapping PostgreSQL/Studio/Mailpit ports. Change project_id to a distinct local project before starting it. Apply the same source commit/migrations. Do not alter the source stack's ports/data or use db reset to obtain an empty target. Use fresh local service credentials for the target.

```bash
export CLEANPROOF_LOCAL_URL=http://127.0.0.1:55321
export CLEANPROOF_LOCAL_DB_CONTAINER=supabase_db_cleanproof-restore
# Read the TARGET local service key privately into CLEANPROOF_LOCAL_SERVICE_KEY.
export CLEANPROOF_RESTORE_DISPOSABLE=YES
npm run backup:paired -- restore ../cp07-private-restore
unset CLEANPROOF_RESTORE_DISPOSABLE
```

PowerShell uses the same names via `$env:...`. The tool requires a different API origin from the manifest, the recorded source commit, the same PostgreSQL version, and a target without company records/private objects. PostgreSQL data restore uses a single transaction, disables triggers only for the private administrative restore, restores Auth/public data into the existing matching schema and fails on errors. It does **not** import source API/signing keys or make a storage bucket public. Private object bytes are then uploaded and read back to verify SHA-256. Restored maintenance freezes remain in place until review.

A failed database transaction rolls back. If object restoration fails after the database has committed, the target is a **partial disposable restore**; the tool does not yet offer an automatic whole-procedure resume. Preserve evidence, investigate, and use another fresh disposable target for a new rehearsal. Do not bypass the empty-target guard or reset the valuable source. Individual object transfer is idempotent, but this is not a claim that every restore boundary has passed real service acceptance.

Verify fresh password sign-in/password recovery, membership/site scope, cross-company and direct-object denial, immutable snapshot hashes, receipts/cursors, exact photo hashes and report regeneration using two fresh authorised clients. Source signing keys may differ, so old access JWTs are not expected to authenticate on the restored local stack; sign in afresh. Only this completed rehearsal permits calling the paired server backup recoverable. No such rehearsal was possible here.

## Orphan maintenance

Continue the guarded 0.6 dry-run/freeze/claim/delete/readback/finalise/unfreeze protocol. Seven-day renewable upload intents do not erase pending operations. Orphans require 30-day age, no current/pending/conflicting references or shared/newer intents, company boundaries, a quiescent freeze and 15-minute grace. Successful object absence must precede final acknowledgement. Unfinished audit claims keep maintenance frozen and require investigation/retry.

```sh
npm run cleanup:photos -- dry-run
npm run cleanup:photos -- freeze
# Stop Edge, wait full grace, take paired snapshot, review candidate list.
npm run cleanup:photos -- execute
npm run cleanup:photos -- dry-run
npm run cleanup:photos -- unfreeze
```

Actual Storage deletion/retry acceptance is still not run. SQL guard tests and the Storage adapter contract fixture are separate observations. Do not present them as actual Storage execution. Pending/conflicting requests and unknown objects remain retained rather than guessed abandoned.

## Retention and resource limits

- Preserve unsent original queues, unresolved conflicts, quarantined work, in-progress adoption/download/upload state and historical inspections/actions/templates. None are automatically pruned by 0.7.
- Proposed resolved-review retention: at least 90 days, all associated changes server-acknowledged, no relevant quarantine/conflict, and a verified paired backup plus required local recovery evidence before a reviewed deletion. This is an operator policy proposal, **not an implemented automatic purge** or prior management approval. Earlier adoption copies can contain recovery evidence; do not delete them by generation number alone.
- Monitor encrypted DB/media/backup sizes and review-copy growth. Useful developer query: `SELECT count(*),sum(length(body)) FROM business_import_rows;`. Count unresolved business_batches/decisions and raw queue acknowledgements before any proposed compaction. Raw queues remain retained exactly. A user-facing saved state is not permission to erase its audit history.
- Keep the tested **7 MB indivisible aggregate/source-row limit**. A legitimate oversized item is blocked, with its original bytes and queue still present. Do not edit a completed snapshot, remove history or mark the record synced to get around it. Preserve the device/workspace and have Annmaria review a versioned history-partition protocol; a correction draft does not remove the old transfer obligation. No chunk protocol was invented here.
- The encrypted server snapshot envelope remains capped at 64 MiB and the Storage adapter at 10,000 objects / 10 MB per object. They are explicit synthetic limits, not a production backup capacity promise.

Server backups recover only acknowledged server records and paired object bytes. Unsynchronised encrypted work, unuploaded media and device-bound keys may remain device-only. The new workspace does not magically recover or submit those quarantined changes. No portable device backup/key escrow is implemented. Hardware/key loss can still lose unsent work.
