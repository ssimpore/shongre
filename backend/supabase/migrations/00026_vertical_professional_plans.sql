-- =============================================================================
-- VERTICAL PROFESSIONAL PLANS
-- Canonical vertical catalog metadata, scoped entitlements, trials, transitions,
-- complimentary grants and finance attribution. Expand-first and deny-by-default.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_verticals (
  id VARCHAR(30) PRIMARY KEY CHECK (id IN ('general','auto','immo','emploi','cours','services')),
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  category_ids TEXT[] NOT NULL DEFAULT '{}',
  capability_keys TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL CHECK (status IN ('active','disabled','archived')),
  sort_order INT NOT NULL CHECK (sort_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.business_verticals
  (id,name,description,category_ids,capability_keys,status,sort_order)
VALUES
  ('general','Général','Outils professionnels transverses Shongre.','{}','{listing.publish,store.manage.own}','active',0),
  ('auto','Auto','Stock, leads et opérations de concession.','{vehicles}','{auto.dealer.manage.own,auto.inventory.import.own}','active',10),
  ('immo','Immo','Portefeuille, agents et opérations agence.','{real_estate}','{immo.agency.manage.own,immo.inventory.import.own}','active',20),
  ('emploi','Emploi','Offres, recruteurs et candidatures.','{jobs}','{employment.recruiter.manage.own,employment.application.manage.own}','active',30),
  ('cours','Cours','Formations, instructeurs et demandes.','{courses}','{course.offer.manage.own,course.organization.manage.own}','active',40),
  ('services','Services','Future offre professionnelle pour prestataires.','{}','{}','disabled',50)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  category_ids = EXCLUDED.category_ids, capability_keys = EXCLUDED.capability_keys,
  status = EXCLUDED.status, sort_order = EXCLUDED.sort_order, updated_at = NOW();

CREATE TABLE IF NOT EXISTS public.monetization_product_commercial_profiles (
  product_version_id VARCHAR(240) PRIMARY KEY REFERENCES public.monetization_product_versions(id) ON DELETE CASCADE,
  product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('free','generic','vertical','addon','bundle')),
  family_id VARCHAR(120) NOT NULL CHECK (family_id ~ '^[a-z0-9_.-]+$'),
  vertical_id VARCHAR(30) REFERENCES public.business_verticals(id) ON DELETE RESTRICT,
  tier VARCHAR(20) CHECK (tier IS NULL OR tier IN ('free','essential','business','premium','enterprise','custom')),
  professional_only BOOLEAN NOT NULL DEFAULT FALSE,
  target_category_ids TEXT[] NOT NULL DEFAULT '{}',
  country_availability TEXT[] NOT NULL DEFAULT '{}',
  trial_policy JSONB NOT NULL DEFAULT '{"enabled":false,"requiresPaymentMethod":true,"firstTimeCustomersOnly":true,"autoConverts":true,"eligibleAudiences":[],"eligibleMarketCodes":[]}'::JSONB CHECK (jsonb_typeof(trial_policy) = 'object'),
  requires_business_verification BOOLEAN NOT NULL DEFAULT FALSE,
  finance_category VARCHAR(40) NOT NULL CHECK (finance_category IN ('generic_subscription','auto_subscription','immo_subscription','employment_subscription','courses_subscription','addon','promotion','marketplace_service')),
  display_order INT NOT NULL DEFAULT 100 CHECK (display_order >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, product_version_id)
);
CREATE INDEX IF NOT EXISTS monetization_profiles_vertical_family_idx
  ON public.monetization_product_commercial_profiles (vertical_id, family_id, tier, display_order);

CREATE OR REPLACE FUNCTION public.sync_vertical_plan_catalog_metadata()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  INSERT INTO public.monetization_product_commercial_profiles
    (product_version_id,product_id,plan_type,family_id,vertical_id,tier,
     professional_only,target_category_ids,country_availability,trial_policy,
     requires_business_verification,finance_category,display_order)
  SELECT
    product->>'versionId',product->>'id',profile->>'planType',profile->>'familyId',
    NULLIF(profile->>'verticalId',''),NULLIF(profile->>'tier',''),
    COALESCE((profile->>'professionalOnly')::BOOLEAN,FALSE),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(profile->'targetCategoryIds','[]'::JSONB))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(profile->'countryAvailability','[]'::JSONB))),
    COALESCE(profile->'trialPolicy','{}'::JSONB),
    COALESCE((profile->>'requiresBusinessVerification')::BOOLEAN,FALSE),
    profile->>'financeCategory',COALESCE((profile->>'displayOrder')::INT,100)
  FROM jsonb_array_elements(NEW.snapshot->'products') product
  CROSS JOIN LATERAL (SELECT product->'commercialProfile' AS profile) source
  WHERE jsonb_typeof(profile) = 'object'
  ON CONFLICT (product_version_id) DO UPDATE SET
    plan_type = EXCLUDED.plan_type,family_id = EXCLUDED.family_id,
    vertical_id = EXCLUDED.vertical_id,tier = EXCLUDED.tier,
    professional_only = EXCLUDED.professional_only,
    target_category_ids = EXCLUDED.target_category_ids,
    country_availability = EXCLUDED.country_availability,
    trial_policy = EXCLUDED.trial_policy,
    requires_business_verification = EXCLUDED.requires_business_verification,
    finance_category = EXCLUDED.finance_category,display_order = EXCLUDED.display_order,
    updated_at = NOW();

  UPDATE public.monetization_product_entitlements stored
  SET merge_policy = COALESCE(entitlement->>'mergePolicy','override'),
      vertical_id = NULLIF(entitlement->>'verticalId',''),
      category_ids = ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(entitlement->'categoryIds','[]'::JSONB))
      ),
      recurring_grant = entitlement->'recurringGrant'
  FROM jsonb_array_elements(NEW.snapshot->'products') product
  CROSS JOIN LATERAL jsonb_array_elements(product->'entitlements') entitlement
  WHERE stored.product_version_id = product->>'versionId'
    AND stored.entitlement_key = entitlement->>'key';

  UPDATE public.monetization_promotions stored_promotion
  SET activation_mode = COALESCE(promotion->>'activationMode','coupon'),
      eligible_customer_type = COALESCE(promotion->>'eligibleCustomerType','all'),
      duration_billing_periods = NULLIF(promotion->>'durationBillingPeriods','')::INT,
      minimum_commitment_periods = COALESCE(
        NULLIF(promotion->>'minimumCommitmentPeriods','')::INT,
        0
      ),
      campaign_id = NULLIF(promotion->>'campaignId',''),
      provider_coupon_id = NULLIF(promotion->>'providerCouponId',''),
      vertical_ids = ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(promotion->'verticalIds','[]'::JSONB))
      ),
      updated_at = NOW()
  FROM jsonb_array_elements(NEW.snapshot->'promotions') promotion
  WHERE stored_promotion.id = promotion->>'id';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS commercial_configuration_sync_vertical_plans
  ON public.commercial_configuration_versions;
