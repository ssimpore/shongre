-- Automotive expand phase matching generic market favorites. Keep the legacy
-- table/RPC available to draining backend instances; new callers use only the
-- scoped table and read RPC introduced here.

BEGIN;

-- Install lifecycle cleanup before the quarantine snapshot. This closes the
-- window in which a concurrent vehicle deletion could otherwise leave a newly
-- inserted polymorphic review record without an owning resource.
CREATE OR REPLACE FUNCTION public.purge_auto_favorite_scope_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  DELETE FROM public.favorite_market_scope_review review
  WHERE review.favorite_kind = 'auto_vehicle'
    AND review.resource_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS purge_auto_favorite_scope_review_trigger
  ON public.auto_vehicles;
CREATE TRIGGER purge_auto_favorite_scope_review_trigger
AFTER DELETE ON public.auto_vehicles
FOR EACH ROW
EXECUTE FUNCTION public.purge_auto_favorite_scope_review();

REVOKE ALL ON FUNCTION public.purge_auto_favorite_scope_review()
  FROM PUBLIC, anon, authenticated;

-- Hold legacy writers until this transaction atomically publishes the scoped
-- RPCs and compatibility wrapper, so no old-node mutation can miss the
-- quarantine snapshot.
LOCK TABLE public.auto_vehicle_favorites IN SHARE MODE;

