# Deployment and GitHub preparation

No production deployment is authorised by this document. Keep the current Expo/React Native, SQLCipher/SecureStore and Supabase architecture. Existing private Site remains for synthetic UI review. Proposed separate staging/customer web hosting: Sicy-owned Cloudflare Pages static Expo export plus Sicy-owned Supabase Auth/Postgres/private Storage/Edge; no duplicate database or paid AI API. Account/project setup, any charges and production exposure require management approval.

Use distinct development/staging/production data/projects. deployment/*.public.example.env contains PUBLIC configuration only. Never embed service-role, JWT signing, SMTP, backup, payment or signing keys. Configure those through provider secret controls, not chat. Review region, DPA/subprocessors and Sicy ownership. Production email needs a verified Sicy sending domain/custom SMTP: default Supabase email does not deliver to arbitrary customer addresses.

Default local signup stays disabled. To test disposable local onboarding merge supabase/config.onboarding.example.toml into the intended local config, enabling required confirmations and confirmation.html numeric-code template. Do not accidentally apply that change to a live account. No emails were sent here.

## Setup and service acceptance

```sh
npm ci
npm ci --prefix backend
npm run secrets:check
npm run check:all
npx --yes supabase@2.121.0 start
npx --yes supabase@2.121.0 migration up --local
npx --yes supabase@2.121.0 functions serve photo-transfer
```

Keep function serving in a separate terminal. Use existing BACKEND-SETUP/0.7 runbooks for local private environment keys, then run test:full-stack, test:auth-live and test:onboarding-live. The latter uses actual loopback Auth, Mailpit and PostgREST to register two unique example.test accounts, verify emailed codes, create empty companies idempotently and test profile isolation. Missing keys/services fail; that is not a pass/skip. Never use db reset on valuable work. The existing CLI pin is retained for reproducibility and needs target-environment validation.

`npm run build` deliberately forces the private LOCAL_ONLY demo. It is NOT a customer staging/production command. For separately approved staging use the reviewed public staging environment with DEMO_TOOLS=0 and PREVIEW_LOCAL_ONLY=0, then `npx expo export --platform web --output-dir staging-dist`. Do not expose real data before release checks pass. Loopback-only destructive/integration harness guards must remain; prepare a separate authorised synthetic hosted smoke run rather than pointing them at production.

Before release: test exact HTTPS frontend, Auth, permissions, media/report paths and both clients. Configure tested CSP (including Expo/sql.js wasm and exact backend origins), referrer/permission/nosniff/frame policies; do not insert untested wildcard policies. Review rate limits/email abuse. Keep administrative endpoints private and logs limited to operation/reference/error categories without notes, photos, credentials or mail codes.

## Backup, recovery and lifecycle

Existing paired-snapshot and Storage adapter tools are local-only and await actual separate-stack rehearsal. Freeze/quiesce writers, capture DB/Auth/memberships/migrations plus private object manifest/paths/lengths/hashes, encrypt with a separately stored backup secret and test restoration into a disposable stack. A DB backup alone does not restore object bytes. Hosted orchestration still requires authorised operator configuration; do not repoint local destructive guards at live data. Unsynchronised device work/keys are not reconstructed by a server restore.

Migration 007 is forward transactional/additive and tightens signup. Keep earlier data, snapshots, receipts and object context. On failure preserve rollback/error evidence; use a reviewed corrective forward migration. Roll back application deployment to a compatible build, not by dropping receipts/profiles or loosening verification. Never uninstall/reset a workspace to resolve a failure.

Account/company deletion and customer data export are not yet implemented. Before real data add authenticated, authorised, audited export/deletion covering relationships, objects, tokens, replicas, retention and backup expiry. Do not advertise a working control or purge quarantine until implemented/approved. Current local PDF downloads cannot be recalled.

## GitHub

Complete source and Git history bundle are supplied. Import with `git clone cleanproof-history.bundle CleanProof` into a new private checkout. For an existing GitHub repository inspect its history first; integrate on a feature branch, never force-push or overwrite. The intended private organisation/repository URL and authorised GitHub connection have not been provided, so no GitHub PR is claimed.

CI installs locked root/backend dependencies, scans complete history with matched values suppressed, checks host/schema and builds the private preview. It does not deploy or substitute for service/device testing. Require protected main/reviews and organisation-approved credential scanning. CI execution and immutable action-version pinning await repository setup. Proprietary LICENSE remains Sicy International Ltd. Exclude all credentials, databases, customer data, signing material, dependencies and temporary output. Pattern scan is not exhaustive; rotate/revoke any discovered secret before sharing and review history remediation without silent force-push.

Release guard: `npm run release:check -- PRIVATE_EVIDENCE_JSON`, using the exact tested HEAD and real evidence references; example evidence intentionally fails. It also requires management approval, non-demo flags and HTTPS. This is a check, not a deployment/approval substitute.

## Costs and commercial model

Actual expenditure £0. Synthetic staging may use Supabase Free within limits, manual paired backups and no uptime promise; free projects may pause. Supabase Pro starts at US$25/month before tax/usage, with credits covering one Micro; additional paid projects/compute increase costs. SMTP/domain/backup/monitoring costs depend on existing Sicy services and measured use. Cloudflare Pages offers free static hosting within plan limits. No zero-cost mail or backup service is assumed. Revalidate before spending; no exchange-rate or tax assumption applied.

The proposed £29/month/company excluding VAT is not activated. No trial duration, billing, subscription entitlement or real-data free pilot is enabled. A controlled free pilot must have server-enforced explicit grants and pass customer-data release gates first.

Official references reviewed 23 October 2026: https://supabase.com/pricing ; https://supabase.com/docs/guides/auth/auth-smtp ; https://supabase.com/docs/guides/auth/passwords ; https://supabase.com/docs/guides/platform/backups ; https://supabase.com/docs/guides/deployment/going-into-prod ; https://www.cloudflare.com/en-gb/developer-platform/products/pages/ .
