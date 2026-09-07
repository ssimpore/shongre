\set ON_ERROR_STOP on
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(14);

INSERT INTO public.profiles (id, slug, email, name, account_type, country) VALUES
  ('a1400000-0000-4000-a000-000000000001', 'review-test-buyer', 'review-buyer@example.test', 'Review Buyer', 'individual', 'FR'),
  ('a1400000-0000-4000-a000-000000000002', 'review-test-seller', 'review-seller@example.test', 'Review Seller', 'individual', 'FR'),
  ('a1400000-0000-4000-a000-000000000003', 'review-test-outsider', 'review-outsider@example.test', 'Review Outsider', 'individual', 'FR');
INSERT INTO public.listings (
  id, seller_id, publisher_user_id, category_id, title, description,
  price, currency, market_code, city, postal_code, country
) VALUES (
  'a1400000-0000-4000-a000-000000000010', 'a1400000-0000-4000-a000-000000000002',
  'a1400000-0000-4000-a000-000000000002', (SELECT id FROM public.categories ORDER BY id LIMIT 1),
  'Transaction review test item', 'Isolated review integration fixture', 100, 'EUR', 'FR', 'Paris', '75001', 'FR'
);
INSERT INTO public.orders (
  id, order_number, listing_id, buyer_id, seller_id, item_amount, protection_fee,
  shipping_fee, total_charged, escrow_secured_amount, item_amount_minor,
  protection_fee_minor, shipping_fee_minor, total_charged_minor, escrow_secured_amount_minor, currency
) VALUES (
  'a1400000-0000-4000-a000-000000000020', 'REVIEW-TEST-ORDER',
  'a1400000-0000-4000-a000-000000000010', 'a1400000-0000-4000-a000-000000000001',
  'a1400000-0000-4000-a000-000000000002', 100, 0, 0, 100, 100, 10000, 0, 0, 10000, 10000, 'EUR'
);

SELECT throws_ok($$ INSERT INTO public.reviews (order_id, author_id, target_user_id, rating, comment) VALUES (
  'a1400000-0000-4000-a000-000000000020', 'a1400000-0000-4000-a000-000000000001',
  'a1400000-0000-4000-a000-000000000002', 4, 'The item was as described.') $$,
  '23514', 'REVIEW_ORDER_NOT_COMPLETED', 'unpaid orders cannot create reviews');
UPDATE public.orders SET status = 'completed' WHERE id = 'a1400000-0000-4000-a000-000000000020';

SELECT throws_ok($$ INSERT INTO public.reviews (order_id, author_id, target_user_id, rating, comment) VALUES (
  'a1400000-0000-4000-a000-000000000020', 'a1400000-0000-4000-a000-000000000003',
  'a1400000-0000-4000-a000-000000000002', 4, 'The item was as described.') $$,
  '23514', 'REVIEW_ORDER_NOT_FOUND', 'unrelated authors are rejected');
SELECT throws_ok($$ INSERT INTO public.reviews (author_id, target_user_id, rating, comment) VALUES (
  'a1400000-0000-4000-a000-000000000001', 'a1400000-0000-4000-a000-000000000002', 4, 'No order evidence attached.') $$,
  '23514', 'REVIEW_ORDER_NOT_FOUND', 'unbound reviews are rejected');
SELECT throws_ok($$ INSERT INTO public.reviews (order_id, author_id, target_user_id, rating, comment) VALUES (
  'a1400000-0000-4000-a000-000000000020', 'a1400000-0000-4000-a000-000000000001',
  'a1400000-0000-4000-a000-000000000002', 4, '  ') $$,
  '23514', 'REVIEW_COMMENT_INVALID', 'blank review content is rejected');

SELECT lives_ok($$ INSERT INTO public.reviews (id, order_id, author_id, target_user_id, listing_title, rating, comment) VALUES (
  'a1400000-0000-4000-a000-000000000030', 'a1400000-0000-4000-a000-000000000020',
  'a1400000-0000-4000-a000-000000000001', 'a1400000-0000-4000-a000-000000000003', 'Invented title', 4,
  'The item was as described.') $$, 'completed-order buyer can review');
SELECT is((SELECT target_user_id FROM public.reviews WHERE id = 'a1400000-0000-4000-a000-000000000030'),
  'a1400000-0000-4000-a000-000000000002'::uuid, 'recipient is derived from the order');
SELECT is((SELECT listing_title::text FROM public.reviews WHERE id = 'a1400000-0000-4000-a000-000000000030'),
  'Transaction review test item', 'listing title is derived from the order');
SELECT throws_ok($$ INSERT INTO public.reviews (order_id, author_id, target_user_id, rating, comment) VALUES (
  'a1400000-0000-4000-a000-000000000020', 'a1400000-0000-4000-a000-000000000001',
  'a1400000-0000-4000-a000-000000000002', 3, 'Second review is forbidden.') $$,
  '23505', NULL, 'one review per order participant');
SELECT lives_ok($$ INSERT INTO public.reviews (order_id, author_id, target_user_id, rating, comment) VALUES (
  'a1400000-0000-4000-a000-000000000020', 'a1400000-0000-4000-a000-000000000002',
  'a1400000-0000-4000-a000-000000000001', 5, 'The buyer arrived on time.') $$,
  'seller can independently review the buyer');
SELECT is((SELECT rating FROM public.profiles WHERE id = 'a1400000-0000-4000-a000-000000000002'), 4::numeric,
  'reputation reflects the persisted review');
DELETE FROM public.reviews WHERE id = 'a1400000-0000-4000-a000-000000000030';
SELECT is((SELECT rating FROM public.profiles WHERE id = 'a1400000-0000-4000-a000-000000000002'), 0::numeric,
  'removing the final review does not manufacture five stars');

SET LOCAL ROLE anon;
SELECT lives_ok($$ SELECT id, rating, comment FROM public.reviews $$, 'public review columns remain readable');
SELECT throws_ok($$ SELECT order_id FROM public.reviews $$, '42501', NULL, 'public readers cannot see order IDs');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$ INSERT INTO public.reviews (order_id, author_id, target_user_id, rating, comment) VALUES (
  'a1400000-0000-4000-a000-000000000020', 'a1400000-0000-4000-a000-000000000001',
  'a1400000-0000-4000-a000-000000000002', 4, 'Direct browser write is forbidden.') $$,
  '42501', NULL, 'browser/native database writes cannot bypass the API');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
