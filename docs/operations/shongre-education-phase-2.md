# Shongre Education — Phase 2 launch gate

Booking, payment, payout, packages, and recurring lessons must remain disabled until every required item below is evidenced for the target market. Enabling a flag is an audited operator action, not a frontend deployment choice.

## Provider and funds flow

- [ ] Payment provider contract and supported marketplace funds flow approved.
- [ ] Tutor/organization onboarding, KYC/KYB, beneficial-owner, sanctions, and re-verification flows implemented.
- [ ] Payout eligibility, bank-account ownership, reserves, holds, and negative-balance handling implemented.
- [ ] Provider IDs stay server-side and no secret is present in a browser bundle.

## Payments and webhooks

- [ ] Payment intents/checkout use idempotency keys for every mutation.
- [ ] Raw webhook signatures are verified before parsing.
- [ ] Webhook event IDs are unique and replay-safe.
- [ ] Authorization, capture, cancellation, failure, partial/full refund, dispute, and chargeback states are persisted.
- [ ] Reconciliation detects missing events and provider/platform amount mismatches.
- [ ] All amounts use integer minor units plus ISO currency.

## Booking and service delivery

- [ ] Availability locking prevents double booking under concurrency.
- [ ] Timezones and daylight-saving transitions have automated tests.
- [ ] Cancellation, rescheduling, no-show, late arrival, and tutor cancellation policies are versioned.
- [ ] Session completion/attendance evidence is sufficient for review, refund, and payout decisions.
- [ ] Packages define lesson count, duration, expiry, remaining balance, cancellation, and transfer rules.

## Tax, invoicing, and accounting

- [ ] Platform merchant/agent status is approved per market.
- [ ] VAT, platform fees, tutor gross/net, refunds, and credit notes are modeled and reviewed.
- [ ] Learner and tutor/organization invoices use immutable numbering and retained tax evidence.
- [ ] Tutor tax reporting and any platform reporting obligations are implemented.
- [ ] “Services à la personne” or similar advantages are displayed only from verified current eligibility.

## Consumer and education compliance

- [ ] Pre-contract information, withdrawal rights, exceptions after service starts, and consent are captured.
- [ ] Minor/guardian contracting, messaging, safeguarding, and escalation rules are legally approved.
- [ ] Accessibility and translated legal copy are approved for the market.
- [ ] Support, moderation, disputes, abuse reports, and emergency escalation have staffed runbooks.

## Security and privacy

- [ ] Data protection impact assessment covers minors, qualifications, identity, payment, and communications.
- [ ] Evidence storage is private, encrypted, retention-limited, access-logged, and deletion-aware.
- [ ] RLS integration tests run against real authenticated and service-role sessions.
- [ ] Fraud controls cover account, tutor, learner request, conversation, booking, payment, and payout risk without exposing scores.
- [ ] Incident response and breach notification procedures are exercised.

## Release sequence

1. Enable booking in an internal-only market cohort with payments still off.
2. Validate concurrency, cancellation, support, and audit telemetry.
3. Enable provider onboarding and payouts for approved test tutors.
4. Enable payments for an allowlisted cohort; monitor webhook reconciliation and disputes.
5. Expand gradually by market and subject. Keep instant rollback flags.
6. Enable packages and recurring lessons only after single-session accounting is stable.

Required automated release assertion: `paymentsEnabled` implies both `bookingEnabled` and `payoutsEnabled`. The API and admin service currently enforce this invariant.
