# Current submission matrix — 2 November 2026

Baseline for this execution: e28b3a1fda53a4d5eb40dd359e225eb13e8c65cb. Function source: 2147034acb61715427836ba49391b471a64329e9. Tested build-tooling source: 2ed8f9b4ab162057c7285251938554692bee6ba4; no UI/auth-form change. Approved UI/auth policy preserved. The final archive's evidence-only successor is recorded in DELIVERY-COMMIT.txt.

| Gate | Current status | Evidence and limit |
|---|---|---|
| Lockfile environment restore | PASSED | Root and backend npm ci --ignore-scripts succeeded from unchanged committed lockfiles |
| Application typecheck/regression | PASSED | evidence/application-check-current.txt: 147 passed, 1 optional SQLCipher driver skip; not physical-device proof |
| Backend fixtures/policies | PASSED | evidence/backend-check-current.txt: 36 passed, including two restore-policy and three migration-plan tests |
| Auth callback/build/release guards | PASSED | evidence/callback-release-check-current.txt: 13 passed; tests do not establish delivered email/native callbacks |
| Web build and implemented callback files | PASSED | evidence/web-build-current.txt: exit 0; reset-password.html and email-callback.html emitted; Expo force-exit warning after export |
| Native recovery lifecycle correction | CODE FIXED / DEVICE PENDING | recovery-bootstrap regression proves effect replay exchanges once and unmounted late completion retires. No real mailbox/device reset claim |
| Dependencies | UNRESOLVED | Fresh audit 12 moderate / 0 high/critical/low; no compatible locked Expo remedy. Individual entries in DEPENDENCY-REVIEW.md; no risk waiver |
| Extra online Expo compatibility check | BLOCKED | HTTP proxy timeout; not marked passed |
| Production migration execution | PASSED | All nine explicitly approved hashes matched; missing migrations applied in order. Saved history independently confirms all twelve. evidence/production-execution-current.json |
| Production schema/grants/private storage | PASSED CHECKS / SERVICE ACCEPTANCE PENDING | RLS enabled on every public cp table; anonymous function grants zero; private erasure helpers inaccessible to clients; bucket private. Live anonymous RPC denial passed. photo-transfer/delete-account v1 ACTIVE, verify_jwt=true, retrieved source matches; eight live missing/invalid JWT and disallowed-origin checks passed. Positive two-company/photo/deletion acceptance remains pending |
| Production disposal/isolation acceptance | BLOCKED | SQL migrations complete; real two-account/deletion workflow awaits production Auth configuration, authorised disposable tests; both functions are now deployed. Prior staging erasure/isolation evidence retained, not relabelled production |
| Production Auth/recovery | BLOCKED — CONFIGURATION/SENDER | Actual settings: email/signup ON, autoConfirm false (Confirm email ON), Google OFF. Dashboard sign-in required; no new admin handoff. Sender/provider/domain/mailbox and full reset still pending |
| Retention policy | BLOCKED — OWNER DECISION | Implemented behaviour documented; proposed periods/exceptions not approved or scheduled |
| Full paired DB/private-object restore | BLOCKED — INFRASTRUCTURE | Docker/PostgreSQL execution route, protected exports and approved isolated destination unavailable. PGlite/TOC tests do not pass this gate |
| Original browser device-only backup | BLOCKED | Not performed; no existing staging deployment/storage/key/queue changed |
| Photo capture/selection on supported device | BLOCKED — DEVICE | No Android/iPhone attached; failing cloud chooser not retried |
| Current preview identity | VERIFIED METADATA | Connected v14 bc80a514; public synthetic v1 c508c65. Neither redeployed; no new authenticated browser acceptance claimed |
| Permanent Android/iOS identifiers | BLOCKED — ORGANISATION | Candidate com.sicyinternational.cleanproof unconfirmed/unregistered; other published apps untouched |
| Signing/build access | ADMINISTRATOR ACTION | No authorised signing connection available; no new sign-in/credential request permitted or attempted. Pinned EAS 27.2.0 / Node 24.22.1/native-image profiles and administrator command helper prepared; no actual build |
| Signed Android AAB/APK | NOT GENERATED | No confirmed identity, signing/build access or local Android toolchain |
| Signed iOS distribution build | NOT GENERATED | No confirmed Team/identity, signing/build access or local macOS/Xcode toolchain |
| Internal testing/TestFlight uploads | NOT RUN | No signed artifacts/upload references |
| Installed Android/iPhone journey | PENDING | NATIVE-ACCEPTANCE-PENDING.csv: testers unassigned, devices/builds absent; no fabricated passes |
| Store listing copy | PREPARED | store/LISTING-DRAFT.md; Apple subtitle corrected to 30 characters. Owner approval and actual listing fields remain |
| Screenshots/privacy/age/encryption/reviewer | BLOCKED | Need installed native screenshots, final binary manifests, approved URLs/controller/retention/countries/commercial model and private synthetic reviewer access |
| Public submission/publication | NOT AUTHORISED / NOT READY | No charge or public submission performed |

