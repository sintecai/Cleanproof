# Connected customer authentication — prepared increment

27 October 2026. Source based on `2135743`; preserves prepared workspace safeguards, PDF host fix and mobile UI. Existing staging deployment is unchanged.

## Why the synthetic preview was not connected

The separate mobile preview deliberately used `npm run build:demo`: it sets `EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS=1` and `EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY=1` and does not inject backend settings. Its local synthetic workspace is not a real customer account and cannot synchronise. The connected staging build (`npm run build`, via `scripts/build-connected-staging.mjs`) reads `deployment/staging.public.json`, validates a real HTTPS Supabase origin and publishable key, and explicitly sets both demo flags to `0`. No secret key is included in client configuration.

The Supabase connector confirmed that the configured URL matches project `vmvoeksprlwjiwfxqita` and that its configured publishable key is present and enabled. The generated connected bundle contained that URL and public key; a basic scan found no `sb_secret_` key. This is configuration evidence, not proof of customer login.

## Changes in this increment

- Removed the customer-facing Startup diagnostics and developer connection-details panels; concise actionable authentication and service errors are retained.
- Retained email/password, recovery and immediate signup without Google. Kept the staging synthetic-data notice. Inputs received the existing mobile design's rounded styling.
- Updated a stale automated assertion for the currently reviewed single exact recovery redirect; added an entry-screen regression check. No Supabase settings, accounts, workspace data, keys, migrations or backend policies were changed by this source increment.
- The synthetic preview stays isolated. It has not been relabelled as a connected application.

## New results

- Live service smoke used public staging configuration: immediate-signup policy endpoint returned HTTP 200 with email enabled and confirmation off; incorrect credentials and invalid token were rejected; unauthenticated company creation and internal helper calls were denied; private storage anonymous listing returned no data; unauthenticated photo transfer was denied; authorised-origin preflight and unrelated-origin rejection passed. Nine checks passed. Empty anonymous storage listing alone does not establish populated-object isolation.
- Two uniquely generated synthetic accounts registered with real sessions without email confirmation. Each created a synthetic company through the server RPC. An authenticated request by one account for the other company returned no rows. One synthetic account logged out, logged in again with its original generated credentials, obtained a valid user session and received `invalid_credentials` for a wrong password. These were direct backend-client checks; credentials/tokens were not logged or stored in the source. Two synthetic accounts and two synthetic company records were created in staging; they have not been deleted.
- Local connected web build passed, included the confirmed public project configuration, and disabled demo mode. Its Sign in, Create account and Forgot password screens were inspected in a browser with developer details absent and no remembered account shown. `http://terminal.local` is not a secure browser origin and Web Locks were unavailable, so the local UI could not exercise account sign-in or protected workspace opening. No claim of a browser login pass is made.
- 122 host tests passed, one optional native SQLCipher-driver test skipped; 11 email-only, build-config and callback tests passed. Typecheck, connected web export and pattern secret scan passed. These do not prove real backend workflow or physical-device acceptance.

## Blockers

The user required a protected backup of the original browser profile's device-only work before deploying changes that could affect it. That profile, its non-exportable device key, encrypted snapshots and unsent queues were not accessible for backup from this environment; no recoverable backup was created or verified. No existing customer data was deliberately modified or reset. Consequently this prepared source was not deployed to the existing staging site.

Actual deployed-browser registration/onboarding/logout/login/refresh; returning customer/site/inspection access; account isolation in application UI; email recovery delivery and callback; native Android and iOS tests are all pending. Default staging SMTP remains unsuitable as proof of general customer recovery delivery. The separate mobile preview's lack of account services is intentional and should not be confused with the connected build.

The last known existing staging link is https://cleanproof-sicy-preview.grassyelf128.chatgpt.site; it runs its prior version, not this increment. Complete a protected, recoverable backup from the original browser profile, review the workspace recovery and synchronisation gaps in WORKSPACE-AND-PDF-RECOVERY-STATUS.md, then deploy and run authorised synthetic browser acceptance. No passwords, tokens or recovery links should be sent through chat. £0 expenditure.
