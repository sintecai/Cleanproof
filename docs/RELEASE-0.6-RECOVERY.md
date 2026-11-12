# CleanProof 0.6 — recovery, retention and synthetic backup

## Access and unsent work

Network and token problems remain distinct from a confirmed access change. Network failure does not grant or extend an offline lease. The last successfully verified membership permits device-authenticated offline unlock for at most seven days. Expiry, observed clock rollback or sign-out prevents it. Revocation cannot be learned while a device is offline; an authorised person may retain offline access until that lease expires. A downloaded/exported PDF cannot be recalled. These are disclosed policy limits, not immediate offline revocation.

A fresh server scope check derives user, company, role, site assignments and access generation from authenticated membership. No client-provided user/site list is authoritative. Sync checks generation before sending work. A changed generation or removed membership durably disables offline access and locks the entire workspace, keeping original queues, immutable records, sealed files and keys.

At the locked screen, sign in with the original account, then **Review protected-work recovery**. If current authorisation covers every stored site, review unsent/conflict counts and explicitly choose Restore reviewed access. The app obtains another fresh server scope, rejects a changed review, records the decision and restarts the incoming scan at zero under that generation. It retains versions, old source queues and acknowledged business data. Only replayable incoming staging is discarded; this is not a database reset. Existing conflicts still require their own review in Sync.

**Reduced permissions remain a known blocked recovery path:** the existing populated single workspace cannot safely expose only selected records yet. It stays encrypted and unavailable for display, export and upload; the owner may restore required permissions, after which fresh review can reopen it. Removed members cannot perform recovery until membership is restored. Never clear queues or change company ownership. General switching/selective isolated workspaces is unfinished and is a release defect, not a completed feature. Temporary failures must not be handled as permanent membership removal. There is no bypass/export of quarantined work to an unauthorised user.

## Resumable adoption and transfer

Local schema 8 stores an immutable review copy in business_import_rows and a generation token in business_import_review. Every relevant local business/source write increments business_generation. Each capture step checks that token in the same transaction. A low-storage failure rolls back only the current step; a restart resumes the unchanged review. A changed source requires a new review. Old snapshots remain protected for investigation. Final binding/mappings commit atomically; failure leaves no half binding. IDs, frozen JSON, sealed AAD and raw queues are retained.

Outgoing business state is parent-first, at most 40 aggregates and about 7 MB per request. Only when all changed state is acknowledged are exact outbox/local_events audit rows delivered, at most 100 rows / about 7 MB. Each batch has its own durable ID; replies acknowledge only its contents. Twenty batches per foreground run bound work; another retry resumes. Stage can return an existing accepted receipt after a lost acknowledgement without forcing the client to reread an obsolete photo. Later edits are a new batch. Unacknowledged source rows remain visible as Waiting to sync. One indivisible aggregate/source row over 7 MB is blocked with work preserved; splitting an immutable inspection history is not implemented. Review snapshots also consume local space; automatic review-history pruning is not implemented.

## Private remote orphan retention and cleanup

Migration 006 adds renewable seven-day upload-intent expiry. Each authorised intent request refreshes that transfer window; expired upload/check/finalisation is rejected. Expiry **does not erase** a pending operation or its bytes. Retain pending/conflicting checkpoints indefinitely until explicitly resolved; age alone cannot establish abandonment. This is a deliberate recovery policy and can consume quota.

Eligible objects are at least **30 days** old, company-prefixed, and absent from every current nondeleted photo manifest and every pending/conflict proposal (including proposals that have not yet created another intent). Shared physical paths and newer intents also protect bytes. Only service-role maintenance RPCs can inspect/claim/finalise deletion. Direct mobile Storage access remains denied.

Operator tool defaults to dry-run, bounds each candidate set to 100 and accepts only the local loopback stack. No scheduled service or public function was deployed. To test locally, use the private service key in the terminal as in SETUP and set the synthetic company UUID:

```bash
export CLEANPROOF_CLEANUP_COMPANY='synthetic-company-uuid'
npm run cleanup:photos -- dry-run
npm run cleanup:photos -- freeze
# Stop the local photo-transfer serve process, allow in-flight requests to finish,
# and wait at least 15 minutes. Take/verify a paired backup before executing.
npm run cleanup:photos -- execute
npm run cleanup:photos -- dry-run
npm run cleanup:photos -- unfreeze
```

PowerShell: `$env:CLEANPROOF_CLEANUP_COMPANY = 'synthetic-company-uuid'`, same npm commands. Do not shorten the grace period outside a test fixture. Freeze and candidate claims serialize against normal company writes; upload checks/finalisation also refuse maintenance. Stop Edge serving during destructive maintenance to eliminate late in-flight object writes. Do not bypass the freeze with direct administrative writes. Recheck/claim each candidate immediately before removal. Storage deletion is followed by absence verification; only then finalise the audit/ready flag. A lost reply or deletion error leaves a retryable unfinished audit row and the company frozen. Unfreeze refuses unfinished claims. Restart execute and investigate the named path; never mark unknown deletion successful. Successful objects are not offered again. Repeated dry-run/execute handles sets beyond 100. Unknown objects lacking an intent are never automatically deleted.

