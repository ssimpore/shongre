-- Expand phase for market-scoped favorites. The legacy public.favorites table
-- remains intact while old backend instances are draining; new code reads and
-- writes the scoped table only. A later contract migration may retire the
-- compatibility table after every caller has moved to the scoped RPCs.

CREATE TABLE IF NOT EXISTS public.favorite_market_scope_review (
  favorite_kind TEXT NOT NULL CHECK (
    favorite_kind IN ('listing', 'auto_vehicle')
  ),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  original_created_at TIMESTAMPTZ NOT NULL,
  candidate_market_codes TEXT[] NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL CHECK (reason = 'market_action_provenance_missing'),
  quarantined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (favorite_kind, user_id, resource_id)
);

ALTER TABLE public.favorite_market_scope_review ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.favorite_market_scope_review
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.favorite_market_scope_review TO service_role;

-- The quarantine is polymorphic and cannot carry two resource foreign keys.
-- Mirror the listing's lifecycle explicitly so review metadata does not retain
-- a deleted resource identifier indefinitely.
CREATE OR REPLACE FUNCTION public.purge_listing_favorite_scope_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  DELETE FROM public.favorite_market_scope_review review
  WHERE review.favorite_kind = 'listing'
    AND review.resource_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS purge_listing_favorite_scope_review_trigger
  ON public.listings;
CREATE TRIGGER purge_listing_favorite_scope_review_trigger
AFTER DELETE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.purge_listing_favorite_scope_review();

REVOKE ALL ON FUNCTION public.purge_listing_favorite_scope_review()
  FROM PUBLIC, anon, authenticated;

-- The original action did not record a market. Current publication membership
-- is mutable and cannot prove where the user saved the listing, so no scoped
-- favorite is invented. Preserve a private review record and leave the legacy
-- row available only to old backend instances during the expand window.
-- Hold legacy writers until this transaction atomically publishes the scoped
-- RPCs and compatibility wrapper, so no old-node mutation can miss the
-- quarantine snapshot.
LOCK TABLE public.favorites IN SHARE MODE;

WITH favorite_candidates AS (
  SELECT
    favorite.user_id,
    favorite.listing_id,
    favorite.created_at,
    ARRAY(
      SELECT DISTINCT candidate.market_code
      FROM (
        SELECT UPPER(BTRIM(listing.market_code)) AS market_code
        UNION ALL
        SELECT UPPER(BTRIM(publication.market_code)) AS market_code
        FROM public.listing_market_publications publication
        WHERE publication.listing_id = favorite.listing_id
      ) candidate
      WHERE candidate.market_code ~ '^[A-Z]{2}$'
      ORDER BY candidate.market_code
    ) AS market_codes
  FROM public.favorites favorite
  JOIN public.listings listing ON listing.id = favorite.listing_id
)
INSERT INTO public.favorite_market_scope_review (
  favorite_kind,
  user_id,
  resource_id,
  original_created_at,
  candidate_market_codes,
  reason
)
SELECT
  'listing',
  user_id,
  listing_id,
  created_at,
  market_codes,
  'market_action_provenance_missing'
FROM favorite_candidates
ON CONFLICT (favorite_kind, user_id, resource_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.listing_market_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id, market_code)
);

CREATE INDEX IF NOT EXISTS listing_market_favorites_account_created_idx
  ON public.listing_market_favorites
    (user_id, market_code, created_at DESC, listing_id);

ALTER TABLE public.listing_market_favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.listing_market_favorites
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.listing_market_favorites TO service_role;
-- The legacy table remains a service-role compatibility mirror only.
REVOKE ALL ON TABLE public.favorites FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.favorites TO service_role;

