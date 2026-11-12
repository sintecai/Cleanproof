# Verification record — 20 October 2026

Scope: CP001 local synthetic inspection only. Incremental cash spent: £0. No remote repository, account, production backend or publication was created. No other application was modified.

## Completed in the development environment

- Node 24.19.0, npm 11.9, Expo SDK 58.0.16, React Native 0.88.0, TypeScript 6.0.3.
- `npm run typecheck`: passed.
- `CP001_SQLCIPHER_PYTHONPATH=<host-driver-directory> npm test`: **18 passed, 0 failed, 0 skipped**. Host driver sqlcipher3-binary 0.6.0 was installed outside the source project, at no cash cost.
- Draft validation/review; Unicode/quotes; incomplete drafts; Fail/N/A notes; all-N/A handling; save acknowledgement ordering; newer-edit preservation; failure/retry; atomic outbox rollback; stale-revision rejection; exact restart persistence; future-schema refusal; missing-key and keychain-failure safety; plaintext-driver rejection all passed.
- Forced process termination after acknowledgement preserved a draft and outbox. Termination before commit retained the previous complete transaction.
- Real host SQLCipher writer was killed; reopening with the correct key recovered the saved draft and outbox. The file did not have a plaintext SQLite header or the synthetic note marker; wrong key failed. This is host encryption/recovery evidence, not evidence about a phone binary.
- Android and iOS Metro/Hermes JavaScript exports succeeded (about 2.7 MB per compiled entry bundle). Export artifacts are reproducible and excluded from source delivery.
- Expo native prebuild succeeded without installing native build dependencies. Generated Android and iOS settings enable SQLCipher. Generated Android manifest sets allowBackup=false and secure-storage backup rules.
- SDK dependency compatibility check against the installed offline matrix reported up to date; it explicitly warns that offline validation is less reliable than a current remote check.

## Pending before CP001 acceptance

No Android SDK/emulator, adb, Xcode or iOS simulator was available. No APK/IPA was compiled, installed or executed. UI layout, actual native SQLCipher availability, OS keychain/keystore behaviour, native filesystem semantics, device lock handling and offline cold launch must pass docs/NATIVE-ACCEPTANCE.md on Android and iOS. No claim of app-store readiness or complete offline/cloud sync is made.

Native prebuild confirms generated settings, not native compilation. Source includes the SQLCipher runtime guard so a build without encryption cannot silently fall back to plaintext. No data recovery guarantee applies to uninstall, cleared storage, lost encryption keys or physical device loss; CP001 has no backup service.

The ordinary `npm test` run skips the optional real-SQLCipher test unless its host driver is configured. The other tests use Node's SQLite driver behind the repository abstraction; they do not bypass the app's native encryption gate.

## Dependency audit — unresolved release blocker

`npm audit --omit=dev --audit-level=high` returned exit 1: 26 affected dependency entries (7 moderate, 19 high), tracing primarily to three advisory roots:

- braces: deeply nested pattern stack-exhaustion denial of service (GHSA-vfj7-8cjw-p6xm).
- node-forge: RSA PKCS#1 v1.5 signature verification parsing (GHSA-86w9-cpqp-85rv).
- uuid <11.1.1: caller-supplied buffer bounds checks for v3/v5/v6 (GHSA-w5hq-g745-h8pq).

These paths include Expo/Metro and Xcode configuration/build tooling. npm's omission of dev dependencies does not mean each advisory executes in the native application's runtime: Expo packages include build tooling in their dependency tree. This run has not proven all affected paths unreachable, and the audit is not clean. The app uses expo-crypto.randomUUID rather than the affected uuid package API.

The reported automatic fix proposes downgrading Expo 58 to Expo 44.0.6. It was not applied because that would invalidate this supported SDK configuration. Do not suppress findings or use force/legacy-peer-deps to claim a clean build. Track upstream fixes, assess reachability, update within a supported SDK set and rerun typecheck, tests, native builds and audit before any real-data pilot/release. During this local synthetic slice, only trusted project inputs should enter the build tools; do not expose Metro publicly or enable updates/signing workflows to work around the findings. This is a documented unresolved dependency risk, not production security acceptance.

## Continuation notice

The results above are the original 20 October record. Newly observed baseline and continuation results are kept separately in VERIFICATION-2026-10-21.md; do not treat historic native-generation results as phone execution.
