# Management/legal review draft — not a compliance declaration

## Data map for store disclosures

Potential collected data: name/email and auth user ID; company and membership/role IDs; customer/site contact/address details; checklists and versions; inspection answers/comments/times; photographs; corrective action assignments/history; report snapshots; sync/operation metadata and sanitised errors. Linkage is to the authorised user/company. Use purpose is app functionality, authentication, inspection evidence and support, not advertising. No ads/advertising SDK was identified; verify the final dependency inventory and assembled binaries before declaring tracking absent.

Supabase Auth/database/private Storage/server functions are service processors. Public client keys are not service-role credentials; RLS/private object policies must still enforce tenant/site access. Local SQLCipher/browser encryption does not imply end-to-end encryption: synchronised business records are processed by the service. Expo/EAS build infrastructure and OS photo/share services must be reflected where applicable. Passwords must only go to Auth over HTTPS, never analytics/logs. Recovery/session URLs must be redacted.

Camera is for evidence capture; user-selected image access for attachments. No microphone or precise location is intended. Validate final manifests/Info.plist; reject unexpected permissions. Do not request broad Android photo access merely to select individual photos. Audit all included SDK privacy manifests, required-reason APIs, data flows and approved reasons in the final Apple archive. Do not copy blanket SDK declarations into your own manifest without evidence.

Google Data Safety and Apple App Privacy must reflect actual transmitted data, retention, linkage and processor use. The owner must choose lawful retention and deletion exceptions, confirm support/business address/controller, processors/transfers and privacy policy URLs, and review legal basis/terms. The draft is not a statement of GDPR or store compliance.

## Deletion and recovery

The staging worker now performs authenticated account erasure and has passed disposable hosted-service checks. Production activation, installed UI acceptance and retention approval remain required. See RETENTION-AND-RESTORE.md and evidence/erasure-staging-current.json. Define sole-owner transfer/company closure, shared inspection history, attachment retention, backups and queue handling. A public web request resource is also required for Play. Do not delete auth records blindly or discard unsent encrypted work. Revoked service links cannot recall PDFs already downloaded.

Account password recovery does not recover a lost device encryption key. Preserve keys and databases before upgrades; never clear storage as troubleshooting. Original browser work has not been backed up and must stay untouched. A new origin cannot access that origin's device-only encrypted work; it must not promise recovery/merge.

## Operations release gates

Prepare separate production/staging projects and narrow redirect allowlists. Configure verified sender and SMTP securely, check domain SPF/DKIM/DMARC and quotas, and test received recovery mail. Audit hosted RLS, private objects/functions, signup abuse controls, revoked membership and cross-company denial with real services. Require durable operation/attachment acknowledgements, interrupted-transfer recovery and duplicate retry tests.

Use paired database+private-object backups, protected key handling, documented retention and a demonstrated restore into an isolated environment. Existing backup scripts alone are not a successful restore. Migrations require preflight backups, review and a forward repair plan. Keep monitoring sanitised (no passwords, tokens, recovery links, photos or customer notes). No new telemetry provider was added. Document incident response, support and data-export handling. Review remaining dependency advisories; build-tool exposure differs from client runtime but still requires assessment. Keep secrets out of source/history and archives.
