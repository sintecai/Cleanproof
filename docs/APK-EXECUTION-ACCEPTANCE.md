# CleanProof — APK execution acceptance, 23 October 2026

Sicy International Ltd · synthetic data only · expenditure **£0**.

**Synthetic internal-trial acceptance: NOT ACCEPTED. Real customer-data readiness: NOT READY.** Device, actual Supabase, recovery and release-security gates remain open. The unchanged APK is available for supervised synthetic acceptance testing; it is not a fully verified release.

## Exact build newly inspected

| Property | Observed value |
|---|---|
| Compiled application source | a2880dd7b1201fe9b65044069140e32db08411ae |
| Delivered source baseline restored | 2413a0a568520a904b81f2f82adffe64f86ee865; full original bundle/history preserved |
| New handoff tooling code | d49fb204beaa6d41594416f848f1e7ac8521fe44; application/runtime code not changed |
| APK SHA-256 | 715a5c7039069f21214f9eaea74adfb7dd385470c6f9f5c2a163c1e2cb405031 |
| Bytes | 36,797,996 |
| App ID / version | com.sicyinternational.cleanproof.demo / 0.7.0, versionCode 1 |
| Android | minimum API 24 / target API 36 / compile API 37 |
| Supported ABI | arm64-v8a only |
| Certificate SHA-256 | fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c — development/debug certificate |
| Embedded JavaScript | assets/index.android.bundle, 2,635,644 bytes, Hermes bytecode 99 |
| Native SQLCipher | lib/arm64-v8a/libexpo-sqlite.so; sqlite3_key, sqlcipher and cipher_version markers present |
| Backend | No configured public key, service key or JWT found. Public 127.0.0.1:54321 connection-screen hint/default and validator prefix are not an authenticated configured backend |

The APK v2 RSA-SHA256 signature and AOSP chunked content digest were independently verified with cryptography. Its hash matches the previous official apksigner-verified artifact. ZIP CRC and binary manifest were checked. `allowBackup=false`; native runtime/key/backup behaviour still needs actual device evidence. All APK members were scanned for private-key material, secret API key formats, AWS/Google key patterns, JWTs and private keystore filenames; no matching credentials found. The locked Hermes compiler decoded the actual bundle, allowing real string boundaries to distinguish a validator prefix from a configured key. Pattern/static inspection is not proof that every possible secret format is absent.

## Newly observed results versus historical evidence

| Check | Status | Evidence / limitation |
|---|---|---|
| APK identity, embedded bundle/native cipher, certificate/content integrity | Passed | evidence/2026-10-23/apk-inspection.json and reproducible scripts/inspect-delivered-apk.py |
| Static credential/config inspection | Passed within stated scope | No matching secret/JWT/keystore material; source configuration and actual Hermes strings reviewed. Not a runtime credential assessment |
| Source ancestry/history | Passed | Restored complete bundle at 2413a0a; descendants preserve originals; delivery bundle independently verified/cloned |
| TypeScript + original host suite | Passed | Fresh 65/65, zero skipped, configured external host SQLCipher. Not native SQLCipher acceptance |
| Backend/plugin fixture suite | Passed | Fresh 20/20, zero skipped; embedded PostgreSQL/object doubles, not actual Supabase |
| First host configuration attempt | Failed/cancelled, corrected | 64 passed + 1 timeout from wrong host driver directory. Corrected PYTHONPATH to cp001-test-tools/python; full suite rerun passed. Initial log retained |
| Phone-handoff guard tests | Passed | 5/5 explicit command fixtures; hash/cert/ABI/device/retained-data safety, partial acknowledgement and exact installed bytes. Not actual adb/apksigner/device execution |
| Existing same-project browser walkthrough | Not run this phase | Previous 22 October evidence remains historical; not used to pass native gates |
| Connected physical Android / supported emulator | Blocked | No exposed USB bus, adb/emulator or KVM. Known blocked attempt not repeated |
| Native installation, visible startup and upgrade | Blocked | Must collect actual phone output before passing; no signature comparison against a real installed app yet |
| Native encryption/keys/offline/background/camera/PDF/UI N01–N10 | Not run | Needs authorised devices and appropriate disposable fixtures |
| Actual Supabase Auth/REST/Storage/Edge, live auth/reset | Blocked | No Docker/Podman daemon/tools. Prepared actual-service tests not invoked with absent credentials or relabelled as passes |
| Two actual client sync/denial/recovery | Blocked | Needs real services and independently authenticated devices/clients |
| Actual paired DB/object restore and Storage cleanup | Blocked | No actual Storage stack. Contract/envelope fixtures remain supporting evidence only |
| Dependency release gate | Failed/open | Root audit 22 affected entries: 19 high, 3 moderate; backend audit zero. Official advisories still show no patched braces/node-forge release |
| iOS build/device acceptance | Blocked | Linux environment, no Mac/Xcode/simulator/authorised iPhone |