CREATE CONSTRAINT TRIGGER commercial_configuration_sync_vertical_plans
AFTER INSERT OR UPDATE OF snapshot ON public.commercial_configuration_versions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.sync_vertical_plan_catalog_metadata();

CREATE TABLE IF NOT EXISTS public.monetization_plan_transitions (
  configuration_version_id VARCHAR(160) NOT NULL REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
  from_product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  to_product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('upgrade','downgrade','crossgrade')),
  effective_timing VARCHAR(20) NOT NULL CHECK (effective_timing IN ('immediately','period_end')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (configuration_version_id, from_product_id, to_product_id),
  CHECK (from_product_id <> to_product_id)
);
CREATE INDEX IF NOT EXISTS monetization_plan_transitions_lookup_idx
  ON public.monetization_plan_transitions (from_product_id, status, to_product_id);

CREATE OR REPLACE FUNCTION public.sync_vertical_plan_transitions()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  DELETE FROM public.monetization_plan_transitions
  WHERE configuration_version_id = NEW.id;
  INSERT INTO public.monetization_plan_transitions
    (configuration_version_id,from_product_id,to_product_id,direction,effective_timing)
  SELECT NEW.id,product->>'id',target_product_id,'upgrade','immediately'
  FROM jsonb_array_elements(NEW.snapshot->'products') product
  CROSS JOIN LATERAL jsonb_array_elements_text(
    COALESCE(product->'commercialProfile'->'upgradeProductIds','[]'::JSONB)
  ) target_product_id
  UNION ALL
  SELECT NEW.id,product->>'id',target_product_id,'downgrade','period_end'
  FROM jsonb_array_elements(NEW.snapshot->'products') product
  CROSS JOIN LATERAL jsonb_array_elements_text(
    COALESCE(product->'commercialProfile'->'downgradeProductIds','[]'::JSONB)
  ) target_product_id
  ON CONFLICT (configuration_version_id,from_product_id,to_product_id)
  DO UPDATE SET direction = EXCLUDED.direction,effective_timing = EXCLUDED.effective_timing,status = 'active';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS commercial_configuration_sync_plan_transitions
  ON public.commercial_configuration_versions;
CREATE CONSTRAINT TRIGGER commercial_configuration_sync_plan_transitions
AFTER INSERT OR UPDATE OF snapshot ON public.commercial_configuration_versions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.sync_vertical_plan_transitions();

