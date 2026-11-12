# Credential concern, authentication and release acceptance

26 October 2026. Baseline b701ef9316796b6342511bb35f10e927e34892cc; see SOURCE-COMMIT.txt for the final hardening delivery commit. Google remains removed. No user password, mail link, token, cookie or SMTP secret is included in this report.

## Findings and boundaries

No confirmed credential compromise was found. This is not a declaration that no exposure occurred. The inspection covers available source/history, generated static assets, configuration names and targeted redacted Supabase logs. It cannot inspect another device, password-manager sync/autofill, mailbox security/provider delivery events, ChatGPT internal systems or cloud-browser internals. Arbitrary private passwords cannot be reliably recognised by a pattern scan. No personal credentials were requested or entered during this investigation. No global revocation, reset, account deletion, verification bypass, destructive history rewrite or key rotation was performed.

Available Git history was scanned for private keys, common provider tokens and service-role JWTs with matching values suppressed. No matching secret was found before the change. No production .env/signing key/runtime database is tracked. Public Supabase URL/publishable key are expected client configuration; connected project keys match the packaged key. They are not service-role credentials. The scope does not include unavailable pruned local-only commits, previously shared screenshots or third-party telemetry outside the inspected project.

Manual source review: account passwords are supplied in HTTPS Auth request bodies and held transiently in form state; they are not written to application localStorage/IndexedDB/SQLite, diagnostics, URLs or source analytics. The browser stores validated session tokens and pending PKCE transactions encrypted with a nonextractable AES-GCM key in IndexedDB. Nonextractable does not make the same-origin application immune to XSS; scripts on this origin can invoke the key. Workspace keys are separately protected and account-bound. Native session records are in SQLCipher. Browser localStorage contains profile identifiers/markers, not password/session-token values. No application analytics/error-collector integration was found in the inspected auth path. Hosting/provider logs are outside complete source control.

## Concrete source defects/risk paths corrected

1. returnDestination.ts formerly retained arbitrary query parameters for authorised business paths. It now preserves only bounded, single-valued business keys (id, item, site, action, create, search); credential/auth/nested-return parameters and fragments cannot be carried through the intended-destination field.
2. auth-return-bootstrap.mjs now also strips unexpected password/client-secret/API-key/authorization parameters and off-route code parameters before app assets execute. Only a legitimate callback's single PKCE code is captured transiently; values from unsupported links are not reflected or persisted. This cannot undo URLs already seen by hosting logs, browser sync or an external screenshot.
3. CustomerEntry.web.tsx previously retained failed-submit passwords in React form state and retained them when switching to recovery/resend. Password/confirmation fields now clear after every submitted operation, including failures, and on those mode switches. Other business data is unaffected. JavaScript cannot guarantee physical memory zeroisation or prevent a user's independent password manager from offering/syncing credentials.
4. session.ts requests explicitly omit ambient cookies, browser cache storage and referrer headers. Session state is still saved only through the existing protected storage. Password/token bodies remain necessary for the intended HTTPS Supabase endpoint; no proxy or third-party destination was added.

These are real defensive corrections, not evidence that any one caused the reported other-device event. If the notification arose during cloud-browser sign-in, OpenAI documents that cloud browser runs on a separate computer; that can explain a different device indication, but does not by itself establish the event was authorised. Compare the service's own event time/device information without sharing secrets.

## Actual authentication evidence

Fresh read-only aggregate: one account, one confirmed, last sign-in timestamp 25 October 08:07:14 UTC, recovery_sent null. Prior real user-entered /token attempt at 25 October 11:25:26 UTC returned 400 invalid_credentials. Later packaging-run /token and /user failures are synthetic negative probes, not additional personal-login attempts. The confirmed account does not need another confirmation; duplicate registration events are user_repeated_signup. No successful current customer session or full workflow is claimed.

Hosted configuration inspection: public URL/key pair matches project vmvoeksprlwjiwfxqita; hosting runtime variables revision 0 contains no entries (static build embeds public config). Hosted SMTP, sender, quotas/suppression, email templates and URL allowlist are not exposed by the installed tools; previous direct dashboard attempt required owner sign-in. No unrelated administrator recovery was started. Values remain unknown, not assumed disabled or fixed. Actual mail generated/provider acceptance/inbox receipt are separate unverified stages.

## One owner-controlled configuration procedure

Existing project: https://supabase.com/dashboard/project/vmvoeksprlwjiwfxqita

