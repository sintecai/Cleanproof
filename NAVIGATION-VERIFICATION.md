# Navigation investigation — 28 October 2026

Baseline: a1d87dfee15e80c1054f69cb3b6901ec29af600c, separate preview version 6.

## Accessible evidence

The connected browser was signed out. One newly authorised secure credential request returned `declined`, without a further reason. No credentials were read or entered by the agent. Authenticated reproduction, console/network analysis during navigation, before/after recordings, 20 switches, rapid switches, report return and draft preservation were therefore not performed.

## Independently identified layout defect

Each Page initialised availableWidth from useWindowDimensions (the host browser width). In the phone preview this initially selected the desktop sidebar at host widths >=820px, then switched to mobile navigation after onLayout reported the 430px container. Every new Page mount repeated that initial guess. This is a source-confirmed layout transition, not proof that it explains every reported flicker.

LayoutFrame now owns measured container width above authentication/workspace/routes. Pages share that width; phone-preview width is constrained to 430px before measurement. It does not change session, account, storage, permissions, navigation destinations, forms or report code. No delays, overlays or animations are added. No saved records or keys are cleared.

## Checks

- npm run check: typecheck passed; 127 tests passed, one existing SQLCipher driver test skipped.
- New tests cover repeated page-width selection and desktop/mobile/container resize bounds. These are host regression tests, not browser tab-switching tests.
- EXPO_PUBLIC_CLEANPROOF_PHONE_PREVIEW=1 npm run build: passed.
- Connected authenticated walkthrough and native checks: pending.

## Required next acceptance

Securely sign in with an existing synthetic test account in the separate preview. Record 20 switches across Home, Sites, Inspections, Actions and History, including rapid switching, first/repeat navigation and report return. Check root/workspace mounts, session events, document requests, console errors, drafts and saved records. Do not clear browser storage or alter the original staging site.
