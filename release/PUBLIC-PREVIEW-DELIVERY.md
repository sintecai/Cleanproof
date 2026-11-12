# Public preview delivery and observed acceptance

Public showcase: https://cleanproof-public-showcase.sintecai26.chatgpt.site
Published version 1; exact deployed source c508c65317b49cdfea8b251a99149d7731c357bb. Site access is public; an anonymous request returned HTTP200 and the matching source-version.json. Existing connected app remains https://cleanproof-mobile-tab-preview.sintecai26.chatgpt.site (private staging v14; no audience or deployment change).

This showcase is the actual Expo browser project at phone width, not an installed app or account-service substitute. It uses only local synthetic records, no backend URL/key, no login credentials and no remote synchronisation. CSP connect-src self blocks off-origin service calls. The existing customer authentication is unchanged and remains separate. Native and connected builders reject synthetic showcase settings.

## Browser observations, 31 October 2026
- Public entry opened without a hosting login or passphrase screen.
- Twenty repeated Home/Sites/Inspections/Actions/History switches showed no lock/passphrase screen in the checked states. First cold route loads can briefly show the shell; frame-by-frame absence of flicker is not proven.
- Completed the five-item seeded inspection using Pass controls and a synthetic inspector. It remained completed on returning Home. No backend success was represented.
- Readable in-app report; three actions remained Download PDF, Open in browser, Close report.
- Direct file-save dialog unavailable in the cloud browser. Open in browser followed by the standard-download fallback produced an actual 351317-byte, two-page PDF. Parsed site and inspector matched. SHA256 d24e9b2778078ae39ebddf276530c391d98131591471bf967a7d01ec5fdf3fab. Not a native save test.
- Closed the report/export window and returned to the same synthetic workspace with the completed inspection preserved.
- Created a second draft. Automated textarea entry was inconclusive: a fill was not retained and keyboard-entry reported focus loss. Comments acceptance is NOT marked passed for this showcase run. No unrelated customer form rewrite was made based on that inconclusive automation.
- No installed-device, new recovery-mail, photograph-picker or real-account login test in this isolated showcase. Previously recorded hosted-service evidence remains separately labelled.

Reproduce a showcase build with Node24, npm ci, EXPO_OFFLINE=1 node scripts/build-showcase.mjs. It emits showcase-dist. In a separate publication checkout only, copy showcase-dist to the static directory declared in that checkout's .openai/hosting.json (this publication uses dist). Never copy it over connected staging. Use ?view=desktop to opt out of the phone-width container.

Archive delivery adds current release documentation on a successor commit; the public browser still runs the exact code/marker above. The bundle preserves available source history, including the deployed ancestor. No claim that a new origin contains original device-only data.
