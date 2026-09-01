# Digital products

## Status and safety boundary

Shongre models digital fulfillment independently from taxonomy. The canonical
taxonomy contains the market-aware `digital_products` branch for discovery and
publication flows, while listings, orders, and entitlements carry explicit
fulfillment types:

- `FILE_DOWNLOAD`
- `ACCESS_LINK`
- `ACCESS_CREDENTIALS`
- `SELLER_PROVISIONED`
- `PHYSICAL` for existing physical listings

A category name, slug, or identifier never activates digital behavior. The
backend evaluates the exact requested fulfillment combination against one
versioned market policy and fails closed when the required category, seller,
verification, moderation, commercial, legal, tax, withdrawal, refund, or
provider evidence is absent.

The generated taxonomy makes the branch discoverable in the active FR, BE, and
CH marketplace contexts. SN and BF remain coming-soon, marketplace-disabled,
and non-indexable. The initial production database policies for every market are
deliberately `DISABLED`: taxonomy availability is not permission to publish,
checkout, or deliver. Staff must create and activate a complete evidence-backed
policy before production capabilities become available.

## Seller journey

Web and mobile sellers can accept the current market policy for physical,
downloadable, link, credential, seller-provisioned, or explicitly allowed
combined fulfillment. Acceptance is versioned per seller and market. An existing
seller is asked again only when the activated policy marks the prior acceptance
as stale.

Digital publication collects the product version, buyer-facing delivery
description, compatibility, requirements, access class, optional public terms,
limits, and the fields required by the selected fulfillment type. Private files
are uploaded through an initialized private upload, processed through the
storage/scanning boundary, and linked by immutable asset version. Raw secret
links and credentials are encrypted immediately and referenced by opaque secret
version IDs. Unique credential imports create encrypted inventory batches; only
availability counts are projected back to sellers.

Publication refuses assets that are not ready and clean, unapproved link or
credential classes, unsupported fulfillment combinations, insufficient unique
inventory, incomplete moderation, stale seller acceptance, and missing market
policy evidence. Physical listings retain their existing shipping, pickup,
address, inventory, and logistics behavior; digital-only listings omit those
fields.

For `SELLER_PROVISIONED`, confirmed payment creates a durable provisioning task.
The seller can see only their market-scoped tasks and submit the class of access
captured by the purchased fulfillment version. The seller cannot change payment
or entitlement state. Scheduled lifecycle work sends secret-free reminders,
escalates missed deadlines, expires entitlements, and revokes stale access
grants.

## Buyer journey

“Mes achats numériques” on Web and mobile presents payment confirmation,
processing, provisioning, available, delivered, invalid, quarantined, expired,
limit, refund, dispute, unavailable, and revoked states. The action follows the
fulfillment type: download a private file, open a protected link, reveal masked
credentials, or wait for provisioning.

Before access, the backend authenticates the principal, resolves the buyer-owned
market-scoped entitlement, rechecks payment and lifecycle state, validates the
exact asset or secret evidence, enforces limits under a database row lock,
records privacy-safe audit evidence, and issues a short-lived scoped grant.
Grant consumption revalidates the entitlement and asset state. Private files are
served through short-lived storage downloads with safe filenames and attachment
headers; application memory does not proxy the file. Protected destinations and
credential fields are decrypted only in the narrow fulfillment service, masked
by default, and revealed only after an authorized grant. External-link UI shows
the destination domain before leaving Shongre without placing secret parameters
in browser history or metadata.

Payment redirects and client success state never create access. Entitlements are
created idempotently only from the authoritative paid order and exact payment
intent. Refunds, reversals, and disputes serialize with access decisions and use
the purchased policy snapshot to suspend, revoke, or preserve access. Listing or
asset edits create new versions and cannot silently alter an earlier purchase.

## Persistence and concurrency

Migrations `00089_digital_delivery_type.sql` through
`00092_digital_fulfillment_workers.sql` add the explicit listing delivery type,
market policies and seller acceptance, private asset versions, encrypted secret
versions, credential batches and items, fulfillment versions, immutable digital
order evidence, entitlements, credential assignments, provisioning tasks,
single-use access grants, privacy-safe audit/report evidence, and the durable
outbox.

Database functions own the critical concurrency boundaries:

- unique credentials use `FOR UPDATE SKIP LOCKED` plus unique order-item and
  credential assignments;
- paid entitlement creation locks and validates the authoritative order/payment
  evidence and is idempotent by order item and outbox key;
- grant issuance, reveal accounting, and grant consumption lock the entitlement
  and enforce limits;
- refund/dispute/reversal transitions and seller provisioning serialize against
  access decisions;
- upload initialization serializes per listing and applies policy count and byte
  limits atomically;
- outbox claim/completion and lifecycle functions provide durable retries rather
  than process-memory timers.

All digital tables enable RLS and remove browser roles. The service role reaches
them only through backend repositories and narrowly granted functions. Public
contracts exclude encrypted payloads, raw credentials, storage keys, permanent
URLs, internal provider errors, and moderation internals.

## Secret, link, file, and notification controls

Access payloads use authenticated AES-256-GCM envelopes with a configured key
identifier and a privacy-safe fingerprint. Values are never logged. Access URLs
must be HTTPS, match the policy allowlist and optional display domain, contain no
userinfo, and avoid loopback, private, link-local, metadata-service, and unsafe
resolved destinations. Any future server fetcher must repeat DNS and redirect
checks immediately before each connection.

The storage adapter validates extension, declared MIME type, detected content,
size, count, listing ownership, replacement history, and asset state. Scanner
absence is an explicit policy failure; a file is never represented as scanned
without a configured scanner result. Historical assets referenced by published
fulfillment or entitlements cannot be removed.

Upload completion atomically records a privacy-safe scan event in the durable
digital fulfillment outbox. The scheduled worker validates the staged bytes,
performs the configured malware scan, copies clean content to the private
bucket, and retries transient scanner or storage failures without relying on a
request process or a client timer.

Email and push outbox payloads contain only safe event identifiers and direct the
user to the authenticated Shongre purchase page. Credentials, license keys,
secret URLs, filenames, storage keys, and raw request bodies are excluded from
notifications, analytics, ordinary logs, reports, and client persistence.

## API and application surfaces

The canonical OpenAPI document defines policy and seller-profile reads,
provisioning-task reads, private upload initialization/completion/status/removal,
protected-access and credential inventory writes, fulfillment version creation,
buyer entitlement reads, download/reveal grant issuance and consumption,
seller provisioning, access reports, and staff policy/moderation/resolution
operations. Every operation has explicit security, access metadata, permission,
stable error, and Staff marketplace treatment. The router always derives the
actor from the verified principal and returns not-found for another account’s
resource.

Web routes are `/compte/achats-numeriques`,
`/compte/produits-numeriques`, and `/admin/produits-numeriques`; mobile exposes
the matching account purchase and seller screens. Listing publication, cards,
details, checkout, transactions, account navigation, seller workspace, and
administration consume the lazy `digitalProducts` service domain. Demo adapters
remain deterministic and clearly simulated, with state partitioned by account
and market.

## Activation checklist

Production activation is a governance action, not a code default. Each market
must provide approved category and fulfillment combinations, seller eligibility
and verification, moderation/scanning behavior, file rules, accepted link
domains, credential classes, deadlines and limits, commercial-catalog evidence,
currency and pricing, tax policy, refund and withdrawal presentation, and an
environment-plus-market payment-provider mapping. Provider-generated credentials
also require an approved provider adapter; the backend refuses to enable that
mode without one.
