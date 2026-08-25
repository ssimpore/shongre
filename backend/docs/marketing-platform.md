# Shongre Marketing platform

Shongre Marketing is a bounded domain inside the existing TypeScript modular monolith. It owns newsletter profiles, consent projections, lists, dynamic segments, templates, campaigns, suppressions, delivery recipients/events, action tokens, conversions, journeys, outgoing webhooks, analytics, and dispatch jobs. CRM may link a contact to a marketing profile through explicit shared repository contracts; neither domain imports the other domain’s implementation.

## Runtime boundaries

```text
Admin UI / public newsletter forms
  -> frontend MarketingServiceContract
  -> demo adapter OR generated OpenAPI HTTP adapter
  -> MarketingService
  -> MarketingRepository
  -> PostgreSQL / Supabase

MarketingService / campaign worker
  -> ProviderConnectionService
  -> shared EmailDeliveryGateway or AiGateway
  -> configured tenant provider

Marketing events
  -> shared versioned automation runtime
  -> persisted execution / wait / retry state
  -> email, list, profile, CRM, webhook, or advisory AI action
```

There is no newsletter-specific credential store, provider catalogue, AI client, email client, or health subsystem. Credentials remain encrypted behind the shared Provider Platform. Production adapters fail closed when a live provider capability is unavailable; demo adapters are asynchronous, deterministic, and make no external calls.

## Consent and suppression

`communication_consents` is an append-only purpose/channel ledger. Marketing consent, transactional messages, CRM correspondence, security, and system delivery are distinct purposes. Withdrawing marketing consent adds an active `marketing_suppressions` record and changes the profile lifecycle; it does not disable transactional or security messages.

Public confirmation, preference, and unsubscribe actions use random 256-bit tokens. Only SHA-256 hashes are persisted, tokens expire, confirmation is single-use, and unsubscribe is idempotent. Optional marketing consent is explicit and unchecked by default. A double-opt-in workspace keeps profiles `PENDING` until the signed confirmation action succeeds.

## Campaign safety

Before scheduling or sending, preflight verifies provider health, a verified sender, subject/content, a legal unsubscribe block, generated plain text, a non-empty eligible audience, and campaign lifecycle. Audience selection is backend-owned and snapshots every selected profile with an eligibility or exclusion reason. Unsubscribed, suppressed, bounced, complained, invalid, pending, do-not-contact, duplicate, explicitly excluded, and frequency-capped profiles cannot be sent.

The worker claims jobs with `FOR UPDATE SKIP LOCKED`, atomically reserves the monthly entitlement quota, sends bounded batches, generates scoped preference/unsubscribe links, uses deterministic per-recipient idempotency keys, records provider-neutral events, retries with bounded backoff, and dead-letters terminal failures. First-party open/click tracking is workspace-controlled, uses opaque expiring tokens, stores click targets server-side, and never accepts a redirect target from the request. Provider webhooks are signed, replay-protected, size-bounded, normalized, and linked to campaign or journey messages; raw webhook payloads and credentials are not stored in public/audit DTOs.

## Journeys, experiments, analytics, and webhooks

The shared automation graph rejects missing edges, duplicate nodes, cycles, unreachable ends, and excessive depth before activation. Runtime state and waits are database-backed. Supported nodes cover conditions/branches, waits, email, list membership, tags, allowlisted custom fields, CRM tasks/activities, queued webhooks, advisory AI, and end. Suppression, consent, do-not-contact, and frequency caps are checked again immediately before every automated email.

Campaign variants are assigned deterministically, measured independently, and select a winner by open, click, or conversion rate. Automatic experiments keep their job scheduled until the measurement window ends; manual experiments use the same idempotent winner endpoint. Open metrics are explicitly advisory because privacy protections may inflate them.

Outgoing tenant webhooks expose a one-time signing secret, stored with AES-256-GCM. Delivery uses HMAC-SHA256, SSRF-safe HTTPS resolution on every hop, bounded payloads/timeouts, exponential retries, and a dead-letter terminal state. Conversion ingestion is tenant-scoped, entitlement-gated, idempotent, and accepts money only as integer minor units plus an ISO currency.

## Providers and entitlements

The production runtime has shared Provider Platform adapters for Resend, Brevo, SendGrid, Mailjet, Mailgun, and Postmark, plus OpenAI, Anthropic, and OpenAI-compatible AI endpoints. SMTP and Amazon SES remain catalogued as planned capabilities and fail closed until their adapters are certified. Provider credentials are tenant-owned encrypted connections; demo mode never contacts them.

Marketing features resolve `marketing.*` entitlements through the canonical monetization tables. Contact/list/segment limits, templates, automation, A/B testing, analytics, API/conversions, webhooks, AI, and monthly sends are enforced in backend services or atomic database quota operations rather than hidden UI checks.

## Developer workflow

Run `make marketing-check` for contracts, focused backend/frontend tests, RLS invariants, shared provider coverage, and OpenAPI drift. The canonical schema is `backend/openapi/openapi.json`; regenerate clients with `npm run openapi:generate`. Core storage is introduced by `00059_marketing_platform.sql`; automation, attribution, tracking, webhooks, and atomic quota reservation are introduced by `00060_marketing_automation_analytics.sql`.

Live provider delivery requires a verified sender identity, tenant-owned active Provider Connection with `email.marketing`, and valid encrypted credentials. AI drafting additionally requires `ai.marketing_drafting`. These are release-gated configuration requirements, not silent demo fallbacks.
