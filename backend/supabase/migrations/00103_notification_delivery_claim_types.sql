-- Keep the delivery-claim RPC's declared transport types aligned with legacy
-- notification columns that still use bounded VARCHAR storage.

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
  link_route TEXT,
  market_code TEXT,
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
    c.attempts, n.title::TEXT, n.body, n.link_url, n.link_route,
    n.market_code::TEXT, n.category, n.type::TEXT
  FROM claimed c
  JOIN public.notifications n ON n.id = c.notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_notification_deliveries(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(TEXT, INTEGER, INTEGER)
  TO service_role;
