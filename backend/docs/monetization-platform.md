# Shongre monetization platform — implementation report

This report describes configuration version `commercial-fr-v2` and the code that consumes it. It is intentionally limited to behavior present in this repository; a catalog entry by itself is not counted as an implemented feature.

The current feature-by-feature commercial acceptance result is maintained in
[`professional-plan-acceptance-audit.md`](./professional-plan-acceptance-audit.md).
Where a configured catalog value below is marked `maintenance` or has a
non-ready implementation status, that audit takes precedence: the value is
retained for history but is not advertised, granted or purchasable.

## Audit

The repository already contained a strong monetization foundation:

- typed public contracts in `packages/contracts`;
- a canonical catalog consumed by frontend demo adapters and backend services;
- versioned configuration with draft, approval, scheduling, publication, rollback, validation and audit;
- quotes, orders, entitlements, subscriptions, invoices, promotion validation and Stripe checkout abstraction;
- subscription lifecycle, idempotency, recurring credit grants, notifications and finance ledgers in migrations `00024`–`00026`;
- vertical services and workspaces for Auto, Immo, Emploi and Cours;
- a frontend Billing & Plans surface and an Admin Monetization console.

The implementation was consolidated around those systems. No parallel pricing store, plan service, demo mode or Admin workflow was introduced.

## Problems discovered and corrected

- Legacy and current professional plan families coexisted without a single active catalog. Legacy General and Cours products are now retained only as archived compatibility records; only one current family is selectable.
- Vertical plan defaults were split across fixtures and repositories. The canonical catalog is now projected into vertical views and remains the commercial source of truth.
- Publication limits did not consistently include monthly usage. Backend publication decisions now enforce active capacity and monthly publication counters.
- Auto media checks made downgraded listings impossible to edit. Existing media can now be retained or reduced; only additions above the new entitlement are blocked.
- Immo publication did not enforce photo/floor-plan, video and virtual-tour entitlements uniformly. The backend now enforces them and the demo wizard prevents oversized photo batches.
- Cours organization mutations used legacy plan data. The workspace now uses the canonical projection and enforces member and location capacity in demo mode.
- The Admin plan editor only changed one price. A single versioned draft can now change all prices, VAT/effective dates, quotas, features, trial rules, eligibility, display metadata and transition targets.
- The Admin campaign form exposed only percentage coupons although the engine supported more. It now configures percentage, fixed, introductory-price and free-period promotions plus activation, eligibility, stacking and redemption controls.

## Architecture

```text
Admin configuration
  -> versioned catalog draft
  -> validation + approval + scheduled publication
  -> canonical active catalog
       -> quote / checkout / subscription / entitlement services
       -> vertical catalog projections
       -> publication and media enforcement
       -> billing, credits, notifications and finance attribution

Frontend (current)
  -> typed service contracts
  -> deterministic demo adapters

Frontend (future production mode)
  -> same typed service contracts
  -> HTTP adapters
  -> backend services
```

Commercial data is represented in minor currency units and bound to immutable configuration, product and price versions. The backend remains authoritative for checkout, lifecycle, quota and entitlement decisions. The frontend remains fully operable with the backend stopped, as required by the current demo-mode boundary.

## Active plan catalog

Prices are EUR, tax-inclusive catalog amounts. Annual prices implement the configured annual incentive.

| Vertical |            Plan | Monthly | Annual |
| -------- | --------------: | ------: | -----: |
| General  |    Shongre Free |      €0 |      — |
| General  |     Shongre Pro |  €19.90 |   €199 |
| Auto     |  Auto Essential |  €29.90 |   €299 |
| Auto     |   Auto Business |  €59.90 |   €599 |
| Auto     |      Auto Scale | €119.90 | €1,199 |
| Immo     |  Immo Essential |  €29.90 |   €299 |
| Immo     |   Immo Business |  €69.90 |   €699 |
| Immo     |    Immo Agency+ | €129.90 | €1,299 |
| Emploi   |     Emploi Free |      €0 |      — |
| Emploi   |  Emploi Recruit |  €19.90 |   €199 |
| Emploi   | Emploi Business |  €49.90 |   €499 |
| Emploi   |    Emploi Scale |  €99.90 |   €999 |
| Cours    |      Cours Free |      €0 |      — |
| Cours    |       Cours Pro |   €7.90 |    €79 |
| Cours    |    Cours Studio |  €24.90 |   €249 |
| Cours    | Cours Organisme |  €59.90 |   €599 |

