# Shongre CRM Platform

Last audited: 2026-08-25

## Purpose and boundaries

Shongre CRM is a tenant-scoped bounded domain inside the existing TypeScript
modular monolith. It manages commercial relationships; it does not become a
second marketplace, identity system, billing system, newsletter provider stack,
or source of truth for Shongre vertical records.

```text
Web CRM screens
    -> frontend CRM service contract
    -> demo or generated-OpenAPI HTTP adapter
    -> /api/v1/crm/*
    -> CrmService (authorization + business rules + audit)
    -> CrmRepository
    -> deterministic memory or PostgreSQL/Supabase

External capability
    -> shared capability gateway
    -> ProviderConnectionService
    -> tenant/user policy + capability resolution
    -> one shared provider adapter
```

The canonical code boundaries are:

- public CRM value and input schemas: `@shongre/contracts/crm`;
- public provider connection schemas: `@shongre/contracts/provider-connections`;
- provider-neutral capability contracts: `@shongre/contracts/provider-gateways`;
- HTTP wire contract: `backend/openapi/openapi.json` only;
- backend application rules: `backend/src/modules/crm/`;
- persistence: `backend/src/infrastructure/database/repositories/crm.repository.ts`;
- provider resolution: `backend/src/modules/providers/provider-connection.service.ts`;
- schema and RLS: migrations `00052` through `00058`.

CRM Core must not import marketplace, Immo, Auto, Education, newsletter, Stripe,
OpenAI, Anthropic, Gmail, Microsoft, Brevo, or another vertical/vendor domain.
Those systems exchange normalized references and events through adapters.

## Delivery status

The repository deliberately distinguishes implemented behavior from reserved
schema. A table or a screen is not proof that its worker or external adapter is
live.

| Capability                                                              | Current repository state                                                                                                                                                      |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts, contacts, opportunities, stage transitions, tasks, activities | Implemented in deterministic and PostgreSQL repositories, services, OpenAPI, and frontend adapters                                                                            |
| Products, prices, quotes, quote lines, custom-field definitions         | Implemented core endpoints and frontend surfaces; quote totals use integer minor units                                                                                        |
| Account duplicate detection                                             | Implemented as a tenant-scoped, server-side exact-signal check for normalized domain, name, email, phone and address; merge decisions remain operator-controlled              |
| Saved views                                                             | Personal and shared account views are implemented with scoped visibility, optimistic locking, audit events and direct-browser table access revoked                            |
| Tags                                                                    | Relational tenant tags persist for accounts, contacts and opportunities through a bounded service-role function; account detail editing is implemented                        |
| Dashboard and reports                                                   | Implemented deterministic operational summaries; not a durable BI warehouse                                                                                                   |
| Provider connections                                                    | Tenant/personal draft creation and encrypted credential rotation implemented; OAuth, activation and live probes remain release-gated                                          |
| Email and mailbox                                                       | Shared gateway contracts exist; no live CRM send/sync path is claimed                                                                                                         |
| CRM AI                                                                  | Shared gateway contract and deterministic prospecting demo exist; connected mode fails closed until a compatible adapter and policy are configured                            |
| Workflows, sequences, imports/exports                                   | Relational schema is reserved; execution APIs and durable workers are not active                                                                                              |
| Shongre synchronization                                                 | Durable organization/subscription inbox, scheduled worker, Account/Contact projection and account intelligence read model implemented; other source events remain unconnected |

## Domain model

The aggregate graph is intentionally relational:

```text
Organization (tenant)
  -> CRM workspace
      -> teams + members
      -> accounts <-> contacts
      -> pipelines -> ordered stages -> opportunities <-> contacts
      -> tasks + immutable activities + notes + attachments
      -> products -> price books -> prices
      -> opportunities -> quotes -> quote line items
      -> custom fields + tags + saved views
      -> consents + duplicate decisions + external references
      -> workflows/runs + sequences/enrollments + data jobs
      -> immutable CRM audit events
```

Important invariants are enforced in both service and database layers:

- every owned row carries a `tenant_id` and relevant `workspace_id`;
- an opportunity stage must belong to the same pipeline and tenant;
- won/lost/open stages agree with opportunity status;
- state-changing requests use an expected `version` for optimistic concurrency;
- activities and audit events are append-only;
- quote and opportunity money is `{ amountMinor, currency }`, never floating
  point;
- custom field values remain extensions, not a replacement for core columns.

