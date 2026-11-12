# Startup lifecycle correction — 26 October 2026

## Evidence and limits

The supplied Recording 2026-10-26 143650.mp4 shows session restoration, workspace opening, then restoration again. It contains no console lifecycle trace. The available hosted Chrome tabs are signed out; no persisted authenticated session was available for independent replay. A previous secure sign-in request was declined. It has not been repeated or bypassed.

Therefore the exact operation causing the recorded remount is not yet proven. Do not describe this delivery as passing authenticated browser acceptance.

## Defects corrected in source

- CustomerEntry previously rewrote browser history and subscribed to root navigation state before its child WorkspaceProvider had finished opening and before the application Stack existed. Redirect now occurs once in the mounted ApplicationNavigator, not in authentication bootstrap.
- Cleanup previously locked the AuthConnection on component unmount. Component lifetime is not an explicit sign-out. Account services now have one module-level owner; cleanup removes listeners and fences late UI publication without locking or deleting its session.
- Entry and customer workspace previously constructed independent AuthConnections backed by different encrypted session stores. Workspace refresh could rotate a refresh token without updating entry's saved token. Customer workspace operations now reuse the entry connection and protected session store. Local demo/native adapters retain their existing paths.
- Bootstrap restoration is single-flight across mounts. Generation checks prevent superseded catch/finally handlers from overwriting the current UI. Removed unfenced outer finally handlers.
- The inline screenLayout component has been replaced with a stable module-level component, preventing workspace revisions from changing its React identity.

No database, key, account or queue reset; no schema migration. Existing URL configuration, immediate signup and removal of Google are unchanged. Recovery continues to use its isolated memory session.

## Diagnostics

Staging console messages with prefix `[CP_STARTUP]` contain only elapsed milliseconds and fixed event names: entry mount/unmount, restore outcome, membership check, device key retrieval, workspace open/error, navigator mount and route request. No URL, identifier, session, token, user input or exception body is accepted. A collapsed startup diagnostic view is available on account entry.

## Reproducible checks

`npm ci` (Node 24), `npm run check`, `node --test scripts/auth-return-bootstrap.test.mjs scripts/build-customer.test.mjs`, `npm run secrets:check`, `npm run build`.

Host regression tests cover shared restoration/retry, pending-operation timeout and stale-result fencing, blocked IndexedDB opens, account-device key isolation, session handling, migrations and business rules. These are not browser acceptance.

## Pending authenticated browser acceptance

Run in both owner-authorised preview and standalone tab: fresh sign-in; reload with saved session; close/reopen; token refresh; logout/sign-in; interrupted network; workspace-opening error/retry; site creation and inspection save/reload. Record the fixed-event trace and observed UI. Keep browser profile/storage intact. No credentials or callback URLs should be captured. Compare mount/route events, not just loading text. Native/device and operational gates remain pending.

Release recommendation: staging investigation only. The recorded startup failure is not accepted as resolved until the authenticated hosted walkthrough passes. Cost: £0.
