# Actual hosted staging services — 24 October 2026

## Provisioning and ownership

Confirmed connected organisation SintecAI (osngdkgftdrtrcjylven), Free plan, no previous projects. Provider quoted monthly creation amount 0; user explicitly authorised free-only staging creation. Created CleanProof-staging, project vmvoeksprlwjiwfxqita, eu-west-2 (London), ACTIVE_HEALTHY. No upgrade, paid add-on or invoice action was taken. This is staging for synthetic tests, not production.

API origin: https://vmvoeksprlwjiwfxqita.supabase.co
Private review/staging web origin: https://cleanproof-sicy-preview.grassyelf128.chatgpt.site

Migrations 001–007 applied forward without reset. Migration 20261024094325_hosted_function_privileges adds a permission correction discovered on the actual hosted project. Migration metadata was transactionally aligned to the existing source versions/names after the connector assigned execution timestamps; no business records or migration SQL were erased/replayed. `list_migrations` now matches all eight source migration files. Do not reset this project or replay the seven initial migrations.

Private bucket cleanproof-private exists, public=false, 10 MiB bucket cap. Server JPEG transfer remains limited to 1 MB plus format/decode/hash checks. photo-transfer v1 deployed and ACTIVE. Default platform secrets stay inside Supabase's Edge environment; only the public publishable key is versioned in deployment/staging.public.json and compiled into the frontend.

## Fixed actual-service defects

1. Hosted defaults granted EXECUTE directly to anon/authenticated independently of PUBLIC. The old PUBLIC-only revocations therefore left internal helpers callable. Migration 008 revokes direct grants from PUBLIC/anon/authenticated/service_role on all cp functions and reopens only the reviewed client/server API allowlists. It also closes default function grants for future functions created by the migration owner. Actual SQL after migration: anonymous cp functions=0; authenticated cp_sync_candidate=false; authenticated cp_photo_finish=false; service_role cp_photo_finish=true. No data rewrite.
2. Edge deployment rejected the decoder's CJS media type. The existing vendored JPEG decoder now has an ESM export wrapper (.mjs), with original copyright/licences retained and a modification notice. No decoding or memory limits were removed.
3. Local-only CORS rejected hosted browser origins. The Edge function now allows the exact staging HTTPS origin, retains narrowly defined loopback preview support and rejects unrelated origins. No wildcard/credential bypass. Native Origin-less requests still require authentication.
4. Gateway verify_jwt is false for photo-transfer because the function itself verifies every non-preflight bearer token via Supabase /auth/v1/user before invoking membership-checked RPCs/private Storage. This supports current asymmetric Auth tokens and authenticated browser preflight; it is NOT anonymous attachment access. Actual unauthenticated GET returns 401.
5. Invalid password responses now produce a useful, non-enumerating sign-in/verification error.

## Build and configuration

`npm run build` now builds the connected STAGING web application from deployment/staging.public.json with demo/local-only flags 0. `npm run build:demo` is the explicitly separate historical review build. `npm run build:staging` accepts public environment variables for another approved staging environment; it never deploys production. CI checks/builds only; no hosting workflow is triggered.

Public JSON contains only project API origin/publishable key, exact site origin and Google=false. Never replace it with a service_role/secret key. Production public configuration remains separate and inactive. The visible staging notice requests synthetic testing only and does not claim accepted email/Google service delivery.

Set the web host's SPA fallback to index.html for /auth-callback and application deep links. Retain HTTPS and the private ChatGPT owner-access gate for review; that host gate is separate from CleanProof Auth and is not removed by app code. Full customer-host security headers/CSP and native acceptance remain gates.

## Exact remaining account actions

Available Supabase tools do not expose Auth URL settings, templates, SMTP/provider settings or Google Cloud configuration. They have not been silently set through SQL or by disabling verification.

In this project's Supabase Authentication settings:
- Site URL: https://cleanproof-sicy-preview.grassyelf128.chatgpt.site
- Explicit allowed redirect: https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/auth-callback
- Keep email confirmation enabled; actual public Auth settings currently report email enabled, signup enabled, mailer_autoconfirm=false.
- Configure a project-owned verified SMTP sender/domain using existing/free service if available. Enter host, port, username and password ONLY in the provider's secure settings. Configure SPF/DKIM as required by that sender. No private SMTP credentials in chat, source or public build variables.
- Use supplied supabase/templates/confirmation.html and recovery.html so verification/recovery messages contain numeric {{ .Token }} codes expected by the existing app flow. Default link templates and localhost defaults are not accepted deployment configuration. Email verification/recovery uses the server /verify endpoint via the app code-entry flow, not a simulated callback.
- Supply a controlled synthetic test mailbox/alias under the sender domain to establish delivery and reset acceptance. A reserved example.test address cannot receive real mail and was rejected by the live service; that rejection is not a sender-delivery pass or proof of SMTP failure.

