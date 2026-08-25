# Shongre Provider & Integration Platform

Last audited: 2026-08-25

## Purpose and source of truth

The provider control plane separates vendor catalogue metadata from runtime
truth. Static ownership is defined once in
`packages/contracts/src/provider-platform.ts`. The backend adds environment
configuration and live evidence; the admin UI reads the same definition.

The following are never sufficient to mark a provider active or healthy:

- an admin card;
- an environment-variable name;
- an installed SDK;
- a demo response;
- a successful configuration parse.

`ACTIVE` requires a production adapter, complete configuration, all advertised
capabilities implemented, a non-demo environment, and current live/runtime
health evidence. Provider health cannot be edited manually.

## Audited implementation inventory

| Domain                            | Actual runtime owner                     | Code state           | Production conclusion                                                                                            |
| --------------------------------- | ---------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Email/password auth and sessions  | Shongre auth services                    | Implemented          | Internal service exists; email delivery is a separate dependency.                                                |
| Google OAuth                      | OAuth provider client                    | Implemented          | Requires environment configuration and E2E evidence.                                                             |
| Apple OAuth                       | OAuth provider client                    | Implemented          | Account-change server notifications remain missing.                                                              |
| Facebook OAuth/data deletion      | OAuth client and deletion service        | Implemented          | Requires app review/configuration and E2E evidence.                                                              |
| Checkout/refunds/subscriptions    | Stripe Checkout adapter                  | Implemented subset   | Safe idempotent Checkout exists. Connect, seller accounts, transfers, payouts and payment KYC do not.            |
| Marketplace funds/payouts         | None                                     | Missing P0           | Protected marketplace transactions must stay disabled; never call Checkout “escrow.”                             |
| Individual KYC                    | Deterministic demo provider              | Demo only            | Selected live adapter fails closed.                                                                              |
| French business registry          | Deterministic demo provider              | Demo only            | Selected SIRET adapter fails closed.                                                                             |
| Relay/home/express/bulky shipping | Frontend deterministic quotes            | Demo only            | No carrier API, label, tracking webhook or reconciliation.                                                       |
| Transactional email               | Vendor-neutral authenticated HTTP sender | Implemented boundary | Vendor identity, bounce/delivery webhook and live evidence are missing. Resend/Brevo are catalogue entries only. |
| Phone OTP/SMS                     | None                                     | Missing P1           | Twilio is a catalogue entry only.                                                                                |
| In-app notifications              | Shongre notification service             | Implemented          | Push delivery (APNS/FCM/Web Push) is not implemented.                                                            |
| Marketplace search                | PostgreSQL/Supabase search provider      | Implemented          | Meilisearch is intentionally not needed now.                                                                     |
| Media/private documents           | Supabase Storage adapter                 | Implemented          | Deployment bucket/RLS health evidence remains environment-specific.                                              |
| Maps                              | Leaflet with external OSM/Carto tiles    | Partial              | Display exists; backend BAN geocoding/autocomplete/caching is missing.                                           |
| AI moderation/assistance          | Deterministic demo provider              | Demo only            | Gemini selection fails closed; OpenAI/Tavily have no adapter.                                                    |
| Analytics                         | None                                     | Optional missing     | Consent gate exists first; Plausible is not installed.                                                           |
| Error tracking                    | Structured logs only                     | P1 gap               | Sentry is a catalogue entry only.                                                                                |
| CAPTCHA                           | Rate limits only                         | P1 gap               | Turnstile is a catalogue entry only.                                                                             |
| Electronic invoicing              | Internal finance domain only             | P2 gap               | Pennylane is a catalogue entry only.                                                                             |

The complete vendor inventory and the capability requirement matrix are
executable data in `@shongre/contracts/provider-platform`, with unit tests for
unique ownership and demo/production separation.

## Current P0/P1 gaps

