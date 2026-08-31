-- =============================================================================
-- Atomic subscription catalog transitions
--
-- A subscription and every projected entitlement retain the exact immutable
-- commercial snapshot that authorized them. Plan changes are serialized,
-- stale-state checked, organization-authorized and idempotent in one database
-- transaction. Missing historical evidence remains nullable but cannot be used
-- for a plan change; all new activations are hydrated or rejected.
-- =============================================================================

ALTER TABLE public.monetization_subscriptions
  ADD COLUMN IF NOT EXISTS configuration_version_id VARCHAR(160)
    REFERENCES public.commercial_configuration_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS market_code VARCHAR(2)
    REFERENCES public.markets(code) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS scheduled_product_version_id VARCHAR(240)
    REFERENCES public.monetization_product_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS scheduled_configuration_version_id VARCHAR(160)
    REFERENCES public.commercial_configuration_versions(id) ON DELETE RESTRICT;

ALTER TABLE public.monetization_entitlements
  ADD COLUMN IF NOT EXISTS product_version_id VARCHAR(240)
    REFERENCES public.monetization_product_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS configuration_version_id VARCHAR(160)
    REFERENCES public.commercial_configuration_versions(id) ON DELETE RESTRICT;

ALTER TABLE public.monetization_orders
  ADD COLUMN IF NOT EXISTS configuration_version_id VARCHAR(160)
    REFERENCES public.commercial_configuration_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS market_code VARCHAR(2)
    REFERENCES public.markets(code) ON DELETE RESTRICT;

ALTER TABLE public.monetization_invoices
  ADD COLUMN IF NOT EXISTS configuration_version_id VARCHAR(160)
    REFERENCES public.commercial_configuration_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS market_code VARCHAR(2)
    REFERENCES public.markets(code) ON DELETE RESTRICT;

UPDATE public.monetization_orders order_row
SET configuration_version_id = quote.configuration_version_id,
    market_code = quote.market_code
FROM public.monetization_quotes quote
WHERE quote.id = order_row.quote_id
  AND (order_row.configuration_version_id IS NULL OR order_row.market_code IS NULL);

UPDATE public.monetization_invoices invoice
SET configuration_version_id = COALESCE(
      (
        SELECT order_row.configuration_version_id
        FROM public.monetization_orders order_row
        WHERE order_row.id = invoice.order_id
      ),
      (
        SELECT subscription.configuration_version_id
        FROM public.monetization_subscriptions subscription
        WHERE subscription.id = invoice.subscription_id
      )
    ),
    market_code = COALESCE(
      (
        SELECT order_row.market_code
        FROM public.monetization_orders order_row
        WHERE order_row.id = invoice.order_id
      ),
      (
        SELECT subscription.market_code
        FROM public.monetization_subscriptions subscription
        WHERE subscription.id = invoice.subscription_id
      )
    )
WHERE invoice.configuration_version_id IS NULL OR invoice.market_code IS NULL;

CREATE OR REPLACE FUNCTION public.hydrate_monetization_order_catalog_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  target RECORD;
BEGIN
  SELECT quote.configuration_version_id, quote.market_code
  INTO target
  FROM public.monetization_quotes quote
  WHERE quote.id = NEW.quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order catalog evidence is missing' USING ERRCODE = '23514';
  END IF;
  IF NEW.configuration_version_id IS NOT NULL
     AND NEW.configuration_version_id IS DISTINCT FROM target.configuration_version_id THEN
    RAISE EXCEPTION 'order configuration version mismatch' USING ERRCODE = '23514';
  END IF;
  IF NEW.market_code IS NOT NULL
     AND NEW.market_code IS DISTINCT FROM target.market_code THEN
    RAISE EXCEPTION 'order market mismatch' USING ERRCODE = '23514';
  END IF;
  NEW.configuration_version_id := target.configuration_version_id;
  NEW.market_code := target.market_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hydrate_monetization_order_catalog_evidence
  ON public.monetization_orders;
CREATE TRIGGER hydrate_monetization_order_catalog_evidence
BEFORE INSERT ON public.monetization_orders
FOR EACH ROW EXECUTE FUNCTION public.hydrate_monetization_order_catalog_evidence();

