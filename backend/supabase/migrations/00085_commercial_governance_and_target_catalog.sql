-- =============================================================================
-- COMMERCIAL GOVERNANCE AND TARGET CATALOG
-- Migration 00085 — expand only. commercial-fr-v3 remains the active snapshot.
-- Catalog governance is projected from the immutable configuration snapshot;
-- customer price protection and enterprise history are append-only evidence.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.commercial_plan_migration_mappings (
  configuration_version_id VARCHAR(160) NOT NULL
    REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
  id VARCHAR(220) NOT NULL,
  from_product_id VARCHAR(180) NOT NULL,
  from_product_version_id VARCHAR(240) NOT NULL,
  to_product_id VARCHAR(180) NOT NULL,
  treatment VARCHAR(40) NOT NULL CHECK (treatment IN (
    'customer_choice_required','grandfather_existing','contract_migration','no_replacement'
  )),
  requires_customer_acceptance BOOLEAN NOT NULL,
  preserve_historical_price BOOLEAN NOT NULL,
  preserve_historical_entitlements BOOLEAN NOT NULL,
  shadow_quote_status VARCHAR(40) NOT NULL CHECK (shadow_quote_status IN (
    'not_run','matched','intentional_difference','blocked'
  )),
  intentional_differences JSONB NOT NULL DEFAULT '[]'::JSONB
    CHECK (jsonb_typeof(intentional_differences) = 'array'),
  rollout_status VARCHAR(30) NOT NULL CHECK (rollout_status IN (
    'draft','shadow','approved','rolling_out','complete','blocked'
  )),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (configuration_version_id,id)
);
CREATE INDEX IF NOT EXISTS commercial_plan_migration_source_idx
  ON public.commercial_plan_migration_mappings
  (from_product_version_id,rollout_status,configuration_version_id);
CREATE INDEX IF NOT EXISTS commercial_plan_migration_target_idx
  ON public.commercial_plan_migration_mappings
  (to_product_id,rollout_status,configuration_version_id);