## Quota matrix

`—` means the capability is not present in that plan.

| Plan            |       Active | Publications/mo | Media per item | Videos | Seats | Locations | Promotion credits/mo |
| --------------- | -----------: | --------------: | -------------: | -----: | ----: | --------: | -------------------: |
| Free            |   5 listings |               — |              8 |      — |     1 |         — |                    0 |
| Pro             |  50 listings |             100 |             15 |      — |     1 |         — |                    1 |
| Auto Essential  |  20 vehicles |              30 |             15 |      1 |     1 |         1 |                    1 |
| Auto Business   |  80 vehicles |             150 |             25 |      2 |     3 |         2 |                    5 |
| Auto Scale      | 250 vehicles |             500 |             40 |      3 |    10 |         5 |                   15 |
| Immo Essential  |  15 listings |              30 |             20 |      1 |     1 |         1 |                    1 |
| Immo Business   |  75 listings |             150 |             35 |      2 |     5 |         2 |                    5 |
| Immo Agency+    | 250 listings |             500 |             50 |      3 |    15 |        10 |                   15 |
| Emploi Free     |        1 job |               3 |              — |      — |     1 |         — |                    0 |
| Emploi Recruit  |       5 jobs |              10 |              — |      — |     2 |         — |                    1 |
| Emploi Business |      20 jobs |              40 |              — |      — |     5 |         — |                    5 |
| Emploi Scale    |      75 jobs |             150 |              — |      — |    15 |         — |                   15 |
| Cours Free      |     3 offers |               — |              8 |      — |     1 |         — |                    0 |
| Cours Pro       |    15 offers |               — |             15 |      — |     1 |         — |                    1 |
| Cours Studio    |    50 offers |               — |             25 |      — |     5 |         1 |                    5 |
| Cours Organisme |   200 offers |               — |             40 |      — |    20 |        10 |                   15 |

Immo also limits virtual tours to 1, 2 and 3 respectively. Monthly lead limits for Cours are 30, 150 and 500 on paid tiers.

Seat and location amounts above are configured target values. Paid expansion
beyond the safe baseline is commercially suspended until the shared production
membership/location mutation service is transactional and fully tested.

## Entitlement and feature matrix

| Capability                  | General           | Auto                      | Immo                        | Emploi                              | Cours                    | Enforcement status                                                                 |
| --------------------------- | ----------------- | ------------------------- | --------------------------- | ----------------------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| Active capacity             | yes               | yes                       | yes                         | yes                                 | yes                      | backend publication/vertical services                                              |
| Monthly publications        | Pro               | yes                       | yes                         | yes                                 | not configured           | backend usage records                                                              |
| Media limits                | yes               | photos/video              | media/video/tour            | n/a                                 | photos                   | backend; demo upload pre-checks where applicable                                   |
| Storefront/profile          | paid/free by plan | yes                       | yes                         | yes                                 | yes                      | entitlement-projected UI                                                           |
| Lead workflow               | —                 | assignment/reminders      | management/attribution      | candidate pipeline                  | lead management/inbox    | vertical services                                                                  |
| Bulk operations             | —                 | suspended                 | suspended                   | pipeline ready; templates suspended | suspended                | excluded from commercial rights until full mutation paths exist                    |
| CSV/XML/API                 | —                 | suspended                 | suspended                   | suspended                           | suspended                | job scaffolding retained; no offer is advertised without parser/worker fulfillment |
| Analytics                   | basic/standard    | standard/detailed/network | standard/advanced/portfolio | basic/advanced                      | detailed/reporting       | vertical event aggregation and entitlement-gated views                             |
| Recurring promotion credits | Pro               | all paid tiers            | all paid tiers              | paid tiers                          | paid tiers               | idempotent ledger grants and consumption                                           |
| Team/location capacity      | owner baseline    | paid expansion suspended  | paid expansion suspended    | paid expansion suspended            | paid expansion suspended | historical data remains readable; unsupported mutations fail closed                |

## Trial configuration

Paid vertical plans default to a 30-day first-customer trial in France. Payment method is required and the trial auto-converts. Free and archived products do not start trials. The policy supports audience, market and campaign-window eligibility and is editable through the versioned Admin draft.

The Founding Professionals Auto campaign is a separate promotion: 90 free days followed by 50% off for three billing periods, capped at 500 total redemptions and one per account. This does not mutate the base plan price.