For Google, use a Sicy-controlled Google Cloud web OAuth client/consent configuration. Authorised JavaScript origin: https://cleanproof-sicy-preview.grassyelf128.chatgpt.site. Google authorised redirect URI: https://vmvoeksprlwjiwfxqita.supabase.co/auth/v1/callback. Enable Google in Supabase and enter client ID/secret in its provider settings, never chat/build code. Supabase's app redirect must allow the exact /auth-callback URL above. Keep Google unavailable until configured and actual login/cancellation accepted; it currently reports disabled. Do not enable unsafe automatic email-based company linking. Native Google IDs/signing/redirect acceptance remain separate.

## Actual acceptance evidence

backend/staging-smoke.mjs runs against only this exact authorised staging origin, with public credentials, short request timeouts and sanitised results. Signup probing requires an explicit flag and uses a reserved synthetic address, never a real recipient. It records the source commit. It does not turn missing delivery into a pass.

Observed against real services:
- Auth settings: 200; email enabled and confirmation required.
- Incorrect/nonexistent credentials: 400 invalid_credentials.
- Invalid synthetic JWT: 403 bad_jwt. This is NOT a real signed expired-token test.
- Anonymous cp_register_company: 401 / 42501.
- Anonymous internal cp_sync_candidate: 401 / 42501.
- Anonymous bucket listing: 200 with no object data. Populated private-object and cross-company isolation are NOT accepted by this empty-bucket result.
- Edge unauthenticated photo request: 401.
- Exact staging-origin preflight: 204 with matching CORS origin.
- Unrelated-origin preflight: 403.
- Reserved synthetic signup attempt: 400 email_address_invalid; no verification email delivery proven.
- Google: disabled, not tested.

Automated host checks: TypeScript and 75 host tests passed, one SQLCipher host-driver test skipped. PostgreSQL fixtures: 23 passed, including a new test reproducing hosted direct grants. Configuration tests retained. Browser build passed. These do NOT prove successful customer authentication or populated attachment transfer.

Security advisor after migration: no anonymous SECURITY DEFINER warnings; ten INFO notices on intentionally closed RLS/no-policy internal tables, and sixteen WARN notices for authenticated SECURITY DEFINER RPCs. Those API entrypoints require membership validation; live multi-user authorisation acceptance and final security review are still pending, not waived by an advisory classification.

Still blocked/not run: delivered verification/resend, successful password sign-in, password recovery, real signed token expiry/refresh/revocation, Google login/cancellation, authenticated company onboarding/site/inspection/photo/action/report flow, second account/session, cross-company/site/photo denial, queue/attachment interruption, reduced-scope quarantine recovery, paired real DB/object restore, guarded real cleanup, browser key persistence/shared-device/offline reload, native Android/iPhone tests. Dependency release findings, secure issued report access, invitations/manager role, data export/deletion and privacy/release review remain open.

## Run / operations / rollback

Node 24; `npm ci`; `npm ci --prefix backend`; `npm run check:all`; `npm run test:build-config`; `npm run test:staging-smoke`; `npm run build`. For the reserved signup probe only: CLEANPROOF_STAGING_SIGNUP_PROBE=1 npm run test:staging-smoke. The loopback-only seed/auth/restore tools remain loopback-only and have not been repointed at hosted services or weakened.

Restore/backup runbooks remain applicable but need a disposable paired actual database+Storage rehearsal. Free tier is not a claim of automatic backups. Recoverable server data means only server-acknowledged rows/objects; unsent encrypted work is still device-only.

Rollback application code to b4f8f23 if needed without deleting local/server records. Keep migration 008's restrictive permissions; do not undo the security fix merely to restore earlier code. Redeploy the prior Edge version only with an equivalent hosted module/CORS/auth fix. No destructive cleanup has run.

Release scope: private synthetic integration staging only. No customer pilot, real customer data, production deployment, live billing or store publication authorised by this increment. Actual expenditure and current project quote: 0. Any future nonzero subscription/sender/compute cost needs explicit approval. GitHub remains empty because authenticated Git transport is unavailable; the previously rejected history-import Actions workaround has not been retried or bypassed. Source/feature history is preserved independently and included with the delivery.
