# Google release checklist

- [ ] `make android-release-check` has no `FAIL`
- [ ] API 36+ generated target and compile values confirmed
- [ ] Signed AAB tested with bundletool; every `.so` checked for current 16 KB rules
- [ ] Final merged permissions and SDK inventory reviewed
- [ ] Data Safety, deletion, privacy, content rating, target audience, ads, and App Access forms approved
- [ ] Package, versionCode, Play App Signing certificate, upload key, and App Links fingerprint confirmed
- [ ] Internal/closed test completed across supported API levels and form factors
- [ ] Crash/ANR/pre-launch findings triaged
- [ ] Billing and UGC policy/operations reviews complete
- [ ] Production rollout percentage, monitoring, stop criteria, support, and rollback owners approved
