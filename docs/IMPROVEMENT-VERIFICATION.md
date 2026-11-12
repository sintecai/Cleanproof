# Project improvement verification — 21 October 2026

New observations for 0.3; previous records remain historical. Source restored from the supplied M1/CP002 ZIP and its Git bundle, retaining commits 4a73f80 and 1bfff7b. No research restart, account, remote repository, production backend, paid service, publication, live data or change to another app. Incremental cash: £0.

## Baseline and environment

Read README, architecture, migrations, verification, native/continuation acceptance and attachment lifecycle notes before implementation. Ran locked npm ci. Fresh baseline: typecheck and all 30 host tests passed with the external SQLCipher driver. Linux/Node 24.19.0/npm 11.9, Java present; no adb/Android SDK, Xcode, iOS simulator or physical devices. No APK/IPA was built or run.

## Implemented and checked

- Additive v4 migration retains existing draft JSON/revisions/outbox/contexts and v1 media encryption format. Rollback after injected v4 failure preserves v3 payloads; original v1 migration/crash/recovery tests remain.
- Local completion requires validated answers/notes, expected revision, inspector, failure actions and verified photo manifest. Completed snapshots/answers are immutable; correction drafts link to originals.
- Local action creation, owner/due-date edits, resolution/reopening, expected revisions, event rollback, retained resolution notes and evidence-history protection.
- Shared professional native/report builder, draft/completed-local labels, scoring, escaped text, inline photos, action as-of contents, numbered A4 sections and long-detail continuation.
- Native UI source: coherent navigation, searchable records, version editor, progress/outcomes/comments/photos, completed history, action management and reports. No unused decorative dashboard controls or simulated sync success.

Fresh final checks: typecheck passed; **40 host tests passed, 0 failed/0 skipped** with external sqlcipher3-binary 0.6.0. Normal npm test skips that one optional integration (39 pass/1 skip). Original real host SQLCipher forced-kill/wrong-key and atomic rollback checks still pass. New lifecycle/file tests use actual host SQLite/AES interfaces; they are not native phone tests.

Both Android/iOS Metro/Hermes bundles and native configuration generation succeeded. These are not native builds. Generated configuration retains SQLCipher on both platforms, Android allowBackup=false, camera/photo permission strings and no iOS microphone usage string.

## Preview and PDF evidence

The self-contained browser workflow reconstruction shares pure domain/scoring/review functions and the native report HTML builder, with in-memory synthetic data only. An optional jsdom DOM test exercised validation, outcomes, failed-item action creation, sample attachment, completion, report iframe, action resolution, new site and template version. It does not execute native components, secure storage, actual camera, PDF/OS sharing or a backend.

Headless Chromium was not available. Attempts to prepare a host browser failed because of extraction/launch environment limitations. A DOM test is not visual browser testing; no browser/native UI screenshot is presented as native execution.

A sample four-page A4 PDF was generated from the application's actual report HTML using free host WeasyPrint 66.0 and visually inspected via Poppler page images. It contains concise realistic synthetic findings, one synthetic photo and an action. It is a host-rendered sample, not proof of expo-print pagination.

Long details/2,000-character-note and all-N/A stress HTML/PDF fixtures were generated separately. Content checks preserve all long-note end markers and the no-applicable-score statement. A first stress run exposed cover overflow; fixed by bounded cover fields and an explicit full-details continuation page. Re-runs passed those content checks. The fixed sample pages were visually inspected. Native rotation, 20-photo memory/pagination and all target share recipients remain pending.

## Dependency review and unresolved gates

Fresh audit still reports **27 affected dependency entries: 19 high, 8 moderate**, primarily braces/node-forge/uuid build-tool paths. No mobile dependency was added. Official GHSA-vfj7-8cjw-p6xm and GHSA-86w9-cpqp-85rv still list no patched version; uuid's patched major lines do not justify an untested transitive major override. No force/downgrade/suppression was applied. No runtime reachability clearance is claimed. See DEPENDENCIES.md and evidence.

All physical Android/iPhone, native encryption/key storage, offline cold launch, iOS backup exclusion, native PDF/share compatibility, small-screen/large-text/screen-reader and operational release gates remain open. No complete MVP, real-data readiness, secure client sharing or server synchronisation is claimed. Remaining work and acceptance: IMPROVEMENT-ACCEPTANCE.md.