No destructive Storage job ran in this environment. SQL candidate/guard/retry tests passed using synthetic fixtures. Actual Storage deletion/recovery remains a full-stack acceptance gate. There is no automatic hard expiry/erasure of abandoned requests; management must approve any later abandonment policy.

## Backup boundaries

Server recovery covers **acknowledged** business records, versions, source receipts and private photo bytes only when both database and Storage are backed up. Database backups alone do not contain object bytes. Local exported PDFs can be regenerated from available snapshots/photos/actions; issued report versions are not implemented. Unsent encrypted changes, unuploaded evidence, local-only conflict/review copies and encryption keys may exist only on that device. This phase does not provide portable device backup/key escrow. Lost device/key or uninstall can irreversibly lose unsent work; never promise server restore recovers it.

### Synthetic paired server backup on a Docker machine — prepared, not executed here

1. Record commit, Supabase CLI/container versions and all synthetic company IDs. Freeze each company; stop photo-transfer and wait the full grace. Stop synthetic client writes and Auth account/password changes during capture. Retain the freezes until database and object inventory are captured. Do not alter live customer data.
2. Create a private staging directory **outside the repository**. Avoid PowerShell binary-redirection corruption: have Docker write its dump inside the container, then copy it:

```sh
docker exec supabase_db_cleanproof-local pg_dump -U postgres -Fc --no-owner --no-acl -f /tmp/cleanproof-synthetic.dump postgres
docker cp supabase_db_cleanproof-local:/tmp/cleanproof-synthetic.dump ../cp-synthetic-backup/database.dump
```

Create `../cp-synthetic-backup` first. Check actual container names with `docker ps`; the configured project ID is cleanproof-local. The dump contains sensitive Auth metadata; keep private. Remove the temporary container dump after capture. Do not include it in a source ZIP.

3. In local Studio, use service-authorised access to inventory cleanproof-private object paths, byte lengths and SHA-256, including recoverable pending intents. Download the bytes through operator Storage access into staging `objects/` with preserved paths. This inventory/copy step is still manual; an automated real-Storage backup adapter is not implemented. Record complete inventory, hash checks, quiescence times, source commit and scope in `MANIFEST.md`. Do not treat a PGlite tar snapshot as pg_dump format.
4. Encrypt the staged paired snapshot using the supplied free Node tool (64 MiB synthetic limit). Private terminal passphrase, at least 16 characters, stored separately:

```bash
read -r -s -p 'Separate backup passphrase: ' CLEANPROOF_BACKUP_PASSPHRASE
export CLEANPROOF_BACKUP_PASSPHRASE
npm run backup:files -- seal ../cp-synthetic-backup ../cp-synthetic.cpbackup
npm run backup:files -- restore ../cp-synthetic.cpbackup ../cp-synthetic-restore-check
unset CLEANPROOF_BACKUP_PASSPHRASE
```

PowerShell: `$env:CLEANPROOF_BACKUP_PASSPHRASE = [System.Net.NetworkCredential]::new('', (Read-Host 'Backup passphrase' -AsSecureString)).Password`; same npm commands; then `Remove-Item Env:CLEANPROOF_BACKUP_PASSPHRASE`. Output refuses overwrite; a failed/partial operation is never reported successful. Remove private plaintext staging only after restore verification and according to operator policy, using normal encrypted host storage. Filesystem deletion is not a guarantee of secure erasure.

5. Restore only into a **separate disposable local stack**, compatible database/migrations/Auth/Storage versions. Quiesce its services first; use PostgreSQL custom-dump restore tooling for database.dump and Storage operator upload for paired bytes. Do not execute `pg_restore --clean` against the source or an existing valuable database. The delivered restore tool decrypts/verifies/stages files; it intentionally does not run SQL or reset a service. A full Supabase restore procedure must be rehearsed on the Docker development machine, including Auth schema/roles and object metadata reconciliation; it is an open acceptance gate.
6. Compare row counts, immutable snapshot hashes, object inventory/hash, memberships/RLS, original receipts and cursor state. Use two fresh authorised synthetic clients to retrieve records/photos and generate reports; reject cross-company access. Only after this evidence should the paired backup be called recoverable. Unfreeze the original synthetic companies after successful backup capture/review.

The automated observed backup test uses an embedded PostgreSQL data-directory snapshot and paired synthetic JPEG in the same AES-256-GCM/scrypt envelope. It restores into another embedded database, checks records and cross-company RLS, and rejects wrong passphrases/tampering. This verifies the envelope and host snapshot experiment **only**, not Supabase Auth/REST/Storage or device restore.