Account duplicate suggestions are resolved through
`POST /api/v1/crm/account-duplicates/check`. The PostgreSQL repository queries
only the active tenant and returns ranked, explainable exact signals; it never
ships the complete account dataset to the browser for matching. A suggestion is
not an automatic merge. Record consolidation still requires an explicit,
audited merge command and field-conflict policy before it can be enabled.

Saved views are backend-owned resources. Personal views can only be changed by
their owner; team/workspace/tenant visibility requires configuration authority,
and team views additionally require membership. The current Companies surface
applies saved account filters and persists the chosen sort/column definitions
for future table expansion. Migration `00057` removes direct authenticated
table access so the service remains the only authorization boundary.

Tags are not presentation-only arrays. Migration `00058` consolidates legacy
case variants, enforces tenant-local case-insensitive uniqueness, and provides a
bounded replacement function for Accounts, Contacts and Opportunities. The
PostgreSQL repository hydrates tags on list/detail reads and persists them on
entity writes; direct authenticated table mutation is revoked.

## Tenancy and RLS

The tenant is an existing Shongre organization. An authenticated principal is
resolved to an active organization membership; callers do not select an
arbitrary tenant ID in URLs or bodies. `crm_workspaces` provides a CRM-local
workspace inside that tenant.

Migration `00053_crm_platform.sql` enables and forces RLS on every CRM table.
`is_crm_tenant_member(tenant_id)` is the common deny-by-default predicate.
Database mode uses the server repository only after backend authorization; RLS
is a second boundary, not a substitute for application authorization. Platform
operators do not receive invisible cross-tenant access from a frontend role.

Provider ownership is separate and explicit:

- `USER`: visible/resolvable only for that user and only when tenant policy
  permits personal connections;
- `TENANT`: available to the tenant under capability and feature policy;
- `PLATFORM`: considered only when platform fallback is explicitly permitted.

## Permissions and authorization

Backend authorization is authoritative. The UI access registry improves the
experience but cannot grant access. CRM capabilities are granular across
accounts, contacts, pipelines, opportunities, tasks, activities, analytics,
products, quotes, custom fields, automation, email, AI, and configuration.

Commercial roles receive operational read/create/update capabilities. Destructive
actions, configuration, pipeline management, automations, templates, and
provider management require explicit elevated capabilities. AI and email must
pass both the CRM capability check and shared provider policy; neither can act
as a privilege bypass.

## OpenAPI workflow

All connected CRM traffic uses the OpenAPI 3.1 specification at
`backend/openapi/openapi.json`. Do not handwrite competing wire DTOs or routes.
Every operation declares security, `x-shongre-access`, and its required
capability. Generated artifacts are refreshed with:

```bash
make openapi-generate
make openapi-check
```

The generated endpoint inventory is
`backend/docs/generated/endpoint-inventory.md`. Frontend services may map those
wire types into presentation models, but UI components must not call the router,
database, or provider SDK directly.

## Shongre adapter and events

CRM references marketplace/vertical records through `crm_external_references`.
It stores the CRM entity, source system, external entity type and stable external
ID; it does not copy ownership of the external aggregate.

Migration `00056_crm_shongre_event_inbox.sql` implements the current production
sequence:

1. organization and selected canonical subscription writes enqueue an event in
   the same database transaction;
2. a tenant-aware worker claims the event idempotently;
3. the adapter maps only approved fields into a CRM command;
4. an atomic application function upserts only the approved Account/Contact
   projection fields plus immutable activity/audit evidence;
5. the external reference and processed event ID prevent duplicate projection.

The current worker runs through the existing scheduled-job coordinator and uses
leases, `FOR UPDATE SKIP LOCKED`, bounded exponential retries and dead letters.
Organization creation/update/verification and subscription
activation/change/cancellation/payment-failure are connected. Listings, leads,
messages and advertising remain enumerated but are deliberately dead-lettered
until their projection handlers and field-ownership rules exist.

`GET /api/v1/crm/accounts/:accountId/shongre` exposes an explicit read model for
the linked professional profile, listing summary and subscription. Missing
advertising, lead and marketplace-activity adapters return `not_connected`;
they never fabricate zero activity. Billing and listings remain canonical and
read-only from this boundary.

Direct CRM Core imports of marketplace repositories are forbidden. Before
connecting another source event, add its transactional publisher, payload
version, idempotent projector, replay/reconciliation tests, delete/privacy
mapping and explicit field ownership matrix.

## Automation and analytics

