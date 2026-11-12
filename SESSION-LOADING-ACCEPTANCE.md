# Session/workspace loading correction — 26 October 2026

## Recording and diagnosis
The supplied 21.43-second recording was inspected locally. It shows the application navigation shell with Opening your saved work, followed by the disabled sign-in form. No credentials or recovery codes were extracted or reproduced.

The code confirms these failure paths:
1. A hidden-tab event called lock(), nulled the active Auth session, cleared active workspace credentials and unmounted the workspace. A visible-tab event immediately attempted another restore, unless a prior operation was still running. Backgrounding was therefore conflated with returning to account entry and automatic restoration.
2. Account entry waited for protected IndexedDB/device-key work with no overall deadline; the UI's finally block could not run if a storage promise never settled.
3. WorkspaceProvider and browser SQLite script/WASM loading had no deadline. The navigation shell appeared before the workspace opened. Failed SQLite loading remained cached in a rejected promise, preventing a useful asset retry.

These are confirmed source defects consistent with the video. No claim is made that a particular network/storage request in the user's browser has been conclusively identified as the recording's sole trigger. The currently available agent browser is signed out and requires secure user entry for authenticated reproduction. No personal password was requested in chat, no alternate auth route was injected, and no session token was transferred to a browser.

## Changes
- Initial session restoration has its own screen, distinct from signed-out entry and workspace loading.
- Backgrounding masks the app and clears active workspace credentials; it does not delete the protected session or automatically sign out. Foregrounding requires Resume securely rather than a re-entrant automatic restore. Recovery sessions resume the recovery form, never an ordinary dashboard restore.
- Account operations have a 45-second deadline. Publication checkpoints fence expired/superseded attempts so a late result cannot reopen access. A timeout does not claim cancellation/rollback of server or storage work, and never deletes a saved session.
- Workspace opening has a 30-second deadline and Retry opening saved work. Late opened handles are closed without resetting/deleting records. The business navigation shell is not displayed while the workspace is still opening.
- Browser IndexedDB opens/account-record transactions have 8-second boundaries; blocked opens explain that another tab must be closed without clearing data. Late DB connections close. SQLite assets have a 20-second deadline; a failed asset load can actually be retried.
- Explicit sign-out remains distinct; no schema, encryption-key format, migration or company permission changed. The saved Supabase HTTPS Site URL and single recovery redirect remain intact.

## Newly executed checks
- TypeScript and host regression suite: 100 pass, one optional SQLCipher test skipped.
- Build configuration: 3 pass. Production web export passed.
- Regression cases: unresolved opening timeout; safe retry; late result cannot publish; sign-out/unmount invalidation; blocked/timed-out IndexedDB opens close a late connection. Existing auth, migration, key and snapshot tests retained.
- Recording inspection is supporting evidence, not successful acceptance of the new build.

## Browser acceptance still required on the exact deployed commit
Secure login → actual usable authorised workspace → reload → reopen → explicit background lock/resume → logout/login. Separately exercise interrupted/slow network, expired session and workspace opening failure. The agent's current browser is signed out; secure user entry is needed. Do not call these passed from host tests, the recording or a build. Do not clear user storage or reset accounts as fault injection. Native Android/iOS checks remain pending.

Cost: £0. Audience unchanged. No password change, reset email, privileged keys, account deletion, database reset or queue clearing.
