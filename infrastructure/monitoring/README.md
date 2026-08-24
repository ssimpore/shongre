# Production monitoring contract

The backend emits structured JSON logs. Every HTTP completion includes method,
path, status, duration, and a caller-supplied or generated `traceId`; the same
identifier is returned in `X-Request-Id`. Log collectors must redact
authorization/cookie headers and must never ingest passwords, action links,
payment payloads, private messages, identity documents, or provider secrets.

## Health checks

- `GET /livez` is process-only and is the liveness probe.
- `GET /readyz` checks database access and is the traffic readiness probe.
- `GET /health` remains a compatibility alias for liveness; new monitors should
  not use it as a dependency-health signal.

The worker has no public HTTP listener. Its process is supervised by the
orchestrator; job outcomes are observable through `scheduled_job_completed`,
`scheduled_job_failed`, and `scheduled_job_coordination_failed` events. Durable
database leases make multiple worker replicas safe.

## Initial service objectives

These are launch targets and must be recalibrated from the first 30 days of
production data:

- API successful-request availability: 99.9% monthly, excluding deliberate
  client 4xx responses.
- API latency: p95 below 750 ms and p99 below 2 s for non-upload endpoints.
- Payment webhooks: 99.9% accepted within 30 s; no unprocessed event older than
  five minutes.
- Scheduled jobs: no required job more than two expected intervals overdue.
- Recovery: RPO at most five minutes with PITR; database RTO below two hours;
  storage RTO below four hours.

## Required alerts

Page the on-call engineer for:

- readiness failing on every API replica for two minutes;
- 5xx responses above 2% for five minutes or a sharp error-budget burn;
- payment/Connect webhook signature failures or processing failures above the
  baseline, and any payment-state reconciliation mismatch;
- `scheduled_job_failed` on payments, monetization, media cleanup, or lifecycle
  jobs for two consecutive executions;
- database saturation, exhausted connections, replica lag, or storage quota
  above 80%;
- authentication email failure rate above 2%, provider outage, or bounce-rate
  anomaly;
- backup/PITR not current, restore drill overdue, or object-storage replication
  failure;
- abnormal login throttling, privileged authorization denial spikes, or WAF
  attack alerts.

Create dashboard links and alert receiver identifiers in the deployment system,
not this repository. Each page links to `docs/operations/incident-response.md`
and includes environment, release id, affected route/provider, and trace ids.
