# Production release runbook

Build, database migration, deployment, traffic enablement, and mobile-store
submission are separate approvals. A green build alone is not authority to
process production data or money.

## Release candidate

1. Freeze the release commit. CI must pass quality/builds, secret scanning,
   browser E2E on Chromium/Firefox/WebKit, clean-database migrations, and both
   container builds. `make openapi-check` must prove generated artifacts and
   implementation parity; the pull-request breaking check must compare the
   contract with the release base ref.
2. Build API/worker/migrator once from `backend/Dockerfile` and web once from
   `frontend/Dockerfile`. Web public configuration is injected at runtime, so
   neither image is rebuilt per environment. Buildx attaches SBOM and
   provenance, Trivy scans both, and the release manifest records immutable
   digests for every promotion.
3. Deploy the same artifacts to staging with production-shaped configuration.
   Run real provider sandbox tests for payment, refund, transfer/payout,
   Identity, registry verification, Gemini moderation, and transactional email.
4. Complete the backup restore drill and record restricted evidence. Fill the
   provider-smoke and security/legal/operations/product approval files with the
   exact PASS/APPROVED markers required by `scripts/production-readiness.mjs`.
5. Load production secrets from the secret manager and run
   `make production-release-check`. Never paste values into tickets or logs.

## Production sequence

1. Confirm PITR and object backup replication are current. Record the last
   Stripe reconciliation point and current migration version.
2. Apply forward-only migrations from the release artifact. The migrator checks
   SHA-256 history and refuses an edited applied migration. Do not run `db-seed`.
3. Deploy API pods with zero unavailable capacity. Wait for `/readyz`; perform
   read-only smoke checks from the released OpenAPI contract while old workers
   remain active.
4. Roll worker pods using the same backend image. Database leases prevent two
   replicas from owning the same scheduled job.
5. Deploy web pods, purge only the intended CDN release paths, then shift a small
   traffic percentage. Watch availability, latency, auth email, webhooks,
   scheduled jobs, database, and error-budget alerts before full traffic.
6. Verify login/verification/reset, search, publication and media processing,
   messaging, favorite account isolation, quote/checkout, refund, confirmed
   delivery transfer, seller payout, KYC/KYB, moderation, admin authorization,
   consent reopening, SEO metadata, and mobile-navigation clearance.

The repository entrypoints are `make deploy-dev`, `make deploy-staging`, and
`make deploy-prod`. They dispatch the distinct build, promotion, and protected
production workflows for the current full commit. Production requires a
matching successful STAGING certification and an approving reviewer on the
GitHub `production` environment. After rollout run
`make remote-health ENVIRONMENT=production`.

## Rollback

Roll API, worker, and web images back to the previous immutable release when the
schema remains backward-compatible. Never execute a destructive down migration.
If a new schema causes the fault, disable the affected capability and ship a
forward correction. Restore data only for corruption or loss and follow
`backup-restore.md`; after any recovery, reconcile Stripe before reopening money
movement.

Dispatch the protected rollback with
`make rollback ENVIRONMENT=production RELEASE_SHA=<known-good-full-sha>`. The
workflow redeploys the original frontend/backend digests and waits for private,
Tunnel and public health. It never rebuilds or runs a down migration.

## Mobile release appendix

Run `make mobile-prebuild-clean`, `make mobile-check`, and `make store-check`;
resolve every FAIL and assign every manual review. Deploy association files,
test real devices and accessibility, inspect signed IPA/AAB entitlements,
privacy manifests, endpoints, version and signing identity, then submit only
with `make submit-ios` or `make submit-android`. Submission never implies an
automatic public release, and uploaded build numbers are never reused.
