# Superseded customer signup policy — historical

# Authentication setup and acceptance

26 October 2026. Email/password only; Google controls, flags and dedicated callback are removed. Shared email PKCE processing remains. This file supersedes historic numeric-code instructions for deployed web customers.

## Evidence and limits

Verified from source/build: registration, sign-in, resend, password-reset request, PKCE callback exchange, early URL scrubbing, protected browser session storage, server user/membership revalidation and resumable owner onboarding RPCs are implemented. Build uses deployment/staging.public.json: project vmvoeksprlwjiwfxqita. Hosting runtime environment inspection on 26 October returned revision 0, no entries; this is expected for the static build's embedded public configuration, not proof of missing backend settings. Google is absent from customer source/build controls.

Historical actual backend evidence on 25 October: exactly one account, already confirmed at 08:07:14 UTC (13:37 IST); repeated signup at 11:17:49 UTC emitted user_repeated_signup, resend at 11:18:11 returned 200, original confirmation-sent timestamp remained 08:07:01 UTC. Re-registration was not a new account or proof that mail was sent. A user-entered secure normal login reached /auth/v1/token at 11:25:26 UTC (16:55 IST), returned HTTP 400 invalid_credentials and showed an error. That account does not require another confirmation; use its correct existing password or authorised recovery. Do not delete/recreate it, reset its password administratively or disable verification.

No successful current password login, new-account delivery, recovery or authorised workspace acceptance was demonstrated. Hosted SMTP, template and Site URL values were inaccessible: the available connector has no Auth-config API; direct dashboard navigation redirected to sign-in. Provider identity, enabled state, credentials, quota/suppression and DNS remain uninspected. Do not describe SMTP as absent or provider delivery as failed without evidence. HTTP 200 is request acceptance, not generated mail, provider acceptance or inbox receipt.

## One consolidated owner-controlled setup

Use the existing project only: https://supabase.com/dashboard/project/vmvoeksprlwjiwfxqita

1. Authentication → URL Configuration. Set Site URL to https://cleanproof-sicy-preview.grassyelf128.chatgpt.site. Review/merge these exact redirect entries (no wildcard):
   - https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/email-callback.html
   - https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/reset-password.html
   Remove obsolete deployed localhost/social callback entries after checking unrelated legitimate clients. Local development localhost configuration stays in the local config, not as a deployed default.
2. Authentication → Emails → Templates. Set Confirm signup to supabase/templates/confirmation.html and Reset password to supabase/templates/recovery.html. Both use {{ .ConfirmationURL }}. Keep email confirmations enabled. deployment/staging.auth.patch.json is the exact desired patch, not a record of an applied hosted change. Fresh links are needed after settings correction; an old email is not repaired by redeployment.
3. Authentication → Emails → SMTP Settings. Inspect the current sender before replacing it. For customer delivery configure an existing suitable transactional SMTP provider. Required secure fields: SMTP host, TLS port, username, password, verified From address and sender name CleanProof. Enter secrets directly in provider/Supabase secure settings; never chat, Git or EXPO_PUBLIC variables. Check production/sandbox recipient restrictions, sender verification, send quota, provider suppression/bounce status and rate limits. Disable email link rewriting/tracking.
4. In the owned domain's DNS, publish the sending provider's exact DKIM CNAME/TXT records and SPF return-path records; merge SPF mechanisms where applicable rather than creating duplicate SPF TXT records. Review DMARC alignment/policy and its reporting address with the domain owner. The sending domain/provider is not specified or connected, so exact record names/values cannot be invented. Use an existing sender first; any new charge needs approval. Supabase's default sender is restricted to team addresses and low-volume best-effort testing, not public customer signup.

Official references: https://supabase.com/docs/guides/auth/auth-smtp ; https://supabase.com/docs/guides/auth/redirect-urls ; https://supabase.com/docs/guides/auth/auth-email-templates . Recheck current provider limits before release.

## Callback implementation

- app/email-callback.tsx and app/reset-password.tsx are real Expo routes delegating processing to src/application/CustomerEntry.web.tsx.
- scripts/static-route-entries.mjs emits email-callback.html and reset-password.html plus /email-callback/index.html and /reset-password/index.html from the actual application entry after export. These HTML files are generated outputs, not hand-built mockups; generated dist is excluded from source delivery.
- scripts/auth-return-bootstrap.mjs executes before app assets, captures one bounded PKCE code/error in transient memory, strips sensitive query/fragment data with replaceState and rejects legacy implicit-token formats. Avoid analytics/logging full callback URLs.
- Registration/resend/recovery persist an encrypted transaction with origin/backend/purpose and a random verifier before requesting a link. Requests include exact redirect_to plus S256 challenge. The callback exchanges the code with its verifier, persists a validated session, checks server identity/membership, then routes to onboarding or an authorised business destination. Do not mix token-hash, OTP or implicit-token handlers into this flow.
- Different browser/device: confirmation may already have verified the account, but without this browser's verifier it cannot complete sign-in. Show the implemented password-sign-in route; recovery must be freshly requested/opened in the same browser. Never weaken PKCE or accept arbitrary return URLs.
- Verification codes retained in supabase/templates/local/ are exclusively for the isolated local/native legacy test harness, configured by local TOML. Do not copy those templates into deployed web email settings.

## Existing account sign-in and recovery procedure

1. Use Sign in, not Create account, for the confirmed account. Enter credentials securely in the application. A rejected pair must not be relabelled a network problem or fixed by resending confirmation.
2. If recovery is needed, first complete/verify the owner SMTP and redirect settings above. In the deployed app choose Forgot password and submit once. Use an authorised mailbox only. Record the Auth request status and provider event ID privately; neither proves inbox receipt.
3. Open the fresh reset link in the requesting browser. Verify the HTTPS reset-password callback; the user personally chooses/submits the new password securely. The recovery session is separate and memory-only, not normal company access. The app updates the password, attempts recovery-session revocation, then asks for normal sign-in.
4. Verify correct password sign-in, server-validated membership/onboarding, reload/refresh, logout and denial of protected routes. Do not print session tokens or mail links.
5. Password recovery does not restore lost local encryption keys, cleared browser storage or unsynchronised records. Preserve legacy demo storage separately; adoption requires explicit review.

## Controlled new-account delivery acceptance

Use a genuinely new owner-authorised synthetic mailbox, not another signup for the confirmed account. After configuration, make one registration and trace: browser request → Auth new-user/audit event → provider acceptance/rejection/suppression → actual inbox receipt → HTTPS link → account confirmation → valid session → onboarding → first customer/site/inspection. Record each as a separate outcome. Test resend cooldown, expired/reused link, wrong password and recovery without repeatedly sending messages. Then use two independently authenticated accounts to test company/site/photo isolation and reload/logout. Private hosting's ChatGPT gate is separate and can obstruct callbacks; do not silently change its audience.

Pending external inputs: authorised settings access; existing transactional provider and owned sending domain/DNS; a genuinely new authorised mailbox; secure user participation for account/password actions. None should be supplied as secrets in chat. No Google setup is required.