CREATE OR REPLACE FUNCTION public.hydrate_monetization_invoice_catalog_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  target RECORD;
BEGIN
  SELECT
    COALESCE(order_row.configuration_version_id, subscription.configuration_version_id)
      AS configuration_version_id,
    COALESCE(order_row.market_code, subscription.market_code) AS market_code
  INTO target
  FROM (SELECT 1) seed
  LEFT JOIN public.monetization_orders order_row ON order_row.id = NEW.order_id
  LEFT JOIN public.monetization_subscriptions subscription
    ON subscription.id = NEW.subscription_id;
  IF target.configuration_version_id IS NULL OR target.market_code IS NULL THEN
    RAISE EXCEPTION 'invoice catalog evidence is missing' USING ERRCODE = '23514';
  END IF;
  NEW.configuration_version_id := target.configuration_version_id;
  NEW.market_code := target.market_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hydrate_monetization_invoice_catalog_evidence
  ON public.monetization_invoices;
CREATE TRIGGER hydrate_monetization_invoice_catalog_evidence
BEFORE INSERT ON public.monetization_invoices
FOR EACH ROW EXECUTE FUNCTION public.hydrate_monetization_invoice_catalog_evidence();

UPDATE public.monetization_subscriptions subscription
SET
  product_version_id = COALESCE(subscription.product_version_id, price.product_version_id),
  configuration_version_id = product_version.configuration_version_id,
  market_code = configuration.market_code,
  currency = price.currency,
  billing_period = price.billing_period
FROM public.monetization_prices price
JOIN public.monetization_product_versions product_version
  ON product_version.id = price.product_version_id
JOIN public.commercial_configuration_versions configuration
  ON configuration.id = product_version.configuration_version_id
WHERE price.id = subscription.price_id
  AND product_version.product_id = subscription.product_id
  AND (
    subscription.configuration_version_id IS NULL
    OR subscription.market_code IS NULL
    OR subscription.currency IS NULL
    OR subscription.product_version_id IS NULL
  );

UPDATE public.monetization_subscriptions subscription
SET
  product_version_id = quote_item.product_version_id,
  price_id = quote_item.price_id,
  configuration_version_id = quote.configuration_version_id,
  market_code = quote.market_code,
  currency = quote.currency,
  billing_period = quote_item.billing_period
FROM public.monetization_orders order_row
JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
JOIN public.monetization_quote_items quote_item ON quote_item.quote_id = quote.id
WHERE order_row.id = subscription.source_order_id
  AND quote_item.product_id = subscription.product_id
  AND subscription.configuration_version_id IS NULL;

UPDATE public.monetization_invoices invoice
SET configuration_version_id = subscription.configuration_version_id,
    market_code = subscription.market_code
FROM public.monetization_subscriptions subscription
WHERE subscription.id = invoice.subscription_id
  AND (invoice.configuration_version_id IS NULL OR invoice.market_code IS NULL);

UPDATE public.monetization_entitlements entitlement
SET
  product_version_id = quote_item.product_version_id,
  configuration_version_id = quote.configuration_version_id
FROM public.monetization_orders order_row
JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
JOIN public.monetization_quote_items quote_item ON quote_item.quote_id = quote.id
JOIN public.monetization_product_entitlements definition
  ON definition.product_version_id = quote_item.product_version_id
WHERE order_row.id = entitlement.source_order_id
  AND quote_item.product_id = entitlement.product_id
  AND definition.entitlement_key = entitlement.entitlement_key
  AND entitlement.configuration_version_id IS NULL;

CREATE OR REPLACE FUNCTION public.hydrate_monetization_entitlement_catalog_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  target RECORD;
  evidence_found BOOLEAN := FALSE;