See evidence/verification-2026-11-02.json for fresh machine-readable evidence and FINAL-DELIVERY-STATUS.md for prior-vs-current distinctions. Administrator-only actions: ADMINISTRATOR-RUNBOOK.md; no sign-in handoff is requested. `npm run release:status` must remain nonzero while required gates are open.

Current migration details remain in PRODUCTION-MIGRATIONS-APPLIED.md; the twelve migrations were not reapplied. Function deployment evidence is production-functions-current.json. Fresh application 147 passed / 1 skip, backend 36 passed, callback/release 13 passed and administrator/configuration 9 passed are recorded separately (overlap, do not sum). Web export passed. No paid service, account-data mutation, erasure or staging deployment was performed.

## Current code/admin/device separation

**Code corrected:** production photo CORS used hardcoded staging origins and the legacy local-preview allowance. Both functions now derive allowed HTTPS origins from their own backend/config; production rejects staging/loopback by default. Native authentication and existing staging source behaviour are preserved. Three new CORS regressions pass. Signing material ignore rules and a pinned administrator-only CLI wrapper were added without changing client UI.

**Administrator actions:** Confirm email OFF in the existing production project; approve production HTTPS origin and configure CP_ALLOWED_WEB_ORIGINS/URL callbacks; configure verified SMTP/domain and controlled mailbox; approve actual retention/isolated restore destination; complete organisation identifiers/signing/icon and public store information. No credentials should be supplied in chat; no agent handoff is requested. ADMINISTRATOR-RUNBOOK.md contains exact independent official-service steps and build/upload commands.

**Device tests:** no AAB/IPA or connected Android/iPhone; native auth/recovery, camera/gallery, offline restart, OS export/share and deletion acceptance remain pending. Testers remain unassigned until the administrator supplies builds/devices. Browser/host tests are not native proof.

Current fresh results supersede the previous counts above: application 147 passed / 1 skip, backend 36 passed, callback/release 13 passed, administrator/configuration 9 passed (overlapping suites, do not sum). Web export passed with a post-export force-exit warning. Audit remains 12 moderate and no high/critical/low; no compatible upstream fix/forced override. The 12 migrations were only read, not reapplied. No staging, browser storage, keys or queues were changed.

## 2 November separate preview verification

See PREVIEW-AND-ACCEPTANCE-CURRENT.md for fresh results and separate public browser URLs. Production migrations/functions were verified without reapplication. Production Confirm email remains ON. New staging-preview photo CORS is explicitly blocked (403); recovery allowlist/sender acceptance is pending. Synthetic navigation/comment/completion checks do not close connected or native gates. Signed AAB/IPA and store uploads remain unavailable without authorised organisation signing access. Submission-ready remains false.

## Current version 3 execution — supersedes earlier preview blockers

See RELEASE-CANDIDATE-CURRENT.md and evidence/*-current.json. Photo CORS is now fixed and actual authorised photo upload/download passed. Browser standard downloads now produced two saved, parsed, visually inspected files and an identical external-window copy. Staging two-account and erasure acceptance reran successfully using host clients. Connected authenticated-browser and production acceptance are distinct and still pending. Ready to build: blocked by confirmed organisation IDs/icon/EAS signing; ready for internal testing: no signed binaries; ready for review: false; published: false.

## Website release supersedes native-store priority

See WEBSITE-DEPLOYMENT.md and website-acceptance.json. Native signing/AAB/IPA/TestFlight are outside this website release. Production web build and exact-origin CORS are implemented/tested. Public customer access remains blocked by Confirm emailON, inaccessible hosted Auth/SMTP settings, recovery/positive production browser acceptance, approved policy/contact/retention/paired restore and dependency risk gates. Private candidate preparation is not customer publication.
