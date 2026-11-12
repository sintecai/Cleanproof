# Privacy / Data Safety worksheet — final binary review required

No advertising/analytics SDK or payment SDK is intentionally added by this release. Inspect the final native dependency/manifest inventory before answering the stores; lack of an intended SDK is not proof of its absence from the binary.

| Data | Actual purpose / destination | Disclosure consideration |
|---|---|---|
| Account name/email, credentials | Supabase Auth account services; passwords sent only to Auth over TLS, never saved in plaintext by the app | Account management, linked identity; classify exact categories in current store forms |
| Company/contact/customer/site information | Authorised company database and local encrypted workspace | User content/contact information; linked to company/account |
| Inspection answers/comments/actions/history | Local encrypted workspace and Supabase after acknowledgement | Business user content; retention and permissions follow company membership |
| Inspection photographs | Selected/captured evidence; encrypted locally, transferred to private object storage | Photos/video category as applicable; no public bucket |
| Auth session/workspace identifiers | Session restoration, account isolation and sync reconciliation | Identifiers/security functionality; tokens excluded from logs/analytics |
| Operational service logs | Supabase service operation/security; no added third-party error service | Confirm actual provider log fields and retention before publishing |
| Exported PDFs | Generated locally and exported via browser/OS facilities | User-directed export; copies outside service cannot be recalled |

No location permission is requested for inspection capture; photograph metadata and OS/provider behaviours still need installed-build inspection. Camera is optional for evidence; use system photo selection without broad media access. Microphone/advertising tracking are not requested. Android/iOS final manifests, SDK privacy manifests/required reasons and 16KB library compatibility remain unverified.

Encryption: SQLCipher/AES and secure key storage are used in addition to TLS. Do not automatically declare exempt encryption; owner must complete Apple's export-compliance determination and provide required documentation if applicable.

Age ratings: complete the current questionnaires from actual functionality, including account/user-generated business photos and any communication/sharing capability. Do not guess a final rating. The service targets commercial users and is not intended as a children's app.

Processors/data location: staging Supabase London; production processor contracts, final hosting, cross-border transfer terms, controller contact and legal basis await approval. No statement of GDPR compliance is made merely because this worksheet exists.
