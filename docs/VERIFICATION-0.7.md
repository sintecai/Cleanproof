# APK execution follow-up — 23 October 2026

Start with [APK-EXECUTION-GUIDE](APK-EXECUTION-GUIDE.md) and [current acceptance matrix](APK-EXECUTION-ACCEPTANCE.md). The original APK is unchanged and independently inspected; no native install/execution or actual Supabase service acceptance has occurred. Use the guarded Node handoff to compare certificates and installed APK bytes before upgrade/launch. Fresh checks: 65 host + 20 backend fixture tests; five phone-tool guard fixtures. No runtime app defect was reproduced; £0 spent. Historical 0.7 records follow separately.

---

# CleanProof 0.7 — observed verification

Sicy International Ltd · 22 October 2026 · synthetic data only.

## Source and baseline

Read the supplied 0.6 source ZIP (history through **083b432**) and current Setup/Acceptance/Recovery/Verification, README/NEXT-TASK, architecture/migrations and attachment lifecycle. Restored its full bundle and preserved original CP001/M1/CP002/0.4–0.6 ancestry. No market research/backend selection restart or web-only replacement.

Fresh locked installation: offline npm cache initially lacked one archive, so installed the same lockfile online. New baseline observation: **63 host and 18 backend tests passed**, with configured host SQLCipher. These are separate from the historical 0.6 report.

## Implemented

- An actual Expo Router browser target using the existing app screens, repositories, workflow/sync/auth services, immutable snapshots and report builder. Browser-only adapters provide encrypted SQLite snapshots/IndexedDB files, chooser/compression, confirmations and browser report printing. Native SQLCipher, SecureStore, camera/PDF/share implementations remain native. The old HTML reconstruction is not the working preview deliverable.
- Separate development-only full synthetic workspace creation, preserving the active store. Both native and browser support isolated profiles; the local fixture includes customers/sites/templates, two drafts plus a completed inspection, comments, JPEGs and open/resolved actions/history. Real-account/backend seeding is a separate loopback-only command requiring actual services; no fake account/sync success is displayed.
- Reduced-site authorised workspaces: fresh scope → new independent empty encrypted store → permitted server projections/photo re-encryption → fresh scope recheck → audit → activation. Source quarantine, raw queues, snapshots and keys stay intact. Normal navigation/search/report/media repositories cannot query the old database. Host scope/projection tests pass; physical cache/export/backup/privacy acceptance remains pending.
- Runtime native public backend configuration, bound-origin protection, and an Android development-only HTTP exception for exact loopback/emulator hosts. No global cleartext policy or service key in mobile config. Browser photo CORS is restricted to explicit localhost/127.0.0.1 ports 8081/8082 and does not bypass bearer/membership checks.
- Real Storage REST inventory/copy/readback and paired pg_dump/pg_restore operator tooling with guarded local/disposable targets, paths/lengths/SHA-256/version metadata. Contract tests pass; actual service capture/restore was not executed.
- Explicit tested 7 MB source limit and retention/recovery policy. No automatic deletion of unresolved work. No secure client reports, MFA expansion, billing, paid services or publication.

## Newly observed checks

At the tested code commit recorded in evidence/0.7/source.json:

- TypeScript pass; **65/65 host tests, zero skips**, using sqlcipher3-binary 0.6.0 externally. Native encryption is not inferred from this host test.
- **20/20 backend/plugin tests**: actual embedded PostgreSQL RLS/RPC/transactions plus synthetic Auth/object fixtures and a named Storage contract fixture. Includes original two-host-client/photo/action/completion/report/retry workflow, new restricted-site recovery with preserved unsent work and storage path/hash/changed-inventory boundaries. This is not actual Supabase Auth/Storage execution.
- Backend tests now run serially to avoid resource contention with native build work. A concurrent early run lost a worker while the large Gradle daemon disappeared; rerun serially passed. No assertion was suppressed.
- Actual browser execution used free Chromium for Testing **134.0.6998.35** with the available Playwright client. The default Playwright browser download failed, and a current Chrome binary could not launch in this container; the stated tested browser/version is deliberate, not a claim of testing every current desktop/mobile browser. The application exported successfully and the browser walkthrough passed customer save, completion/history, report rendering with embedded JPEGs and encrypted reload persistence with no page errors. An initial test selected an old hidden navigation button during a transition; fixed the test to await the target route/exact button, not force-click hidden controls.
- Deno type check of the actual updated photo handler passed; CORS unit guard passes. No Edge service execution occurred.
- Actual native build attempts and their final result are described in NATIVE-0.7.md. Prebuild/bundles alone are never called native compilation or execution. Physical Android/iPhone acceptance is unperformed.
- Fresh root audit: **22 affected entries, 19 high / 3 moderate**; backend audit zero. Browser dependencies are pinned free packages. npm resolved compatible transitive changes; no forced unsupported downgrade, audit suppression or cipher weakening. The remaining braces 3.0.3 / node-forge 1.4.0 findings are still listed as unpatched in current official advisories. Build/development exposure remains a release decision, not an assertion that every runtime path is safe.
- Extracted the compiled browser delivery ZIP and started it using Node alone; the actual application unlocked and opened Home without page errors. APK signature verification passed (v2, one development signer). Complete source history/ancestry and archive integrity checked for delivery. Source excludes node_modules, generated build trees, runtime DB/session material, signing keys and private settings. Downloaded SDK/JDK/browser tools and private operator data are not distributed in source. Third-party notices accompany the browser assets.

## Evidence and limits

Raw sanitised logs in docs/evidence/0.7 identify the tested commit, browser and native toolchain results. Source deliverable may add documentation-only commits after code testing. Existing 0.6 evidence remains historical.

No Docker/Podman daemon/socket or Mac/Xcode/physical devices were present. `test:full-stack`, `test:auth-live`, actual local seed, actual Storage cleanup and paired second-stack restore are **not run**, not passed via mocks/syntax checks/missing credentials. The new adapters make those commands executable on the development machine; they do not fabricate service evidence.

Remaining limitations: whole paired restore does not automatically resume after a committed DB phase followed by object failure; use a new disposable target after investigation. Unknown/pending/conflict media, partial isolated receive stores and review snapshots remain retained. No portable device key escrow/backup. Native profile cache/backup/privacy behaviour still needs OS acceptance. No real-data pilot readiness claim.

## Expenditure and next steps

Actual incremental cash expenditure: **£0**. Used free local tools and existing project dependencies; no paid API/service/account, public deployment, store publication, billing or real invitation. Source/design/data/assets stay controlled by Sicy International Ltd, with third-party licence notices retained.

Local synthetic trial service cost can remain £0 on existing hardware, excluding existing staff time/electricity/disk. No new hosted service is needed for this acceptance. Existing optional hosted-cost assumptions remain planning estimates, not a new spend approval. Measure retained media/audit/profile/backup sizes before selecting hosting or retention. Start with START-0.7, then complete the actual-service and N01–N10/native-isolation/restore gates before secure report issuance/access.

Official references checked 22 October 2026:
- https://docs.expo.dev/versions/v58.0.0/
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-86w9-cpqp-85rv
