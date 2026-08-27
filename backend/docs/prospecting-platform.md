# Shongre Prospects — backend architecture

## Scope and reuse map

Shongre Prospects extends the modular CRM monolith. It does not introduce a
second identity, organization, workspace, billing, entitlement, campaign,
suppression, notification, audit, analytics, or provider system.

| Capability             | Reused authority                                                               | Prospecting extension                                                         |
| ---------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Identity and tenancy   | Auth, `organizations`, memberships, CRM tenant context                         | Tenant-scoped profiles, discoveries, evidence, scores and usage               |
| Companies and pipeline | CRM accounts, contacts, opportunities, tasks and activities                    | Reviewed candidate import, provenance and conversion attribution              |
| Outreach               | Marketing profiles, lists, campaigns, approval, sender domains and suppression | Prospect lists and evidence-bound draft context; Marketing remains the sender |
| AI                     | Provider Platform connections, policy routing, usage and audit                 | `prospecting.opportunity_brief` with deterministic rules fallback             |
| Commercial access      | Monetization products, subscriptions, entitlements and active grants           | `prospecting.*` entitlement dimensions and usage ledger                       |
| Markets                | Canonical country/market configuration                                         | Explicit market, country, locale, currency and timezone on operations         |

## Country scope

- `crm_prospect_source_catalog`: `PLATFORM_GLOBAL`; activation is explicit in
  `crm_prospect_source_markets`.
- ICP profiles and lists: `MULTI_MARKET_SHARED` through relational market links.
- Discovery runs, candidates, evidence, scores, AI insights, usage and
  attribution: `MARKET_SCOPED`.
- No operation infers a market from the database session or defaults silently.

## Request flow

```text
authenticated principal
  -> capability check
  -> existing CRM tenant resolution
  -> market validation
  -> active monetization entitlement resolution
  -> source eligibility and approval check
  -> source adapter contract
  -> tenant-scoped normalization/deduplication
  -> immutable evidence + explainable score
  -> human review
  -> idempotent import into existing CRM account model
```

The canonical public contract is in `backend/openapi/openapi.json`. The frontend
remains demo-first by default; explicit API mode uses the completed HTTP adapter
for these routes and never silently falls back to demo.

## Source and compliance matrix

| Source contract                | Current state          | Context                           | Personal contact storage                 | Production prerequisite                                        |
| ------------------------------ | ---------------------- | --------------------------------- | ---------------------------------------- | -------------------------------------------------------------- |
| Manual entry                   | Active local operation | Subscriber, internal              | Allowed when supplied lawfully by tenant | Tenant purpose and provenance                                  |
| CSV/table import               | Active local contract  | Subscriber, internal              | Allowed when supplied lawfully by tenant | Malware scanning, row validation and formula neutralization    |
| Deterministic demo registry    | Demo runtime only      | Subscriber, internal              | No                                       | Never a production source                                      |
| Official registry adapter      | Inactive               | Subscriber, internal              | No by default                            | Named provider, license, market legal and commercial approvals |
| Public company website         | Inactive               | Subscriber, internal              | No by default                            | Terms/robots review, bounded crawler and deletion workflow     |
| Shongre first-party            | Inactive               | Explicit internal permission only | No private marketplace data              | Internal purpose, legal approval and first-party capability    |
| Aggregated opportunity signals | Inactive               | Internal/aggregated only          | No identities                            | Certified aggregation and anti-reidentification thresholds     |

External subscribers never receive private Shongre user data. Source catalog
tables are revoked from browser roles; the backend returns only the approved,
market-filtered public definition.

## Explainable AI

The AI task receives a minimal safe context containing company name, sector,
stored evidence excerpts and the rule-based next action. Evidence is explicitly
treated as untrusted data, not instructions. The output schema accepts only a
summary. Known facts, evidence references, score, confidence, missing
information and the recommended action remain server-constructed.

Every brief is persisted in `crm_prospect_ai_insights` with tenant, candidate,
market, provider connection, provider, model, prompt version, rule version,
confidence, evidence IDs, usage units, correlation ID and status. If provider
routing, quota, validation or the network fails, the deterministic rules brief
is returned and stored as `RULE_FALLBACK`.

## Entitlement keys

Production fails closed unless active grants provide `prospecting.enabled` and
the relevant limits. Supported keys are:

- `prospecting.accessMode`, `prospecting.planName`;
- `prospecting.maxProspectRecords`, `monthlyDiscoveries`,
  `monthlyEnrichments`, `monthlyAiCredits`, `monthlyOutreach`;
- `prospecting.seats`, `savedLists`, `activeCampaigns`,
  `sourceIntegrations`;
- `prospecting.advancedFilters`, `exports`, `apiAccess`, `webhooks`;
- `prospecting.analyticsLevel`, `retentionDays`, `auditRetentionDays`;
- `prospecting.customAiTemplates`, `shongreConversionTools`;
- `prospecting.internalFirstPartyAccess` (staff plus explicit capability only).

The demo configuration is intentionally code-owned and deterministic. It is
not a production price list. Final offers and amounts must be published through
the existing monetization catalog and certified per market.

## Security and privacy controls

- RLS and forced RLS on every tenant table; deny-by-default browser access.
- Tenant-derived candidate and evidence UUIDs prevent cross-tenant ID collision.
- Immutable evidence, scores, AI insights, attribution and usage history.
- Evidence-bound review before import; idempotency keys for discovery, import
  and usage.
- Official identifiers, normalized domains and source fingerprints support
  deduplication without discarding provenance.
- Source-specific retention/deletion metadata and market approval status.
- No connector credentials, raw prompts, private marketplace behavior, secret
  tokens or internal risk scores in public contracts.
- Existing Marketing suppression and approval remain authoritative before send.

## Production activation checklist

Before enabling a real source or sender: execute provider and market due
diligence; publish legal/commercial approvals; configure the provider through
Provider Platform; add health/rate-limit/deletion handling; verify DPA and
retention; seed monetization entitlements; run RLS/contract/load/security tests;
and obtain explicit authorization to switch the frontend HTTP adapter on.

No official registry, crawler, enrichment provider, email sender, payment
provider, or production AI route is activated by this implementation.

The public access mode is explicit and uses the same CRM implementation:
`STANDALONE`, `SHONGRE_CONNECTED`, or `INTERNAL_SHONGRE`. Legacy commercial
catalogue values are normalized at the entitlement boundary and never branch
the CRM data model or frontend feature implementation.

External professional identities resolve the existing commercial CRM and
Marketing editor capabilities needed by this shared product surface. They do
not receive Marketing approval, CRM platform configuration, administration, or
`crm.prospecting.internal_first_party`; those remain explicit organization or
staff grants. Quota, source, subscription and retention decisions still come
from active backend entitlements rather than from the coarse account type.
