-- Commercial feature truth metadata.
--
-- The immutable configuration snapshot remains the source of truth. These
-- normalized columns make readiness, availability and dependencies queryable
-- without creating a second Admin configuration surface.

ALTER TABLE public.monetization_product_entitlements
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS feature_type TEXT NOT NULL DEFAULT 'scoped_permission',
  ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'enabled',
  ADD COLUMN IF NOT EXISTS implementation_status TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS dependencies TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS admin_help_text TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS merge_policy TEXT NOT NULL DEFAULT 'override',
  ADD COLUMN IF NOT EXISTS vertical_id TEXT,
  ADD COLUMN IF NOT EXISTS category_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS recurring_grant JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monetization_product_entitlements_feature_type_check'
      AND conrelid = 'public.monetization_product_entitlements'::regclass
  ) THEN
    ALTER TABLE public.monetization_product_entitlements
      ADD CONSTRAINT monetization_product_entitlements_feature_type_check
      CHECK (feature_type IN (
        'boolean', 'integer_quota', 'additive_quota', 'level',
        'monetary_credit', 'scoped_permission'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monetization_product_entitlements_availability_check'
      AND conrelid = 'public.monetization_product_entitlements'::regclass
  ) THEN
    ALTER TABLE public.monetization_product_entitlements
      ADD CONSTRAINT monetization_product_entitlements_availability_check
      CHECK (availability IN ('enabled', 'beta', 'maintenance', 'disabled'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monetization_product_entitlements_implementation_check'
      AND conrelid = 'public.monetization_product_entitlements'::regclass
  ) THEN
    ALTER TABLE public.monetization_product_entitlements
      ADD CONSTRAINT monetization_product_entitlements_implementation_check
      CHECK (implementation_status IN ('ready', 'incomplete', 'external_dependency'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monetization_product_entitlements_merge_policy_check'
      AND conrelid = 'public.monetization_product_entitlements'::regclass
  ) THEN
    ALTER TABLE public.monetization_product_entitlements
      ADD CONSTRAINT monetization_product_entitlements_merge_policy_check
      CHECK (merge_policy IN ('boolean_or', 'max', 'additive', 'override'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monetization_product_entitlements_vertical_id_check'
      AND conrelid = 'public.monetization_product_entitlements'::regclass
  ) THEN
    ALTER TABLE public.monetization_product_entitlements
      ADD CONSTRAINT monetization_product_entitlements_vertical_id_check
      CHECK (
        vertical_id IS NULL OR
        vertical_id ~ '^[a-z][a-z0-9_-]{1,29}$'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monetization_product_entitlements_recurring_grant_check'
      AND conrelid = 'public.monetization_product_entitlements'::regclass
  ) THEN
    ALTER TABLE public.monetization_product_entitlements
      ADD CONSTRAINT monetization_product_entitlements_recurring_grant_check
      CHECK (recurring_grant IS NULL OR jsonb_typeof(recurring_grant) = 'object');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_commercial_entitlement_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_definition JSONB;
BEGIN
  SELECT entitlement
    INTO v_definition
  FROM public.monetization_product_versions product_version
  JOIN public.commercial_configuration_versions configuration
    ON configuration.id = product_version.configuration_version_id
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(configuration.snapshot->'products', '[]'::JSONB)
  ) product
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(product->'entitlements', '[]'::JSONB)
  ) entitlement
  WHERE product_version.id = NEW.product_version_id
    AND product->>'versionId' = NEW.product_version_id
    AND entitlement->>'key' = NEW.entitlement_key
  LIMIT 1;

  IF v_definition IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.description := COALESCE(v_definition->>'description', '');
  NEW.feature_type := COALESCE(v_definition->>'featureType', 'scoped_permission');
  NEW.availability := COALESCE(v_definition->>'availability', 'enabled');
  NEW.implementation_status := COALESCE(
    v_definition->>'implementationStatus',
    'ready'
  );
  NEW.dependencies := ARRAY(
    SELECT jsonb_array_elements_text(
      COALESCE(v_definition->'dependencies', '[]'::JSONB)
    )
  );
  NEW.admin_help_text := COALESCE(v_definition->>'adminHelpText', '');
  NEW.merge_policy := COALESCE(v_definition->>'mergePolicy', 'override');
  NEW.vertical_id := NULLIF(v_definition->>'verticalId', '');
  NEW.category_ids := ARRAY(
    SELECT jsonb_array_elements_text(
      COALESCE(v_definition->'categoryIds', '[]'::JSONB)
    )
  );
  NEW.recurring_grant := CASE
    WHEN v_definition ? 'recurringGrant' THEN v_definition->'recurringGrant'
    ELSE NULL
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_commercial_entitlement_metadata
  ON public.monetization_product_entitlements;
CREATE TRIGGER sync_commercial_entitlement_metadata
BEFORE INSERT OR UPDATE OF entitlement_value
ON public.monetization_product_entitlements
FOR EACH ROW
EXECUTE FUNCTION public.sync_commercial_entitlement_metadata();

-- Re-read existing definitions from their immutable snapshots.
UPDATE public.monetization_product_entitlements
SET entitlement_value = entitlement_value;

CREATE INDEX IF NOT EXISTS monetization_product_entitlements_readiness_idx
  ON public.monetization_product_entitlements (
    product_version_id,
    implementation_status,
    availability
  );

COMMENT ON COLUMN public.monetization_product_entitlements.implementation_status
  IS 'Engineering readiness. Admin availability cannot override a non-ready implementation.';
COMMENT ON COLUMN public.monetization_product_entitlements.availability
  IS 'Commercial kill switch stored in the immutable catalog snapshot.';

-- Every grant path applies the same readiness predicate as quote snapshots.
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
  IF NEW.product_version_id IS NULL OR NEW.price_id IS NULL THEN
    RAISE EXCEPTION 'subscription plan change requires a product version and price';
  END IF;

  entitlement_status := CASE
    WHEN NEW.status IN ('trialing', 'active', 'past_due', 'cancellation_pending')
      THEN 'active'
    ELSE 'scheduled'
  END;
  entitlement_end := GREATEST(
    NEW.current_period_end,
    NOW() + INTERVAL '1 microsecond'
  );

  UPDATE public.monetization_entitlements
  SET
    status = 'revoked',
    ends_at = GREATEST(starts_at + INTERVAL '1 microsecond', NOW()),
    updated_at = NOW()
  WHERE source_order_id = NEW.source_order_id
    AND product_id = OLD.product_id
    AND complimentary_grant_id IS NULL
    AND status IN ('scheduled', 'active');

  INSERT INTO public.monetization_entitlements (
    account_id,
    product_id,
    entitlement_key,
    entitlement_value,
    source_order_id,
    starts_at,
    ends_at,
    status,
    vertical_id,
    merge_policy
  )
  SELECT
    NEW.account_id,
    NEW.product_id,
    definition.entitlement_key,
    definition.entitlement_value,
    NEW.source_order_id,
    NOW(),
    entitlement_end,
    entitlement_status,
    COALESCE(definition.vertical_id, NEW.vertical_id),
    definition.merge_policy
  FROM public.monetization_product_entitlements definition
  WHERE definition.product_version_id = NEW.product_version_id
    AND definition.implementation_status = 'ready'
    AND definition.availability IN ('enabled', 'beta')
  ON CONFLICT (source_order_id, product_id, entitlement_key) DO UPDATE SET
    entitlement_value = EXCLUDED.entitlement_value,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    status = EXCLUDED.status,
    vertical_id = EXCLUDED.vertical_id,
    merge_policy = EXCLUDED.merge_policy,
    updated_at = NOW();

  UPDATE public.monetization_subscription_items
  SET
    status = 'expired',
    ends_at = GREATEST(starts_at + INTERVAL '1 microsecond', NOW()),
    updated_at = NOW()
  WHERE subscription_id = NEW.id
    AND product_id = OLD.product_id
    AND status IN ('scheduled', 'active');

  INSERT INTO public.monetization_subscription_items (
    subscription_id,
    product_id,
    product_version_id,
    price_id,
    quantity,
    status,
    starts_at,
    ends_at
  )
  VALUES (
    NEW.id,
    NEW.product_id,
    NEW.product_version_id,
    NEW.price_id,
    1,
    entitlement_status,
    NOW(),
    entitlement_end
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_subscription_recurring_credits(
  p_subscription_id UUID
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  subscription_row public.monetization_subscriptions%ROWTYPE;
  definition RECORD;
  grant_start TIMESTAMPTZ;
  grant_end TIMESTAMPTZ;
  grant_key TEXT;
  granted_count INT := 0;
BEGIN
  SELECT * INTO subscription_row
  FROM public.monetization_subscriptions
  WHERE id = p_subscription_id;
  IF NOT FOUND OR subscription_row.product_version_id IS NULL
     OR subscription_row.status NOT IN ('trialing', 'active', 'cancellation_pending')
     OR subscription_row.current_period_end <= NOW() THEN
    RETURN 0;
  END IF;

  FOR definition IN
    SELECT entitlement_key, recurring_grant
    FROM public.monetization_product_entitlements
    WHERE product_version_id = subscription_row.product_version_id
      AND recurring_grant IS NOT NULL
      AND implementation_status = 'ready'
      AND availability IN ('enabled', 'beta')
  LOOP
    grant_start := CASE definition.recurring_grant->>'resetPeriod'
      WHEN 'month' THEN date_trunc('month', NOW())
      WHEN 'year' THEN date_trunc('year', NOW())
      ELSE subscription_row.current_period_start
    END;
    grant_end := CASE definition.recurring_grant->>'resetPeriod'
      WHEN 'month' THEN grant_start + INTERVAL '1 month'
      WHEN 'year' THEN grant_start + INTERVAL '1 year'
      ELSE subscription_row.current_period_end
    END;
    grant_end := LEAST(grant_end, subscription_row.current_period_end);
    grant_key := 'subscription-credit:' || subscription_row.id::TEXT || ':' ||
      (definition.recurring_grant->>'creditType') || ':' || grant_start::TEXT;

    IF NOT EXISTS (
      SELECT 1 FROM public.monetization_credit_transactions
      WHERE account_id = subscription_row.account_id
        AND idempotency_key = grant_key
    ) THEN
      PERFORM public.record_monetization_credit_transaction(
        subscription_row.account_id,
        definition.recurring_grant->>'creditType',
        (definition.recurring_grant->>'quantity')::BIGINT,
        'Allocation récurrente du forfait ' || subscription_row.product_id,
        'subscription',
        subscription_row.id::TEXT,
        grant_end,
        grant_key,
        NULL
      );
      granted_count := granted_count + 1;
    END IF;
  END LOOP;
  RETURN granted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_complimentary_plan(
  p_account_id UUID,
  p_product_version_id VARCHAR,
  p_reason TEXT,
  p_campaign_id VARCHAR,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_granted_by UUID,
  p_approved_by UUID,
  p_idempotency_key VARCHAR
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_profile public.monetization_product_commercial_profiles%ROWTYPE;
  grant_id UUID;
BEGIN
  IF p_granted_by = p_approved_by THEN
    RAISE EXCEPTION 'four-eyes approval required';
  END IF;
  SELECT * INTO target_profile
  FROM public.monetization_product_commercial_profiles
  WHERE product_version_id = p_product_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'commercial profile not found';
  END IF;

  INSERT INTO public.monetization_complimentary_grants (
    account_id,
    product_id,
    product_version_id,
    vertical_id,
    campaign_id,
    reason,
    granted_by,
    approved_by,
    starts_at,
    ends_at,
    idempotency_key
  ) VALUES (
    p_account_id,
    target_profile.product_id,
    p_product_version_id,
    target_profile.vertical_id,
    p_campaign_id,
    p_reason,
    p_granted_by,
    p_approved_by,
    p_starts_at,
    p_ends_at,
    p_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO grant_id;
  IF grant_id IS NULL THEN
    SELECT id INTO grant_id
    FROM public.monetization_complimentary_grants
    WHERE idempotency_key = p_idempotency_key;
    RETURN grant_id;
  END IF;

  INSERT INTO public.monetization_entitlements (
    account_id,
    product_id,
    entitlement_key,
    entitlement_value,
    starts_at,
    ends_at,
    status,
    vertical_id,
    merge_policy,
    complimentary_grant_id
  )
  SELECT
    p_account_id,
    target_profile.product_id,
    definition.entitlement_key,
    definition.entitlement_value,
    p_starts_at,
    p_ends_at,
    CASE WHEN p_starts_at <= NOW() THEN 'active' ELSE 'scheduled' END,
    COALESCE(definition.vertical_id, target_profile.vertical_id),
    definition.merge_policy,
    grant_id
  FROM public.monetization_product_entitlements definition
  WHERE definition.product_version_id = p_product_version_id
    AND definition.implementation_status = 'ready'
    AND definition.availability IN ('enabled', 'beta')
  ON CONFLICT (complimentary_grant_id, entitlement_key)
    WHERE complimentary_grant_id IS NOT NULL DO NOTHING;
  RETURN grant_id;
END;
$$;

-- A paid one-listing visibility order must produce the placement that was
-- sold. The listing_promotions table and its refresh trigger remain the only
-- source for discovery prominence; financial timestamps never rewrite listing
-- creation or publication history.
CREATE OR REPLACE FUNCTION public.fulfill_listing_promotion_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_listing_id_text TEXT;
  v_listing_id UUID;
  v_started_at TIMESTAMPTZ;
BEGIN
  IF NEW.status IN ('refunded', 'cancelled') THEN
    UPDATE public.listing_promotions
    SET
      status = CASE
        WHEN NEW.status = 'refunded' THEN 'refunded'
        ELSE 'cancelled'
      END,
      updated_at = NOW()
    WHERE source_order_id = NEW.id
      AND status IN ('scheduled', 'active');
    RETURN NEW;
  END IF;

  IF NEW.status <> 'paid' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'paid' THEN
    RETURN NEW;
  END IF;

  SELECT quote.quote_snapshot->>'listingId'
    INTO v_listing_id_text
  FROM public.monetization_quotes quote
  WHERE quote.id = NEW.quote_id;

  IF v_listing_id_text IS NULL OR v_listing_id_text !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  THEN
    RETURN NEW;
  END IF;

  v_listing_id := v_listing_id_text::UUID;
  v_started_at := COALESCE(NEW.paid_at, NOW());

  INSERT INTO public.listing_promotions (
    listing_id,
    product_id,
    placement_type,
    source_type,
    source_order_id,
    status,
    label,
    starts_at,
    ends_at
  )
  SELECT
    v_listing_id,
    item.product_id,
    CASE item.product_id
      WHEN 'premium.urgent' THEN 'urgent_badge'
      WHEN 'premium.search_bump' THEN 'search_bump'
      WHEN 'premium.highlight' THEN 'featured'
      WHEN 'premium.spotlight' THEN 'featured'
    END,
    'purchase',
    NEW.id,
    'active',
    item.label,
    v_started_at,
    v_started_at + make_interval(days => COALESCE(price.duration_days, 1))
  FROM public.monetization_quote_items item
  JOIN public.monetization_prices price ON price.id = item.price_id
  WHERE item.quote_id = NEW.quote_id
    AND item.product_id IN (
      'premium.urgent',
      'premium.search_bump',
      'premium.highlight',
      'premium.spotlight'
    )
  ON CONFLICT (listing_id, product_id, source_order_id) WHERE source_order_id IS NOT NULL
  DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fulfill_listing_promotion_order_trigger
  ON public.monetization_orders;
CREATE TRIGGER fulfill_listing_promotion_order_trigger
AFTER INSERT OR UPDATE OF status
ON public.monetization_orders
FOR EACH ROW
EXECUTE FUNCTION public.fulfill_listing_promotion_order();
