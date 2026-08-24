-- The public schema is an API-owned persistence boundary. Browsers authenticate
-- to the Shongre API and never mutate business tables directly. This closes
-- mass-assignment and state-transition bypasses left by historical RLS policies.
DO $policy_cleanup$
DECLARE
  candidate RECORD;
BEGIN
  FOR candidate IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      candidate.policyname,
      candidate.schemaname,
      candidate.tablename
    );
  END LOOP;
END
$policy_cleanup$;

DO $privilege_cleanup$
DECLARE
  candidate RECORD;
BEGIN
  FOR candidate IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.%I FROM anon, authenticated',
      candidate.tablename
    );
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',
      candidate.tablename
    );
  END LOOP;
END
$privilege_cleanup$;

REVOKE USAGE, UPDATE ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO service_role;

-- Historical code could complete any order and create a fake payout without
-- contacting the configured payment provider. The provider-authoritative order
-- service supersedes it and no caller is allowed to retain the bypass.
DROP FUNCTION IF EXISTS public.release_order_escrow(UUID, UUID);