BEGIN
  IF NEW.product_version_id IS NULL OR NEW.configuration_version_id IS NULL THEN
    IF NEW.source_order_id IS NOT NULL THEN
      SELECT item.product_version_id, quote.configuration_version_id
      INTO target
      FROM public.monetization_orders order_row
      JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
      JOIN public.monetization_quote_items item ON item.quote_id = quote.id
      JOIN public.monetization_product_entitlements definition
        ON definition.product_version_id = item.product_version_id
      WHERE order_row.id = NEW.source_order_id
        AND item.product_id = NEW.product_id
        AND definition.entitlement_key = NEW.entitlement_key
      ORDER BY item.line_number
      LIMIT 1;
      evidence_found := FOUND;
    ELSIF NEW.complimentary_grant_id IS NOT NULL THEN
      SELECT grant_row.product_version_id, product_version.configuration_version_id
      INTO target
      FROM public.monetization_complimentary_grants grant_row
      JOIN public.monetization_product_versions product_version
        ON product_version.id = grant_row.product_version_id
      WHERE grant_row.id = NEW.complimentary_grant_id;
      evidence_found := FOUND;
    END IF;
    IF NOT evidence_found THEN
      RAISE EXCEPTION 'entitlement catalog evidence is missing'
        USING ERRCODE = '23514';
    END IF;
    NEW.product_version_id := target.product_version_id;
    NEW.configuration_version_id := target.configuration_version_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hydrate_monetization_entitlement_catalog_evidence
  ON public.monetization_entitlements;
CREATE TRIGGER hydrate_monetization_entitlement_catalog_evidence
BEFORE INSERT ON public.monetization_entitlements
FOR EACH ROW EXECUTE FUNCTION public.hydrate_monetization_entitlement_catalog_evidence();

CREATE OR REPLACE FUNCTION public.hydrate_monetization_subscription_catalog_evidence()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  target RECORD;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.product_id IS DISTINCT FROM OLD.product_id
     OR NEW.price_id IS DISTINCT FROM OLD.price_id THEN
    IF NEW.price_id IS NULL THEN
      SELECT
        item.product_version_id, item.price_id, item.billing_period,
        quote.configuration_version_id, quote.market_code, quote.currency,
        product_version.product_id
      INTO target
      FROM public.monetization_orders order_row
      JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
      JOIN public.monetization_quote_items item ON item.quote_id = quote.id
      JOIN public.monetization_product_versions product_version
        ON product_version.id = item.product_version_id
      WHERE order_row.id = NEW.source_order_id
        AND item.product_id = NEW.product_id
      ORDER BY item.line_number
      LIMIT 1;
    ELSE
      SELECT
        product_version.id AS product_version_id, price.id AS price_id,
        price.billing_period, product_version.configuration_version_id,
        configuration.market_code, price.currency, product_version.product_id
      INTO target
      FROM public.monetization_prices price
      JOIN public.monetization_product_versions product_version
        ON product_version.id = price.product_version_id
      JOIN public.commercial_configuration_versions configuration
        ON configuration.id = product_version.configuration_version_id
      WHERE price.id = NEW.price_id;
    END IF;
    IF NOT FOUND OR target.product_id IS DISTINCT FROM NEW.product_id THEN
      RAISE EXCEPTION 'subscription catalog evidence is missing or mismatched'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.product_version_id IS NOT NULL
       AND NEW.product_version_id IS DISTINCT FROM target.product_version_id THEN
      RAISE EXCEPTION 'subscription product version mismatch' USING ERRCODE = '23514';
    END IF;
    IF NEW.configuration_version_id IS NOT NULL
       AND NEW.configuration_version_id IS DISTINCT FROM target.configuration_version_id THEN
      RAISE EXCEPTION 'subscription configuration version mismatch' USING ERRCODE = '23514';
    END IF;
    NEW.product_version_id := target.product_version_id;
    NEW.price_id := target.price_id;
    NEW.configuration_version_id := target.configuration_version_id;
    NEW.market_code := target.market_code;
    NEW.currency := target.currency;
    NEW.billing_period := target.billing_period;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hydrate_monetization_subscription_catalog_evidence
  ON public.monetization_subscriptions;
CREATE TRIGGER hydrate_monetization_subscription_catalog_evidence
BEFORE INSERT OR UPDATE OF product_id, price_id
ON public.monetization_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.hydrate_monetization_subscription_catalog_evidence();