## Promotions and coupons

The shared promotion model supports:

- percentage discount;
- fixed amount discount;
- introductory price;
- free period;
- optional leading free days followed by a bounded discounted duration;
- automatic, coupon-code or Admin-grant activation;
- new, existing or all-customer eligibility;
- exclusive, best-only or explicitly stackable behavior;
- global and per-account redemption caps;
- market, currency, taxonomy, audience, plan, channel and vertical scope;
- campaign and payment-provider coupon references.

Validation happens before quoting. The quote snapshots price, tax, promotion and amount due today so later catalog edits do not rewrite financial history. Checkout passes the configured provider coupon reference to Stripe; database redemption is transactional and idempotent.

## Upgrade and downgrade matrix

Configured family transitions are:

- General: Free -> Pro; Pro -> Free.
- Auto: Essential -> Business -> Scale; reverse downgrades; General Free/Pro may enter the compatible Auto tier and vertical plans may return to configured General tiers.
- Immo: Essential -> Business -> Agency+; reverse downgrades; compatible General transitions.
- Emploi: Free -> Recruit -> Business -> Scale; reverse downgrades; compatible General transitions.
- Cours: Free -> Pro -> Studio -> Organisme; reverse downgrades; compatible General transitions.

Upgrades are previewed with immediate proration and tax. Downgrades are scheduled for period end. Cancellation uses `cancel_at_period_end`; reactivation clears it. Entitlement resolution keeps vertical quotas isolated and data is preserved when a lower quota becomes effective.

## Admin capabilities

The Admin Monetization console can:

- manage configurable vertical metadata, taxonomy mapping, status and capabilities;
- filter and inspect the canonical catalog;
- edit every product price, VAT rate, tax mode and effective window in a draft;
- edit entitlement values, quotas, trial policy, market/audience eligibility and plan transitions;
- create generic campaign/coupon promotions with duration, stacking and caps;
- create complimentary access requests with maker/checker approval;
- simulate commercial rules and inspect matching explanations;
- submit, approve, schedule, publish and roll back configuration versions;
- inspect conflicts, operations, history and audit records;
- export the effective catalog.

Sensitive changes require a reason, use capability checks, and do not mutate the published configuration in place.

## Finance integration

Checkout and webhook flows preserve separate attribution for subscription, promotion/advertising, add-on, commission and service-fee revenue. Migration `00025_platform_finance_ledger.sql` posts balanced entries, defers and recognizes annual subscription revenue, stores provider references, and exposes finance reporting aggregates. Invoices retain subtotal, discount, tax and total snapshots.

## Verification coverage

Automated coverage includes catalog schema and compatibility, configuration validation and lifecycle, quotes and promotion rules, checkout/idempotency, trials, subscription upgrades/downgrades/cancellation/reactivation, recurring credits, vertical entitlement projections, publication/media limits, downgrade-safe media editing, Cours organization quotas, finance ledgers, RLS and security boundaries. Exact command results belong in the delivery note because the repository test count changes over time.

## Limitations and production dependencies

The following are not represented as fully production-complete in this report:

- The frontend intentionally remains in deterministic demo mode and has no production HTTP adapters yet.
- Live Stripe checkout, subscription changes, invoices and coupons require deployed secrets, product/price/coupon identifiers and webhook endpoints. Database mode fails closed when required provider references are absent.
- Auto/Immo/Emploi import endpoints create durable, idempotent jobs and enforce plan access, but this repository does not yet contain the file-ingestion/parser worker that turns an uploaded CSV/XML payload into inventory. The UI must not market end-to-end import as available until that worker and storage flow are deployed.
- Generic database-backed organization invitation and branch-management mutations are not yet centralized behind one quota-enforcing service. Cours demo mutations enforce seats/locations, but the same invariant must be applied transactionally to production organization membership before paid seat promises are considered complete.
- Several add-on product families requested by the strategy (generic capacity, location and API add-ons across every vertical) are not yet implemented end to end. Existing listing visibility and Emploi seat/job add-ons are real catalog products; missing add-ons should not be advertised.
- Worker scheduling, notification delivery, email/SMS, storage scanning and external analytics/payment dashboards require their respective deployed infrastructure.

These limitations are explicit gates, not silent fallbacks. Features remain hidden or fail closed when their provider or enforcement path is unavailable.
