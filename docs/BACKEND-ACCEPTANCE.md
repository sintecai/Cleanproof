# 0.4 acceptance and remaining phase work

Synthetic only. This is a runnable foundation increment, not completion of the user's whole next-phase brief. No paid account/service, production deployment, app publication or live data is authorised/performed.

| Requested area | Implemented/evidence | Still pending |
|---|---|---|
| Existing local customers/sites/templates/multiple drafts/completion/photos/actions/PDF | Actual native source inspected; existing useful tests retained and rerun | Android/iPhone execution and usability |
| Local encryption/recovery | SQLCipher wrong-key/forced-kill and AES/journal host tests pass; no reset/fallback; v5 fault rollback | Physical OS key/lock/storage/crash/low-space/backup tests |
| iOS backup exclusion | Config plugin sets exclusion/protection before JS/SQLite, generated Swift checked | Xcode compilation, OS attributes/inheritance, WAL/SHM, backup/restore |
| Dependency findings | Current official advisory/audit reassessment; no unsupported force fix | Compatible remediation/upstream fix or reviewed reachability acceptance before release |
| Low-cost backend choice | Supabase recommended; current official options/cost assumptions documented | Actual hosted account/region/spending decisions deferred |
| Authentication | Native sign-in/out/recover/reset adapter/UI, encrypted session storage, foreground/expiry locks; host tests | Real GoTrue password/reset/refresh/rotation/revocation integration and native shared-device checks; MFA/invitations |
| Company isolation/roles | Actual PostgreSQL RLS/RPC tests using synthetic Auth claim fixture; Owner/Inspector/site scope | Full Supabase token/PostgREST/HTTP negative checks and role administration UI |
| Offline sync | Durable separate synthetic metadata queue, receipts/retries/conflict copies/pull cursor/tombstones; two-host-store SQL integration | Consumer/adoption mapping of ORIGINAL queues; incoming relational projections; offline authenticated lease; collaborative inspections/actions; schema capability negotiation beyond protocol 1 |
| Private media | Existing local encrypted files preserved; server bucket private and closed | Upload/download manifests, checksum/size verification, crash/retry, finalisation, cross-company HTTP download checks |
| Reports/client access | Local branded generator/export preserved; supporting PDF reviewed as output only | Canonical server report versions, MFA, scoped expiry/revocation/access logs, protected client viewer |
| Complete synthetic two-device workflow | Local workflow tests plus separate two-host-store metadata integration | Combined physical workflow with inspection/photos/action resolution/restart/server/second-device/correct report version |

## Full-stack checks to run first on a Docker-equipped machine

- Follow BACKEND-SETUP, start only local Supabase, apply migrations; inspect no public bucket.
- Create confirmed synthetic users in local Auth, sign in through native screen, recover after restart. Password reset must arrive only in local mailbox, code must expire/single-use; test invalid code and interrupted reset.
- Expire/revoke refresh token, interrupt rotation and fail local persistence. Never label auth or sync successful when storage/network fails. Verify offline sign-out clears local credentials even if server revocation fails. Access JWT expiry is not instant global revocation.
- Owner A/B create separate companies. A cannot select/update B's records through REST or RPC with forged company IDs; anon cannot access them. Never test only UI hiding. Inspector can append local-only events/read assigned site but cannot manage catalogue/memberships or other sites. Revoke assignment/member and recheck before/after token refresh.
- Same account, two clients: metadata save/restart/offline queue/reconnect/duplicate delivery; simulate lost ACK after commit, conflict same expected revision, deletion followed by old retry. No silent overwrite/resurrection.
- Full-stack current private object requests must all fail for mobile users, including members. This is a deliberate closed gate, not usable private attachment sync. Do not loosen it until validated manifests exist.
- Verify cursor pages while concurrent commits occur; modify assignment between pages; reset scoped downloaded data and preserve proposals. Test migration forward/failure with populated backend and local SQLCipher.

## Native local gates retained

Use NATIVE-ACCEPTANCE, ACCEPTANCE-CONTINUATION and IMPROVEMENT-ACCEPTANCE. In addition test new iOS hook on an existing populated v4 installation: inspect protection/exclusion of DB, WAL/SHM, sealed/partial files, caches, new captures/PDFs; lock during acknowledged work; relaunch; confirm no old data changed. Native print/share receiving applications must still read the temporary URI with bounded cleanup. No device was available here.

Backgrounding should hide connected records; test app-switcher snapshots and notification previews. The current local synthetic workspace remains account-independent. Per-user database isolation and recovery/quarantine remain required before confidential shared-device use. Do not call the current demo a secure shared-device customer workspace.

## Next milestone acceptance

Legacy queue consumer + private attachment transfer + safe local business projection: with synthetic data, create a company/customer/site/template; complete an offline inspection with verified photos/action/history, restart after acknowledgements, sync both legacy queues with exact receipts, reconstruct on another authorised native client, resolve conflicts without loss, preserve completed snapshots, prevent revoked scope/cross-company downloads, verify report version identity. Only then add secure report links. Management approval is needed for any hosted account/spend/live-data pilot, not for routine free/local reversible implementation.
