# Existing-account recovery — 26 October 2026

## Current reconciliation
Source baseline 947eabb, live version 19. Latest pre-change events: 07:09:38 UTC /signup HTTP 422 user_already_exists, then 07:10:13 UTC /token HTTP 400 invalid_credentials. These are duplicate registration and rejected login, not a post-login workspace failure. The original non-generated account remains confirmed. The application must not change its password through signup.

## Changes
Registration failures show Go to Sign in and Forgot password actions for every registration error, irrespective of account existence. Selecting Forgot password only opens the recovery form; no email is sent until explicit submission. Passwords are cleared on mode changes. Updated AUTHENTICATION-SETUP removes obsolete claims that the confirmation toggle remains ON.

## Recovery test boundary
A real browser recovery request must create and durably retain the PKCE transaction before sending the email. Starting an unrelated host-client recovery request and then using its email in the browser would lose that verifier and would not be a valid callback test. Therefore recovery must be requested through the actual application's Forgot password form. Secure entry is necessary only for the account email; no password or token is requested in chat.

Hosted SMTP, Auth Site URL, redirect allowlist and email-template settings are not exposed by the installed configuration connector. Inbox and SMTP-provider delivery events are not connected. An HTTP 200 alone cannot establish provider acceptance/inbox receipt. Supabase's built-in mail service restricts recipients to project-team addresses and is not a general customer SMTP service (official auth-smtp guidance); do not assume which service is configured without inspection or request/log evidence.

If SMTP proves blocked, owner configuration is: existing project → Authentication → Emails → SMTP Settings; enter the existing authorised provider's host, TLS port, username, secret password, verified From email and sender name privately. In that provider, verify the owned sending domain using its exact generated SPF/DKIM records and DMARC policy; disable link tracking and inspect suppression/quota/delivery events. DNS values depend on that provider and cannot be invented. No service purchase or provider account was created. Authentication → URL Configuration must use the deployed HTTPS origin and exact /reset-password.html redirect; Recovery email template must use {{ .ConfirmationURL }}. Hosted settings require secure owner access to verify/apply.

## Administrator-assisted alternative — not performed
Supabase supports server-side Auth Admin generateLink(type:'recovery') and administrative user updates. Admin generateLink requires privileged server access and does not require SMTP to generate a link; it does not by itself provide a safe recipient delivery channel or ownership verification. Never put a generated link/token in chat, logs, Git or a source archive. The current customer recovery callback expects its browser PKCE transaction; an arbitrary admin-generated link must not be represented as compatible without implementing and testing the corresponding supported verification flow.

Before any administrator-assisted account change: verify the claimant through an appropriate independent ownership channel; document the exact account, session impact and delivery method; obtain explicit owner approval; let the claimant enter the new password privately. No admin credential/API capability or secure recovery-link delivery channel is currently available through installed tools. Do not query password hashes, write auth.users directly, reset accounts or disable RLS to bypass this boundary.

## Encryption and preservation
Password recovery updates authentication for the existing account ID; it must not delete/recreate that identity, memberships or records. Current account device keys and native SQLCipher keys are independent of the account password. Changing the password does not reconstruct a missing local device key, recover cleared browser storage or restore unsynchronised device-only work. Keep the original browser profile/device and application storage intact. Do not clear caches/site data to test recovery. Existing device records and queues remain protected. Session revocation effects must be explained before any broader revocation; none was performed.

## Acceptance still open
Actual recovery delivery/callback/password change and secure subsequent sign-in; authenticated workspace, reload and logout; complete synthetic browser registration/onboarding/logout/login. Existing host-client real-service evidence is supporting evidence only. Google remains removed; Confirm email OFF remains the authorised signup policy. No production-ready claim.
