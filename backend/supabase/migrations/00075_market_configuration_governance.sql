-- Versioned, four-eyes market configuration workflow. Candidate snapshots are
-- validated by the domain service, then applied and audited atomically here.

ALTER TABLE public.market_configuration_audit
  ADD COLUMN IF NOT EXISTS change_request_id UUID,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS before_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS after_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS approval_actor_id UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.market_configuration_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  base_version INTEGER NOT NULL CHECK (base_version > 0),
  changed_fields TEXT[] NOT NULL CHECK (cardinality(changed_fields) > 0),
  reason TEXT NOT NULL CHECK (length(trim(reason)) >= 8),
  before_snapshot JSONB NOT NULL CHECK (jsonb_typeof(before_snapshot) = 'object'),
  candidate_snapshot JSONB NOT NULL CHECK (jsonb_typeof(candidate_snapshot) = 'object'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','stale')),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  review_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  applied_version INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS market_configuration_changes_pending_idx
  ON public.market_configuration_change_requests (market_code, created_at)
  WHERE status = 'pending';

ALTER TABLE public.market_configuration_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_configuration_change_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.market_configuration_change_requests
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.market_configuration_change_requests
  TO service_role;

CREATE OR REPLACE FUNCTION public.request_market_configuration_change(
  p_market_code TEXT,
  p_requested_by UUID,
  p_base_version INTEGER,
  p_changed_fields TEXT[],
  p_reason TEXT,
  p_before_snapshot JSONB,
  p_candidate_snapshot JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_version INTEGER;
  request_id UUID;
BEGIN
  SELECT market.version INTO current_version
  FROM public.markets market
  WHERE market.code = upper(p_market_code);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'market not found' USING ERRCODE = 'P0002';
  END IF;
  IF current_version <> p_base_version THEN
    RAISE EXCEPTION 'market configuration version conflict'
      USING ERRCODE = '40001';
  END IF;
  IF cardinality(p_changed_fields) = 0 OR length(trim(p_reason)) < 8 THEN
    RAISE EXCEPTION 'changed fields and reason are required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.market_configuration_change_requests (
    market_code, requested_by, base_version, changed_fields, reason,
    before_snapshot, candidate_snapshot
  ) VALUES (
    upper(p_market_code), p_requested_by, p_base_version, p_changed_fields,
    trim(p_reason), p_before_snapshot, p_candidate_snapshot
  ) RETURNING id INTO request_id;
  RETURN request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_market_configuration_change(
  p_request_id UUID,
  p_reviewer UUID,
  p_review_reason TEXT
)
RETURNS SETOF public.markets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_row public.market_configuration_change_requests%ROWTYPE;
  current_row public.markets%ROWTYPE;
  candidate JSONB;
BEGIN
  SELECT * INTO request_row
  FROM public.market_configuration_change_requests request
  WHERE request.id = p_request_id
  FOR UPDATE;
  IF NOT FOUND OR request_row.status <> 'pending' THEN
    RAISE EXCEPTION 'pending market configuration request not found'
      USING ERRCODE = 'P0002';
  END IF;
  IF request_row.requested_by = p_reviewer THEN
    RAISE EXCEPTION 'four-eyes approval required' USING ERRCODE = '42501';
  END IF;
  IF length(trim(p_review_reason)) < 8 THEN
    RAISE EXCEPTION 'review reason required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO current_row
  FROM public.markets market
  WHERE market.code = request_row.market_code
  FOR UPDATE;
  IF current_row.version <> request_row.base_version THEN
    UPDATE public.market_configuration_change_requests
    SET status = 'stale', reviewed_by = p_reviewer,
        review_reason = trim(p_review_reason), reviewed_at = NOW(), updated_at = NOW()
    WHERE id = p_request_id;
    RETURN;
  END IF;

  candidate := request_row.candidate_snapshot;
  UPDATE public.markets market
  SET name = candidate->>'name',
      native_name = candidate->>'nativeName',
      enabled = (candidate->>'enabled')::BOOLEAN,
      launch_status = candidate->>'launchStatus',
      canonical_domain_mode = candidate->>'canonicalDomainMode',
      base_path = candidate->>'basePath',
      default_locale = candidate->>'defaultLocale',
      supported_locales = ARRAY(
        SELECT jsonb_array_elements_text(candidate->'supportedLocales')
      ),
      currency = candidate->>'currency',
      currency_symbol = candidate->>'currencySymbol',
      timezone = candidate->>'timezone',
      phone_country_code = candidate->>'phoneCountryCode',
      address_format = candidate->>'addressFormat',
      legal_entity = candidate->>'legalEntity',
      seo_policy = candidate->'seo',
      marketplace_policy = candidate->'marketplace',
      payment_policy = candidate->'payments',
      tax_policy = candidate->'taxes',
      monetization_policy = candidate->'monetization',
      compliance_policy = candidate->'compliance',
      launch_content = candidate->'launchContent',
      gateway_visible = (candidate->>'gatewayVisible')::BOOLEAN,
      display_order = (candidate->>'displayOrder')::INTEGER,
      protection_fee_rate = (candidate->>'protectionFeeRate')::NUMERIC,
      protection_fixed_fee = (candidate->>'protectionFixedFee')::NUMERIC,
      free_listings_limit = (candidate->>'freeListingsLimit')::INTEGER,
      reservation_deposit_rate_bps =
        (candidate->>'reservationDepositRateBps')::INTEGER,
      reservation_deposit_minimum_minor =
        (candidate->>'reservationDepositMinimumMinor')::BIGINT,
      reservation_deposit_maximum_minor =
        (candidate->>'reservationDepositMaximumMinor')::BIGINT,
      allowed_delivery_methods = ARRAY(
        SELECT jsonb_array_elements_text(candidate->'allowedDeliveryMethods')
      ),
      version = current_row.version + 1,
      updated_at = NOW()
  WHERE market.code = request_row.market_code;

  UPDATE public.market_configuration_change_requests
  SET status = 'approved', reviewed_by = p_reviewer,
      review_reason = trim(p_review_reason), reviewed_at = NOW(),
      applied_version = current_row.version + 1, updated_at = NOW()
  WHERE id = p_request_id;

  INSERT INTO public.market_configuration_audit (
    market_code, actor_id, changed_fields, previous_version, new_version,
    change_request_id, reason, before_snapshot, after_snapshot, approval_actor_id
  ) VALUES (
    request_row.market_code, request_row.requested_by,
    request_row.changed_fields, current_row.version, current_row.version + 1,
    request_row.id, request_row.reason, request_row.before_snapshot,
    request_row.candidate_snapshot, p_reviewer
  );

  RETURN QUERY SELECT market.* FROM public.markets market
    WHERE market.code = request_row.market_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_market_configuration_change(
  p_request_id UUID,
  p_reviewer UUID,
  p_review_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE requester UUID;
BEGIN
  SELECT request.requested_by INTO requester
  FROM public.market_configuration_change_requests request
  WHERE request.id = p_request_id AND request.status = 'pending'
  FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF requester = p_reviewer THEN
    RAISE EXCEPTION 'four-eyes approval required' USING ERRCODE = '42501';
  END IF;
  IF length(trim(p_review_reason)) < 8 THEN
    RAISE EXCEPTION 'review reason required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.market_configuration_change_requests
  SET status = 'rejected', reviewed_by = p_reviewer,
      review_reason = trim(p_review_reason), reviewed_at = NOW(), updated_at = NOW()
  WHERE id = p_request_id;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.request_market_configuration_change(TEXT,UUID,INTEGER,TEXT[],TEXT,JSONB,JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_market_configuration_change(UUID,UUID,TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_market_configuration_change(UUID,UUID,TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_market_configuration_change(TEXT,UUID,INTEGER,TEXT[],TEXT,JSONB,JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_market_configuration_change(UUID,UUID,TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_market_configuration_change(UUID,UUID,TEXT)
  TO service_role;

COMMENT ON TABLE public.market_configuration_change_requests IS
  'Optimistically versioned four-eyes workflow; candidate snapshots become active only through the approval RPC.';
