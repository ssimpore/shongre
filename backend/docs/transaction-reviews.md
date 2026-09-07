# Transaction-verified marketplace reviews

## Boundary and release migration

The review service owns reputation writes. `GET /api/v1/orders/{id}/review`
returns participant-private eligibility; `POST /api/v1/reviews/submit` accepts
only `transactionId`, an integer rating from 1 to 5, and a trimmed comment of
10–2,000 characters. The authenticated principal supplies the author. The
order supplies the opposite participant and listing context.

Reviews are market-scoped through their order/listing association. Public
reputation is a multi-market shared projection of the same account; it is not
cloned per market and conveys no cross-market purchase authority.

This is a coordinated pre-production security migration of the v1 submission
contract dated 2026-09-07. Caller-selected authors, recipients and titles and
unbound submissions are no longer accepted. All repository consumers are
migrated together; there is no insecure compatibility fallback. Deployment
must verify that any separately distributed client uses the generated contract
before releasing this change. Mobile has no review submission UI yet.

Migration `00114_transaction_verified_reviews.sql` locks and rechecks the
completed order at insert, derives the recipient/title, enforces one review per
order/author, and revokes direct client writes. Buyer and seller may each
review their counterparty. The existing reputation trigger is retained and
serialized per recipient for inserts, updates and deletions; an empty
aggregate is zero, not five stars. Generated database relationship metadata
changes from one-to-one to one-to-many.

## Public projections and legacy data

Public review projections omit order IDs. Database anonymous/authenticated
read grants also exclude that column. The public badge currently requires a
retained order in `completed` state with matching, distinct participants. A
refunded, disputed or removed order does not meet that evidence rule. Existing
unbound records remain intact and unverified; the migration does not invent
purchase history or relabel them as verified.

Profile review reads return the latest 100 reviews; full history pagination
and aggregate-distribution APIs remain future work. Review content is escaped
by React. The report action submits the author's public ID and review
reference to the existing moderation workflow, not a second review queue.
Dedicated review redaction, seller replies, moderation evidence/history and
notification delivery remain to be implemented before claiming a complete
reputation platform.

The obsolete profile-report repository writer is removed. Existing admin
read/resolution methods for previously stored demo reports remain intentionally
available so this change does not discard local moderation history.

## Web and local development

The completed-order dialog loads eligibility before enabling the form. It
shows loading, error/retry, submission and saved-review states and rechecks
eligibility after an ambiguous submission failure. Account/order changes
remount its state. Public profile review failure is isolated from the seller
profile and offers retry. All new review copy exists in French and English;
this does not independently enable the unfinished English locale.

Standalone demo writes use the owned storage service, keyed by order and
author, without mutating fixture arrays. Five unbound sample reviews were
removed from the versioned demo snapshot; the remaining sample is linked to
the existing completed `tx-903` transaction. Local seeding persists that order
reference through the same repository and PostgreSQL guard. Existing database
history is deliberately not deleted. Run `make local-fixtures-check` to verify
the synchronized snapshot.

## Verification

- `make backend-test`: domain validation, HTTP authentication/authorization,
  Staff denial, duplicates and public projections.
- `make frontend-test`: deterministic adapter persistence and account isolation.
- `make frontend-test-e2e E2E_ARGS='transaction-reviews.spec.ts'`: completed
  buyer/seller journeys, persistence, reporting, accessibility and narrow layout.
- `make test-web-api-transport`: rendered review submission through the
  cookie-authenticated HTTP adapter, CSRF rejection and persistence after reload
  against the isolated test backend, without connecting a live provider.
- `make openapi-check`, `make backend-typecheck`, `make frontend-lint`.
- `backend/supabase/tests/transaction_reviews.sql`: real PostgreSQL integrity
  and role checks, transactionally rolled back. The existing CI
  `supabase test db --workdir backend` step includes this suite.

Local database verification is not hosted certification. No live payment,
shipping, refund or customer notification is authorized by posting a review.
