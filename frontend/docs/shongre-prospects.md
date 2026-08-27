# Shongre Prospects — demo-first frontend

## Entry points

- Public product landing, product demonstration and entry-point choice: `/prospects`.
- Standalone CRM application: `/app` (the legacy `/prospects/app` redirects here).
- Shongre Pro workspace: `/compte/pro/prospects`.
- Internal CRM workspace: `/admin/crm/prospection`.

The standalone application exposes product routes for discovery, companies,
contacts, lists, pipeline, opportunities, tasks, activities, campaigns,
analytics, sources, team, billing and settings under `/app/*`. Existing CRM
pages are reused through `CrmSurfaceContext`; internal and product-facing links
change, but the components, service contracts and backend authorization do not
fork.

## Demo architecture

```text
page
  -> workspace controller
  -> CRM prospecting service contract (discovery, evidence, import)
  -> CRM Core service contract (accounts, opportunities, tasks, activities)
  -> Marketing service contract (campaigns, suppression, preflight)
  -> deterministic tenant-keyed demo adapters
```

Normal runtime remains `NEXT_PUBLIC_DATA_MODE=demo`, so the workspace works with
the backend, Supabase, AI providers and enrichment providers stopped. Explicit
`api` mode selects the live `HttpCrmProspectingService`, which calls only the
canonical `/api/v1/crm/prospecting/*` OpenAPI operations and validates response
payloads before returning them to the UI. API failures never fall back to demo.

The `standalone_trial_owner` persona demonstrates an organization that uses the
SaaS product without marketplace seller activity. `pro_atelier` demonstrates
the bundled Shongre Pro path. The adapter keys profiles, candidates and imports
by the current account, so switching personas reloads isolated state.

## Demonstrated behavior

- public positioning and standalone/Pro entry-point choice without hardcoded production prices;
- one shared standalone/Pro/internal workspace;
- country-aware ICP and discovery request contracts;
- deterministic multi-market candidates and source provenance;
- evidence-backed score, confidence, missing information and next action;
- AI-unavailable rules fallback;
- duplicate review and idempotent CRM import;
- one idempotent conversion path that creates or links the CRM account, opens a
  qualification opportunity, schedules the next task and preserves provenance
  in the shared activity journal;
- operational overview, market-filtered company records, configurable CRM
  pipeline stages, task completion and immutable activity history;
- Marketing-owned campaigns with suppression counts and explicit preflight;
- source availability and approval status;
- backend-shaped usage, quotas and different standalone/bundled packaging;
- compliance checklist and explicit statement that production integrations are
  inactive;
- responsive table/detail drawer composition using the existing design system.

The product navigation is capability-driven. Customer CRM users inherit the
shared commercial CRM and Marketing editor permissions, while approval,
platform configuration, administration and internal first-party access remain
separate grants. Backend permission checks and RLS remain authoritative even
when a route is known to the client.

## Deterministic scenarios

`DemoProspectingService` supports `prospects_default`, `empty_discovery`,
`discovery_error`, `duplicates_found`, `ai_unavailable`, `quota_near_limit`,
`quota_exhausted`, `source_disconnected`, `subscription_expired`, and
`permission_denied`. Important outcomes never use randomness or timers.

Campaign delivery and suppression remain owned by Marketing. Accounts,
opportunities, pipeline configuration, tasks and activities remain owned by CRM
Core. Shongre Prospects orchestrates those existing service contracts into one
product workspace; it does not create a second store or bypass either domain.

## Country scope

- ICP profiles are `MULTI_MARKET_SHARED` through explicit `marketCodes`.
- Discovery runs, candidate evidence, CRM accounts and the operational view are
  `MARKET_SCOPED` and reload when the canonical market changes.
- Campaign visibility follows the active locale until Marketing exposes an
  explicit market association; unavailable market data renders an empty state
  instead of falling back to France.
- CRM opportunity money uses the active market currency from
  `CountryConfig`. The demo integration never derives currency from UI text or
  silently copies a France-only value.

## Connected mode

Production connection is explicit through the central data-mode and runtime API
configuration. CRM, Prospects and Marketing keep independent adapters behind
their existing service contracts; the product controller orchestrates them and
does not import backend implementation. The HTTP client supplies Shongre session,
CSRF, request-id and market-context transport.

Real source, AI, mailbox and campaign-delivery providers remain release-gated.
The integrated demo is commercially coherent but is not evidence that external
provider activation, billing, legal approval or production operations are
complete.
