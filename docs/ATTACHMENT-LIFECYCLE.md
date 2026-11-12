# 0.7 attachment boundaries

Each native isolated profile gets a separate evidence directory and encryption key; legacy defaults/AAD remain unchanged. Browser-only files use separate WebCrypto/IndexedDB namespaces and the real media journal; this is not native encryption acceptance. Profile changes clean owned transient native files/browser report windows before remount. Server Storage paired inventory/copy preserves private paths/lengths/hash, with actual service rehearsal pending. See RECOVERY-0.7/NATIVE-0.7; prior temp/orphan/recovery rules still apply.

---

# M1 attachment contract — defined before implementation

Synthetic data only. SQLCipher does not encrypt separate files. Durable attachments will use AES-256-GCM sealed files in the application document sandbox; random nonces, 16-byte tags, and authenticated context bind each file to its company/inspection/item/asset identity. The random file key is stored inside the already encrypted database, not in source, filenames or logs. No plaintext fallback.

Reserve a writing journal row before copying/encrypting. Write encrypted bytes to an owned .part path, read/decrypt/verify, rename to its UUID .sealed path, then commit ready metadata plus a local media operation atomically. Only then announce local save. A kill before metadata acknowledgement yields an interrupted row; a final sealed file can be explicitly recovered after integrity verification. Missing/corrupt files remain visible and block PDF generation. Do not silently discard unsynced media.

Cancellation/denial creates no attachment and leaves draft usable. Decode/re-encode one JPEG/PNG at a time to a maximum 1,600-pixel long edge; output above 1 MB fails without claiming a save. The spike is limited to twenty photos per inspection, captions 300 characters. Temporary picker/manipulator/print output is plaintext inside OS-protected private cache, not application-level encrypted. Track and delete owned copies in finally; sweep the dedicated temp folder and known Expo cache output folders on next workspace open. A kill can leave private plaintext until next launch; flash erasure cannot be guaranteed. No gallery writes. Do not use real/confidential images.

Deletion first records a deleting tombstone and operation in SQLite; only then removes sealed bytes. Restart retries pending deletions. Metadata tombstone remains. Failure never deletes another attachment. Recover interrupted assets explicitly; no automatic orphan-age purge. Unrecognised sealed files are listed for investigation, never automatically deleted.

PDF HTML embeds decrypted JPEG data in memory, escapes all text and marks the output DEMONSTRATION / DRAFT. Native print output is a transient plaintext PDF; encrypt durable copy before acknowledging generation. OS sharing is a separate explicit export warning, not secure client sharing; received copies cannot be revoked. Clear export cache after the share call returns and on next startup. Some recipient apps may require a longer-lived URI: validate both platforms; do not weaken cleanup silently. Cancellation/error triggers the same cleanup. No backend, report approval, revocable link or real client delivery is implied.

Low storage/errors: retain journal, old draft and any finished sealed bytes; show retry/recovery rather than reset. Startup classifies writing rows as interrupted and verifies ready files when requested; no automatic overwrite/reseed. File write durability and rename semantics must pass native crash tests before acceptance. Host fault injection proves protocol boundaries only.

## 0.3 retention additions

The existing AES format and recovery protocol remain. An optional action_id associates resolution evidence with a local open action after checking company/inspection/item. Original completed-inspection photographs cannot be added/deleted; corrections use new evidence. Resolved action history snapshots include evidence IDs/hashes, and those assets cannot be deleted even after the action reopens. A missing file still surfaces as unavailable; history is never silently rewritten to remove it.

Application startup attempts one media-workspace initialisation/cache sweep per provider, and routes reuse the resulting vault. Cache sweep failure does not unlock or recreate encrypted data. Unknown sealed files remain preserved; Settings surfaces the need for developer review. No arbitrary orphan files are purged. PDF recovery is offered explicitly in Reports.

Plaintext still exists briefly in OS-private capture/manipulator/print/export caches; finally/startup cleanup is best effort, not secure flash erasure. iOS backup exclusion has not been implemented or verified. Android exclusion configuration remains; real-device transfer/backup behaviour is pending. Do not use live/confidential data until these gates pass. OS share recipients can retain exported copies outside application control.


## Current 0.5 update — 21 October 2026

0.5 transfers verified JPEG bytes through authenticated private Edge access and seals incoming bytes with the receiving device key/original AAD. Import .part/final recovery and incoming deleting tombstones reuse the journal. Plaintext transfer is memory-only; existing picker/print/export transient cleanup remains. Remote orphan purge is manual pending policy; unknown local sealed files remain preserved. See 0.5 architecture/acceptance. The iOS exclusion/protection hook exists from 0.4 but OS verification is still pending.


## Current 0.6 update — 21 October 2026

0.6: seven-day renewable upload intents; 30-day orphan minimum age and 15-minute quiescence grace. Pending/conflicting references never expire automatically. Service-only local cleanup checks manifests/pending requests/shared paths and logs retries. No real Storage deletion/restore acceptance was run. Original device AES-GCM/AAD, temporary photo/PDF protection and native acceptance boundaries are unchanged. See RELEASE-0.6-RECOVERY.md.
