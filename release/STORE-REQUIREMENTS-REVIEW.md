# Official submission requirements rechecked 2 November 2026

- Google Play new applications: target Android16/API36 minimum from 31 August2026. Source target is not proof: inspect the final signed AAB. https://developer.android.com/google/play/requirements/target-sdk
- Android native libraries must meet 16KB page requirements. SQLCipher and every packaged native dependency require installed release-binary testing. https://developer.android.com/guide/practices/page-sizes
- Apple uploads: Xcode26 or later with iOS26 SDK or later since 28 April2026. Minimum deployment target is a separate setting. Updated age-rating questionnaires also apply. https://developer.apple.com/news/upcoming-requirements/
- Actual in-app deletion and a public deletion resource must describe retention/exceptions accurately. https://developer.apple.com/support/offering-account-deletion-in-your-app/ and https://support.google.com/googleplay/android-developer/answer/13327111
- Privacy manifests/required-reason API declarations must match assembled SDKs; inspect the signed iOS archive before submission. https://docs.expo.dev/guides/apple-privacy/
- EAS builds require the correct organisation/project/signing connection, account permissions and available quota. No account/plan/charge assumptions are made. https://docs.expo.dev/build/setup/
- Payment model remains unimplemented. Review the actual proposed paid entitlement against current store guidelines before selecting a purchase flow or exception. No live billing/price/countries approved. https://developer.apple.com/app-store/review/guidelines/ and https://support.google.com/googleplay/android-developer/answer/9858738

No console acceptance, organisation/identifier ownership, native binary compliance, store approval or publication is claimed. The owner must review current console declarations when actual builds exist.

Supabase changelog reviewed: upcoming TLS cipher restriction 10 November2026 requires supported modern native TLS; installed-device acceptance remains necessary. Postgres timezone/security upgrades require planned backup and maintenance, not an unapproved upgrade of existing staging. https://supabase.com/changelog

Apple 3.1.3(c) permits qualifying organisation-only enterprise services to access previously purchased subscriptions; consumer/single-user sales are treated differently. CleanProof has not established that it qualifies. Do not infer that physical cleaning services make this inspection software exempt. No purchase UI, billing or price has been activated. Final countries/business model and the current Google Payments policy require owner review.

Current Android page-size guidance states 16KB compatibility for API35+ and an update enforcement date of 1 February 2027. Preserve the native-binary inspection gate rather than assuming React Native/SQLCipher transitive libraries comply. Apple requires Xcode26/iOS26 SDK and a deployment target of iOS13 or later.

Official account deletion requirements require in-app deletion and (Google) a functional external deletion resource. A draft URL or a generic contact form does not establish completion. Native screenshots, privacy-manifest/API reasons and encryption declarations still require the actual signed archive. EAS submission prerequisites were rechecked at https://docs.expo.dev/submit/android/ and https://docs.expo.dev/submit/ios/ .

Listing field checks: Apple subtitle <=30 characters (corrected from 32 to 30); Google short description <=80, full description <=4000. Structured draft is store/listing.en-GB.json; public URLs intentionally null until owner supplies real functional resources. Sources: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/ and https://support.google.com/googleplay/android-developer/answer/9859152 .
