# Local backend and native setup — 0.4

Synthetic development only. No hosted account, payment details or service deployment is needed. The local inspection application still works without backend environment variables. **Do not reset/uninstall an existing app or use `supabase db reset` on a database containing work.**

## Restore and install

Node 24 / npm required. From the extracted `cleanproof` directory:

```sh
git clone cleanproof-history.bundle ../cleanproof-with-history
cd ../cleanproof-with-history
npm ci
npm ci --prefix backend
npm run check:all
```

The optional host SQLCipher test skips without its external driver. To enable on supported Python platforms:

```sh
python3 -m pip install --target ../cipher-test-tools sqlcipher3-binary==0.6.0
CP001_SQLCIPHER_PYTHONPATH="$PWD/../cipher-test-tools" npm run check:all
```

PowerShell: set `$env:CP001_SQLCIPHER_PYTHONPATH` to the absolute directory, then run the same npm command. Host SQLCipher/PostgreSQL tests are not device acceptance.

## Start real local Supabase (not performed in the delivery environment)

Install a Docker-compatible runtime using its free applicable licence/terms and start it. Native Docker was not available here. Do not expose database, Studio, mail or service keys to the public Internet. Use a local firewall and synthetic data.

From repository root:

```sh
npx --yes supabase@2.121.0 start
npx --yes supabase@2.121.0 migration up --local
npx --yes supabase@2.121.0 status
```

CLI 2.121.0 was the current npm version when checked; these full-stack commands and configuration still need execution on a Docker-equipped machine. First startup applies the two migrations; `migration up --local` is then a no-op if already applied. Never add `--linked` or push to a hosted project for this task. Starting/downloads use local disk and bandwidth but no Supabase subscription.

Local default endpoints: API http://127.0.0.1:54321, Studio http://127.0.0.1:54323, test mailbox http://127.0.0.1:54324. SQL migrations target Supabase Postgres, not the mobile SQLite database.

## Synthetic accounts

Signup is disabled, confirmations enabled. Use Studio's local Auth admin to create **owner-a@example.test**, **owner-b@example.test** and **inspector@example.test**, confirmed, with a unique synthetic password. Alternatively the supplied script creates these three accounts through the loopback-only admin endpoint. Set `CLEANPROOF_LOCAL_SERVICE_KEY` from **local** status and `CLEANPROOF_LOCAL_TEST_PASSWORD` (12+ characters) in your private terminal environment, then:

```sh
node scripts/seed-local-auth.mjs
```

Never put that service key/password in source, EXPO_PUBLIC values, screenshots, logs or reports. Clear both environment variables afterwards. The script sends no invitations; it stops on existing users/errors without replacing passwords. Its real GoTrue integration is pending, not claimed tested.

Owner A creates Synthetic Alder from the app. Owner B creates Synthetic Birch. There is no manager role or invitation flow. To test the Inspector after those exist, use **local Studio SQL editor** as administrator, substituting the generated company/site/user UUIDs from your local synthetic environment:

```sql
insert into public.cp_memberships(company_id,user_id,role)
values ('ALDER_COMPANY_UUID','INSPECTOR_AUTH_USER_UUID','inspector');
insert into public.cp_assignments(company_id,user_id,site_id)
values ('ALDER_COMPANY_UUID','INSPECTOR_AUTH_USER_UUID','ALDER_SITE_UUID');
```

This is development administration, not a shipped invitation/team-management workflow. Membership/assignment changes advance the access epoch. No real recipients or customer data.

## Public mobile configuration

Copy `.env.example` to `.env` and set the two **public** values locally:

```dotenv
EXPO_PUBLIC_CLEANPROOF_BACKEND_URL=http://127.0.0.1:54321
EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY=LOCAL_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

Use only the local legacy **anon** JWT or `sb_publishable_` key, never `service_role` / `sb_secret_`. The adapter rejects common secret-key forms. All EXPO_PUBLIC values are embedded in the app; they must be public. Private variables used by the seed script must not be prefixed EXPO_PUBLIC.

Android emulator uses http://10.0.2.2:54321. iOS simulator on the same Mac can use loopback. Physical devices use the computer's private LAN IP and local firewall; native HTTP/ATS/network configuration must be tested. Do not weaken release transport policy. Production must use HTTPS and a separately reviewed configuration. Restart Metro with cache clearing when environment changes.

## Native builds

Android: Android SDK/Studio, compatible Java, and passcode-protected emulator/device:

```sh
npm run android
```

Mac/iOS: compatible Xcode/CocoaPods and existing Sicy signing:

```sh
npm run ios
```

Later sessions: `npm start`. Expo Go cannot run SQLCipher. Rebuild native clients for the new iOS launch hook. For genuine offline cold launch, test embedded-bundle local builds:

```sh
npx expo run:android --variant release
npx expo run:ios --configuration Release
```

Neither command publishes. The iOS command requires a Mac; no Android/iOS binary was built in this environment.

## Try the increment

1. Confirm existing Home/customers/sites/templates/inspections/actions/reports still work offline in the local synthetic workspace.
2. Company & people → **Development connection**. With no configuration, it explains setup and makes no backend requests.
3. Sign in as Owner A; create the synthetic company. Queue a customer; the UI says **Saved on this device. Waiting to sync**. Connect & sync metadata. Only an accepted receipt changes it to **Synced metadata operations**.
4. Select the downloaded customer, enter a site name, queue site, sync. Open the same account on a second native client/session and sync to see authorised metadata.
5. Queue different renames from two clients using the same server revision. Sync A then B: B keeps its proposed name and the server's accepted name under **Sync needs attention**. No last-write-wins overwrite. Conflict resolution is manual/developer-reviewed in this increment.
6. Disconnect after committing server-side but before the response reaches the device; retry. Operation ID/content remain identical. No duplicate record/revision.
7. Sign out or background the app: connected records are locked. Recover saved session verifies current membership online. Expired sessions cannot load connected records offline. Queued work is retained for the same user/company. Sign-out network failure is disclosed; local credentials are removed first. An access token already issued by the server can remain valid until its expiry; immediate all-device token revocation is not implemented.
8. Password reset: request for a synthetic account, open the **local** test mailbox, enter the recovery code and new password. The supplied local recovery template includes the code. No real email delivery has been configured/tested.
9. Test Inspector scope and Owner B denial using the local administrative fixture above and BACKEND-ACCEPTANCE.md.

**Boundary:** connected metadata is a separate test store. The original CP001 `outbox` and `local_events` are counted/preserved, not consumed or marked synced. Local inspection creation, offline evidence, completion/actions/PDF remain local. Do not infer the full requested inspection/photo/report workflow is synchronised.

## Browser simulation

```sh
npm run preview:workflows
```

Open `previews/cleanproof-workflows.html`. Synthetic in-memory reconstruction of the existing local workflow only; refresh resets it. It does not emulate the new backend/authentication, native persistence, encryption or device behaviour. Optional DOM regression command is retained in README. No browser screenshot is native evidence.
