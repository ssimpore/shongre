# Mobile release operations

Build, submission, and release are separate approvals.

1. Re-check current Apple, Google, and Expo requirements and update `docs/compliance/store-requirements.md`.
2. Configure production URLs, stable identifiers, EAS project, and signing data through secure release environment variables.
3. Run `make check`, `make mobile-prebuild-clean`, `make mobile-check`, and `make store-check`.
4. Resolve every `FAIL`; assign owners for every warning and manual-review result.
5. Render and deploy association files with `make association-files`; verify both public HTTPS responses.
6. Build preview candidates, test real devices and accessibility, then build production candidates.
7. Inspect the signed IPA/AAB, including entitlements, privacy manifests, permissions, native libraries, endpoints, version, and signing identity.
8. Submit only with `make submit-ios` or `make submit-android`. Submission never implies automatic public release.

Do not put credentials, keystores, App Store Connect keys, service-account JSON, or reviewer passwords in the repository. Roll back by halting rollout/store release, disabling affected backend capability where safe, and shipping an incremented corrective build; uploaded build numbers/version codes are never reused.
