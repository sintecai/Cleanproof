# Lock screen and branding update

This increment styles the web customer lock screen and replaces brand tick marks with a sparkle in shared navigation and authentication. It retains existing resume, switch-account and sign-out operations. The browser visibility handler locks an active account when the document is hidden and clears in-memory access; normal route changes do not explicitly invoke this handler. A route-triggered lock has not been reproduced in an authenticated browser, so no security behaviour has been removed.

Type checking, host tests, email-entry tests and the synthetic web export were run. Real authenticated browser lock/unlock, navigation, account switching and native device checks remain pending. The isolated demo cannot establish real authentication, sync or encryption acceptance. The original browser's device-only encrypted work has not been backed up and deployment to existing staging remains blocked by that prerequisite. No records were cleared or migrated.
