# Shongre Auto — launch gates and operations

The demo frontend remains independent of the backend. `NEXT_PUBLIC_DATA_MODE=demo`, `BACKEND_DATA_MODE=demo`, and `PAYMENT_PROVIDER=demo` are the safe local defaults in `.env.example`. Hosted staging and production require API/database mode and must pass every gate below; changing a browser variable never authorizes real payments, partner routing, or public uploads.

## Base vertical launch

- [ ] Apply all migrations through `00013_auto_vertical.sql` to a disposable Supabase project, then staging.
- [ ] Regenerate and review Supabase database types from the applied staging schema before enabling the PostgreSQL adapter.
- [ ] Run RLS integration tests with anonymous, authenticated seller, dealer employee, dealer admin, moderator, market-manager, and service-role JWTs.
- [ ] Execute `backend/supabase/seed/auto.sql` and verify every market/type/plan/add-on payload against shared contracts.
- [ ] Configure private media/document buckets, signed access, scanning, EXIF removal, retention, deletion, and reviewer audit before selecting HTTP data mode.
- [ ] Validate France document wording, HistoVec wording, technical-inspection applicability, transfer documents, consumer notices, privacy retention, and dealer obligations.
- [ ] Review make/model/version catalog licensing and establish update/import ownership.
- [ ] Exercise duplicate VIN/registration, duplicate photo, reused description, mileage inconsistency, price outlier, account takeover, and contact-abuse queues.
- [ ] Replace URL-level demo media fingerprints with perceptual image hashes from the private scanning pipeline and calibrate collision/review thresholds.
- [ ] Establish import file limits, content hashing, malware scanning, mapping versions, partial-failure reports, retry/dead-letter handling, and operator runbooks.
- [ ] Connect saved Auto searches to the API repository while preserving account isolation and guest-to-account merge behavior.
- [ ] Exercise Dealer Network branch permissions, stock-transfer approval/completion, centralized billing, and SLA escalation with multi-site fixtures.
- [ ] Replace demo analytics with warehouse-backed completion, publish time, inventory age, search/contact, test-drive, response, conversion, MRR, promotion, referral, retention, and per-listing/dealer lead metrics.

## Paid offer gate

Keep `paidOffersEnabled` and `secureSaleEnabled` false until all items are evidenced:

- [ ] Create Checkout Sessions server-side from the selected market plan/add-on; never accept amount, currency, tax, duration, or entitlement from the browser.
- [ ] Require and persist idempotency keys for checkout, subscription, refund, and cancellation mutations.
- [ ] Verify raw Stripe webhook signatures and reconcile unique provider event IDs, amounts, currency, tax, customer, purchase, and environment.
- [ ] Cover success, asynchronous success/failure, requires-action, expiry, cancellation, partial/full refund, dispute, and chargeback.
- [ ] Activate a promotion only after a paid event and entitlement re-check; make replay a no-op.
- [ ] Define subscription proration, trials, renewal, past-due grace, downgrade quota handling, cancellation, invoices/credit notes, VAT, and centralized dealer billing.
- [ ] Staff support/refund/dispute operations and monitor checkout-to-activation reconciliation.
- [ ] Store `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` only in backend secret storage. No `NEXT_PUBLIC_*` secret is allowed.

## Partner referral gate

Financing, insurance, inspection, warranty, trade-in, and delivery must remain unavailable until each provider has:

- [ ] executed commercial and data-processing agreements;
- [ ] approved market/legal scope and customer wording;
- [ ] explicit purpose-specific consent with versioned text;
- [ ] authenticated server routing, idempotency, status callbacks, deletion/retention, and reconciliation;
- [ ] neutral failure/fallback behavior and staffed escalation;
- [ ] reviewed claims so Shongre never implies approval, guaranteed credit, coverage, valuation, inspection, warranty, or delivery.

## Rollout sequence

1. Internal France catalog, search, comparison, drafts, moderation, and dealer workspaces in demo mode.
2. Staging API mode with private media/documents and real JWT/RLS tests; no paid offers or referrals.
3. Allowlisted private sellers and dealers, monitored imports, lead routing, and fraud review.
4. General France base vertical after operational readiness and legacy-listing regression.
5. Paid offers in an allowlisted cohort only after the paid-offer gate.
6. One partner capability at a time after its independent gate.
7. New markets only after catalog, document, tax, legal, translation, support, and fraud review.

Rollback is configuration-first: disable the market vertical, affected type, import mode, paid offers, secure sale, or individual referral flag. Do not delete records to roll back availability.
