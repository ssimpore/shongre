-- Durable, preference-aware notification delivery.
-- External providers remain pluggable; this migration supplies the provider-
-- neutral outbox, leases, retries, dead letters, attempts, and receipts.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'account',
  ADD COLUMN IF NOT EXISTS in_app_visible BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('messages', 'transactions', 'listings', 'delivery', 'reviews',
                 'promotions', 'security', 'marketing')
  ),
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, category),
  CHECK (
    category NOT IN ('transactions', 'delivery', 'security')
    OR (in_app_enabled AND email_enabled)
  )
);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'push')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'leased', 'retry', 'delivered', 'dead_letter', 'cancelled')
  ),
  idempotency_key TEXT NOT NULL UNIQUE,
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  max_attempts SMALLINT NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 10),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  provider_id TEXT,
  provider_message_id TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notification_id, channel),
  CHECK (
    (status = 'leased' AND lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR status <> 'leased'
  )
);
CREATE INDEX IF NOT EXISTS notification_deliveries_claim_idx
  ON public.notification_deliveries (available_at, created_at)
  WHERE status IN ('pending', 'retry', 'leased');
CREATE INDEX IF NOT EXISTS notification_deliveries_dead_letter_idx
  ON public.notification_deliveries (updated_at DESC)
  WHERE status = 'dead_letter';

CREATE TABLE IF NOT EXISTS public.notification_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.notification_deliveries(id) ON DELETE CASCADE,
  attempt_number SMALLINT NOT NULL,
  worker_id TEXT NOT NULL,
  provider_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('delivered', 'retry', 'dead_letter')),
  provider_message_id TEXT,
  error_code TEXT,
  error_message TEXT,
  receipt JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(receipt) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (delivery_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS public.notification_delivery_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('accepted', 'delivered', 'bounced', 'complained', 'failed', 'opened')
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, provider_message_id, status, occurred_at)
);
CREATE INDEX IF NOT EXISTS notification_delivery_receipts_message_idx
  ON public.notification_delivery_receipts (provider_id, provider_message_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.create_notification_with_deliveries(
  p_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_category TEXT,
  p_title TEXT,
  p_body TEXT,
  p_link_url TEXT,
  p_in_app_visible BOOLEAN,
  p_channels TEXT[],
  p_created_at TIMESTAMPTZ
)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_channel TEXT;
BEGIN
  IF p_category NOT IN (
    'messages', 'transactions', 'listings', 'delivery', 'reviews',
    'promotions', 'security', 'marketing'
  ) THEN
    RAISE EXCEPTION 'invalid notification category' USING ERRCODE = '22023';
  END IF;
  IF char_length(btrim(p_title)) NOT BETWEEN 1 AND 255
     OR char_length(btrim(p_body)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'invalid notification content' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_channels, ARRAY[]::TEXT[])) AS channel
    WHERE channel NOT IN ('email', 'push')
  ) THEN
    RAISE EXCEPTION 'invalid notification channel' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.notifications (
    id, user_id, type, category, title, body, link_url,
    in_app_visible, is_read, created_at
  ) VALUES (
    p_id, p_user_id, p_type, p_category, btrim(p_title), btrim(p_body),
    NULLIF(btrim(p_link_url), ''), p_in_app_visible, FALSE, p_created_at
  );

  FOREACH requested_channel IN ARRAY COALESCE(p_channels, ARRAY[]::TEXT[])
  LOOP
    INSERT INTO public.notification_deliveries (
      notification_id, user_id, channel, idempotency_key
    ) VALUES (
      p_id, p_user_id, requested_channel, p_id::TEXT || ':' || requested_channel
    ) ON CONFLICT (notification_id, channel) DO NOTHING;
  END LOOP;

  RETURN QUERY SELECT * FROM public.notifications WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_notification_deliveries(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 50,
  p_lease_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  notification_id UUID,
  user_id UUID,
  channel TEXT,
  idempotency_key TEXT,
  attempt_number SMALLINT,
  title TEXT,
  body TEXT,
  link_url TEXT,
  category TEXT,
  type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF char_length(btrim(p_worker_id)) NOT BETWEEN 1 AND 200
     OR p_limit NOT BETWEEN 1 AND 200
     OR p_lease_seconds NOT BETWEEN 10 AND 900 THEN
    RAISE EXCEPTION 'invalid delivery lease request' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT d.id
    FROM public.notification_deliveries d
    WHERE (
      d.status IN ('pending', 'retry') AND d.available_at <= NOW()
    ) OR (
      d.status = 'leased' AND d.lease_expires_at <= NOW()
    )
    ORDER BY d.available_at, d.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ), claimed AS (
    UPDATE public.notification_deliveries d
    SET status = 'leased',
        attempts = d.attempts + 1,
        lease_owner = p_worker_id,
        lease_expires_at = NOW() + make_interval(secs => p_lease_seconds),
        updated_at = NOW()
    FROM candidates c
    WHERE d.id = c.id
    RETURNING d.*
  )
  SELECT
    c.id, c.notification_id, c.user_id, c.channel, c.idempotency_key,
    c.attempts, n.title, n.body, n.link_url, n.category, n.type
  FROM claimed c
  JOIN public.notifications n ON n.id = c.notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_notification_delivery(
  p_delivery_id UUID,
  p_worker_id TEXT,
  p_success BOOLEAN,
  p_permanent_failure BOOLEAN,
  p_provider_id TEXT,
  p_provider_message_id TEXT,
  p_receipt JSONB,
  p_error_code TEXT,
  p_error_message TEXT,
  p_retry_at TIMESTAMPTZ
)
RETURNS SETOF public.notification_deliveries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.notification_deliveries%ROWTYPE;
  next_status TEXT;
