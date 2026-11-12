# CP_SIGNUP_POLICY and form layout — 26 October 2026

Baseline: d11ad5dd88bb3103e3f8ca7a00b03f64dbcd5deb (deployed version 16). Current packaged commit is in SOURCE-COMMIT.txt. User screenshot was inspected without copying personal field values into this record.

## Proven cause and configuration boundary

src/auth/session.ts → registerImmediately generates CP_SIGNUP_POLICY when the real /auth/v1/settings response reports email disabled, signup disabled, or confirmation required. There is no separate frontend signup feature flag. Fresh actual response: HTTP 200, external.email=true, disable_signup=false, mailer_autoconfirm=false. The specific failing condition is mandatory email confirmation. No /signup is sent through this guarded path in that state. Removing the guard would create incompatible confirmation-dependent accounts; it remains intact.

The desired supported setting is already prepared in deployment/staging.auth.patch.json: mailer_autoconfirm=true. Installed connected tools do not expose hosted Auth configuration read/write. Direct browser navigation to the exact project's Authentication → Sign In / Providers page rendered its initial shell then redirected to Supabase dashboard sign-in. No dashboard credential was requested or entered; no recovery loop was restarted. The setting has NOT been saved.

Owner action, once: open existing project vmvoeksprlwjiwfxqita → Authentication → Sign In / Providers → Email → Confirm email OFF → Save. Keep Email provider and Allow new users to sign up ON. This is a supported change deliberately requested by management, not a database edit. Re-run the actual policy check after saving; require mailer_autoconfirm=true before testing a new registration. No personal/dashboard password belongs in chat.

The existing implementation already handles genuine signup sessions, validated durable session storage, absent-session fallback to Sign in, authenticated membership/onboarding and neutral errors. Google and confirmation/resend controls remain removed from registration. Existing confirmed-account invalid_credentials is a separate login result; this configuration change will not repair an incorrect credential pair. No password/account/data reset or manual user confirmation was performed.

## Actual layout defect and fix

The screenshot's tall registration form could extend above its scroll region under vertical centre alignment. A second browser check found that switching from Sign in retained the previous scroll position and could again place the heading above the viewport. CustomerEntry.web.tsx now uses one viewport-height scroll container, content-safe flex sizing, automatic margins only for available space, zero minimum-width grid columns, and top reset when entry mode changes. Mobile flow is stacked, the story panel loses its sticky/min-height behavior, and switch controls wrap. Long forms scroll normally; no business content is hidden to fit the page.

Actual same-project browser automation used two iframe viewports running the real compiled Expo app, no mock or response substitution: desktop 1000×540 and mobile 390×640. After opening Create account: scrollTop 0 in both; heading top/bottom 137.59/173.59 desktop and 351.58/382.77 mobile, fully inside the respective viewport; no horizontal overflow. Keyboard Shift+Tab reached the actual submit button without submitting: button top/bottom 266.39/312.39 desktop and 374.36/420.36 mobile. No credentials were entered. The QA wrapper is local-only generated tooling and excluded from deployment/source ZIP. Browser layout testing does not prove native/device acceptance or customer authentication.

## Checks and acceptance

Passed: TypeScript; 93 host tests (one optional host SQLCipher-driver test skipped); 10 configuration/callback tests; connected web export; actual browser layout and keyboard reachability checks above. Backend source/schema is unchanged from the previous 23-pass fixture run; that result is retained as earlier evidence, not rerun or reclassified as real Auth acceptance.

Blocked: new signup → issued session → company/site → logout/login → session refresh and two-company business workflow, because the live confirmation policy remains incompatible and new authorised test-account participation is outstanding. No personal-login retry or repeated registration/resend was issued. Password recovery remains protected and independently dependent on SMTP and HTTPS/PKCE callback configuration; removing signup email does not fix recovery.

No data, encryption, migrations, company membership, role or access policy changes. No Google setup, charge or audience change. Available Git history preserved; unavailable earlier local documentation commits remain documented. Release recommendation: staging layout correction and prepared immediate signup only; not customer-ready. Expenditure £0.
