# PDF download and signed-out identity privacy correction

26 October 2026 · Sicy International Ltd · staging only.

## Proven source causes

The browser report screen called `showReportPreview(inspectionReport(...))` and stopped. The web `generateDemoPdf` adapter deliberately threw an unsupported-native error. There was no web PDF encoder/download operation. A preview-open message was not download evidence.

`CustomerEntry.web.tsx` read and wrote `remembered-accounts-v1`, rendered “Choose an account”, and copied selected email hints into the form. This was application-maintained identity metadata, separate from password-manager autofill.

## Implemented

- `inspectionPdf.ts`: real A4 PDF bytes using pinned free MIT pdf-lib/fontkit, existing locally hosted Inter fonts and the current authorised WorkflowRepository report data. Includes branding/contact, customer/site/address, date/timezone, inspector, report reference, status, checklist results/notes, score with explicit all-N/A behaviour, corrections, actions/resolution and available evidence captions/images. No external rendering service or public report storage.
- Explicit text wrapping, continuation pages, footer/page count and uncropped image fitting. Existing browser/native capture paths normalise JPEG orientation; arbitrary external EXIF-only images are not introduced by this export.
- QA caught a missing-glyph defect with subsetted Inter fonts. Full TTF embedding fixed the rendered pages; regression asserts the complete original font programs are embedded.
- The first deployed Metro build exposed a PDF dependency interop failure (`tslib` ESM wrapper default export was undefined) before sign-in. The official self-contained PDF distribution avoids that wrapper, and the renderer is now lazy-loaded only for export, outside authentication bootstrap. Hosted startup is retested after the correction.
- Real **Download PDF** action is separate from **Preview / Print report**. Blob content type `application/pdf`, safe site/date/reference filename; generating/error/ready states. Prepared-file download and browser-viewer links remain available for user-gesture retry. Wording confirms generation/download request only, never delivery or saving to disk.
- Missing/corrupt required photographs block PDF generation, with recovery instructions. HTML preview can show an incomplete-evidence warning. Font/network failures get actionable errors; unsupported glyphs fail explicitly with Preview / Print fallback, not silent loss.
- PDF bytes/Blob URLs stay in memory until closed/replaced/logout; no plaintext report is placed into local databases or public storage. Logout invalidates pending export generations and revokes prepared URLs; a late old-account generation cannot publish into the new account. Downloaded copies are outside service revocation.
- Native PDF generation/encrypted vault/export pipeline remains intact. No database or server-policy migration is needed.
- All remembered-account UI/read/write paths removed from entry screens. Only the obsolete metadata key is cleared on startup, successful entry and logout. No session, encryption key, database, photo or queue is deleted. Authenticated profile switching/logout remain; switching signs out the old identity and clears name/email form state. Browser-controlled autofill remains supported.

## Newly observed checks

- TypeScript typecheck and test compilation: passed.
- Host suite: 119 passed, one optional native-driver check skipped (120 total).
- Existing backend fixtures: 25 passed; these are not real Auth/REST/Storage acceptance.
- Authentication/build configuration tests: 7 passed.
- Production web export: passed after serialising builds and cleaning generated dist output; an overlapping intermediate export hit EEXIST on the new notices directory. A regression-test typing error was corrected before the final clean typecheck and suite. Expo emitted its existing forced-process-exit notice after successful export.
- New coverage: valid PDF bytes/A4/metadata/full font programs; photos/no-photo/all-N/A; 40-item long-text pagination; missing/corrupt/foreign images; filenames/unsupported glyphs; MIME/download filename/URL cleanup; late-result fencing; font failure; removing only identity hints without removing protected work/session/key data.
- Independently generated synthetic PDFs: with photo 3 pages, no photo 2 pages, 30-item long-notes 16 pages. Poppler parsed them, extracted company/site/results/actions text, and rendered pages for visual inspection. Header/body/evidence and middle/last long-report pages checked. These are renderer output tests, NOT an authenticated hosted inspection download.
- An earlier isolated browser fixture used the application renderer/export controller before the final Metro-runtime import correction (not a redesigned mockup). Its generation observations are supporting evidence, not final hosted export acceptance. Generation and actionable missing-photo failure observed in a sandboxed iframe. The initial unbundled fixture had a missing `pako` module; that QA fixture was corrected. Application Metro production bundle uses the installed dependencies and built successfully.
- Cloud browser's automatic/user-gesture download completion event timed out; it did not yield a downloaded file. The browser-viewer fallback opened a Blob tab, but the browser observation policy rejected the `blob:` protocol. No alternate protocol/control workaround was attempted. Browser download receipt/opened-file acceptance remains **blocked/unverified**, not passed from the ready message.
- Hosted application opened signed out before changes. Prior secure sign-in was declined; it was not retried. Authenticated completed-inspection download, logout from an active workspace, Back and account-switch acceptance remain pending. Signed-out screens are checked after deployment separately.
- Dependency audit remains 8 findings (5 high, 3 moderate), matching the existing totals; no forced downgrade or encryption change. Dependency release decisions remain open.

## Reproducible checks

```sh
npm ci
npm ci --prefix backend
node node_modules/typescript/bin/tsc --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.tests.json
node --test .test-build/tests/*.test.js
node --test --test-concurrency=1 backend/tests/*.test.mjs
node --test scripts/auth-return-bootstrap.test.mjs scripts/build-customer.test.mjs
node scripts/check-secrets.mjs
npm run build
node scripts/verify-pdf-output.mjs
# Optional local renderer QA (Poppler):
pdfinfo artifacts/pdf-qa/with-photo.pdf
pdftotext -layout artifacts/pdf-qa/with-photo.pdf -
pdftoppm -png artifacts/pdf-qa/with-photo.pdf artifacts/pdf-qa/page
```

## Remaining acceptance / release scope

Use an authorised synthetic completed inspection in the actual hosted app. Download with/no photos and long content; check a physical saved file in standalone and embedded browsers; inspect dates, findings, page breaks and photo orientation. If an embed blocks download, use the prepared link or Open PDF in browser under a direct user gesture. Do not claim receipt until a file is saved/opened.

Then logout, refresh, navigate Back and switch A → B → A. No app-remembered email/selector should appear, no protected content should render after logout, and each account's encrypted work/queues must remain separate. Authentication, native Android/iOS, real services, recovery and operational release gates remain as documented. This increment does not establish customer readiness. Expenditure: £0.
