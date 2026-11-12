# M1 and CP002 acceptance checklist

## Host acceptance implemented

- Migrate v1 fixture with acknowledged draft/outbox; compare exact JSON/revision/count. Inject DDL failure; verify rollback to v1. Repeat upgrade safely.
- Verify independent drafts, historic wording after template edit, archived parent denial for new work, local company-scope rejection, twenty-photo/ten-site guards and catalogue event atomicity.
- Verify AES-GCM tamper/context-swap rejection, interrupted .part recovery, final-file retention after metadata/event failure, missing-file state, deletion retry and orphan preservation.
- Verify report HTML escapes text, uses inline image data, counts N/A correctly, and does not imply submission/approval. All-N/A/empty applicable denominator has no percentage.

## Pending native M1 gates — both physical platforms

Use original NATIVE-ACCEPTANCE.md first. Add these records to a device/OS/build/commit log; none has passed in this environment:

1. Rebuild native app with all new modules. Confirm cipher_version, secure-key/device-lock behaviour and original CP001 save/retry/crash tests still pass. Use an embedded-bundle local build for airplane-mode cold launch.
2. Camera: approve/decline/permanently deny; cancel; Android activity destruction; photo library cancel/limited permission. Use synthetic JPEG and PNG only, landscape/portrait/EXIF-rotated fixtures. Confirm no microphone/gallery writes and no permission requirement blocks checklist use.
3. Confirm normalised image <=1,600px long edge, JPEG, intended orientation, no retained EXIF/location metadata, <=1 MB. Check 200–400 KB target empirically rather than promising it for every image. Capture/conversion before acknowledgement can fail without retaining an original; the UI must not call that saved evidence.
4. Kill after journal reserve, during encrypted write, after rename, before ready/event commit, and after acknowledgement. Reopen and inspect recovery states. Ready acknowledgement must recover exact bytes. Missing/corrupt evidence must block report generation. Inject storage exhaustion and file-delete failure without using real data.
5. Inspect sandbox to verify sealed files are encrypted and original/normalised/PDF plaintext caches clear after normal use and next media-workspace open after a kill. Confirm picker/manipulator/Print cache names on both OSs. iOS backup exclusion for evidence and transient data is **not yet implemented/tested**; Android allowBackup=false is generated, but OS transfer behaviour still needs testing. Do not use real data until backup/privacy gates are resolved.
6. Generate/inspect actual native PDFs with 0, 6 and 20 photographs, 2,000-character notes, Unicode/£, all N/A, unanswered items, rotated images and missing files. Check A4 pagination, no text clipping, image legibility, <10 MB and memory/elapsed time. Page numbering/issued branding/action summaries are later report work, not fulfilled by the M1 draft sample.
7. Share via at least one target app on each OS. Confirm output is readable after temporary URI cleanup, cancellation is handled and no delivery-success message is fabricated. If a target consumes the URI after the share promise resolves, record a compatibility failure and design bounded explicitly protected export retention before acceptance; do not retain plaintext indefinitely.
8. Back/swipe/hardware navigation during note saves and media operations: no silent form loss. On a failed note commit navigation stays on the form. Repeated open/close of lab and workspace should not close a database connection while another operation uses it.

## CP002 local UI gates — pending native execution

Create/edit/archive two customers and four sites; validate names/contact/address/timezones and ten-site guard. Create, clone, reorder and rename items/sections in templates; publish v2; inspect an earlier draft and confirm v1 wording and customer/site context. Archive parents: old drafts remain readable; new draft creation is denied. Create >20 drafts and exercise history increments. Restart with active/pending drafts; compare notes and queue counts.

Production gaps are explicit: no auth/owner-only server administration, staff assignments, backend limits/RLS, server submission/approval, action workflow, server sync, issued reports or protected links. Local metadata creation is a synthetic development facility and must not bypass those future requirements.
