-- Discovery responses durably hand off analytics before returning. Worker
-- replicas lease these privacy-safe records and write the analytics table
-- idempotently, keeping event aggregation off the response-critical path.

CREATE TABLE public.discovery_search_event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE,
  market_code VARCHAR(2) NOT NULL,
  category_id VARCHAR(100),
  ranking_version VARCHAR(160) NOT NULL,
  applied_filter_keys TEXT[] NOT NULL DEFAULT '{}',
  organic_candidate_count INTEGER NOT NULL CHECK (organic_candidate_count >= 0),
  sponsored_candidate_count INTEGER NOT NULL CHECK (sponsored_candidate_count >= 0),
  duplicate_suppression_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_suppression_count >= 0),
  diversity_rerank_count INTEGER NOT NULL DEFAULT 0 CHECK (diversity_rerank_count >= 0),
  final_organic_count INTEGER NOT NULL CHECK (final_organic_count >= 0),
  final_sponsored_count INTEGER NOT NULL CHECK (final_sponsored_count >= 0),
  publisher_distribution JSONB NOT NULL DEFAULT '{}',
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'leased', 'retry', 'dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'leased' AND lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR (status <> 'leased' AND lease_owner IS NULL AND lease_expires_at IS NULL)
  )
);

CREATE INDEX discovery_search_event_outbox_ready_idx
  ON public.discovery_search_event_outbox (available_at, created_at, id)
  WHERE status IN ('pending', 'retry', 'leased');

ALTER TABLE public.discovery_search_event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_search_event_outbox FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.discovery_search_event_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discovery_search_event_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.claim_discovery_search_events(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 100,
  p_lease_seconds INTEGER DEFAULT 60
)
RETURNS SETOF public.discovery_search_event_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF LENGTH(TRIM(COALESCE(p_worker_id, ''))) < 3
     OR p_limit NOT BETWEEN 1 AND 200
     OR p_lease_seconds NOT BETWEEN 10 AND 900 THEN
    RAISE EXCEPTION 'invalid discovery event lease request' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT event.id
    FROM public.discovery_search_event_outbox AS event
    WHERE event.available_at <= NOW()
      AND (
        event.status IN ('pending', 'retry')
        OR (event.status = 'leased' AND event.lease_expires_at <= NOW())
      )
    ORDER BY event.available_at, event.created_at, event.id
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.discovery_search_event_outbox AS event
  SET status = 'leased',
      attempt_count = event.attempt_count + 1,
      lease_owner = p_worker_id,
      lease_expires_at = NOW() + make_interval(secs => p_lease_seconds),
      last_error_code = NULL,
      updated_at = NOW()
  FROM candidates
  WHERE event.id = candidates.id
  RETURNING event.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_discovery_search_event(
  p_event_id UUID,
  p_worker_id TEXT,
  p_success BOOLEAN,
  p_error_code TEXT DEFAULT NULL,
  p_retry_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_success THEN
    DELETE FROM public.discovery_search_event_outbox AS event
    WHERE event.id = p_event_id
      AND event.status = 'leased'
      AND event.lease_owner = p_worker_id;
  ELSE
    UPDATE public.discovery_search_event_outbox AS event
    SET status = CASE WHEN event.attempt_count >= 10 THEN 'dead_letter' ELSE 'retry' END,
        available_at = CASE
          WHEN event.attempt_count >= 10 THEN event.available_at
          ELSE COALESCE(
            p_retry_at,
            NOW() + make_interval(secs => LEAST(21600, 30 * (2 ^ LEAST(event.attempt_count, 9))::INTEGER))
          )
        END,
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error_code = LEFT(COALESCE(p_error_code, 'DISCOVERY_EVENT_WRITE_FAILED'), 120),
        updated_at = NOW()
    WHERE event.id = p_event_id
      AND event.status = 'leased'
      AND event.lease_owner = p_worker_id;
  END IF;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_discovery_search_events(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_discovery_search_event(UUID, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_discovery_search_events(TEXT, INTEGER, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_discovery_search_event(UUID, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ)
  TO service_role;

COMMENT ON TABLE public.discovery_search_event_outbox IS
  'Privacy-safe durable handoff for discovery analytics; failures remain visible as retry or dead_letter rows.';
