-- Durable, privacy-safe URL freshness notifications for IndexNow. Database
-- triggers cover publication state, meaningful public content changes, sales,
-- expiry and removal regardless of which backend command caused the change.

CREATE TABLE public.indexnow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key VARCHAR(255) NOT NULL UNIQUE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  canonical_path VARCHAR(1000) NOT NULL
    CHECK (
      canonical_path LIKE '/%'
      AND canonical_path NOT LIKE '//%'
      AND position('?' IN canonical_path) = 0
      AND position('#' IN canonical_path) = 0
    ),
  event_type VARCHAR(24) NOT NULL
    CHECK (event_type IN ('published', 'updated', 'sold', 'expired', 'removed')),
  content_updated_at TIMESTAMPTZ NOT NULL,
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

CREATE INDEX indexnow_events_claim_idx
  ON public.indexnow_events (available_at, created_at, id)
  WHERE status IN ('PENDING', 'FAILED', 'PROCESSING');

CREATE INDEX indexnow_events_retention_idx
  ON public.indexnow_events (completed_at, id)
  WHERE status = 'COMPLETED';

CREATE OR REPLACE FUNCTION public.enqueue_indexnow_listing_event(
  p_listing_id UUID,
  p_market_code TEXT,
  p_event_type TEXT,
  p_occurred_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_path TEXT;
  v_version TIMESTAMPTZ := COALESCE(p_occurred_at, NOW());
BEGIN
  SELECT CASE
    WHEN listing.attributes->>'canonicalPath' LIKE '/%'
      AND listing.attributes->>'canonicalPath' NOT LIKE '//%'
      AND position('?' IN listing.attributes->>'canonicalPath') = 0
      AND position('#' IN listing.attributes->>'canonicalPath') = 0
      THEN listing.attributes->>'canonicalPath'
    ELSE '/annonce/' || listing.id::TEXT
  END
  INTO v_path
  FROM public.listings AS listing
  WHERE listing.id = p_listing_id;

  IF v_path IS NULL THEN RETURN; END IF;

  INSERT INTO public.indexnow_events (
    event_key,
    listing_id,
    market_code,
    canonical_path,
    event_type,
    content_updated_at
  ) VALUES (
    concat(
      p_listing_id,
      ':', upper(p_market_code),
      ':', p_event_type,
      ':', extract(epoch FROM v_version),
      ':', md5(v_path)
    ),
    p_listing_id,
    upper(p_market_code),
    v_path,
    p_event_type,
    v_version
  ) ON CONFLICT (event_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_indexnow_publication_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' AND NEW.compliance_state = 'approved' THEN
      v_event_type := 'published';
    END IF;
  ELSIF OLD.status = 'active' AND OLD.compliance_state = 'approved'
      AND (NEW.status <> 'active' OR NEW.compliance_state <> 'approved') THEN
    v_event_type := CASE WHEN NEW.status = 'expired' THEN 'expired' ELSE 'removed' END;
  ELSIF NEW.status = 'active' AND NEW.compliance_state = 'approved'
      AND (OLD.status <> 'active' OR OLD.compliance_state <> 'approved') THEN
    v_event_type := 'published';
  ELSIF NEW.status = 'active' AND NEW.compliance_state = 'approved'
      AND (
        OLD.price_minor IS DISTINCT FROM NEW.price_minor
        OR OLD.currency IS DISTINCT FROM NEW.currency
        OR OLD.localized_content IS DISTINCT FROM NEW.localized_content
      ) THEN
    v_event_type := 'updated';
  END IF;

  IF v_event_type IS NOT NULL THEN
    PERFORM public.enqueue_indexnow_listing_event(
      NEW.listing_id,
      NEW.market_code,
      v_event_type,
      NEW.updated_at
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER capture_indexnow_publication_event
  AFTER INSERT OR UPDATE OF status, compliance_state, price_minor, currency, localized_content
  ON public.listing_market_publications
  FOR EACH ROW EXECUTE FUNCTION public.capture_indexnow_publication_event();

CREATE OR REPLACE FUNCTION public.capture_indexnow_listing_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  publication RECORD;
  v_event_type TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    FOR publication IN
      SELECT market_code
      FROM public.listing_market_publications
      WHERE listing_id = OLD.id
        AND status = 'active'
        AND compliance_state = 'approved'
    LOOP
      PERFORM public.enqueue_indexnow_listing_event(
        OLD.id,
        publication.market_code,
        'removed',
        NOW()
      );
    END LOOP;
    RETURN OLD;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_event_type := CASE
      WHEN NEW.status = 'sold' THEN 'sold'
      WHEN NEW.status = 'archived' AND NEW.expires_at <= NOW() THEN 'expired'
      WHEN NEW.status = 'published' THEN 'published'
      ELSE 'removed'
    END;
  ELSIF OLD.title IS DISTINCT FROM NEW.title
      OR OLD.description IS DISTINCT FROM NEW.description
      OR OLD.condition IS DISTINCT FROM NEW.condition
      OR OLD.attributes IS DISTINCT FROM NEW.attributes
      OR OLD.materially_updated_at IS DISTINCT FROM NEW.materially_updated_at THEN
    v_event_type := 'updated';
  END IF;

  IF v_event_type IS NOT NULL THEN
    FOR publication IN
      SELECT market_code
      FROM public.listing_market_publications
      WHERE listing_id = NEW.id
        AND status = 'active'
        AND compliance_state = 'approved'
    LOOP
      PERFORM public.enqueue_indexnow_listing_event(
        NEW.id,
        publication.market_code,
        v_event_type,
        COALESCE(NEW.materially_updated_at, NEW.updated_at, NOW())
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER capture_indexnow_listing_event
  AFTER UPDATE OF status, title, description, condition, attributes, materially_updated_at
  ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.capture_indexnow_listing_event();

CREATE TRIGGER capture_indexnow_listing_delete_event
  BEFORE DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.capture_indexnow_listing_event();

CREATE OR REPLACE FUNCTION public.claim_indexnow_events(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 1000,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS SETOF public.indexnow_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT event.id
    FROM public.indexnow_events AS event
    WHERE event.available_at <= NOW()
      AND (
        event.status IN ('PENDING', 'FAILED')
        OR (
          event.status = 'PROCESSING'
          AND event.claimed_at < NOW() - make_interval(secs => GREATEST(30, p_lease_seconds))
        )
      )
    ORDER BY event.available_at, event.created_at, event.id
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(1000, p_limit))
  )
  UPDATE public.indexnow_events AS event
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

CREATE OR REPLACE FUNCTION public.complete_indexnow_event(
  p_event_id UUID,
  p_worker_id TEXT,
  p_success BOOLEAN,
  p_error_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.indexnow_events AS event
  SET status = CASE
        WHEN p_success THEN 'COMPLETED'
        WHEN event.attempt_count >= 8 THEN 'DEAD_LETTER'
        ELSE 'FAILED'
      END,
      completed_at = CASE
        WHEN p_success OR event.attempt_count >= 8 THEN NOW()
        ELSE NULL
      END,
      available_at = CASE
        WHEN p_success OR event.attempt_count >= 8 THEN event.available_at
        ELSE NOW() + make_interval(
          secs => LEAST(21600, 30 * (2 ^ LEAST(event.attempt_count, 9))::INTEGER)
        )
      END,
      last_error_code = left(p_error_code, 120),
      claimed_at = NULL,
      claimed_by = NULL
  WHERE event.id = p_event_id
    AND event.status = 'PROCESSING'
    AND event.claimed_by = p_worker_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_completed_indexnow_events(
  p_retention_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 1000
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  WITH candidates AS (
    SELECT event.id
    FROM public.indexnow_events AS event
    WHERE event.status = 'COMPLETED'
      AND event.completed_at < NOW() - make_interval(days => GREATEST(1, p_retention_days))
    ORDER BY event.completed_at, event.id
    LIMIT GREATEST(1, LEAST(5000, p_limit))
  )
  DELETE FROM public.indexnow_events AS event
  USING candidates
  WHERE event.id = candidates.id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

ALTER TABLE public.indexnow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indexnow_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.indexnow_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indexnow_events TO service_role;

REVOKE ALL ON FUNCTION public.enqueue_indexnow_listing_event(UUID, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_indexnow_events(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_indexnow_event(UUID, TEXT, BOOLEAN, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_completed_indexnow_events(INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_indexnow_listing_event(UUID, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_indexnow_events(TEXT, INTEGER, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_indexnow_event(UUID, TEXT, BOOLEAN, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_completed_indexnow_events(INTEGER, INTEGER)
  TO service_role;

COMMENT ON TABLE public.indexnow_events IS
  'Durable, market-scoped public URL freshness events. Contains no listing body, seller data, credentials or private URLs.';
