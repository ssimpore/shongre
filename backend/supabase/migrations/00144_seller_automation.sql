-- Three things a seller could not do without watching the calendar: keep a
-- listing online past its expiry, publish it later, and step away for a
-- while without buyers writing into a void. Each is a small state on the
-- rows that already exist plus a database function the scheduled worker
-- calls; none of it changes what a publication, expiry or bump means.

-- ---------------------------------------------------------------------------
-- 1. Auto-renew: a listing's own opt-in, bounded so a forgotten listing
--    does not renew forever
-- ---------------------------------------------------------------------------

ALTER TABLE public.listings
  ADD COLUMN auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN renewal_count INTEGER NOT NULL DEFAULT 0 CHECK (renewal_count >= 0),
  ADD COLUMN last_renewed_at TIMESTAMPTZ,
  ADD COLUMN scheduled_publish_at TIMESTAMPTZ;

CREATE INDEX listings_auto_renew_due_idx
  ON public.listings (expires_at)
  WHERE status = 'published' AND auto_renew;

-- A renewal extends the expiry by the listing's original publication window
-- and nothing else: `published_at` and `organic_freshness_at` stay, because
-- a renewal is not a new publication and must not read as a paid bump.
CREATE OR REPLACE FUNCTION public.renew_expiring_listings(
  p_max_cycles INTEGER DEFAULT 3,
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (id UUID, seller_id UUID, title TEXT, market_code VARCHAR, expires_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH due AS (
    SELECT listing.id
      FROM public.listings listing
     WHERE listing.status = 'published'
       AND listing.auto_renew
       AND listing.renewal_count < GREATEST(coalesce(p_max_cycles, 3), 0)
       AND listing.expires_at <= NOW()
     ORDER BY listing.expires_at
     LIMIT LEAST(GREATEST(coalesce(p_limit, 500), 1), 5000)
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.listings listing
     SET expires_at = NOW() + LEAST(
           GREATEST(
             coalesce(listing.expires_at - listing.published_at, INTERVAL '60 days'),
             INTERVAL '7 days'
           ),
           INTERVAL '90 days'
         ),
         renewal_count = listing.renewal_count + 1,
         last_renewed_at = NOW(),
         updated_at = NOW()
    FROM due
   WHERE listing.id = due.id
  RETURNING listing.id, listing.seller_id, listing.title::TEXT, listing.market_code, listing.expires_at;
$$;

REVOKE ALL ON FUNCTION public.renew_expiring_listings(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_expiring_listings(INTEGER, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Scheduled publication: a draft with a date, published by the worker
-- ---------------------------------------------------------------------------

CREATE INDEX listings_scheduled_publish_idx
  ON public.listings (scheduled_publish_at)
  WHERE status = 'draft' AND scheduled_publish_at IS NOT NULL;

-- Publishes drafts whose time has come, applying the same safety gate the
-- immediate path applies at submission. The expiry was set at submission
-- from the scheduled date, so only the publication timestamps move here.
CREATE OR REPLACE FUNCTION public.publish_scheduled_listings(
  p_limit INTEGER DEFAULT 500
)
RETURNS TABLE (id UUID, seller_id UUID, title TEXT, market_code VARCHAR, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT listing.id
      FROM public.listings listing
     WHERE listing.status = 'draft'
       AND listing.scheduled_publish_at IS NOT NULL
       AND listing.scheduled_publish_at <= NOW()
     ORDER BY listing.scheduled_publish_at
     LIMIT LEAST(GREATEST(coalesce(p_limit, 500), 1), 5000)
     FOR UPDATE SKIP LOCKED
  ),
  published AS (
    UPDATE public.listings listing
       SET status = CASE
             WHEN coalesce(listing.safety_risk_score, 0) >= 50 THEN 'flagged'::public.listing_status
             ELSE 'published'::public.listing_status
           END,
           published_at = NOW(),
           organic_freshness_at = NOW(),
           scheduled_publish_at = NULL,
           updated_at = NOW()
      FROM due
     WHERE listing.id = due.id
    RETURNING listing.id, listing.seller_id, listing.title, listing.market_code, listing.status
  ),
  activated AS (
    UPDATE public.listing_market_publications publication
       SET status = 'active',
           published_at = NOW(),
           sort_date = NOW(),
           updated_at = NOW()
      FROM published
     WHERE publication.listing_id = published.id
       AND publication.status = 'draft'
       AND published.status = 'published'
    RETURNING publication.listing_id
  )
  SELECT published.id, published.seller_id, published.title::TEXT,
         published.market_code, published.status::TEXT
    FROM published;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_scheduled_listings(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_scheduled_listings(INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Away mode: the seller's publications pause and resume together
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN away_until TIMESTAMPTZ,
  ADD COLUMN away_message VARCHAR(300),
  ADD CONSTRAINT profiles_away_message_needs_until CHECK (
    away_message IS NULL OR away_until IS NOT NULL
  );

CREATE INDEX profiles_away_until_idx
  ON public.profiles (away_until)
  WHERE away_until IS NOT NULL;

-- The absence is a public fact the seller chose to publish: buyers see it on
-- the profile, the listing and in the conversation instead of waiting.
GRANT SELECT (away_until, away_message) ON public.profiles TO anon, authenticated;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true, security_barrier = true)
AS
SELECT id, slug, name, avatar_url, city, country, bio, account_family,
       professional_vertical, is_verified, is_business_verified,
       rating, review_count, response_rate_percent, response_time_text, created_at,
       away_until, away_message
FROM public.profiles
WHERE public.is_public_marketplace_profile(id)
  AND public.is_customer_marketplace_actor();

-- Only publications paused *for* the absence resume with it; a publication
-- paused for any other reason stays paused.
ALTER TABLE public.listing_market_publications
  ADD COLUMN paused_reason VARCHAR(40)
    CHECK (paused_reason IS NULL OR paused_reason IN ('seller_away'));

CREATE OR REPLACE FUNCTION public.set_seller_away(
  p_user_id UUID,
  p_until TIMESTAMPTZ,
  p_message TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_paused INTEGER;
BEGIN
  IF p_until IS NULL OR p_until <= NOW() OR p_until > NOW() + INTERVAL '90 days' THEN
    RAISE EXCEPTION 'invalid away window' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.profiles
     SET away_until = p_until,
         away_message = NULLIF(btrim(coalesce(p_message, '')), ''),
         updated_at = NOW()
   WHERE id = p_user_id;
  UPDATE public.listing_market_publications publication
     SET status = 'paused',
         paused_reason = 'seller_away',
         updated_at = NOW()
    FROM public.listings listing
   WHERE listing.id = publication.listing_id
     AND listing.seller_id = p_user_id
     AND listing.status = 'published'
     AND publication.status = 'active';
  GET DIAGNOSTICS v_paused = ROW_COUNT;
  RETURN v_paused;
END;
$$;

REVOKE ALL ON FUNCTION public.set_seller_away(UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_seller_away(UUID, TIMESTAMPTZ, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.clear_seller_away(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_resumed INTEGER;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.profiles
     SET away_until = NULL,
         away_message = NULL,
         updated_at = NOW()
   WHERE id = p_user_id
     AND (away_until IS NOT NULL OR away_message IS NOT NULL);
  UPDATE public.listing_market_publications publication
     SET status = 'active',
         paused_reason = NULL,
         updated_at = NOW()
    FROM public.listings listing
   WHERE listing.id = publication.listing_id
     AND listing.seller_id = p_user_id
     AND publication.status = 'paused'
     AND publication.paused_reason = 'seller_away';
  GET DIAGNOSTICS v_resumed = ROW_COUNT;
  RETURN v_resumed;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_seller_away(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_seller_away(UUID) TO service_role;

-- The worker's pass: everyone whose absence has ended comes back.
CREATE OR REPLACE FUNCTION public.resume_returned_sellers(p_limit INTEGER DEFAULT 200)
RETURNS TABLE (user_id UUID, resumed_publications INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID;
BEGIN
  FOR v_user IN
    SELECT profile.id FROM public.profiles profile
     WHERE profile.away_until IS NOT NULL AND profile.away_until <= NOW()
     ORDER BY profile.away_until
     LIMIT LEAST(GREATEST(coalesce(p_limit, 200), 1), 2000)
  LOOP
    user_id := v_user;
    resumed_publications := public.clear_seller_away(v_user);
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.resume_returned_sellers(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resume_returned_sellers(INTEGER) TO service_role;
