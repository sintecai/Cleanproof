# Prepared PDF download status

Connected staging version 27 was built from 15adc13. In that source the connected StorageBoundary omitted BrowserReportHost, leaving the prepared-file action unavailable; the later c3f79fc source mounts it. The exact cause of every failed download in the user's browser is not established. In the independently accessible older synthetic preview a prepared link appeared and was clicked; the browser did not provide evidence that a file was saved.

This increment removes the automatic synthetic link click after asynchronous PDF generation. It presents the prepared PDF's download link for a fresh user gesture and keeps an open-in-browser fallback and an object URL until the user closes the report. It does not claim a file was saved. This builds on the existing same-account report-return attempt and sparkle mark; the connected email/password form and business records were not altered.

Host tests and a connected web build passed. Real connected browser PDF download and content inspection, report return, session expiry and mobile/desktop checks remain unverified. Do not deploy the prepared update over connected staging until the original browser's encrypted device-only work and queues are protected by a verified backup.
