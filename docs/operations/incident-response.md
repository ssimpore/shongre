# Incident response

## Roles and first ten minutes

The incident commander owns decisions and timeline; an operations lead owns
traffic and deployments; a domain lead owns diagnosis; communications owns user
and regulator messaging. The person detecting an incident creates the incident
record, assigns severity, freezes unrelated deploys, records the release id and
UTC start time, and preserves trace ids without copying customer data.

- SEV-1: payment loss, account takeover, broad data exposure, total outage, or
  unrecoverable writes. Page immediately and engage security/legal leadership.
- SEV-2: a core journey or provider is unavailable with no safe workaround.
- SEV-3: degraded non-critical capability or small-scope issue.

## Safe containment

- Application regression: stop rollout and restore the previous immutable API,
  worker, and web images. Never roll database schema backward by editing an
  applied migration; add a forward correction.
- Database outage/corruption: make the API unready or switch affected mutations
  off, preserve the recovery point, and follow `backup-restore.md`.
- Stripe issue: pause checkout or payouts at the capability boundary, retain
  signed webhook payload processing, and reconcile provider objects before any
  manual state change. Never create compensating transfers from a dashboard
  without finance approval and an audit record.
- Email outage: keep public responses enumeration-safe, stop generating repeated
  action links, and communicate a retry window. Do not expose demo tokens.
- Identity/business/AI provider outage: return neutral unavailable or pending
  states; do not auto-verify or bypass required moderation.
- Credential exposure: revoke/rotate at the provider first, deploy the new
  secret, invalidate affected sessions, then determine notification obligations.

## Recovery and closure

Verify `/livez`, `/readyz`, login, listing/search, messaging, checkout quote,
provider webhook receipt, refund/payout controls, and scheduled-worker progress.
Finance reconciles orders, charges, refunds, transfers, and payouts for the
incident window. Security/legal determine breach notification deadlines. Close
only after monitoring is stable, users have a truthful status update, evidence
is attached, and preventive work has an owner and deadline.
