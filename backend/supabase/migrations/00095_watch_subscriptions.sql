-- Market-scoped customer watches and their durable evaluation pipeline.
-- Search filters are the only dynamic payload; ownership, target, cadence,
-- channels, price evidence, delivery state and market are explicit columns.

CREATE TABLE public.watch_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  target_type VARCHAR(24) NOT NULL
    CHECK (target_type IN ('listing_price', 'seller', 'saved_search')),
  target_key VARCHAR(200) NOT NULL CHECK (length(trim(target_key)) > 0),
  title VARCHAR(160) NOT NULL CHECK (length(trim(title)) > 0),
  search_filter JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(search_filter) = 'object'),
  baseline_price_minor BIGINT CHECK (baseline_price_minor IS NULL OR baseline_price_minor >= 0),
  currency VARCHAR(3) CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  frequency VARCHAR(16) NOT NULL
    CHECK (frequency IN ('immediate', 'daily', 'weekly')),
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(16) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused')),
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT watch_subscriptions_one_channel_check
    CHECK (in_app_enabled OR email_enabled OR push_enabled),
  CONSTRAINT watch_subscriptions_target_payload_check CHECK (
    (target_type = 'saved_search' AND search_filter <> '{}'::jsonb)
    OR (target_type <> 'saved_search' AND search_filter = '{}'::jsonb)
  ),
  CONSTRAINT watch_subscriptions_price_evidence_check CHECK (
    (target_type = 'listing_price' AND baseline_price_minor IS NOT NULL AND currency IS NOT NULL)
    OR (target_type <> 'listing_price' AND baseline_price_minor IS NULL AND currency IS NULL)
  ),
  UNIQUE (user_id, market_code, target_type, target_key)
);

CREATE INDEX watch_subscriptions_match_idx
  ON public.watch_subscriptions (market_code, target_type, target_key)
  WHERE status = 'active';

CREATE TRIGGER set_watch_subscriptions_updated_at
  BEFORE UPDATE ON public.watch_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.watch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key VARCHAR(255) NOT NULL UNIQUE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  event_type VARCHAR(32) NOT NULL
    CHECK (event_type IN ('listing_published', 'listing_price_changed')),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_price_minor BIGINT CHECK (previous_price_minor IS NULL OR previous_price_minor >= 0),
  current_price_minor BIGINT NOT NULL CHECK (current_price_minor >= 0),
  currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  claimed_by TEXT,
  completed_at TIMESTAMPTZ,
  last_error_code VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX watch_events_claim_idx
  ON public.watch_events (available_at, created_at, id)
  WHERE status IN ('PENDING', 'FAILED', 'PROCESSING');

CREATE TABLE public.watch_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.watch_subscriptions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.watch_events(id) ON DELETE CASCADE,
  due_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  claimed_at TIMESTAMPTZ,
  claimed_by TEXT,
  completed_at TIMESTAMPTZ,
  last_error_code VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, event_id)
);

CREATE INDEX watch_matches_claim_idx
  ON public.watch_matches (due_at, created_at, id)
  WHERE status IN ('PENDING', 'FAILED', 'PROCESSING');

CREATE OR REPLACE FUNCTION public.capture_listing_watch_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_seller_id UUID;
  v_event_type TEXT;
  v_previous_price BIGINT;
BEGIN
  IF NEW.status <> 'active' OR NEW.compliance_state <> 'approved' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR OLD.status <> 'active' OR OLD.compliance_state <> 'approved' THEN
    v_event_type := 'listing_published';
    v_previous_price := NULL;
  ELSIF OLD.price_minor IS DISTINCT FROM NEW.price_minor THEN
    v_event_type := 'listing_price_changed';
    v_previous_price := OLD.price_minor;
  ELSE
    RETURN NEW;
  END IF;

  SELECT listing.seller_id INTO v_seller_id
  FROM public.listings AS listing
  WHERE listing.id = NEW.listing_id;

  IF v_seller_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.watch_events (
    event_key, market_code, event_type, listing_id, seller_id,
    previous_price_minor, current_price_minor, currency
  ) VALUES (
    concat(NEW.listing_id, ':', NEW.market_code, ':', NEW.updated_at, ':', v_event_type, ':', NEW.price_minor),
    NEW.market_code, v_event_type, NEW.listing_id, v_seller_id,
    v_previous_price, NEW.price_minor, NEW.currency
  ) ON CONFLICT (event_key) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER capture_listing_watch_event
  AFTER INSERT OR UPDATE OF status, compliance_state, price_minor
  ON public.listing_market_publications
  FOR EACH ROW EXECUTE FUNCTION public.capture_listing_watch_event();

