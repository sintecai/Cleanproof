# Verified hosting and saved authentication URLs — 26 October 2026

This supersedes the four-URL deployment intent and dashboard-access blocker in REDIRECT-REPAIR-ACCEPTANCE.md. Those are historical, not current settings.

## Proven root cause and actual correction
After owner dashboard access became available, Authentication → URL Configuration displayed Site URL `http://localhost:3000` and **No Redirect URLs**. The actual browser recovery request had correctly requested the deployed HTTPS /reset-password.html. The unallowlisted request fell back to the saved localhost Site URL, consistent with the user's received link and failed localhost navigation. No exposed recovery code was reused.

Saved through the authorised official dashboard and verified again after reload:
- Site URL: https://cleanproof-sicy-preview.grassyelf128.chatgpt.site
- Redirect URLs: exactly https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/reset-password.html
- Total URLs: 1

These are hosted saved settings, not merely a local JSON change. No wildcard, localhost, extra company access, password reset, invitation or public-audience change was made.

## Exact route mapping
| Purpose | URL | Source/behaviour |
|---|---|---|
| Application/Site URL | https://cleanproof-sicy-preview.grassyelf128.chatgpt.site | Sites project appgprj_6adadeeb36fc8191887deafff6f1119d; app/_layout.tsx; src/application/CustomerEntry.web.tsx |
| Requested password-recovery callback | https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/reset-password.html | src/auth/emailLinks.ts emailCallback('recovery'); src/auth/session.ts requestReset passes redirect_to; scripts/static-route-entries.mjs emits file |
| Canonical rendered recovery route | https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/reset-password | app/reset-password.tsx plus CustomerEntry handler; static host redirects .html to this route |
| Legacy email callback, not needed for immediate signup | https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/email-callback | app/email-callback.tsx plus CustomerEntry; email-callback.html redirects here; retained route, NOT added to current Auth allowlist |

The current source/build does not need a new runtime redirectTo to use this correction. It already requests the exact newly allowed .html URL. Source deployment intent/validator now matches the one saved redirect instead of insisting on four aliases.

The .html and canonical routes were opened in the actual deployed browser. Both recovery and legacy email callback rendered the app, safely rejecting missing credentials/verifier. Reloading their canonical URLs loaded the same application. This is route acceptance, not successful recovery. Supabase URL Configuration contains Site URL and Redirect URLs → Add URL → Save URLs; callback paths are app routes, not a separate Supabase subsection.

Supabase API URL https://vmvoeksprlwjiwfxqita.supabase.co is a backend, not a customer Site URL. https://supabase.com/dashboard/project/vmvoeksprlwjiwfxqita/auth/url-configuration is an owner administration page, not an app callback. Local development origins are isolated from hosted configuration.

## Email template and delivery limits
Official dashboard Authentication → Emails → Templates → Reset password states: emails use default templates; custom SMTP is required to edit subject/body. No hard-coded localhost template was edited. The standard ConfirmationURL flow uses the saved Site URL/accepted redirect and matches the application's S256 PKCE request. The source recovery template also uses {{ .ConfirmationURL }}. No SMTP secrets were read. Previously reported inbox receipt establishes that one existing-account email arrived; it does not establish unrestricted public-customer delivery. Default-service recipient/rate restrictions remain a customer-release gate.

## Hosting access gate
Sites reports custom audience, one authorised owner, zero external visitors. App/callback pages loaded in this authorised browser. Unauthorised customers may encounter ChatGPT hosting sign-in before CleanProof; this is separate from Supabase authentication. The audience was not changed. Before public customer use, management must authorise customer-accessible HTTPS hosting (existing static export and SPA/callback entries can be reused), update Site URL/redirect to that final origin, then repeat callback and tenant acceptance. A private preview is not customer production hosting. Auth-code preservation across an unauthorised hosting login is untested.

## Fresh recovery acceptance still required
Do not replay the old localhost code/link. In the user's existing browser/profile, request one fresh reset through CleanProof Forgot password, open that fresh email in the same profile (PKCE), privately choose/confirm a new password, then verify login, authorised workspace, refresh and logout. No code or link should be shared in chat or screenshots.

The secure browser's automated recovery request was previously rejected because its built-in prompt describes sign-in; no repeat or alternate automated delivery workaround was used. Owner self-service recovery is available on the real app. No fresh email, password change or existing-account sign-in was performed by the agent during URL configuration. Complete recovery and browser business workflow remain pending, not passed.

## Evidence and checks
Source check: 97 passed, one optional SQLCipher test skipped. Build-configuration tests: 3 passed; web build passed. Current recovery/link parsing tests retain PKCE validation, expired/replayed/missing-state handling, exact HTTPS callback construction and URL scrubbing. No data/keys/queues reset. Cost £0. Not production-ready.
