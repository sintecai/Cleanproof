# Email link authentication correction — 25 October 2026

Supersedes earlier instructions to use numeric confirmation/recovery templates in the web customer entry. Native development OTP methods remain available; native acceptance is unchanged.

## Evidence and root causes

Baseline recovered from the canonical Site repository at 19db202302d706b99f638b16b9ac8503d4fe335b; Site version 12. GitHub sintecai/Cleanproof was inspected through its connected tool and is still empty. No older ZIP was used as the baseline.

The user's screenshot evidence reports an arrived confirmation email whose link redirects to localhost:3000 with authentication information. Its sensitive URL was not opened, copied, replayed or committed. Sanitised actual Supabase Auth logs show POST /signup HTTP 200 at 2026-10-25 08:07:02 UTC and /verify HTTP 303 at 08:07:14 UTC. These establish an accepted request and a verification redirect, not a complete application login. They support the user's finding that email delivery is not the primary failure in this example.

Source inspection found signup, resend and recovery requests omitted redirect_to and PKCE challenge options. The customer UI then required numeric codes, although the delivered template uses a link. The callback only implemented Google PKCE; it did not handle email verification or recovery. The web session was memory-only and was lost on reload.

Live /auth/v1/settings still reports HTTP 200, email enabled, verification required, Google disabled. The deployed configuration also keeps Google disabled. This is separate from the email redirect defect.

Hosted Site URL, redirect allowlist and email template values cannot be read or changed using the installed Supabase tools. Their exact current contents were not independently obtained. The localhost target is evidenced by the user's report; do not present a guessed dashboard read as a verified configuration change. Administrator browser recovery/sign-in was not restarted.

## Implemented web flow

Signup/resend request a confirmation link using explicit HTTPS redirect_to and S256 PKCE challenge. The web form says to click the link and has no email-code input. Recovery requests a password-reset link with a separate recovery transaction and callback. Tokens/hashes/implicit fragments are not interchangeable with PKCE codes.

Callback entry files are explicit .html assets to avoid static-directory redirects losing query parameters before JavaScript runs. Native Expo route files still exist and the bootstrap normalises these paths for the application router. The build also retains existing static route entries. Callback bootstrap executes before app assets, captures only one bounded PKCE code/error presence in transient memory and scrubs query/fragment values with history.replaceState. It never accepts old implicit access/refresh tokens as a session, echoes backend error_description or writes callback secrets to logs/storage. A no-referrer meta policy prevents callback URL referrer propagation from the app document. Hosting access logs are outside this client-side guarantee.

Email PKCE transactions are encrypted in IndexedDB with an origin-profile, non-exportable AES-GCM key and backend/purpose authenticated context. Another tab in the same browser can read its pending transaction. It is consumed before exchange; duplicate/reused/expired/cancelled/wrong-service callbacks fail closed. On a different browser/device, an email may already have been confirmed by Supabase, but the verifier is unavailable: the app gives a clear email/password sign-in step. Recovery needs a fresh link requested in that browser. It never falls back from PKCE to implicit authentication. If a code exchange response is lost, start sign-in or recovery afresh rather than replaying a consumed code.

A recovery session remains in memory, separate from normal persistent authentication, and opens only the password-change form. After a successful password change, the recovery session is signed out and the customer signs in again. A failed password update retains entered fields. Do not equate password recovery with recovering unavailable device encryption keys.

Browser sessions are now encrypted in IndexedDB, scoped to the backend. Reload restores the session, refreshes an expiring token as needed, and calls /auth/v1/user plus RLS-controlled membership lookup before opening any workspace. Backgrounding locks visible workspace/key access; foreground recovery requires the server again. Browser offline resume is not added by this change; native offline/SQLCipher behaviour is unchanged. Browser encryption keys stored in an origin profile are not hardware-backed and do not defend against XSS or a compromised browser profile.

Logout clears the entry session when the application's account-lock event is issued. A failed durable session clear is reported; inspection data, attachment keys, migrations and unsent queues are not deleted. Simultaneous-tab refresh rotation and full logout/reload acceptance still require real-service testing. No company memberships or roles were edited. Existing server cp_register_company creates the initial owner using verified auth identity and an idempotent receipt; membership authorisation remains server-controlled.

