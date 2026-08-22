-- =============================================================================
-- CENTRAL BUSINESS RULES & MONETIZATION
-- Migration 00015 — expand only. Legacy tables remain readable during rollout.
-- Monetary values are integer minor units; rates are integer basis points.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.commercial_rule_sets (
    id VARCHAR(120) PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    domain VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.commercial_configuration_versions (
    id VARCHAR(160) PRIMARY KEY,
    rule_set_id VARCHAR(120) NOT NULL REFERENCES public.commercial_rule_sets(id) ON DELETE RESTRICT,
    version_number INT NOT NULL CHECK (version_number > 0),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL CHECK (status IN ('draft','pending_approval','approved','scheduled','active','disabled','archived')),
    change_reason TEXT NOT NULL CHECK (length(change_reason) >= 8),
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    published_at TIMESTAMPTZ,
    conflicts JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(conflicts) = 'array'),
    snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
    snapshot_hash CHAR(64) NOT NULL CHECK (snapshot_hash ~ '^[0-9a-f]{64}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rule_set_id, market_code, version_number),
    CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from),
    CHECK (created_by IS NULL OR approved_by IS NULL OR created_by <> approved_by)
);

CREATE UNIQUE INDEX IF NOT EXISTS commercial_one_active_version_idx
    ON public.commercial_configuration_versions (rule_set_id, market_code)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS commercial_version_resolution_idx
    ON public.commercial_configuration_versions (market_code, status, effective_from DESC, version_number DESC);

CREATE TABLE IF NOT EXISTS public.commercial_rules (
    id VARCHAR(180) NOT NULL,
    version_id VARCHAR(160) NOT NULL REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
    rule_key VARCHAR(180) NOT NULL CHECK (rule_key ~ '^[a-z0-9_.-]+$'),
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    priority INT NOT NULL CHECK (priority BETWEEN 0 AND 100000),
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    scope JSONB NOT NULL CHECK (jsonb_typeof(scope) = 'object'),
    conditions JSONB NOT NULL CHECK (jsonb_typeof(conditions) = 'array' AND jsonb_array_length(conditions) <= 24),
    outcome JSONB NOT NULL CHECK (jsonb_typeof(outcome) = 'object'),
    status VARCHAR(30) NOT NULL CHECK (status IN ('draft','pending_approval','approved','scheduled','active','disabled','archived')),
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, version_id),
    UNIQUE (version_id, rule_key),
    CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);
CREATE INDEX IF NOT EXISTS commercial_rules_resolution_idx
    ON public.commercial_rules (version_id, status, priority DESC);
CREATE INDEX IF NOT EXISTS commercial_rules_scope_gin_idx
    ON public.commercial_rules USING GIN (scope jsonb_path_ops);

CREATE TABLE IF NOT EXISTS public.monetization_products (
    id VARCHAR(180) PRIMARY KEY,
    code VARCHAR(180) NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9_.-]+$'),
    kind VARCHAR(40) NOT NULL CHECK (kind IN ('standard_listing','additional_listing','premium_option','subscription','pack','credit_pack','service_fee','commission','verification_service','sponsored_placement')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.monetization_product_versions (
    id VARCHAR(240) PRIMARY KEY,
    product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
    configuration_version_id VARCHAR(160) NOT NULL REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    audience VARCHAR(30) NOT NULL CHECK (audience IN ('guest','individual','professional','organization','all')),
    scope JSONB NOT NULL CHECK (jsonb_typeof(scope) = 'object'),
    compatibility JSONB NOT NULL DEFAULT '{"requiresProductIds":[],"excludesProductIds":[],"maximumQuantity":1}'::jsonb CHECK (jsonb_typeof(compatibility) = 'object'),
    status VARCHAR(30) NOT NULL CHECK (status IN ('draft','pending_approval','approved','scheduled','active','disabled','archived')),
    is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    source_consumers TEXT[] NOT NULL DEFAULT '{}',
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (configuration_version_id, product_id),
    CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);
CREATE INDEX IF NOT EXISTS monetization_product_versions_lookup_idx
    ON public.monetization_product_versions (configuration_version_id, status, product_id);
CREATE INDEX IF NOT EXISTS monetization_product_scope_gin_idx
    ON public.monetization_product_versions USING GIN (scope jsonb_path_ops);

CREATE TABLE IF NOT EXISTS public.monetization_prices (
    id VARCHAR(260) PRIMARY KEY,
    product_version_id VARCHAR(240) NOT NULL REFERENCES public.monetization_product_versions(id) ON DELETE CASCADE,
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('once','month','year')),
    tax_rate_bps INT NOT NULL CHECK (tax_rate_bps BETWEEN 0 AND 10000),
    price_includes_tax BOOLEAN NOT NULL DEFAULT FALSE,
    duration_days INT CHECK (duration_days IS NULL OR duration_days > 0),
    trial_days INT CHECK (trial_days IS NULL OR trial_days >= 0),
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);
CREATE INDEX IF NOT EXISTS monetization_prices_resolution_idx
    ON public.monetization_prices (product_version_id, currency, billing_period, effective_from DESC);

CREATE TABLE IF NOT EXISTS public.monetization_product_entitlements (
    product_version_id VARCHAR(240) NOT NULL REFERENCES public.monetization_product_versions(id) ON DELETE CASCADE,
    entitlement_key VARCHAR(160) NOT NULL,
    label VARCHAR(180) NOT NULL,
    entitlement_value JSONB NOT NULL,
    unit VARCHAR(40),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (product_version_id, entitlement_key)
);

