# Report export repair — 30 October 2026

Scope: web report host, prepared PDF lifetime/save actions and associated tests. Authentication, logo, navigation, storage and native PDF/export code unchanged.

## Toolbar-only update — 30 October 2026

The current toolbar contains only Open in browser and Close report. Save, download and print controls and their instructions/status messages were removed from this toolbar. PDF generation and report contents remain unchanged. Open in browser opens an HTML copy of the exact current report without relying on a PDF plugin.

Browser component test: Open in browser created a new tab titled CP-44444444 Inspection report; browser inspection of that Blob tab was denied because the browser tool permits only HTTP/HTTPS observation. The denial was not bypassed. Close report dismissed the dialog and returned to the fixture screen. This is component testing with synthetic data, not authenticated hosted acceptance. The private hosted preview remains behind its existing ChatGPT access gate.

The save/download behaviours documented below are historical evidence from the previous increment, not controls in the current toolbar.

## Historical findings and changes

The prepared-PDF dialog used only an iframe pointing to a Blob PDF URL. This requires a functioning browser PDF plugin; no readable fallback existed in that dialog. It now renders sandboxed HTML from the exact report data/photographs used for PDF generation. PDF bytes, filename, Blob URL and HTML remain paired until close/replacement/sign-out. Replacing a report cannot reuse the previous snapshot; opening HTML preview closes an old PDF.

Save PDF to device uses the supported File System Access save picker when available and returns success only after write and close complete. Cancellation keeps the report available. Unsupported browsers request the usual download using the retained URL. The direct download link and optional Open PDF in browser remain. No download-request message claims file receipt. A write is fenced if the report is closed/replaced.

## Actual evidence

- npm run check: typecheck passed; 128 tests passed, one existing SQLCipher driver test skipped.
- Connected web build passed.
- Browser component fixture uses the real BrowserReportHost and PDF generator with isolated synthetic data, not a signed-in workspace. Both North and South report previews were rendered. Verified South site name, distinct comment and image. Closing returned to fixture screen.
- Browser Blob-link click and supported media download both timed out without a download event. No authoritative browser error identified the reason. A data-URL experiment also failed and was removed. File-save picker was unavailable in this browser context. Browser save/download acceptance remains FAILED/BLOCKED; do not call it fixed.
- Independently saved generator outputs: North 393298 bytes, South 393275 bytes. Both parse; PDF text extraction confirms different site/comment/reference. North has three pages and one JPEG. First two pages visually inspected. These files were not obtained by a successful UI download.
- Authenticated selected-inspection flow, session/report-return, embedded ChatGPT download restrictions, physical Android/iOS export/share: NOT RUN. No authenticated synthetic session was available; prior declined sign-in was not repeated.

## Reproduce isolated browser check

After npm ci: EXPO_PUBLIC_CLEANPROOF_PHONE_PREVIEW=1 npm run build
Then: node scripts/build-report-check.mjs
Open /report-check/ on the separate private preview. It is explicitly a synthetic report-component fixture, does not create accounts or alter customer storage, and is not customer acceptance.

No original staging deployment, account data, encryption keys, local database or unsent operations were modified.

## Mobile visual refresh and three-action report toolbar — 30 October 2026

Changes: exactly Download PDF / Open in browser / Close report in the web report toolbar. Download is a genuine Blob anchor (browser fallback) or synchronous user-gesture File System Access picker. A closed/replaced report fences picker writes. The Blob remains available until close/replacement/account retirement. Only a completed picker write says saved; fallback says requested. One Open report launcher generates paired HTML/PDF; no duplicate download controls. Native encrypted PDF generation and system share/export remain; temporary native filename now includes a report reference. Share-sheet return is not delivery confirmation.

Shared Expo/RN Page, cards, fields and colours now use warm white, navy, mint and emerald. Every Page gets lightweight cleaning artwork and reduced-motion-aware bubbles; bottom navigation remains outside scrolling content with safe-area handling. Authentication forms and logic, logo, repositories, keys, queues and backend policies are unchanged.

Validation:
- `npm run check`: 128 passed; one existing SQLCipher-related skip.
- `EXPO_PUBLIC_CLEANPROOF_PHONE_PREVIEW=1 npm run build`: passed.
- `node scripts/build-report-check.mjs`: passed.
- `node scripts/build-visual-check.mjs`: passed. Optional isolated component gallery, not an authenticated customer workflow.
- Shared component headings for Dashboard, Customers, Sites, Templates, Inspections, Actions, History, Reports and Settings visible at 320, 430 and 1100px containers. Phone and desktop screenshots inspected. This is shared-component fixture coverage, not all real record-driven screen states.
- Real BrowserReportHost + PDF engine in local browser fixture: North and South reports prepared with distinct references, comments, photograph and action. Close returned to fixture; replacement used a fresh report URL.
- North Download PDF: direct anchor clicked, requested status shown; browser download event timed out after 15 seconds. South attempt also timed out. No completed browser file was available; download acceptance is NOT passed. Available logs showed browser extension metadata errors, no proven application download root cause. Do not assert a hosting restriction without further evidence.
- Independently generated current-engine PDF outputs: North 393298 bytes, South 393275 bytes; valid PDFs with meaningful filenames. North: 3 A4 pages, all rendered and inspected (findings, action, photograph). South text contains its distinct site and comment. These are generator outputs, NOT files downloaded through the UI.
- Actual customer entry loaded from current production web build in local QA: existing Sign in/Create account/Forgot password retained. Local HTTP environment reported a bootstrap request error; connected login was not exercised.

