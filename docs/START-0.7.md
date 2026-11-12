# APK execution follow-up — 23 October 2026

Start with [APK-EXECUTION-GUIDE](APK-EXECUTION-GUIDE.md) and [current acceptance matrix](APK-EXECUTION-ACCEPTANCE.md). The original APK is unchanged and independently inspected; no native install/execution or actual Supabase service acceptance has occurred. Use the guarded Node handoff to compare certificates and installed APK bytes before upgrade/launch. Fresh checks: 65 host + 20 backend fixture tests; five phone-tool guard fixtures. No runtime app defect was reproduced; £0 spent. Historical 0.7 records follow separately.

---

# Open and test CleanProof 0.7

Sicy International Ltd · 22 October 2026 · synthetic internal preview only.

## Install the compiled Android application

The supplied **CleanProof-0.7-Android-arm64.apk** is a successfully compiled Android Release build of code commit `a2880dd7b1201fe9b65044069140e32db08411ae`, with embedded JavaScript. It needs an ARM64 Android 7/API 24 or later test device with a passcode. It is not an Expo Go bundle. Camera, encryption, storage, PDF/share and offline cold-launch runtime acceptance still need your device: no native install or execution occurred here.

Use an existing synthetic test device, enable USB debugging and connect it to your computer:

```sh
adb devices
adb shell getprop ro.product.cpu.abilist
# Stop here: follow APK-EXECUTION-GUIDE certificate preflight before install/launch.
```

Alternatively transfer the APK privately to the test phone and open it with Android's package installer, allowing that local installer only as needed. Never send it to real clients or publish it. The application ID is `com.sicyinternational.cleanproof.demo`; version 0.7.0/code 1. This is a development-certificate build, not a production-signed release. Its certificate SHA-256 is `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. A previous Sicy build may have a different certificate. **If an upgrade fails because of signing, preserve the old installation/data and use a separate test device or rebuild with the original keystore. Do not uninstall, reset or clear storage.**

Unlock the local workspace; Company & people → Create separate synthetic demo. Follow the walkthrough below. The delivered APK includes development-only demo tooling and loopback network exceptions; it has no service-role key, test account password or hosted backend. Configure your local backend's public URL/key through Company & people. This ARM64 binary cannot be installed on an x86-only emulator. See NATIVE-0.7.md and evidence/0.7/android-apk.json for build/hash evidence.

## Additional working route: the same-project browser application

Use the separately supplied **CleanProof-0.7-Browser-App.zip**. It contains the compiled Expo Router application, not the old standalone HTML reconstruction. It executes the project's actual React Native screens, catalogue/workflow/business repositories, SQLite migrations, media journal, scoring, completion snapshots and report builder. Platform adapters are explicitly different from Android/iOS.

1. Install/use Node 24 on your computer (`node --version`). No paid account or hosting is required.
2. Extract the ZIP. On Windows double-click `START-CLEANPROOF.cmd`, or run `node serve-app-preview.mjs app` in that extracted folder. On Mac use the same Node command, or `sh start-cleanproof.sh`.
3. Open **http://127.0.0.1:8081**. Keep the terminal/server running. Opening index.html directly does not work because the application loads local JavaScript/WASM assets.
4. Enter a new browser workspace passphrase of at least 12 characters. Keep it to reopen your encrypted data. Leave the optional public backend key empty for offline local workflows.
5. Open **Company & people → Create separate synthetic demo**. This creates a separate store containing two additional customers/sites, a reusable checklist, draft and completed inspections, genuine synthetic JPEG evidence, an open corrective action and a resolved action/history. The original workspace stays intact. Use Open previous protected workspace to select it again; its own access gates still apply.
6. Home → Continue unfinished work; History → View completed record; inspect comments/photos/actions; Preview & export report → Preview report / browser print. Use browser Print / Save as PDF. This is not native expo-print or a saved native PDF version.
7. Customers → Add customer; add/edit sites/templates; create an inspection, record Fail/N/A explanations, attach a photo through the file picker, assign an action, review and complete. Only a durable save acknowledgement is labelled saved. A browser photo chooser is not proof of native camera permissions/orientation.
8. Refresh/reopen with the same passphrase to check persistence. Browser data can be evicted/cleared by the browser; it is synthetic preview storage, not device backup. Do not use real customer data.

