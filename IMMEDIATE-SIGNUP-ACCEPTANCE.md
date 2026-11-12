# Immediate signup acceptance — 26 October 2026

Baseline bed4c025f9d2ceb481fc072b7f2c42282935b2ba; current tested source is identified in SOURCE-COMMIT.txt. Existing source/history/data/migrations/keys/RLS preserved. No Google feature restored.

## Implemented

Customer web registration and native onboarding now collect name/email/password/confirmation, call the real service policy check, accept and validate a real immediate signup session, durably save it, then check membership and route to onboarding. No-session responses stay locked and route to normal Sign in. Existing company membership is derived from authenticated user ID and server policies; name/email are not role or invitation claims. Signup confirmation screens, link instructions and resend controls are removed from those entry screens. Old callbacks/local test helpers remain for legacy links and independent password recovery.

Account creation is blocked before /signup if the actual backend still requires confirmation, with CP_SIGNUP_POLICY. This avoids creating another account that waits for a confirmation email. The exact supported owner action is in AUTHENTICATION-SETUP.md: existing project → Authentication → Sign In / Providers → Email → Confirm email OFF → Save; retain Email provider and signup. Desired patch now has mailer_autoconfirm=true. Installed connected tools cannot apply hosted Auth settings, and no unrelated administrator recovery was restarted. This setting is NOT claimed saved.

The adapter only stores validated sessions, checks lifecycle generation, preserves work on failed storage and refuses malformed/partial tokens. Returning-user login, protected session restore/refresh and local-scope logout stay on the existing real Auth adapter. Wrong-password wording no longer suggests resending verification; prior-unconfirmed account rejection is an account-policy review, not automatic confirmation. Duplicate registration message/diagnostic are neutral. No passwords are stored in ordinary browser storage or logged.

Abuse measures: duplicate-submit lock, per-operation memory throttle (five attempts/minute), existing server rate enforcement and safe 429/weak-password/captcha-required errors. The memory throttle is bypassable and is not advertised as backend protection. Before public customer signup, review server Auth rate limits/CAPTCHA and the account-enumeration implications of public auto-confirm signup. No CAPTCHA is faked or claimed configured.

Fresh database inspection: one account, zero unconfirmed. No existing account transition is needed for that observed state; no bulk update was made. The switch must not be assumed to retroactively confirm future/discovered old pending users. Preserve such an account and use an owner-reviewed supported process after authenticating the claimant. Company RPC guard still checks accepted auth.users state, populated by Supabase auto-confirm for new users after the toggle; no RLS weakening or membership-by-email was introduced. Server auto-confirm is not proof of mailbox ownership.

## Actual results

| Check | Outcome |
|---|---|
| TypeScript | Passed |
| Host/domain/auth tests | 93 passed, 1 optional host SQLCipher driver skipped |
| PostgreSQL/backend/plugin fixtures | 23 passed; not full Auth/Storage acceptance |
| Config/callback/template tests | 10 passed |
| Connected web export | Passed; Expo printed a forced-exit warning after export, exit code 0 |
| Real hosted immediate-signup policy | FAILED: mandatory confirmation is still enabled |
| Other real hosted negative/access probes | 8 passed |
| New actual signup → session → own workspace | BLOCKED by hosted setting and authorised synthetic-account participation |
| Actual logout/login/reload and two-company business workflow | BLOCKED, not simulated |
| Existing account current login | Historical real rejection invalid_credentials; not fixed by changing signup policy |
| Password recovery | Separate SMTP/callback acceptance pending |
| Native device execution / full two-device sync / paired restore | Not run; prior gates remain |

The real smoke checked source baseline plus this working-tree increment before commit. Its policy failure is intentional evidence of the remaining backend mismatch, not a test pass or a transport outage. The new immediate-registration code cannot meet the user's acceptance until the supported setting is actually saved. The build alone is not success.

## Required live acceptance after owner saves the one signup switch

First re-run npm run test:staging-smoke and require the policy row to pass. Then with two owner-authorised synthetic email identities create accounts without opening an email. Observe actual Supabase tokens/session → onboarding → distinct companies → customers/sites → inspection/photo/report; logout/login/reload; wrong password; cross-company/site/object denial. User-created passwords are entered securely, never chat or ordinary automation. Do not reuse the confirmed account as the new registration case. Do not infer workspace success from a signup response alone.

Recovery remains independently secured: existing callback URL allowlist/PKCE and SMTP delivery must be verified. Merely knowing an email must never enable a reset. Do not change the existing password or reset accounts to mask failed login. No real customer data or public audience change is authorised. Latest security/dependency/backup/native blockers remain in SECURITY-AND-AUTH-ACCEPTANCE.md and RELEASE-STATUS.md. Expenditure £0. Release recommendation: staging implementation only, acceptance incomplete, not production ready.
