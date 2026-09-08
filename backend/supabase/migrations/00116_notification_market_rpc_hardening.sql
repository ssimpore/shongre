-- Repair the notification RPC surface after the delivery marketplace migration
-- accidentally reintroduced the pre-market overload. Every notification write
-- must carry an explicit market and an internal canonical route.

DROP FUNCTION IF EXISTS public.create_notification_with_deliveries(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[], TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.create_notification_with_deliveries(
  p_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_category TEXT,
  p_title TEXT,
  p_body TEXT,
  p_link_url TEXT,
  p_market_code TEXT,
  p_link_route TEXT,
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
    'messages', 'transactions', 'listings', 'delivery',
    'delivery_opportunities', 'reviews', 'promotions', 'security', 'marketing'
  ) THEN
    RAISE EXCEPTION 'invalid notification category' USING ERRCODE = '22023';
  END IF;
  IF char_length(btrim(p_title)) NOT BETWEEN 1 AND 255
     OR char_length(btrim(p_body)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'invalid notification content' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.markets
    WHERE code = upper(btrim(p_market_code)) AND enabled = TRUE
  ) THEN
    RAISE EXCEPTION 'invalid notification market' USING ERRCODE = '22023';
  END IF;
  IF btrim(COALESCE(p_link_route, '')) <> '' AND (
    left(btrim(p_link_route), 1) <> '/'
    OR left(btrim(p_link_route), 2) = '//'
  ) THEN
    RAISE EXCEPTION 'invalid notification route' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_channels, ARRAY[]::TEXT[])) AS channel
    WHERE channel NOT IN ('email', 'push')
  ) THEN
    RAISE EXCEPTION 'invalid notification channel' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.notifications (
    id, user_id, type, category, title, body, link_url, market_code,
    link_route, in_app_visible, is_read, created_at
  ) VALUES (
    p_id, p_user_id, p_type, p_category, btrim(p_title), btrim(p_body),
    NULLIF(btrim(p_link_url), ''), upper(btrim(p_market_code)),
    NULLIF(btrim(p_link_route), ''), p_in_app_visible, FALSE, p_created_at
  ) ON CONFLICT (id) DO NOTHING;

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

REVOKE ALL ON FUNCTION public.create_notification_with_deliveries(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[], TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification_with_deliveries(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[], TIMESTAMPTZ
) TO service_role;
