# Email/password-only increment — 25 October 2026

Baseline: 9ae850558b29b59bfc3ca32cf314e900a4cb6f6e from the canonical deployed Site repository, version 13. Git history, native storage, application data and migrations are preserved.

## Implementation

Removed the external social sign-in button, its messages and styles, environment/build flags, provider availability field, OAuth preparation and callback parsing module, dedicated callback route and static aliases, setup document, smoke-test provider status and obsolete tests. The common allowed-return-path validator is retained as returnDestination.ts. Email/recovery PKCE exchange, HTTPS callbacks and early URL scrubbing remain unchanged. Third-party copyright notices and credential-scanner signatures are retained; they are not authentication features.

Entry now presents Sign in, Create account and Forgot password. Confirmation resend remains an explicit recovery option. Duplicate signup/resend acknowledgements say that a request was accepted but delivery was not confirmed, and direct existing account holders to sign in/reset without revealing whether a supplied address exists. They do not claim that a message was sent or delivered.

No membership, owner role, RLS, entitlement, encryption or queued-operation changes were made. Browser sessions remain protected in IndexedDB with server user/membership revalidation before workspace access. Native SQLCipher, key storage and offline queues are untouched.

## Diagnosis

The original transport receiver defect and link-versus-code mismatch were corrected in earlier commits. Actual hosted Auth URL/SMTP settings remain outside the installed connector's configuration surface; the prepared staging.auth.patch.json has not been applied. It now contains only the two email callback allowlist entries, with verification enabled.

Fresh Auth logs on this turn showed signup/resend acknowledgements at 08:41:32/08:41:46 UTC, and no new normal password-login request after the previously reported invalid-credentials attempt. Earlier database inspection found one account already confirmed at 08:07:14 UTC. Repeated signup/resend HTTP 200 responses do not prove new account creation, delivery failure or successful authentication. Do not substitute confirmation resend for signing into an existing verified account.

## Exact owner-controlled settings still required

The installed tools cannot read/update hosted Auth URL, templates or SMTP credentials, and no transactional email provider/DNS account is connected. No administrator browser recovery was started.

1. In existing project vmvoeksprlwjiwfxqita Authentication URL settings, set Site URL to https://cleanproof-sicy-preview.grassyelf128.chatgpt.site. Review/merge the exact email callback entries from deployment/staging.auth.patch.json:
   - https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/email-callback.html
   - https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/reset-password.html
   Remove obsolete social callback entries when reviewing the allowlist; no wildcard is needed. Keep local-development localhost configuration separate.
2. Confirmation and recovery templates must use {{ .ConfirmationURL }} and link-based wording. Retain email verification. Old emails cannot be repaired by a new deployment; use a fresh eligible request after settings are saved.
3. For public customer delivery, configure a transactional SMTP sender in the existing project's secure SMTP settings: provider host, TLS port, SMTP username/password, verified From address and sender name. Enter secrets directly in those protected settings. Authenticate the owned sending domain with the provider's exact SPF/DKIM records and reviewed DMARC policy. No domain/provider choice, DNS write or purchase was made; existing-provider/domain information is needed before configuring or estimating costs. Supabase's default mail service is restricted and not a production sender.

## New checks and limits

TypeScript passed. 86 host tests passed, one SQLCipher driver test skipped. Seven build/config/bootstrap tests passed. Browser export passed.

Actual same-project browser build displayed only email/password controls; no removed provider button/message. Existing private staging URL was opened in the cloud browser and displayed the separate ChatGPT hosting sign-in gate, before the CleanProof form. Customer credentials have not yet been entered. The gate was not bypassed, changed or treated as Supabase authentication. A secure user handoff is required for that exact blocking page before deployed confirmed-account testing can proceed.

Actual staging smoke checks: nine passed (email Auth settings, incorrect credentials, invalid synthetic bearer, anonymous RPC denial, anonymous private-object listing without data, Edge authentication and two CORS cases). None is successful account-login acceptance. No new registration or resend mail was sent by the agent this turn. Test output was tied to the baseline commit plus the legitimate working-tree changes before commit; this record identifies that provenance rather than pretending it was already a committed delivery.

Pending: existing confirmed-account password sign-in; new authorised test mailbox registration/delivery/confirmation; recovery; real session reload/refresh/logout; company onboarding; two-account isolation; Add Site and inspection/photo/action/report workflows after login. Native/device and recovery gates remain separate. Customer readiness is not established.

## Delivery

Feature branch: feature/email-only-auth. Canonical Site source is pushed before private deployment. GitHub sintecai/Cleanproof remains empty when inspected; complete source plus history is prepared, but no GitHub PR or history-preserving GitHub push is claimed. No paid services, new projects, data resets or access-policy changes. Expenditure £0.
