-- ==============================================================================
-- SHONGRE RLS & AUTHORIZATION TEST SUITE (pgTAP / SQL)
-- ==============================================================================

BEGIN;

-- Test 1: Verify RLS is enabled on all critical tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'listings', 'orders', 'payouts', 'messages', 'conversations', 'audit_logs');

-- Test 2: Unauthenticated user cannot see unpublished listing
SET ROLE anon;
SELECT count(*) FROM public.listings WHERE status = 'draft';

-- Test 3: Authenticated buyer cannot see another user's private payouts
SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SELECT count(*) FROM public.payouts WHERE seller_id = '00000000-0000-0000-0000-000000000002';

ROLLBACK;
