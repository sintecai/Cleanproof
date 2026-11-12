# Backend decision — 21 October 2026

Decision for local development: Supabase Auth + PostgreSQL RPC/RLS + private Storage; retain native SQLCipher, encrypted media and the existing local outboxes. Do not provision a hosted project in this increment. This is M4 foundation / partial M5 and M7, not acceptance of the complete backend phase.

| Option | Initial cash | Auth / isolation / files | Offline and migration effort | Operations and later costs |
|---|---|---|---|---|
| Supabase local, then optional managed Free | $0 for local software; Free hosted allowance is $0 | GoTrue email/password/recovery, Postgres membership/RLS, private object storage | Small explicit protocol beside SQLCipher; SQL fits existing relational concepts. Offline sync is our responsibility, not supplied automatically | Local Docker resources required. Free has 500 MB DB, 1 GB files, 5 GB egress plus 5 GB cached egress, 50,000 MAU; two active projects, inactivity pause after a week. Manual off-site backups needed. Pro starts $25/month, first project included; additional projects from $10/month |
| Firebase Auth / Firestore / Storage | Emulator software free; cloud storage requires Blaze with billing account | Managed Auth, Firestore/Storage Rules, private files | Native Firestore caching does not replace this SQLite outbox. Document model, conditional multi-record operations and existing SQL snapshots require more adaptation | Usage-based reads/writes/files/egress; Storage requires Blaze from February 2026. Adds a billing-account decision for a cloud pilot |
| Self-host Supabase | Local software free; production machine/backup/mail costs not zero unless resources already exist | Same principal services, operated by Sicy | Similar protocol; reduced vendor migration effort relative to a custom server | Sicy must patch, monitor, back up, restore, secure SMTP and operate availability. Extra administration conflicts with the simplest-maintainable objective at this stage |

Supabase is recommended because the same Postgres permission/transaction contract can run locally and later on managed infrastructure. No additional mobile SDK is required for this increment: a small typed HTTPS adapter calls GoTrue/PostgREST. This trades some adapter maintenance for no new native dependency or duplicate data cache. Official SDK adoption remains an ordinary future implementation choice if auth scope expands.

## Pilot estimate and assumptions

Actual expenditure in this increment: **£0**. No accounts, charges, external emails, deployments or live data. Existing Expo/native dependencies unchanged. The separate backend test dependency is locked PGlite 0.5.10, a development-only embedded PostgreSQL engine; it is not a production backend or Auth emulator.

Synthetic pilot assumption: 3 companies × 5 sites × 1 inspection/week × 4 weeks = 60 inspections/month. Six compressed 200 KB images plus one 200 KB PDF each = about 84 MB/month, before backups, retained report versions and database overhead. Three months approximately 252 MB; one year approximately 1 GB. Twenty 1 MB photos plus a 1 MB PDF per inspection instead would add 1.26 GB/month and exceed Free quickly. Compression, measured limits and a reviewed retention policy matter more than MAU for this product.

Within measured Free limits, a synthetic hosted pilot could cost $0 in service fees, **subject to management authorising the account and operational arrangements**. Free pausing/manual backups make it unsuitable to promise production availability. A dependable small managed pilot should budget at least Pro's **$25/month USD**, plus taxes/FX, SMTP and independent file backups as applicable; no fixed GBP conversion is assumed. Pro includes 8 GB disk, 100 GB file storage, 250 GB egress and seven days' database backups. Database backups do not include the Storage object bytes. Email provider/storage backup pricing is not quoted without choosing a provider. No paid plan is necessary to run the delivered host tests or existing local app.

Before a real-data pilot: approve region, retention, company onboarding, recovery objectives, backup location/operator, mail delivery, security/dependency findings and a spending cap. Measure actual file/egress use, including repeated report downloads. Do not promise the proposed £29/month company price is commercially validated.

Official sources checked 21 October 2026:
- https://supabase.com/pricing
- https://supabase.com/docs/guides/local-development
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/quickstarts/react-native
- https://github.com/supabase/auth#endpoints
- https://pglite.dev/docs/
- https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- https://firebase.google.com/pricing
- https://supabase.com/docs/guides/self-hosting

No broad opportunity/competitor research was repeated.
