# APK execution follow-up — 23 October 2026

Start with [APK-EXECUTION-GUIDE](APK-EXECUTION-GUIDE.md) and [current acceptance matrix](APK-EXECUTION-ACCEPTANCE.md). The original APK is unchanged and independently inspected; no native install/execution or actual Supabase service acceptance has occurred. Use the guarded Node handoff to compare certificates and installed APK bytes before upgrade/launch. Fresh checks: 65 host + 20 backend fixture tests; five phone-tool guard fixtures. No runtime app defect was reproduced; £0 spent. Historical 0.7 records follow separately.

---

# CleanProof 0.7 — native build and acceptance evidence

22 October 2026 · Sicy International Ltd · synthetic internal development only.

## Observed Android compilation

A real **Android ARM64 Release APK** was compiled from code commit `a2880dd7b1201fe9b65044069140e32db08411ae`. Gradle completed `:app:assembleRelease`: **BUILD SUCCESSFUL in 14m 25s, 826 tasks**. This is an embedded-bundle binary, not prebuild output, a Metro-only dev client, HTML reconstruction or proof of execution. APK ZIP integrity, embedded `assets/index.android.bundle`, ARM64 native libraries, package metadata and signature verification passed.

- File: `CleanProof-0.7-Android-arm64.apk`
- SHA-256: `715a5c7039069f21214f9eaea74adfb7dd385470c6f9f5c2a163c1e2cb405031`
- Bytes: 36797996
- Application ID: `com.sicyinternational.cleanproof.demo`; versionName 0.7.0 / versionCode 1.
- Min API 24 / target API 36 / compile API 37.
- Development signing certificate SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.
- SQLCipher enabled in generated native configuration; **runtime encryption is not yet verified**.
- Demo tools enabled explicitly; no backend key/credential is bundled. Configure the local public URL/key in the app.

The generated signing setup uses a development/debug certificate. Its private key is not delivered. Do not treat this binary as production-signed or proof of compatibility with an existing Sicy installation. Never uninstall an existing valuable app to resolve signature mismatch. Use a separate synthetic test phone or the original authorised signing setup.

## Actual tooling and failed execution boundary

Initial environment had only a Java 17 runtime, no javac, Android SDK/adb/NDK, Docker/Podman, Xcode or devices. Installed free scratch-only Temurin JDK 17, Gradle 9.4.1, Android SDK platform 37.0, Build Tools 36.0.0/37.0.0, NDK 27.1.12297006 and CMake 3.22.1. Build ran with one Gradle/CMake worker and in-process Kotlin to fit container memory. An official Maven artifact was cached locally after a proxy HTTP 403; its dependency version was not changed. SDK/network/resource failures were resolved before the successful build. No downloaded toolchain/cache/signing key is included in source.

Also installed the official Android emulator and API 35 Google APIs x86_64 image; attempted software/no-acceleration launch. The emulator exited with: **x86_64 emulation currently requires hardware acceleration; KVM requires a CPU that supports vmx or svm**. This container has no /dev/kvm/exposed virtualisation. No Android install, launch or actual screen/device acceptance occurred. There is no Mac/Xcode/iPhone, so iOS compilation and runtime remain unperformed.

## Reproduce on Windows/Android

Use START-0.7 for installation and public runtime connection settings. For a source rebuild:

```powershell
npm ci
$env:EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS = '1'
npx expo prebuild --no-install
# SDK and full JDK 17 installed; existing authorised signing for upgrade tests.
cd android
.\gradlew.bat :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=1
cd ..
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

For an x86_64 emulator rebuild with `-PreactNativeArchitectures=x86_64` instead, on a machine with supported acceleration. Do not install the delivered ARM64-only binary on an unsupported ABI. The APK embeds JavaScript: stop Metro and disable network before force-stop/relaunch acceptance. Use `adb reverse tcp:54321 tcp:54321` for a USB phone's local backend; emulator URL is http://10.0.2.2:54321. No global production cleartext exception is enabled.

## Required evidence on existing equipment

Run N01–N10 in RELEASE-0.6-ACCEPTANCE.md plus R01–R03/B01–B02/C01 in ACCEPTANCE-0.7.md. Record device/model/OS, source commit, build mode/signature/binary hash, test steps, observed result and sanitised evidence. Cover upgrade without data loss, SQLCipher/key loss fail-closed, camera/orientation/recovery, offline embedded cold launch, interrupted saves/uploads, low storage, background privacy/lease expiry, native PDF pagination/share, iOS backup exclusion/restore and two independent native clients with actual services. No host, browser, build or emulator configuration substitutes for these outcomes.

An emulated device can verify actual native execution if available, but cannot by itself establish hardware-backed key protection, physical camera behaviour or all OS backup/restore boundaries. All unperformed physical checks remain pending.