WITH favorite_candidates AS (
  SELECT
    favorite.user_id,
    favorite.vehicle_id,
    favorite.created_at,
    ARRAY(
      SELECT DISTINCT UPPER(BTRIM(candidate.market_code))
      FROM UNNEST(COALESCE(vehicle.market_codes, ARRAY[]::TEXT[]))
        AS candidate(market_code)
      WHERE UPPER(BTRIM(candidate.market_code)) ~ '^[A-Z]{2}$'
      ORDER BY UPPER(BTRIM(candidate.market_code))
    ) AS market_codes
  FROM public.auto_vehicle_favorites favorite
  JOIN public.auto_vehicles vehicle ON vehicle.id = favorite.vehicle_id
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
  'auto_vehicle',
  user_id,
  vehicle_id,
  created_at,
  market_codes,
  'market_action_provenance_missing'
FROM favorite_candidates
ON CONFLICT (favorite_kind, user_id, resource_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.auto_vehicle_market_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.auto_vehicles(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, vehicle_id, market_code)
);

CREATE INDEX IF NOT EXISTS auto_vehicle_market_favorites_account_created_idx
  ON public.auto_vehicle_market_favorites
    (user_id, market_code, created_at DESC, vehicle_id);

ALTER TABLE public.auto_vehicle_market_favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auto_vehicle_market_favorites
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.auto_vehicle_market_favorites TO service_role;
REVOKE ALL ON TABLE public.auto_vehicle_favorites
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.auto_vehicle_favorites TO service_role;

CREATE OR REPLACE FUNCTION public.list_favorite_auto_vehicle_ids(
  p_user_id UUID,
  p_market_code VARCHAR
)
RETURNS TABLE(vehicle_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT favorite.vehicle_id
  FROM public.auto_vehicle_market_favorites favorite
  WHERE favorite.user_id = p_user_id
    AND favorite.market_code = UPPER(BTRIM(p_market_code))
  ORDER BY favorite.created_at DESC, favorite.vehicle_id;
$$;

CREATE OR REPLACE FUNCTION public.set_auto_vehicle_favorite(
  p_user_id UUID,
  p_vehicle_id UUID,
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
      'auto-favorite:' || p_user_id::TEXT || ':' || p_vehicle_id::TEXT,
      0
    )
  );

  IF p_is_favorite AND NOT EXISTS (
    SELECT 1
    FROM public.auto_vehicle_market_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.vehicle_id = p_vehicle_id
      AND favorite.market_code = normalized_market_code
  ) THEN
    PERFORM 1
    FROM public.auto_vehicles vehicle
    WHERE vehicle.id = p_vehicle_id
      AND EXISTS (
        SELECT 1
        FROM UNNEST(COALESCE(vehicle.market_codes, ARRAY[]::TEXT[]))
          candidate(market_code)
        WHERE UPPER(BTRIM(candidate.market_code)) = normalized_market_code
      )
      AND vehicle.lifecycle = 'published'
      AND vehicle.moderation_status = 'approved'
    FOR SHARE OF vehicle;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Vehicle is unavailable in the requested market'
        USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.auto_vehicle_market_favorites (
      user_id,
      vehicle_id,
      market_code
    ) VALUES (
      p_user_id,
      p_vehicle_id,
      normalized_market_code
    ) ON CONFLICT (user_id, vehicle_id, market_code) DO NOTHING;
  ELSIF NOT p_is_favorite THEN
    DELETE FROM public.auto_vehicle_market_favorites
    WHERE user_id = p_user_id
      AND vehicle_id = p_vehicle_id
      AND market_code = normalized_market_code;
  END IF;

  IF p_is_favorite THEN
    INSERT INTO public.auto_vehicle_favorites (user_id, vehicle_id)
    VALUES (p_user_id, p_vehicle_id)
    ON CONFLICT (user_id, vehicle_id) DO NOTHING;
  ELSIF NOT EXISTS (
    SELECT 1
    FROM public.auto_vehicle_market_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.vehicle_id = p_vehicle_id
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.favorite_market_scope_review review
    WHERE review.favorite_kind = 'auto_vehicle'
      AND review.user_id = p_user_id
      AND review.resource_id = p_vehicle_id
  ) THEN
    DELETE FROM public.auto_vehicle_favorites
    WHERE user_id = p_user_id AND vehicle_id = p_vehicle_id;
  END IF;

  RETURN p_is_favorite;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_auto_vehicle_favorite(
  p_user_id UUID,
  p_vehicle_id UUID
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
  SELECT MIN(UPPER(BTRIM(candidate.market_code)))
    INTO resolved_market_code
  FROM public.auto_vehicles vehicle
  CROSS JOIN LATERAL UNNEST(
    COALESCE(vehicle.market_codes, ARRAY[]::TEXT[])
  ) candidate(market_code)
  WHERE vehicle.id = p_vehicle_id
    AND vehicle.lifecycle = 'published'
    AND vehicle.moderation_status = 'approved'
    AND UPPER(BTRIM(candidate.market_code)) ~ '^[A-Z]{2}$'
  HAVING COUNT(DISTINCT UPPER(BTRIM(candidate.market_code))) = 1;

  IF resolved_market_code IS NULL THEN
    RAISE EXCEPTION 'Favorite market cannot be resolved unambiguously'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'auto-favorite:' || p_user_id::TEXT || ':' || p_vehicle_id::TEXT,
      0
    )
  );
  desired_state := NOT EXISTS (
    SELECT 1 FROM public.auto_vehicle_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.vehicle_id = p_vehicle_id
  );
  PERFORM public.set_auto_vehicle_favorite(
    p_user_id,
    p_vehicle_id,
    resolved_market_code,
    desired_state
  );
  IF NOT desired_state AND NOT EXISTS (
    SELECT 1
    FROM public.auto_vehicle_market_favorites favorite
    WHERE favorite.user_id = p_user_id
      AND favorite.vehicle_id = p_vehicle_id
  ) THEN
    DELETE FROM public.auto_vehicle_favorites
    WHERE user_id = p_user_id AND vehicle_id = p_vehicle_id;
    DELETE FROM public.favorite_market_scope_review
    WHERE favorite_kind = 'auto_vehicle'
      AND user_id = p_user_id
      AND resource_id = p_vehicle_id;
  END IF;
  RETURN desired_state;
END;
$$;

REVOKE ALL ON FUNCTION public.list_favorite_auto_vehicle_ids(UUID, VARCHAR)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_auto_vehicle_favorite(UUID, UUID, VARCHAR, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_auto_vehicle_favorite(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_favorite_auto_vehicle_ids(UUID, VARCHAR)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_auto_vehicle_favorite(UUID, UUID, VARCHAR, BOOLEAN)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_auto_vehicle_favorite(UUID, UUID)
  TO service_role;

COMMENT ON TABLE public.auto_vehicle_market_favorites IS
  'Authoritative automotive favorites partitioned by action market.';

COMMIT;
