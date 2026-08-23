# Unified catalog and discovery

Shongre uses one listing catalog for private sellers and professional organizations. A professional team member is the publishing actor; the organization is the effective owner. `seller_id` remains during the compatibility window, while the canonical resolver reads `publisher_*` fields.

## Organic policy

`@shongre/shared` owns the deterministic ranking engine used by the backend and the frontend demo adapter. Organic score contains text/category relevance, location, quality, genuine freshness, trust, price plausibility, and optional personalization. It cannot read publisher type, subscription plan, subscription price, promotion credits, or advertising spend.

Paid candidates are retrieved separately, must be relevant and active, and are inserted under configured position/share/seller caps. Every inserted placement has a label and an impression ID. `organic_freshness_at` is never changed by promotion activation.

## Migration

Migration `00018_unified_catalog_discovery.sql` uses expand/backfill:

1. Add organizations, memberships, branches, canonical publisher fields, timestamps and duplicate keys.
2. Backfill ownership without removing legacy fields or URLs.
3. Convert valid legacy boosts into explicit `admin_grant` promotion evidence.
4. Add versioned discovery configuration, promotion policy, analytics and review tables.
5. Add integrity, payment-state and ownership-audit triggers.
6. Add organic, publisher, duplicate and promotion indexes.

Run before and after rollout:

```bash
npm run db:dry-run:unified-discovery --workspace=backend
```

Expected blocking counts are `ambiguousOwnership = 0`, `invalidOrganizations = 0`, and `orphanedListings = 0`. Review likely duplicates; never delete them automatically.

## Rollback

Application rollback is safe while legacy columns remain: deploy the prior application version and stop writing `publisher_*`/`listing_promotions`. Do not drop the new tables during an incident. After recovery, archive the active discovery configuration and restore the previously active version. A structural down migration is intentionally not automatic because ownership audit, payment evidence and impression data are append-only evidence.

## Operations

- Effective configuration: `GET /api/v1/admin/discovery/configuration`.
- Validated draft: `POST /api/v1/admin/discovery/configuration/drafts`.
- Audited activation: `POST /api/v1/admin/discovery/configuration/publish`.
- Score explanation: `POST /api/v1/admin/discovery/explain`.
- Privacy-safe dashboard data: `GET /api/v1/admin/discovery/metrics`.
- Publication preview: `POST /api/v1/publication/entitlements`.
- Search events are privacy-safe and contain filter keys/counts, not private messages or raw personal content.
- Refunded, failed and cancelled orders revoke their promotions through the order-status trigger.
