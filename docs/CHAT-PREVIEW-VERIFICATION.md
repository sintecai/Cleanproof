# Private in-chat browser preview — 23 October 2026

Continues the exact delivered 0.7 source at 8c35d52, with complete CP001 through 0.7 Git ancestry preserved. Private Sites deployment uses the existing Expo Router static export; no web-only reconstruction or replacement of Android/iOS. Private audience remains owner-only. Application content is synthetic and browser-local. No backend, paid infrastructure, public audience, invitations or subscriptions were created.

## Changed browser presentation

- Browser-only preview controls offer desktop and 390-pixel container widths; native device testing is independent.
- Hosted-only EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY=1 prevents account/backend connection, labels sync unavailable and never fabricates acknowledgements. General browser/native adapters remain in source.
- Existing encrypted SQL.js/IndexedDB and separately encrypted media remain. No plaintext fallback; WebCrypto requires a secure context.
- Existing shared report builder now opens an inline browser report dialog, with browser Print / Save as PDF and Close controls. This avoids an async popup dependency; it does not implement native PDF storage or a secure client link.
- The legacy host browser walkthrough script is updated for the inline report dialog. It was not run on this managed platform: all browser interactions here use the supported CUA browser.

## Newly observed evidence

The exact project exported successfully with Expo. TypeScript and 65 host tests passed with configured external SQLCipher; zero failures or skips. SQLCipher host evidence is not native encryption acceptance. Prior 20 backend fixture and earlier localhost browser walkthrough results remain historical supporting evidence, not new actual-service observations.

Managed browser QA opened the actual app at the supported internal http://terminal.local:4173 address. It displayed the real opening screen and preview controls. Opening its encrypted workspace failed because crypto.subtle is unavailable at that non-secure HTTP origin (importKey error). The managed preview supervisor offers no HTTPS mode and deployed private Sites are outside that cloud browser's supported QA route. We did not weaken encryption, alter browser security flags, install another browser or fabricate workflow passes.

The browser's Phone width control was exercised; the actual application container measured 390 pixels inside a 1363-pixel desktop viewport. This checks preview chrome, not the blocked form workflows. Console inspection showed browser-extension metadata errors, not a completed app workflow.

Consequently the requested customer/site/template/draft/photo/action/completion/report/reload walkthrough and desktop/narrow interaction checks are **not run to completion on this increment**. No such browser acceptance is claimed. They can be exercised by the owner through the deployed private HTTPS application. Browser persistence depends on retained IndexedDB for that origin and the same passphrase. Printing is controlled by the user's browser and may require opening the private Site in a full tab if an embedding host restricts modal printing.

The first private deployment of application code da32be9b46a9d157676d5ba32da9dd6bb12f546e succeeded at https://cleanproof-sicy-preview.grassyelf128.chatgpt.site. Source-only follow-up documentation/test changes may produce a later saved version; use Sites version provenance for its exact commit. A successful deployment is hosting evidence, not a claim of completing the application workflow.

## Remaining gates

Actual Supabase Auth/REST/Storage/Edge, server company/site denial, session lifecycle, sync, paired restore and orphan cleanup remain unperformed. Browser-local app data does not prove server isolation. Android/iOS SQLCipher, device-bound keys, camera/orientation, native PDF/share, OS backup exclusion, offline cold launch, upgrade/force-stop and two-native-client gates remain pending. The prior dependency release findings remain open. Secure client links, billing and publication to app stores remain later scope. This is a synthetic interactive preview, not real-customer readiness or accepted pilot software.

Incremental cash expenditure: £0. Source and history are retained in the owner's private Site source repository. The native application ID, SQLCipher/key protection, migrations and attachment format are preserved.