Remaining gates: authenticated hosted workflow behind existing hosting access gate; actual device file save in supported standalone browser; embedded-preview download permission behaviour; full record-driven mobile/desktop workflows and flicker acceptance; Android/iOS compilation/device export, camera, safe areas and data persistence. Native share API remains unchanged and is not device-verified. Original staging and original unbacked-up browser profile are untouched. No storage reset, data migration, account mutation or expense performed.

## Full-page water/glass background and private export handoff — 30 October 2026

The previous small decorative panel, rings, tile and sparkle are removed. One 238 KiB bundled glass/water/foam background now covers the persistent layout, behind clear content surfaces. The web compositor animation and native animation both have reduced-motion/static fallbacks and pause while inactive. Only the authenticated wrapper/canvas background changed; authentication form layout and behaviour are unchanged. Logo, navigation operations, encrypted stores, permissions, migrations and queues are unchanged.

### Download investigation and correction

- Existing local standalone fixture reproduced the failure: clicking its Blob download link produced no completed download event within 8 seconds. The save-picker API was unavailable in this local QA context. Therefore the screenshot's precise save-picker rejection could not be reproduced here, and its original error code is not proven.
- Source inspection found that the previous UI unconditionally tried any exposed picker, collapsed every rejection into one message and offered no functional handoff. `PdfSaveError` now preserves bounded safe categories (policy, write, changed report). A policy-denial regression test confirms the report remains available and no success is reported.
- Exactly three web toolbar actions remain. In an embedded context Download PDF opens the new same-origin `/report-export.html` route directly from the click. Open in browser uses the same route.
- The route receives only the selected Blob/filename/static report HTML through a one-time origin + WindowProxy + random challenge exchange. No session, backend credential, report body in a URL, server upload or persistent report storage. Sender listeners are bounded; receiver creates its own URL, severs opener access, and revokes it at close/pagehide/15-minute expiry. This is an explicit exported copy, independent of the workspace, and cannot recall already saved files. A direct visit/reload contains no saved report.
- Receiver has a restrictive CSP, no outbound connections, sandboxed script-free report iframe and safe filename validation. No hosting audience/security setting changed.
- Top-level export uses the file-save picker where supported, initiated before asynchronous work; a completed write/close alone says saved. A cancellation remains cancellation; policy failure offers a standard download on another explicit click. A standard download only says requested.
- Browser execution exposed `crypto.randomUUID()` unavailable in local HTTP QA; changed the new handoff to cryptographically random bytes via `crypto.getRandomValues()` and retested successfully.

### Actual acceptance outcomes

- `npm run check`: 132 passed, one existing SQLCipher skip (133 tests). Includes selected-report pairing, Blob lifetime, picker policy failure, blocked popup, source/origin/challenge rejection and receiver validation. These are automated tests, not browser file-save proof.
- Production phone-preview web build, isolated report bundle and visual-check bundle passed.
- Local browser component gallery: all nine page headings visible at 320, 430 and 1100px. Mobile/desktop screenshots inspected; full background visible, card/field text readable. Mobile scrolling reaches bottom content with navigation outside the scroll area. More navigation opens/closes. Twenty repeated page selections retained one background layer; computed transform progressed without restarting. This is shared-component coverage, not authenticated route/flicker acceptance. Reduced-motion behaviour is implemented; the browser media preference itself was not toggled in this test environment.
- Actual local BrowserReportHost and PDF engine: North report opened in the new same-origin export window with correct North site, reference, findings, photo and action. An intentionally download-restricted embedded fixture's Download PDF opened a separate export window containing South site, distinct reference and distinct comment. Both handoffs succeeded; return/Close report returned to the fixture without a lock page. These are synthetic component tests, not customer-account persistence tests.
- North standalone download click timed out after 12 seconds; browser-supported downloadMedia also timed out. South standalone click timed out after 8 seconds. No downloaded file path was returned. Available logs contained extension metadata errors but no definitive browser download rejection reason. Thus actual device file delivery, exact hosting restriction and a completed download fallback remain UNVERIFIED. Do not call downloads fixed from the successful document handoff alone.
- The unchanged PDF engine's independent generated-output validation (recorded above) and current paired-report tests establish valid, distinct PDF bytes, meaningful filenames, pagination and retained photograph/action content. They are not downloaded-file acceptance.
- Hosted connected app still requires the existing ChatGPT hosting gate; no fresh secure sign-in attempt made after prior declined handoffs. Full authenticated mobile/desktop workflows and tab switching remain pending.
- Native encrypted PDF generation/system sharing retained. Opening/dismissing the native share sheet is not saved-file proof. No Android/iOS build, emulator or physical-device export test performed this turn.

No original staging update, storage deletion, account/password change, key replacement, data migration or paid service. Original device-only work remains untouched and unbacked-up. The separate owner-private preview is the only deployment target.