CREATE TABLE IF NOT EXISTS public.monetization_promotions (
    id VARCHAR(180) PRIMARY KEY,
    configuration_version_id VARCHAR(160) NOT NULL REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(180) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('draft','pending_approval','approved','scheduled','active','disabled','archived')),
    scope JSONB NOT NULL CHECK (jsonb_typeof(scope) = 'object'),
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed','percentage')),
    discount_value BIGINT NOT NULL CHECK (discount_value >= 0),
    stacking_policy VARCHAR(20) NOT NULL CHECK (stacking_policy IN ('exclusive','best_only','stackable')),
    maximum_redemptions BIGINT CHECK (maximum_redemptions IS NULL OR maximum_redemptions > 0),
    maximum_redemptions_per_account INT NOT NULL DEFAULT 1 CHECK (maximum_redemptions_per_account > 0),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (configuration_version_id, code),
    CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS monetization_promotions_resolution_idx
    ON public.monetization_promotions (code, status, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS public.monetization_promotion_products (
    promotion_id VARCHAR(180) NOT NULL REFERENCES public.monetization_promotions(id) ON DELETE CASCADE,
    product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE CASCADE,
    PRIMARY KEY (promotion_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.monetization_quotes (
    id VARCHAR(80) PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    configuration_version_id VARCHAR(160) NOT NULL REFERENCES public.commercial_configuration_versions(id) ON DELETE RESTRICT,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    currency VARCHAR(3) NOT NULL,
    subtotal_minor BIGINT NOT NULL CHECK (subtotal_minor >= 0),
    discount_minor BIGINT NOT NULL CHECK (discount_minor >= 0 AND discount_minor <= subtotal_minor),
    tax_minor BIGINT NOT NULL CHECK (tax_minor >= 0),
    total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
    promotion_code VARCHAR(40),
    snapshot_hash CHAR(64) NOT NULL CHECK (snapshot_hash ~ '^[0-9a-f]{64}$'),
    quote_snapshot JSONB NOT NULL CHECK (jsonb_typeof(quote_snapshot) = 'object'),
    reason_code VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active','consumed','expired','cancelled')),
    idempotency_key VARCHAR(200) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, idempotency_key),
    CHECK (total_minor = subtotal_minor - discount_minor + tax_minor)
);
CREATE INDEX IF NOT EXISTS monetization_quotes_account_status_idx
    ON public.monetization_quotes (account_id, status, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.monetization_quote_items (
    quote_id VARCHAR(80) NOT NULL REFERENCES public.monetization_quotes(id) ON DELETE RESTRICT,
    line_number SMALLINT NOT NULL CHECK (line_number > 0),
    product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
    product_version_id VARCHAR(240) NOT NULL REFERENCES public.monetization_product_versions(id) ON DELETE RESTRICT,
    price_id VARCHAR(260) NOT NULL REFERENCES public.monetization_prices(id) ON DELETE RESTRICT,
    billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('once','month','year')),
    label VARCHAR(180) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_amount_minor BIGINT NOT NULL CHECK (unit_amount_minor >= 0),
    subtotal_minor BIGINT NOT NULL CHECK (subtotal_minor >= 0),
    discount_minor BIGINT NOT NULL CHECK (discount_minor >= 0),
    tax_minor BIGINT NOT NULL CHECK (tax_minor >= 0),
    total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
    tax_rate_bps INT NOT NULL CHECK (tax_rate_bps BETWEEN 0 AND 10000),
    entitlement_snapshot JSONB NOT NULL CHECK (jsonb_typeof(entitlement_snapshot) = 'array'),
    PRIMARY KEY (quote_id, line_number)
);

CREATE TABLE IF NOT EXISTS public.monetization_orders (
    id VARCHAR(80) PRIMARY KEY,
    quote_id VARCHAR(80) NOT NULL UNIQUE REFERENCES public.monetization_quotes(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    snapshot_hash CHAR(64) NOT NULL CHECK (snapshot_hash ~ '^[0-9a-f]{64}$'),
    currency VARCHAR(3) NOT NULL,
    total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
    status VARCHAR(30) NOT NULL CHECK (status IN ('created','pending','requires_action','paid','failed','cancelled','partially_refunded','refunded')),
    provider VARCHAR(30) NOT NULL CHECK (provider IN ('demo','stripe')),
    provider_checkout_id VARCHAR(255),
    provider_payment_id VARCHAR(255),
    invoice_id VARCHAR(255),
    idempotency_key VARCHAR(200) NOT NULL,
    order_snapshot JSONB NOT NULL CHECK (jsonb_typeof(order_snapshot) = 'object'),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS monetization_orders_account_status_idx
    ON public.monetization_orders (account_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS monetization_orders_provider_checkout_idx
    ON public.monetization_orders (provider, provider_checkout_id)
    WHERE provider_checkout_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.monetization_payment_events (
    provider VARCHAR(30) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(160) NOT NULL,
    payload_hash CHAR(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
    order_id VARCHAR(80) REFERENCES public.monetization_orders(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received','processing','processed','ignored','failed')),
    failure_reason TEXT,
    attempt_count INT NOT NULL DEFAULT 1 CHECK (attempt_count > 0),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (provider, provider_event_id)
);
CREATE INDEX IF NOT EXISTS monetization_payment_events_pending_idx
    ON public.monetization_payment_events (status, created_at)
    WHERE status IN ('received','failed');

CREATE TABLE IF NOT EXISTS public.monetization_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
    entitlement_key VARCHAR(160) NOT NULL,
    entitlement_value JSONB NOT NULL,
    source_order_id VARCHAR(80) REFERENCES public.monetization_orders(id) ON DELETE RESTRICT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled','active','consumed','expired','revoked')),
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_order_id, product_id, entitlement_key),
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS monetization_entitlements_resolution_idx
    ON public.monetization_entitlements (account_id, entitlement_key, status, ends_at);

CREATE TABLE IF NOT EXISTS public.monetization_usage_counters (
    account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rule_key VARCHAR(180) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    used_count BIGINT NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (account_id, rule_key, market_code, period_start),
    CHECK (period_end > period_start)
);

CREATE TABLE IF NOT EXISTS public.monetization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
    source_order_id VARCHAR(80) NOT NULL UNIQUE REFERENCES public.monetization_orders(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL CHECK (status IN ('trialing','active','past_due','paused','cancelled','expired')),
    provider_subscription_id VARCHAR(255) UNIQUE,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (current_period_end > current_period_start)
);

CREATE TABLE IF NOT EXISTS public.monetization_promotion_redemptions (
    promotion_id VARCHAR(180) NOT NULL REFERENCES public.monetization_promotions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    order_id VARCHAR(80) NOT NULL REFERENCES public.monetization_orders(id) ON DELETE RESTRICT,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (promotion_id, order_id)
);
CREATE INDEX IF NOT EXISTS monetization_promo_account_idx
    ON public.monetization_promotion_redemptions (promotion_id, account_id, redeemed_at DESC);

CREATE TABLE IF NOT EXISTS public.commercial_configuration_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    configuration_version_id VARCHAR(160) NOT NULL REFERENCES public.commercial_configuration_versions(id) ON DELETE RESTRICT,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved','rejected')),
    reason TEXT NOT NULL CHECK (length(reason) >= 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (configuration_version_id, actor_id)
);

CREATE TABLE IF NOT EXISTS public.commercial_configuration_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    actor_name VARCHAR(180) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(240) NOT NULL,
    reason TEXT NOT NULL,
    before_snapshot JSONB,
    after_snapshot JSONB,
    approval_actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    request_id UUID NOT NULL,
    ip_prefix VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS commercial_audit_entity_idx
    ON public.commercial_configuration_audit (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS commercial_audit_actor_idx
    ON public.commercial_configuration_audit (actor_id, created_at DESC);

-- Append-only financial/configuration evidence. Operational status changes use
-- narrowly scoped SECURITY DEFINER functions below rather than arbitrary writes.
CREATE OR REPLACE FUNCTION public.reject_immutable_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS immutable_quote_items ON public.monetization_quote_items;
CREATE TRIGGER immutable_quote_items BEFORE UPDATE OR DELETE ON public.monetization_quote_items
FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_mutation();
DROP TRIGGER IF EXISTS immutable_commercial_audit ON public.commercial_configuration_audit;
CREATE TRIGGER immutable_commercial_audit BEFORE UPDATE OR DELETE ON public.commercial_configuration_audit
FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_mutation();

CREATE OR REPLACE FUNCTION public.consume_monetization_quota(
    p_account_id UUID,
    p_rule_key VARCHAR,
    p_market_code VARCHAR,
    p_period_start TIMESTAMPTZ,
    p_period_end TIMESTAMPTZ,
    p_limit BIGINT,
    p_observed_min BIGINT DEFAULT 0,
    p_amount BIGINT DEFAULT 1
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_count BIGINT;
BEGIN
    IF p_amount <= 0 OR p_limit < 0 OR p_observed_min < 0 THEN RAISE EXCEPTION 'invalid quota arguments'; END IF;
    INSERT INTO public.monetization_usage_counters
        (account_id, rule_key, market_code, period_start, period_end, used_count)
    VALUES (p_account_id, p_rule_key, p_market_code, p_period_start, p_period_end, GREATEST(p_observed_min, 0) + p_amount)
    ON CONFLICT (account_id, rule_key, market_code, period_start)
    DO UPDATE SET used_count = GREATEST(monetization_usage_counters.used_count, p_observed_min) + p_amount,
                  updated_at = NOW()
    WHERE GREATEST(monetization_usage_counters.used_count, p_observed_min) + p_amount <= p_limit
    RETURNING used_count INTO next_count;
    IF next_count IS NULL OR next_count > p_limit THEN
        RAISE EXCEPTION 'quota exhausted' USING ERRCODE = 'P0001';
    END IF;
    RETURN next_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_monetization_payment_event(
    p_provider VARCHAR,
    p_provider_event_id VARCHAR,
    p_event_type VARCHAR,
    p_payload_hash TEXT,
    p_order_id VARCHAR DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.monetization_payment_events
        (provider, provider_event_id, event_type, payload_hash, order_id, status)
    VALUES (p_provider, p_provider_event_id, p_event_type, p_payload_hash, p_order_id, 'processing')
    ON CONFLICT (provider, provider_event_id) DO NOTHING;
    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_monetization_stripe_event(
    p_provider_event_id VARCHAR,
    p_event_type VARCHAR,
    p_payload_hash TEXT,
    p_checkout_id VARCHAR,
    p_payment_id VARCHAR DEFAULT NULL,
    p_invoice_id VARCHAR DEFAULT NULL,
    p_snapshot_hash TEXT DEFAULT NULL,
    p_subscription_id VARCHAR DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    claimed BOOLEAN;
    target public.monetization_orders%ROWTYPE;
    next_status VARCHAR;
BEGIN
    claimed := public.claim_monetization_payment_event(
      'stripe', p_provider_event_id, p_event_type, p_payload_hash, NULL
    );
    IF NOT claimed THEN RETURN FALSE; END IF;

    SELECT * INTO target FROM public.monetization_orders
      WHERE provider = 'stripe' AND provider_checkout_id = p_checkout_id
      FOR UPDATE;
    IF NOT FOUND THEN
      UPDATE public.monetization_payment_events SET status = 'ignored', processed_at = NOW(), updated_at = NOW()
        WHERE provider = 'stripe' AND provider_event_id = p_provider_event_id;
      RETURN TRUE;
    END IF;
    IF p_snapshot_hash IS NOT NULL AND target.snapshot_hash <> p_snapshot_hash THEN
      UPDATE public.monetization_payment_events
        SET status = 'failed', failure_reason = 'snapshot_hash_mismatch', updated_at = NOW()
        WHERE provider = 'stripe' AND provider_event_id = p_provider_event_id;
      RAISE EXCEPTION 'payment snapshot hash mismatch';
    END IF;

    next_status := CASE
      WHEN p_event_type IN ('checkout.session.completed','checkout.session.async_payment_succeeded') THEN 'paid'
      WHEN p_event_type = 'checkout.session.async_payment_failed' THEN 'failed'
      WHEN p_event_type = 'checkout.session.expired' THEN 'cancelled'
      ELSE target.status
    END;
    UPDATE public.monetization_orders
      SET status = next_status, provider_payment_id = COALESCE(p_payment_id, provider_payment_id),
          invoice_id = COALESCE(p_invoice_id, invoice_id),
          paid_at = CASE WHEN next_status = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END,
          order_snapshot = jsonb_set(
            jsonb_set(order_snapshot, '{status}', to_jsonb(next_status)),
            '{updatedAt}', to_jsonb(NOW()::TEXT)
          ),
          updated_at = NOW()
      WHERE id = target.id;

    IF next_status = 'paid' THEN
      UPDATE public.monetization_quotes SET status = 'consumed' WHERE id = target.quote_id AND status = 'active';
      INSERT INTO public.monetization_entitlements
        (account_id, product_id, entitlement_key, entitlement_value, source_order_id,
         starts_at, ends_at, status)
      SELECT
        target.account_id, qi.product_id, entitlement->>'key', entitlement->'value',
        target.id, NOW(),
        CASE WHEN price.duration_days IS NOT NULL THEN NOW() + make_interval(days => price.duration_days)
             WHEN qi.billing_period = 'month' THEN NOW() + INTERVAL '1 month'
             WHEN qi.billing_period = 'year' THEN NOW() + INTERVAL '1 year'
             ELSE NULL END,
        'active'
      FROM public.monetization_quote_items qi
      CROSS JOIN LATERAL jsonb_array_elements(qi.entitlement_snapshot) entitlement
      JOIN public.monetization_prices price ON price.id = qi.price_id
      WHERE qi.quote_id = target.quote_id
      ON CONFLICT (source_order_id, product_id, entitlement_key) DO NOTHING;

      INSERT INTO public.monetization_subscriptions
        (account_id, product_id, source_order_id, status, provider_subscription_id,
         current_period_start, current_period_end)
      SELECT target.account_id, qi.product_id, target.id, 'active', p_subscription_id,
        NOW(), CASE qi.billing_period WHEN 'year' THEN NOW() + INTERVAL '1 year'
                                      ELSE NOW() + INTERVAL '1 month' END
      FROM public.monetization_quote_items qi
      JOIN public.monetization_product_versions pv ON pv.id = qi.product_version_id
      JOIN public.monetization_products product ON product.id = pv.product_id
      WHERE qi.quote_id = target.quote_id AND product.kind = 'subscription'
      ON CONFLICT (source_order_id) DO UPDATE
        SET provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, monetization_subscriptions.provider_subscription_id),
            status = 'active', updated_at = NOW();

      INSERT INTO public.monetization_promotion_redemptions
        (promotion_id, account_id, order_id)
      SELECT promo.id, target.account_id, target.id
      FROM public.monetization_quotes quote
      JOIN public.monetization_promotions promo
        ON promo.configuration_version_id = quote.configuration_version_id
       AND promo.code = quote.promotion_code
      WHERE quote.id = target.quote_id AND quote.promotion_code IS NOT NULL
      ON CONFLICT (promotion_id, order_id) DO NOTHING;
    END IF;
    UPDATE public.monetization_payment_events
      SET order_id = target.id, status = 'processed', processed_at = NOW(), updated_at = NOW()
      WHERE provider = 'stripe' AND provider_event_id = p_provider_event_id;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_monetization_stripe_subscription_event(
    p_provider_event_id VARCHAR,
    p_event_type VARCHAR,
    p_payload_hash TEXT,
    p_subscription_id VARCHAR,
    p_provider_status VARCHAR DEFAULT NULL,
    p_period_start TIMESTAMPTZ DEFAULT NULL,
    p_period_end TIMESTAMPTZ DEFAULT NULL,
    p_cancel_at_period_end BOOLEAN DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    claimed BOOLEAN;
    target public.monetization_subscriptions%ROWTYPE;
    next_status VARCHAR;
BEGIN
    SELECT * INTO target FROM public.monetization_subscriptions
      WHERE provider_subscription_id = p_subscription_id FOR UPDATE;
    IF NOT FOUND THEN
      claimed := public.claim_monetization_payment_event(
        'stripe', p_provider_event_id, p_event_type, p_payload_hash, NULL
      );
      IF claimed THEN
        UPDATE public.monetization_payment_events
          SET status = 'ignored', failure_reason = 'subscription_not_found', processed_at = NOW(), updated_at = NOW()
          WHERE provider = 'stripe' AND provider_event_id = p_provider_event_id;
      END IF;
      RETURN claimed;
    END IF;

    claimed := public.claim_monetization_payment_event(
      'stripe', p_provider_event_id, p_event_type, p_payload_hash, target.source_order_id
    );
    IF NOT claimed THEN RETURN FALSE; END IF;

    next_status := CASE
      WHEN p_event_type = 'invoice.paid' THEN 'active'
      WHEN p_event_type = 'invoice.payment_failed' THEN 'past_due'
      WHEN p_event_type = 'customer.subscription.deleted' THEN 'cancelled'
      WHEN p_provider_status IN ('trialing','active','past_due','paused','cancelled') THEN p_provider_status
      WHEN p_provider_status = 'canceled' THEN 'cancelled'
      ELSE target.status
    END;
    UPDATE public.monetization_subscriptions
      SET status = next_status,
          current_period_start = COALESCE(p_period_start, current_period_start),
          current_period_end = COALESCE(p_period_end, current_period_end),
          cancel_at_period_end = COALESCE(p_cancel_at_period_end, cancel_at_period_end),
          updated_at = NOW()
      WHERE id = target.id;

    IF next_status IN ('active','trialing') AND p_period_end IS NOT NULL THEN
      UPDATE public.monetization_entitlements
        SET status = 'active', ends_at = p_period_end, updated_at = NOW()
        WHERE source_order_id = target.source_order_id AND product_id = target.product_id;
    ELSIF next_status IN ('cancelled','expired') THEN
      UPDATE public.monetization_entitlements
        SET status = 'expired', ends_at = LEAST(COALESCE(ends_at, NOW()), NOW()), updated_at = NOW()
        WHERE source_order_id = target.source_order_id AND product_id = target.product_id
          AND status IN ('active','scheduled');
    END IF;

    UPDATE public.monetization_payment_events
      SET status = 'processed', processed_at = NOW(), updated_at = NOW()
      WHERE provider = 'stripe' AND provider_event_id = p_provider_event_id;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_commercial_configuration(
    p_version_id VARCHAR,
    p_actor_id UUID,
    p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.commercial_configuration_versions%ROWTYPE;
BEGIN
    IF length(trim(p_reason)) < 8 THEN RAISE EXCEPTION 'publication reason required'; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('commercial-configuration-publish'));
    SELECT * INTO target FROM public.commercial_configuration_versions
      WHERE id = p_version_id FOR UPDATE;
    IF NOT FOUND OR target.status <> 'approved' THEN RAISE EXCEPTION 'version is not approved'; END IF;
    IF target.created_by = p_actor_id OR target.approved_by IS NULL THEN
      RAISE EXCEPTION 'four-eyes approval required';
    END IF;
    IF target.effective_from IS NOT NULL AND target.effective_from > NOW() THEN
      UPDATE public.commercial_configuration_versions
        SET status = 'scheduled', updated_at = NOW(), change_reason = p_reason
        WHERE id = p_version_id;
      RETURN;
    END IF;
    UPDATE public.commercial_configuration_versions
      SET status = 'archived', effective_until = NOW(), updated_at = NOW()
      WHERE rule_set_id = target.rule_set_id AND market_code = target.market_code AND status = 'active';
    UPDATE public.commercial_configuration_versions
      SET status = 'active', effective_from = COALESCE(effective_from, NOW()),
          published_at = NOW(), updated_at = NOW(), change_reason = p_reason
      WHERE id = p_version_id;
END;
$$;

-- Activates due schedules under one advisory lock. Running this function is
-- safe from more than one worker: rows are locked and no due version remains
-- scheduled after the first successful transaction.
CREATE OR REPLACE FUNCTION public.activate_due_commercial_configurations()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    target public.commercial_configuration_versions%ROWTYPE;
    activated_count INT := 0;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('commercial-configuration-publish'));
    FOR target IN
      SELECT * FROM public.commercial_configuration_versions
      WHERE status = 'scheduled' AND effective_from <= NOW()
      ORDER BY effective_from, version_number
      FOR UPDATE
    LOOP
      UPDATE public.commercial_configuration_versions
        SET status = 'archived', effective_until = target.effective_from, updated_at = NOW()
        WHERE rule_set_id = target.rule_set_id AND market_code = target.market_code AND status = 'active';
      UPDATE public.commercial_configuration_versions
        SET status = 'active', published_at = NOW(), updated_at = NOW()
        WHERE id = target.id;
      activated_count := activated_count + 1;
    END LOOP;
    RETURN activated_count;
END;
$$;

-- One-time/idempotent backfill entrypoint used by the repository script. The
-- fixture is validated by the shared Zod contract before this transactional RPC
-- is called, then normalized without duplicating commercial arithmetic in SQL.
CREATE OR REPLACE FUNCTION public.import_commercial_catalog(
    p_catalog JSONB,
    p_snapshot_hash TEXT,
    p_reason TEXT DEFAULT 'Backfill initial du catalogue commercial audité'
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_version_id VARCHAR := p_catalog->>'configurationVersionId';
    v_market_code VARCHAR := p_catalog->>'marketCode';
    v_version_number INT := (p_catalog->>'versionNumber')::INT;
BEGIN
    IF jsonb_typeof(p_catalog) <> 'object' OR length(p_snapshot_hash) <> 64 THEN
      RAISE EXCEPTION 'invalid catalog snapshot';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtext('commercial-catalog-import-' || v_market_code));
    IF EXISTS (
      SELECT 1 FROM public.commercial_configuration_versions
      WHERE id = v_version_id AND snapshot_hash <> p_snapshot_hash
    ) THEN
      RAISE EXCEPTION 'catalog version id already exists with a different snapshot';
    END IF;

    INSERT INTO public.commercial_rule_sets (id, name, description, domain)
    VALUES ('commercial-core', 'Catalogue commercial Shongre', 'Prix, offres, règles, taxes, commissions et quotas.', 'marketplace')
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

    INSERT INTO public.commercial_configuration_versions
      (id, rule_set_id, version_number, market_code, status, change_reason,
       effective_from, approved_by, published_at, conflicts, snapshot, snapshot_hash)
    VALUES
      (v_version_id, 'commercial-core', v_version_number, v_market_code, 'active', p_reason,
       (p_catalog->>'generatedAt')::TIMESTAMPTZ, NULL, (p_catalog->>'generatedAt')::TIMESTAMPTZ,
       '[]'::jsonb, p_catalog, p_snapshot_hash)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.monetization_products (id, code, kind)
    SELECT p->>'id', p->>'code', p->>'kind'
    FROM jsonb_array_elements(p_catalog->'products') p
    ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, kind = EXCLUDED.kind;

    INSERT INTO public.monetization_product_versions
      (id, product_id, configuration_version_id, name, description, audience,
       scope, compatibility, status, is_recommended, source_consumers,
       effective_from, effective_until)
    SELECT
      p->>'versionId', p->>'id', v_version_id, p->>'name', p->>'description',
      p->>'audience', p->'scope', p->'compatibility', p->>'status',
      COALESCE((p->>'recommended')::BOOLEAN, FALSE),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(p->'sourceConsumers', '[]'::jsonb))),
      NULLIF(p->>'effectiveFrom','')::TIMESTAMPTZ,
      NULLIF(p->>'effectiveUntil','')::TIMESTAMPTZ
    FROM jsonb_array_elements(p_catalog->'products') p
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, description = EXCLUDED.description, scope = EXCLUDED.scope,
      compatibility = EXCLUDED.compatibility, status = EXCLUDED.status,
      is_recommended = EXCLUDED.is_recommended, source_consumers = EXCLUDED.source_consumers,
      updated_at = NOW();

    INSERT INTO public.monetization_prices
      (id, product_version_id, amount_minor, currency, billing_period, tax_rate_bps,
       price_includes_tax, duration_days, trial_days, effective_from, effective_until)
    SELECT
      price->>'id', p->>'versionId', (price->'amount'->>'amountMinor')::BIGINT,
      price->'amount'->>'currency', price->>'billingPeriod',
      (price->>'taxRateBps')::INT, (price->>'priceIncludesTax')::BOOLEAN,
      NULLIF(price->>'durationDays','')::INT, NULLIF(price->>'trialDays','')::INT,
      NULLIF(price->>'effectiveFrom','')::TIMESTAMPTZ,
      NULLIF(price->>'effectiveUntil','')::TIMESTAMPTZ
    FROM jsonb_array_elements(p_catalog->'products') p
    CROSS JOIN LATERAL jsonb_array_elements(p->'prices') price
    ON CONFLICT (id) DO UPDATE SET
      amount_minor = EXCLUDED.amount_minor, tax_rate_bps = EXCLUDED.tax_rate_bps,
      price_includes_tax = EXCLUDED.price_includes_tax,
      duration_days = EXCLUDED.duration_days, trial_days = EXCLUDED.trial_days;

    INSERT INTO public.monetization_product_entitlements
      (product_version_id, entitlement_key, label, entitlement_value, unit)
    SELECT p->>'versionId', e->>'key', e->>'label', e->'value', NULLIF(e->>'unit','')
    FROM jsonb_array_elements(p_catalog->'products') p
    CROSS JOIN LATERAL jsonb_array_elements(p->'entitlements') e
    ON CONFLICT (product_version_id, entitlement_key) DO UPDATE SET
      label = EXCLUDED.label, entitlement_value = EXCLUDED.entitlement_value, unit = EXCLUDED.unit;

    INSERT INTO public.commercial_rules
      (id, version_id, rule_key, name, description, priority, is_mandatory,
       scope, conditions, outcome, status, effective_from, effective_until)
    SELECT
      r->>'id', v_version_id, r->>'key', r->>'name', r->>'description',
      (r->>'priority')::INT, COALESCE((r->>'mandatory')::BOOLEAN,FALSE),
      r->'scope', r->'conditions', r->'outcome', r->>'status',
      NULLIF(r->>'effectiveFrom','')::TIMESTAMPTZ,
      NULLIF(r->>'effectiveUntil','')::TIMESTAMPTZ
    FROM jsonb_array_elements(p_catalog->'rules') r
    ON CONFLICT (id, version_id) DO UPDATE SET
      name = EXCLUDED.name, priority = EXCLUDED.priority, scope = EXCLUDED.scope,
      conditions = EXCLUDED.conditions, outcome = EXCLUDED.outcome,
      status = EXCLUDED.status, updated_at = NOW();

    INSERT INTO public.monetization_promotions
      (id, configuration_version_id, code, name, status, scope, discount_type,
       discount_value, stacking_policy, maximum_redemptions,
       maximum_redemptions_per_account, starts_at, ends_at)
    SELECT
      promo->>'id', v_version_id, upper(promo->>'code'), promo->>'name', promo->>'status',
      promo->'scope', promo->>'discountType', (promo->>'discountValue')::BIGINT,
      promo->>'stackingPolicy', NULLIF(promo->>'maximumRedemptions','')::BIGINT,
      (promo->>'maximumRedemptionsPerAccount')::INT,
      (promo->>'startsAt')::TIMESTAMPTZ, (promo->>'endsAt')::TIMESTAMPTZ
    FROM jsonb_array_elements(p_catalog->'promotions') promo
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, status = EXCLUDED.status, scope = EXCLUDED.scope,
      discount_value = EXCLUDED.discount_value, updated_at = NOW();

    INSERT INTO public.monetization_promotion_products (promotion_id, product_id)
    SELECT promo->>'id', product_id
    FROM jsonb_array_elements(p_catalog->'promotions') promo
    CROSS JOIN LATERAL jsonb_array_elements_text(promo->'productIds') product_id
    ON CONFLICT DO NOTHING;
END;
$$;

-- Drafts and approved versions are saved as one transaction: the immutable
-- snapshot and its queryable normalized children can never drift apart.
CREATE OR REPLACE FUNCTION public.save_commercial_configuration_version(
    p_version JSONB,
    p_catalog JSONB,
    p_snapshot_hash TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_version_id VARCHAR := p_version->>'id';
    v_market_code VARCHAR := p_version->>'marketCode';
    v_existing_status VARCHAR;
BEGIN
    IF jsonb_typeof(p_version) <> 'object' OR jsonb_typeof(p_catalog) <> 'object'
       OR length(p_snapshot_hash) <> 64
       OR v_version_id <> p_catalog->>'configurationVersionId' THEN
      RAISE EXCEPTION 'invalid commercial version snapshot';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtext('commercial-version-save-' || v_version_id));
    SELECT status INTO v_existing_status FROM public.commercial_configuration_versions WHERE id = v_version_id FOR UPDATE;
    IF v_existing_status IN ('active','archived') THEN
      RAISE EXCEPTION 'published commercial versions are immutable';
    END IF;

    INSERT INTO public.commercial_rule_sets (id, name, description, domain)
    VALUES (p_version->>'setId', 'Catalogue commercial Shongre', 'Prix, offres, règles, taxes, commissions et quotas.', 'marketplace')
    ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

    INSERT INTO public.commercial_configuration_versions
      (id, rule_set_id, version_number, market_code, status, change_reason,
       effective_from, effective_until, created_by, approved_by, published_at,
       conflicts, snapshot, snapshot_hash, created_at)
    VALUES
      (v_version_id, p_version->>'setId', (p_version->>'versionNumber')::INT,
       v_market_code, p_version->>'status', p_version->>'reason',
       NULLIF(p_version->>'effectiveFrom','')::TIMESTAMPTZ,
       NULLIF(p_version->>'effectiveUntil','')::TIMESTAMPTZ,
       NULLIF(p_version->>'createdBy','')::UUID,
       NULLIF(p_version->>'approvedBy','')::UUID,
       NULLIF(p_version->>'publishedAt','')::TIMESTAMPTZ,
       COALESCE(p_version->'conflicts','[]'::JSONB), p_catalog, p_snapshot_hash,
       (p_version->>'createdAt')::TIMESTAMPTZ)
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status, change_reason = EXCLUDED.change_reason,
      effective_from = EXCLUDED.effective_from, effective_until = EXCLUDED.effective_until,
      approved_by = EXCLUDED.approved_by, published_at = EXCLUDED.published_at,
      conflicts = EXCLUDED.conflicts, snapshot = EXCLUDED.snapshot,
      snapshot_hash = EXCLUDED.snapshot_hash, updated_at = NOW();

    DELETE FROM public.monetization_promotion_products
      WHERE promotion_id IN (SELECT id FROM public.monetization_promotions WHERE configuration_version_id = v_version_id);
    DELETE FROM public.monetization_promotions WHERE configuration_version_id = v_version_id;
    DELETE FROM public.monetization_product_entitlements
      WHERE product_version_id IN (SELECT id FROM public.monetization_product_versions WHERE configuration_version_id = v_version_id);
    DELETE FROM public.monetization_prices
      WHERE product_version_id IN (SELECT id FROM public.monetization_product_versions WHERE configuration_version_id = v_version_id);
    DELETE FROM public.monetization_product_versions WHERE configuration_version_id = v_version_id;
    DELETE FROM public.commercial_rules WHERE version_id = v_version_id;

    INSERT INTO public.monetization_products (id, code, kind)
    SELECT p->>'id', p->>'code', p->>'kind' FROM jsonb_array_elements(p_catalog->'products') p
    ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, kind = EXCLUDED.kind;

    INSERT INTO public.monetization_product_versions
      (id, product_id, configuration_version_id, name, description, audience,
       scope, compatibility, status, is_recommended, source_consumers,
       effective_from, effective_until)
    SELECT p->>'versionId', p->>'id', v_version_id, p->>'name', p->>'description', p->>'audience',
      p->'scope', p->'compatibility', p->>'status', COALESCE((p->>'recommended')::BOOLEAN,FALSE),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(p->'sourceConsumers','[]'::JSONB))),
      NULLIF(p->>'effectiveFrom','')::TIMESTAMPTZ, NULLIF(p->>'effectiveUntil','')::TIMESTAMPTZ
    FROM jsonb_array_elements(p_catalog->'products') p;

    INSERT INTO public.monetization_prices
      (id, product_version_id, amount_minor, currency, billing_period, tax_rate_bps,
       price_includes_tax, duration_days, trial_days, effective_from, effective_until)
    SELECT price->>'id', p->>'versionId', (price->'amount'->>'amountMinor')::BIGINT,
      price->'amount'->>'currency', price->>'billingPeriod', (price->>'taxRateBps')::INT,
      (price->>'priceIncludesTax')::BOOLEAN, NULLIF(price->>'durationDays','')::INT,
      NULLIF(price->>'trialDays','')::INT, NULLIF(price->>'effectiveFrom','')::TIMESTAMPTZ,
      NULLIF(price->>'effectiveUntil','')::TIMESTAMPTZ
    FROM jsonb_array_elements(p_catalog->'products') p
    CROSS JOIN LATERAL jsonb_array_elements(p->'prices') price;

    INSERT INTO public.monetization_product_entitlements
      (product_version_id, entitlement_key, label, entitlement_value, unit)
    SELECT p->>'versionId', e->>'key', e->>'label', e->'value', NULLIF(e->>'unit','')
    FROM jsonb_array_elements(p_catalog->'products') p
    CROSS JOIN LATERAL jsonb_array_elements(p->'entitlements') e;

    INSERT INTO public.commercial_rules
      (id, version_id, rule_key, name, description, priority, is_mandatory,
       scope, conditions, outcome, status, effective_from, effective_until)
    SELECT r->>'id', v_version_id, r->>'key', r->>'name', r->>'description',
      (r->>'priority')::INT, COALESCE((r->>'mandatory')::BOOLEAN,FALSE),
      r->'scope', r->'conditions', r->'outcome', r->>'status',
      NULLIF(r->>'effectiveFrom','')::TIMESTAMPTZ, NULLIF(r->>'effectiveUntil','')::TIMESTAMPTZ
    FROM jsonb_array_elements(p_catalog->'rules') r;

    INSERT INTO public.monetization_promotions
      (id, configuration_version_id, code, name, status, scope, discount_type,
       discount_value, stacking_policy, maximum_redemptions,
       maximum_redemptions_per_account, starts_at, ends_at)
    SELECT promo->>'id', v_version_id, upper(promo->>'code'), promo->>'name', promo->>'status',
      promo->'scope', promo->>'discountType', (promo->>'discountValue')::BIGINT,
      promo->>'stackingPolicy', NULLIF(promo->>'maximumRedemptions','')::BIGINT,
      (promo->>'maximumRedemptionsPerAccount')::INT,
      (promo->>'startsAt')::TIMESTAMPTZ, (promo->>'endsAt')::TIMESTAMPTZ
    FROM jsonb_array_elements(p_catalog->'promotions') promo;

    INSERT INTO public.monetization_promotion_products (promotion_id, product_id)
    SELECT promo->>'id', product_id
    FROM jsonb_array_elements(p_catalog->'promotions') promo
    CROSS JOIN LATERAL jsonb_array_elements_text(promo->'productIds') product_id;
END;
$$;

-- Quote header and immutable line items are persisted in the same transaction.
CREATE OR REPLACE FUNCTION public.save_monetization_quote(
    p_quote JSONB,
    p_idempotency_key VARCHAR
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_existing JSONB;
    v_promotion public.monetization_promotions%ROWTYPE;
    v_redemption_count BIGINT;
BEGIN
    SELECT quote_snapshot INTO v_existing FROM public.monetization_quotes
      WHERE account_id = (p_quote->>'accountId')::UUID AND idempotency_key = p_idempotency_key;
    IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

    IF NULLIF(p_quote->>'promotionCode','') IS NOT NULL THEN
      PERFORM pg_advisory_xact_lock(
        hashtext((p_quote->>'configurationVersionId') || ':' || upper(p_quote->>'promotionCode'))
      );
      SELECT * INTO v_promotion FROM public.monetization_promotions
        WHERE configuration_version_id = p_quote->>'configurationVersionId'
          AND code = upper(p_quote->>'promotionCode')
          AND status = 'active' AND starts_at <= NOW() AND ends_at > NOW()
        FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'promotion unavailable'; END IF;

      IF v_promotion.maximum_redemptions IS NOT NULL THEN
        SELECT
          (SELECT COUNT(*) FROM public.monetization_promotion_redemptions
            WHERE promotion_id = v_promotion.id) +
          (SELECT COUNT(*) FROM public.monetization_quotes
            WHERE configuration_version_id = v_promotion.configuration_version_id
              AND promotion_code = v_promotion.code AND status = 'active' AND expires_at > NOW())
          INTO v_redemption_count;
        IF v_redemption_count >= v_promotion.maximum_redemptions THEN
          RAISE EXCEPTION 'promotion redemption limit reached';
        END IF;
      END IF;

      SELECT
        (SELECT COUNT(*) FROM public.monetization_promotion_redemptions
          WHERE promotion_id = v_promotion.id
            AND account_id = (p_quote->>'accountId')::UUID) +
        (SELECT COUNT(*) FROM public.monetization_quotes
          WHERE configuration_version_id = v_promotion.configuration_version_id
            AND promotion_code = v_promotion.code
            AND account_id = (p_quote->>'accountId')::UUID
            AND status = 'active' AND expires_at > NOW())
        INTO v_redemption_count;
      IF v_redemption_count >= v_promotion.maximum_redemptions_per_account THEN
        RAISE EXCEPTION 'promotion account redemption limit reached';
      END IF;
    END IF;

    BEGIN
      INSERT INTO public.monetization_quotes
        (id, account_id, configuration_version_id, market_code, currency,
         subtotal_minor, discount_minor, tax_minor, total_minor, promotion_code,
         snapshot_hash, quote_snapshot, reason_code, status, idempotency_key,
         expires_at, created_at)
      VALUES
        (p_quote->>'id', (p_quote->>'accountId')::UUID, p_quote->>'configurationVersionId',
         p_quote->>'marketCode', p_quote->>'currency', (p_quote->>'subtotalMinor')::BIGINT,
         (p_quote->>'discountMinor')::BIGINT, (p_quote->>'taxMinor')::BIGINT,
         (p_quote->>'totalMinor')::BIGINT, NULLIF(p_quote->>'promotionCode',''),
         p_quote->>'snapshotHash', p_quote, p_quote->>'reasonCode', p_quote->>'status',
         p_idempotency_key, (p_quote->>'expiresAt')::TIMESTAMPTZ,
         (p_quote->>'createdAt')::TIMESTAMPTZ);
    EXCEPTION WHEN unique_violation THEN
      SELECT quote_snapshot INTO v_existing FROM public.monetization_quotes
        WHERE account_id = (p_quote->>'accountId')::UUID AND idempotency_key = p_idempotency_key;
      IF v_existing IS NULL THEN RAISE; END IF;
      RETURN v_existing;
    END;

    INSERT INTO public.monetization_quote_items
      (quote_id, line_number, product_id, product_version_id, price_id, billing_period, label, quantity,
       unit_amount_minor, subtotal_minor, discount_minor, tax_minor, total_minor,
       tax_rate_bps, entitlement_snapshot)
    SELECT p_quote->>'id', ordinality::SMALLINT, line->>'productId', line->>'productVersionId',
      line->>'priceId', line->>'billingPeriod', line->>'label', (line->>'quantity')::INT, (line->>'unitAmountMinor')::BIGINT,
      (line->>'subtotalMinor')::BIGINT, (line->>'discountMinor')::BIGINT,
      (line->>'taxMinor')::BIGINT, (line->>'totalMinor')::BIGINT,
      (line->>'taxRateBps')::INT, COALESCE(line->'entitlementSnapshot','[]'::JSONB)
    FROM jsonb_array_elements(p_quote->'lines') WITH ORDINALITY AS quote_rows(line, ordinality);
    RETURN p_quote;
END;
$$;

-- Browser/anon roles have no direct write path. The backend service role owns
-- mutations and performs application RBAC. Public catalog reads also go through
-- the typed backend to keep draft configuration private.
ALTER TABLE public.commercial_rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_configuration_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_product_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_product_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_promotion_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_configuration_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_configuration_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON FUNCTION public.consume_monetization_quota(UUID,VARCHAR,VARCHAR,TIMESTAMPTZ,TIMESTAMPTZ,BIGINT,BIGINT,BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_monetization_payment_event(VARCHAR,VARCHAR,VARCHAR,TEXT,VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_monetization_stripe_event(VARCHAR,VARCHAR,TEXT,VARCHAR,VARCHAR,VARCHAR,TEXT,VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_monetization_stripe_subscription_event(VARCHAR,VARCHAR,TEXT,VARCHAR,VARCHAR,TIMESTAMPTZ,TIMESTAMPTZ,BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_commercial_configuration(VARCHAR,UUID,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_due_commercial_configurations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.import_commercial_catalog(JSONB,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_commercial_configuration_version(JSONB,JSONB,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_monetization_quote(JSONB,VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_monetization_quota(UUID,VARCHAR,VARCHAR,TIMESTAMPTZ,TIMESTAMPTZ,BIGINT,BIGINT,BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_monetization_payment_event(VARCHAR,VARCHAR,VARCHAR,TEXT,VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_monetization_stripe_event(VARCHAR,VARCHAR,TEXT,VARCHAR,VARCHAR,VARCHAR,TEXT,VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_monetization_stripe_subscription_event(VARCHAR,VARCHAR,TEXT,VARCHAR,VARCHAR,TIMESTAMPTZ,TIMESTAMPTZ,BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_commercial_configuration(VARCHAR,UUID,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_due_commercial_configurations() TO service_role;
GRANT EXECUTE ON FUNCTION public.import_commercial_catalog(JSONB,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_commercial_configuration_version(JSONB,JSONB,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_monetization_quote(JSONB,VARCHAR) TO service_role;

COMMENT ON TABLE public.commercial_configuration_versions IS 'Versioned, four-eyes-approved commercial configuration. snapshot is the immutable runtime/API contract; normalized children remain queryable.';
COMMENT ON TABLE public.monetization_quotes IS 'Immutable authoritative server quote; the client never supplies monetary amounts.';
COMMENT ON TABLE public.monetization_payment_events IS 'Idempotency ledger for payment provider webhooks.';
COMMENT ON TABLE public.commercial_configuration_audit IS 'Append-only audit evidence including reason, before/after and approval actor.';