CREATE TABLE IF NOT EXISTS public.commercial_price_protection_policies (
  configuration_version_id VARCHAR(160) NOT NULL
    REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
  id VARCHAR(220) NOT NULL,
  name VARCHAR(220) NOT NULL,
  protection_type VARCHAR(30) NOT NULL CHECK (protection_type IN (
    'price_lock','grandfathering','contract'
  )),
  product_ids TEXT[] NOT NULL,
  starts_when VARCHAR(50) NOT NULL CHECK (starts_when IN (
    'paid_subscription_starts','customer_accepts_contract','migration_is_accepted'
  )),
  duration_months INT CHECK (duration_months IS NULL OR duration_months > 0),
  fixed_ends_at TIMESTAMPTZ,
  preserve_price_id BOOLEAN NOT NULL,
  requires_customer_acceptance BOOLEAN NOT NULL,
  campaign_id VARCHAR(220),
  status VARCHAR(30) NOT NULL CHECK (status IN (
    'draft','pending_approval','approved','scheduled','active','disabled','archived'
  )),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (configuration_version_id,id),
  CHECK (protection_type = 'grandfathering' OR duration_months IS NOT NULL OR fixed_ends_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS commercial_price_protection_resolution_idx
  ON public.commercial_price_protection_policies
  (configuration_version_id,status,campaign_id,id);

CREATE TABLE IF NOT EXISTS public.commercial_campaigns (
  configuration_version_id VARCHAR(160) NOT NULL
    REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
  id VARCHAR(220) NOT NULL,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(220) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN (
    'draft','pending_approval','approved','scheduled','active','disabled','archived'
  )),
  product_ids TEXT[] NOT NULL,
  eligible_market_codes TEXT[] NOT NULL,
  eligible_region_codes TEXT[] NOT NULL DEFAULT '{}',
  eligible_vertical_ids TEXT[] NOT NULL DEFAULT '{}',
  maximum_verticals INT CHECK (maximum_verticals IS NULL OR maximum_verticals > 0),
  participant_cap BIGINT CHECK (participant_cap IS NULL OR participant_cap > 0),
  enrollment_starts_at TIMESTAMPTZ,
  enrollment_ends_at TIMESTAMPTZ,
  trial_days INT CHECK (trial_days IS NULL OR trial_days > 0),
  payment_method_requirement VARCHAR(30) NOT NULL CHECK (payment_method_requirement IN (
    'required','optional','not_collected'
  )),
  grace_period_days INT NOT NULL DEFAULT 0 CHECK (grace_period_days >= 0),
  conversion_behavior VARCHAR(40) NOT NULL CHECK (conversion_behavior IN (
    'customer_selected_plan','recorded_customer_agreement','no_automatic_conversion'
  )),
  price_protection_policy_id VARCHAR(220),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (configuration_version_id,id),
  UNIQUE (configuration_version_id,code),
  CHECK (enrollment_ends_at IS NULL OR enrollment_starts_at IS NULL OR enrollment_ends_at > enrollment_starts_at),
  CHECK ((enrollment_starts_at IS NULL) = (enrollment_ends_at IS NULL))
);
CREATE INDEX IF NOT EXISTS commercial_campaign_resolution_idx
  ON public.commercial_campaigns
  (configuration_version_id,status,enrollment_starts_at,enrollment_ends_at);

CREATE TABLE IF NOT EXISTS public.commercial_economics (
  configuration_version_id VARCHAR(160) NOT NULL
    REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
  id VARCHAR(300) NOT NULL,
  product_id VARCHAR(180) NOT NULL,
  price_id VARCHAR(260),
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  currency VARCHAR(3) NOT NULL,
  direct_cost_minor BIGINT CHECK (direct_cost_minor IS NULL OR direct_cost_minor >= 0),
  reference_amount_minor BIGINT CHECK (reference_amount_minor IS NULL OR reference_amount_minor >= 0),
  margin_floor_bps INT CHECK (margin_floor_bps IS NULL OR margin_floor_bps BETWEEN -10000 AND 10000),
  subsidy_budget_minor BIGINT CHECK (subsidy_budget_minor IS NULL OR subsidy_budget_minor >= 0),
  approval_status VARCHAR(30) NOT NULL CHECK (approval_status IN (
    'missing_inputs','pending_approval','approved','rejected'
  )),
  evidence_reference TEXT,
  status VARCHAR(30) NOT NULL CHECK (status IN (
    'draft','pending_approval','approved','scheduled','active','disabled','archived'
  )),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (configuration_version_id,id),
  UNIQUE NULLS NOT DISTINCT (configuration_version_id,product_id,price_id,market_code,currency),
  CHECK (approval_status <> 'approved' OR
    (direct_cost_minor IS NOT NULL AND margin_floor_bps IS NOT NULL AND evidence_reference IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS commercial_economics_resolution_idx
  ON public.commercial_economics
  (configuration_version_id,product_id,price_id,market_code,currency,status);
CREATE INDEX IF NOT EXISTS commercial_economics_approval_queue_idx
  ON public.commercial_economics (approval_status,configuration_version_id,id)
  WHERE status <> 'disabled' AND approval_status <> 'approved';

CREATE TABLE IF NOT EXISTS public.commercial_provider_mappings (
  configuration_version_id VARCHAR(160) NOT NULL
    REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
  id VARCHAR(400) NOT NULL,
  provider VARCHAR(80) NOT NULL,
  environment VARCHAR(30) NOT NULL CHECK (environment IN (
    'local','test','preview','development','staging','production'
  )),
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  internal_reference_type VARCHAR(40) NOT NULL CHECK (internal_reference_type IN (
    'product','price','campaign','enterprise_contract'
  )),
  internal_reference_id VARCHAR(300) NOT NULL,
  external_reference_id VARCHAR(300),
  synchronization_status VARCHAR(30) NOT NULL CHECK (synchronization_status IN (
    'missing','pending','synchronized','mismatch','disabled'
  )),
  last_verified_at TIMESTAMPTZ,
  evidence_reference TEXT,
  status VARCHAR(30) NOT NULL CHECK (status IN (
    'draft','pending_approval','approved','scheduled','active','disabled','archived'
  )),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (configuration_version_id,id),
  UNIQUE (configuration_version_id,provider,environment,market_code,internal_reference_type,internal_reference_id),
  CHECK (synchronization_status <> 'synchronized' OR
    (external_reference_id IS NOT NULL AND last_verified_at IS NOT NULL AND evidence_reference IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS commercial_provider_mapping_resolution_idx
  ON public.commercial_provider_mappings
  (provider,environment,market_code,internal_reference_type,internal_reference_id,status);
CREATE INDEX IF NOT EXISTS commercial_provider_mapping_health_idx
  ON public.commercial_provider_mappings
  (synchronization_status,environment,market_code,configuration_version_id)
  WHERE status <> 'disabled' AND synchronization_status <> 'synchronized';

CREATE TABLE IF NOT EXISTS public.commercial_paid_placement_policies (
  configuration_version_id VARCHAR(160) NOT NULL
    REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
  id VARCHAR(260) NOT NULL,
  product_id VARCHAR(180) NOT NULL,
  inventory_scope VARCHAR(30) NOT NULL CHECK (inventory_scope IN (
    'search','category','home','local'
  )),
  visible_label_message_key VARCHAR(220) NOT NULL,
  maximum_concurrent_placements INT CHECK (maximum_concurrent_placements IS NULL OR maximum_concurrent_placements > 0),
  rotation_strategy VARCHAR(30) NOT NULL CHECK (rotation_strategy IN (
    'round_robin','paced_rotation','scheduled'
  )),
  under_delivery_handling VARCHAR(30) NOT NULL CHECK (under_delivery_handling IN (
    'credit','refund','manual_review'
  )),
  organic_ranking_isolation BOOLEAN NOT NULL CHECK (organic_ranking_isolation),
  status VARCHAR(30) NOT NULL CHECK (status IN (
    'draft','pending_approval','approved','scheduled','active','disabled','archived'
  )),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (configuration_version_id,id),
  UNIQUE (configuration_version_id,product_id,inventory_scope)
);

CREATE TABLE IF NOT EXISTS public.commercial_offer_definitions (
  configuration_version_id VARCHAR(160) NOT NULL
    REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
  id VARCHAR(260) NOT NULL,
  name VARCHAR(220) NOT NULL,
  offer_type VARCHAR(50) NOT NULL CHECK (offer_type IN (
    'enterprise_network','qualified_lead','advertising','insurance','warranty',
    'data_report','partner_service','undefined_visibility_variant'
  )),
  pricing_model VARCHAR(50) NOT NULL CHECK (pricing_model IN (
    'customer_specific_price_book','unpriced_draft','catalog_price_required'
  )),
  market_codes TEXT[] NOT NULL,
  currency VARCHAR(3) NOT NULL,
  reference_amount_minor BIGINT CHECK (reference_amount_minor IS NULL OR reference_amount_minor >= 0),
  readiness VARCHAR(30) NOT NULL CHECK (readiness IN (
    'ready','incomplete','external_dependency'
  )),
  dependencies TEXT[] NOT NULL DEFAULT '{}',
  requires_cost_validation BOOLEAN NOT NULL,
  requires_internal_approval BOOLEAN NOT NULL,
  requires_customer_acceptance BOOLEAN NOT NULL,
  signed_agreement_required BOOLEAN NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN (
    'draft','pending_approval','approved','scheduled','active','disabled','archived'
  )),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (configuration_version_id,id)
);
CREATE INDEX IF NOT EXISTS commercial_offer_readiness_idx
  ON public.commercial_offer_definitions
  (configuration_version_id,status,readiness,offer_type);

CREATE OR REPLACE FUNCTION public.sync_commercial_governance_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.commercial_plan_migration_mappings WHERE configuration_version_id = NEW.id;
  DELETE FROM public.commercial_price_protection_policies WHERE configuration_version_id = NEW.id;
  DELETE FROM public.commercial_campaigns WHERE configuration_version_id = NEW.id;
  DELETE FROM public.commercial_economics WHERE configuration_version_id = NEW.id;
  DELETE FROM public.commercial_provider_mappings WHERE configuration_version_id = NEW.id;
  DELETE FROM public.commercial_paid_placement_policies WHERE configuration_version_id = NEW.id;
  DELETE FROM public.commercial_offer_definitions WHERE configuration_version_id = NEW.id;

  INSERT INTO public.commercial_plan_migration_mappings
    (configuration_version_id,id,from_product_id,from_product_version_id,to_product_id,
     treatment,requires_customer_acceptance,preserve_historical_price,
     preserve_historical_entitlements,shadow_quote_status,intentional_differences,
     rollout_status,payload)
  SELECT NEW.id,item->>'id',item->>'fromProductId',item->>'fromProductVersionId',
    item->>'toProductId',item->>'treatment',(item->>'requiresCustomerAcceptance')::BOOLEAN,
    (item->>'preserveHistoricalPrice')::BOOLEAN,(item->>'preserveHistoricalEntitlements')::BOOLEAN,
    item->>'shadowQuoteStatus',COALESCE(item->'intentionalDifferences','[]'::JSONB),
    item->>'rolloutStatus',item
  FROM jsonb_array_elements(COALESCE(NEW.snapshot->'migrationMappings','[]'::JSONB)) item;

  INSERT INTO public.commercial_price_protection_policies
    (configuration_version_id,id,name,protection_type,product_ids,starts_when,duration_months,
     fixed_ends_at,preserve_price_id,requires_customer_acceptance,campaign_id,status,payload)
  SELECT NEW.id,item->>'id',item->>'name',item->>'protectionType',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(item->'productIds','[]'::JSONB))),
    item->>'startsWhen',NULLIF(item->>'durationMonths','')::INT,
    NULLIF(item->>'fixedEndsAt','')::TIMESTAMPTZ,(item->>'preservePriceId')::BOOLEAN,
    (item->>'requiresCustomerAcceptance')::BOOLEAN,NULLIF(item->>'campaignId',''),
    item->>'status',item
  FROM jsonb_array_elements(COALESCE(NEW.snapshot->'priceProtectionPolicies','[]'::JSONB)) item;

  INSERT INTO public.commercial_campaigns
    (configuration_version_id,id,code,name,status,product_ids,eligible_market_codes,
     eligible_region_codes,eligible_vertical_ids,maximum_verticals,participant_cap,
     enrollment_starts_at,enrollment_ends_at,trial_days,payment_method_requirement,
     grace_period_days,conversion_behavior,price_protection_policy_id,payload)
  SELECT NEW.id,item->>'id',item->>'code',item->>'name',item->>'status',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(item->'productIds','[]'::JSONB))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(item->'eligibleMarketCodes','[]'::JSONB))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(item->'eligibleRegionCodes','[]'::JSONB))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(item->'eligibleVerticalIds','[]'::JSONB))),
    NULLIF(item->>'maximumVerticals','')::INT,NULLIF(item->>'participantCap','')::BIGINT,
    NULLIF(item->>'enrollmentStartsAt','')::TIMESTAMPTZ,
    NULLIF(item->>'enrollmentEndsAt','')::TIMESTAMPTZ,
    NULLIF(item->>'trialDays','')::INT,item->>'paymentMethodRequirement',
    COALESCE((item->>'gracePeriodDays')::INT,0),item->>'conversionBehavior',
    NULLIF(item->>'priceProtectionPolicyId',''),item
  FROM jsonb_array_elements(COALESCE(NEW.snapshot->'campaigns','[]'::JSONB)) item;

  INSERT INTO public.commercial_economics
    (configuration_version_id,id,product_id,price_id,market_code,currency,direct_cost_minor,
     reference_amount_minor,margin_floor_bps,subsidy_budget_minor,approval_status,
     evidence_reference,status,payload)
  SELECT NEW.id,item->>'id',item->>'productId',NULLIF(item->>'priceId',''),
    item->>'marketCode',item->>'currency',NULLIF(item->>'directCostAmountMinor','')::BIGINT,
    NULLIF(item->>'referenceAmountMinor','')::BIGINT,NULLIF(item->>'marginFloorBps','')::INT,
    NULLIF(item->>'subsidyBudgetMinor','')::BIGINT,item->>'approvalStatus',
    NULLIF(item->>'evidenceReference',''),item->>'status',item
  FROM jsonb_array_elements(COALESCE(NEW.snapshot->'commercialEconomics','[]'::JSONB)) item;

  INSERT INTO public.commercial_provider_mappings
    (configuration_version_id,id,provider,environment,market_code,internal_reference_type,
     internal_reference_id,external_reference_id,synchronization_status,last_verified_at,
     evidence_reference,status,payload)
  SELECT NEW.id,item->>'id',item->>'provider',item->>'environment',item->>'marketCode',
    item->>'internalReferenceType',item->>'internalReferenceId',
    NULLIF(item->>'externalReferenceId',''),item->>'synchronizationStatus',
    NULLIF(item->>'lastVerifiedAt','')::TIMESTAMPTZ,NULLIF(item->>'evidenceReference',''),
    item->>'status',item
  FROM jsonb_array_elements(COALESCE(NEW.snapshot->'providerMappings','[]'::JSONB)) item;

  INSERT INTO public.commercial_paid_placement_policies
    (configuration_version_id,id,product_id,inventory_scope,visible_label_message_key,
     maximum_concurrent_placements,rotation_strategy,under_delivery_handling,
     organic_ranking_isolation,status,payload)
  SELECT NEW.id,item->>'id',item->>'productId',item->>'inventoryScope',
    item->>'visibleLabelMessageKey',NULLIF(item->>'maximumConcurrentPlacements','')::INT,
    item->>'rotationStrategy',item->>'underDeliveryHandling',
    (item->>'organicRankingIsolation')::BOOLEAN,item->>'status',item
  FROM jsonb_array_elements(COALESCE(NEW.snapshot->'paidPlacementPolicies','[]'::JSONB)) item;

  INSERT INTO public.commercial_offer_definitions
    (configuration_version_id,id,name,offer_type,pricing_model,market_codes,currency,
     reference_amount_minor,readiness,dependencies,requires_cost_validation,
     requires_internal_approval,requires_customer_acceptance,signed_agreement_required,
     status,payload)
  SELECT NEW.id,item->>'id',item->>'name',item->>'offerType',item->>'pricingModel',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(item->'marketCodes','[]'::JSONB))),
    item->>'currency',NULLIF(item->>'referenceAmountMinor','')::BIGINT,item->>'readiness',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(item->'dependencies','[]'::JSONB))),
    (item->>'requiresCostValidation')::BOOLEAN,(item->>'requiresInternalApproval')::BOOLEAN,
    (item->>'requiresCustomerAcceptance')::BOOLEAN,(item->>'signedAgreementRequired')::BOOLEAN,
    item->>'status',item
  FROM jsonb_array_elements(COALESCE(NEW.snapshot->'offerDefinitions','[]'::JSONB)) item;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS commercial_configuration_sync_governance
  ON public.commercial_configuration_versions;