## What changed and what did not

Implemented a Node-only guarded Windows/Android handoff: fixed hash/signature preflight, explicit device selection, ABI/API check, installed-code certificate comparison, retained-install refusal, opt-in `install -r`, post-install APK hash/certificate readback and separate installer/process/manual outcomes. Older same-signed code cannot be labelled as this build. Partial successful installation evidence survives a later launch failure. Optional process-only logs have heuristic redaction and require private review before sharing. No database/key/app-data deletion or forced downgrade exists in the tool.

Corrected the stale `.env.example` LAN advice: this delivered synthetic APK permits narrow loopback/emulator HTTP; a USB phone uses adb reverse and then 127.0.0.1. No global cleartext change. Updated installation guidance so certificate preflight supersedes the old blind upgrade commands.

No Android runtime defect was reproduced because no device is exposed. No application/auth/encryption/migration/workflow rewrite, APK rebuild, signing replacement, reset, new feature, paid service or publication occurred. The original APK and compiled source commit remain unchanged. New source commits add tooling/evidence/docs only.

## Ranked remaining issues and precise next actions

1. **Critical — native execution unknown.** Follow APK-EXECUTION-GUIDE steps 1–2 on your passcode-protected phone. Return preflight/install-launch JSON and the actual first-screen/error observation. Do not bypass a signature/hash/retained-data failure. Then complete N01–N10, including native cipher, cold launch, acknowledged restart persistence, permissions, PDF/share and accessibility.
2. **Critical — real service enforcement unknown.** Run the existing local Docker stack, forward migrations, Edge handler, seed:demo, test:full-stack and test:auth-live. Use USB forwarding; keep admin ports/credentials private. Verify actual sign-in/refresh/recovery, site/company denial, two-client queues/photos/conflicts and reduced-scope isolated recovery.
3. **High — operational recovery unaccepted.** Rehearse B01/B02 paired pg_dump + object restore on a different empty disposable stack, verify hashes/auth/membership/RLS/immutable snapshots/report regeneration, then C01 guarded real orphan cleanup/retries. Whole restore after a committed DB stage/object failure remains non-resumable as documented; never reset valuable source data.
4. **High — dependency gate open.** Current official GitHub advisories and npm metadata checked 23 October: braces latest 3.0.3 / node-forge latest 1.4.0; no published patched versions listed. Observed paths include Metro/micromatch and Expo code-signing tools. Keep tool inputs trusted and testing synthetic/private; this is not a blanket runtime exemption. Do not force unsupported downgrades, suppress audits or weaken cipher/auth. Compatible upstream resolution/exposure acceptance remains a release decision.
5. **High — iOS unverified.** Existing authorised Mac/iPhone must run independent iOS build/key/backup/camera/PDF/offline/sync gates. Android cannot pass them.
6. **Medium — retained storage and explicit limits.** Quarantined/unsent/unresolved review work stays retained; no automatic purge. Existing 7 MB indivisible aggregate, 64 MiB snapshot and failed partial restore/profile limitations remain. Do not truncate histories or clear queues.

See APK-EXECUTION-GUIDE for minimal phone commands, real backend/address setup, walkthrough, sanitised-log handling, evidence template and exact Mac/iPhone commands. Existing RECOVERY-0.7 remains the paired restore/cleanup runbook. No new SQL migration or backend selection occurred.

## Official references rechecked 23 October

- https://source.android.com/docs/security/features/apksigning/v2
- https://developer.android.com/tools/adb
- https://developer.android.com/develop/ui/views/layout/webapps/access-local-server
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-86w9-cpqp-85rv

Actual incremental cash: **£0**. A local synthetic trial can still use existing phones/computers/Docker with no new service fee, excluding staff time, electricity and storage. It is not accepted until its gates pass. No real invitations, customer data, hosting or paid account was used.
