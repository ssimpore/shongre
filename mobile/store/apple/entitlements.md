# Apple entitlements

The generated app currently needs only `com.apple.developer.associated-domains` for `applinks:shongre.com`. Push notification credentials are managed by EAS/Apple when production notifications are enabled; inspect the signed profile and archive for the actual `aps-environment` entitlement.

No background location, background fetch, HealthKit, contacts, microphone, tracking, keychain sharing, or other sensitive capability is intended. Confirm the final provisioning profile, application identifier prefix/team, associated domain ownership, and signed entitlements. Source configuration alone does not establish signing readiness.
