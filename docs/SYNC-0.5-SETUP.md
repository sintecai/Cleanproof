# CleanProof 0.5 — setup and runnable demonstration

Sicy International Ltd · 21 October 2026 · synthetic data only.

This continues the supplied 0.4 source/history. Do not reset/uninstall an existing app or database. Schema v7 is forward-only (v6 checkpoint upgrade retained). Billing, publication, secure client links, report finalisation and MFA are excluded.

## Install and host checks

Node **24**, npm. From the extracted cleanproof folder, optionally restore the complete repository first:

```sh
git clone cleanproof-history.bundle ../cleanproof-with-history
cd ../cleanproof-with-history
npm ci
npm ci --prefix backend
npm run check:all
```

Ordinary checks skip the optional host SQLCipher driver. To enable on a compatible Python host:

```sh
python3 -m pip install --target ../cipher-test-tools sqlcipher3-binary==0.6.0
CP001_SQLCIPHER_PYTHONPATH="$PWD/../cipher-test-tools" npm run check:all
```

PowerShell: `$env:CP001_SQLCIPHER_PYTHONPATH = 'C:\absolute\cipher-test-tools'`, then `npm run check:all`.

The combined two-host-client test is `backend/tests/business.test.mjs`. It performs the actual local repositories/outboxes, sealed photo files, completion/actions, PostgreSQL RPCs and relational projection using an embedded PostgreSQL fixture with synthetic Auth claims and an in-memory private object service. It is not Supabase Auth/REST/Storage acceptance or a native-device run.

## Full local Supabase — Docker-equipped computer required

Retain the existing architecture. No hosted project or paid account is needed. Full stack could not run in the delivery environment because Docker was unavailable.

```sh
npx --yes supabase@2.121.0 start
npx --yes supabase@2.121.0 migration up --local
npx --yes supabase@2.121.0 status
```

Use an isolated synthetic local project. On a first start, migrations are normally applied automatically; `migration up --local` applies any outstanding forward migrations. Never use `--linked`, `db push`, a production URL or `db reset` on work you wish to retain.

In a second terminal, from repository root:

```sh
npx --yes supabase@2.121.0 functions serve photo-transfer
```

Keep the gateway JWT check enabled. The handler also verifies the bearer against Auth `/user` before any privileged operation, and rechecks current membership/site access through RPC. The JPEG decoder is vendored/pinned with licences; the function needs no runtime dependency download. Its Deno type check passed; executing it with actual Storage/Auth remains a separate gate.

The default local API is http://127.0.0.1:54321, Studio :54323 and test mailbox :54324. Protect local ports with your firewall. Do not expose Studio, SQL, mailbox or service keys publicly. Local HTTP is for synthetic testing; production transport requires HTTPS.

## Run the actual HTTP integration harness

`backend/full-stack.mjs` refuses non-loopback URLs. It uses local admin credentials to create confirmed synthetic users without sending invitations/emails; independently signs in two users; exercises Auth, REST/RPC and private photo Edge/Storage access; injects lost upload/commit responses; restarts a host client; checks the second user's records/photo; and tests outsider/site/member/direct-object denial. It retains synthetic backend fixtures for inspection, while removing temporary host databases/photo directories. No password/token/service key is printed. This is a **prepared, not executed** full-stack acceptance harness in this delivery.

Use local keys from `supabase status` in a separate private terminal. Do not save them in source, logs, screenshots or the mobile `.env`.

Bash:

```bash
export CLEANPROOF_LOCAL_URL=http://127.0.0.1:54321
read -r -p 'Local public anon key: ' CLEANPROOF_LOCAL_ANON_KEY
export CLEANPROOF_LOCAL_ANON_KEY
read -r -s -p 'Local service role key: ' CLEANPROOF_LOCAL_SERVICE_KEY
export CLEANPROOF_LOCAL_SERVICE_KEY
npm run test:full-stack
unset CLEANPROOF_LOCAL_SERVICE_KEY CLEANPROOF_LOCAL_ANON_KEY
```

PowerShell:

