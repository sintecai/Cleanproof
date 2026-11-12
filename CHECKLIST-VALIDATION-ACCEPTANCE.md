# Checklist validation and publication — 26 October 2026

## Cause

In the supplied screenshot the checklist name is empty while the first item contains washroom. The former repository called text(name,120,true) before validating items and threw the field-agnostic Enter 1–120 characters error. Templates displayed task errors above the entire editor. An item never supplies the checklist's name. The evidence does not establish an autofill defect in that particular attempt; web submission now reads the actual scoped input values as well as state to cover that possibility.

## Implemented

- Required labels, separate checklist-name and inspection-item examples, optional Section, and field-specific inline errors. The first invalid input receives focus. Opening an editor clears old feedback; no submission runs on open.
- Publish is the only save action. Shared browser buttons explicitly use type=button; this React Native editor is not a native HTML form with implicit submission. Create checklist opens the editor and is disabled while editing to prevent accidental replacement of unsaved entries.
- Shared publication validation requires a trimmed 1–120-character name, 1–50 uniquely identified items, meaningful item wording up to 240 characters and optional section text up to 120 characters. Whitespace-only Section is omitted, not treated as required. Required whitespace-only values fail. No name is invented from an item or example.
- Input values remain in state after validation/save errors. Browser autofill values are read from unique editor-scoped DOM IDs at submission, avoiding hidden-editor collisions. Password/authentication handling is untouched. Native reads its existing controlled state.
- Repository validation uses the same producer rules. Publication remains an atomic immutable version plus original local event, with the previous retry-safe publication identifier. Success makes the version available to local inspection selection; cross-device publication still requires acknowledged synchronisation.
- Save errors are sanitised and actionable. Owner errors and an already-saved different publication get explicit recovery guidance. Technical database details are not displayed. Read-only historical item validation remains compatible with earlier symbol-only wording; old inspection snapshots are not rewritten.

## Hosted backend

Migration 20261026122405_checklist_field_validation is applied to the existing staging project. It adds a private immutable constraint helper and a NOT VALID check constraint on future template packet writes. Existing rows are not scanned, changed, deleted or reset. Existing membership, identity-mapping, immutable-history, RLS and private-storage rules remain in force. No local database migration is needed.

Actual hosted verification: constraint saved, valid named checklist=true, missing name=false, anonymous/authenticated helper execution=false, RLS=true. Template-packet count remained zero; no customer checklist was inserted through administrator SQL. This is direct database configuration/function evidence, not an authenticated browser save or end-to-end REST acceptance.

The constraint is deliberately stricter for future publication. Do not rewrite historical records to satisfy it. Any legacy malformed pending packet must remain protected for explicit review. An application rollback does not silently remove this validation; any server rollback needs a reviewed forward migration. Existing security/operational/native release gates remain open.

## Checks and evidence

Host coverage includes field attribution, whitespace/NBSP handling, optional section, length boundaries, meaningful item text, preserving historical reads, a synthetic failed write with rollback and unchanged inputs, retry/idempotency, and scoped rendered/autofill-value reading. The rendered-value test uses a host DOM fixture and is not a real-browser autofill pass.

PostgreSQL fixtures cover valid limits, invalid name/item/section rejection and private helper permissions, plus the existing versioned inspection/sync/isolation tests. PGlite/fixture results do not prove hosted Auth/REST/Storage execution.

Commands: Node 24; `npm ci`; `node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/typescript/bin/tsc -p tsconfig.tests.json`; `node --test .test-build/tests/*.test.js`; `node --test --test-concurrency=1 backend/tests/*.test.mjs`; `node --test scripts/auth-return-bootstrap.test.mjs scripts/build-customer.test.mjs`; `npm run secrets:check`; `npm run build`.

## Pending browser acceptance

The available browser session is signed out. Previous secure sign-in was declined and has not been repeated or bypassed. Named checklist → publish → refresh/reopen → Belfast → inspection → save, visible invalid-field focus/scrolling, actual autofill, failure recovery and mobile/native UI remain pending until an authorised session is available. Do not label this fully browser-verified or customer-ready. Do not clear browser storage/keys to test it. Use synthetic records only.

Google remains removed; immediate signup and corrected redirect settings are unchanged. Cash expenditure: £0.
