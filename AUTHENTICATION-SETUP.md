# Immediate email/password signup — 26 October 2026

Current requirement: create an account and access onboarding without opening an email. This supersedes earlier instructions requiring confirmation for new web/native registrations. Google remains removed. Recovery remains an independent protected email flow.

## Current saved policy and outstanding recovery configuration

Confirm email OFF, email/password enabled and signup enabled were independently observed through the hosted /auth/v1/settings endpoint and real immediate-session signup. No further signup-policy switch is required. Older reports that the switch remains ON are historical.

The original account remains confirmed. Duplicate registration does not change its password. A rejected password login requires normal sign-in or a separately authorised recovery process, not more registration or confirmation emails.

The installed Supabase connector does not expose hosted Auth configuration. Authorised dashboard access later became available: the Site URL and single recovery redirect were saved and reread; see VERIFIED-AUTH-URLS.md. The dashboard uses default email templates (custom SMTP is not configured for editable templates). Fresh recovery completion and public-customer delivery remain unverified.

## Implementation

registerImmediately first reads the actual service settings. If signup is disabled or confirmations remain required, it stops before sending /signup and reports CP_SIGNUP_POLICY. It does not create another confirmation-dependent account or send another verification email. Once the policy is saved, it submits name/email/password to GoTrue. A real complete response is validated and saved through protected session storage before onboarding; storage failure, interrupted lifecycle or malformed/partial tokens cannot claim success. If the accepted response contains no usable session, access stays locked and the user is directed to normal Sign in. No local success flag substitutes for a server session.

Both customer web entry and native onboarding collect full name, email, password and matching confirmation. Signup confirmation UI/resend controls are removed. Legacy email-callback route/exchange helpers are retained only for previous messages/local test compatibility. Password reset remains at /reset-password.html; it still requires a valid server recovery code and PKCE verifier. Registration does not request a mail link or PKCE email transaction.

Passwords require 12–256 characters; failed operations clear password form state. Duplicate registration is presented neutrally with Sign in/Forgot password choices, not a claim that an address has an account. The service's public endpoint can have account-existence implications when auto-confirm is enabled; generic UI is not a guarantee against direct API enumeration. Server rate limiting/CAPTCHA and threat review remain required before public rollout.

## Existing accounts and server onboarding

Fresh read-only inspection found one account and zero unconfirmed accounts. No existing account needs a confirmation transition today; none was deleted, recreated, confirmed manually or changed. Do not assume disabling Confirm email retroactively updates prior unconfirmed users. If such an account later exists, sign-in may return email_not_confirmed; the app shows an account-policy/support error. Preserve it and use a documented owner-reviewed Supabase-supported recovery/confirmation procedure after authenticating the claimant; never bulk-confirm records, auto-link a matching email or use an email alone as proof of identity. No automatic migration of prior unconfirmed users is implemented or needed for the observed database.

With Confirm email disabled, Supabase auto-confirms newly created accounts. The existing server cp_verified_owner_identity guard still checks the authenticated auth.uid() row's accepted/confirmed state. That server field is not proof of mailbox ownership under the new policy. Keeping the guard preserves rejection of old unconfirmed identities. cp_register_company grants owner only to the authenticated creator, serialises/replays request IDs safely and does not discover/join another company from email. Existing active memberships and RLS/site permissions remain unchanged. No migration loosens tenant security. Staff invitations/email-based automatic linking are not implemented or enabled.

## Abuse protection

The source blocks duplicate in-flight submissions; a new device-memory gate permits at most five attempts per minute per operation (signup/signin/recovery). It stores no email/password and displays a wait message. This is a UX throttle and can be bypassed by restarting/reloading; it is not a server security boundary. Supabase's server-enforced Auth rate limits remain in force; the adapter handles HTTP 429 safely. Owner must review Authentication → Rate Limits and Attack Protection for the intended public audience. A server-verified CAPTCHA with a matching frontend challenge is a separate public-release blocker if abuse cannot be contained by the existing Auth limits. No CAPTCHA is claimed configured and no fake challenge/token is supplied. Never disable existing CAPTCHA/rate checks to obtain a test pass.

## Recovery and URLs remain separate

Site URL: https://cleanproof-sicy-preview.grassyelf128.chatgpt.site
Allowed callback: https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/reset-password.html
The legacy email-callback route remains in source but is not required or newly allowlisted for immediate signup. Avoid wildcard/localhost deployed redirects. Recovery template: supabase/templates/recovery.html using {{ .ConfirmationURL }}. Keep explicit HTTPS redirect_to, PKCE and URL scrubbing. The hosted Site URL and single recovery allowlist entry were saved and reread in the dashboard. Full fresh recovery and SMTP customer-delivery acceptance remain pending.

Forgot password still requires functioning transactional SMTP (host/TLS port/username/password/verified sender), owned-domain SPF/DKIM/DMARC and provider quota/suppression checks. Enter secrets in secure settings, never frontend/Git/chat. A mailbox typo at signup can prevent later recovery; do not reset a password because a caller merely knows an email. The owner chooses a new password personally through the valid recovery callback. Removing signup verification does not fix the historical rejected credential pair or repair email recovery. Password reset does not recover missing device-only encryption keys.

## Local and deployed acceptance

Local optional profile supabase/config.immediate-signup.example.toml enables signup and disables confirmations in a disposable Docker stack; merge it deliberately without resetting valuable data. The original local confirmation-code profile is retained for legacy harness tests, not the new customer flow. AuthConnection.signUp still supports legacy local calls, while customer screens always use registerImmediately.

Required deployed sequence after saving Confirm email OFF: inspect settings → new owner-authorised synthetic email/password signup → real session → onboarding → create company → customer/site → inspection/photo/report → logout → same-credential login → reload/refresh → incorrect-password rejection → second independent account/company isolation. Do not use repeated signup of the already-confirmed existing account as this test. No new synthetic mailbox is used without authorisation. No accepted request, fixture test or rendered form proves this acceptance.

Official references: https://supabase.com/docs/reference/javascript/auth-signup ; https://supabase.com/docs/guides/auth/passwords ; https://supabase.com/docs/guides/auth/rate-limits ; https://supabase.com/docs/guides/auth/auth-captcha .

## 2 November release clarification

The saved signup/redirect statements above concern existing **staging**, not the new production project. CleanProof-production decysnpygturutfyjofi remains partially migrated and paused. No hosted production Email/SMTP/URL settings or recovery delivery have been verified. Do not copy a staging origin into production or infer that a source build saves provider settings. Follow release/OWNER-ACTIONS-CURRENT.md. Native recovery lifecycle handling was corrected without changing the form, PKCE policy, password semantics or mandatory-confirmation policy; installed complete-reset acceptance is pending.

## Production migration follow-up

The nine approved missing migrations were subsequently applied successfully; production now has all twelve and is ACTIVE_HEALTHY. This supersedes the preceding paused/partial-schema status, not the distinction between staging and production Auth. Live production settings still show mailer_autoconfirm=false; the dashboard requires sign-in. Confirm email OFF, sender configuration, exact approved production HTTPS origin, native callbacks and actual recovery acceptance remain owner/service gates. No password, account or staging setting was changed.

## Production functions follow-up (current)

Both production functions are now ACTIVE version1 with verify_jwt=true and environment-specific CORS; negative permission/origin checks passed. Production's immediate-signup policy and positive recovery/two-account acceptance are still blocked pending administrator settings. No further sign-in handoff or credential request is authorised. ADMINISTRATOR-RUNBOOK.md gives the exact independent Email toggle, public callback values and secure sender setup; this supersedes older handoff suggestions.
