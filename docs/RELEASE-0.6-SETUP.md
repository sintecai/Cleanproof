# CleanProof 0.6 — local integration and acceptance runbook

Sicy International Ltd · 21 October 2026 · synthetic data only. Annmaria is the AI-assisted developer. This is an implementation candidate with open acceptance gates, **not an accepted internal-trial release or a real-data pilot**. Continue the existing Expo application and Git history. No paid service or account is required.

## Install and preserve history

From the extracted `cleanproof` directory:

```sh
git clone cleanproof-history.bundle ../cleanproof-with-history
cd ../cleanproof-with-history
node --version
npm ci
npm ci --prefix backend
npm run check:all
```

Use Node 24. `npm test` runs host tests only; `npm run test:backend` adds embedded PostgreSQL fixtures. Neither starts Supabase. Full encryption test requires a compatible Python host driver:

```sh
python3 -m pip install --target ../cipher-test-tools sqlcipher3-binary==0.6.0
CP001_SQLCIPHER_PYTHONPATH="$PWD/../cipher-test-tools" npm run check:all
```

PowerShell: set `$env:CP001_SQLCIPHER_PYTHONPATH = 'C:\absolute\cipher-test-tools'` before the command. Without this optional driver the SQLCipher integration is explicitly skipped. Never uninstall, clear app storage, reset a database, replace a missing key or rewrite old migrations to make a check pass.

Local schema 8 upgrades 0.5 schema 7 in one transaction. Server forward migrations **005 (access review)** and **006 (maintenance/intent expiry)** follow unchanged 001–004. Migration tracking applies each once. Do not manually reapply the function-renaming migration or execute historical files out of order.

## Actual local Supabase — Docker Desktop on Windows/Mac or Docker Engine

Inspect first: `docker version`, `docker info`. Windows needs the supported WSL2/Docker Desktop configuration for that machine; retain existing Sicy tooling and check its licensing eligibility separately. This delivery did not install Docker or incur a charge.

```sh
npx --yes supabase@2.121.0 start
npx --yes supabase@2.121.0 migration up --local
npx --yes supabase@2.121.0 status
```

Second terminal, same source:

```sh
npx --yes supabase@2.121.0 functions serve photo-transfer
```

No `--linked`, `db push`, public deployment, paid project or `db reset`. First start applies migrations automatically; migration up applies only outstanding migrations. Local API :54321, PostgreSQL :54322, Studio :54323, Mailpit :54324. Keep administrative ports private. For physical phones, allow only the required API port from the test devices on a private network; never expose SQL, Studio, mailbox or secrets publicly. All HTTP data must be synthetic. Production transport remains HTTPS.

### Actual two-host-client HTTP test

Use the local legacy anon/service-role keys from `supabase status` in a private terminal. Do not put the private key into `.env`, Expo, logs or screenshots.

Bash:

```bash
export CLEANPROOF_LOCAL_URL=http://127.0.0.1:54321
read -r -p 'Local public anon key: ' CLEANPROOF_LOCAL_ANON_KEY
export CLEANPROOF_LOCAL_ANON_KEY
read -r -s -p 'Local service role key: ' CLEANPROOF_LOCAL_SERVICE_KEY
export CLEANPROOF_LOCAL_SERVICE_KEY
npm run test:full-stack
```

PowerShell:

```powershell
$env:CLEANPROOF_LOCAL_URL = 'http://127.0.0.1:54321'
$env:CLEANPROOF_LOCAL_ANON_KEY = Read-Host 'Local public anon key'
$env:CLEANPROOF_LOCAL_SERVICE_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'Local service role key' -AsSecureString)).Password
npm run test:full-stack
```

This requires working Auth, REST/RPC, Edge and private Storage together, not a mock. It creates confirmed synthetic users (no real invitations), independent sign-ins, domain records/photos/actions/completion, lost replies, restart, second-client projection, conflicts and negative access attempts. It retains only synthetic backend fixtures. A failed/missing-key run is not acceptance. Source tool refuses non-loopback origins.

