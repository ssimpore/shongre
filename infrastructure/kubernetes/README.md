# Production workload contract

`shongre-platform.yaml` is a provider-neutral workload baseline. It deliberately
does not contain an Ingress, certificate issuer, DNS record, registry
credential, or secret value because those belong to the selected production
platform and secret manager.

Before applying it:

1. Replace both image tags with the same immutable release identifier or image
   digest produced by CI. Never deploy `latest`.
2. Build the frontend image with the public production URL and Stripe
   publishable-key arguments documented in `frontend/Dockerfile`.
3. Create `shongre-production-config` from non-secret variables and
   `shongre-production-secrets` from the secret manager. The complete gate is
   `make production-release-check`; do not hand-write a reduced list here.
4. Put TLS/WAF/CDN routing in front of `shongre-web:3000` and route the API host
   to `shongre-api:4000`. Do not expose the worker.
5. Confirm resource requests against staging load tests before changing the
   replica counts or adding autoscaling.

The API and worker use the same artifact but different commands. Two worker
replicas are safe because scheduled jobs acquire durable database leases. API
liveness is process-only; readiness checks database access so a dependency
outage removes a pod from service without causing a restart storm.