CREATE CONSTRAINT TRIGGER commercial_configuration_sync_governance
AFTER INSERT OR UPDATE OF snapshot ON public.commercial_configuration_versions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.sync_commercial_governance_snapshot();

CREATE TABLE IF NOT EXISTS public.monetization_price_protection_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(240) NOT NULL UNIQUE,
  configuration_version_id VARCHAR(160) NOT NULL
    REFERENCES public.commercial_configuration_versions(id) ON DELETE RESTRICT,
  policy_id VARCHAR(220) NOT NULL,
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES public.monetization_subscriptions(id) ON DELETE RESTRICT,
  price_id VARCHAR(260) NOT NULL REFERENCES public.monetization_prices(id) ON DELETE RESTRICT,
  protection_type VARCHAR(30) NOT NULL CHECK (protection_type IN (
    'price_lock','grandfathering','contract'
  )),
  locked_amount_minor BIGINT NOT NULL CHECK (locked_amount_minor >= 0),
  currency VARCHAR(3) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  customer_accepted_at TIMESTAMPTZ,
  source_type VARCHAR(40) NOT NULL CHECK (source_type IN (
    'campaign','migration','enterprise_contract','manual_approved'
  )),
  source_id VARCHAR(260) NOT NULL,
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  snapshot_hash CHAR(64) NOT NULL CHECK (snapshot_hash ~ '^[0-9a-f]{64}$'),
  created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS monetization_price_protection_account_idx
  ON public.monetization_price_protection_records
  (account_id,starts_at DESC,ends_at,created_at DESC);
