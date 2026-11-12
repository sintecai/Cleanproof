# Production migration execution — 2 November 2026

Approved input: commit b4c7fb0c807b9d94c689690dd17e15e44744aa4d, release/evidence/production-migration-plan.json. The nine source file hashes and bytes were checked against that commit before any application. Project identity: CleanProof-production / decysnpygturutfyjofi / SintecAI / Free / eu-west-2.

The existing project was resumed, not recreated. Fresh healthy-state history matched foundation/private_storage/sync exactly. History was checked against the expected prefix before each subsequent migration. All nine approved migrations succeeded in order; no reset, duplicate, unrelated migration, data erasure or paid service occurred.

| Source migration | Hosted version | Result |
|---|---|---|
| sync_hardening | 20261102042743 | Applied |
| access_recovery | 20261102042845 | Applied |
| orphan_maintenance | 20261102042946 | Applied |
| onboarding | 20261102042959 | Applied |
| hosted_function_privileges | 20261102043012 | Applied |
| checklist_field_validation | 20261102043025 | Applied |
| account_deletion_requests | 20261102043038 | Applied |
| account_erasure_lifecycle | 20261102043251 | Applied |
| erasure_session_guard | 20261102043302 | Applied |

Existing foundation/private_storage/sync versions remain 20261101113045 / 20261101113052 / 20261101113058. All twelve names and order were independently reread after execution. Evidence/production-execution-current.json preserves each approved hash, result and observed version; production-applied-results.json is the incremental execution record. The approved original plan remains unchanged as historical approval evidence; do not replay it blindly.

## Passed live checks

- Every public cp_* table has RLS enabled (zero missing).
- Anonymous role can execute zero public cp_* functions.
- Authenticated clients can execute zero cp_erasure_* service helpers and cannot use cp_private or select its erasure jobs. Anonymous clients also cannot select these jobs.
- cleanproof-private bucket is private, size limit 10485760 bytes, JPEG/PDF MIME allowlist.
- Real anonymous HTTP calls to cp_erasure_prepare, cp_erasure_session_active and cp_sync_register were denied with HTTP401 / PostgreSQL42501. No JWT, identity or bypass was supplied.
- Zero Auth users, companies, private objects and erasure jobs after execution. No account, company, device key or unsent work was deleted or changed.
- Fresh backend fixtures: 36 passed. Fresh application checks: 144 passed, one optional native SQLCipher driver skipped. Focused migration/restore/release guards: 10 passed (overlapping existing suites, not ten extra unique feature acceptances).

## Remaining security/acceptance limits

Security advisor no longer reports anonymous executable SECURITY DEFINER functions. It still reports 11 RLS-enabled tables without direct client policies (service/RPC-only) and 16 authenticated SECURITY DEFINER endpoints (the intentionally granted membership-checked RPC surface). These are not silently marked clean. Reviewed source fixtures exercise ownership/isolation, but fresh production two-account login, RLS and deletion acceptance remains pending Auth setup and authorised disposable-account execution. See https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy and https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable .

Live Auth settings: email enabled, signup enabled, mailer_autoconfirm false (Confirm email still ON), Google disabled. The source's intended immediate-signup policy is therefore not yet compatible with production. No signup was sent, no user was manually confirmed, and no password was changed. Supabase dashboard requires sign-in and no new administrator handoff was requested. Supported owner action: production Authentication → Sign In / Providers → Email → Confirm email OFF; save and recheck /auth/v1/settings, then use synthetic registration/session acceptance.

No Edge Functions are deployed in production. This execution changed only the nine authorised SQL migrations. photo-transfer/delete-account deployment, allowed origins, production sender/URL configuration, end-to-end erasure/recovery and operational restore remain separate release work. Existing staging functions and data were not touched. Production remains ACTIVE_HEALTHY, without a connected release client; status alone is not customer readiness.