ALTER TABLE public.monetization_subscriptions
  DROP CONSTRAINT IF EXISTS monetization_subscriptions_scheduled_change_check,
  ADD CONSTRAINT monetization_subscriptions_scheduled_change_check CHECK (
    (
      scheduled_product_id IS NULL AND scheduled_product_version_id IS NULL
      AND scheduled_configuration_version_id IS NULL AND scheduled_price_id IS NULL
      AND scheduled_change_at IS NULL
    ) OR (
      scheduled_product_id IS NOT NULL AND scheduled_product_version_id IS NOT NULL
      AND scheduled_configuration_version_id IS NOT NULL AND scheduled_price_id IS NOT NULL
      AND scheduled_change_at IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION public.sync_monetization_subscription_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  entitlement_status TEXT;
  entitlement_end TIMESTAMPTZ;
BEGIN
  IF OLD.product_id IS NOT DISTINCT FROM NEW.product_id
     AND OLD.product_version_id IS NOT DISTINCT FROM NEW.product_version_id THEN
    RETURN NEW;
  END IF;
  IF NEW.product_version_id IS NULL OR NEW.configuration_version_id IS NULL
     OR NEW.price_id IS NULL THEN
    RAISE EXCEPTION 'subscription plan change requires complete catalog evidence';
  END IF;

  entitlement_status := CASE
    WHEN NEW.status IN ('trialing', 'active', 'past_due', 'cancellation_pending')
      THEN 'active'
    ELSE 'scheduled'
  END;
  entitlement_end := GREATEST(NEW.current_period_end, NOW() + INTERVAL '1 microsecond');

  UPDATE public.monetization_entitlements
  SET status = 'revoked',
      ends_at = GREATEST(starts_at + INTERVAL '1 microsecond', NOW()),
      updated_at = NOW()
  WHERE source_order_id = NEW.source_order_id
    AND product_id = OLD.product_id
    AND complimentary_grant_id IS NULL
    AND status IN ('scheduled', 'active');

  INSERT INTO public.monetization_entitlements (
    account_id, organization_id, product_id, product_version_id,
    configuration_version_id, entitlement_key, entitlement_value,
    source_order_id, starts_at, ends_at, status, vertical_id, merge_policy
  )
  SELECT
    NEW.account_id, NEW.organization_id, NEW.product_id, NEW.product_version_id,
    NEW.configuration_version_id, definition.entitlement_key,
    definition.entitlement_value, NEW.source_order_id, NOW(), entitlement_end,
    entitlement_status, COALESCE(definition.vertical_id, NEW.vertical_id),
    definition.merge_policy
  FROM public.monetization_product_entitlements definition
  WHERE definition.product_version_id = NEW.product_version_id
    AND definition.implementation_status = 'ready'
    AND definition.availability IN ('enabled', 'beta')
  ON CONFLICT (source_order_id, product_id, entitlement_key) DO UPDATE SET
    product_version_id = EXCLUDED.product_version_id,
    configuration_version_id = EXCLUDED.configuration_version_id,
    entitlement_value = EXCLUDED.entitlement_value,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    status = EXCLUDED.status,
    vertical_id = EXCLUDED.vertical_id,
    merge_policy = EXCLUDED.merge_policy,
    updated_at = NOW();

  UPDATE public.monetization_subscription_items
  SET status = 'expired',
      ends_at = GREATEST(starts_at + INTERVAL '1 microsecond', NOW()),
      updated_at = NOW()
  WHERE subscription_id = NEW.id
    AND product_id = OLD.product_id
    AND status IN ('scheduled', 'active');

  INSERT INTO public.monetization_subscription_items (
    subscription_id, product_id, product_version_id, price_id, quantity,
    status, starts_at, ends_at
  ) VALUES (
    NEW.id, NEW.product_id, NEW.product_version_id, NEW.price_id, 1,
    entitlement_status, NOW(), entitlement_end
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_monetization_subscription_plan_change
  ON public.monetization_subscriptions;
CREATE TRIGGER sync_monetization_subscription_plan_change
AFTER UPDATE OF product_id, product_version_id
ON public.monetization_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_monetization_subscription_plan_change();

CREATE OR REPLACE FUNCTION public.apply_monetization_subscription_change(
  p_subscription_id UUID,
  p_actor_id UUID,
  p_target_product_id VARCHAR,
  p_target_product_version_id VARCHAR,
  p_target_configuration_version_id VARCHAR,
  p_target_price_id VARCHAR,
  p_effective_at VARCHAR,
  p_change_at TIMESTAMPTZ,
  p_expected_updated_at TIMESTAMPTZ,
  p_idempotency_key VARCHAR
) RETURNS public.monetization_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_row public.monetization_subscriptions%ROWTYPE;
  target RECORD;
BEGIN
  SELECT * INTO current_row
  FROM public.monetization_subscriptions
  WHERE id = p_subscription_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'subscription not found' USING ERRCODE = 'P0002'; END IF;

  IF current_row.account_id IS DISTINCT FROM p_actor_id THEN
    IF current_row.organization_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.organization_members member
      JOIN public.organizations organization ON organization.id = member.organization_id
      WHERE member.organization_id = current_row.organization_id
        AND member.user_id = p_actor_id
        AND member.status = 'active'
        AND organization.status = 'active'
        AND (
          member.role IN ('owner', 'admin')
          OR member.permissions @> ARRAY['subscription.manage.own']::TEXT[]
        )
    ) THEN
      RAISE EXCEPTION 'subscription not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.monetization_subscription_events
    WHERE subscription_id = p_subscription_id
      AND idempotency_key = p_idempotency_key
  ) THEN
    RETURN current_row;
  END IF;

  IF p_expected_updated_at IS NOT NULL
     AND current_row.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'stale subscription state' USING ERRCODE = '40001';
  END IF;
  IF current_row.status NOT IN ('trialing', 'active', 'cancellation_pending') THEN
    RAISE EXCEPTION 'subscription status does not allow a plan change'
      USING ERRCODE = '23514';
  END IF;
  IF p_effective_at NOT IN ('immediately', 'period_end') THEN
    RAISE EXCEPTION 'invalid plan change timing' USING ERRCODE = '23514';
  END IF;
  IF p_effective_at = 'period_end'
     AND (p_change_at IS NULL
       OR p_change_at IS DISTINCT FROM current_row.current_period_end) THEN
    RAISE EXCEPTION 'stale subscription change boundary' USING ERRCODE = '40001';
  END IF;

  SELECT
    product_version.product_id, product_version.id AS product_version_id,
    product_version.configuration_version_id, configuration.market_code,
    price.id AS price_id, price.currency, price.billing_period
  INTO target
  FROM public.monetization_product_versions product_version
  JOIN public.commercial_configuration_versions configuration
    ON configuration.id = product_version.configuration_version_id
  JOIN public.monetization_prices price
    ON price.product_version_id = product_version.id
  WHERE product_version.id = p_target_product_version_id
    AND product_version.product_id = p_target_product_id
    AND product_version.configuration_version_id = p_target_configuration_version_id
    AND price.id = p_target_price_id;
  IF NOT FOUND
     OR target.market_code IS DISTINCT FROM current_row.market_code
     OR target.currency IS DISTINCT FROM current_row.currency THEN
    RAISE EXCEPTION 'target catalog evidence does not match subscription market'
      USING ERRCODE = '23514';
  END IF;

  IF p_effective_at = 'period_end' THEN
    UPDATE public.monetization_subscriptions
    SET scheduled_product_id = target.product_id,
        scheduled_product_version_id = target.product_version_id,
        scheduled_configuration_version_id = target.configuration_version_id,
        scheduled_price_id = target.price_id,
        scheduled_change_at = current_period_end,
        updated_at = NOW()
    WHERE id = current_row.id
    RETURNING * INTO current_row;
  ELSE
    UPDATE public.monetization_subscriptions
    SET product_id = target.product_id,
        product_version_id = target.product_version_id,
        configuration_version_id = target.configuration_version_id,
        price_id = target.price_id,
        market_code = target.market_code,
        currency = target.currency,
        billing_period = target.billing_period,
        scheduled_product_id = NULL,
        scheduled_product_version_id = NULL,
        scheduled_configuration_version_id = NULL,
        scheduled_price_id = NULL,
        scheduled_change_at = NULL,
        updated_at = NOW()
    WHERE id = current_row.id
    RETURNING * INTO current_row;
  END IF;

  INSERT INTO public.monetization_subscription_events (
    subscription_id, account_id, event_type, from_status, to_status, metadata,
    idempotency_key, actor_id
  ) VALUES (
    current_row.id, current_row.account_id,
    CASE WHEN p_effective_at = 'period_end' THEN 'change_scheduled' ELSE 'changed' END,
    current_row.status, current_row.status,
    jsonb_build_object(
      'productId', target.product_id,
      'productVersionId', target.product_version_id,
      'configurationVersionId', target.configuration_version_id,
      'priceId', target.price_id,
      'effectiveAt', p_effective_at
    ),
    p_idempotency_key, p_actor_id
  );
  RETURN current_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_monetization_payment_failure_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  policy JSONB;
  behavior TEXT;
  grace_days INT;
BEGIN
  IF NEW.status = 'past_due' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT snapshot->'subscriptionPolicy' INTO policy
    FROM public.commercial_configuration_versions
    WHERE id = NEW.configuration_version_id;
    behavior := COALESCE(policy->>'paymentFailureAccess', 'not_configured');
    grace_days := NULLIF(policy->>'gracePeriodDays', '')::INT;
    IF behavior = 'grace_period' AND grace_days IS NOT NULL THEN
      NEW.grace_period_ends_at := NOW() + make_interval(days => grace_days);
    ELSE
      NEW.grace_period_ends_at := NULL;
    END IF;
  ELSIF NEW.status IN ('active', 'trialing') THEN
    NEW.grace_period_ends_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_monetization_payment_failure_policy
  ON public.monetization_subscriptions;
CREATE TRIGGER apply_monetization_payment_failure_policy
BEFORE UPDATE OF status ON public.monetization_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.apply_monetization_payment_failure_policy();

CREATE OR REPLACE FUNCTION public.enforce_monetization_payment_failure_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  behavior TEXT;
BEGIN
  IF NEW.status = 'past_due' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT COALESCE(
      snapshot->'subscriptionPolicy'->>'paymentFailureAccess',
      'not_configured'
    ) INTO behavior
    FROM public.commercial_configuration_versions
    WHERE id = NEW.configuration_version_id;
    IF behavior IS DISTINCT FROM 'grace_period' THEN
      UPDATE public.monetization_entitlements
      SET status = 'revoked',
          ends_at = GREATEST(starts_at + INTERVAL '1 microsecond', NOW()),
          updated_at = NOW()
      WHERE source_order_id = NEW.source_order_id
        AND product_id = NEW.product_id
        AND status IN ('active', 'scheduled');
    END IF;
  ELSIF NEW.status IN ('suspended', 'paused', 'cancelled', 'expired')
        AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.monetization_entitlements
    SET status = CASE WHEN NEW.status IN ('cancelled', 'expired') THEN 'expired' ELSE 'revoked' END,
        ends_at = GREATEST(starts_at + INTERVAL '1 microsecond', NOW()),
        updated_at = NOW()
    WHERE source_order_id = NEW.source_order_id
      AND product_id = NEW.product_id
      AND status IN ('active', 'scheduled');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_monetization_payment_failure_access
  ON public.monetization_subscriptions;
CREATE TRIGGER enforce_monetization_payment_failure_access
AFTER UPDATE OF status ON public.monetization_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_monetization_payment_failure_access();

REVOKE ALL ON FUNCTION public.apply_monetization_subscription_change(
  UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TIMESTAMPTZ,
  TIMESTAMPTZ, VARCHAR
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_monetization_subscription_change(
  UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TIMESTAMPTZ,
  TIMESTAMPTZ, VARCHAR
) TO service_role;

COMMENT ON FUNCTION public.apply_monetization_subscription_change(
  UUID, UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, TIMESTAMPTZ,
  TIMESTAMPTZ, VARCHAR
) IS 'Atomically schedules or applies one authorized, idempotent catalog-backed plan change.';