CREATE OR REPLACE FUNCTION public.evaluate_watch_event(p_event_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted INTEGER;
BEGIN
  INSERT INTO public.watch_matches (subscription_id, event_id, due_at)
  SELECT
    subscription.id,
    event.id,
    CASE subscription.frequency
      WHEN 'daily' THEN NOW() + INTERVAL '1 day'
      WHEN 'weekly' THEN NOW() + INTERVAL '7 days'
      ELSE NOW()
    END
  FROM public.watch_events AS event
  JOIN public.listings AS listing ON listing.id = event.listing_id
  JOIN public.watch_subscriptions AS subscription
    ON subscription.market_code = event.market_code
   AND subscription.status = 'active'
  WHERE event.id = p_event_id
    AND (
      (
        subscription.target_type = 'listing_price'
        AND event.event_type = 'listing_price_changed'
        AND subscription.target_key = event.listing_id::TEXT
        AND event.previous_price_minor IS NOT NULL
        AND event.current_price_minor < event.previous_price_minor
      )
      OR (
        subscription.target_type = 'seller'
        AND event.event_type = 'listing_published'
        AND subscription.target_key = event.seller_id::TEXT
      )
      OR (
        subscription.target_type = 'saved_search'
        AND event.event_type = 'listing_published'
        AND (
          NOT (subscription.search_filter ? 'query')
          OR position(
            lower(subscription.search_filter->>'query')
            IN lower(concat_ws(' ', listing.title, listing.description))
          ) > 0
        )
        AND (
          NOT (subscription.search_filter ? 'categoryId')
          OR EXISTS (
            WITH RECURSIVE category_ancestors AS (
              SELECT category.id, category.parent_id
              FROM public.categories AS category
              WHERE category.id = listing.category_id
              UNION
              SELECT parent.id, parent.parent_id
              FROM public.categories AS parent
              JOIN category_ancestors AS child ON child.parent_id = parent.id
            )
            SELECT 1
            FROM category_ancestors AS category
            WHERE category.id = subscription.search_filter->>'categoryId'
          )
        )
        AND (
          NOT (subscription.search_filter ? 'city')
          OR lower(listing.city) = lower(subscription.search_filter->>'city')
        )
        AND (
          NOT (subscription.search_filter ? 'minPriceMinor')
          OR event.current_price_minor >= (subscription.search_filter->>'minPriceMinor')::BIGINT
        )
        AND (
          NOT (subscription.search_filter ? 'maxPriceMinor')
          OR event.current_price_minor <= (subscription.search_filter->>'maxPriceMinor')::BIGINT
        )
      )
    )
  ON CONFLICT (subscription_id, event_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  UPDATE public.watch_subscriptions AS subscription
  SET baseline_price_minor = event.current_price_minor,
      currency = event.currency,
      updated_at = NOW()
  FROM public.watch_events AS event
  WHERE event.id = p_event_id
    AND event.event_type = 'listing_price_changed'
    AND subscription.market_code = event.market_code
    AND subscription.target_type = 'listing_price'
    AND subscription.target_key = event.listing_id::TEXT;

  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_watch_events(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 50,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS SETOF public.watch_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT event.id
    FROM public.watch_events AS event
    WHERE event.available_at <= NOW()
      AND (
        event.status IN ('PENDING', 'FAILED')
        OR (event.status = 'PROCESSING' AND event.claimed_at < NOW() - make_interval(secs => GREATEST(30, p_lease_seconds)))
      )
    ORDER BY event.available_at, event.created_at, event.id
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(200, p_limit))
  )
  UPDATE public.watch_events AS event
  SET status = 'PROCESSING',
      attempt_count = event.attempt_count + 1,
      claimed_at = NOW(),
      claimed_by = p_worker_id,
      last_error_code = NULL
  FROM candidates
  WHERE event.id = candidates.id
  RETURNING event.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_watch_event(
  p_event_id UUID,
  p_worker_id TEXT,
  p_success BOOLEAN,
  p_error_code TEXT DEFAULT NULL,
  p_retry_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.watch_events AS event
  SET status = CASE
        WHEN p_success THEN 'COMPLETED'
        WHEN event.attempt_count >= 10 THEN 'DEAD_LETTER'
        ELSE 'FAILED'
      END,
      completed_at = CASE WHEN p_success OR event.attempt_count >= 10 THEN NOW() ELSE NULL END,
      available_at = CASE
        WHEN p_success OR event.attempt_count >= 10 THEN event.available_at
        ELSE COALESCE(p_retry_at, NOW() + make_interval(secs => LEAST(21600, 30 * (2 ^ LEAST(event.attempt_count, 9))::INTEGER)))
      END,
      last_error_code = left(p_error_code, 120),
      claimed_at = NULL,
      claimed_by = NULL
  WHERE event.id = p_event_id
    AND event.status = 'PROCESSING'
    AND event.claimed_by = p_worker_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_watch_matches(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 50,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS SETOF public.watch_matches
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT match.id
    FROM public.watch_matches AS match
    JOIN public.watch_subscriptions AS subscription ON subscription.id = match.subscription_id
    WHERE match.due_at <= NOW()
      AND subscription.status = 'active'
      AND (
        match.status IN ('PENDING', 'FAILED')
        OR (match.status = 'PROCESSING' AND match.claimed_at < NOW() - make_interval(secs => GREATEST(30, p_lease_seconds)))
      )
    ORDER BY match.due_at, match.created_at, match.id
    FOR UPDATE OF match SKIP LOCKED
    LIMIT GREATEST(1, LEAST(200, p_limit))
  )
  UPDATE public.watch_matches AS match
  SET status = 'PROCESSING',
      attempt_count = match.attempt_count + 1,
      claimed_at = NOW(),
      claimed_by = p_worker_id,
      last_error_code = NULL
  FROM candidates
  WHERE match.id = candidates.id
  RETURNING match.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_watch_match(
  p_match_id UUID,
  p_worker_id TEXT,
  p_success BOOLEAN,
  p_error_code TEXT DEFAULT NULL,
  p_retry_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.watch_matches AS match
  SET status = CASE
        WHEN p_success THEN 'COMPLETED'
        WHEN match.attempt_count >= 10 THEN 'DEAD_LETTER'
        ELSE 'FAILED'
      END,
      completed_at = CASE WHEN p_success OR match.attempt_count >= 10 THEN NOW() ELSE NULL END,
      due_at = CASE
        WHEN p_success OR match.attempt_count >= 10 THEN match.due_at
        ELSE COALESCE(p_retry_at, NOW() + make_interval(secs => LEAST(21600, 30 * (2 ^ LEAST(match.attempt_count, 9))::INTEGER)))
      END,
      last_error_code = left(p_error_code, 120),
      claimed_at = NULL,
      claimed_by = NULL
  WHERE match.id = p_match_id
    AND match.status = 'PROCESSING'
    AND match.claimed_by = p_worker_id;
END;
$$;

ALTER TABLE public.watch_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.watch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.watch_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_matches FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.watch_subscriptions, public.watch_events, public.watch_matches
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.watch_subscriptions, public.watch_events, public.watch_matches
  TO service_role;

REVOKE ALL ON FUNCTION public.claim_watch_events(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_watch_event(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_watch_event(UUID, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_watch_matches(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_watch_match(UUID, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_watch_events(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_watch_event(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_watch_event(UUID, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_watch_matches(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_watch_match(UUID, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ) TO service_role;

COMMENT ON TABLE public.watch_subscriptions IS
  'Account-owned, market-scoped price, seller and saved-search alert policy.';
COMMENT ON TABLE public.watch_events IS
  'Durable market-preserving listing event outbox for watch evaluation.';
COMMENT ON TABLE public.watch_matches IS
  'Deduplicated scheduled notification matches; one row per subscription and event.';
