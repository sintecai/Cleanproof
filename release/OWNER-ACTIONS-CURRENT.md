# Administrator actions — no sign-in handoff or credential sharing

All twelve migrations remain applied; do not reapply them. Both production functions are deployed and negative JWT/CORS checks passed. No new sign-in/credential request is authorised or needed in this chat.

The single full independent runbook is **ADMINISTRATOR-RUNBOOK.md**. It includes exact official-service settings and pinned build/upload commands. Remaining actions:

1. Existing production project Authentication → Email: Confirm email OFF; keep email/password signup ON and Google OFF. Save and independently verify public settings.
2. Approve the real production HTTPS origin, exact reset-password.html/native callback allowlist and CP_ALLOWED_WEB_ORIGINS. Production browser origins currently fail closed; no preview origin is assumed.
3. Configure the organisation's verified transactional sender/domain and controlled mailbox directly in secure provider/Supabase settings. Run complete receipt→PKCE→private password change→login recovery acceptance. No credentials, live links or personal email are requested here.
4. Approve actual retention decisions and protected isolated DB/private-object restore access/destination. Preserve original browser data and never restore over staging/production.
5. Confirm new CleanProof identifiers/organisation/project, approved 1024px icon, signing access and cloud-build costs independently. Run the pinned administrator build commands, then prepare Internal testing/TestFlight with the exact build IDs. No signed artifacts exist yet.
6. Assign actual Android/iPhone testers and complete native acceptance, screenshots and binary privacy/encryption review. Supply final public privacy/support/deletion resources and owner-approved store/commercial information through official organisation processes.

Do not send any password, passkey, code, token, signing key or private credential file into chat. Reuse authorised organisation sessions; any missing access is handled independently by the administrator in official services. No paid service or public submission is authorised by this package.
