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
| Mobile billing                                     | Classification only                                                            | Shared read-only billing projection for plan, rights, usage and invoices; no digital checkout or external steering before an approved store policy        |

## Current audited baseline

The active France baseline is machine-readable in `packages/contracts/src/fixtures/monetization-catalog.ts`. `commercial-fr-v3` contains 77 products across General, Auto, Immo, Emploi and Education. It remains the only active version. Historical product, price, quote, order, invoice, commission, ledger and provider references are not rewritten by the target work.

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

Amounts intentionally preserve the currently visible Shongre frontend/vertical values. Later price changes must be new approved versions.

## Reviewed target draft

`packages/contracts/src/fixtures/monetization-proposed-catalog.ts` defines the validated `commercial-fr-v4-draft` snapshot and nothing reads it as the active catalog. The idempotent `make monetization-draft-import` path stores it through the existing `save_commercial_configuration_version` transaction and refuses direct production seeding.

The draft contains 98 products: all 77 v3 identities re-versioned for historical continuity plus 21 target products. It adds:

- Pro Starter at EUR 19.90 monthly / EUR 199 annually;
- Pro Growth at EUR 49.90 monthly / EUR 499 annually;
- Pro Performance at EUR 116.90 monthly / EUR 1,169 annually;
- four attachable vertical-module definitions, with incomplete/provider-dependent capabilities suspended;
- the requested individual vehicle slot and visibility price records;
- disabled vehicle payment/protection, tenant pass and valuation products;
- the Founding Professional campaign, 90-day trial configuration and a finite twelve-month price-lock policy;
- 26 price-level cost/margin records in `missing_inputs` state;
- six production Stripe price mappings in `missing` state;
- paid-placement policies that require a visible localized label and set `organicRankingIsolation` to true;
- unpriced Enterprise, qualified-lead, advertising, insurance, warranty, partner-service and undefined-variant definitions that cannot enter checkout.

The target draft deliberately contains publication blockers. It cannot be submitted or published until shadow quote comparisons, campaign enrollment dates, cost/margin approvals, and environment-specific provider mappings are complete.

## Existing-plan mapping and customer treatment

Every one of the 16 active professional subscriptions in v3 has an explicit mapping record. All mappings currently use `customer_choice_required`, preserve historical price and entitlement versions, require recorded acceptance, and remain at `shadowQuoteStatus=not_run`.

| Current family | Current tier(s)                | Target                                   | Treatment before rollout                                             |
| -------------- | ------------------------------ | ---------------------------------------- | -------------------------------------------------------------------- |
| General        | Free, Pro                      | Starter or customer-selected higher tier | Retain current subscription; no automatic change                     |
| Auto           | Essential, Business, Scale     | Starter, Growth, Performance             | Retain v3 price/rights; compare quotes; record customer choice       |
| Immo           | Essential, Business, Agency+   | Starter, Growth, Performance             | Retain v3 price/rights; compare quotes; record customer choice       |
| Emploi         | Free, Recruit, Business, Scale | Starter, Starter, Growth, Performance    | Retain v3 price/rights; document intentional quota differences       |
| Education      | Free, Pro, Studio, Organisme   | Starter, Starter, Growth, Performance    | Retain v3 price/rights; document intentional price/quota differences |

The current products stay selectable until parity, independent approval and rollout gates pass. Archiving them is a later contract phase, never part of draft import. Customer-specific protection is recorded in append-only `monetization_price_protection_records`; accepted Enterprise terms are frozen in `enterprise_commercial_contracts` with append-only events.

## Rollout phases

1. **Expand:** apply migrations through `00087`; v3 stays active. Migration `00087` adds exact market/catalog evidence and the atomic, idempotent subscription-transition RPC without rewriting historical price identities.
2. **Install draft outside production:** run `make monetization-draft-import` against the intended migrated environment.
3. **Complete gates:** bind remaining canonical commission taxonomy groups, enter reviewed costs/margin floors, configure campaign dates/caps, create environment/market provider mappings, and run shadow quotes for all 16 mappings.
4. **Independent approval:** submit only when the validator reports no blocking conflict; use the existing maker/checker and recent-authentication controls.
5. **Shadow rollout:** compare monthly/annual, promotion, tax and entitlement snapshots without changing customer subscriptions.
6. **Customer migration:** present a choice or record a signed Enterprise agreement. Grant price protection atomically where the approved policy applies.
7. **Observe:** monitor provider mismatch, quote/checkout failure, negative margin, subsidy exhaustion, locked populations, webhook duplication, ledger imbalance and historical snapshot integrity.
8. **Contract legacy:** archive old selectable versions only after all consumers and customers have migrated; never delete referenced history.

No legacy table or product identity is dropped by migration `00085`. Rollback means keeping v3 active or preparing a new draft from an archived immutable snapshot; it never rewrites financial history.

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
| Mobile billing                         | Shared read-only billing contracts; active plan, entitlements, usage and invoices from the active-market service |

The old vertical seed values remain only as expand-phase rollback and non-commercial shape fixtures. Runtime projections replace their price, duration, status, recommendation, label, and monetized entitlement fields before a consumer receives them.