- Authentication → URL Configuration: Site URL https://cleanproof-sicy-preview.grassyelf128.chatgpt.site. Allow exact /email-callback.html and /reset-password.html under that origin; review obsolete localhost/social entries without deleting unrelated valid native clients. No wildcard.
- Authentication → Emails → Templates: use supabase/templates/confirmation.html and recovery.html, both {{ .ConfirmationURL }} links. Keep confirmation enabled; local numeric fixtures are not customer templates.
- Authentication → Emails → SMTP Settings: inspect current provider first; use an existing suitable transactional sender. Secure fields are host, TLS port, username, password, verified From address and sender name. Enter these in the dashboard/provider secure settings only. Check sandbox/recipient restrictions, sender verification, quotas/rate limits and suppression/bounce events; disable link tracking. No new paid service is authorised.
- In owned DNS, use the chosen provider's exact SPF/return-path and DKIM records and reviewed DMARC alignment/reporting. Do not invent values or add duplicate SPF records. Provider and sending domain are not yet identified, so exact DNS values cannot be specified.
- Verification: one authorised recovery request for the confirmed account, correlate redacted Auth timestamp and provider message/event ID, actual inbox receipt, same-browser HTTPS callback, user-controlled password entry, then login. Separately use a genuinely new authorised synthetic mailbox for registration/confirmation/session/onboarding. No repeat registration of the confirmed account.

## Safe credential response — owner actions, not actions executed

First identify which service's credential is suspected using only the service name and event time; do not paste a password or full recovery URL. If reused elsewhere, change affected reused credentials directly at those services using unique passwords. Do not rotate unrelated project keys merely because a device notification appeared.

For CleanProof: use its Forgot password flow only after sender/callback configuration is verified. The owner enters the new password personally in the deployed application's reset-password page; password recovery cannot recover a lost device-only encryption key. Current Sign out calls /logout?scope=local, clearing this saved session, and reports server revocation failure; it is not a global revocation control. If global Supabase logout is requested, explain that all devices must sign in again and unsent work remains device-only; obtain explicit authorisation before using a properly authenticated supported global sign-out operation. Already-issued access JWTs can remain valid until expiry. No global control was silently added or executed.

If the concern is the OpenAI/ChatGPT account: Settings → Security and login → Security history / Active sessions. Review the event against your actions. Owner-controlled global logout: Settings → Security and login → Active sessions → Log out all → confirm Log out of all devices. It ends the current session too and can take up to 30 minutes elsewhere. Choose this yourself only after reviewing the impact; the agent has not performed it. Password change: Settings → Account → add/update password, or use Forgot password from ChatGPT login in a private window. Social-login passwords must be changed at their identity provider, not in CleanProof. Contact OpenAI Support through the official Help Center if unexplained activity remains; do not submit secrets.

Official references reviewed 26 October:
https://help.openai.com/en/articles/8304786-keeping-your-openai-account-secure
https://help.openai.com/en/articles/4936828-resetting-or-changing-your-chatgpt-password
https://help.openai.com/en/articles/20001280-using-cloud-browser-in-chatgpt
https://supabase.com/docs/reference/javascript/auth-signout
https://supabase.com/docs/guides/auth/auth-smtp

## Focused production review

Access controls: source/RLS tests protect company/site relationships and private object paths; fresh hosted advisor reports ten RLS/no-policy INFO entries for RPC-only internal tables and sixteen authenticated SECURITY DEFINER WARN entries requiring review of intended membership-checked RPCs. Do not disable RLS or blindly revoke business RPCs to hide warnings. Leaked-password protection is disabled per advisor; it is a breached-password prevention setting, not proof this password leaked. Hosted setting availability/plan must be reviewed before enabling or incurring costs. Advisor guidance: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

Dependencies: fresh npm audit reports eight affected package entries (five high, three moderate), no critical. The suggested Expo 44 downgrade is unsupported for the existing Expo 58/RN/SQLCipher application and was not applied. Current advisory URLs/affected packages are in docs/DEPENDENCY-REVIEW-2026-10-26.json. Compatibility remediation remains a release gate. Actual paired DB/object restore, native acceptance, production monitoring and issued secure client reports remain open. Fixtures or source scripts are not recovery acceptance.

## Acceptance matrix

Passed: exact baseline/history preserved; public project/key pairing; no Google UI code; targeted credential-pattern scan (limited); URL/bootstrap/HTTP protection tests; typecheck and host tests; web export. Fresh results: 88 host tests passed with one optional SQLCipher-driver test skipped; 23 backend fixtures and 9 configuration tests passed; web build succeeded; 9 real-service negative/availability probes passed. These do not establish successful customer authentication.

Failed: latest actual confirmed-account password login, 25 October, invalid_credentials (historical, no new personal retry). Production dependency gate has unresolved advisories.

Blocked/not run: positive new registration/mail receipt/confirmation/session; existing user successful login; password recovery/change; two real authenticated companies; post-login site/inspection/photo/report workflow; actual paired restore; Android/iPhone runtime acceptance. SMTP/provider/DNS settings access, an authorised new mailbox and secure user participation are required. No personal credential handling is needed to continue independent source work.

Release recommendation: staging security-hardening increment only; not customer-ready or production-ready. Expenditure £0. No global session revocation, account/data reset, verification bypass, Google setup, paid service or public-access change.
