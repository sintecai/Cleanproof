# Authentication request-path investigation — 26 October 2026

Continues c5a6c2f / staging version 18. This record supersedes older policy-blocker statements, not outstanding acceptance gates.

## Evidence and reconciliation
- The deployed browser's Connection help made a real GET to `https://vmvoeksprlwjiwfxqita.supabase.co/auth/v1/settings` and received HTTP 200 at 06:48:34 UTC. This uses the same AuthConnection/configuration as signup and login. Source build configuration matches this project. No separate signup project/URL override exists.
- Most recent pre-test Auth events: 06:17:35 UTC login HTTP 400 `invalid_credentials`; 06:17:49 signup HTTP 422 `user_already_exists`; 06:18:07 login HTTP 400 `invalid_credentials`. These are service responses, not inferred from UI wording. Account count before this run: one non-generated existing account, confirmed; two previous synthetic accounts. No account was deleted/recreated or password overwritten.
- The account's existence and a rejected login are compatible: repeated registration cannot replace an existing password. Neither successful signup of synthetic accounts nor a confirmed email proves knowledge of this existing account's password. The reason its supplied credential differs from the service credential is not observable without private credential testing; no password hashes were accessed.
- No custom non-internal triggers exist on auth.users. No database signup error appears in the matched failures. No schema change or trigger removal is justified.

## Changes
- Browser submission reads named form controls at submit time via FormData, rather than depending solely on React onChange state. This addresses the class of password-manager/autofill state mismatch; it is NOT a reproduced explanation of the existing account's rejection. Passwords remain exact, including whitespace/unicode; no trimming/normalisation or prior password fallback.
- Only Supabase's actual `invalid_credentials` code is labelled incorrect email/password. Unrelated HTTP 400 errors retain their safe diagnostic code and are no longer misclassified.
- The previous authenticated workspace retry remains: session creation is distinct from company onboarding, and a failed workspace opening cannot demand signup again.
- Tests cover submitted controls, missing controls, exact passwords, and unrelated HTTP 400 errors. No Google code/button/provider was reintroduced.

## Real-service reproduction
`backend/staging-immediate-live.mjs` is an explicit opt-in synthetic test. It generates credentials only in memory and outputs only test labels, endpoint paths/statuses and safe diagnostic codes. It compares direct GoTrue login with the actual shared AuthConnection for the same synthetic identity/password. It also tests two-company RLS denial, idempotent company owner registration, customer/site and local-only inspection replication-event storage, session restore, logout and wrong-password rejection.

Run after `npm run check`:
`CLEANPROOF_ACCEPT_SYNTHETIC_SIGNUP=1 node backend/staging-immediate-live.mjs`

The source ZIP includes the observed run log. Test-generated identities remain as synthetic fixtures; no original customer work is modified. The replication event is not a full UI inspection or proof of photo/report acceptance.

## Not established
A complete deployed-browser signup/login/business workflow and browser-refresh persistence have NOT been observed. Browser credential automation only supports secure user-entered sign-in; account creation requires manual handoff and programmatic password injection is prohibited. No repeat handoff was requested, respecting the user's instruction. Host-client live execution is explicitly distinguished from browser acceptance.

The original confirmed account login remains unresolved. No personal credential was requested or changed. Recovery requires working SMTP/provider delivery, still unverified. No broad account reset, bypass or global sign-out was performed. Native, private photo/report, backup/restore and other release gates remain pending. This delivery is not production-ready.

No costs, new projects, public audience changes, disabled RLS or weakened local encryption.
