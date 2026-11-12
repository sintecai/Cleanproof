# CleanProof — minimum Android execution handoff

Sicy International Ltd · 23 October 2026 · synthetic test devices/data only.

**The APK is inspected, not installed or executed here.** No USB device interface, adb/emulator, Docker/Podman or Mac/Xcode is exposed. The known KVM-blocked emulator attempt was not repeated. We need your phone's actual command output and observed screens before passing native startup. Do not use real client data.

## 1. Connect the phone and verify before installing

Use an authorised ARM64 Android 7/API 24+ test phone. Enable a PIN/password/device lock, Developer options → USB debugging, connect a data-capable USB cable, unlock it and approve this computer's debugging prompt. Never remove an existing app or clear its storage to get past an installation problem.

On Windows use Node 24, Java 17+, free Android platform-tools and the Android SDK Build Tools apksigner JAR. These may already be installed with Android Studio. No build, paid account or npm installation is required for this handoff. If Android Studio supplies Java, its `jbr\bin\java.exe` can be passed with `--java`. Download Android tools only from https://developer.android.com/tools/releases/platform-tools and the SDK Manager.

Extract the supplied **CleanProof-Android-Handoff.zip**, put the unchanged APK beside its scripts, open PowerShell in that extracted folder:

```powershell
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
$Signer = "$env:LOCALAPPDATA\Android\Sdk\build-tools\37.0.0\lib\apksigner.jar"
adb devices
node android-device-handoff.mjs --apk .\CleanProof-0.7-Android-arm64.apk --apksigner $Signer --out .\android-preflight.json
```

Use the installed Build Tools version's actual JAR path if different. In the source checkout the tool is `scripts/android-device-handoff.mjs`. Run with `--serial YOUR_SERIAL` only if more than one authorised device is attached; serial is used locally but omitted from the evidence summary. Do not send the raw `adb devices` list with a unique serial if the summary suffices.

Preflight checks the fixed APK hash/signature, device ABI/API, and any existing package. It pulls **only the installed base APK code** into a temporary folder to compare certificates, then removes that local code copy. It does not read/delete databases, keys, photographs or queues. An inaccessible/retained installation, signature mismatch, unknown signer, failed tool or unsupported ABI stops installation. Multiple signers/rotation are deliberately blocked pending manual authorised review. Do not bypass the guard.

If preflight succeeds and this is a passcode-protected synthetic test device:

```powershell
node android-device-handoff.mjs --apk .\CleanProof-0.7-Android-arm64.apk --apksigner $Signer --out .\android-install-launch.json --install --launch --synthetic-test-device
```

Each `--out` file must be new; the tool refuses to overwrite evidence. It uses `adb install -r` only after certificate checks. An installer `Success`, an Activity Manager response, a live process and visible working UI are recorded separately. It cannot automatically establish encryption, device-lock protection or workflow acceptance. A launch failure preserves an earlier installer acknowledgement in the output. No keystore/signing key is shipped; don't rebuild with a different key to force an upgrade.

## 2. Return the first actual result

Privately inspect the two JSON files, then provide **android-preflight.json**, **android-install-launch.json**, and:

- Device model / Android version (also in summary), APK filename/hash.
- Exact first screen after launch: Home, device-lock gate, storage error, blank screen, crash, or another message. Include exact error text with names/emails removed.
- Whether unlocking and opening Company & people works.

Do not mark these passed from expected results. If a guard fails, return its JSON/error first. No uninstall/reset/key replacement is an acceptable workaround. This is the minimum evidence needed before we can reproduce and fix a native failure.

For a running app with a reproducible error, the same script supports `--launch --logs --synthetic-test-device --out NEW_FILE`. It collects only that process's recent logcat lines and heuristically omits credential/email lines. **Review privately before sharing**; redaction is not a proof of privacy. It never clears log buffers or dumps all applications/crash logs. If the process dies before collection, record the crash/error screen; request targeted package-only diagnostics rather than sending an entire bug report.

## 3. Offline native acceptance after startup works

Keep Metro stopped. Work only in the app's **Create separate synthetic demo** profile; original data remains protected. Wait for each local save acknowledgement. Use `native-observations.template.json` to record actual outcomes, leaving untested rows Not run.

1. Create/edit customer and site; create a template, start a draft, edit the template and verify the older inspection retains its version/content.
2. Save an incomplete draft; background/foreground/unlock and reopen it. Verify notes and acknowledged answers remain.
3. Test Fail/N/A missing explanation, all-N/A (no misleading percentage), camera/gallery denial/cancellation/capture/orientation, compressed photo reopen, action assignment/resolution/history, completion and linked correction without overwriting the completed record.
4. Generate a native PDF with realistic and long notes/site names, portrait/rotated/missing photos and multiple pages; share/cancel. This is local export, not a secure client link. Verify temp cleanup using the documented lifecycle; do not delete acknowledged evidence.
5. Before offline testing, stop local backend/Metro and remove any USB backend tunnel:

