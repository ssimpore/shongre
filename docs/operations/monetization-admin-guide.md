# Monetization administration guide

## Roles

- Commercial operators with `commercial_rules.edit` create drafts and run simulations.
- Finance/approvers with `commercial_rules.approve` review the diff, tax/fee impact, affected consumers, and conflicts.
- Release owners with `commercial_rules.publish` publish or prepare a rollback.
- Auditors with `commercial_rules.read` and `monetization.orders.read` can inspect versions, quotes/orders, and audit history without editing.

The same person must not create and approve a version.

## Safe change procedure

1. Open **Admin → Business & Monétisation** and confirm the catalog is **À jour**. Do not publish while **Secours actif** is displayed.
2. Select the market and the product or rule.
3. Use **Pourquoi ce résultat ?** to simulate representative account, category, channel, verification, plan, and usage contexts.
4. Create a draft. Enter the price in minor units, an operational reason of at least eight characters, and an optional timezone-aware activation date.
5. Review the version diff and every blocking conflict. Check all `sourceConsumers`, especially generic publication, Auto, Education, Immo, transaction checkout, Pro workspace, and mobile.
6. Submit for approval. The approver verifies scope, currency, VAT, duration, trials, entitlements, stacking, start/end dates, and customer-facing copy.
7. Approve with a reason. Publish immediately only inside the agreed window; otherwise set an effective date and schedule it.
8. After publication, run catalog, evaluator, quote, and checkout smoke tests. Compare a new quote to the expected version id. Existing quotes and paid orders must retain the previous snapshot.

## Promotion checklist

- Code is unique within the version and normalized to uppercase.
- Start is before end; both are timezone-aware.
- Product and audience scopes are explicit.
- Fixed discounts cannot exceed the line subtotal.
- Percentage discounts use basis points.
- Stacking is explicitly `exclusive`, `best_only`, or `stackable`.
- Global and per-account redemption limits are set where needed.
- Draft promotions never apply to quotes.

## Rollback

Rollback creates a new draft from a previous known-good snapshot; it never changes the archived source, mutates paid orders, or erases audit evidence. Submit, approve, and publish that new version through the four-eyes workflow. The PostgreSQL publish function archives the current active version and activates the approved target under a transaction lock.

Do not delete current or historical product identities. Disable them in a new version. Do not edit quote/order snapshot JSON. For database rollback of migration 00015, first stop new quote creation, export the new tables, restore legacy readers, then remove schema objects in reverse dependency order. The migration is intentionally expand-only and includes no automatic destructive down migration.

## Incident response

- **Catalog stale:** keep checkout available only if the last-known-valid version is within the incident tolerance; stop publication for new markets. Inspect database health and the active-version uniqueness constraint.
- **Blocking conflict:** leave the version in draft/pending approval. Correct the scope or priority; never bypass the validator.
- **Stripe replay:** inspect `monetization_payment_events`. A duplicate provider event must not create another entitlement.
- **Snapshot mismatch:** stop fulfillment for that order and investigate metadata/database integrity. Do not manually mark it paid.
- **Quota race:** inspect `monetization_usage_counters`; all consumption must go through `consume_monetization_quota`.
- **Scheduled activation:** inspect versions still marked `scheduled`, the commercial worker log, and `activate_due_commercial_configurations`; do not edit the active row manually.
- **Promotion capacity:** inspect unexpired active quotes as well as paid redemptions; quote reservations intentionally consume capacity until expiry.
- **Wrong published price:** disable new checkout if necessary, prepare a rollback, obtain independent approval, publish, then review quotes created inside the affected interval. Existing quotes remain immutable evidence.

## Deployment

```bash
npm run db:migrate --workspace=shongre-backend
npm run db:backfill:monetization --workspace=shongre-backend
npm run typecheck --workspace=@shongre/contracts
npm run typecheck --workspace=shongre-backend
npm run test --workspace=shongre-backend -- --run tests/unit/business-rules
```

The backfill command validates the shared catalog, calculates its canonical SHA-256 hash, and calls a transactional, idempotent import function. Do not hand-edit production through the Supabase dashboard.
