# Mobile-first interface increment

Prepared from c3f79fc. This increment updates the shared native/web page shell, cards, input/button styling, compact metrics, empty-state styling and primary mobile navigation (Home, Sites, Inspect, Actions, More). It removes a duplicate Home action and strengthens inspection answer touch targets and zero-item progress handling. Existing application services, encryption, migrations, roles, queues, native PDF workflow and the prepared workspace/PDF fixes remain in source.

This is an incremental shared-component redesign, not a completed page-by-page redesign. It has not been deployed to the existing staging application. The original browser's encrypted work and device keys were not accessible for backup; missing work was not recovered. Do not clear browser data or treat an isolated synthetic preview as a recovery.

The demo build is isolated, uses explicitly enabled synthetic local data and no server authentication/synchronisation. It does not prove physical Android/iOS acceptance or live backend persistence. Real login/logout/account switching, inspection photo/PDF download and cross-device recovery remain acceptance gates. Prior host test results are not proof of native device behaviour.

Validation commands: `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/typescript/bin/tsc -p tsconfig.tests.json`, `node --test .test-build/tests/*.test.js`, `npm run build:demo`. Expected app baseline includes Google removed and confirmation-free signup in configured staging, not in isolated demo.
