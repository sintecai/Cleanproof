# Checklist selection and inspection creation — 26 October 2026

## Observed evidence

The supplied screenshot shows Belfast selected and an empty checklist section. The source selector hid active templates lacking versions, had no empty-state/create path, and disabled Open inspection without explaining the missing requirement. This is a confirmed UI defect. The available hosted browser is signed out; the exact contents of the user's encrypted local catalogue could not be inspected. Do not claim to have established whether that particular local workspace contains zero, archived or incomplete templates.

Read-only inspection of the existing Supabase project found zero cp_packets (therefore zero template packets), zero cp_workspace mappings, and no template/template_version records in the legacy cp_records table. Belfast was not present in synchronised packet data. The selector reads local encrypted SQLite, not a direct REST template list. The RLS-enabled packet table denies anonymous SELECT and direct authenticated INSERT. Company/site access predicates and the sync validator/pull RPC exist. No role grants, policy changes, privileged customer writes or schema resets were performed.

## Corrections

- Company-scoped inspectionOptions includes only active sites with active customers and the latest valid immutable version of each active checklist. Missing versions, invalid latest versions and archived templates have separate counts. A broken newest version never silently selects older wording.
- The screen shows a clear no-checklist state, owner-only Create checklist, an explanation for inspectors, refresh-on-error and an explicit link to synchronisation. Local refresh is not represented as server download.
- Checklist publication saves an immutable version atomically on this device and queues its existing local event. There is no separate draft/published column in the existing model: creating a validated version makes it available for local inspections immediately. Cross-device availability requires acknowledged sync. No demo checklist is inserted automatically.
- Creation from an inspection preserves the selected site. After publication, navigation waits until the unsaved-form guard is inactive, returns to inspection creation and selects the new version. Invalid/missing selections explain why Open inspection is disabled.
- Publication and draft creation accept stable request identifiers. Exact retries reuse saved results; changed-content/selection or foreign-company reuse is rejected. Draft context and initial answers are written with the original event in one transaction. No new local migration is needed.
- Historical checklist versions and completed inspection snapshots are preserved. The editor's existing answer validation, corrective actions, completion and history operations remain in use.

## Fresh-workspace backend integration defect

Onboarding creates a valid local business_binding, but previously only the adoption screen called cp_sync_register. BusinessEngine could stage a fresh workspace before the server mapping existed; cp_sync_stage correctly rejected it as Invalid batch/mapping. BusinessEngine now calls the existing idempotent, server-authorised registration RPC before staging. It checks the returned mapping and refuses a mismatch. This does not silently adopt arbitrary unbound data, overwrite a server mapping or grant permissions. The mapping is derived from the already bound workspace, and Supabase still enforces membership/ownership. No new server migration/configuration change is required.

The new PostgreSQL fixture test first proves staging fails without a mapping, then runs the corrected engine, delivers checklist/site/inspection records to a second authorised host catalogue and verifies an unrelated company's denial. This is PGlite/host-client evidence, not actual hosted Auth/REST/Storage acceptance.

## Checks

Node 24: `npm ci`, `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/typescript/bin/tsc -p tsconfig.tests.json`, `node --test .test-build/tests/*.test.js`, `node --test --test-concurrency=1 backend/tests/*.test.mjs`, `node --test scripts/auth-return-bootstrap.test.mjs scripts/build-customer.test.mjs`, `npm run secrets:check`, `npm run build`.

New host tests exercise empty/missing/archived/invalid versions, owner versus inspector publishing, foreign-company selections, repeated/concurrent draft creation, immutable historical wording, Pass/Fail/N/A notes, reopening and completion/history without network services. Existing encrypted media, migrations, queues and completion tests remain. These tests do not establish native execution or an authenticated browser pass.

## Remaining acceptance

An authorised signed-in browser session is required to execute the user's exact checklist → Belfast → draft → answers → save → navigate away → reopen → complete/history sequence and network-failure/cross-company browser cases. Previous secure sign-in was declined and has not been repeated or bypassed. No personal passwords, tokens or recovery links have been requested or placed in evidence.

No before/after authenticated browser success is claimed. Native-device, real-service photo/sync and operational release gates remain separate. Preserve existing browser storage and keys. Google remains removed; Supabase redirect/confirmation settings are unchanged. Staging only; actual cash expenditure £0.
