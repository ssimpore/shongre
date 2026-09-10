# Production monitoring contract

The backend emits structured JSON logs. Every HTTP completion includes method,
path, status, duration, and a caller-supplied or generated `traceId`; the same
identifier is returned in `X-Request-Id`. Log collectors must redact
authorization/cookie headers and must never ingest passwords, action links,
payment payloads, private messages, identity documents, or provider secrets.
HTTP completion events also expose the bounded cache policy, cache-tag count,
content encoding, and response bytes. Hot listing-query events include only
operation, duration, row/count, market, page, limit, and sort dimensions. They
must never include search text, full URLs, cookies, tokens, or customer data.

## Metrics

`GET /metrics` serves Prometheus text exposition for the API and the worker.
It is bearer-authenticated with `METRICS_TOKEN` and answers **404** without a
valid token, so an unconfigured deployment does not advertise that the endpoint
exists. Production refuses to start without a token of at least 24 characters,
because the objectives below cannot be measured otherwise.

Every label is a bounded value — a route template, a job name, a status class —
never an identifier or a concrete path. The series are:

| Series | Type | Labels |
| --- | --- | --- |
| `shongre_http_requests_total` | counter | `method`, `route`, `status` (`2xx`…`5xx`) |
| `shongre_http_request_duration_seconds` | histogram | `method`, `route` |
| `shongre_http_response_bytes_total` | counter | `method`, `route` |
| `shongre_scheduled_job_runs_total` | counter | `job`, `outcome` (`succeeded`/`failed`/`skipped`) |
| `shongre_scheduled_job_duration_seconds` | histogram | `job` |
| `shongre_notification_deliveries_total` | counter | `channel`, `outcome` |
| `shongre_provider_webhook_events_total` | counter | `provider`, `outcome` |
| `shongre_build_info` | gauge | `version`, `release`, `environment` |

`prometheus-scrape.yaml` and `alert-rules.yaml` in this directory carry the
scrape configuration and the alerts. Each alert is written against a series the
runtime actually emits: a rule whose input nothing produces reads as coverage
while never firing.

`skipped` on a scheduled job means another replica held the lease for that
tick, which is normal. A job with neither successes nor skips anywhere is not
running at all, and `ShongreScheduledJobStalled` is the rule for that case.

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
- Interactive database queries: p95 below 100 ms; investigate every query over
  250 ms and monitor Supavisor/PostgreSQL connection saturation from 80%.
- Core Web Vitals: LCP at most 2.5 s, INP at most 200 ms, CLS at most 0.1, and
  TTFB at most 800 ms at the 75th percentile by market/device class.
- Anonymous CDN cache hit ratio: at least 40% discovery, 70% catalogue, and 80%
  reference projections; tag invalidation p95 below five seconds.
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
- sustained interactive-query p95 above 100 ms, API p95 above 750 ms, cache hit
  ratio below its objective, or cache invalidation p95 above five seconds;
- authentication email failure rate above 2%, provider outage, or bounce-rate
  anomaly;
- backup/PITR not current, restore drill overdue, or object-storage replication
  failure;
- abnormal login throttling, privileged authorization denial spikes, or WAF
  attack alerts.

Create dashboard links and alert receiver identifiers in the deployment system,
not this repository. Each page links to `docs/operations/incident-response.md`
and includes environment, release id, affected route/provider, and trace ids.

## Release evidence

Before production promotion, run `make observability-evidence` against the
staging-certified release. The probe requires the exact environment and release
SHA, dashboard/alert/on-call HTTPS references, and explicit confirmation that a
generated request id was found in the log and trace drains and that a test page
reached the on-call receiver. It writes a restricted JSON record through
`OBSERVABILITY_EVIDENCE_FILE`; `make production-release-check` rejects missing,
stale, mismatched, or incomplete evidence.

This confirmation is deliberately not inferred from a configured vendor name.
A dashboard that exists but receives no release traffic is not operational
evidence.

The operational definitions, commands, scaling triggers, synthetic query-plan
method, and cache safety rules are maintained in
`docs/architecture/performance-scalability.md`. Dashboard thresholds must
consume the same values from `@shongre/contracts/performance`; changing a
dashboard is not authorization to weaken the repository gate.
