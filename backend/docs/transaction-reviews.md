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
before releasing this change. Mobile submits reviews from its orders screen
through the same two operations.

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
by React. The report action submits the review as a first-class moderation
target (`review_id` on reports and cases, migration
`00143_review_replies_votes_reports.sql`); a Staff resolution that removes
the target calls `remove_review`, which hides the review from every public
projection and rebuilds the recipient's aggregate. Removed reviews are kept
for appeal history, never deleted.

Sellers answer a review once, publicly, through `POST /reviews/{id}/reply`
(`review.update.own`: only the recipient of the review). Any signed-in member
except the author votes a review helpful through `PUT /reviews/{id}/helpful`;
the vote is idempotent and the count is maintained by trigger. Both
interactions are read back in the public projection (`reply`,
`helpfulCount`, `viewerMarkedHelpful`).

Completed orders stamp `orders.completed_at`; the hourly `review_reminders`
worker asks each participant who has not reviewed yet, once per order, between
three and fourteen days after completion. It reads only participants still
owed a reminder (`list_due_review_reminders`, migration 00152) and claims each
in `order_review_reminders` before notifying, so a handled participant leaves
the next read and every run reaches newer exchanges rather than re-inspecting
the oldest ones. The reminder is a notification, not an email campaign, and
honours the recipient's notification preferences like every other
notification.

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
