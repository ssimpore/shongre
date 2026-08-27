-- Unified, provider-neutral analytics ledger and reporting projections.
-- Raw events are append-only; mutable delivery state and derived aggregates are
-- deliberately separate. Money remains integer minor units and market scoped.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(160) NOT NULL UNIQUE,
  event_name VARCHAR(100) NOT NULL,
  schema_version SMALLINT NOT NULL CHECK (schema_version > 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  environment VARCHAR(20) NOT NULL CHECK (environment IN (
    'local','test','preview','development','staging','production'
  )),
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('web','ios','android','backend')),
  country_code VARCHAR(2) NOT NULL,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  locale VARCHAR(32) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  timezone VARCHAR(80),
  canonical_domain VARCHAR(255),
  anonymous_id VARCHAR(160),
  session_id VARCHAR(160),
  user_id VARCHAR(160),
  user_type VARCHAR(80),
  request_id VARCHAR(160),
  source VARCHAR(160),
  medium VARCHAR(160),
  campaign VARCHAR(240),
  term VARCHAR(240),
  content VARCHAR(240),
  first_source VARCHAR(160),
  first_medium VARCHAR(160),
  first_campaign VARCHAR(240),
  device_type VARCHAR(20),
  release VARCHAR(160),
  is_test_traffic BOOLEAN NOT NULL DEFAULT FALSE,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  properties JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(properties) = 'object'),
  context JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(context) = 'object')
);

CREATE INDEX IF NOT EXISTS analytics_events_market_time_idx
  ON public.analytics_events (market_code, occurred_at DESC, id);
