# Mobile store requirements

Last verified: **2026-08-21**. Re-check every item before each production upload; this file records a baseline, not a continuing compliance claim.

| Area                    | Verified baseline                                                                                               | Shongre evidence                                                           | Next release action                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Apple build tools       | App Store Connect uploads require Xcode 26+ and the iOS 26 SDK from 2026-04-28                                  | `make ios-sdk-check` reads local Xcode and installed iPhoneOS SDK          | Re-read Upcoming Requirements and select a compliant EAS image                  |
| Apple age ratings       | Apple's updated age-rating questions have applied since 2026-01-31                                              | No source-controlled answer can prove the App Store Connect form           | Complete and review the current console questionnaire                           |
| Apple SDK privacy       | Required-reason APIs need accurate approved reasons; listed SDKs need manifests/signatures                      | `make ios-privacy-check`, generated `PrivacyInfo.xcprivacy`, SDK inventory | Inspect the signed archive/Xcode privacy report before upload                   |
| iOS deployment          | Expo SDK 57 supports iOS 16.4+                                                                                  | Generated Podfile and Xcode project target iOS 16.4                        | Test supported devices and current iOS release                                  |
| Google target API       | New apps and updates must target API 36 from 2026-08-31                                                         | Generated Android project has compileSdk/targetSdk 36                      | Re-read target API policy before upload                                         |
| Android native binaries | Target-35+ apps must support 16 KB pages; the current page says unsupported updates are blocked from 2027-02-01 | RN 0.86.2 and modern packaging configured                                  | Inspect the signed AAB and every packaged `.so` on a 16 KB device               |
| Expo compatibility      | Expo SDK 57 uses React Native 0.86 and React 19.2                                                               | `mobile/package.json`, Expo Doctor, generated projects                     | Run `make expo-doctor` and review Expo release notes                            |
| Privacy                 | Apple manifests/labels and Google Data Safety must match actual data flows                                      | Repository inventories and generated manifest                              | Human review of production SDKs/processors and console answers                  |
| Account deletion        | Apple requires in-app deletion; Google requires in-app and public Web paths                                     | Native settings flow, `/account/delete`, authenticated backend operation   | Test against the production identity/database and complete console declarations |
| UGC safety              | Apple and Google require reporting, blocking, terms/content standards, and ongoing moderation                   | Backend-authoritative reports/blocks plus moderation UI and tests          | Staff and legal must validate response SLA and published standards              |
| Digital payments        | Store billing rules apply to digital in-app value; physical marketplace transactions are treated separately     | Digital boosts/subscriptions remain unavailable in mobile                  | Make a current regional policy/legal decision before enabling them              |
| Review access           | Reviewers need stable access to gated features                                                                  | Review flow documented without credentials                                 | Put a non-expiring test credential in secure store-console fields               |

Official references:

- [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [Apple required-reason API guidance](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)
- [Apple third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/)
- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Android 16 KB page-size requirements](https://developer.android.com/guide/practices/page-sizes)
- [Google Play Developer Program Policies](https://play.google.com/about/developer-content-policy/)
- [Google User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Google account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google UGC policy](https://support.google.com/googleplay/android-developer/answer/9876937)
- [Google Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- [Google Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google reviewer access requirements](https://support.google.com/googleplay/android-developer/answer/15748846)
- [Expo SDK 57 documentation](https://docs.expo.dev/versions/latest/)
- [Expo Apple privacy manifest guide](https://docs.expo.dev/guides/apple-privacy/)

Known manual work: store-account ownership, contracts, tax/banking, final ratings, localized metadata, screenshots, privacy/Data Safety forms, reviewer credentials, signing, signed-artifact validation, and phased release decisions.

Dependency advisory note (2026-08-21): the compatible npm remediation updated
`@expo/metro` 56.0.0 → 56.0.2 and Metro 0.84.4 → 0.84.5, removing the five high
`image-size`/Metro build-tool advisories. Eleven moderate advisories remain on
the Expo configuration toolchain's transitive `xcode -> uuid@7` path. npm's
only automated remedy is an incompatible Expo/splash-screen downgrade, so do
not run the forced fix; re-check when Expo publishes a compatible toolchain.
