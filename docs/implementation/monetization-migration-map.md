# Monetization audit and migration map

## Audited sources

| Previous source                                    | Risk found                                                                     | Central replacement                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/.../monetization.repository.ts`           | Independent boost/plan floats, unverified grant, active subscription on insert | Catalog-derived compatibility reads; unsafe mutation methods disabled; quote/checkout service                                                             |
| `frontend/src/configuration/plans.config.ts`       | Conflicting plan prices, quotas, boost prices, unsupported uplift claims       | Compatibility presentation derived from the shared baseline catalog                                                                                       |
| `AdminMonetizationPage.tsx`                        | Local fake state and success toast; no persistence                             | Adapter-backed versioned command center, simulation, explanation, draft and workflow actions                                                              |
| `market.defaults.ts` / `market.config.ts`          | Fee, limit, delivery, commission, payout, premium and plan duplicates          | Values derived from catalog rules/products in demo mode                                                                                                   |
| `transaction.config.ts` / `transaction.service.ts` | Client-side fee and commission constants                                       | Commercial fields removed; demo resolver uses catalog; API checkout uses server quote                                                                     |
| `fulfillment.resolver.ts`                          | Different buyer fee/commission and delivery prices                             | Catalog delivery tiers and fee/commission rules                                                                                                           |
| `backend/src/shared/money/escrow.ts`               | Market fee table duplicated in floats                                          | Compatibility calculation derives rules and calculates in minor units                                                                                     |
| `OrdersService`                                    | Unconfigured shipping fallback                                                 | Catalog delivery price fallback                                                                                                                           |
| `/payments/intent` and fake Stripe adapter         | Client amount trusted; random fake production intent                           | Quote id only; Checkout Sessions; fake production calls disabled                                                                                          |
| Auto tables/adapters                               | Separate plan/add-on catalog and paid flags                                    | Existing Auto response shape is projected from the published catalog by `applyMonetizationToAutoCatalog`; publication/workspace reads use that projection |
| Education tables/adapters                          | Separate plans/add-ons and commission                                          | Existing Education response shape is projected from the published catalog; tutor quotas and add-ons consume it                                            |
| Immo vertical offers/checkouts                     | Reusable model but no full immutable line/entitlement snapshot                 | Immo catalog projection plus central quote/checkout/order for paid offers and add-ons                                                                     |
| Mobile billing                                     | Classification only                                                            | Shared catalog, quote, checkout contracts with deterministic demo adapter                                                                                 |

## Current audited baseline

The active France baseline is machine-readable in `packages/contracts/src/fixtures/monetization-catalog.ts`. Version 1 contains 55 uniquely identified products (49 active and 6 disabled partner-referral placeholders), 23 rules, and one isolated draft promotion:

- generic individual publication and three generic Pro subscriptions;
- Urgent, Remonter l’annonce, highlight, visibility bundle, and À la une;
- hand delivery, parcel tier prices, express, bulky, and seller delivery;
- Auto individual/dealer offers;
- Auto paid visibility, qualified-lead, secure-sale and disabled partner-referral products;
- Education individual/tutor/school offers plus visibility, lead and verification add-ons;
- Immo individual/agency offers plus visibility, lead and sponsored-agency add-ons;
- individual and vertical publication quotas;
- buyer-protection fees for FR, BE, CH, LU, DE, and ES;
- individual/pro seller commission plus the Education commission;
- digital-service tax rates by market;
- transaction min/max and instant-payout fees;
- a non-active example promotion proving draft isolation.

Amounts intentionally preserve the currently visible Shongre frontend/vertical values during migration. The purpose of the first version is consolidation without an accidental commercial change. Later price changes must be new approved versions.

## Rollout phases

1. **Expand:** apply migration 00015 and import the validated baseline.
2. **Dual-read verification:** compare old endpoints and screens with catalog-derived compatibility adapters; inspect version and quote hashes.
3. **Switch consumers:** admin, Pro page, promotions, transaction pricing, fulfillment, mobile, generic backend orders.
4. **Observe:** monitor stale-catalog health, quote creation failures, webhook duplicate rate, snapshot mismatches, and quota conflicts.
5. **Contract legacy:** after production evidence shows no legacy readers, migrate remaining history and remove legacy price columns/tables in a later migration. Generated types already include the expand-phase schema.

Legacy tables are not dropped by migration 00015. This preserves rollback and historical auditability.

## Consumer evidence

| Consumer                               | Authoritative read                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Generic web publication                | `getDemoPublicationPolicy` in demo; authenticated `BusinessRulesService.authorizePublication` on backend publish |
| Auto backend and web demo              | Shared `applyMonetizationToAutoCatalog` projection                                                               |
| Education backend and web demo         | Shared `applyMonetizationToCourseCatalog` projection                                                             |
| Immo backend and web demo              | Shared projection; paid backend checkout delegates to central quote/order                                        |
| Generic promotions and Pro plans       | Compatibility service reads active central products                                                              |
| Transactions, escrow, delivery, payout | Shared rule/product lookup in compatibility resolvers                                                            |
| Admin                                  | `BusinessRulesServiceContract` demo/HTTP adapters; no local commercial state                                     |
| Mobile billing                         | Shared catalog/quote/checkout contracts; active entitlements restored from the backend endpoint                  |

The old vertical seed values remain only as expand-phase rollback and non-commercial shape fixtures. Runtime projections replace their price, duration, status, recommendation, label, and monetized entitlement fields before a consumer receives them.