BEGIN
  SELECT * INTO target
  FROM public.notification_deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'delivery not found' USING ERRCODE = 'P0002'; END IF;
  IF target.status <> 'leased' OR target.lease_owner <> p_worker_id THEN
    RAISE EXCEPTION 'delivery lease ownership mismatch' USING ERRCODE = '42501';
  END IF;
  next_status := CASE
    WHEN p_success THEN 'delivered'
    WHEN p_permanent_failure THEN 'dead_letter'
    WHEN target.attempts >= target.max_attempts THEN 'dead_letter'
    ELSE 'retry'
  END;
  IF next_status = 'retry' AND (p_retry_at IS NULL OR p_retry_at <= NOW()) THEN
    RAISE EXCEPTION 'future retry time required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.notification_deliveries
  SET status = next_status,
      available_at = CASE WHEN next_status = 'retry' THEN p_retry_at ELSE available_at END,
      lease_owner = NULL,
      lease_expires_at = NULL,
      provider_id = NULLIF(btrim(p_provider_id), ''),
      provider_message_id = NULLIF(btrim(p_provider_message_id), ''),
      last_error_code = CASE WHEN p_success THEN NULL ELSE left(p_error_code, 100) END,
      last_error_message = CASE WHEN p_success THEN NULL ELSE left(p_error_message, 1000) END,
      delivered_at = CASE WHEN p_success THEN NOW() ELSE NULL END,
      updated_at = NOW()
  WHERE id = p_delivery_id;

  INSERT INTO public.notification_delivery_attempts (
    delivery_id, attempt_number, worker_id, provider_id, outcome,
    provider_message_id, error_code, error_message, receipt
  ) VALUES (
    p_delivery_id, target.attempts, p_worker_id, NULLIF(btrim(p_provider_id), ''),
    next_status, NULLIF(btrim(p_provider_message_id), ''),
    CASE WHEN p_success THEN NULL ELSE left(p_error_code, 100) END,
    CASE WHEN p_success THEN NULL ELSE left(p_error_message, 1000) END,
    COALESCE(p_receipt, '{}'::jsonb)
  );
  RETURN QUERY SELECT * FROM public.notification_deliveries WHERE id = p_delivery_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_notification_delivery_receipt(
  p_provider_id TEXT,
  p_provider_message_id TEXT,
  p_status TEXT,
  p_payload JSONB,
  p_occurred_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE receipt_id UUID;
BEGIN
  INSERT INTO public.notification_delivery_receipts (
    provider_id, provider_message_id, status, payload, occurred_at
  ) VALUES (
    btrim(p_provider_id), btrim(p_provider_message_id), p_status,
    COALESCE(p_payload, '{}'::jsonb), p_occurred_at
  )
  ON CONFLICT (provider_id, provider_message_id, status, occurred_at)
  DO UPDATE SET payload = EXCLUDED.payload
  RETURNING id INTO receipt_id;
  RETURN receipt_id;
END;
$$;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_preferences FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.notification_deliveries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.notification_delivery_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.notification_delivery_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_deliveries TO service_role;
GRANT SELECT, INSERT ON public.notification_delivery_attempts TO service_role;
GRANT SELECT, INSERT ON public.notification_delivery_receipts TO service_role;

REVOKE ALL ON FUNCTION public.create_notification_with_deliveries(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[], TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_notification_deliveries(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_notification_delivery(UUID, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_notification_delivery_receipt(TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification_with_deliveries(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[], TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(TEXT, INTEGER, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_notification_delivery(UUID, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.record_notification_delivery_receipt(TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ)
  TO service_role;
