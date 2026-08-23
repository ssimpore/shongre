# Apple privacy manifest check

Generated evidence: `mobile/ios/Shongre/PrivacyInfo.xcprivacy`.

- `NSPrivacyTracking` is false and tracking domains are empty.
- Collected data types cover email, user ID, listing photos/video, and other user content for app functionality.
- `NSPrivacyAccessedAPICategoryUserDefaults` uses reason `CA92.1`, matching app-accessible preferences.
- Expo privacy-manifest aggregation is enabled in generated Pod properties.

Before release, inspect the signed archive rather than trusting source. Enumerate every embedded framework manifest, compare Apple’s current required-SDK/signature list, check required-reason API reports, and reconcile production behavior. A reason may only remain when actual behavior qualifies for it. Run `make ios-privacy-check` after every native dependency update.
