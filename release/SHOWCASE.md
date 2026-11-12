# Separate public synthetic showcase

Build: EXPO_OFFLINE=1 node scripts/build-showcase.mjs (Node24, npm ci first).
The showcase uses the actual Expo routes/components and catalogue/inspection/report repositories, seeded only in the isolated synthetic build. It is a mobile-sized browser app, not an Android/iOS binary.

There is no account login, backend configuration, remote sync, account deletion or recovery in this build. A generated per-tab local unlock value is used only for disposable synthetic storage; it is not a customer credential or customer key. Never enter personal/customer information. Closing the tab may end access to that sample workspace. It does not migrate or read another origin's browser data. Files are exported locally; server acknowledgements and remote operations are not simulated as successful.

The build clears only its child-process backend environment values, not browser/device storage. It never clears existing databases or keys. CSP blocks off-origin connections and forms. Connected customer and native release builders explicitly reject the showcase flag. The actual customer Sign in/Create account/Forgot password layout and policies are unchanged.

Publish only the showcase-dist output to the separate public Site. Do not deploy it to existing staging or use the production app identifiers. The Site identity in the publication checkout is separate from .openai/hosting.json in the customer checkout. PUBLIC-PREVIEW-DELIVERY.md in the archive records the actual deployed showcase commit, URL and observed browser results.
