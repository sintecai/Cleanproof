# Recovery redirect repair — 26 October 2026

## New evidence
The user reports actual password-reset email receipt followed by localhost:3000 with an authentication code and ERR_CONNECTION_REFUSED. That code was not read, copied or replayed. Redacted Auth logs show /recover HTTP 200 at 07:51:52 UTC and /verify HTTP 303 at 07:52:10 UTC (13:21:52/13:22:10 IST). Delivery is reported by the recipient; logs alone do not prove inbox receipt. This is a redirect-stage failure, not missing email delivery. No new recovery was requested.

## Application and deployment intent
CustomerEntry prepares a browser-bound PKCE transaction, stores it protected before requestReset, and passes the exact deployed /reset-password.html URL in the GoTrue redirect_to query. The recovery template uses {{ .ConfirmationURL }}. Static export includes both /reset-password.html and /reset-password/index.html; hosting canonicalises .html to /reset-password. Both paths are accepted by the callback parser. Legacy email-callback paths remain for old confirmation messages; new signup is immediate and does not request email confirmation.

The reviewed deployment config now includes exactly four HTTPS callbacks, with no wildcard:
- https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/reset-password.html
- https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/reset-password
- https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/email-callback.html
- https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/email-callback

Site URL must be https://cleanproof-sicy-preview.grassyelf128.chatgpt.site . Actual hosted Site URL/allowlist/template settings are NOT established by the local deployment JSON. A localhost result is consistent with a hosted fallback/allowlist/template problem, but the precise saved field requires dashboard inspection.

## Owner-access boundary
The official existing-project URL Configuration page redirects this browser to Supabase dashboard sign-in. The installed Supabase connector has no hosted Auth configuration read/write tool. No dashboard/API token was extracted or guessed, and no SQL workaround was attempted. Owner sign-in privately in the official dashboard is necessary to inspect/save and then reread the hosted values. Do not repeat recovery until those settings are verified. The owner-private staging audience stays unchanged; no public-access change is authorised.

## Independent changes/checks
A build-time validator now fails on a localhost Site URL, missing/unexpected/wildcard callbacks, a confirmation-required policy or mixed/local recovery templates. A regression test verifies those failures. This validates source deployment intent, not saved hosted settings. Existing callback tests cover explicit HTTPS redirect_to, S256 challenge, missing/expired/wrong-origin verifier, wrong purpose and unsupported implicit tokens; no auth fallback was loosened.

## Recovery after hosted correction
Request one fresh email from the actual app in the same browser/profile in which the link will be opened. Old already-consumed links cannot be repaired by changing Site URL and must not be replayed. The owner enters a new password privately only after a valid recovery session. Sensitive URL data is scrubbed; never screenshot/log/share recovery URLs. Verify password update, old-password denial, fresh login, authorised workspace, refresh and logout. New-account complete browser signup/onboarding acceptance remains pending and cannot be replaced by prior host-client acceptance.

## Preservation and release status
No existing password, account ID, membership, record, encryption key or queue was modified. Do not clear browser data. An account-password change does not reconstruct missing device-bound keys or unsynchronised work. Google remains removed; no reset or administrator bypass performed. Source changes alone do not fix the still-unverified hosted redirect setting. Not resolved or production-ready. No new cosmetic runtime deployment was performed while that setting is blocked.
