# Workspace and PDF recovery — prepared source, not deployed

27 October 2026. This is a limited, non-destructive source correction; the requested backup and authenticated acceptance remain open. Do not represent it as a completed persistence or synchronisation fix.

## Findings

1. Browser PDF bytes were prepared but the user-facing BrowserReportHost was mounted only inside LegacyStorageBoundary. The normal customer boundary never mounted it. The supplied screenshot shows the result: the message referred to a prepared PDF without showing the action. The source now mounts the existing report host inside the authenticated CustomerEntry. PDF URL lifetime, logout revocation, native generation and backend access policies are unchanged.
2. `openFreshCompany` used to create a fresh checkpoint/target even when asked to open the company to which the current workspace was already bound. That can lead to a second, apparently empty local workspace, while the previous encrypted database and queue remain. The source now checks the current company and verifies fresh owner membership, then reuses the current workspace without creating a new one. A regression test retains a synthetic customer and confirms no new target is created.
3. A selected company-profile database that is missing previously fell through to `new SQL.Database()`. The source now rejects a missing selected company snapshot instead of quietly making an empty one. The initial account-device profile may still legitimately be new on first sign-in; it cannot be distinguished from every kind of lost browser storage. Workspaces with lost keys or indexes still need explicit recovery work.
4. BusinessEngine runs from the explicit Sync page action. There is no evidence that every save is automatically synchronised. A read-only aggregate staging query on 27 October found 5 companies, 0 `cp_workspace` rows, 0 `cp_packets` rows and 0 objects in the private bucket. This does not establish what any individual account has on its own browser; it does show that this newer synchronisation path cannot be claimed to have delivered records there at the time of the query. Other legacy record tables were not interpreted as user-specific recovery evidence.

The user's specific lost records were not inspected or recovered. Possible causes include an old workspace remaining on the original browser profile, a changed/missing selection index or encryption key, unsynchronised queues, permissions or a different origin/browser. Do not automatically adopt/merge profiles or upload queues under another identity.

## Protection and deployment boundary

The browser context available to the agent is not established as the user's original device/browser profile. The stored encrypted databases, non-exportable device key and unsent work cannot be safely copied here through the available tools; the Supabase connector exposes no complete paired database/object backup operation. No backup of that device or full server backup was made or verified. Read-only aggregate queries and the source tests made no customer-data changes. The user explicitly requested protected backups first, so this source increment has **not been deployed** and the previous private staging version remains in place. Do not clear browser data, reset the database, remove account keys, create a replacement account or delete pending operations.

A recoverable backup procedure for this implementation needs a carefully reviewed on-device export of encrypted snapshots, all referenced encrypted attachments, account-scoped device-secret recovery material protected by a user-chosen backup key, account/company/profile mappings and unsent queues; it must not expose plaintext, keys, passwords or tokens. A server backup must pair database and private-object inventory consistently. Backup and restore must be tested on disposable copies before any recovery or deployment that might affect the original. An encrypted database copy without its necessary device-bound key is not a complete recoverable backup.

## Actual checks

- TypeScript typecheck and test compilation passed.
- 122 host tests passed; 1 optional native SQLCipher driver test skipped. Included: current-company reopen does not create a new workspace or remove a synthetic customer; missing selected snapshot fails closed; the authenticated browser boundary mounts the PDF host; PDF bytes and temporary URL lifecycle tests.
- Production web export and source/history pattern secret scan passed. Secret scanning is not exhaustive.
- The specific affected account/browser, protected backup, real browser PDF download, refresh/logout/reopen and A → B → A, offline/reconnect, second authorised device and real sync acceptance remain **blocked/not run**. No signed-in session from the user's original profile was available and an earlier sign-in handoff was declined; no retry or credential entry was attempted.
- Native Android/iOS and full real-service/backup-restore gates remain pending. The aggregate query was not an end-to-end Auth/REST/Storage test.

## Next steps

Securely establish access to the same browser profile that created the work, verify its encrypted records and key remain available, and first produce and test a protected backup. Complete an explicit review of any discoverable earlier workspaces and a safe profile-selection recovery, then verify idempotent company selection, automatic/manual sync behaviour, pending/acknowledged states, cross-company access and second-client restore. Exercise a real completed report download in the standalone and embedded app; inspect saved PDF bytes, photos and pagination. Only after those prerequisites should the corrected build be deployed and labelled accepted.
