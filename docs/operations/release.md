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
   staging certificate must embed successful public/authenticated-browser and performance
   evidence for the same commit. The browser certificate must exercise the
   France and international marketplace origins and every split application
   origin; a skipped or error-state Solutions catalog fails certification.
   `make test-web-api-transport` must also pass the isolated first-party
   transport regression on the CI browser matrix.
5. Load production secrets from the secret manager and run
   `make production-release-check`. Never paste values into tickets or logs.
   This gate requires independent 32-byte keys for provider credentials and
   digital fulfillment, plus the reviewed malware-scanner binding; a missing or
   malformed key must stop promotion before the backend is restarted.

Useful evidence commands are `make performance-smoke`,
`make observability-evidence`, `make image-transform-check` and
`ALLOW_BACKUP_RESTORE_TEST=true make backup-restore-test`. Signed storage URLs,
dashboard links, alert receivers and evidence paths are release-scoped secrets
or restricted operations configuration; they never belong in Git.

## Enabling the storage image transformer

Marketplace photos are served as uploaded originals until
`PUBLIC_MEDIA_IMAGE_TRANSFORM=supabase_render` is set for an environment; the
Web and mobile clients then request a width ladder through the storage
provider's render endpoint. That endpoint is a billed provider capability, and
a transform it rejects is a broken photo on every card, so the flag is only
ever turned on after the capability is proven in that exact project:

1. Enable image transformations on the storage project (a paid-plan feature of
   the hosted provider; locally, `[storage.image_transformation] enabled = true`
   in the rendered Supabase config and a stack restart).
2. Run `IMAGE_TRANSFORM_ENVIRONMENT=<environment>
IMAGE_TRANSFORM_SAMPLE_URL=<public object URL from that project>
IMAGE_TRANSFORM_EVIDENCE_FILE=<restricted path> make image-transform-check`.
   It fetches the original and the same object rendered at 320px, and passes
   only when the render is a decodable image of exactly that width and smaller
   than the original — a passthrough or an error fails it.
3. Set `PUBLIC_MEDIA_IMAGE_TRANSFORM=supabase_render` in that environment's
   Web configuration and, for production, `IMAGE_TRANSFORM_EVIDENCE_FILE`:
   `make production-release-check` refuses the flag without evidence from the
   production storage origin proving a real resize.

## Authenticated staging certification

The protected staging workflow runs `hosted-smoke.spec.ts` and
`hosted-authenticated.spec.ts` together. Certification requires all ten named
journeys, matching staging/release metadata, no skipped, flaky or failed tests,
and schema-version-2 performance evidence from `make performance-smoke`,
including both search transports and the conditional-cache probe. The producer
and certification consumer share validation in `scripts/lib/release-evidence.mjs`.
The production gate accepts only a certificate created within the previous 14
days and bound to the release's exact immutable frontend/backend image digests,
OpenAPI digest, migration revision, migration digest, hosted-smoke report digest
and performance report digest.

Set `STAGING_JOURNEY_FIXTURES_JSON` only as a protected GitHub **staging secret**.
The workflow explicitly sets `PLAYWRIGHT_ALLOW_STAGING_WRITES=true`; the suite
checks staging identity and the exact deployed release before login or writes.
It must never be run with production accounts or data. Browser traces, video,
screenshots and automatic page snapshots are disabled for these credentialed
journeys. Do not upload the fixture or raw browser responses as evidence.

The JSON fixture schema is enforced in
`frontend/e2e/hosted-authenticated.spec.ts` and requires:

- `environment: "staging"`, the exact full `release` SHA, and
  `providerMode: "sandbox"`;
- distinct `buyer`, `seller`, `outsider` and `finance` objects with dedicated
  staging `id`, `email`, `password`; `finance` also has its real enrolled
  base32 `totpSecret`. Never disable MFA or recent-authentication gates;
- `favoriteListingId`: a France listing not already favorited by the outsider
  or the buyer's Belgium account bucket;
- `conversationListingId`: a published France listing owned by `seller`;
- `publicationDraft`: a valid, release-specific France publication draft with
  real staging taxonomy/media and all applicable compliance prerequisites;
- `invoiceInput`: the canonical create-invoice request for a tenant, legal
  entity and customer owned by the professional seller. Both seller and
  outsider need Facturation access, but only seller belongs to this tenant;
- `checkoutListingId`: a purchasable France listing supporting hand delivery;
- `refundableOrderId`: a dedicated, actually funded Stripe **test** order in a
  refundable state. Provision this through the sandbox checkout/webhook flow,
  not a database status edit. Finance must have the authorized refund capability.

The suite verifies browser login/refresh/write/logout on France and Belgium,
favorite account/market isolation, authoritative publication, conversation
ownership, invoice retry/tenant denial, a Stripe test Checkout session, and an
MFA-authorized idempotent provider refund. Release-scoped keys make invoice,
checkout and refund retries stable. Publication and messaging create staging
records: use dedicated release fixtures and the approved staging retention
workflow, never production seeding or cleanup. Refresh one-time payment fixtures
for each release. Checkout creation is not proof of payment completion; provider
webhook, payout, reconciliation and restore drills remain independent gates.
The hosted operations review must also verify trusted client-IP propagation
through the Web relay and Tunnel, and exercise login rate limits from distinct
clients; local forwarding tests alone do not certify the deployed proxy chain.

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