The automation model is `trigger -> conditions -> actions`. Relational tables
reserve workflows, runs, sequences, steps and enrollments. Execution remains
disabled until a durable worker provides tenant isolation, idempotency keys,
bounded retry, dead-letter state, per-action capability checks, loop prevention,
and immutable run evidence. The configuration page states this limitation
instead of simulating success.

Current dashboard/report metrics are operational views computed from canonical
CRM records. New metrics must define name, business meaning, time basis,
currency behavior, filters, ownership, and test fixture. Historical forecasting
or cohort analytics requires durable snapshots; do not infer history from the
current stage alone.

## Email and mailbox architecture

Mailbox and delivery providers are different capabilities:

- `MailboxGateway` owns user-mailbox send and thread synchronization;
- `EmailDeliveryGateway` owns transactional/batch delivery and delivery events.

The same delivery adapters must be reusable by Newsletter and Notifications.
There must never be CRM-specific copies such as `crm-brevo` or `crm-sendgrid`.
Provider selection is deterministic: explicit allowed connection, user default
when allowed, tenant default, explicitly entitled platform fallback, otherwise
unavailable. There is no silent Shongre-funded fallback.

Before any send, the application must validate user capability, tenant policy,
connection capability, `doNotContact`, communication channel, purpose, legal
basis where required, recipients, attachment policy, and idempotency key. Mailbox
sync must normalize provider message/thread IDs and claim them uniquely before
creating an activity.

## AI architecture

CRM AI uses only the shared `AiGateway`. Each request declares a named CRM task,
safe context, output schema, and token ceiling. Resolution checks connection
scope, tenant AI policy, feature allow-list, required capabilities, endpoint
policy, and credential availability. Usage evidence records tenant/user,
connection, feature, correlation ID, status, units and latency without prompts,
credentials, or sensitive response bodies.

AI output is advisory. It cannot mutate a record, send an email, change a stage,
or exceed the actor's capability without a normal application command and audit
event. Live OpenAI, Anthropic, and OpenAI-compatible adapters remain separate
provider-layer work; CRM domain code must never call those APIs directly.

## Credential and network security

`provider_connections.configuration` contains non-secret configuration only and
has a database check rejecting common secret keys. Credentials live in
`provider_credentials` as either an opaque secret-manager reference or an
authenticated encrypted envelope with key version; the table is revoked from
normal authenticated clients. Only status/hint metadata may cross the API.

Custom provider endpoints must be HTTPS, normalized, policy-approved, and pass
the shared SSRF guard. Redirects must be revalidated. Loopback, private, link
local, metadata, embedded credentials, non-standard schemes, and DNS rebinding
targets are rejected. Logs, audit payloads, usage events, and errors must never
contain credential or prompt contents.

## Compliance and privacy

CRM records may contain personal data. Data minimization, purpose limitation,
retention, access/export/anonymization, legal hold, consent evidence, and
do-not-contact handling are domain requirements. `crm_consents` records channel,
purpose, source and timestamps. Data jobs reserve privacy export and
anonymization, but those operations are not production-ready until worker,
authorization, redaction, attachment handling, retention, and audit tests exist.

AI/provider egress requires an approved data classification. Internal risk,
fraud, moderation, credential, private KYC/KYB, payment, and unrelated tenant
data must not enter prompts or emails.

## Demo mode

Demo CRM and provider adapters are deterministic, asynchronous, clearly marked,
and make no external calls. They exercise the same public service contracts as
connected mode. Demo data is not a production persistence mechanism.

`NEXT_PUBLIC_DATA_MODE=demo` keeps the frontend standalone.
`BACKEND_DATA_MODE=demo` selects deterministic repositories. A production
configuration must reject demo providers and must never silently fall back from
database/API/provider failure to demo.

## Future SaaS extraction

The CRM can be extracted only if scale, isolation, or commercial ownership
justifies it. The extraction seam is the OpenAPI/event/Provider Platform
boundary—not database-table imports. Preserve tenant IDs, stable public IDs,
idempotency keys, version semantics, audit correlation IDs, normalized external
references, and provider connection ownership so a future service can migrate
without changing CRM UI contracts.

An extraction must keep the shared Provider Platform shared. It must not fork
AI, mailbox, delivery, credential, health, routing, usage, or webhook stacks.

## Verification and developer workflow

Use the canonical repository commands:

```bash
make crm-check
make openapi-check
make migrations-check
make providers-check
make typecheck
```

`make crm-check` is the focused, connection-free CRM contract/service/security
gate. Database integration, provider sandbox certification, durable-worker tests,
and browser E2E are additional release gates when their corresponding feature
is implemented.
