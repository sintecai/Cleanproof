# Navigator background regression — 30 October 2026

These screenshots are an explicitly labelled synthetic regression fixture using the actual Expo Router `Background` component, shared `LayoutFrame`, `Page` and production `CustomerNavigatorTheme`. They are **not authenticated customer screenshots**.

Confirmed source defect: Expo Router's native-stack web `NativeStackView` renders an elements `Screen`, which renders an outer `Background` using `useTheme().colors.background`. Stack `contentStyle` affects a different inner View. The prior source made only that inner View transparent. The outer default theme remained rgb(242,242,242), covering the full-page image. The previous component gallery bypassed that outer Background and therefore gave incomplete coverage.

Before: browser computed ancestors included rgb(242,242,242), and the water image was invisible. After applying the same theme provider now wrapping the actual customer Stack: that ancestor computed rgba(0,0,0,0), revealing the image. Other theme properties remain unchanged. The override is web-only; native theme defaults are retained pending device acceptance. Theme value is module-stable and scoped to the navigator, not authentication. Background ownership remains the persistent LayoutFrame.

Deployment comparison: Sites version 11 confirmed commit 7a27ef68281b552e38787c882e0c2826ffcbaea6, matching local HEAD before this fix. Its archive included the image. Source asset and exported image match SHA-256 cdf28795ee1663f82edaae8d2d5a3bf4300c748afc681c14662e5a7ef91401be. Thus a real layering bug was identified, rather than assuming an older deployment. The user's own cached browser state could not be inspected. New builds use newly hashed JS chunk names; no storage/cache data was cleared and no service worker was introduced.

Checks: npm run check (132 passed, one existing SQLCipher skip), production phone web build and isolated navigator/report bundles passed. Browser before/after reproduction succeeded. This does not substitute for the requested authenticated pages.

Exact connected preview opened: https://cleanproof-mobile-tab-preview.sintecai26.chatgpt.site/
It still showed the hosting Continue with ChatGPT gate in the agent browser. Prior secure handoffs were declined; no new credential request, gate bypass or audience change was made. Three actual authenticated app screenshots remain blocked pending fresh secure sign-in authorization and successful synthetic-workspace access. No screenshots of fixtures are presented as those customer pages. No native-device acceptance performed.

PDF toolbar and export code are unchanged in this focused fix. PDF generation and private handoff were previously exercised; completed browser PDF download remains unresolved. The exact download rejection is not proven, and no file-save success is claimed. Authenticated investigation needs the same access described above.

Original staging and its unbacked-up browser work remain untouched. No account, database, key, queue, recovery, authentication design or permission changes.

Additional browser regression: the corrected navigator Background displayed all nine shared page headings at 320, 430 and 1100px. DOM inspection found one animated background instance and the expected hashed glass-water asset URL. This was a navigator-component fixture, not authenticated business data. Reports/PDF code was not changed.
