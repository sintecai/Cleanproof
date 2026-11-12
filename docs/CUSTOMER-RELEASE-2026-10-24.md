# Customer release increment — 24 October 2026

## Baseline and changes

Recovered exact source 05b6db63d92ee234ff963334ed1ac4aeb0bf70a4 from the existing private Site Git repository after workspace maintenance. GitHub sintecai/Cleanproof was inspected and remains empty. Work branch: feature/customer-release-ui. No earlier ZIP or reconstruction used.

Reviewed all three supplied 24 October screenshots. Shared native/browser shell now uses warm-white working surfaces, compact action buttons and fields, content-sized status labels, an 820px sidebar threshold and a smaller top bar. Mobile scrolling uses a bounded flex region above non-overlaid navigation and SafeAreaView bottom protection. Photography stays in the dashboard welcome panel, not behind working screens. Reduced-motion preference disables animated focus scrolling; browser CSS respects reduced motion. History uses a real separator instead of literal backslash-n and groups record/report actions. Dashboard Add Site/Add Customer open their creation forms, with counts from existing repositories and overdue open actions based on due date.

No local schema, encrypted data, attachment AAD, keys, sync queues or completion snapshots changed. Native identifiers/signing are unchanged.

`npm run build:staging` now validates a real HTTPS Supabase origin and public publishable key, rejects secret/missing configuration, and explicitly disables demo seeding/local-only mode. It exports staging-dist and does not deploy. `npm run build` remains the clearly labelled isolated synthetic review. Do not publish dist as a customer release. Production still requires release-evidence checks and management approval.

## Newly observed checks

- npm ci and backend npm ci completed with locked dependencies.
- TypeScript passed.
- 69 host tests passed; one native SQLCipher host-driver test skipped (driver unavailable here).
- 22 PostgreSQL fixture tests passed. These do not exercise real Auth, REST, Storage or Edge services.
- Two staging configuration tests passed; CI now includes them. CI only checks/builds; it does not deploy.
- Same-project Expo browser export passed.
- Browser automation opened the actual compiled application, rendered the desktop sidebar and attempted a disposable synthetic workspace. Managed preview is HTTP and WebCrypto is unavailable, blocking encrypted workspace entry. No plaintext fallback was introduced. Added a clear HTTPS-required message instead of the raw importKey exception.
- Full local workflows, mobile/tablet comparison, persistence, PDFs and report pagination have NOT been accepted in browser on this commit.

## Blocking customer-release gates

1. Supabase project listing returns zero projects. No authorised staging project, Auth service or Storage/Edge deployment is available. Actual registration/company setup, two-session permissions, real sync, remote photographs and recovery acceptance cannot run.
2. Team invitations/manager role, protected issued reports/version lifecycle, customer data export/deletion and entitlement rules remain incomplete. Existing local export is not secure report sharing.
3. Android/iOS execution, backup exclusions, offline cold launch, native SQLCipher/camera/PDF/share, two-device tests remain pending; Docker, adb and Xcode unavailable here.
4. Paired live database/object restore and real guarded cleanup are pending.
5. Previously documented dependency release findings remain unresolved; no unsupported downgrade applied.
6. GitHub connector can access the repository but no authenticated Git push is available. The earlier history-import Actions workaround was rejected by automatic approval review and has not been retried or bypassed. Original history is preserved in the source checkout/bundle. No GitHub PR is claimed.

Release decision: development/review only. Not approved for real customer data or a customer pilot. No actual backend-connected staging URL is claimed. Incremental cash spend: £0. No paid resources created.

## Setup, rollback and next prerequisite

Existing README and deployment/recovery runbooks remain applicable. Use Node 24, `npm ci`, `npm ci --prefix backend`, `npm run check:all`, `npm run test:build-config`. For authorised customer staging configure only the public values in deployment/staging.public.example.env then run `npm run build:staging`. Serve staging-dist with SPA fallback to index.html; do not replace the native SQLCipher adapter. Never put service credentials in build variables.

This increment has no database migration. Rollback means restoring the prior application build only, retaining all encrypted files and queues. Do not uninstall/clear data. Backups and restore must follow existing paired database/object runbooks and still need a disposable real-service rehearsal.

Next required external input is an authorised CleanProof Supabase staging project accessible through the connection (or explicit permission for a confirmed free project in the intended organisation). Do not send private keys/passwords in chat. Then apply the existing forward migrations, deploy existing photo-transfer, configure verified-email Auth and run actual integration before opening customer staging.
