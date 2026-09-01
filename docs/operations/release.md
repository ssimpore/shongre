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
3. Deploy the same artifacts to staging with production-shaped provider
   selection: Stripe/Identity in test mode, SIRENE, Gemini staging and the
   sandbox transactional-email boundary. Demo providers are rejected by the
   staging environment gate. Run real sandbox tests for payment, refund,
   transfer/payout, Identity, registry verification, Gemini moderation,
   transactional email, SMS, push, geocoding, malware scanning, and the
   selected search index. Keep any provider without approved policy and
   credentials disabled.
4. Complete the database and object-storage restore drill and record restricted
   evidence. Run the hosted load smoke and observability evidence probes. The
   provider-smoke and approval files must name the exact `release_sha`; the
   staging certificate must embed successful public-browser and performance
   evidence for the same commit. The browser certificate must exercise the
   France and international marketplace origins and every split application
   origin; a skipped or error-state Solutions catalog fails certification.
5. Load production secrets from the secret manager and run
   `make production-release-check`. Never paste values into tickets or logs.

Useful evidence commands are `make performance-smoke`,
`make observability-evidence`, and
`ALLOW_BACKUP_RESTORE_TEST=true make backup-restore-test`. Signed storage URLs,
dashboard links, alert receivers and evidence paths are release-scoped secrets
or restricted operations configuration; they never belong in Git.

## Production sequence

1. Confirm PITR and object backup replication are current. Record the last
   Stripe reconciliation point and current migration version.
2. Apply forward-only migrations from the release artifact. The migrator checks
   SHA-256 history and refuses an edited applied migration. Do not run `db-seed`.
3. Deploy at least two API and web replicas (the hosted script defaults to two
   in staging and production). Compose waits for every declared health check;
   perform read-only smoke checks from the released OpenAPI contract.
4. Roll at least two worker replicas using the same backend image. Renewable
   database leases prevent replicas from owning the same scheduled job, and
   durable webhook claims recover work abandoned by a crashed worker.
5. Verify the persistent Tunnel route after the Compose rollout. This
   repository does not implement a blue/green traffic switch or percentage
   canary, so do not describe the rollout as zero-downtime or gradual traffic
   shifting. If uninterrupted replacement becomes a launch requirement, add
   and exercise an externally routed blue/green slot before making that claim.
   Watch availability, latency, auth email, webhooks, scheduled jobs, database,
   and error-budget alerts throughout the rollout.
6. Verify login/verification/reset, search, publication and media processing,
   messaging, favorite account isolation, quote/checkout, refund, confirmed
   delivery transfer, seller payout, KYC/KYB, moderation, admin authorization,
   consent reopening, SEO metadata, and mobile-navigation clearance.
7. Before enabling public traffic after the malware-control migration, confirm
   the bounded `legacy_upload_malware_rescan` job has drained every legacy
   ready/attached asset from `pending` or `failed` to `clean` or `rejected`.
   Never bypass this gate by marking historical rows clean without a scanner
   verdict.

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
