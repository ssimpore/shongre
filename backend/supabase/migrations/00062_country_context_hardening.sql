-- Country context hardening: legacy rows were backfilled explicitly by earlier
-- migrations, but new writes must never infer France from a column default.

ALTER TABLE public.profiles ALTER COLUMN country DROP DEFAULT;
ALTER TABLE public.organizations ALTER COLUMN country DROP DEFAULT;
ALTER TABLE public.listings ALTER COLUMN country DROP DEFAULT;
ALTER TABLE public.saved_searches ALTER COLUMN market_code DROP DEFAULT;
ALTER TABLE public.notifications ALTER COLUMN market_code DROP DEFAULT;
ALTER TABLE public.crm_accounts ALTER COLUMN country DROP DEFAULT;
ALTER TABLE public.crm_contacts ALTER COLUMN country DROP DEFAULT;
ALTER TABLE public.marketing_profiles
  ALTER COLUMN country DROP DEFAULT,
  ALTER COLUMN locale DROP DEFAULT,
  ALTER COLUMN timezone DROP DEFAULT;

-- Country-valued columns share the canonical markets registry. NOT VALID keeps
-- the lock short while the subsequent validation checks existing data.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_country_market_fk') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_country_market_fk
      FOREIGN KEY (country) REFERENCES public.markets(code) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_country_market_fk') THEN
    ALTER TABLE public.organizations ADD CONSTRAINT organizations_country_market_fk
      FOREIGN KEY (country) REFERENCES public.markets(code) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'listings_country_market_fk') THEN
    ALTER TABLE public.listings ADD CONSTRAINT listings_country_market_fk
      FOREIGN KEY (country) REFERENCES public.markets(code) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_searches_market_fk') THEN
    ALTER TABLE public.saved_searches ADD CONSTRAINT saved_searches_market_fk
      FOREIGN KEY (market_code) REFERENCES public.markets(code) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_accounts_country_market_fk') THEN
    ALTER TABLE public.crm_accounts ADD CONSTRAINT crm_accounts_country_market_fk
      FOREIGN KEY (country) REFERENCES public.markets(code) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_contacts_country_market_fk') THEN
    ALTER TABLE public.crm_contacts ADD CONSTRAINT crm_contacts_country_market_fk
      FOREIGN KEY (country) REFERENCES public.markets(code) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketing_profiles_country_market_fk') THEN
    ALTER TABLE public.marketing_profiles ADD CONSTRAINT marketing_profiles_country_market_fk
      FOREIGN KEY (country) REFERENCES public.markets(code) ON DELETE RESTRICT NOT VALID;
  END IF;
END $$;

ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_country_market_fk;
ALTER TABLE public.organizations VALIDATE CONSTRAINT organizations_country_market_fk;
ALTER TABLE public.listings VALIDATE CONSTRAINT listings_country_market_fk;
ALTER TABLE public.saved_searches VALIDATE CONSTRAINT saved_searches_market_fk;
ALTER TABLE public.crm_accounts VALIDATE CONSTRAINT crm_accounts_country_market_fk;
ALTER TABLE public.crm_contacts VALIDATE CONSTRAINT crm_contacts_country_market_fk;
ALTER TABLE public.marketing_profiles VALIDATE CONSTRAINT marketing_profiles_country_market_fk;

-- The pre-market notification overload depended on the removed FR default.
-- All callers must now supply market and canonical route explicitly.
DROP FUNCTION IF EXISTS public.create_notification_with_deliveries(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[], TIMESTAMPTZ
);

-- Supabase/Postgres evaluates a bare auth.uid() once per scanned row. Wrapping
-- it in SELECT gives the planner an initplan and preserves policy semantics.
DROP POLICY IF EXISTS "blocked_users_select_own" ON public.blocked_users;
CREATE POLICY "blocked_users_select_own" ON public.blocked_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles profile
      WHERE profile.id = blocker_id
        AND profile.auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "blocked_users_insert_own" ON public.blocked_users;
CREATE POLICY "blocked_users_insert_own" ON public.blocked_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles profile
      WHERE profile.id = blocker_id
        AND profile.auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "blocked_users_delete_own" ON public.blocked_users;
CREATE POLICY "blocked_users_delete_own" ON public.blocked_users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles profile
      WHERE profile.id = blocker_id
        AND profile.auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "push_tokens_manage_own" ON public.push_device_tokens;
CREATE POLICY "push_tokens_manage_own" ON public.push_device_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles profile
      WHERE profile.id = user_id
        AND profile.auth_user_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles profile
      WHERE profile.id = user_id
        AND profile.auth_user_id = (SELECT auth.uid())
    )
  );
