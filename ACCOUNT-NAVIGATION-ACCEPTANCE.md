# Shared navigation, logout and account switching

## Change and cause

The supplied screenshot shows BusinessGate's recovery UI. Previously Stack's screenLayout mounted a BusinessGate for each route. Each instance started bound=null/open=false, immediately rendered 'Saved work is locked', then restored a session and ran BusinessAccess.grant (user, membership and scope requests). There is no fixed five-second navigation delay in this code; the approximately five seconds is the user's observation, not a measured benchmark.

BusinessGate now owns its state once above Stack. A stateless WorkspaceAccessScreen consumes the shared guard view for each route. Stack stays mounted even while checking access, allowing initial onboarding navigation without an absent navigator. Authentication, WorkspaceProvider, database and repositories remain shared. Initial checks have a checking view; the recovery screen is reserved for a completed check/lock/error. Access leases, quarantine and server authorisation remain enforced. The existing per-second local lease check is retained; it is not a membership request on every navigation.

## Logout and accounts (customer browser, including narrow/mobile layouts)

The Account menu is outside the route navigator. It shows the active email and company branding when available, Switch account, Add account and Log out. It remains present during workspace loading/error. Session restoration/background-lock views also offer exit controls. A failed durable local sign-out keeps the workspace masked and presents Retry sign-out; no other identity is admitted until local sign-out succeeds.

Switching signs out the previous account; inactive sessions and passwords are NOT retained. The remembered selector contains validated ID/email/last-used display hints encrypted through ProtectedBrowserAuth. Selecting one fills the email only; authentication is required. Previously stored accounts appear after their next successful entry. Names/emails are intentionally visible in the remembered selector on this browser. Company selection remains separate and requires verified memberships.

Logout immediately masks business content, cancels/fences pending UI results, clears in-memory browser identity/passphrase/backend references and report previews, aborts tracked Auth/RPC/photo requests and attempts local-session revocation. It preserves encrypted database/attachment records and queues. A permanently retired AuthConnection cannot restore, refresh or be reused by a new account. Workspace handles capture their original AuthConnection and active-profile storage key; an old handle cannot resolve the next account's client or change its profile selection. Old pending server work may already have committed; logout does not claim to undo acknowledged operations.

For safe browser concurrency, one active CleanProof account tab is supported at a time. An origin/project-scoped Web Lock is held while an authenticated or recovery workspace is open, released after durable sign-out or by the browser on tab closure. Another tab gets an actionable close/log-out-other-tab error. Authentication transitions are also serialized. Use up-to-date browsers with Web Locks support; unsupported browsers fail safely rather than permitting unsafe switching. Native account switching has not been added or accepted; native encryption/storage paths remain intact. Do not advertise this as native multi-account acceptance.

## Validation

Commands: `npm ci` under Node 24; `npm run check`; `node --test scripts/auth-return-bootstrap.test.mjs scripts/build-customer.test.mjs`; `npm run secrets:check`; `npm run build`.

New host tests cover remembered-account data minimisation/deduplication/validation, retired-client denial, request cancellation, late-response rejection and durable sign-out. Existing account-device isolation, encryption, migration and queue tests remain. Host checks do not prove browser transitions or server enforcement.

## Browser acceptance remains explicit

The available remote browser tabs were signed out in the preceding increment; the secure sign-in request was declined and has not been repeated. No personal credentials are requested or entered in ordinary automation. Authenticated per-route timing, logout/Back with a real session, refresh/reopen, A→B→A, wrong password, offline sign-out, pending-work persistence and company isolation need an authorised browser session. No before/after timing improvement or authenticated pass is claimed without that evidence. The original screenshot is supporting evidence of the previous symptom only.

Preserve the existing browser profile. Do not clear storage, remove keys, reset a database, unregister accounts or merge work to test switching. Use synthetic accounts and records. Staging only; no customer-release recommendation. Cash expenditure £0. Supabase settings/redirects unchanged; Google remains removed.
