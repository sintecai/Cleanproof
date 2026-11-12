# Release preview and acceptance — 2 November 2026

UI/authentication/features remain frozen. Only the isolated showcase's link to the new connected preview changed. Original staging was not overwritten; browser storage, keys and queues were not cleared. Neither preview imports device-only records from another origin.

## Separate previews

- Connected staging browser app: https://cleanproof-release-connected.sintecai26.chatgpt.site . Normal CleanProof email/password authentication; no additional hosting gate. Uses vmvoeksprlwjiwfxqita, not production.
- Public synthetic showcase: https://cleanproof-release-showcase.sintecai26.chatgpt.site . No real accounts or backend; temporary synthetic per-tab workspace. Mobile width by default; ?view=desktop selects desktop layout. Do not confuse synthetic completion with server acceptance.

## Actual findings

Fresh locked-install checks: application 147 passed / 1 optional SQLCipher-driver skip; backend 36 passed; callback/build/administrator configuration 16 passed. Two web exports passed before the environment reset. Audit remains 12 moderate, no high/critical. No forced dependency upgrades or waived findings.

Real production HTTP checks: email/password and signup enabled, Google disabled, mailer_autoconfirm=false (Confirm email ON). Eight negative JWT/CORS checks passed. Twelve migrations and both active v1/JWT-verified functions remain deployed, unchanged. Production currently has zero users, companies and storage objects; bucket remains private. This is not positive two-account acceptance.

Real staging HTTP settings: email/password and signup enabled, Confirm email OFF, Google disabled. **New connected preview photo-transfer preflight returns 403, no allowed origin.** It needs exact-origin configuration before photo transfer can pass. Recovery redirect/SMTP settings are not verified for this new origin. No sign-in handoff was opened; authenticated browser acceptance remains pending.

Public synthetic browser: 20 consecutive Sites/Inspections/Actions/Home switches showed no lock page or startup reset. History retained the draft. Five Pass answers and a comment were entered; completion produced a read-only record and the in-app report displayed those values. No photographs uploaded; no installed-device result. Both in-app and standalone PDF download events timed out without a saved file path in this cloud browser. Standalone handoff displayed the correct two-page report and comment. Fresh actual file-save/open acceptance remains inconclusive; prior successful download evidence is retained, not replaced by a new pass. Closing the report returned to the existing workspace without the removed lock page.

## Remaining gates

Production immediate signup, positive production isolation/photo/sync/erasure, recovery inbox/reset/login, approved retention and full paired hosted restore, approved permanent IDs/signing, signed AAB/IPA, uploads, installed Android/iPhone acceptance and final store URLs remain pending. Not submission-ready. No charges or public submission authorised or performed.

The twelve moderate findings remain the documented glob/minimatch transitive build-tool families. Do not force cross-major overrides. Reassess vendor-compatible updates and reachability before signing; restricted CI input mitigates but does not close the finding.