```powershell
adb reverse --remove tcp:54321
```

Enable airplane mode and ensure Wi-Fi/mobile data are off. USB forwarding can otherwise reach the server even in airplane mode. Only **after acknowledging saves**, force-stop and relaunch:

```powershell
adb shell am force-stop com.sicyinternational.cleanproof.demo
adb shell am start -W -n com.sicyinternational.cleanproof.demo/.MainActivity
```

Verify saved customer/draft/completion/photo/action history without a development server. A standalone unadopted demo does not test an authenticated offline membership lease. Test adopted workspace expiry/revocation separately against the real backend. Never silently extend a lease.

Verify SQLCipher `cipher_version`, encrypted on-disk bytes and wrong/missing-key fail-closed behaviour using a disposable instrumented synthetic fixture on authorised development equipment. This non-debuggable Release APK is not permission to root the phone, expose keys or use `run-as` bypasses. Inspecting its native cipher symbols alone is not runtime acceptance. Missing-key/low-storage/interrupted-write injection must use disposable data and preserve old acknowledged work. No fault injection is automated by this handoff.

Check small-screen keyboard scrolling, large text and TalkBack navigation. Record background/app-switcher privacy, retained unsaved edits and error/save states. Run N01–N10 in RELEASE-0.6-ACCEPTANCE and R01–R03 in ACCEPTANCE-0.7; unperformed cases stay open.

## 4. Actual local backend and second client — Docker required

Use the full source on your existing Docker-equipped computer. From the checkout:

```powershell
npm ci
npm ci --prefix backend
npx --yes supabase@2.121.0 start
npx --yes supabase@2.121.0 migration up --local
```

In a second terminal:

```powershell
npx --yes supabase@2.121.0 functions serve photo-transfer
```

Keep JWT verification on. Apply existing forward migrations 001–006; never reset source data or deploy publicly. Keep Postgres/Studio/Mailpit and all administrative ports private. Use USB forwarding, not a new LAN/firewall opening. Check Docker/Windows listener/firewall exposure before running: no administrative service should be reachable from untrusted networks.

Reconnect the phone, disable airplane mode, then:

```powershell
adb reverse tcp:54321 tcp:54321
adb reverse --list
```

Enter **http://127.0.0.1:54321** and the local **public anon/publishable** key in Company & people. Only because USB forwarding is active does that address reach your computer. Without forwarding, it is the phone. This APK permits HTTP only for exact 127.0.0.1/localhost/10.0.2.2 development hosts; arbitrary LAN HTTP is not permitted. Do not disable transport security globally. Emulator address 10.0.2.2 applies only to a supported running emulator.

Use START-0.7's private terminal credential entry (never mobile `.env`) for:

```powershell
npm run seed:demo -- ..\cleanproof-private-demo-accounts
npm run test:full-stack
npm run test:auth-live
```

The seed creates real local synthetic accounts only when the stack works. Credentials go to a private folder outside source, not logs/deliverables; no invitations are sent. Two same-company owners, a site-limited inspector and an unrelated company support denial tests. Service-role/signing secrets belong solely in the private operator terminal. Local Mailpit is :54324. Record CLI/Docker/container versions and sanitised test outcomes; do not attach status output containing keys.

Use two independently signed-in authorised native devices when possible. A second same-project browser profile is an acceptable **host-client integration observation**, not two-native-device acceptance. Receive into an eligible pristine workspace or explicitly review adoption; do not reset unsent data. Exercise offline work/photo/action/completion → restart → sync both queues → lost acknowledgement/retry → exact second-client snapshot/photo/report → conflict review, interrupted transfers, session refresh/expiry/reset, membership/site denial and direct private Storage denial. Verify reduced-site recovery selects a separate authorised store and the original unsent restricted work remains quarantined. Test real server responses, not just hidden buttons.

For paired DB/object restore and real orphan cleanup use RECOVERY-0.7 B01/B02/C01 on separate disposable local stacks. Preserve source commit/version, paths/lengths/hashes and private credentials. No such service operation has run here. Never substitute the passed envelope/embedded-fixture tests or mark failed uploads synced.

## 5. iOS remains a separate gate

On an existing authorised Mac/Xcode/CocoaPods/iPhone setup, preserving original signing and data:

```sh
npm ci
EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS=1 npx expo prebuild --no-install
EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS=1 npx expo run:ios --configuration Release --device
```

Use a private HTTPS development backend reachable by the iPhone and only its public client key. Android adb reverse does not apply to iPhone. Keep iOS ATS/production security intact. Verify device key storage, DB/evidence/WAL/SHM backup exclusion/protection and relevant restore, offline embedded launch, camera, PDFs/share, background locking and two-client sync on iOS. No iOS build/execution was possible here; Android results cannot pass these cases.
