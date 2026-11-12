# Stitch interface integration — 23 October 2026

## Baseline and design mapping

Application baseline: f4da4511c1037b9facb9fb6e380578ce24daff8a. All four user-supplied archives were extracted and their code.html, screen.png and DESIGN.md inspected.

| Archive | Supplied screen | Implementation |
|---|---|---|
| stitch_cleanproof_quality_saas (1)(1).zip | Active Audit | Active inspection: result cards, progress metrics, failure styling, section navigation, comments and evidence actions |
| stitch_cleanproof_quality_saas(1).zip | Inspection evidence | Capture/gallery controls, protected photo thumbnails, captions, recovery and read-only history |
| stitch_cleanproof_quality_saas (2)(1).zip | Action Detail | Action status, responsible person, location/inspection context, resolution evidence/notes/history |
| stitch_cleanproof_quality_saas (3)(1).zip | Inspection Summary | Report score, result metrics, findings, actions and explicit local export |

The exports contain no bundled fonts/icons/images beyond screenshots; their HTML points to Google Fonts, Material Symbols, Tailwind CDN and remote illustrative images. Runtime scripts and remote illustrative photos were not imported. Inter and Manrope TTFs were downloaded from Google's font distribution and bundled locally with OFL notices. Native screens retain system-font fallback; a native font integration/build is not claimed. Navigation glyphs use platform text rather than adding an icon dependency.

Home, customers, sites, templates, history, settings, account and sync extend the shared design because no corresponding screen was supplied. Shared React Native tokens/components support desktop side navigation and compact mobile bottom navigation with a full More menu. All data and operations retain the existing repositories/adapters. New Reports navigation opens actual inspection records rather than a fixed sample.

## Deliberate differences

No invented zones, timer, audit grade, ISO compliance, GPS/geo-stamps, digital signature, report issuance, voice transcription, phone/messages, notification delivery, before/after classification or server-vault success. These appear in the designs but are not implemented business capabilities. Actual snapshot content, score definition, required explanations, corrective-action validation and truthful local/sync states remain authoritative. The darker emerald primary from the supplied token palette keeps white button text readable. Desktop layout is an extension of the mobile references.

Shared report HTML retains the previous alignment correction: paper margins, responsive metadata, in-flow footer, image containment and separate A4 print margins. Colours now match the supplied emerald/navy palette. Native PDF rendering and print pagination remain device acceptance gates.

## Newly observed checks

- TypeScript and 65 host tests: passed, zero skips (SQLCipher host fixture configured). Existing tests cover catalogue/template snapshots, draft persistence, scoring/N/A, completion/corrections, attachment lifecycle, action history and report content; these do not establish browser interaction or native execution.
- Expo web export: passed.
- Browser at 1363 px: new sidebar, typography/layout and protected-workspace opening screen rendered. Phone-width control: sidebar replaced by bottom navigation and More menu, all route controls present, no document horizontal overflow. More menu opened successfully.
- Real shared report builder generated a synthetic completed inspection/action/photo report. All four desktop report pages measured without horizontal overflow or footer overlap.
- Browser logs checked during shell testing: extension metadata errors only; no application errors in the inspected shell.
- Full encrypted browser workflow automation: NOT RUN in this session. The managed preview is HTTP; WebCrypto was unavailable in the earlier protected-workspace execution record. Browser credential-state recovery subsequently blocked further automation. No plaintext fallback, bypass or simulated server was introduced. Customer/site edits, template versioning, draft reopening, upload, resolution/completion and reload persistence are supported by preserved services/host coverage, but must not be recorded as newly passed browser interaction tests.
- Narrow long-report fixture, browser print/export and end-to-end redesigned screens after unlock: NOT RUN to completion here.
- Native Android/iOS builds/devices and real Supabase Auth/REST/Storage/Edge acceptance: remain pending, unchanged. No APK/signing changes.

## Preview use

Open the existing owner-private HTTPS preview. Reuse the browser workspace passphrase to keep saved work. Company & people provides the existing explicit synthetic demo profile. Do not reset an existing workspace to adopt the new interface. The hosted target remains local-only: account authentication, server synchronisation, company enforcement and secure client links are unavailable there. Browser storage is distinct from native SQLCipher/device-bound keys.

No migrations, records, queues, encryption algorithms or secrets were changed. Actual cash expenditure: £0.