### Actual token/mailbox lifecycle test

Also read the **actual local HS256 JWT signing secret** privately from the local CLI configuration/status. It must match a service-issued access token. Do not use the service-role key as the JWT secret.

```bash
read -r -s -p 'Actual local JWT secret: ' CLEANPROOF_LOCAL_JWT_SECRET
export CLEANPROOF_LOCAL_JWT_SECRET
npm run test:auth-live
unset CLEANPROOF_LOCAL_JWT_SECRET CLEANPROOF_LOCAL_SERVICE_KEY CLEANPROOF_LOCAL_ANON_KEY
```

PowerShell:

```powershell
$env:CLEANPROOF_LOCAL_JWT_SECRET = [System.Net.NetworkCredential]::new('', (Read-Host 'Actual local JWT secret' -AsSecureString)).Password
npm run test:auth-live
Remove-Item Env:CLEANPROOF_LOCAL_JWT_SECRET
Remove-Item Env:CLEANPROOF_LOCAL_SERVICE_KEY
Remove-Item Env:CLEANPROOF_LOCAL_ANON_KEY
```

Default Mailpit URL is http://127.0.0.1:54324. Optional terminal-only `CLEANPROOF_LOCAL_MAILBOX_URL` must also be loopback. The test verifies the actual issued signature before signing an expired variant, tests Auth/REST/Edge rejection, refresh rotation and revocation, captures the configured recovery-code email, changes the password and rejects code reuse. An asymmetric local JWT setup or incompatible mailbox API **fails explicitly** and needs an adapted test; it is not skipped or called passed. Test code is prepared, not real-service verified in this delivery. Observe password reset manually in the existing account screen as well.

## Native application — Windows/Android

Install/use existing Android Studio SDK, compatible Java, USB debugging and a passcode-protected synthetic Android device. `.env.example` contains public mobile settings only. Copy to private `.env`: emulator backend http://10.0.2.2:54321; physical phone uses the development computer's private LAN API address. Only the public anon key belongs in EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY.

```powershell
npm ci
npm run android
# Later development sessions:
npm start
# Embedded JS bundle, actual install; no publication:
npx expo run:android --variant release --device
adb devices
adb shell am force-stop com.sicyinternational.cleanproof.demo
```

Launch from the phone icon with Metro stopped, network disabled and the app force-stopped. Use **the same application ID, keystore and build/signing family as the existing installation** to test an upgrade. If install reports a signature mismatch, stop and preserve the old installation; do not uninstall. Record Android Studio/Java/SDK, Android version, device, build mode and commit. Expo Go does not provide the SQLCipher build.

## Native application — Mac/iPhone

Use compatible Xcode, CocoaPods and existing Sicy signing/team arrangements. Windows cannot build iOS locally.

```sh
npm ci
npm run ios
npx expo run:ios --configuration Release --device
```

Select the synthetic passcode-protected test iPhone with the same app identifier/signing identity for upgrade. No App Store/TestFlight publication. Test embedded-bundle cold launch with Metro stopped. If private HTTP development transport is rejected, record the failure and use an appropriately scoped synthetic development configuration; do not disable release transport security globally.

## Native workflow and evidence

Use RELEASE-0.6-ACCEPTANCE.md for evidence rows. Sync → review local work captures 40 records / 100 source rows per durable step. Review pages contain at most 40 records. Re-enter Review after restart to resume an unchanged snapshot; use Continue saved review if still capturing. New edits invalidate it. Adoption remains opt-in; nothing uploads until Sync. Parent-first business batches and exact original audit rows drain separately. Partial sync stays Waiting to sync, with remaining original operations and accepted batch count.

Existing 0.5 setup contains the full offline inspection/photo/action/completion and second-authorised-client sequence. Repeat it on native devices. The browser reconstruction retained in `previews/` is only a local-workflow simulation and proves no native security or new backend behaviour.