| Priority | Capability                             | Risk                                                   | Required next gate                                                                                                                                                |
| -------- | -------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Marketplace payment and seller payouts | Funds cannot be split or paid to sellers safely.       | Select the regulated funds-flow model, complete legal/MoR analysis, implement Stripe Connect or MANGOPAY end-to-end, and certify sandbox webhooks/reconciliation. |
| P0       | Transactional email observability      | Verification/recovery delivery cannot be proven.       | Select one delivery vendor behind the existing HTTP contract; implement delivery/bounce events, retry/DLQ and smoke test.                                         |
| P0       | Contextual KYC/payment KYC             | Regulated actions cannot complete.                     | Select a provider based on payment architecture and territories; implement sessions, signed webhooks and manual-review fallback.                                  |
| P0       | French KYB                             | Pro onboarding relies on demo/manual review.           | Implement the official business data source adapter, rate limiting and audit mapping.                                                                             |
| P0       | Carrier delivery                       | Quotes/labels/tracking are simulations.                | Implement a carrier-neutral shipping contract, one FR primary carrier, signed events where available and reconciliation.                                          |
| P1       | Durable provider queue                 | Process-local `setImmediate` jobs are lost on restart. | Back jobs with PostgreSQL/Supabase Queue, attempts, visibility timeout and dead-letter state.                                                                     |
| P1       | Provider evidence persistence          | Diagnostics currently survive only in process.         | Apply migration `00032`, persist control-plane configuration/evidence through a service-role repository, and add retention.                                       |
| P1       | Error/availability alerts              | Structured logs do not provide alert routing.          | Choose an observability sink, add redaction, sampling, alert ownership and runbooks.                                                                              |

No vendor should be purchased merely to make this table green. Existing
internal owners (PostgreSQL search, Supabase Storage, in-app notifications and
Shongre auth) remain preferred until requirements justify replacement.

## Runtime API and permissions

- `GET /api/v1/admin/providers/control-plane` requires `provider.read`.
- `POST /api/v1/admin/providers/:providerId/test` requires `provider.test`.
- Credential values are never returned. Draft tenant/personal connections are
  created through `POST /api/v1/provider-connections`; credential install or
  rotation uses `PUT /api/v1/provider-connections/:id/credential` and always
  returns the connection to `DRAFT` pending validation.
- The snapshot exposes only booleans, safe status messages and expiry metadata.
- Stripe diagnostics use `GET /v1/balance`; they never create or move funds.
- A provider without a registered non-destructive probe returns “unsupported,”
  not a simulated success.

The database migration reserves separate RLS-denied tables for configuration,
routing, append-only health evidence, diagnostics, webhook metadata, hashed
provider events, circuit state, reconciliation, and immutable audit events.
Connection credentials are separate RLS-denied rows containing either opaque
secret-manager references or AES-256-GCM envelopes. The active encryption key
and key version remain server-side configuration.

## Tenant and user connections

Migration `00052_provider_connections.sql` extends the control plane with one
shared connection model for CRM, Newsletter, Notifications and future
consumers. `ProviderConnection` carries ownership (`PLATFORM`, `TENANT` or
`USER`), family, non-secret configuration, exact capabilities, lifecycle and
optimistic version. It never returns credential material.

Credentials are separate rows. They contain either an opaque secret-manager
reference or an authenticated encrypted envelope with IV, tag and key version.
Normal authenticated database roles cannot read the credential table. Rotation
creates/replaces an active credential version and preserves safe audit evidence;
it never copies a raw secret into connection configuration, usage, logs or API
responses.

Creation and credential installation deliberately remain two fail-closed
operations: if encryption or rotation fails, the connection is still an
unusable `DRAFT`. Production key-version changes require rotating every active
credential; envelopes written under an unavailable key version are rejected
instead of being decrypted with a guessed key.

Resolution is capability- and feature-driven. It checks tenant policy, personal
connection permission, feature allow-list, owner visibility, explicit selection,
default priority and active credential. A platform connection is considered only
when fallback is explicitly permitted. No consumer can silently spend a
Shongre-funded provider account.

`USER` rows are never visible to another user. Calling the list service without
a user identity excludes all personal rows. This rule must retain its regression
test because a tenant-wide list that includes personal mailboxes or BYOK
connections is a credential-metadata privacy breach even when secret values are
hidden.