The browser adapter keeps SQLite in WASM memory and persists AES-256-GCM-encrypted snapshots in IndexedDB, with PBKDF2-derived keys and revision checks against stale tabs. Photographs use the same media journal/AAD and are sealed separately. Each profile has a separate snapshot key/salt and media namespace. This is **not SQLCipher or OS secure storage**, and cannot establish native encryption, hardware key protection, offline cold launch, iOS backup exclusion or native sharing acceptance. Closing the tab discards the in-memory unlock state. Do not clear browser storage to resolve an error.

### Use actual Auth and sync from this browser build

Start your local Supabase stack as below, then enter its URL and **public anon/publishable key** on the browser opening screen. No service-role key belongs there. The build can then run the actual account and business-sync adapters; it does not seed fake server responses. Use two separate browser profiles/incognito contexts for independently authenticated clients. Use ports 8081 or 8082: photo-transfer permits only these explicit loopback preview origins. Native calls have no browser Origin and retain their existing authentication checks.

For a fresh receiver, use the pristine original workspace before generating offline demo work. Sign in → Synchronisation → Verify saved account → select the seeded company → review → Receive company data → Sync. A workspace with unsent work is correctly refused as a fresh receiver. Never reset it to bypass this restriction.

## Run from source

```sh
git clone cleanproof-history.bundle ../cleanproof-with-history
cd ../cleanproof-with-history
npm ci
npm ci --prefix backend
npm run check:all
```

The observed zero-skip host run configured an external `sqlcipher3-binary==0.6.0` Python driver. On a compatible Linux host you can install it outside source with `python3 -m pip install --target ../cleanproof-host-cipher sqlcipher3-binary==0.6.0`, then set `CP001_SQLCIPHER_PYTHONPATH` to that absolute directory for `npm run check:all`. On unsupported hosts retain any optional cipher checks as skipped/pending, not passed; native SQLCipher acceptance is independent.

Browser from source, Bash:

```sh
EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS=1 npm run export:app
npm run preview:app
```

PowerShell:

```powershell
$env:EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS = '1'
npm run export:app
npm run preview:app
```

Interactive Metro browser development is `npm run preview:app:dev`. The exported preview needs only Node to serve it. The old `preview:workflows` reconstruction remains historical and is not the delivered working application route.

## Local backend and real synthetic accounts — Docker required

No Docker daemon exists in the delivery environment. These real-service commands are prepared; they were not run here.

```sh
npx --yes supabase@2.121.0 start
npx --yes supabase@2.121.0 migration up --local
npx --yes supabase@2.121.0 status
```

Second terminal:

```sh
npx --yes supabase@2.121.0 functions serve photo-transfer
```

Keep JWT verification enabled. Use local migrations 001–006 unchanged; 0.7 needs no new SQL migration. Never `db reset`, `db push`, use `--linked`, deploy publicly or provision a hosted/paid project for this test.

Private terminal credentials, Bash:

```bash
export CLEANPROOF_LOCAL_URL=http://127.0.0.1:54321
read -r -p 'Local public anon key: ' CLEANPROOF_LOCAL_ANON_KEY
export CLEANPROOF_LOCAL_ANON_KEY
read -r -s -p 'Local service role key: ' CLEANPROOF_LOCAL_SERVICE_KEY
export CLEANPROOF_LOCAL_SERVICE_KEY
npm run seed:demo -- ../cleanproof-private-demo-accounts
npm run test:full-stack
read -r -s -p 'Actual local HS256 JWT signing secret: ' CLEANPROOF_LOCAL_JWT_SECRET
export CLEANPROOF_LOCAL_JWT_SECRET
npm run test:auth-live
unset CLEANPROOF_LOCAL_JWT_SECRET CLEANPROOF_LOCAL_SERVICE_KEY CLEANPROOF_LOCAL_ANON_KEY
```

PowerShell equivalents:

```powershell
$env:CLEANPROOF_LOCAL_URL = 'http://127.0.0.1:54321'
$env:CLEANPROOF_LOCAL_ANON_KEY = Read-Host 'Local public anon key'
$env:CLEANPROOF_LOCAL_SERVICE_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'Local service role key' -AsSecureString)).Password
npm run seed:demo -- ../cleanproof-private-demo-accounts
npm run test:full-stack
$env:CLEANPROOF_LOCAL_JWT_SECRET = [System.Net.NetworkCredential]::new('', (Read-Host 'Actual local HS256 JWT signing secret' -AsSecureString)).Password
npm run test:auth-live
Remove-Item Env:CLEANPROOF_LOCAL_JWT_SECRET, Env:CLEANPROOF_LOCAL_SERVICE_KEY, Env:CLEANPROOF_LOCAL_ANON_KEY
```

The seed command refuses a public origin and an output directory inside source. It creates confirmed synthetic accounts without invitations: two owners in the same company, an inspector assigned only Riverside Offices, and an unrelated owner/company. It runs the shared fixture through real Auth/REST/Edge/Storage before marking `completed:true`. Read generated credentials privately from `../cleanproof-private-demo-accounts/synthetic-accounts.json`; none are shipped or printed. On Windows use a private access-controlled/encrypted host folder; POSIX file modes are not a substitute for Windows ACLs. A failed seed retains private progress as incomplete; investigate without resetting valuable data. A new run uses a new private output directory/company, not a silent merge.

The existing full-stack harness creates additional isolated synthetic fixtures. It is not a substitute for manually testing the actual application. Signed-expired-token and captured-mailbox tests are `test:auth-live`; malformed-token rejection is not equivalent. Actual local Mailpit is :54324. Do not save keys, passwords, Auth response bodies or mailbox codes into evidence.

## Windows / Android native route

Use JDK **17 with javac**, Android Studio/SDK, adb and a passcode-protected device. A Java runtime alone is insufficient. Current locked Expo 58 / RN 0.88 requires API 37; do not downgrade it to force a build. In SDK Manager install the platform advertised as `platforms;android-37.0`, Build Tools 37.0.0 and 36.0.0 (used by dependencies), platform-tools, NDK 27.1.12297006 and CMake 3.22.1. Keep the existing application ID/signing identity for upgrade tests.

```powershell
java -version
javac -version
adb devices
$env:EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS = '1'
npx expo prebuild --no-install
npx expo run:android --variant release --device
```

The Release build embeds JavaScript. For later dev-client sessions use `npm run android` / `npm start`. Expo Go cannot satisfy the SQLCipher gate.

Local backend on an Android emulator: http://10.0.2.2:54321. On a USB-connected phone:

```powershell
adb reverse tcp:54321 tcp:54321
```

Use http://127.0.0.1:54321 on the phone. Company & people → account connection accepts and persists the **public** URL/key in the encrypted database. Adopted workspaces reject an origin change. Only synthetic preview builds enable cleartext for exact loopback/emulator hosts; the plugin does not enable global HTTP or arbitrary LAN exceptions. A production build keeps demo tools disabled. Do not weaken transport policy to connect another host.

Before upgrade, verify package/signing compatibility. If install reports a signing mismatch, preserve the old app and its data; do not uninstall or clear storage. Use a separate synthetic test device or rebuild with the original Sicy keystore. No production signing secret is included.

## Mac / iPhone

Use an existing authorised Mac, supported Xcode/CocoaPods, Sicy signing and a passcode-protected iPhone:

```sh
npm ci
EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS=1 npx expo prebuild --no-install
EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS=1 npx expo run:ios --configuration Release --device
```

No iOS build or simulator/device was available here. The Android-only local HTTP exception does not alter iOS ATS. Use an appropriate private HTTPS development endpoint or a reviewed local development configuration on the Mac; never disable production transport security globally. Native camera, backup exclusion/restore, offline embedded cold launch, PDF/share and two-native-client checks N01–N10 remain mandatory.

## Full application walkthrough

Sign in → Synchronisation → review/adopt or receive the authorised company → customer/site → Start inspection → checklist answers and Fail/N/A comments → Photos → corrective action/person/due date → review → Complete locally → report → restart with network/Metro off → unlock saved work → reconnect → Sync → second authorised client receives data/photos → make competing edits → review the conflict copies. Completed locally, Synced and any future Submitted/Approved states stay distinct.

Local catalogue, checklists, drafts, photographs, actions, completion/history and report creation can run without the server. Sign-in/reset/membership checks, first receive, cross-client synchronisation and remote recovery require the backend. Browser print differs from native PDF export. Secure client links, issued reports, MFA expansion, billing and publication are later work.
