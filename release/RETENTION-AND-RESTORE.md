# Retention and paired recovery decision record

## Implemented behaviour
- Explicit account erasure requires a current verified Auth session and password authentication within five minutes. Service-only RPCs are inaccessible to ordinary clients.
- A sole owner with other active members cannot abandon that company through erasure. Transfer ownership first. Explicitly permitted closure of a sole-active-member company removes its private objects before company records and then removes the Auth identity.
- A company with another active owner retains business records and evidence. The deleted account's author foreign key is anonymised; historical names and content inside immutable snapshots remain. This is retained personal/business content, not complete anonymisation. Legal basis and exceptions must be approved before publication.
- Personal memberships, assignments and onboarding receipts are removed. Completed erasure jobs retain only UUID, closure-company IDs, status and timestamp. No credential is retained there. No automatic purge schedule for these jobs is deployed.
- Auth deletion cascades its sessions. Existing JWTs remain cryptographically valid until expiry, but company membership checks deny records; the erasure endpoint also checks live session presence. Revoked/expired tokens must not begin erasure.
- Server erasure deliberately does not delete device keys, encrypted databases or unsent queues. Unsent work cannot upload after account deletion. Downloaded PDFs cannot be recalled.

## Production approval required
Choose/document precise retention periods and lawful exceptions for shared inspection histories, erasure metadata, operational logs and backups. Suggested starting decisions for management/legal review: support/security logs 30 days, minimal erasure audit 90 days, encrypted rotating backups 35 days, shared business history under the company's documented retention schedule. These are proposals, not configured promises. No automatic deletion of existing production data is authorised by this document.

## Paired restore gate — NOT passed
An actual protected database dump plus private-object inventory and bytes must share the same quiesced checkpoint. A database-only backup is insufficient. Protect encryption/access keys separately; unavailable device-only keys cannot be reconstructed by Auth password recovery.

1. Select an approved isolated restore destination (never overwrite staging/production). Confirm cost before provisioning.
2. Pause writes/cleanup under a bounded maintenance plan and stop sync/uploads; capture database including migration state, private objects, byte counts and SHA256 manifest. Encrypt the backup, restrict access and record checkpoint/version without customer contents in logs.
3. Restore database and matching private objects together. Keep outbound emails/functions disabled or isolated until verified. Do not trigger real-user emails from restore tests.
4. Reconcile row counts/revisions, each object hash and references, Auth/membership restrictions, completed history and retries. Test two isolated synthetic identities and a complete report with photographs. Record RPO/RTO, missing objects and failures.
5. Reapply erasure tombstones completed after the snapshot before restoring normal service; do not resurrect deleted accounts/content from an old backup. Review retained snapshots and delete expired backup generations through the approved process.
6. Document the exact recovery proof and approve resumption. Keep previous compatible app release available; database rollback uses reviewed forward repair, not reset.

Existing backend/paired-snapshot.mjs is intentionally loopback/Docker-only. It has not been run against hosted production. No hosted database/object restore has been demonstrated. Missing access: protected database backup export and private-object service access, approved isolated destination and retention decisions. Never put privileged credentials in this source package.
