# Production-oriented increment — 23 October 2026

Baseline d2fc435cf13560c1cd0ee186cb0962248b530f35 is the latest committed source with Stitch UI and bundled backgrounds. The execution workspace refreshed during preparation; the canonical private Git repository was restored, the uncommitted increment recovered, and checks rerun. No older source ZIP was substituted. No data reset or history rewrite.

## Implementation checklist

- Implemented: registration/resend/numeric verification, recovery and sign-out through real Auth APIs; /onboarding screen replaces Account navigation. Missing services show unavailable, never simulated success.
- Implemented: forward Supabase migration 007; confirmed-email owner registration, empty company/profile, durable per-user request receipt, transactional rollback, RLS and unverified-account guard on the older company RPC.
- Implemented in source: fresh owner company workspace in separate encrypted storage, authorised server profile lookup, user/company-bound local identifiers, genuine local owner/branding rows, queued events, source-encrypted retry checkpoint and final activation only after fresh membership/lease checks. Old records, photos, history, keys and pending work are not copied or deleted. Target preparation/activation failures preserve the old selection and protected target for retry. An existing target bound to another identity is rejected. This is not general multi-account switching.
- Implemented: demo seeding now requires explicit DEMO_TOOLS=1. Non-demo unbound installs enter account setup, with explicit reviewed legacy adoption available separately. Old unbound data is preserved, not cleared. Local diagnostics/demo routes are not a release entitlement system.
- Implemented: company branding is read when new inspection context is created rather than inheriting the synthetic company name. Earlier snapshots remain unchanged.
- Implemented: GitHub CI, high-confidence Git-history/working-tree secret scan, environment examples and a release-evidence guard.
- Pending: actual Auth/REST/Storage/Edge and mailbox integration, fresh native/browser account-to-workspace acceptance, two real client sync, actual paired restore/cleanup and Android/iOS acceptance.
- Pending implementation: team invitation lifecycle, manager role across every policy/RPC/lease, staff-site administration UI; current roles remain owner/inspector. Company logo lifecycle/profile editing and explicit migration for legacy server companies missing profile rows.
- Pending implementation: issued immutable report versions, protected scoped access, expiry/revocation/logging. Current local PDFs are not issued reports or revocable links.
- Pending implementation: server-enforced manual-pilot/trial entitlements, deletion/export workflows and approved privacy/service policies. No billing or trial period is activated.
- Pending: supported dependency remediation, private GitHub target/access and Sicy-owned staging service access.

## Evidence boundaries

Fresh host tests cover signup/verification cancellation, fresh empty workspace, receipt/storage rollback, source preservation and activation retry checkpoint. They use synthetic server responses to test client failure boundaries and do not prove real Auth. PostgreSQL fixture tests cover migration/ownership/idempotency/RLS and rollback; they do not run Supabase Auth, PostgREST, Storage or Edge. Full native encryption remains a physical-device gate.

The recovered fresh run passed 70 host tests with the external SQLCipher driver configured (zero skips), plus 22 backend fixture tests. A first recovered run without that environment passed 68 of 69 with the optional cipher test skipped; it was not represented as cipher acceptance. The subsequent activation checkpoint test increased host count to 70. See the final delivery record for exact final run results. TypeScript, web build and secret scan are checked separately. CI is prepared, not executed on GitHub.

## Remaining acceptance and release decision

Staging-only development candidate; not approved for a real-data pilot or production. The existing private HTTPS Site is a synthetic local demo, NOT connected staging. Actual service acceptance is blocked by no local Docker/Auth listener and no authorised hosted backend configuration. Native execution is pending equipment. Before real data, prove new-account startup, separate workspace reopening, existing-data upgrade, both queues/photos, loss/retry/conflict/scope behaviour and recovery against actual services. Do not mark Synced before existing engine receipts and required transfers finish.

No real invitation, paid service, public deployment or payment was performed. Actual expenditure £0. Secure report access and commercial activation follow the underlying service/recovery gates.

## Browser unlock recovery — 23 October 2026

User screenshot showed AES-GCM workspace unlock failure. The previous Retry
button reused the same in-memory passphrase, leaving no way to correct it.
Browser failure recovery now returns to the existing passphrase form, unmounts
the workspace, and clears only the in-memory passphrase. No IndexedDB records,
attachments, profile selection, encryption parameters or native keys are changed.
The original passphrase is still required; this is not a password reset or proof
that the encrypted snapshot is healthy. Never clear site data to bypass failure.
TypeScript passed. User retest on the existing HTTPS private preview is pending;
native security and real-service acceptance remain separate and pending.
Connected Supabase project listing returned no projects; no remote migrations,
functions or resources were created by this increment.
