# Native mobile increment

The shared React Native page shell hides the mobile navigation while the native keyboard is visible and enables iOS keyboard insets. Inspection response controls use flexible widths to fit narrow screens. Existing domain, storage and account APIs are unchanged. The connected web customer entry and prior report/PDF fixes are retained.

Checks on this revision: TypeScript and host tests passed, five email-entry checks passed, and connected web export succeeded. No screen was verified on an Android or iOS device. This environment has Java but no discoverable Android SDK, adb, emulator, Xcode or iOS simulator; no APK or iOS binary was compiled in this increment. Native code has a separate account/onboarding path; parity with the web authentication, especially recovery links and expiry, requires actual device and service verification. Native SQLCipher, attachment encryption, PDF/share, upgrade, backup exclusion and offline access remain pending. The synthetic browser preview is not proof of native behaviour.

Existing IDs, build configuration and data are preserved. Current package identifiers and URI scheme include demo; camera permission strings refer to synthetic testing. These require review before store release and must not be changed casually for upgrades. Device testing should use an existing authorised signing configuration and synthetic data; do not uninstall or clear existing data.

The original browser's device-only data and encryption key are not backed up. Do not update the connected staging origin until a protected, restorable backup of that original profile is established. No staging deployment was made.

For development use the locked dependencies: npm ci; npm run check; npm run start. Android requires an installed Android SDK and adb, and can then use npm run android. iOS requires a Mac with Xcode and can use npm run ios. These commands have not been executed as native builds here. Publishing requires separate native acceptance and signing; no store upload is authorised or performed.
