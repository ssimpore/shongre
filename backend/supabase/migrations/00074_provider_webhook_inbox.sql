-- Durable provider webhook inbox. Public HTTP handlers verify signatures and
-- persist one immutable receipt; workers own downstream domain fan-out.

CREATE TABLE IF NOT EXISTS public.provider_webhook_inbox (
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  raw_body TEXT NOT NULL,
  payload_hash CHAR(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processing','processed','failed','dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, provider_event_id),
  CHECK (octet_length(raw_body) <= 1048576)
);

CREATE INDEX IF NOT EXISTS provider_webhook_inbox_claim_idx
  ON public.provider_webhook_inbox (next_attempt_at, received_at)
  WHERE status IN ('received','failed','processing');
CREATE INDEX IF NOT EXISTS provider_webhook_inbox_retention_idx
  ON public.provider_webhook_inbox (processed_at)
  WHERE status = 'processed';

ALTER TABLE public.provider_webhook_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_webhook_inbox FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_webhook_inbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_webhook_inbox TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_provider_webhook(
  p_provider TEXT,
  p_provider_event_id TEXT,
  p_event_type TEXT,
  p_payload JSONB,
  p_raw_body TEXT,
  p_payload_hash TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  existing public.provider_webhook_inbox%ROWTYPE;
BEGIN
  IF length(trim(p_provider_event_id)) = 0 OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'provider event id and type are required' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_payload) <> 'object' OR octet_length(p_raw_body) > 1048576 THEN
    RAISE EXCEPTION 'invalid provider webhook payload' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.provider_webhook_inbox (
    provider, provider_event_id, event_type, payload, raw_body, payload_hash
  ) VALUES (
    p_provider, p_provider_event_id, p_event_type, p_payload, p_raw_body, p_payload_hash
  )
  ON CONFLICT (provider, provider_event_id) DO NOTHING;

  SELECT * INTO existing
  FROM public.provider_webhook_inbox
  WHERE provider = p_provider AND provider_event_id = p_provider_event_id;

  IF existing.payload_hash <> p_payload_hash THEN
    RAISE EXCEPTION 'provider event id reused with different payload'
      USING ERRCODE = '23505';
  END IF;
  RETURN existing.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_provider_webhooks(
  p_owner TEXT,
  p_limit INTEGER DEFAULT 25,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS SETOF public.provider_webhook_inbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF length(trim(p_owner)) = 0 OR p_limit NOT BETWEEN 1 AND 100
     OR p_lease_seconds NOT BETWEEN 30 AND 900 THEN
    RAISE EXCEPTION 'invalid provider webhook claim arguments' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT inbox.provider, inbox.provider_event_id
    FROM public.provider_webhook_inbox inbox
    WHERE (
      inbox.status IN ('received','failed') AND inbox.next_attempt_at <= NOW()
    ) OR (
      inbox.status = 'processing' AND inbox.lease_expires_at < NOW()
    )
    ORDER BY inbox.received_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.provider_webhook_inbox inbox
  SET status = 'processing',
      attempt_count = inbox.attempt_count + 1,
      lease_owner = p_owner,
      lease_expires_at = NOW() + make_interval(secs => p_lease_seconds),
      updated_at = NOW()
  FROM candidates
  WHERE inbox.provider = candidates.provider
    AND inbox.provider_event_id = candidates.provider_event_id
  RETURNING inbox.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_provider_webhook(
  p_provider TEXT,
  p_provider_event_id TEXT,
  p_owner TEXT,
  p_succeeded BOOLEAN,
  p_error TEXT DEFAULT NULL,
  p_retry_seconds INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.provider_webhook_inbox inbox
  SET status = CASE
        WHEN p_succeeded THEN 'processed'
        WHEN inbox.attempt_count >= 10 THEN 'dead_letter'
        ELSE 'failed'
      END,
      processed_at = CASE WHEN p_succeeded THEN NOW() ELSE NULL END,
      next_attempt_at = CASE
        WHEN p_succeeded OR inbox.attempt_count >= 10 THEN inbox.next_attempt_at
        ELSE NOW() + make_interval(secs => LEAST(GREATEST(p_retry_seconds, 5), 3600))
      END,
      last_error = CASE WHEN p_succeeded THEN NULL ELSE left(COALESCE(p_error, 'unknown'), 1000) END,
      lease_owner = NULL,
      lease_expires_at = NULL,
      updated_at = NOW()
  WHERE inbox.provider = p_provider
    AND inbox.provider_event_id = p_provider_event_id
    AND inbox.status = 'processing'
    AND inbox.lease_owner = p_owner;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_processed_provider_webhooks(
  p_before TIMESTAMPTZ,
  p_limit INTEGER DEFAULT 1000
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH victims AS (
    SELECT inbox.provider, inbox.provider_event_id
    FROM public.provider_webhook_inbox inbox
    WHERE inbox.status = 'processed' AND inbox.processed_at < p_before
    ORDER BY inbox.processed_at
    LIMIT LEAST(GREATEST(p_limit, 1), 5000)
  )
  DELETE FROM public.provider_webhook_inbox inbox
  USING victims
  WHERE inbox.provider = victims.provider
    AND inbox.provider_event_id = victims.provider_event_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_provider_webhook(TEXT,TEXT,TEXT,JSONB,TEXT,TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_provider_webhooks(TEXT,INTEGER,INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_provider_webhook(TEXT,TEXT,TEXT,BOOLEAN,TEXT,INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_processed_provider_webhooks(TIMESTAMPTZ,INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_provider_webhook(TEXT,TEXT,TEXT,JSONB,TEXT,TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_provider_webhooks(TEXT,INTEGER,INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_provider_webhook(TEXT,TEXT,TEXT,BOOLEAN,TEXT,INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_processed_provider_webhooks(TIMESTAMPTZ,INTEGER)
  TO service_role;

COMMENT ON TABLE public.provider_webhook_inbox IS
  'Signature-verified durable receipts. Raw payloads are service-only and purged after 30 days.';
