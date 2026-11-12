# Authentication correction and observed acceptance — 26 October 2026

## Proven cause
The recent deployed registration attempt reached Supabase and received HTTP 422 `user_already_exists` at 05:45:26 UTC. Before synthetic testing there was exactly one account, already confirmed. That request did not fail because of confirmation policy, networking or a password transformation. It did not change the existing password. Prior `invalid_credentials` sign-in remains a separate unresolved existing-account issue; no personal credentials were requested or reset.

The live `/auth/v1/settings` reports email enabled, signup enabled and `mailer_autoconfirm=true`. The application checks this live with no-store; no stale frontend feature flag was found. Google stays removed.

## Code changes
If authentication succeeds but membership/key/workspace opening fails, the entry screen now preserves the established session and offers Retry opening workspace and Sign out. It cannot encourage repeated registration of the now-created account. Password fields are hidden during this retry state. Passwords remain unchanged byte-for-byte (including whitespace/unicode); a regression test checks signup and login request construction.

## Newly executed actual hosted-service tests
Using two new generated synthetic identities and process-memory-only random passwords, the shared application `AuthConnection` exercised real Supabase Auth and PostgREST (not mocked):
- Both new signups returned valid sessions without email verification.
- Both created owner memberships via `cp_register_company`; retrying the same request returned the same company.
- Each authenticated account could not read the other's company through RLS.
- Customer, site and an explicitly local-only inspection replication event were accepted by the service.
- A fresh AuthConnection restored the saved session and validated the user.
- Logout removed application access; subsequent password login returned the same user.
- Incorrect generated password was rejected with `invalid_credentials`.
- Sessions were signed out after testing. Synthetic fixtures remain, clearly named. No existing account/data/password was modified.

**These are host-client real-service results, not a complete deployed-browser walkthrough.** In particular, the inspection replication event is not proof of a completed native/browser inspection, photographs, encrypted browser persistence, report generation, UI refresh, or protected-route rendering. Those remain pending. No browser signup credentials were injected through lower-level automation. Current browser security tooling requires private user handoff for account creation; the user has requested no repeat credential-entry loop, which is respected.

## Reproduce (creates synthetic staging data)
```
npm ci
npm run check
npm run test:build-config
npm run build
npm run secrets:check
CLEANPROOF_ACCEPT_SYNTHETIC_SIGNUP=1 node backend/staging-immediate-live.mjs
```
Use an equivalent session environment assignment on Windows. Only the public staging URL/key are read. No passwords, tokens or recipient addresses are printed or saved by the live test. It deliberately does not send password recovery emails. Do not use against production.

## Outstanding gates
- Existing confirmed account sign-in with correct privately entered credentials has not succeeded; no password change authorised/performed. Email recovery requires working SMTP and inbox delivery, still unverified.
- Complete browser business workflow, browser encrypted-session reload and two-browser isolation remain pending; Android/iOS device gates remain pending.
- SMTP delivery, paired restore, dependency findings and operational release gates remain as in RELEASE-STATUS.md. No production-ready claim.

Actual expenditure: £0. No new services, changed staging audience or privileged client keys.
