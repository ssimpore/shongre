# Common release checklist

- [ ] Current Apple/Google/Expo requirements re-verified and dated
- [ ] `make check`, `make mobile-check`, and `make store-check` reviewed
- [ ] No unresolved `FAIL`; warnings/manual items have named owners
- [ ] Production URLs deployed over HTTPS and no development endpoint in binary
- [ ] Identifiers, semantic version, buildNumber, and versionCode confirmed
- [ ] Signed IPA/AAB permissions, entitlements, privacy manifests, and endpoints inspected
- [ ] Dependency and third-party SDK inventory reconciled with actual archive
- [ ] Privacy policy, terms, support, and external deletion page publicly reachable
- [ ] App Privacy and Data Safety answers reconciled with production data/processors
- [ ] Report/block/account-deletion workflows tested against production-like backend
- [ ] Physical/digital billing classification approved for every launch region
- [ ] Universal/App Links verified from public association files
- [ ] Reviewer access tested on a clean external device
- [ ] Accessibility, offline/error/empty states, supported devices, and localization tested
- [ ] Metadata, screenshots, ratings, support contact, and release notes finalized
- [ ] Signing custody, backups, incident response, rollout, monitoring, and rollback approved