CREATE OR REPLACE FUNCTION public.list_favorite_listing_ids(
  p_user_id UUID,
  p_market_code VARCHAR
)
RETURNS TABLE(listing_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT favorite.listing_id
  FROM public.listing_market_favorites favorite
  WHERE favorite.user_id = p_user_id
    AND favorite.market_code = UPPER(BTRIM(p_market_code))
  ORDER BY favorite.created_at DESC, favorite.listing_id;
$$;

CREATE OR REPLACE FUNCTION public.set_favorite(
  p_user_id UUID,
  p_listing_id UUID,
  p_market_code VARCHAR,
  p_is_favorite BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  normalized_market_code VARCHAR(2) := UPPER(BTRIM(p_market_code));
BEGIN
  IF p_market_code IS NULL
     OR normalized_market_code !~ '^[A-Z]{2}$'
     OR p_is_favorite IS NULL THEN
    RAISE EXCEPTION 'Invalid favorite state or market code'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'favorite:' || p_user_id::TEXT || ':' || p_listing_id::TEXT,
      0
    )
  );

  IF p_is_favorite AND NOT EXISTS (
    SELECT 1
    FROM public.listing_market_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.listing_id = p_listing_id
      AND favorite.market_code = normalized_market_code
  ) THEN
    PERFORM 1
    FROM public.listing_market_publications publication
    JOIN public.listings listing ON listing.id = publication.listing_id
    WHERE publication.listing_id = p_listing_id
      AND publication.market_code = normalized_market_code
      AND publication.status = 'active'
      AND publication.compliance_state = 'approved'
      AND listing.status IN ('published', 'reserved', 'sold')
    FOR SHARE OF publication, listing;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Listing is unavailable in the requested market'
        USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.listing_market_favorites (
      user_id,
      listing_id,
      market_code
    ) VALUES (
      p_user_id,
      p_listing_id,
      normalized_market_code
    ) ON CONFLICT (user_id, listing_id, market_code) DO NOTHING;
  ELSIF NOT p_is_favorite THEN
    DELETE FROM public.listing_market_favorites
    WHERE user_id = p_user_id
      AND listing_id = p_listing_id
      AND market_code = normalized_market_code;
  END IF;

  -- Compatibility mirror for backend instances that still read favorites.
  -- Never delete an unproven legacy row from a new market-scoped request.
  IF p_is_favorite THEN
    INSERT INTO public.favorites (user_id, listing_id)
    VALUES (p_user_id, p_listing_id)
    ON CONFLICT (user_id, listing_id) DO NOTHING;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM public.listing_market_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.listing_id = p_listing_id
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.favorite_market_scope_review review
    WHERE review.favorite_kind = 'listing'
      AND review.user_id = p_user_id
      AND review.resource_id = p_listing_id
  ) THEN
    DELETE FROM public.favorites
    WHERE user_id = p_user_id AND listing_id = p_listing_id;
  END IF;

  RETURN p_is_favorite;
END;
$$;

-- Compatibility write path for old backend instances. It deliberately fails
-- closed for multi-market listings because the old call carries no market.
CREATE OR REPLACE FUNCTION public.toggle_favorite(
  p_user_id UUID,
  p_listing_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  resolved_market_code VARCHAR(2);
  desired_state BOOLEAN;
BEGIN
  SELECT MIN(publication.market_code)
    INTO resolved_market_code
  FROM public.listing_market_publications publication
  JOIN public.listings listing ON listing.id = publication.listing_id
  WHERE publication.listing_id = p_listing_id
    AND publication.status = 'active'
    AND publication.compliance_state = 'approved'
    AND listing.status IN ('published', 'reserved', 'sold')
  HAVING COUNT(DISTINCT publication.market_code) = 1;

  IF resolved_market_code IS NULL THEN
    RAISE EXCEPTION 'Favorite market cannot be resolved unambiguously'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'favorite:' || p_user_id::TEXT || ':' || p_listing_id::TEXT,
      0
    )
  );
  desired_state := NOT EXISTS (
    SELECT 1 FROM public.favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.listing_id = p_listing_id
  );
  PERFORM public.set_favorite(
    p_user_id,
    p_listing_id,
    resolved_market_code,
    desired_state
  );
  IF NOT desired_state AND NOT EXISTS (
    SELECT 1
    FROM public.listing_market_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.listing_id = p_listing_id
  ) THEN
    DELETE FROM public.favorites
    WHERE user_id = p_user_id AND listing_id = p_listing_id;
    DELETE FROM public.favorite_market_scope_review
    WHERE favorite_kind = 'listing'
      AND user_id = p_user_id
      AND resource_id = p_listing_id;
  END IF;
  RETURN desired_state;
END;
$$;

REVOKE ALL ON FUNCTION public.list_favorite_listing_ids(UUID, VARCHAR)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_favorite(UUID, UUID, VARCHAR, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_favorite(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_favorite_listing_ids(UUID, VARCHAR)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_favorite(UUID, UUID, VARCHAR, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_favorite(UUID, UUID)
  TO service_role;

COMMENT ON TABLE public.listing_market_favorites IS
  'Authoritative account favorites partitioned by the market in which the action occurred.';
COMMENT ON TABLE public.favorite_market_scope_review IS
  'Private quarantine for legacy favorites whose action market cannot be proven; rows require explicit operator review before restoration.';