```powershell
$env:CLEANPROOF_LOCAL_URL = 'http://127.0.0.1:54321'
$env:CLEANPROOF_LOCAL_ANON_KEY = Read-Host 'Local public anon key'
$env:CLEANPROOF_LOCAL_SERVICE_KEY = [System.Net.NetworkCredential]::new('', (Read-Host 'Local service role key' -AsSecureString)).Password
npm run test:full-stack
Remove-Item Env:CLEANPROOF_LOCAL_SERVICE_KEY
Remove-Item Env:CLEANPROOF_LOCAL_ANON_KEY
```

A failure is not a pass: inspect the named step and fix local configuration/service behaviour. Missing credentials fail before fixture creation. Real signed-expired JWT, refresh-token revocation/rotation timing, password reset/mailbox behaviour and native shared-device checks still need the full-stack/device acceptance checklist; the harness includes invalid-token denial, not an artificially claimed signed-expired-token pass.

## Native setup

Copy the public settings from `.env.example` into a private local `.env`. Only the **public anon/publishable** key goes into EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY. Never use service_role/sb_secret_. URL: loopback on iOS simulator, http://10.0.2.2:54321 for Android emulator, or a private LAN address for physical devices. Verify ATS/cleartext transport using synthetic data without weakening release policy.

Android SDK/Java/device:

```sh
npm run android
```

Mac/Xcode/CocoaPods/existing Sicy signing:

```sh
npm run ios
```

Later development sessions: `npm start`. Expo Go cannot run the SQLCipher configuration. True offline cold launch requires an embedded-bundle build, not reliance on Metro:

```sh
npx expo run:android --variant release
npx expo run:ios --configuration Release
```

No APK/IPA or physical-device run was performed here. These commands do not publish.

## Two-native-client acceptance sequence

1. Create confirmed synthetic Owner A, Owner B and Inspector through local Auth admin/retained seed instructions. Create the company as Owner A. Add Owner B as a member of that same company in local Studio SQL; no real invitation. Give Inspector only the intended site assignment. Do not claim membership administration is a shipped invitation workflow.
2. On A, use existing Customers/Sites/Templates, create an inspection, capture a synthetic JPEG, require Fail/N/A notes, create/resolve an action, complete locally. Restart and verify acknowledged records/photos.
3. Company & people → Account/Development connection: sign in. Home → Synchronisation: Verify saved account, choose company, Review existing local data, Adopt reviewed local work. Review includes the exact captured records and source operations; new work invalidates the review. No upload occurs until Sync.
4. The entire adopted workspace now locks on background/sign-out. Recover online session verifies membership. Offline unlock needs device authentication and a membership lease at most seven days old; sign-out disables it. Reconnect checks current membership. Another account/company cannot open this database. Company switching is blocked rather than clearing unsent work.
5. Sync. Each bounded photo is verified before the business receipt. Only after receipts and required local photos are available does the overall status become Synced. Completed locally remains a separate lifecycle status; there is no Submitted/Approved state.
6. On B, use a clean synthetic installation/workspace with **no pending original operations**. Sign in as Owner B; choose the same company, review and choose Receive company data. This explicitly permits replacement of pristine demo seeds, not acknowledged changes. Sync, inspect the preserved template version, completion, action/history, photo and regenerate a **local** report.
7. Edit an open draft or action differently on both clients before syncing. Sync A then B. B retains its proposal and current server values. The conflict screen displays findings/notes/actions. Choose a reviewed proposal/server value; original divergent action histories remain as audit branches. Completed snapshot differences remain blocked for correction/review, not silently overwritten.
8. Interrupt transfers/connections, kill/restart before/after acknowledgement, retry and confirm no duplicate records or false Synced status. Check all physical/OS gates in SYNC-0.5-ACCEPTANCE.

The old separate 0.4 metadata connection remains a diagnostic path; everyday native Customers/Sites/Inspections/Actions use the new business sync. Original `outbox` and `local_events` are retained exactly; business_acks records delivery beside them. Local PDFs are derivative exports, not synchronised issued report versions or secure links.
