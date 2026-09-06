-- Delivery request favorites are authoritative per account and action market.
-- Unlike older vertical favorite stores, this table starts scoped and needs no
-- inferred legacy backfill.

ALTER TABLE public.delivery_requests
  ADD CONSTRAINT delivery_requests_id_market_code_key
  UNIQUE (id, market_code);

CREATE TABLE public.delivery_request_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, request_id, market_code),
  CONSTRAINT delivery_request_favorites_request_market_fkey
    FOREIGN KEY (request_id, market_code)
    REFERENCES public.delivery_requests(id, market_code)
    ON DELETE CASCADE
);

CREATE INDEX delivery_request_favorites_account_created_idx
  ON public.delivery_request_favorites
    (user_id, market_code, created_at DESC, request_id);

CREATE INDEX delivery_request_favorites_request_market_idx
  ON public.delivery_request_favorites (request_id, market_code);

ALTER TABLE public.delivery_request_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_request_favorites FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.delivery_request_favorites
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.delivery_request_favorites TO service_role;

-- Account deletion is a multi-step backend workflow: prepare first validates
-- delivery invariants and redacts vertical data, then complete anonymizes the
-- profile. Purge in both steps so a successful prepare removes current rows and
-- the final profile transition closes the gap against concurrent additions.
CREATE OR REPLACE FUNCTION public.prepare_delivery_account_deletion(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.delivery_requests request
    LEFT JOIN public.delivery_applications application
      ON application.id = request.selected_application_id
    WHERE (request.requester_id = p_user_id OR application.courier_user_id = p_user_id)
      AND request.status NOT IN ('completed', 'cancelled', 'expired')
  ) THEN
    RAISE EXCEPTION 'DELIVERY_ACTIVE_ASSIGNMENT' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.delivery_request_favorites favorite
  WHERE favorite.user_id = p_user_id;

  UPDATE public.delivery_courier_profiles
  SET status = 'inactive', opportunity_notifications = FALSE,
      availability_note = NULL, updated_at = NOW()
  WHERE user_id = p_user_id;

  UPDATE public.delivery_applications
  SET status = CASE WHEN status = 'submitted' THEN 'withdrawn' ELSE status END,
      availability_note = 'Indisponible', message = 'Candidature anonymisée',
      updated_at = NOW()
  WHERE courier_user_id = p_user_id;

  DELETE FROM public.delivery_request_stops stop
  USING public.delivery_requests request
  LEFT JOIN public.delivery_applications application
    ON application.id = request.selected_application_id
  WHERE stop.request_id = request.id
    AND request.status IN ('completed', 'cancelled', 'expired')
    AND (request.requester_id = p_user_id OR application.courier_user_id = p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_delivery_request_favorites_on_account_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  DELETE FROM public.delivery_request_favorites favorite
  WHERE favorite.user_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER purge_delivery_request_favorites_on_account_deletion_trigger
AFTER UPDATE OF status ON public.profiles
FOR EACH ROW
WHEN (NEW.status = 'deleted' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.purge_delivery_request_favorites_on_account_deletion();

REVOKE ALL ON FUNCTION public.prepare_delivery_account_deletion(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_delivery_account_deletion(UUID)
  TO service_role;
REVOKE ALL ON FUNCTION public.purge_delivery_request_favorites_on_account_deletion()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_favorite_delivery_request_ids(
  p_user_id UUID,
  p_market_code VARCHAR
)
RETURNS TABLE(request_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT favorite.request_id
  FROM public.delivery_request_favorites favorite
  WHERE favorite.user_id = p_user_id
    AND favorite.market_code = UPPER(BTRIM(p_market_code))
  ORDER BY favorite.created_at DESC, favorite.request_id;
$$;

CREATE OR REPLACE FUNCTION public.set_delivery_request_favorite(
  p_user_id UUID,
  p_request_id UUID,
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
      'delivery-favorite:' || p_user_id::TEXT || ':' || p_request_id::TEXT,
      0
    )
  );

  -- Removal remains available after expiry, suspension, or deletion so the
  -- caller can always converge its account state without restoring visibility.
  IF NOT p_is_favorite THEN
    DELETE FROM public.delivery_request_favorites
    WHERE user_id = p_user_id
      AND request_id = p_request_id
      AND market_code = normalized_market_code;
    RETURN FALSE;
  END IF;

  -- A SHARE row lock conflicts with the profile status update performed by
  -- complete_account_deletion. Whichever transaction wins, a deleted account
  -- cannot leave a favorite inserted after the deletion trigger has purged it.
  PERFORM 1
  FROM public.profiles profile
  WHERE profile.id = p_user_id
    AND profile.status = 'active'
  FOR SHARE OF profile;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Favorite account is unavailable'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1
  FROM public.delivery_requests request
  WHERE request.id = p_request_id
    AND request.market_code = normalized_market_code
    AND request.status = 'open'
    AND request.published_at IS NOT NULL
    AND request.expires_at > NOW()
  FOR SHARE OF request;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery request is unavailable in the requested market'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.delivery_request_favorites (
    user_id,
    request_id,
    market_code
  ) VALUES (
    p_user_id,
    p_request_id,
    normalized_market_code
  ) ON CONFLICT (user_id, request_id, market_code) DO NOTHING;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.list_favorite_delivery_request_ids(UUID, VARCHAR)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_delivery_request_favorite(UUID, UUID, VARCHAR, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_favorite_delivery_request_ids(UUID, VARCHAR)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.set_delivery_request_favorite(UUID, UUID, VARCHAR, BOOLEAN)
  TO service_role;

COMMENT ON TABLE public.delivery_request_favorites IS
  'Authoritative delivery-request favorites partitioned by account and action market.';