CREATE INDEX IF NOT EXISTS monetization_price_protection_subscription_idx
  ON public.monetization_price_protection_records (subscription_id,created_at DESC)
  WHERE subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.monetization_price_protection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protection_record_id UUID NOT NULL
    REFERENCES public.monetization_price_protection_records(id) ON DELETE RESTRICT,
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN (
    'granted','activated','expired','revoked','superseded'
  )),
  reason TEXT NOT NULL CHECK (length(btrim(reason)) >= 8),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(payload) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS monetization_price_protection_event_idx
  ON public.monetization_price_protection_events
  (protection_record_id,occurred_at,id);

CREATE TABLE IF NOT EXISTS public.enterprise_commercial_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_number VARCHAR(100) NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  configuration_version_id VARCHAR(160) NOT NULL
    REFERENCES public.commercial_configuration_versions(id) ON DELETE RESTRICT,
  offer_definition_id VARCHAR(260) NOT NULL,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN (
    'draft','pending_internal_approval','approved','sent','accepted','active',
    'renewal_due','expired','terminated','rejected'
  )),
  reference_amount_minor BIGINT CHECK (reference_amount_minor IS NULL OR reference_amount_minor >= 0),
  direct_cost_minor BIGINT CHECK (direct_cost_minor IS NULL OR direct_cost_minor >= 0),
  margin_floor_bps INT CHECK (margin_floor_bps IS NULL OR margin_floor_bps BETWEEN -10000 AND 10000),
  price_book JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(price_book) = 'array'),
  entitlement_snapshot JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(entitlement_snapshot) = 'array'),
  locations_limit INT CHECK (locations_limit IS NULL OR locations_limit >= 0),
  seats_limit INT CHECK (seats_limit IS NULL OR seats_limit >= 0),
  api_limit INT CHECK (api_limit IS NULL OR api_limit >= 0),
  service_levels JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(service_levels) = 'object'),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  renewal_at TIMESTAMPTZ,
  price_locked_until TIMESTAMPTZ,
  signed_agreement_reference TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  customer_accepted_at TIMESTAMPTZ,
  snapshot_hash CHAR(64) NOT NULL CHECK (snapshot_hash ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CHECK (approved_by IS NULL OR approved_by <> created_by),
  CHECK (status NOT IN ('approved','sent','accepted','active','renewal_due','expired','terminated') OR
    (direct_cost_minor IS NOT NULL AND margin_floor_bps IS NOT NULL AND approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CHECK (status NOT IN ('accepted','active','renewal_due','expired','terminated') OR
    (customer_accepted_at IS NOT NULL AND signed_agreement_reference IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS enterprise_contract_org_status_idx
  ON public.enterprise_commercial_contracts
  (organization_id,status,renewal_at,created_at DESC);
CREATE INDEX IF NOT EXISTS enterprise_contract_renewal_idx
  ON public.enterprise_commercial_contracts (renewal_at,id)
  WHERE status IN ('active','renewal_due');

CREATE TABLE IF NOT EXISTS public.enterprise_commercial_contract_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.enterprise_commercial_contracts(id) ON DELETE RESTRICT,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  reason TEXT NOT NULL CHECK (length(btrim(reason)) >= 8),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  customer_acceptance_reference TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(payload) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS enterprise_contract_event_idx
  ON public.enterprise_commercial_contract_events (contract_id,occurred_at,id);

CREATE OR REPLACE FUNCTION public.prevent_commercial_evidence_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'commercial evidence is append-only';
END;
$$;

DROP TRIGGER IF EXISTS monetization_price_protection_records_immutable
  ON public.monetization_price_protection_records;
CREATE TRIGGER monetization_price_protection_records_immutable
BEFORE UPDATE OR DELETE ON public.monetization_price_protection_records
FOR EACH ROW EXECUTE FUNCTION public.prevent_commercial_evidence_mutation();
DROP TRIGGER IF EXISTS monetization_price_protection_events_immutable
  ON public.monetization_price_protection_events;
CREATE TRIGGER monetization_price_protection_events_immutable
BEFORE UPDATE OR DELETE ON public.monetization_price_protection_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_commercial_evidence_mutation();
DROP TRIGGER IF EXISTS enterprise_commercial_contract_events_immutable
  ON public.enterprise_commercial_contract_events;
CREATE TRIGGER enterprise_commercial_contract_events_immutable
BEFORE UPDATE OR DELETE ON public.enterprise_commercial_contract_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_commercial_evidence_mutation();

CREATE OR REPLACE FUNCTION public.protect_accepted_enterprise_contract()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status IN ('accepted','active','renewal_due','expired','terminated') AND (
    NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
    NEW.configuration_version_id IS DISTINCT FROM OLD.configuration_version_id OR
    NEW.offer_definition_id IS DISTINCT FROM OLD.offer_definition_id OR
    NEW.market_code IS DISTINCT FROM OLD.market_code OR
    NEW.currency IS DISTINCT FROM OLD.currency OR
    NEW.reference_amount_minor IS DISTINCT FROM OLD.reference_amount_minor OR
    NEW.direct_cost_minor IS DISTINCT FROM OLD.direct_cost_minor OR
    NEW.margin_floor_bps IS DISTINCT FROM OLD.margin_floor_bps OR
    NEW.price_book IS DISTINCT FROM OLD.price_book OR
    NEW.entitlement_snapshot IS DISTINCT FROM OLD.entitlement_snapshot OR
    NEW.starts_at IS DISTINCT FROM OLD.starts_at OR
    NEW.ends_at IS DISTINCT FROM OLD.ends_at OR
    NEW.price_locked_until IS DISTINCT FROM OLD.price_locked_until OR
    NEW.signed_agreement_reference IS DISTINCT FROM OLD.signed_agreement_reference OR
    NEW.snapshot_hash IS DISTINCT FROM OLD.snapshot_hash
  ) THEN
    RAISE EXCEPTION 'accepted enterprise contract terms are immutable';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enterprise_contract_protect_accepted
  ON public.enterprise_commercial_contracts;
CREATE TRIGGER enterprise_contract_protect_accepted
BEFORE UPDATE ON public.enterprise_commercial_contracts
FOR EACH ROW EXECUTE FUNCTION public.protect_accepted_enterprise_contract();

CREATE OR REPLACE FUNCTION public.grant_monetization_price_protection(
  p_idempotency_key VARCHAR,
  p_configuration_version_id VARCHAR,
  p_policy_id VARCHAR,
  p_account_id UUID,
  p_organization_id UUID,
  p_subscription_id UUID,
  p_price_id VARCHAR,
  p_locked_amount_minor BIGINT,
  p_currency VARCHAR,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_customer_accepted_at TIMESTAMPTZ,
  p_source_type VARCHAR,
  p_source_id VARCHAR,
  p_actor_id UUID,
  p_snapshot JSONB,
  p_snapshot_hash TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing UUID;
  v_policy public.commercial_price_protection_policies%ROWTYPE;
  v_record_id UUID;
BEGIN
  IF length(p_idempotency_key) < 8 OR p_locked_amount_minor < 0 OR
     jsonb_typeof(p_snapshot) <> 'object' OR p_snapshot_hash !~ '^[0-9a-f]{64}$' OR
     (p_ends_at IS NOT NULL AND p_ends_at <= p_starts_at) THEN
    RAISE EXCEPTION 'invalid price protection request';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('price-protection-' || p_idempotency_key));
  SELECT id INTO v_existing FROM public.monetization_price_protection_records
    WHERE idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  SELECT policy.* INTO v_policy
  FROM public.commercial_price_protection_policies policy
  JOIN public.commercial_configuration_versions configuration
    ON configuration.id = policy.configuration_version_id
  WHERE policy.configuration_version_id = p_configuration_version_id
    AND policy.id = p_policy_id
    AND policy.status = 'active'
    AND configuration.status = 'active'
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'price protection policy unavailable'; END IF;
  IF v_policy.requires_customer_acceptance AND p_customer_accepted_at IS NULL THEN
    RAISE EXCEPTION 'customer acceptance required';
  END IF;

  INSERT INTO public.monetization_price_protection_records
    (idempotency_key,configuration_version_id,policy_id,account_id,organization_id,
     subscription_id,price_id,protection_type,locked_amount_minor,currency,starts_at,
     ends_at,customer_accepted_at,source_type,source_id,snapshot,snapshot_hash,created_by)
  VALUES
    (p_idempotency_key,p_configuration_version_id,p_policy_id,p_account_id,p_organization_id,
     p_subscription_id,p_price_id,v_policy.protection_type,p_locked_amount_minor,p_currency,
     p_starts_at,p_ends_at,p_customer_accepted_at,p_source_type,p_source_id,p_snapshot,
     p_snapshot_hash,p_actor_id)
  RETURNING id INTO v_record_id;
  INSERT INTO public.monetization_price_protection_events
    (protection_record_id,event_type,reason,actor_id,payload)
  VALUES
    (v_record_id,'granted','Protection de prix accordée selon la politique publiée',p_actor_id,
     jsonb_build_object('policyId',p_policy_id,'sourceType',p_source_type,'sourceId',p_source_id));
  RETURN v_record_id;
END;
$$;

INSERT INTO public.access_capabilities (id,is_sensitive)
VALUES
  ('monetization.governance.read',TRUE),
  ('monetization.governance.manage',TRUE),
  ('monetization.price_protection.manage',TRUE),
  ('monetization.enterprise_contracts.read',TRUE),
  ('monetization.enterprise_contracts.manage',TRUE)
ON CONFLICT (id) DO UPDATE SET is_sensitive = EXCLUDED.is_sensitive;

INSERT INTO public.access_role_grants (role_kind,role_key,capability_id)
SELECT 'staff_role',role_key,capability
FROM unnest(ARRAY['commercial','admin','owner']) role_key
CROSS JOIN unnest(ARRAY[
  'monetization.governance.read','monetization.governance.manage',
  'monetization.enterprise_contracts.read'
]::TEXT[]) capability
ON CONFLICT DO NOTHING;
INSERT INTO public.access_role_grants (role_kind,role_key,capability_id)
SELECT 'staff_role',role_key,capability
FROM unnest(ARRAY['admin','owner']) role_key
CROSS JOIN unnest(ARRAY[
  'monetization.price_protection.manage','monetization.enterprise_contracts.manage'
]::TEXT[]) capability
ON CONFLICT DO NOTHING;

ALTER TABLE public.commercial_plan_migration_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_price_protection_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_economics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_provider_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_paid_placement_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_offer_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_price_protection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_price_protection_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_commercial_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_commercial_contract_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.commercial_plan_migration_mappings FROM anon,authenticated;
REVOKE ALL ON public.commercial_price_protection_policies FROM anon,authenticated;
REVOKE ALL ON public.commercial_campaigns FROM anon,authenticated;
REVOKE ALL ON public.commercial_economics FROM anon,authenticated;
REVOKE ALL ON public.commercial_provider_mappings FROM anon,authenticated;
REVOKE ALL ON public.commercial_paid_placement_policies FROM anon,authenticated;
REVOKE ALL ON public.commercial_offer_definitions FROM anon,authenticated;
REVOKE ALL ON public.monetization_price_protection_records FROM anon,authenticated;
REVOKE ALL ON public.monetization_price_protection_events FROM anon,authenticated;
REVOKE ALL ON public.enterprise_commercial_contracts FROM anon,authenticated;
REVOKE ALL ON public.enterprise_commercial_contract_events FROM anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_commercial_governance_snapshot() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.prevent_commercial_evidence_mutation() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.protect_accepted_enterprise_contract() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.grant_monetization_price_protection(
  VARCHAR,VARCHAR,VARCHAR,UUID,UUID,UUID,VARCHAR,BIGINT,VARCHAR,TIMESTAMPTZ,
  TIMESTAMPTZ,TIMESTAMPTZ,VARCHAR,VARCHAR,UUID,JSONB,TEXT
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.grant_monetization_price_protection(
  VARCHAR,VARCHAR,VARCHAR,UUID,UUID,UUID,VARCHAR,BIGINT,VARCHAR,TIMESTAMPTZ,
  TIMESTAMPTZ,TIMESTAMPTZ,VARCHAR,VARCHAR,UUID,JSONB,TEXT
) TO service_role;

-- Existing snapshots predate the governance arrays and project empty sets.
-- The reviewed v4 target is installed explicitly through
-- `make monetization-draft-import`; this migration never changes the active v3.
UPDATE public.commercial_configuration_versions SET snapshot = snapshot;

COMMENT ON TABLE public.commercial_plan_migration_mappings IS
  'Explicit current-to-target plan treatment and shadow-quote rollout gates.';
COMMENT ON TABLE public.commercial_provider_mappings IS
  'Environment- and market-scoped external references; never stores provider secrets.';
COMMENT ON TABLE public.monetization_price_protection_records IS
  'Append-only customer price locks, grandfathering, and contract price evidence.';
COMMENT ON TABLE public.enterprise_commercial_contracts IS
  'Customer-specific enterprise price books and accepted commercial terms; no fake public price.';
