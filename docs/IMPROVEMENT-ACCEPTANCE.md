# Version 0.3 acceptance and release boundaries

Use synthetic data only. These gates supplement the original native/continuation checklists; old statements that completion/actions are absent are superseded for the local 0.3 workflow, not for server production features.

## Local workflow device matrix — pending Android and iPhone

- Home opens saved work; recent/uncompleted records are accurate after returning from another screen and after restart.
- Search/add/edit/archive customers/sites; verify 1–120 character names, addresses/timezones, ten active-site guard and preserved historical context. Reject missing active parent records.
- Clone/edit/reorder/version templates. Confirm an existing inspection keeps its version and wording. Test archive, empty lists and search with no matches.
- Create/reopen drafts; test all outcomes, Fail/N/A explanations, note debounce/blur, retry, low storage and immediate kill before/after acknowledgement. Confirm no false “saved” state.
- Complete with a named inspector and failure actions. Reject stale revision, unanswered items, missing explanations, unavailable photos and unassigned actions. All-N/A must complete without a percentage. Completion is local only.
- Open completed record: answers and original evidence remain read only. Create a correction with reason; original stays unchanged and both records remain discoverable. The correction starts without copied photos/actions.
- Create/edit/reassign local actions, due date and owner; resolve with notes/evidence; reopen with reason. Check stale changes, event rollback, history and protection of old resolved evidence. Assignment sends no notification. Due dates use the site's timezone.
- View reports and encrypted saved PDF versions. Missing photos block generation; unavailable PDFs can be explicitly recovered. Re-render with updated actions: earlier saved PDFs retain their original bytes.

## Native reliability/security gates — pending

- Real SQLCipher runtime/cipher_version, iOS keychain/Android keystore, device lock, wrong/missing keys, OS backup/restore and offline cold launch must pass on physical devices. Host encryption tests and JavaScript exports do not pass these gates.
- Reuse original attachment crash protocol tests: reserve/write/rename/ready boundaries, .part recovery, missing/corrupt files, deletion retry and preserved orphans. Confirm existing v1 encrypted files decrypt after the v4 migration.
- iOS evidence/DB backup exclusion is not implemented/verified. Android allowBackup=false and SecureStore exclusions are generated but transfer behaviour remains unverified. No real customer data until resolved.
- Verify camera denial/cancellation, single JPEG/PNG input, JPEG normalisation, EXIF/orientation handling, metadata stripping, twenty-photo and byte limits. Test portrait/landscape input on both OSs.
- Inspect plaintext picker/manipulator/print/export cache cleanup normally and after process kill/restart. App sandbox protection is not application-level encryption of those temporary files. Secure flash erasure cannot be promised.
- Share a synthetic PDF through supported recipient apps. Verify recipient reading after temporary URI cleanup; returning from the share sheet does not confirm delivery. Retention changes need a bounded protection policy, not indefinite plaintext copies.

## UI and report gates — pending where noted

- On small Android/iPhone displays and with large font scaling, complete critical workflows with keyboard, screen reader and outcome controls. Verify focus, selected state, error announcements, touch targets, back/swipe guards and form scrolling. Source layout uses wrapping, system type, minimum touch sizes and keyboard avoidance; no native usability pass is claimed.
- Native expo-print must render readable A4 pages for short and long findings, long site/contact details, 0/6/20 images, rotated inputs, missing files, all-N/A and corrected inspections. Host WeasyPrint visual/content checks are supplementary only.
- Native print/sharing acceptance, performance/memory and device timing targets remain pending. The management sample uses realistic short content; stress fixtures stay under scripts/report-stress.mjs and ignored artifacts.

## Production work still absent

Authentication, memberships/server permissions/RLS, server media validation, idempotent sync/conflicts/deletion, submission/approval, secure expiring/revocable report links, backup/recovery automation, privacy/account controls and pilot operations. Local completion must later map to pending submission rather than fabricate a server receipt. Billing and publication require later release work and authorisation.

Dependency advisories remain a real-data/release blocker; current audit is not clean. Physical-device acceptance, specialist review and privacy gates have not been replaced by AI/host tests.
