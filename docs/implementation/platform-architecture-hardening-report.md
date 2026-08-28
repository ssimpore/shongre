# Platform architecture hardening report

Last updated: 2026-08-28  
Status: implemented; production release remains evidence-gated

This report records the incremental implementation of the repository audit
recommendations. It does not replace the domain architecture records or claim a
production deployment.

## Implemented controls

| Concern                  | Repository outcome                                                                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hosted frontend boundary | Development, staging, and production web runtime configuration is explicitly `demo` with mock storage enabled and no Stripe publishable key. Validators and CI reject an accidental API-mode cutover.                                                                                |
| Product isolation        | Facturation and Prospects entitlements are organization-scoped through the shared monetization contracts. Facturation backend composition and RLS require the explicit organization grant in addition to membership and capabilities.                                                |
| RLS evidence             | Persona-oriented pgTAP tests are defined and CI invokes `supabase test db` after a clean reset; static migration tests remain a fast companion, not a substitute. The legacy replay blocker below currently prevents claiming a successful local pgTAP execution.                    |
| API abuse                | A centralized durable public/authenticated rate limiter protects the API and emits `Retry-After`; it is not duplicated inside controllers.                                                                                                                                           |
| Upload safety            | Private and listing uploads enter a staged state, pass through one malware-scanner contract, and fail closed or quarantine before becoming usable. Production configuration requires the scanner.                                                                                    |
| Stripe webhooks          | Signature verification precedes a durable idempotent inbox. Workers claim with `SKIP LOCKED`, use bounded exponential retries, recover abandoned leases, dead-letter terminal failures, and purge raw payloads after 30 days. Dispatch logic is centralized.                         |
| Scheduled work           | Database leases are renewable, completion verifies ownership, and `WORKER_GROUPS` provides runtime bulkheads without introducing microservices or another deployment stack.                                                                                                          |
| Market governance        | Configuration changes are versioned requests with before/candidate snapshots, a required reason, atomic publication, audit, stale-write rejection, and mandatory approval by a different administrator. The frontend service contract uses the same request/approve/reject workflow. |
| Messaging scale          | Conversation inbox reads use bounded keyset pagination instead of loading a complete account inbox.                                                                                                                                                                                  |
| Multilingual search      | Search vectors use the language-neutral `simple` configuration across current markets. Versioned, partial indexes and a bounded `SKIP LOCKED` reindex worker permit online backfill.                                                                                                 |
| Release safety           | Production deployment now re-runs readiness checks against host-managed runtime files and restricted evidence before migration. Hosted releases default to two API, web, worker, and Tunnel replicas and still use exact certified image digests.                                    |
| Documentation accuracy   | The release runbook no longer claims blue/green, canary, or zero-downtime behavior that the repository does not implement.                                                                                                                                                           |
| Edge Functions           | Obsolete duplicate moderation, escrow, and listing-expiry functions were removed. The only allowed function is the reviewed Stripe ingress, and production requires inventory evidence.                                                                                              |
| Duplicate infrastructure | Unused parallel queue and search-provider scaffolds were removed. The scheduled-job coordinator, repository search boundary, provider platform, authentication, database, Compose deployment, and Cloudflare Tunnel remain canonical.                                                |
| Generated contracts      | OpenAPI types, manifest, and endpoint inventory are generated and checked. Database type generation now has a schema-diff check intended to run after a clean migration.                                                                                                             |

## Product boundary

Facturation remains a bounded domain inside the Shongre modular monolith. It
uses shared identity, organizations, memberships, monetization, permissions,
market configuration, storage, audit, workers, database, OpenAPI, images, and
deployment. It does not import Prospects internals and neither product writes
the other product's records. The complete independent activation and customer
matrix is documented in
[`../architecture/invoicing.md`](../architecture/invoicing.md).

## Operational limits and honest release state

- The repository still performs the richer relevance/diversity policy over a
  bounded discovery candidate window. The multilingual vector/index changes
  remove the France-only parser assumption, but a larger-scale external search
  cutover must remain measurement-driven and keep the same discovery contract.
- Compose provides multiple healthy replicas and renewable worker ownership;
  it does not provide an external blue/green slot or percentage traffic switch.
- Legal e-invoice transport, approved provider selection, pricing approval,
  live frontend cutover, staging certification, backup/restore proof, and
  production authorization remain explicit external gates.
- A fresh-database replay currently exposes defects in already-versioned legacy
  migrations (`00030`, `00032`, and seeded-data cleanup in `00040`). They
  predate this hardening work. The repository deliberately does not edit those
  applied files or bypass checksum enforcement. An operator must reconcile the
  deployed migration ledger and approve a forward-compatible baseline repair;
  until then, the clean-migration and generated-database-type CI gates must stay
  red and production rollout is not authorized.

No DNS, Tunnel, provider, Supabase project, secret, staging environment, or
production environment was changed by this implementation.

## Verification evidence

The final code-level validation completed successfully:

```text
contracts: 17 test files, 121 tests
backend:   117 test files, 645 tests
frontend:  112 test files, 735 tests
TypeScript: contracts, backend, and frontend all pass
OpenAPI: 437 operations; 432 router plus 5 operational endpoints synchronized
```

Deployment-environment, production-readiness, and release-manifest script tests
also pass. A disposable PostgreSQL 17 instance accepted new migrations `00071`
through `00076` in dependency order. This does not override the explicitly
blocked clean-chain, pgTAP, and generated database-type gates described above.
