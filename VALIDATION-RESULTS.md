> Latest follow-up: [SIGNUP-POLICY-LAYOUT-FIX.md](SIGNUP-POLICY-LAYOUT-FIX.md) records the live backend confirmation-policy mismatch and verified form-scroll correction. Positive customer acceptance remains blocked.

> Current immediate-signup results: see IMMEDIATE-SIGNUP-ACCEPTANCE.md. Backend policy currently fails the new requirement; earlier confirmation-required policy passes below are historical.

# Current security/auth follow-up — 26 October 2026

Baseline b701ef9. This delivery: typecheck passed; host 88 passed/1 optional SQLCipher skipped; backend PostgreSQL/plugin fixtures 23 passed; config/bootstrap tests 9 passed; web export succeeded (Expo emitted a forced-exit warning after export; command returned zero). Real hosted smoke 9 negative/availability/access probes passed, no positive account authentication. npm audit returned nonzero with 8 affected entries, 5 high/3 moderate; no unsupported downgrade performed. Secret-pattern scan passed with known limits. Tests ran against the exact changes committed in this delivery; final commit is in SOURCE-COMMIT.txt. Runtime environment/project-key pairing was inspected, no SMTP configuration or credential was changed. See SECURITY-AND-AUTH-ACCEPTANCE.md for full evidence and blockers.

## Earlier source-delivery validation (historical)

# Reproducible validation — 26 October 2026

See SOURCE-COMMIT.txt for final delivery HEAD. Runtime source tested is recovered deployed commit 148cd2085a354f9fce3818e01ec3c5c4a2cc9564 plus the tracked delivery template/test/document changes. Host runtime source was unchanged by the mail-template correction. No previous test result is relabelled as fresh native/customer acceptance.

```sh
node --version
npm ci --ignore-scripts --no-audit --no-fund
npm ci --prefix backend --ignore-scripts --no-audit --no-fund
npm run check
npm run test:backend
node --test scripts/email-only.test.mjs scripts/auth-return-bootstrap.test.mjs scripts/static-route-entries.test.mjs scripts/build-customer.test.mjs
npm run build
npm run secrets:check
npm run test:staging-smoke
```

Observed: Node 24.22.1; root typecheck/host 86 pass, 1 skip; backend fixtures 23 pass; config tests 8 pass; connected production-mode web export passed; actual staging smoke 9 passed (negative/availability checks only). The optional SQLCipher host driver was absent. No real-account credentials were used in this packaging run. No SMTP send or password change occurred. Raw Auth URLs, mail links, passwords, tokens and provider secrets are not evidence artifacts.

All commands return nonzero on failure. Live smoke is a synthetic non-destructive hosted probe; local destructive/backup harnesses remain loopback-guarded and must not be redirected to hosted customer data. Full-stack/native/customer acceptance remains pending as detailed in RELEASE-STATUS.md.

Packaging validation must additionally compare each tracked file with the extracted ZIP, verify SOURCE-MANIFEST.json hashes, clone cleanproof-history.bundle, compare cloned HEAD/source bytes with delivery, and check generated dist/email-callback.html and dist/reset-password.html contain the actual application/bootstrap. Generated dist is deliberately excluded from the ZIP; npm run build reproduces it. ARCHIVE-VALIDATION.json outside the source commit records these post-commit packaging checks. ZIP SHA-256 is supplied next to the download, since an archive cannot contain its own final digest.
