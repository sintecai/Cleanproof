# Authentication transport fix — 24 October 2026

## Root cause and evidence

Baseline inspected: 6c0b7b502be6956b0ab70c378c0b0c2d502ae2f1. GitHub remains empty; the deployed private Site repository remains authoritative. Actual deployed HTML/scripts contained the intended vmvoeksprlwjiwfxqita.supabase.co endpoint. The deployed document had neither a CSP response header nor a CSP meta tag. The backend accepted OPTIONS for signup/settings with apikey/content-type and returned the appropriate Access-Control-Allow-Origin on actual settings responses for the staging and QA origins. No callback, key or audience setting was changed on a guess.

AuthConnection stored native fetch in a class property and invoked this.fetcher(url,init). Native browser fetch brand-checks its receiver, so that call bound `this` to AuthConnection and threw Illegal invocation before sending a request. Node fetch and arrow-function mocks did not reproduce the browser requirement. The catch incorrectly replaced every such exception with a network/saved-work message.

Reproduced in the same project's compiled browser application: the real connection check failed immediately with CP_AUTH_FETCH_RECEIVER at 2026-10-24T10:24:10.018Z. After invoking a local function variable instead of a class method, the same browser/app/backend check returned HTTP 200 at 10:25:23.055Z. Actual Supabase Auth logs confirm /settings status 200 at 10:25:23 UTC. The original deployment's source has the same faulty receiver pattern; no later user signup POST was visible in the inspected Auth logs. These observations support an application invocation defect, not wrong passwords or an instruction to reconnect the user's internet.

The exact protected deployed UI could not be entered in this browser because its separate ChatGPT hosting sign-in remains incomplete. No declined login request was repeated and the audience was not changed. Platform-issued service access was used to read the deployed document/assets without changing access controls. Browser reproduction used the actual same-project build and real Supabase; it is not a claim of completed hosted registration.

## Correction

AuthConnection now assigns `const send=this.fetcher` and calls `send(...)`, with no AuthConnection receiver. This also fixes its Auth/REST RPC requests using the same request method. Native encryption, workspaces, keys, migrations, queues, memberships and saved records are unchanged.

Request preparation happens outside the fetch-transport catch. Diagnostics distinguish request construction, native-fetch receiver failure, timeout, transport rejection and HTTP service responses. Safe diagnostic fields are endpoint path without query, backend origin, method, UTC timestamp, HTTP status and bounded service error code. No email, password, verification code, OAuth verifier, access/refresh token, API key, body, raw backend message or stack is logged/displayed.

Auth forms use account-specific transport messages and do not describe saved inspection work when registration fails. HTTP email-address rejection and rate limiting are not labelled connection failures. Password errors stay non-enumerating. A 200 signup response is described as a verification request, not proof of delivery. Failed response/local storage does not imply that a submitted account was never created.

Connection help is collapsed outside the normal form flow. Its explicit read-only Check account connection button calls actual /auth/v1/settings; this is not signup, email delivery or authentication acceptance. A matching securitypolicyviolation event can identify a browser-reported CSP block without guessing from TypeError alone.

## Checks actually performed

- TypeScript passed; 80 host tests passed; one host SQLCipher driver test skipped. New tests cover native-fetch receiver semantics, safe transport/timeout diagnostics, HTTP-versus-network classification, failed request construction and read-only availability semantics.
- Browser real service: failed before fix with CP_AUTH_FETCH_RECEIVER; passed after fix with /settings HTTP 200 and matching server log.
- Real AuthConnection signup API probe after fix: POST /auth/v1/signup reached Supabase and returned HTTP 400 email_address_invalid for a reserved synthetic example.test address. It was correctly classified as a server rejection; no session established. This is not a valid mailbox registration, delivered email or verified account test.
- Previous 23 database fixtures remain historical; no schema/permission changes in this fix.
- Browser export passed; source secret-pattern scan found no matches (not exhaustive).

Pending: successful registration/verification delivery and resend, verified login, recovery, refresh/logout, onboarding/customer/site and cross-company signed-client acceptance. Real Google sign-in remains disabled. Native Android/iPhone checks remain separate. No customer-readiness claim.

## Remaining external access/configuration

Google's Supabase provider was confirmed disabled by actual Auth settings. It needs Sicy-owned Google Cloud client/consent configuration, with authorised Google redirect URI https://vmvoeksprlwjiwfxqita.supabase.co/auth/v1/callback. Supabase must allow the app redirect https://cleanproof-sicy-preview.grassyelf128.chatgpt.site/auth-callback. Client secrets belong only in secure provider settings. Do not enable the Google button until configured and tested.

Auth URL configuration, email templates and SMTP cannot be updated by the available database tools. The dashboard browser sign-in has not completed. Required settings are Site URL https://cleanproof-sicy-preview.grassyelf128.chatgpt.site and exact /auth-callback redirect; use the supplied numeric confirmation/recovery templates and a project-owned verified sender with a controlled staging test mailbox. Email verification must remain enabled. Sender delivery restrictions/rates are separate from the fixed fetch receiver and have not been diagnosed from the earlier generic error.

No new project, paid service, public audience or weaker authentication setting was introduced. Current expenditure: 0. GitHub history-preserving push/PR remains blocked by unavailable authenticated Git transport; no rejected Actions workaround was retried. Complete source and original history are retained on feature/auth-transport-diagnostics and supplied in the delivery bundle. Rollback application code only if needed; never clear workspace data or revert the previous restrictive backend permission fix.