## Required one-time backend action (not applied)

Review deployment/staging.auth.patch.json against the existing hosted Auth configuration, then apply its Site URL/template settings and merge the exact required redirect entries with any independently reviewed legitimate origins. This is a desired configuration, not evidence that a patch was applied. Do not blindly remove unrelated legitimate settings or weaken email verification.

Site URL: https://cleanproof-sicy-preview.grassyelf128.chatgpt.site

Exact new redirect entries:

- https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/email-callback.html
- https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/reset-password.html
- https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/auth-callback.html

Keep existing /auth-callback and /auth-callback/ only for already reviewed Google compatibility. No wildcard allowlist is required. Keep localhost defaults in local development configuration, not as the deployed Site URL.

Confirmation and recovery templates should use {{ .ConfirmationURL }}, not {{ .Token }} and not a manually constructed localhost link. This maintains the existing confirmation-link delivery style while GoTrue supplies the validated redirect and PKCE flow. Templates in the desired patch contain links and no numeric-code instruction. No SMTP change is required to explain the already delivered example. Retest delivery independently after a new request; old emails cannot be repaired by a new deployment.

Google remains a separate missing provider action: inspect/reuse a Sicy-owned Google Web OAuth client, basic openid/email/profile scopes, and External audience. General customers require appropriate production publishing/verification; staging test users alone do not establish general access. Google provider callback remains https://vmvoeksprlwjiwfxqita.supabase.co/auth/v1/callback. The app's post-auth redirect is now /auth-callback.html on its HTTPS origin. Enter the client secret only in secure Supabase provider settings. Enable the frontend flag only after live provider configuration is verified and test actual Google sign-in. No personal administrator login is used as customer authentication.

## Exposed test session

Do not send or reuse the screenshot URL. The affected session was not revoked: the installed connector exposes no supported Auth admin session-revocation operation, and the affected user/session cannot be identified safely from screenshots without processing its secrets. Use the supported Supabase admin sign-out/session controls in a secure administrator context for that exact test account, or have the account perform a global sign-out. Do not rotate unrelated project keys or clear workspaces. Previously issued access JWTs can remain valid until expiry; revoking refresh sessions is not a claim of instant JWT invalidation. Signed-client access tests must account for that boundary.

## Actually tested

- TypeScript passed; 88 host tests passed, one SQLCipher driver test skipped.
- Six build/bootstrap/static-route tests passed; browser export passed.
- Tests verify explicit signup/resend/recovery redirect_to and S256 bodies, safe link errors, wrong-origin/purpose/expiry rejection, encrypted session reopen, missing-key/tamper/write failures, and no workspace reset.
- Same-project browser: direct callback loading, missing-transaction recovery message, expired-link rejection on explicit HTML callback, removal/rejection of synthetic legacy token fragments, and unauthenticated /sites/ showing login rather than business data.
- Observed browser console errors were extension metadata errors; no application error was observed in these checks.
- Live service: Auth settings state and the sanitised Auth request logs above. No valid mailbox registration/confirmation/session chain was completed by the agent. No Google login, real password update, two-company signed-client denial or business workflow was marked passed.

Remaining acceptance: apply/re-read actual Auth settings; test a controlled synthetic mailbox registration -> fresh email -> confirmation -> verified session/sign-in -> onboarding -> customer/site -> logout/login; reset link/password change; expiry/reuse; actual refresh/reload/logout; two-company isolation; provider-enabled Google selection/callback/relogin; private hosting callback continuation. Native/device and operational recovery gates remain separate.

## Deployment and rollback

Staging remains owner-private; customers outside that hosting audience cannot reach callbacks without its separate ChatGPT access gate. It was not made public. Production hosting must remove that independent gate only through an approved audience/hosting change, retain Supabase login/RLS/private storage, and update exact OAuth/redirect origins.

This increment has no SQL migrations or data resets. Application rollback can restore the prior Site version, but the old web UI expects OTP codes and is incompatible with this link-based customer flow. Preserve all encrypted work and review forward configuration compatibility before rollback. Git history and proprietary Sicy ownership are retained. Expenditure £0; customer release is not approved.
