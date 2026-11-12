# Newly observed verification — 21 October 2026

This record separates new observations from docs/VERIFICATION.md's 20 October results. All data is synthetic. Incremental cash expenditure: **£0**. No purchases, paid accounts, production backend, remote repository, publication or changes to other Sicy apps.

## Baseline establishment

- Materialised the supplied CleanProof-CP001-Source(1).zip (194,137 bytes), restored its included Git bundle to a working repository. Original commit **4a73f802415a78f30a2f52711b3e6a8bdeea9ee0** remains the ancestor.
- Read the ZIP's README, ARCHITECTURE, NEXT-TASK, VERIFICATION and NATIVE-ACCEPTANCE. Read the found 29-page Phase 1 specification, supplied one-page priority list and the research's cleaning opportunity pages 11–12. CP002 is a label supplied in the continuation request; Phase 1 explicitly defines CP001 and M1–M12, not an independent CP002 task.
- Observed Linux, Node 24.19.0, npm 11.9, Java available. No adb/Android SDK, Xcode, iOS simulator or physical device connection available. Native acceptance was not executed.
- Ran npm ci against the original lockfile, then baseline check: **17 passed, 1 optional SQLCipher test skipped**, typecheck passed. Baseline audit: 26 affected entries (19 high/7 moderate).

## Continuation checks

- Installed four SDK-matched native modules without paid services, then a fresh final npm ci from the updated lockfile succeeded.
- Final npm run typecheck: passed.
- Final test run with the existing external host SQLCipher driver: **30 passed, 0 failed, 0 skipped**. Driver sqlcipher3-binary 0.6.0 is not bundled in mobile dependencies.
- The retained real host SQLCipher test forcibly terminates its writer, checks recovery and rejects wrong keys. Original forced-kill SQLite tests also still pass. New file lifecycle faults use in-memory file adapters and real host AES-GCM; they are **not physical-device power-loss tests**.
- New coverage: exact v1 payload/outbox migration preservation, repeated migration, rollback after injected DDL failure, independent drafts, immutable versions/historic context, archive preservation, local invalid-scope rejection, catalogue event rollback, site/photo limits, AES-GCM tamper/context-swap detection, interrupted part recovery, final file preservation after event failure, missing files, tombstone retry, orphan preservation, HTML escaping/base64 and all-N/A handling.
- Final Expo Metro/Hermes export --platform all: Android and iOS bundles produced successfully. This validates JavaScript bundling, not native binaries.
- Final expo prebuild --no-install: Android/iOS generation succeeded. Inspected generated settings: SQLCipher true on both; Android allowBackup=false; camera/photo-library permission strings present; no iOS microphone usage string. Native build dependencies were not installed/compiled.
- npm run preview:report: created self-contained previews/demo-report.html from the application's actual report builder and synthetic JPEG fixture. HTML structure, inline JPEG decoding/dimensions and absence of scripts checked. Headless Chromium was unavailable; an attempted free browser download failed, so visual browser/native pagination was **not verified**. No screenshot or rendered PDF is presented as native evidence.
- Final dependency audit after module additions: **27 affected entries, 19 high/8 moderate**. Same braces/node-forge/uuid root findings; extra config-plugin path from sharing. Official advisories were reassessed; no forced downgrade or suppressions. docs/DEPENDENCIES.md and docs/evidence/dependency-audit.json retain details. This is an unresolved release blocker.

## Exit status

**M1: source spike implemented; compatibility acceptance pending.** A real Android and iPhone must open the encrypted DB, capture a synthetic image and render/export an actual readable PDF. Host tests, prebuild and HTML preview do not satisfy that exit.

**CP002: local catalogue/versioned-template/multiple-draft increment implemented and host-tested; native UI acceptance pending.** This contributes to Phase 1 M2/M3 and FR04–FR07. Production roles, online-only metadata administration, assigned inspectors and server limits/isolation remain absent.

No full MVP, safe real-data pilot, secure client-sharing feature or app-store readiness is claimed. Existing and new queues are pending local records, never server acknowledged. Next work and all pending gates: NEXT-TASK.md and ACCEPTANCE-CONTINUATION.md. No benchmark timings or native test outcomes were invented.
