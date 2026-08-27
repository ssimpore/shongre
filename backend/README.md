# Shongre backend

`backend/` is the server boundary for the Shongre modular monolith. It owns the
versioned HTTP API, domain services, repositories, privileged integrations,
workers, Supabase migrations and backend tests. Web and mobile applications
consume public contracts; they never import this implementation.

The six-environment URL, fingerprint, Supabase, provider and deployment model is
documented in
[`docs/architecture/environments.md`](../docs/architecture/environments.md).
Analytics ingestion, finance-backed reporting, provider delivery, retention,
Search Console and operational rollout are documented in
[`docs/analytics.md`](docs/analytics.md).

## Layout

```text
backend/
├── openapi/                   the sole authoritative OpenAPI 3.1 contract
├── src/
│   ├── app/                    configuration and server bootstrap
│   ├── api/v1/                 versioned HTTP routing
│   ├── modules/                marketplace application/domain services
│   ├── infrastructure/         repositories, Supabase, payments, search, logs
│   ├── integrations/providers/ explicit demo and external-provider boundaries
│   ├── shared/                 errors, auth, money and backend DTOs
│   ├── generated/              generated database types and OpenAPI manifest
│   └── workers/                background entrypoints
├── supabase/
│   ├── migrations/             ordered, canonical SQL migrations
│   ├── functions/              Edge Functions
│   ├── policies/ and tests/    RLS documentation and SQL tests
│   └── seed/                   deterministic local seed data
├── scripts/                    migration, type generation and maintenance tools
├── tests/                      unit, contract, integration, RLS and security tests
└── docs/                       backend-specific technical documentation
```

Do not define a route in the router first. API changes begin in
`openapi/openapi.json`, then `make openapi-generate` refreshes the shared client
paths, runtime manifest, and endpoint inventory. `make openapi-check` rejects
undocumented routes, unimplemented operations, stale output, security drift,
duplicate operation IDs, and removed legacy aliases. The complete workflow and
versioning policy are in [`docs/api.md`](docs/api.md).

There is no second root-level Supabase tree and no compatibility `generated/`
directory. `src/generated/database.types.ts` is the only database-type output.

## Runtime modes

```env
BACKEND_DATA_MODE=demo       # deterministic in-memory repositories
BACKEND_DATA_MODE=database   # authoritative PostgreSQL/Supabase repositories

PAYMENT_PROVIDER=demo        # or stripe
KYC_PROVIDER=demo            # or stripe/live
BUSINESS_REGISTRY_PROVIDER=demo # or siret
AI_PROVIDER=demo             # or gemini
```

Modes are validated at boot. Database mode never falls back to seeded demo
records after a query failure. External modes that do not yet have a complete
production adapter fail closed with a neutral `503`; they never fabricate a
successful live KYC, registry, AI or balance response. Keep every provider in
`demo` until its adapter and operational credentials are explicitly completed.

## Commands

Run commands from the repository root so environment precedence and ports stay
consistent:

```bash
make env
make backend
make worker
make backend-typecheck
make backend-test
make backend-build
make backend-check
make test-critical
make openapi-check
make openapi-docs
```

The full repository gate is `make check`; CI additionally enforces formatting,
migration ordering and high/critical dependency audit failures.

## Database workflow

All schema changes are additive, ordered SQL files under
`backend/supabase/migrations/`.

```bash
make infra-start
make migrations-check
make db-migrate
make db-seed
make db-types
make infra-stop
```

`make migrations-check` always validates every migration file name, uniqueness
and non-empty SQL without connecting to a database. `make db-migrate` applies
unapplied migrations with `psql`, transaction failure-on-error semantics and
the Supabase-compatible migration ledger. Interactive local use proves a
loopback target; remote use additionally requires the protected deployment
workflow's approval marker and hosted fingerprint validation.

`make db-seed` follows the same safety model and applies the idempotent reference
data in one transaction. Without an explicit safe local URL it discovers the
running local Supabase endpoint; it never treats a remote database as a
development fallback.

The production backend image contains `dist/server.js`, `dist/worker.js`,
`dist/migrate.js`, `psql`, and the exact source-controlled SQL history. The
protected host runner invokes that migrator once under an environment lock
before rolling out API/worker containers from the same digest. Replica startup
never runs migrations.

`make db-types` requires the Supabase CLI plus either `DATABASE_URL` or
`SUPABASE_PROJECT_REF`; it writes directly to
`backend/src/generated/database.types.ts` and refuses placeholder output.

Use `make db-reset` only for disposable local development data. The root target
requires `APP_ENV=local`, a loopback Supabase host, the local CLI workdir,
and an available Docker daemon.

## Security invariants

- The service-role key, database URL and provider secrets remain server-only.
- HTTP identity comes from the verified principal, never a client-supplied user
  ID.
- Repository database failures are surfaced as neutral availability errors,
  without demo fallback or raw SQL/provider details.
- Money authority and state transitions belong to backend services/database
  constraints; clients display normalized contracts.
- Every Supabase-exposed table uses deny-by-default RLS, tested independently.
- Logs must not contain passwords, OTPs, handover PINs, full payment/bank
  identifiers, identity documents or internal fraud scores.