CRM-specific integration guidance is in
[`crm-platform.md`](crm-platform.md). CRM, Newsletter and Notifications consume
the shared `AiGateway`, `MailboxGateway` and `EmailDeliveryGateway`; none may
create a vendor-specific duplicate adapter.

## Routing and resilience rules

1. Resolve by capability and market, not vendor name.
2. A candidate must implement that exact capability.
3. Demo-only capabilities may run only in demo and are reported as `DEMO`.
4. Fallback must be capability-compatible, configured, enabled, independently
   tested and currently healthy. Merely being second priority is insufficient.
5. Financial writes require idempotency keys. The Stripe adapter uses the shared
   provider execution guard, bounded retry, timeout and circuit breaking.
6. Retry only transient failures; never retry validation or permanent provider
   rejection as though it were a network failure.
7. Provider webhooks require raw-body signature verification, replay tolerance,
   event ID uniqueness, async processing, bounded retries and dead-letter state.
8. Provider state is reconciled for financial and other critical operations;
   webhooks are signals, not the sole source of truth.

## Graceful degradation

- Payment/marketplace payout unavailable: block the regulated transaction,
  preserve the order draft, and show finance an action-required state.
- KYC unavailable: block only the regulated action and preserve user progress.
- KYB unavailable: move to explicit manual-review pending; do not auto-verify.
- Shipping unavailable: remove unverified quotes and retain local pickup where
  valid.
- AI unavailable: retain the complete manual listing/moderation journey.
- Maps unavailable: retain text location and list search.
- Analytics unavailable: core product behavior remains unaffected.

## Environment and secrets

- Demo, sandbox and production evidence never mix.
- Demo adapters cannot create `PRODUCTION_READY`, `ACTIVE` or `HEALTHY` state.
- Server keys remain in backend environment/secret management; never expose
  service-role, Stripe secret, OAuth client secret or webhook secret to clients.
- Rotate by installing a new secret version, accepting overlapping webhook
  secrets for a bounded window, verifying it, then retiring the old version.
- Production startup validation remains fail-closed for mandatory platform
  secrets. Provider enablement must also fail closed when its own configuration
  is incomplete.

## Adding a provider

1. Add the capability only if no existing internal/provider owner meets it.
2. Add one operational definition and capability owner in the contracts
   package; do not add a second frontend-only registry.
3. Implement a narrow backend adapter interface in `backend/src/integrations`.
4. Define markets, currencies, data residency, retention and graceful
   degradation.
5. Add configuration validation without secret values in database/UI.
6. Implement a non-destructive health probe and redact all diagnostics.
7. Add idempotency, timeouts, retry classification and circuit breaking.
8. For webhooks, verify signatures against raw bytes before claiming the unique
   event and enqueueing work.
9. Add contract, unit, sandbox integration and failure-path tests.
10. Promote lifecycle only as evidence is recorded: `IMPLEMENTED` →
    `SANDBOX_VALIDATED` → `PRODUCTION_READY` → `ACTIVE`.

## Official references verified during this audit

- Stripe API changelog/version: <https://docs.stripe.com/changelog>
- Stripe Connect marketplaces: <https://docs.stripe.com/connect>
- Stripe connected-account payouts: <https://docs.stripe.com/connect/payouts-connected-accounts>
- Stripe idempotency: <https://docs.stripe.com/api/idempotent_requests>
- Stripe webhook security/retries: <https://docs.stripe.com/webhooks>
- Google OpenID Connect: <https://developers.google.com/identity/openid-connect/openid-connect>
- Sign in with Apple REST API: <https://developer.apple.com/documentation/signinwithapplerestapi>
- French business search API: <https://recherche-entreprises.api.gouv.fr/docs/>
- French geographic/address APIs: <https://geo.api.gouv.fr/>
- Supabase PostgreSQL full-text search: <https://supabase.com/docs/guides/database/full-text-search>
- Supabase Storage and signed URLs: <https://supabase.com/docs/guides/storage>

Provider terms, supported countries, pricing and production approval remain
time-sensitive procurement/compliance checks. They must be revalidated before
selecting a missing P0 provider.