CREATE INDEX IF NOT EXISTS analytics_events_name_market_time_idx
  ON public.analytics_events (event_name, market_code, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_user_time_idx
  ON public.analytics_events (user_id, occurred_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_anonymous_time_idx
  ON public.analytics_events (anonymous_id, occurred_at DESC) WHERE anonymous_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_session_time_idx
  ON public.analytics_events (session_id, occurred_at DESC) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_aggregate_idx
  ON public.analytics_events (occurred_at, market_code, event_name)
  WHERE is_test_traffic = FALSE AND is_bot = FALSE;

CREATE TABLE IF NOT EXISTS public.analytics_provider_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(160) NOT NULL REFERENCES public.analytics_events(event_id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL CHECK (provider IN ('internal','posthog','ga4','matomo')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending','delivered','failed','discarded')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  last_error_code VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, provider)
);

CREATE INDEX IF NOT EXISTS analytics_provider_deliveries_queue_idx
  ON public.analytics_provider_deliveries (provider, status, next_attempt_at, created_at)
  WHERE status IN ('pending','failed');

CREATE TABLE IF NOT EXISTS public.analytics_daily_metrics (
  metric_date DATE NOT NULL,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  metric_name VARCHAR(100) NOT NULL,
  dimension_type VARCHAR(50) NOT NULL DEFAULT 'all',
  dimension_value VARCHAR(240) NOT NULL DEFAULT 'all',
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  count_value BIGINT NOT NULL DEFAULT 0,
  amount_minor BIGINT NOT NULL DEFAULT 0,
  unique_users BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (
    metric_date, market_code, metric_name, dimension_type, dimension_value, currency
  )
);

CREATE INDEX IF NOT EXISTS analytics_daily_metrics_lookup_idx
  ON public.analytics_daily_metrics (market_code, metric_date DESC, metric_name);

CREATE TABLE IF NOT EXISTS public.analytics_search_daily (
  search_date DATE NOT NULL,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  normalized_query VARCHAR(240) NOT NULL,
  category_id VARCHAR(160) NOT NULL DEFAULT '',
  searches BIGINT NOT NULL DEFAULT 0,
  result_supply BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  zero_results BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (search_date, market_code, normalized_query, category_id)
);

CREATE INDEX IF NOT EXISTS analytics_search_daily_opportunities_idx
  ON public.analytics_search_daily (market_code, search_date DESC, zero_results DESC, searches DESC);

CREATE TABLE IF NOT EXISTS public.analytics_seo_daily (
  metric_date DATE NOT NULL,
  site_url VARCHAR(500) NOT NULL,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  query VARCHAR(500) NOT NULL DEFAULT '',
  page VARCHAR(1000) NOT NULL DEFAULT '',
  country VARCHAR(8) NOT NULL DEFAULT '',
  device VARCHAR(30) NOT NULL DEFAULT '',
  clicks BIGINT NOT NULL DEFAULT 0,
  impressions BIGINT NOT NULL DEFAULT 0,
  ctr NUMERIC(9,8) NOT NULL DEFAULT 0,
  position NUMERIC(12,4) NOT NULL DEFAULT 0,
  data_state VARCHAR(20) NOT NULL DEFAULT 'final' CHECK (data_state IN ('final','all')),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (metric_date, site_url, market_code, query, page, country, device)
);

CREATE INDEX IF NOT EXISTS analytics_seo_daily_lookup_idx
  ON public.analytics_seo_daily (market_code, metric_date DESC, impressions DESC);

CREATE TABLE IF NOT EXISTS public.analytics_sync_state (
  provider VARCHAR(30) NOT NULL,
  scope VARCHAR(500) NOT NULL,
  cursor TEXT,
  last_successful_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error_code VARCHAR(80),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, scope)
);

CREATE TABLE IF NOT EXISTS public.analytics_retention_policies (
  data_class VARCHAR(40) PRIMARY KEY,
  retention_days INTEGER NOT NULL CHECK (retention_days BETWEEN 1 AND 3650),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.analytics_retention_policies (data_class, retention_days)
VALUES
  ('raw_events', 395),
  ('provider_deliveries', 30),
  ('daily_aggregates', 730),
  ('seo_aggregates', 730)
ON CONFLICT (data_class) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.analytics_privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id VARCHAR(160),
  subject_anonymous_id VARCHAR(160),
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('anonymize','delete')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_error_code VARCHAR(80),
  CHECK (subject_user_id IS NOT NULL OR subject_anonymous_id IS NOT NULL)
);

CREATE OR REPLACE FUNCTION public.protect_analytics_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('app.analytics_retention_delete', TRUE) = 'on' THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE'
     AND current_setting('app.analytics_privacy_rewrite', TRUE) = 'on'
     AND NEW.user_id IS NULL
     AND NEW.anonymous_id IS NULL
     AND (to_jsonb(NEW) - ARRAY['user_id','anonymous_id','session_id']) =
         (to_jsonb(OLD) - ARRAY['user_id','anonymous_id','session_id']) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'analytics_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS analytics_events_append_only ON public.analytics_events;
CREATE TRIGGER analytics_events_append_only
  BEFORE UPDATE OR DELETE ON public.analytics_events
  FOR EACH ROW EXECUTE FUNCTION public.protect_analytics_event();

CREATE OR REPLACE FUNCTION public.record_analytics_provider_delivery(
  p_event_id VARCHAR,
  p_provider VARCHAR,
  p_status VARCHAR,
  p_error_code VARCHAR DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  retry_seconds INTEGER;
BEGIN
  IF p_provider NOT IN ('posthog','ga4','matomo')
     OR p_status NOT IN ('delivered','failed','discarded') THEN
    RAISE EXCEPTION 'invalid analytics provider delivery state';
  END IF;
  SELECT LEAST(3600, (15 * POWER(2, LEAST(attempt_count + 1, 8)))::INTEGER)
  INTO retry_seconds
  FROM public.analytics_provider_deliveries
  WHERE event_id = p_event_id AND provider = p_provider;
  INSERT INTO public.analytics_provider_deliveries (
    event_id, provider, status, attempt_count, next_attempt_at,
    last_attempt_at, delivered_at, last_error_code, updated_at
  ) VALUES (
    p_event_id, p_provider, p_status, 1,
    CASE WHEN p_status = 'failed' THEN NOW() + make_interval(secs => COALESCE(retry_seconds, 30)) END,
    NOW(), CASE WHEN p_status = 'delivered' THEN NOW() END,
    LEFT(p_error_code, 80), NOW()
  )
  ON CONFLICT (event_id, provider) DO UPDATE SET
    status = EXCLUDED.status,
    attempt_count = analytics_provider_deliveries.attempt_count + 1,
    next_attempt_at = CASE WHEN EXCLUDED.status = 'failed'
      THEN NOW() + make_interval(secs => COALESCE(retry_seconds, 30)) END,
    last_attempt_at = NOW(),
    delivered_at = CASE WHEN EXCLUDED.status = 'delivered' THEN NOW()
      ELSE analytics_provider_deliveries.delivered_at END,
    last_error_code = EXCLUDED.last_error_code,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_analytics_provider_deliveries(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(claimed_event_id VARCHAR, claimed_provider VARCHAR)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT delivery.id
    FROM public.analytics_provider_deliveries delivery
    WHERE delivery.status IN ('pending','failed')
      AND delivery.attempt_count < 8
      AND (delivery.next_attempt_at IS NULL OR delivery.next_attempt_at <= NOW())
    ORDER BY delivery.created_at, delivery.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 500)
  )
  UPDATE public.analytics_provider_deliveries delivery
  SET next_attempt_at = NOW() + INTERVAL '5 minutes', updated_at = NOW()
  FROM candidates
  WHERE delivery.id = candidates.id
  RETURNING delivery.event_id, delivery.provider;
END;
$$;

CREATE OR REPLACE FUNCTION public.anonymize_analytics_subject(p_request_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privacy_request public.analytics_privacy_requests%ROWTYPE;
  affected BIGINT := 0;
BEGIN
  SELECT * INTO privacy_request
  FROM public.analytics_privacy_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'analytics privacy request not found'; END IF;
  PERFORM set_config('app.analytics_privacy_rewrite', 'on', TRUE);
  UPDATE public.analytics_events
  SET user_id = NULL, anonymous_id = NULL, session_id = NULL
  WHERE (privacy_request.subject_user_id IS NOT NULL AND user_id = privacy_request.subject_user_id)
     OR (privacy_request.subject_anonymous_id IS NOT NULL AND anonymous_id = privacy_request.subject_anonymous_id);
  GET DIAGNOSTICS affected = ROW_COUNT;
  UPDATE public.analytics_privacy_requests
  SET status = 'completed', completed_at = NOW(), last_error_code = NULL
  WHERE id = p_request_id;
  RETURN affected;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_analytics_daily(
  p_from DATE DEFAULT (CURRENT_DATE - 2),
  p_to DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_to < p_from OR p_to - p_from > 92 THEN
    RAISE EXCEPTION 'invalid analytics refresh window';
  END IF;
  DELETE FROM public.analytics_daily_metrics
  WHERE metric_date BETWEEN p_from AND p_to;
  INSERT INTO public.analytics_daily_metrics (
    metric_date, market_code, metric_name, dimension_type, dimension_value,
    currency, count_value, amount_minor, unique_users
  )
  SELECT occurred_at::DATE, market_code, event_name, 'all', 'all', currency,
         COUNT(*), 0,
         COUNT(DISTINCT COALESCE(user_id, anonymous_id, session_id))
  FROM public.analytics_events
  WHERE occurred_at >= p_from::TIMESTAMPTZ
    AND occurred_at < (p_to + 1)::TIMESTAMPTZ
    AND is_test_traffic = FALSE AND is_bot = FALSE
  GROUP BY occurred_at::DATE, market_code, event_name, currency;

  INSERT INTO public.analytics_daily_metrics (
    metric_date, market_code, metric_name, dimension_type, dimension_value,
    currency, count_value, amount_minor, unique_users
  )
  SELECT occurred_at::DATE, market_code, 'recognized_revenue', 'transaction_type',
         transaction_type, currency, COUNT(*), SUM(net_amount_minor),
         COUNT(DISTINCT COALESCE(account_id::TEXT, organization_id::TEXT))
  FROM public.finance_transactions
  WHERE occurred_at >= p_from::TIMESTAMPTZ
    AND occurred_at < (p_to + 1)::TIMESTAMPTZ
    AND status IN ('posted','reconciled')
    AND transaction_type NOT IN ('refund','credit_note','seller_payout','provider_fee')
  GROUP BY occurred_at::DATE, market_code, transaction_type, currency
  ON CONFLICT (metric_date, market_code, metric_name, dimension_type, dimension_value, currency)
  DO UPDATE SET
    count_value = EXCLUDED.count_value,
    amount_minor = EXCLUDED.amount_minor,
    unique_users = EXCLUDED.unique_users,
    updated_at = NOW();

  INSERT INTO public.analytics_daily_metrics (
    metric_date, market_code, metric_name, dimension_type, dimension_value,
    currency, count_value, amount_minor, unique_users
  )
  SELECT occurred_at::DATE, market_code, 'refunds', 'transaction_type',
         transaction_type, currency, COUNT(*), SUM(ABS(net_amount_minor)),
         COUNT(DISTINCT COALESCE(account_id::TEXT, organization_id::TEXT))
  FROM public.finance_transactions
  WHERE occurred_at >= p_from::TIMESTAMPTZ
    AND occurred_at < (p_to + 1)::TIMESTAMPTZ
    AND status IN ('posted','reconciled')
    AND transaction_type IN ('refund','credit_note','chargeback')
  GROUP BY occurred_at::DATE, market_code, transaction_type, currency
  ON CONFLICT (metric_date, market_code, metric_name, dimension_type, dimension_value, currency)
  DO UPDATE SET
    count_value = EXCLUDED.count_value,
    amount_minor = EXCLUDED.amount_minor,
    unique_users = EXCLUDED.unique_users,
    updated_at = NOW();

  DELETE FROM public.analytics_search_daily
  WHERE search_date BETWEEN p_from AND p_to;
  INSERT INTO public.analytics_search_daily (
    search_date, market_code, normalized_query, category_id,
    searches, result_supply, clicks, zero_results
  )
  SELECT occurred_at::DATE, market_code,
         LOWER(LEFT(COALESCE(properties->>'query',''), 240)),
         LEFT(COALESCE(properties->>'categoryId',''), 160),
         COUNT(*) FILTER (WHERE event_name = 'search_performed'),
         COALESCE(SUM((properties->>'resultCount')::BIGINT)
           FILTER (WHERE event_name = 'search_performed' AND properties->>'resultCount' ~ '^\d+$'), 0),
         COUNT(*) FILTER (WHERE event_name = 'search_result_clicked'),
         COUNT(*) FILTER (WHERE event_name = 'search_performed' AND properties->>'zeroResults' = 'true')
  FROM public.analytics_events
  WHERE occurred_at >= p_from::TIMESTAMPTZ
    AND occurred_at < (p_to + 1)::TIMESTAMPTZ
    AND event_name IN ('search_performed','search_result_clicked')
    AND is_test_traffic = FALSE AND is_bot = FALSE
  GROUP BY occurred_at::DATE, market_code,
           LOWER(LEFT(COALESCE(properties->>'query',''), 240)),
           LEFT(COALESCE(properties->>'categoryId',''), 160);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_analytics_retention()
RETURNS TABLE(data_class TEXT, deleted_rows BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_days INTEGER;
  delivery_days INTEGER;
  aggregate_days INTEGER;
  seo_days INTEGER;
  affected BIGINT;
BEGIN
  SELECT retention_days INTO raw_days FROM analytics_retention_policies WHERE analytics_retention_policies.data_class = 'raw_events';
  SELECT retention_days INTO delivery_days FROM analytics_retention_policies WHERE analytics_retention_policies.data_class = 'provider_deliveries';
  SELECT retention_days INTO aggregate_days FROM analytics_retention_policies WHERE analytics_retention_policies.data_class = 'daily_aggregates';
  SELECT retention_days INTO seo_days FROM analytics_retention_policies WHERE analytics_retention_policies.data_class = 'seo_aggregates';
  DELETE FROM analytics_provider_deliveries WHERE created_at < NOW() - make_interval(days => delivery_days);
  GET DIAGNOSTICS affected = ROW_COUNT; data_class := 'provider_deliveries'; deleted_rows := affected; RETURN NEXT;
  -- Controlled retention is the only delete permitted for raw events.
  PERFORM set_config('app.analytics_retention_delete', 'on', TRUE);
  DELETE FROM analytics_events WHERE received_at < NOW() - make_interval(days => raw_days);
  GET DIAGNOSTICS affected = ROW_COUNT;
  data_class := 'raw_events'; deleted_rows := affected; RETURN NEXT;
  DELETE FROM analytics_daily_metrics WHERE metric_date < CURRENT_DATE - aggregate_days;
  GET DIAGNOSTICS affected = ROW_COUNT; data_class := 'daily_aggregates'; deleted_rows := affected; RETURN NEXT;
  DELETE FROM analytics_search_daily WHERE search_date < CURRENT_DATE - aggregate_days;
  DELETE FROM analytics_seo_daily WHERE metric_date < CURRENT_DATE - seo_days;
  GET DIAGNOSTICS affected = ROW_COUNT; data_class := 'seo_aggregates'; deleted_rows := affected; RETURN NEXT;
END;
$$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'analytics_events','analytics_provider_deliveries','analytics_daily_metrics',
    'analytics_search_daily','analytics_seo_daily','analytics_sync_state',
    'analytics_retention_policies','analytics_privacy_requests'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', table_name);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.anonymize_analytics_subject(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_analytics_provider_delivery(VARCHAR, VARCHAR, VARCHAR, VARCHAR) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_analytics_provider_deliveries(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_analytics_daily(DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_analytics_retention() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.anonymize_analytics_subject(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_analytics_provider_delivery(VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_analytics_provider_deliveries(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_analytics_daily(DATE, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_analytics_retention() TO service_role;
