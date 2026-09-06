BEGIN;

-- A security-invoker view applies the caller's privileges and RLS policies.
-- This narrowly scoped helper lets that policy exclude every retained Staff
-- identity without exposing the private staff_memberships table.
CREATE OR REPLACE FUNCTION public.is_public_marketplace_profile(
  p_profile_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = p_profile_id
      AND profile.status::TEXT = 'active'
      AND NOT EXISTS (
        SELECT 1
        FROM public.staff_memberships membership
        WHERE membership.user_id = profile.id
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_public_marketplace_profile(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_marketplace_profile(UUID)
  TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone"
  ON public.profiles;
DROP POLICY IF EXISTS public_marketplace_profiles_are_readable
  ON public.profiles;
CREATE POLICY public_marketplace_profiles_are_readable
  ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    public.is_public_marketplace_profile(id)
    AND public.is_customer_marketplace_actor()
  );

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true, security_barrier = true)
AS
SELECT id, slug, name, avatar_url, city, country, bio, account_family,
       professional_vertical, is_verified, is_business_verified,
       rating, review_count, response_rate_percent, response_time_text, created_at
FROM public.profiles
WHERE public.is_public_marketplace_profile(id)
  AND public.is_customer_marketplace_actor();

REVOKE ALL ON public.public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Invoker views require privileges on referenced columns. Keep private profile
-- fields inaccessible even through a direct table query; RLS enforces the same
-- active, non-Staff row set as the view.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, slug, name, avatar_url, city, country, bio, account_family,
  professional_vertical, is_verified, is_business_verified, rating,
  review_count, response_rate_percent, response_time_text, created_at, status
) ON public.profiles TO anon, authenticated;

COMMENT ON FUNCTION public.is_public_marketplace_profile(UUID) IS
  'RLS helper that identifies active customer profiles without exposing Staff membership data.';
COMMENT ON VIEW public.public_profiles IS
  'Public-safe customer profile projection evaluated with invoker privileges and RLS.';

COMMIT;