ALTER TABLE public.monetization_product_entitlements
  ADD COLUMN IF NOT EXISTS merge_policy VARCHAR(20) NOT NULL DEFAULT 'override'
    CHECK (merge_policy IN ('boolean_or','max','additive','override')),
  ADD COLUMN IF NOT EXISTS vertical_id VARCHAR(30)
    REFERENCES public.business_verticals(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS category_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recurring_grant JSONB
    CHECK (recurring_grant IS NULL OR jsonb_typeof(recurring_grant) = 'object');

ALTER TABLE public.monetization_entitlements
  ADD COLUMN IF NOT EXISTS vertical_id VARCHAR(30)
    REFERENCES public.business_verticals(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS merge_policy VARCHAR(20) NOT NULL DEFAULT 'override'
    CHECK (merge_policy IN ('boolean_or','max','additive','override')),
  ADD COLUMN IF NOT EXISTS complimentary_grant_id UUID;
CREATE INDEX IF NOT EXISTS monetization_entitlements_vertical_resolution_idx
  ON public.monetization_entitlements (account_id, vertical_id, entitlement_key, status, ends_at);

ALTER TABLE public.monetization_quotes
  ADD COLUMN IF NOT EXISTS amount_due_today_minor BIGINT NOT NULL DEFAULT 0 CHECK (amount_due_today_minor >= 0),
  ADD COLUMN IF NOT EXISTS next_charge_minor BIGINT NOT NULL DEFAULT 0 CHECK (next_charge_minor >= 0),
  ADD COLUMN IF NOT EXISTS next_charge_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_snapshot JSONB CHECK (trial_snapshot IS NULL OR jsonb_typeof(trial_snapshot) = 'object');
UPDATE public.monetization_quotes
SET amount_due_today_minor = total_minor, next_charge_minor = total_minor
WHERE amount_due_today_minor = 0 AND trial_snapshot IS NULL;

CREATE OR REPLACE FUNCTION public.hydrate_monetization_quote_commercial_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.amount_due_today_minor := COALESCE(
    (NEW.quote_snapshot->>'amountDueTodayMinor')::BIGINT, NEW.total_minor
  );
  NEW.next_charge_minor := COALESCE(
    (NEW.quote_snapshot->>'nextChargeMinor')::BIGINT, NEW.total_minor
  );
  NEW.next_charge_at := NULLIF(NEW.quote_snapshot->>'nextChargeAt','')::TIMESTAMPTZ;
  NEW.trial_snapshot := NEW.quote_snapshot->'trial';
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS hydrate_monetization_quote_commercial_fields
  ON public.monetization_quotes;
CREATE TRIGGER hydrate_monetization_quote_commercial_fields
BEFORE INSERT OR UPDATE OF quote_snapshot ON public.monetization_quotes
FOR EACH ROW EXECUTE FUNCTION public.hydrate_monetization_quote_commercial_fields();

ALTER TABLE public.monetization_quote_items
  ADD COLUMN IF NOT EXISTS vertical_id VARCHAR(30)
    REFERENCES public.business_verticals(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS trial_days INT CHECK (trial_days IS NULL OR trial_days > 0);

ALTER TABLE public.monetization_promotions
  DROP CONSTRAINT IF EXISTS monetization_promotions_discount_type_check;
ALTER TABLE public.monetization_promotions
  ADD CONSTRAINT monetization_promotions_discount_type_check CHECK (
    discount_type IN ('fixed','percentage','introductory_price','free_period')
  ),
  ADD COLUMN IF NOT EXISTS activation_mode VARCHAR(20) NOT NULL DEFAULT 'coupon'
    CHECK (activation_mode IN ('coupon','automatic','admin_grant')),
  ADD COLUMN IF NOT EXISTS eligible_customer_type VARCHAR(20) NOT NULL DEFAULT 'all'
    CHECK (eligible_customer_type IN ('new','existing','all')),
  ADD COLUMN IF NOT EXISTS duration_billing_periods INT CHECK (duration_billing_periods IS NULL OR duration_billing_periods > 0),
  ADD COLUMN IF NOT EXISTS minimum_commitment_periods INT NOT NULL DEFAULT 0 CHECK (minimum_commitment_periods >= 0),
  ADD COLUMN IF NOT EXISTS campaign_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS provider_coupon_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vertical_ids TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.monetization_subscriptions
  ADD COLUMN IF NOT EXISTS family_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS vertical_id VARCHAR(30)
    REFERENCES public.business_verticals(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS acquisition_campaign_id VARCHAR(120),
  ADD COLUMN IF NOT EXISTS acquisition_promotion_code VARCHAR(40);
CREATE INDEX IF NOT EXISTS monetization_subscriptions_vertical_state_idx
  ON public.monetization_subscriptions (vertical_id, status, current_period_end DESC);
CREATE INDEX IF NOT EXISTS monetization_subscriptions_family_history_idx
  ON public.monetization_subscriptions (account_id, family_id, created_at DESC)
  WHERE family_id IS NOT NULL;

ALTER TABLE public.monetization_usage_records
  ADD COLUMN IF NOT EXISTS vertical_id VARCHAR(30)
    REFERENCES public.business_verticals(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS monetization_usage_vertical_period_idx
  ON public.monetization_usage_records (account_id, vertical_id, usage_key, period_start, period_end);

CREATE TABLE IF NOT EXISTS public.monetization_trial_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  family_id VARCHAR(120) NOT NULL,
  vertical_id VARCHAR(30) REFERENCES public.business_verticals(id) ON DELETE RESTRICT,
  product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  quote_id VARCHAR(80) REFERENCES public.monetization_quotes(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES public.monetization_subscriptions(id) ON DELETE RESTRICT,
  campaign_id VARCHAR(120),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, family_id),
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS monetization_trial_vertical_period_idx
  ON public.monetization_trial_consumptions (vertical_id, starts_at, ends_at);

CREATE OR REPLACE FUNCTION public.claim_monetization_trial(
  p_account_id UUID, p_family_id VARCHAR, p_vertical_id VARCHAR,
  p_product_id VARCHAR, p_quote_id VARCHAR, p_campaign_id VARCHAR,
  p_starts_at TIMESTAMPTZ, p_ends_at TIMESTAMPTZ
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_ends_at <= p_starts_at THEN RAISE EXCEPTION 'invalid trial window'; END IF;
  INSERT INTO public.monetization_trial_consumptions
    (account_id,family_id,vertical_id,product_id,quote_id,campaign_id,starts_at,ends_at)
  VALUES
    (p_account_id,p_family_id,p_vertical_id,p_product_id,p_quote_id,p_campaign_id,p_starts_at,p_ends_at)
  ON CONFLICT (account_id,family_id) DO NOTHING;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_monetization_subscription_scope_and_trial()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE target_profile public.monetization_product_commercial_profiles%ROWTYPE;
DECLARE source_quote public.monetization_quotes%ROWTYPE;
BEGIN
  IF NEW.price_id IS NULL AND NEW.source_order_id IS NOT NULL THEN
    SELECT item.price_id,item.product_version_id,item.billing_period
    INTO NEW.price_id,NEW.product_version_id,NEW.billing_period
    FROM public.monetization_orders purchase_order
    JOIN public.monetization_quote_items item ON item.quote_id = purchase_order.quote_id
    WHERE purchase_order.id = NEW.source_order_id
      AND item.product_id = NEW.product_id
    ORDER BY item.line_number
    LIMIT 1;
  END IF;
  IF NEW.price_id IS NOT NULL THEN
    SELECT profile.* INTO target_profile
    FROM public.monetization_prices price
    JOIN public.monetization_product_commercial_profiles profile
      ON profile.product_version_id = price.product_version_id
    WHERE price.id = NEW.price_id AND profile.product_id = NEW.product_id;
  END IF;
  IF NOT FOUND THEN
    SELECT * INTO target_profile
    FROM public.monetization_product_commercial_profiles
    WHERE product_id = NEW.product_id
    ORDER BY created_at DESC LIMIT 1;
  END IF;
  IF FOUND THEN
    NEW.product_version_id := target_profile.product_version_id;
    NEW.family_id := target_profile.family_id;
    NEW.vertical_id := target_profile.vertical_id;
  END IF;

  IF NEW.status = 'trialing' AND (TG_OP = 'INSERT' OR OLD.status <> 'trialing') THEN
    IF target_profile.family_id IS NULL THEN
      RAISE EXCEPTION 'trial family not found';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.monetization_subscriptions prior
      LEFT JOIN public.monetization_product_commercial_profiles prior_profile
        ON prior_profile.product_id = prior.product_id
      WHERE prior.account_id = NEW.account_id
        AND prior.id <> NEW.id
        AND COALESCE(prior.family_id,prior_profile.family_id) = target_profile.family_id
    ) THEN
      RAISE EXCEPTION 'trial already consumed for family %', target_profile.family_id;
    END IF;
    SELECT quote.* INTO source_quote
    FROM public.monetization_orders purchase_order
    JOIN public.monetization_quotes quote ON quote.id = purchase_order.quote_id
    WHERE purchase_order.id = NEW.source_order_id;
    IF source_quote.trial_snapshot IS NULL THEN
      RAISE EXCEPTION 'trial quote evidence not found';
    END IF;
    IF NOT public.claim_monetization_trial(
      NEW.account_id,target_profile.family_id,target_profile.vertical_id,
      NEW.product_id,source_quote.id,NULL,
      COALESCE(NEW.trial_starts_at,NEW.current_period_start),
      COALESCE(NEW.trial_ends_at,NEW.current_period_end)
    ) THEN
      RAISE EXCEPTION 'trial already consumed for family %', target_profile.family_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_monetization_subscription_scope_and_trial
  ON public.monetization_subscriptions;
CREATE TRIGGER enforce_monetization_subscription_scope_and_trial
BEFORE INSERT OR UPDATE OF status,product_id ON public.monetization_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_monetization_subscription_scope_and_trial();

-- A plan replacement is not complete until its rights move with it. Keep the
-- source order as the ownership boundary so add-ons purchased in the same order
-- are left untouched, while the former subscription plan is revoked atomically.
CREATE OR REPLACE FUNCTION public.sync_monetization_subscription_plan_change()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE entitlement_status VARCHAR(20);
DECLARE entitlement_end TIMESTAMPTZ;
BEGIN
  IF OLD.product_id IS NOT DISTINCT FROM NEW.product_id
     AND OLD.product_version_id IS NOT DISTINCT FROM NEW.product_version_id THEN
    RETURN NEW;
  END IF;
  IF NEW.product_version_id IS NULL OR NEW.price_id IS NULL THEN
    RAISE EXCEPTION 'subscription plan change requires a product version and price';
  END IF;

  entitlement_status := CASE
    WHEN NEW.status IN ('trialing','active','past_due','cancellation_pending') THEN 'active'
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
    AND status IN ('scheduled','active');

  INSERT INTO public.monetization_entitlements
    (account_id,product_id,entitlement_key,entitlement_value,source_order_id,
     starts_at,ends_at,status,vertical_id,merge_policy)
  SELECT NEW.account_id,NEW.product_id,definition.entitlement_key,
    definition.entitlement_value,NEW.source_order_id,NOW(),entitlement_end,
    entitlement_status,COALESCE(definition.vertical_id,NEW.vertical_id),definition.merge_policy
  FROM public.monetization_product_entitlements definition
  WHERE definition.product_version_id = NEW.product_version_id
  ON CONFLICT (source_order_id,product_id,entitlement_key) DO UPDATE SET
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
    AND status IN ('scheduled','active');

  INSERT INTO public.monetization_subscription_items
    (subscription_id,product_id,product_version_id,price_id,quantity,status,starts_at,ends_at)
  VALUES
    (NEW.id,NEW.product_id,NEW.product_version_id,NEW.price_id,1,
     entitlement_status,NOW(),entitlement_end)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_monetization_subscription_plan_change
  ON public.monetization_subscriptions;
CREATE TRIGGER sync_monetization_subscription_plan_change
AFTER UPDATE OF product_id,product_version_id,price_id ON public.monetization_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_monetization_subscription_plan_change();

CREATE OR REPLACE FUNCTION public.grant_subscription_recurring_credits(
  p_subscription_id UUID
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE subscription_row public.monetization_subscriptions%ROWTYPE;
DECLARE definition RECORD;
DECLARE grant_start TIMESTAMPTZ;
DECLARE grant_end TIMESTAMPTZ;
DECLARE grant_key VARCHAR(200);
DECLARE granted_count INT := 0;
BEGIN
  SELECT * INTO subscription_row
  FROM public.monetization_subscriptions
  WHERE id = p_subscription_id;
  IF NOT FOUND OR subscription_row.product_version_id IS NULL
     OR subscription_row.status NOT IN ('trialing','active','cancellation_pending')
     OR subscription_row.current_period_end <= NOW() THEN
    RETURN 0;
  END IF;

  FOR definition IN
    SELECT entitlement_key,recurring_grant
    FROM public.monetization_product_entitlements
    WHERE product_version_id = subscription_row.product_version_id
      AND recurring_grant IS NOT NULL
  LOOP
    grant_start := CASE definition.recurring_grant->>'resetPeriod'
      WHEN 'month' THEN date_trunc('month',NOW())
      WHEN 'year' THEN date_trunc('year',NOW())
      ELSE subscription_row.current_period_start
    END;
    grant_end := CASE definition.recurring_grant->>'resetPeriod'
      WHEN 'month' THEN grant_start + INTERVAL '1 month'
      WHEN 'year' THEN grant_start + INTERVAL '1 year'
      ELSE subscription_row.current_period_end
    END;
    grant_end := LEAST(grant_end,subscription_row.current_period_end);
    grant_key := 'subscription-credit:' || subscription_row.id::TEXT || ':' ||
      (definition.recurring_grant->>'creditType') || ':' || grant_start::TEXT;

    IF NOT EXISTS (
      SELECT 1 FROM public.monetization_credit_transactions
      WHERE account_id = subscription_row.account_id AND idempotency_key = grant_key
    ) THEN
      PERFORM public.record_monetization_credit_transaction(
        subscription_row.account_id,
        definition.recurring_grant->>'creditType',
        (definition.recurring_grant->>'quantity')::BIGINT,
        'Allocation récurrente du forfait ' || subscription_row.product_id,
        'subscription',subscription_row.id::TEXT,grant_end,grant_key,NULL
      );
      granted_count := granted_count + 1;
    END IF;
  END LOOP;
  RETURN granted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_due_subscription_recurring_credits(
  p_batch_size INT DEFAULT 500
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target RECORD;
DECLARE granted_count INT := 0;
BEGIN
  FOR target IN
    SELECT id FROM public.monetization_subscriptions
    WHERE status IN ('trialing','active','cancellation_pending')
      AND current_period_end > NOW()
      AND product_version_id IS NOT NULL
    ORDER BY updated_at
    LIMIT p_batch_size
  LOOP
    granted_count := granted_count + public.grant_subscription_recurring_credits(target.id);
  END LOOP;
  RETURN granted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_subscription_recurring_credits()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.grant_subscription_recurring_credits(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_subscription_recurring_credits
  ON public.monetization_subscriptions;
CREATE TRIGGER grant_subscription_recurring_credits
AFTER INSERT OR UPDATE OF current_period_start,current_period_end,product_version_id,status
ON public.monetization_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.trigger_subscription_recurring_credits();

CREATE TABLE IF NOT EXISTS public.monetization_complimentary_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  product_version_id VARCHAR(240) NOT NULL REFERENCES public.monetization_product_versions(id) ON DELETE RESTRICT,
  vertical_id VARCHAR(30) REFERENCES public.business_verticals(id) ON DELETE RESTRICT,
  campaign_id VARCHAR(120),
  reason TEXT NOT NULL CHECK (length(reason) >= 12),
  granted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  idempotency_key VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (granted_by <> approved_by),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.monetization_complimentary_grant_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  product_version_id VARCHAR(240) NOT NULL REFERENCES public.monetization_product_versions(id) ON DELETE RESTRICT,
  campaign_id VARCHAR(120),
  reason TEXT NOT NULL CHECK (length(reason) >= 12),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.monetization_complimentary_grant_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES public.monetization_complimentary_grant_requests(id) ON DELETE RESTRICT,
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved','rejected')),
  reason TEXT NOT NULL CHECK (length(reason) >= 8),
  decided_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.request_complimentary_plan(
  p_account_id UUID,p_product_version_id VARCHAR,p_campaign_id VARCHAR,
  p_reason TEXT,p_starts_at TIMESTAMPTZ,p_ends_at TIMESTAMPTZ,
  p_requested_by UUID,p_idempotency_key VARCHAR
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE request_id UUID;
BEGIN
  INSERT INTO public.monetization_complimentary_grant_requests
    (account_id,product_version_id,campaign_id,reason,starts_at,ends_at,requested_by,idempotency_key)
  VALUES
    (p_account_id,p_product_version_id,p_campaign_id,p_reason,p_starts_at,p_ends_at,p_requested_by,p_idempotency_key)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO request_id;
  IF request_id IS NULL THEN
    SELECT id INTO request_id
    FROM public.monetization_complimentary_grant_requests
    WHERE idempotency_key = p_idempotency_key;
  END IF;
  RETURN request_id;
END;
$$;

ALTER TABLE public.monetization_entitlements
  ADD CONSTRAINT monetization_entitlements_complimentary_grant_fk
  FOREIGN KEY (complimentary_grant_id)
  REFERENCES public.monetization_complimentary_grants(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS monetization_entitlement_complimentary_once_idx
  ON public.monetization_entitlements (complimentary_grant_id, entitlement_key)
  WHERE complimentary_grant_id IS NOT NULL;

DROP TRIGGER IF EXISTS immutable_monetization_complimentary_grants
  ON public.monetization_complimentary_grants;
CREATE TRIGGER immutable_monetization_complimentary_grants
BEFORE UPDATE OR DELETE ON public.monetization_complimentary_grants
FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_mutation();
DROP TRIGGER IF EXISTS immutable_monetization_complimentary_grant_requests
  ON public.monetization_complimentary_grant_requests;
CREATE TRIGGER immutable_monetization_complimentary_grant_requests
BEFORE UPDATE OR DELETE ON public.monetization_complimentary_grant_requests
FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_mutation();
DROP TRIGGER IF EXISTS immutable_monetization_complimentary_grant_approvals
  ON public.monetization_complimentary_grant_approvals;
CREATE TRIGGER immutable_monetization_complimentary_grant_approvals
BEFORE UPDATE OR DELETE ON public.monetization_complimentary_grant_approvals
FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_mutation();

CREATE OR REPLACE FUNCTION public.grant_complimentary_plan(
  p_account_id UUID, p_product_version_id VARCHAR, p_reason TEXT,
  p_campaign_id VARCHAR, p_starts_at TIMESTAMPTZ, p_ends_at TIMESTAMPTZ,
  p_granted_by UUID, p_approved_by UUID, p_idempotency_key VARCHAR
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_profile public.monetization_product_commercial_profiles%ROWTYPE;
DECLARE grant_id UUID;
BEGIN
  IF p_granted_by = p_approved_by THEN RAISE EXCEPTION 'four-eyes approval required'; END IF;
  SELECT * INTO target_profile FROM public.monetization_product_commercial_profiles
  WHERE product_version_id = p_product_version_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'commercial profile not found'; END IF;
  INSERT INTO public.monetization_complimentary_grants
    (account_id,product_id,product_version_id,vertical_id,campaign_id,reason,
     granted_by,approved_by,starts_at,ends_at,idempotency_key)
  VALUES
    (p_account_id,target_profile.product_id,p_product_version_id,target_profile.vertical_id,
     p_campaign_id,p_reason,p_granted_by,p_approved_by,p_starts_at,p_ends_at,p_idempotency_key)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO grant_id;
  IF grant_id IS NULL THEN
    SELECT id INTO grant_id FROM public.monetization_complimentary_grants
    WHERE idempotency_key = p_idempotency_key;
    RETURN grant_id;
  END IF;

  INSERT INTO public.monetization_entitlements
    (account_id,product_id,entitlement_key,entitlement_value,starts_at,ends_at,status,
     vertical_id,merge_policy,complimentary_grant_id)
  SELECT p_account_id,target_profile.product_id,definition.entitlement_key,
    definition.entitlement_value,p_starts_at,p_ends_at,
    CASE WHEN p_starts_at <= NOW() THEN 'active' ELSE 'scheduled' END,
    COALESCE(definition.vertical_id,target_profile.vertical_id),definition.merge_policy,grant_id
  FROM public.monetization_product_entitlements definition
  WHERE definition.product_version_id = p_product_version_id
  ON CONFLICT (complimentary_grant_id,entitlement_key)
    WHERE complimentary_grant_id IS NOT NULL DO NOTHING;
  RETURN grant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_complimentary_plan_request(
  p_request_id UUID,p_decision VARCHAR,p_reason TEXT,p_decided_by UUID,
  p_idempotency_key VARCHAR
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE request_row public.monetization_complimentary_grant_requests%ROWTYPE;
DECLARE grant_id UUID;
BEGIN
  SELECT * INTO request_row
  FROM public.monetization_complimentary_grant_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'complimentary request not found'; END IF;
  IF request_row.requested_by = p_decided_by THEN
    RAISE EXCEPTION 'four-eyes approval required';
  END IF;
  INSERT INTO public.monetization_complimentary_grant_approvals
    (request_id,decision,reason,decided_by,idempotency_key)
  VALUES (p_request_id,p_decision,p_reason,p_decided_by,p_idempotency_key)
  ON CONFLICT (request_id) DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'complimentary request already decided'; END IF;
  IF p_decision = 'approved' THEN
    grant_id := public.grant_complimentary_plan(
      request_row.account_id,request_row.product_version_id,request_row.reason,
      request_row.campaign_id,request_row.starts_at,request_row.ends_at,
      request_row.requested_by,p_decided_by,'grant:' || request_row.id::TEXT
    );
  END IF;
  RETURN grant_id;
END;
$$;

CREATE OR REPLACE VIEW public.monetization_vertical_subscription_metrics AS
SELECT
  subscription.vertical_id,
  subscription.family_id,
  COALESCE(price.currency,'EUR') AS currency,
  COALESCE(source_quote.market_code,'FR') AS market_code,
  COUNT(*) FILTER (WHERE subscription.status = 'trialing')::BIGINT AS active_trials,
  COUNT(*) FILTER (WHERE subscription.status IN ('active','cancellation_pending'))::BIGINT AS paying_subscriptions,
  COUNT(*) FILTER (WHERE subscription.status = 'cancelled')::BIGINT AS cancelled_subscriptions,
  COUNT(DISTINCT trial.account_id)::BIGINT AS trials_started,
  COUNT(DISTINCT subscription.account_id) FILTER (WHERE subscription.status IN ('active','cancellation_pending'))::BIGINT AS converted_accounts,
  COALESCE(SUM(CASE
    WHEN subscription.status NOT IN ('active','cancellation_pending') THEN 0
    WHEN price.billing_period = 'month' THEN price.amount_minor
    WHEN price.billing_period = 'year' THEN ROUND(price.amount_minor::NUMERIC / 12)
    ELSE 0
  END),0)::BIGINT AS mrr_minor
FROM public.monetization_subscriptions subscription
LEFT JOIN public.monetization_trial_consumptions trial
  ON trial.account_id = subscription.account_id AND trial.family_id = subscription.family_id
LEFT JOIN public.monetization_orders purchase_order ON purchase_order.id = subscription.source_order_id
LEFT JOIN public.monetization_quotes source_quote ON source_quote.id = purchase_order.quote_id
LEFT JOIN public.monetization_quote_items quote_item
  ON quote_item.quote_id = purchase_order.quote_id AND quote_item.product_id = subscription.product_id
LEFT JOIN public.monetization_prices price ON price.id = quote_item.price_id
GROUP BY subscription.vertical_id, subscription.family_id,
  COALESCE(price.currency,'EUR'),COALESCE(source_quote.market_code,'FR');

CREATE OR REPLACE VIEW public.finance_vertical_revenue_attribution AS
SELECT
  COALESCE(profile.vertical_id,'general') AS vertical_id,
  profile.family_id,
  profile.finance_category,
  transaction.market_code,
  transaction.currency,
  date_trunc('month',transaction.occurred_at) AS revenue_month,
  SUM(CASE WHEN ledger.side = 'credit' THEN ledger.amount_minor ELSE -ledger.amount_minor END)::BIGINT AS net_revenue_minor
FROM public.finance_transactions transaction
JOIN public.finance_ledger_entries ledger ON ledger.transaction_id = transaction.id
LEFT JOIN public.monetization_orders purchase_order ON purchase_order.id = transaction.order_reference
LEFT JOIN public.monetization_quote_items quote_item ON quote_item.quote_id = purchase_order.quote_id
LEFT JOIN public.monetization_product_commercial_profiles profile
  ON profile.product_version_id = quote_item.product_version_id
WHERE ledger.account_code IN ('7061','7062','7063','7064','7065','7091')
GROUP BY profile.vertical_id,profile.family_id,profile.finance_category,
  transaction.market_code,transaction.currency,date_trunc('month',transaction.occurred_at);

INSERT INTO public.access_capabilities (id,is_sensitive)
VALUES
  ('monetization.plans.read',TRUE),('monetization.plans.manage',TRUE),
  ('monetization.pricing.manage',TRUE),('monetization.promotions.read',TRUE),
  ('monetization.promotions.manage',TRUE),('monetization.trials.manage',TRUE),
  ('monetization.subscriptions.read',TRUE),('monetization.subscriptions.manage',TRUE),
  ('monetization.complimentary_grants.request',TRUE),
  ('monetization.complimentary_grants.create',TRUE)
ON CONFLICT (id) DO UPDATE SET is_sensitive = EXCLUDED.is_sensitive;

INSERT INTO public.access_role_grants (role_kind,role_key,capability_id)
SELECT 'staff_role',role_key,capability
FROM unnest(ARRAY['commercial','admin','owner']) role_key
CROSS JOIN unnest(ARRAY[
  'monetization.plans.read','monetization.plans.manage','monetization.pricing.manage',
  'monetization.promotions.read','monetization.promotions.manage','monetization.trials.manage',
  'monetization.subscriptions.read','monetization.subscriptions.manage',
  'monetization.complimentary_grants.request'
]::TEXT[]) capability
ON CONFLICT DO NOTHING;
INSERT INTO public.access_role_grants (role_kind,role_key,capability_id)
VALUES ('staff_role','owner','monetization.complimentary_grants.create')
ON CONFLICT DO NOTHING;

ALTER TABLE public.business_verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_product_commercial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_plan_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_trial_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_complimentary_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_complimentary_grant_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_complimentary_grant_approvals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.business_verticals FROM anon,authenticated;
REVOKE ALL ON public.monetization_product_commercial_profiles FROM anon,authenticated;
REVOKE ALL ON public.monetization_plan_transitions FROM anon,authenticated;
REVOKE ALL ON public.monetization_trial_consumptions FROM anon,authenticated;
REVOKE ALL ON public.monetization_complimentary_grants FROM anon,authenticated;
REVOKE ALL ON public.monetization_complimentary_grant_requests FROM anon,authenticated;
REVOKE ALL ON public.monetization_complimentary_grant_approvals FROM anon,authenticated;
REVOKE ALL ON public.monetization_vertical_subscription_metrics FROM anon,authenticated;
REVOKE ALL ON public.finance_vertical_revenue_attribution FROM anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_monetization_trial(UUID,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,TIMESTAMPTZ,TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.grant_complimentary_plan(UUID,VARCHAR,TEXT,VARCHAR,TIMESTAMPTZ,TIMESTAMPTZ,UUID,UUID,VARCHAR) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.request_complimentary_plan(UUID,VARCHAR,VARCHAR,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,UUID,VARCHAR) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.decide_complimentary_plan_request(UUID,VARCHAR,TEXT,UUID,VARCHAR) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.grant_subscription_recurring_credits(UUID) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.grant_due_subscription_recurring_credits(INT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_monetization_trial(UUID,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,TIMESTAMPTZ,TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_complimentary_plan(UUID,VARCHAR,TEXT,VARCHAR,TIMESTAMPTZ,TIMESTAMPTZ,UUID,UUID,VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_complimentary_plan(UUID,VARCHAR,VARCHAR,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,UUID,VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.decide_complimentary_plan_request(UUID,VARCHAR,TEXT,UUID,VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_subscription_recurring_credits(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_due_subscription_recurring_credits(INT) TO service_role;

-- Re-run both deferred snapshot projectors for catalog versions imported before
-- this expand migration. Catalogs without the new metadata remain untouched.
UPDATE public.commercial_configuration_versions SET snapshot = snapshot;
