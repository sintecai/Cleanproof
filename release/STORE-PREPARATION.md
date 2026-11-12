# CleanProof — store preparation, not submission approval

Prepared 31 October 2026. Authoritative input: CleanProof-Customer-Background-Fix-Source(1).zip, baseline dcb1f4133dc6050c05df0b08c1a3c31274fa17ca. Every tracked input file matched this baseline. The delivery commit is recorded by Git and DELIVERY-COMMIT.txt in the archive. Ownership remains Sicy International Ltd; UNLICENSED does not grant open-source rights.

## Implemented in this increment

- Opt-in development/staging/production Expo configuration and EAS profiles. Release configuration rejects unconfirmed identifiers, absent organisation/project/icon/public configuration, demo tools and accidental production use of the known staging backend. Existing development identities and storage names remain unchanged.
- Native password-recovery redirect now derives from the configured Expo linking scheme instead of hardcoded cleanproof-demo. This is implementation, not proof of email delivery or installed deep-link handling.
- Explicit Android CAMERA permission for the existing camera feature. Release configurations exclude microphone, broad media/storage and overlay permissions; system-selected photographs should not need broad library access. Validate the assembled manifest on release builds.
- Existing saved native connection settings cannot silently override the release backend. A mismatch preserves saved work and reports an error; it does not migrate or reset it.
- Authenticated, idempotent deletion-request intake and requester-only database policy tests. This does NOT perform account erasure and is not sufficient Apple account-deletion implementation.
- Locked dependency remediation: node-forge 1.4.0 to 1.4.2. Audit findings fell from 17 to 16 (2 high, 12 moderate, 2 low). Remaining high findings are in @expo/cli and zod dependency chains. Do not use npm audit fix --force: its proposed SDK downgrades are incompatible. Review and remediate/accept outstanding advisories before release.

No accounts, passwords, remote data, device keys or existing staging deployments were changed. No migration was applied remotely. No signing certificate, store record or paid resource was created.

## Current blockers requiring implementation

Native authentication is not yet equivalent to the connected web entry. StorageBoundary native passes through while web owns customer bootstrap; native customerSession helpers include false/no-op stubs. Native onboarding has actual Supabase operations, but account switching, restoring the correct workspace and recovery lifecycle are not installed-device verified. Do not replace these gaps with synthetic login or silently reuse the legacy default database. Finish native session ownership/account-scoped workspace lifecycle with restart and cross-account tests before customer use.

The account-deletion request table is intake only. Implement a privileged, authenticated deletion workflow, company ownership transfer/last-owner handling, private attachment cleanup, retention/anonymisation rules, status/retry/audit and a public web deletion request resource. Historical foreign keys need an explicit retention design; do not blindly delete auth.users. Apple requires actual account deletion; a request receipt alone is insufficient.

PDF generation and in-app rendering exist, but prior browser save attempts timed out and no actual native exported file was opened in this task. Native Expo Print/share is not evidence of a saved file. Complete report download/export acceptance with two distinct reports, photos and pagination. Other outstanding gates: real account onboarding, multi-company RLS, interrupted offline sync, paired backup/restore and secure report sharing. Staff invitations/manager role, billing and secure client links must not be advertised as complete where absent.

## Test evidence

| Check | Result | Limit |
|---|---|---|
| Source ZIP integrity and tracked baseline comparison | Passed | Not a device or service test |
| TypeScript + application tests | Passed: 132, one existing SQLCipher-driver skip | Automated source tests |
| Backend fixture tests | Passed: 26 | PGlite policy/transaction fixtures; not hosted Auth/Storage |
| Release configuration tests | Passed: 3 | Negative safety cases, no owner production configuration |
| Expo native prebuild Android/iOS | Passed | Development config generation, not native compilation |
| Android/iOS JS/Hermes export | Passed | Not AAB/IPA, installation or device acceptance |
| Connected web production build | Passed | No authenticated UI walkthrough this task |
| Dependency audit | Failed release gate | 16 findings remain |
| Hosted registration/login/recovery | Blocked | No secure test-account/mailbox walkthrough completed |
| Installed Android/iPhone | Blocked | No devices/SDK/Xcode/signing access |
| AAB/IPA and console uploads | Blocked | No binaries generated or uploaded |
| Account erasure / paired restore / PDF save-open | Not passed | Implementation or acceptance incomplete |

Run npm ci, npm run check, npm ci --prefix backend, npm run test:backend, npm run test:release-config, npm run secrets:check, npm run build. npm run release:status intentionally exits nonzero until every recorded acceptance gate passes. See acceptance.json. Native export: npx expo export --platform android --output-dir artifacts/android-js and equivalent ios. Use Node 24 per package engines. A build is not release approval.

## Official requirements reviewed

- Android new apps/updates: Android 16/API 36 minimum from 31 August 2026: https://developer.android.com/google/play/requirements/target-sdk
- Native 64-bit libraries must meet 16 KB page-size requirements: https://developer.android.com/guide/practices/page-sizes . Generated dependencies use target36/compile37, but inspect the final AAB and run a 16KB emulator/device; config alone does not prove compatibility.
- Apple uploads require Xcode 26/iOS 26 SDK since 28 April 2026: https://developer.apple.com/news/upcoming-requirements/ . A deployment target of iOS16.4 is separate from the build SDK.
- Expo store builds/signing: https://docs.expo.dev/deploy/build-project/ and https://docs.expo.dev/deploy/submit-to-app-stores/
- Apple privacy/required reasons: https://docs.expo.dev/guides/apple-privacy/ . Inspect the assembled archive and each SDK manifest; do not invent required-reason declarations.
- Account deletion: https://support.google.com/googleplay/android-developer/answer/13327111 and https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Payment/review rules: https://support.google.com/googleplay/android-developer/answer/9858738 and https://developer.apple.com/app-store/review/guidelines/
- Encryption classification: https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/ . SQLCipher/device encryption is more than HTTPS alone. Configuration conservatively declares non-exempt encryption pending owner/legal determination and applicable documentation.

## Release recommendation

Development/staging preparation only. Do not publish or admit real customers until the failed and blocked gates pass. Original browser device-only work remains unbacked-up; do not update its origin, migrate its database or rotate/delete its keys. No cost incurred in this preparation. Existing account fees, EAS quotas/build costs, hosting, backend, SMTP and backup costs require actual organisation plan inspection before any external action; no new charge approved.
