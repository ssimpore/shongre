-- Listing engagement counters were declared in 00001 and never maintained:
-- `view_count` and `favorite_count` were written once at insert and read by the
-- seller workspace summary and the discovery quality signals, so both reported
-- zero for every listing in a real deployment.
--
-- Favourites have an authoritative table, so they are counted by trigger.
-- Views only exist as `listing_viewed` analytics events, so they are rolled up
-- incrementally from a durable watermark: a full recompute would lose history
-- the analytics retention policy prunes, and counting inside the listing
-- response would put a write on the read-critical path.

-- ---------------------------------------------------------------------------
-- Favourites: exact counts maintained by trigger
--
-- The trigger sits on the legacy `public.favorites` mirror rather than on the
-- authoritative `public.listing_market_favorites` deliberately: the counter is
-- one number per listing, and the mirror already holds exactly one row per
-- (user, listing) pair, so it de-duplicates a user who favourited the same
-- listing in two markets. `set_favorite` keeps both tables in step.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_listing_favorite_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.listings
       SET favorite_count = favorite_count + 1
     WHERE id = NEW.listing_id;
    RETURN NEW;
  END IF;

  UPDATE public.listings
     SET favorite_count = GREATEST(favorite_count - 1, 0)
   WHERE id = OLD.listing_id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_listing_favorite_count() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS favorites_maintain_listing_count ON public.favorites;
CREATE TRIGGER favorites_maintain_listing_count
  AFTER INSERT OR DELETE ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.sync_listing_favorite_count();

-- Reconcile the counter with the rows that already exist. Bounded by the
-- favourites table, which is small relative to the catalogue.
UPDATE public.listings l
   SET favorite_count = COALESCE(f.total, 0)
  FROM (
    SELECT listing_id, COUNT(*)::INTEGER AS total
      FROM public.favorites
     GROUP BY listing_id
  ) f
 WHERE l.id = f.listing_id
   AND l.favorite_count <> f.total;

UPDATE public.listings l
   SET favorite_count = 0
 WHERE l.favorite_count <> 0
   AND NOT EXISTS (SELECT 1 FROM public.favorites f WHERE f.listing_id = l.id);

-- ---------------------------------------------------------------------------
-- Views: incremental rollup from the analytics ledger
-- ---------------------------------------------------------------------------

CREATE TABLE public.listing_view_rollup_state (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  last_event_received_at TIMESTAMPTZ NOT NULL DEFAULT '-infinity',
  last_event_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.listing_view_rollup_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_view_rollup_state FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_view_rollup_state FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.listing_view_rollup_state TO service_role;

INSERT INTO public.listing_view_rollup_state (id) VALUES (TRUE)
  ON CONFLICT (id) DO NOTHING;

-- The rollup scans in (received_at, id) order from its watermark.
CREATE INDEX IF NOT EXISTS analytics_events_listing_view_rollup_idx
  ON public.analytics_events (received_at, id)
  WHERE event_name = 'listing_viewed'
    AND is_bot = FALSE
    AND is_test_traffic = FALSE;

CREATE OR REPLACE FUNCTION public.roll_up_listing_view_counts(
  p_limit INTEGER DEFAULT 5000
)
RETURNS TABLE (processed_events INTEGER, updated_listings INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_last_at TIMESTAMPTZ;
  v_last_id UUID;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50000 THEN
    RAISE EXCEPTION 'invalid listing view rollup limit' USING ERRCODE = '22023';
  END IF;

  -- One replica at a time. A second caller returns zero rather than waiting,
  -- so a slow rollup cannot pile up scheduled workers behind it.
  SELECT s.last_event_received_at, s.last_event_id
    INTO v_last_at, v_last_id
    FROM public.listing_view_rollup_state s
   WHERE s.id
     FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  RETURN QUERY
  WITH batch AS (
    SELECT a.id,
           a.received_at,
           NULLIF(TRIM(a.properties->>'listingId'), '') AS listing_id
      FROM public.analytics_events a
     WHERE a.event_name = 'listing_viewed'
       AND a.is_bot = FALSE
       AND a.is_test_traffic = FALSE
       AND (a.received_at, a.id) > (v_last_at, v_last_id)
     ORDER BY a.received_at, a.id
     LIMIT p_limit
  ),
  watermark AS (
    SELECT b.received_at, b.id
      FROM batch b
     ORDER BY b.received_at DESC, b.id DESC
     LIMIT 1
  ),
  deltas AS (
    -- A non-UUID identifier belongs to a fixture, not the catalogue; skipping
    -- it keeps one malformed event from aborting the whole batch.
    SELECT b.listing_id::UUID AS listing_id, COUNT(*)::INTEGER AS delta
      FROM batch b
     WHERE b.listing_id IS NOT NULL
       AND b.listing_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     GROUP BY 1
  ),
  applied AS (
    UPDATE public.listings l
       SET view_count = l.view_count + d.delta
      FROM deltas d
     WHERE l.id = d.listing_id
    RETURNING l.id
  ),
  advanced AS (
    UPDATE public.listing_view_rollup_state s
       SET last_event_received_at = w.received_at,
           last_event_id = w.id,
           updated_at = NOW()
      FROM watermark w
     WHERE s.id
    RETURNING s.id
  )
  SELECT (SELECT COUNT(*) FROM batch)::INTEGER,
         (SELECT COUNT(*) FROM applied)::INTEGER
    FROM advanced;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.roll_up_listing_view_counts(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.roll_up_listing_view_counts(INTEGER)
  TO service_role;

COMMENT ON FUNCTION public.roll_up_listing_view_counts(INTEGER) IS
  'Incrementally applies listing_viewed analytics events to listings.view_count from a durable watermark.';
