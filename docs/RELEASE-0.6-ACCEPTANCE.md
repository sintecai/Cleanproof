# CleanProof 0.6 — acceptance matrix and evidence capture

21 October 2026 · Sicy International Ltd · synthetic data only.

**Decision: acceptance incomplete. Do not describe this as pilot-ready or an accepted internal-trial release.** Code tested at **055d1d1**. Historical 0.5 results are retained separately; fresh baseline and current logs are in evidence/0.6. Final documentation-only delivery commit is a descendant of that code commit.

| Gate | Status | Actual evidence / required next action |
|---|---|---|
| Supplied history and baseline | Passed | ZIP restored at 7119898; new baseline 58 host / 14 backend tests, configured host SQLCipher |
| TypeScript and host reliability/domain checks | Passed | 63/63, zero skipped; 055d1d1-checks.txt |
| PostgreSQL RLS/RPC/maintenance and host workflow | Passed | 18/18; embedded PostgreSQL plus synthetic Auth claims/object doubles; not Supabase services |
| Bounded transfer, raw queues and durable adoption review | Passed on host | 40 aggregate/100 operation bounds, changed review rejection, failure rollback, close/reopen resumption; no native low-storage proof |
| Scope quarantine and explicit restored-access review | Passed on host | Wrong/reduced scope stays locked; changed review rejected; fresh fully covering permissions recover without resetting saved work |
| Reduced-scope selective authorised working | Incomplete | Whole workspace remains locked until access is restored; isolated subset workspace is not implemented |
| Full Supabase Auth/REST/Storage/Edge integration | Blocked / not run | No Docker/Podman; run test:full-stack on development machine |
| Signed expired JWT / refresh revocation / captured mailbox reset | Blocked / not run | test:auth-live prepared and syntax checked; real Auth/Mailpit unavailable |
| Maintenance retention and authorisation guards | Passed at SQL level | Protected references, pending proposals, cross-company boundary, expiry, grace and retry tests |
| Actual Storage cleanup, interrupted delete and orphan recheck | Not run | No Storage service; dry-run/freeze/execute tool supplied. No real object deletion performed |
| Synthetic encrypted backup envelope/embedded restore | Passed | Snapshot and paired JPEG restored, RLS retained, tampering/wrong passphrase refused |
| Actual Supabase paired backup/restore | Not run | Docker/object copy and isolated restore rehearsal required; automated Storage backup adapter is incomplete |
| Android/iOS native configuration generation | Passed | c918ca0-prebuild.txt; configuration only |
| Android/iOS Hermes bundle export | Passed | 055d1d1-export.txt + bundle metadata; not native compilation/execution |
| Deno photo Edge type check | Passed | c918ca0-edge.txt; no service execution |
| APK/IPA compilation, installation and physical acceptance | Blocked / not run | No SDK, Xcode, adb, simulator or devices |
| Dependency release gate | Failed / open | Fresh audit 27 affected entries, 19 high / 8 moderate; backend audit zero. Unpatched upstream findings remain |
| Source archive/history integrity | Passed at packaging | Complete bundle verifies; original ancestry retained; no keys, DB, signing files, .env or node_modules |

A passed guard for reduced permissions is not completion of the requested reduced-scope recovery workflow. A passed host backup experiment is not Supabase/device restore acceptance. Unavailable checks are not described as passed.

## Required real-service evidence

Use RELEASE-0.6-SETUP commands. Record source commit, CLI version, Docker/OS versions, container image IDs, migration list and test start/end. Save only sanitised test outputs. Never save status output containing keys, Auth responses, mailbox recovery codes or private headers. Run both `test:full-stack` and `test:auth-live`; a named step failure must be reproduced/fixed against the real service, not substituted by embedded fixtures. Also rehearse maintenance and paired backup/restore. An asymmetric local JWT configuration needs a matching signing/expiry test; do not bypass token checks to make it pass.

## Native evidence row — complete one per case/device

| Field | Record |
|---|---|
| Case ID | e.g. N01-A |
| Source commit | Full git rev-parse HEAD |
| Device and OS | Model, OS version; synthetic device alias |
| Platform/build | Android/iOS; debug/development/Release; installed binary SHA-256 |
| Upgrade source | Old app version/commit; same app ID/signing identity |
| Network/session | Offline/LAN, lease and membership state |
| Steps and observed outcome | Actual observations, not expected outcomes copied as results |
| Evidence | Sanitised log/photo/video path, time and tester |
| Verdict | Passed / failed / blocked / not run; defect reference |

## Native cases still unperformed

- **N01 Upgrade and encryption:** install over 0.5 with acknowledged draft, queued saves, completed snapshot, action history and sealed photos. Verify all remain. Exercise correct/wrong/missing device key with protected synthetic fixtures; no plaintext fallback or replacement key. Inspect native SQLCipher rather than a browser/host claim.
- **N02 Offline cold launch:** embedded Release bundle, stop Metro, disable network, force-stop and relaunch. Verify original saved bytes, photo decrypt and histories. Development-client reliance on Metro is a failure for this case.
- **N03 Camera/attachments:** denied/limited/cancelled permission, new capture and gallery, EXIF/rotation, interrupted .part/rename/journal phases, missing/corrupt file, low-storage and recovery. Preserve acknowledged evidence and show failed saves honestly.
- **N04 Save/transport interruption:** force-stop before/after each local acknowledgement, upload reply and server receipt. Resume same batch IDs; no duplicate business change or false Synced label. Check original outbox/events unchanged.
- **N05 Access:** background and app-switcher privacy, OS unlock, sign-out, expiry, observed clock rollback, network error, fresh reduced assignments, removed member and reinstatement. Known quarantine blocks opening/export/upload. Lease never extends offline. Capture app-switcher frames using synthetic data only; native snapshot protection remains unverified.
- **N06 Two native identities/devices:** company/customer/site/template, offline inspection with photo, failed-item explanation/action/resolution, completion, restart, reconnect, second authorised client receives exact snapshot/photo and generates report. Concurrent draft/action edits lead to reviewable conflicts, not silent overwrites.
- **N07 Server denial:** other company, unassigned inspector, expired/revoked membership and direct private object access attempts; verify real responses. Signed-out access JWT may remain cryptographically valid until expiry; membership enforcement must still deny revoked data.
- **N08 iOS backups/restore:** inspect NSFileProtection and backup exclusions on actual SQLCipher DB/WAL/SHM, evidence, transient directories; attempt relevant encrypted OS backup/restore without exporting device-only keys. Missing key must preserve files and lock, not reset. Android backup also remains disabled.
- **N09 PDF/share:** long text/site names, A4 pagination, portrait/rotated/missing photos, embedded captions, all-N/A/draft labels, PDF generation, private transient cleanup, native share and cancellation. Export is local, not secure/revocable client access.
- **N10 Maintenance and storage pressure:** low-space during adoption page, mapping commit, incoming projection, photo import and PDF write. Restart/retry preserves prior acknowledgements. Exercise freeze/retry and confirm no false successful transfer.

After a failure, preserve logs/data, rank impact, fix minimally and rerun affected gates on the changed commit. Do not reset the database to conceal a migration/recovery defect. Only once integration, access/recovery, dependency and native prerequisites pass should management consider an internal trial. Secure report issuance/access is the next milestone; no MFA/report-finalisation expansion was started.
