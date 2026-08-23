-- =============================================================================
-- Unified private/professional catalog, fair discovery and explicit promotions
-- Migration: 00018_unified_catalog_discovery.sql
--
-- Expand/backfill only. Legacy seller, store and boost columns remain readable
-- until every consumer has moved to the canonical resolver.
-- =============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
  CHECK (status IN ('active','suspended','deleted'));

CREATE TABLE IF NOT EXISTS public.organization_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name VARCHAR(180) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2) NOT NULL DEFAULT 'FR',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner','admin','manager','seller','support')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','suspended','revoked')),
  branch_ids UUID[] NOT NULL DEFAULT '{}',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS organization_members_user_active_idx
  ON public.organization_members (user_id, organization_id) WHERE status = 'active';

INSERT INTO public.organization_members (organization_id, user_id, role, status, permissions)
SELECT id, owner_id, 'owner', 'active', ARRAY['listing.publish','listing.manage','inventory.import']::TEXT[]
FROM public.organizations
ON CONFLICT (organization_id, user_id) DO NOTHING;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS publisher_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS publisher_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS publisher_organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS publisher_branch_id UUID REFERENCES public.organization_branches(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS publisher_verification_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS publication_offer_id VARCHAR(180),
  ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.monetization_subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entitlement_snapshot JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS promotion_state VARCHAR(20) NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS promotion_type VARCHAR(40),
  ADD COLUMN IF NOT EXISTS promotion_source VARCHAR(30),
  ADD COLUMN IF NOT EXISTS promotion_source_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS promotion_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS promotion_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promotion_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS materially_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS organic_freshness_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_stock_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS duplicate_group_id VARCHAR(100);

WITH resolved_publishers AS (
  SELECT
    listing.id,
    COALESCE(store.organization_id, owned_organization.id) AS organization_id,
    COALESCE(organization.is_verified, owned_organization.is_verified, FALSE) AS organization_verified,
    profile.is_identity_verified,
    profile.is_phone_verified,
    profile.is_email_verified
  FROM public.listings listing
  JOIN public.profiles profile ON profile.id = listing.seller_id
  LEFT JOIN public.stores store ON store.id = listing.store_id
  LEFT JOIN public.organizations organization ON organization.id = store.organization_id
  LEFT JOIN LATERAL (
    SELECT candidate.id, candidate.is_verified
    FROM public.organizations candidate
    WHERE candidate.owner_id = listing.seller_id AND candidate.status = 'active'
    ORDER BY candidate.created_at ASC
    LIMIT 1
  ) owned_organization ON TRUE
)
UPDATE public.listings listing
SET
  publisher_user_id = COALESCE(listing.publisher_user_id, listing.seller_id),
  publisher_organization_id = COALESCE(
    listing.publisher_organization_id,
    resolved.organization_id
  ),
  publisher_type = COALESCE(
    listing.publisher_type,
    CASE
      WHEN resolved.organization_id IS NOT NULL THEN 'professional'
      ELSE 'private'
    END
  ),
  publisher_verification_status = COALESCE(
    listing.publisher_verification_status,
    CASE
      WHEN resolved.organization_verified THEN 'business_verified'
      WHEN resolved.is_identity_verified THEN 'identity_verified'
      WHEN resolved.is_phone_verified THEN 'phone_verified'
      WHEN resolved.is_email_verified THEN 'email_verified'
      ELSE 'unverified'
    END
  ),
  publication_offer_id = COALESCE(
    listing.publication_offer_id,
    CASE
      WHEN resolved.organization_id IS NOT NULL
        THEN 'listing.standard.professional'
      ELSE 'listing.standard.individual'
    END
  ),
  published_at = COALESCE(listing.published_at, listing.created_at),
  organic_freshness_at = COALESCE(listing.organic_freshness_at, listing.created_at)
FROM resolved_publishers resolved
WHERE resolved.id = listing.id;

ALTER TABLE public.listings
  ALTER COLUMN publisher_type SET DEFAULT 'private',
  ALTER COLUMN publisher_type SET NOT NULL,
  ALTER COLUMN publisher_user_id SET NOT NULL,
  ALTER COLUMN publisher_verification_status SET DEFAULT 'unverified',
  ALTER COLUMN publisher_verification_status SET NOT NULL,
  ALTER COLUMN published_at SET DEFAULT NOW(),
  ALTER COLUMN published_at SET NOT NULL,
  ALTER COLUMN organic_freshness_at SET DEFAULT NOW(),
  ALTER COLUMN organic_freshness_at SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_publisher_type_check
    CHECK (publisher_type IN ('private','professional'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_publisher_verification_check
    CHECK (publisher_verification_status IN ('unverified','email_verified','phone_verified','identity_verified','business_verified','suspended'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_effective_owner_check
    CHECK (
      (publisher_type = 'private' AND publisher_organization_id IS NULL) OR
      (publisher_type = 'professional' AND publisher_organization_id IS NOT NULL)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_publisher_branch_check
    CHECK (publisher_branch_id IS NULL OR publisher_organization_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_promotion_state_check
    CHECK (promotion_state IN ('inactive','scheduled','active','expired','cancelled','refunded','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_promotion_type_check
    CHECK (promotion_type IS NULL OR promotion_type IN (
      'urgent_badge','search_bump','featured','top_placement','sponsored_search',
      'homepage_spotlight','category_spotlight','local_spotlight','seller_spotlight'
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_promotion_source_check
    CHECK (promotion_source IS NULL OR promotion_source IN ('purchase','subscription_credit','admin_grant'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.listings ADD CONSTRAINT listings_promotion_period_check
    CHECK (promotion_end_at IS NULL OR promotion_start_at IS NULL OR promotion_end_at > promotion_start_at);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.listing_ownership_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  previous_publisher JSONB,
  next_publisher JSONB NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS listing_ownership_audit_listing_idx
  ON public.listing_ownership_audit (listing_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_listing_publisher_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles profile
    WHERE profile.id = NEW.publisher_user_id AND profile.status = 'active'
  ) THEN
    RAISE EXCEPTION 'publisher user is not active';
  END IF;
  IF NEW.publisher_type = 'professional' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.organizations organization
      WHERE organization.id = NEW.publisher_organization_id
        AND organization.status = 'active'
    ) THEN
      RAISE EXCEPTION 'publisher organization is not active';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.organizations organization
      WHERE organization.id = NEW.publisher_organization_id
        AND organization.owner_id = NEW.publisher_user_id
      UNION ALL
      SELECT 1 FROM public.organization_members member
      WHERE member.organization_id = NEW.publisher_organization_id
        AND member.user_id = NEW.publisher_user_id
        AND member.status = 'active'
        AND member.role IN ('owner','admin','manager','seller')
    ) THEN
      RAISE EXCEPTION 'publisher lacks organization permission';
    END IF;
    IF NEW.publisher_branch_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.organization_branches branch
      WHERE branch.id = NEW.publisher_branch_id
        AND branch.organization_id = NEW.publisher_organization_id
        AND branch.status = 'active'
    ) THEN
      RAISE EXCEPTION 'publisher branch is invalid';
    END IF;
  ELSIF NEW.publisher_organization_id IS NOT NULL OR NEW.publisher_branch_id IS NOT NULL THEN
    RAISE EXCEPTION 'private publisher cannot reference an organization';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_listing_publisher_integrity_trigger ON public.listings;
CREATE TRIGGER enforce_listing_publisher_integrity_trigger
BEFORE INSERT OR UPDATE OF publisher_type, publisher_user_id, publisher_organization_id, publisher_branch_id
ON public.listings FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_publisher_integrity();

CREATE OR REPLACE FUNCTION public.audit_listing_publisher_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND ROW(
    OLD.publisher_type, OLD.publisher_user_id,
    OLD.publisher_organization_id, OLD.publisher_branch_id
  ) IS DISTINCT FROM ROW(
    NEW.publisher_type, NEW.publisher_user_id,
    NEW.publisher_organization_id, NEW.publisher_branch_id
  ) THEN
    INSERT INTO public.listing_ownership_audit (
      listing_id, actor_user_id, previous_publisher, next_publisher, reason
    ) VALUES (
      NEW.id,
      NEW.publisher_user_id,
      jsonb_build_object('type', OLD.publisher_type, 'userId', OLD.publisher_user_id,
        'organizationId', OLD.publisher_organization_id, 'branchId', OLD.publisher_branch_id),
      jsonb_build_object('type', NEW.publisher_type, 'userId', NEW.publisher_user_id,
        'organizationId', NEW.publisher_organization_id, 'branchId', NEW.publisher_branch_id),
      'Changement du propriétaire effectif'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_listing_publisher_change_trigger ON public.listings;
CREATE TRIGGER audit_listing_publisher_change_trigger
AFTER UPDATE OF publisher_type, publisher_user_id, publisher_organization_id, publisher_branch_id
ON public.listings FOR EACH ROW EXECUTE FUNCTION public.audit_listing_publisher_change();

INSERT INTO public.listing_ownership_audit (
  listing_id, actor_user_id, next_publisher, reason
)
SELECT
  listing.id,
  listing.seller_id,
  jsonb_build_object(
    'type', listing.publisher_type,
    'userId', listing.publisher_user_id,
    'organizationId', listing.publisher_organization_id,
    'branchId', listing.publisher_branch_id
  ),
  'Backfill canonique migration 00018'
FROM public.listings listing
WHERE NOT EXISTS (
  SELECT 1 FROM public.listing_ownership_audit audit
  WHERE audit.listing_id = listing.id AND audit.reason = 'Backfill canonique migration 00018'
);

CREATE TABLE IF NOT EXISTS public.listing_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  product_id VARCHAR(180) REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  placement_type VARCHAR(40) NOT NULL CHECK (placement_type IN (
    'urgent_badge','search_bump','featured','top_placement','sponsored_search',
    'homepage_spotlight','category_spotlight','local_spotlight','seller_spotlight'
  )),
  source_type VARCHAR(30) NOT NULL CHECK (source_type IN ('purchase','subscription_credit','admin_grant')),
  source_order_id VARCHAR(80) REFERENCES public.monetization_orders(id) ON DELETE RESTRICT,
  source_entitlement_id UUID REFERENCES public.monetization_entitlements(id) ON DELETE RESTRICT,
  admin_grant_reference VARCHAR(255),
  status VARCHAR(20) NOT NULL CHECK (status IN ('scheduled','active','expired','cancelled','refunded','failed')),
  label VARCHAR(100) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  frequency_cap_per_session INT CHECK (frequency_cap_per_session IS NULL OR frequency_cap_per_session > 0),
  impression_limit BIGINT CHECK (impression_limit IS NULL OR impression_limit > 0),
  impression_count BIGINT NOT NULL DEFAULT 0 CHECK (impression_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  CHECK (
    (source_type = 'purchase' AND source_order_id IS NOT NULL) OR
    (source_type = 'subscription_credit' AND source_entitlement_id IS NOT NULL) OR
    (source_type = 'admin_grant' AND admin_grant_reference IS NOT NULL)
  )
);
CREATE UNIQUE INDEX IF NOT EXISTS listing_promotions_source_order_unique_idx
  ON public.listing_promotions (listing_id, product_id, source_order_id)
  WHERE source_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS listing_promotions_active_placement_idx
  ON public.listing_promotions (placement_type, starts_at, ends_at, listing_id)
  WHERE status = 'active';

-- Preserve still-valid legacy visibility as an explicit audited migration
-- grant. No creation or freshness timestamp is changed.
INSERT INTO public.listing_promotions (
  listing_id, placement_type, source_type, admin_grant_reference, status,
  label, starts_at, ends_at
)
SELECT
  listing.id,
  legacy.placement_type,
  'admin_grant',
  'migration-00018:' || listing.id::TEXT || ':' || legacy.placement_type,
  'active',
  legacy.label,
  legacy.starts_at,
  legacy.ends_at
FROM public.listings listing
JOIN LATERAL (
  VALUES
    ('featured'::VARCHAR, listing.is_featured, 'À la une'::VARCHAR,
      COALESCE(listing.updated_at, listing.created_at), listing.featured_expires_at),
    ('urgent_badge'::VARCHAR, listing.is_urgent, 'Urgent'::VARCHAR,
      COALESCE(listing.updated_at, listing.created_at), listing.urgent_expires_at),
    ('search_bump'::VARCHAR, listing.bumped_at IS NOT NULL, 'Remonté'::VARCHAR,
      listing.bumped_at, listing.expires_at)
) AS legacy(placement_type, enabled, label, starts_at, ends_at)
  ON legacy.enabled AND legacy.starts_at IS NOT NULL AND legacy.ends_at IS NOT NULL
WHERE
  legacy.ends_at > NOW()
  AND NOT EXISTS (
    SELECT 1 FROM public.listing_promotions promotion
    WHERE promotion.admin_grant_reference =
      'migration-00018:' || listing.id::TEXT || ':' || legacy.placement_type
  );

WITH effective_promotions AS (
  SELECT DISTINCT ON (candidate.listing_id) candidate.*
  FROM public.listing_promotions candidate
  WHERE candidate.status = 'active'
  ORDER BY candidate.listing_id,
    CASE candidate.placement_type
      WHEN 'sponsored_search' THEN 1
      WHEN 'top_placement' THEN 2
      WHEN 'featured' THEN 3
      WHEN 'search_bump' THEN 4
      ELSE 5
    END,
    candidate.starts_at DESC
)
UPDATE public.listings listing
SET
  promotion_state = 'active',
  promotion_type = promotion.placement_type,
  promotion_source = promotion.source_type,
  promotion_source_id = COALESCE(
    promotion.source_order_id::TEXT,
    promotion.source_entitlement_id::TEXT,
    promotion.admin_grant_reference
  ),
  promotion_label = promotion.label,
  promotion_start_at = promotion.starts_at,
  promotion_end_at = promotion.ends_at,
  promoted_at = promotion.starts_at
FROM effective_promotions promotion
WHERE promotion.listing_id = listing.id;

CREATE TABLE IF NOT EXISTS public.discovery_configuration_versions (
  id VARCHAR(160) PRIMARY KEY,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  category_id VARCHAR(100) REFERENCES public.categories(id) ON DELETE RESTRICT,
  context VARCHAR(30) NOT NULL CHECK (context IN ('search','home','similar','saved_search')),
  version_number INT NOT NULL CHECK (version_number > 0),
  status VARCHAR(30) NOT NULL CHECK (status IN ('draft','pending_approval','approved','scheduled','active','archived')),
  weights JSONB NOT NULL CHECK (jsonb_typeof(weights) = 'object'),
  freshness_half_life_days NUMERIC NOT NULL CHECK (freshness_half_life_days > 0),
  diversity_policy JSONB NOT NULL CHECK (jsonb_typeof(diversity_policy) = 'object'),
  sponsored_policy JSONB NOT NULL CHECK (jsonb_typeof(sponsored_policy) = 'object'),
  duplicate_policy JSONB NOT NULL CHECK (jsonb_typeof(duplicate_policy) = 'object'),
  experiment_key VARCHAR(100),
  change_reason TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  effective_from TIMESTAMPTZ,
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE NULLS NOT DISTINCT (market_code, category_id, context, version_number),
  CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);
CREATE UNIQUE INDEX IF NOT EXISTS discovery_configuration_one_active_idx
  ON public.discovery_configuration_versions (market_code, COALESCE(category_id, ''), context)
  WHERE status = 'active';

INSERT INTO public.discovery_configuration_versions (
  id, market_code, context, version_number, status, weights,
  freshness_half_life_days, diversity_policy, sponsored_policy,
  duplicate_policy, change_reason, effective_from, published_at
) VALUES (
  'unified-discovery-fr-v1', 'FR', 'search', 1, 'active',
  '{"relevance":0.30,"category":0.12,"location":0.08,"quality":0.16,"freshness":0.12,"trust":0.12,"price":0.06,"personalization":0.04}',
  30,
  '{"maxConsecutivePerPublisher":2,"maxFirstPageSharePerPublisher":0.35,"maxSponsoredPerPublisher":1,"minimumRelevanceRatio":0.72}',
  '{"positions":[2,7,13],"maxPerPage":3,"maxShare":0.20,"minimumRelevance":0.25,"minimumOrganicResults":4}',
  '{"exactBlock":true,"likelyReviewThreshold":0.82,"automaticDelete":false}',
  'Configuration initiale du catalogue unifié', NOW(), NOW()
) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.publish_discovery_configuration_version(
  p_actor_id UUID,
  p_market_code VARCHAR,
  p_category_id VARCHAR,
  p_context VARCHAR,
  p_weights JSONB,
  p_freshness_half_life_days NUMERIC,
  p_diversity_policy JSONB,
  p_sponsored_policy JSONB,
  p_change_reason TEXT,
  p_activate BOOLEAN DEFAULT FALSE
)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_version INT;
  version_id VARCHAR(160);
  weight_total NUMERIC;
  weight_count INT;
  actor_name_value TEXT;
  sponsored_positions_count INT;
  sponsored_positions_unique_count INT;
BEGIN
  IF NULLIF(BTRIM(p_change_reason), '') IS NULL THEN
    RAISE EXCEPTION 'change reason is required' USING ERRCODE = '22023';
  END IF;
  IF p_context NOT IN ('search','home','similar','saved_search') THEN
    RAISE EXCEPTION 'invalid discovery context' USING ERRCODE = '22023';
  END IF;
  IF p_freshness_half_life_days <= 0 THEN
    RAISE EXCEPTION 'freshness half-life must be positive' USING ERRCODE = '22023';
  END IF;
  SELECT COUNT(*), SUM(value::NUMERIC)
  INTO weight_count, weight_total
  FROM jsonb_each_text(p_weights);
  IF weight_count <> 8 OR ABS(weight_total - 1) > 0.001 THEN
    RAISE EXCEPTION 'organic weights must contain eight signals and sum to one' USING ERRCODE = '22023';
  END IF;
  IF COALESCE((p_sponsored_policy->>'maxShare')::NUMERIC, 1) > 0.4 OR
     COALESCE((p_sponsored_policy->>'minimumOrganicResults')::INT, 0) < 1 THEN
    RAISE EXCEPTION 'sponsored policy must preserve useful organic results' USING ERRCODE = '22023';
  END IF;
  SELECT COUNT(*), COUNT(DISTINCT value::INT)
  INTO sponsored_positions_count, sponsored_positions_unique_count
  FROM jsonb_array_elements_text(COALESCE(p_sponsored_policy->'positions', '[]'::JSONB));
  IF sponsored_positions_count <> sponsored_positions_unique_count OR
     sponsored_positions_count < COALESCE((p_sponsored_policy->>'maxPerPage')::INT, 0) THEN
    RAISE EXCEPTION 'sponsored positions must be unique and cover maxPerPage' USING ERRCODE = '22023';
  END IF;

  SELECT name INTO actor_name_value FROM public.profiles WHERE id = p_actor_id;
  IF actor_name_value IS NULL THEN
    RAISE EXCEPTION 'configuration actor not found' USING ERRCODE = '23503';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(
    UPPER(p_market_code) || ':' || COALESCE(p_category_id, '*') || ':' || p_context
  ));
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM public.discovery_configuration_versions
  WHERE market_code = UPPER(p_market_code)
    AND category_id IS NOT DISTINCT FROM p_category_id
    AND context = p_context;
  version_id := LEFT(
    'unified-discovery-' || LOWER(p_market_code) || '-' || p_context || '-v' ||
    next_version::TEXT || '-' || gen_random_uuid()::TEXT,
    160
  );

  IF p_activate THEN
    UPDATE public.discovery_configuration_versions
    SET status = 'archived', effective_until = NOW()
    WHERE market_code = UPPER(p_market_code)
      AND category_id IS NOT DISTINCT FROM p_category_id
      AND context = p_context
      AND status = 'active';
  END IF;

  INSERT INTO public.discovery_configuration_versions (
    id, market_code, category_id, context, version_number, status, weights,
    freshness_half_life_days, diversity_policy, sponsored_policy,
    duplicate_policy, change_reason, created_by, approved_by,
    effective_from, published_at
  ) VALUES (
    version_id, UPPER(p_market_code), p_category_id, p_context, next_version,
    CASE WHEN p_activate THEN 'active' ELSE 'draft' END,
    p_weights, p_freshness_half_life_days, p_diversity_policy,
    p_sponsored_policy,
    '{"exactBlock":true,"likelyReviewThreshold":0.82,"automaticDelete":false}'::JSONB,
    BTRIM(p_change_reason), p_actor_id,
    CASE WHEN p_activate THEN p_actor_id ELSE NULL END,
    CASE WHEN p_activate THEN NOW() ELSE NULL END,
    CASE WHEN p_activate THEN NOW() ELSE NULL END
  );

  INSERT INTO public.commercial_configuration_audit (
    actor_id, actor_name, action, entity_type, entity_id, reason,
    after_snapshot, approval_actor_id, request_id
  ) VALUES (
    p_actor_id, actor_name_value,
    CASE WHEN p_activate THEN 'publish' ELSE 'create_draft' END,
    'discovery_configuration', version_id, BTRIM(p_change_reason),
    jsonb_build_object(
      'marketCode', UPPER(p_market_code), 'categoryId', p_category_id,
      'context', p_context, 'versionNumber', next_version,
      'weights', p_weights, 'diversity', p_diversity_policy,
      'sponsored', p_sponsored_policy
    ),
    CASE WHEN p_activate THEN p_actor_id ELSE NULL END,
    gen_random_uuid()
  );
  RETURN version_id;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_discovery_configuration_version(
  UUID,VARCHAR,VARCHAR,VARCHAR,JSONB,NUMERIC,JSONB,JSONB,TEXT,BOOLEAN
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_discovery_configuration_version(
  UUID,VARCHAR,VARCHAR,VARCHAR,JSONB,NUMERIC,JSONB,JSONB,TEXT,BOOLEAN
) TO service_role;

CREATE TABLE IF NOT EXISTS public.promotion_product_policies (
  product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  configuration_version_id VARCHAR(160) NOT NULL REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
  placement_type VARCHAR(40) NOT NULL,
  eligible_market_codes TEXT[] NOT NULL DEFAULT '{}',
  eligible_category_ids TEXT[] NOT NULL DEFAULT '{}',
  eligible_publisher_types TEXT[] NOT NULL DEFAULT '{private,professional}',
  duration_days INT NOT NULL CHECK (duration_days > 0),
  start_rule VARCHAR(30) NOT NULL DEFAULT 'on_activation',
  relevance_threshold NUMERIC NOT NULL DEFAULT 0.25 CHECK (relevance_threshold BETWEEN 0 AND 1),
  frequency_cap_per_session INT CHECK (frequency_cap_per_session IS NULL OR frequency_cap_per_session > 0),
  impression_limit BIGINT CHECK (impression_limit IS NULL OR impression_limit > 0),
  label_translations JSONB NOT NULL DEFAULT '{}',
  renewal_policy VARCHAR(30) NOT NULL DEFAULT 'manual',
  refund_policy VARCHAR(30) NOT NULL DEFAULT 'unused_only',
  analytics_configuration JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (product_id, configuration_version_id)
);

CREATE TABLE IF NOT EXISTS public.listing_duplicate_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  canonical_listing_id UUID REFERENCES public.listings(id) ON DELETE RESTRICT,
  duplicate_type VARCHAR(30) NOT NULL CHECK (duplicate_type IN ('exact','likely','variant','repost','cross_branch','relisted')),
  confidence NUMERIC NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  evidence JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','dismissed','merged')),
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS listing_duplicate_reviews_pending_idx
  ON public.listing_duplicate_reviews (confidence DESC, created_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.discovery_search_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  market_code VARCHAR(2) NOT NULL,
  category_id VARCHAR(100),
  ranking_version VARCHAR(160) NOT NULL,
  applied_filter_keys TEXT[] NOT NULL DEFAULT '{}',
  organic_candidate_count INT NOT NULL CHECK (organic_candidate_count >= 0),
  sponsored_candidate_count INT NOT NULL CHECK (sponsored_candidate_count >= 0),
  duplicate_suppression_count INT NOT NULL DEFAULT 0 CHECK (duplicate_suppression_count >= 0),
  diversity_rerank_count INT NOT NULL DEFAULT 0 CHECK (diversity_rerank_count >= 0),
  final_organic_count INT NOT NULL CHECK (final_organic_count >= 0),
  final_sponsored_count INT NOT NULL CHECK (final_sponsored_count >= 0),
  publisher_distribution JSONB NOT NULL DEFAULT '{}',
  latency_ms INT CHECK (latency_ms IS NULL OR latency_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id)
);
CREATE INDEX IF NOT EXISTS discovery_search_events_market_time_idx
  ON public.discovery_search_events (market_code, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_discovery_metrics(
  p_market_code VARCHAR,
  p_since TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'marketCode', UPPER(p_market_code),
    'searchRequests', COUNT(*),
    'noResultRequests', COUNT(*) FILTER (
      WHERE final_organic_count + final_sponsored_count = 0
    ),
    'organicCandidates', COALESCE(SUM(organic_candidate_count), 0),
    'sponsoredCandidates', COALESCE(SUM(sponsored_candidate_count), 0),
    'organicResults', COALESCE(SUM(final_organic_count), 0),
    'sponsoredResults', COALESCE(SUM(final_sponsored_count), 0),
    'duplicateSuppressions', COALESCE(SUM(duplicate_suppression_count), 0),
    'diversityReranks', COALESCE(SUM(diversity_rerank_count), 0),
    'privateResultCount', COALESCE(SUM((publisher_distribution->>'private')::INT), 0),
    'professionalResultCount', COALESCE(SUM((publisher_distribution->>'professional')::INT), 0),
    'averageLatencyMs', COALESCE(ROUND(AVG(latency_ms)::NUMERIC, 2), 0)
  )
  FROM public.discovery_search_events
  WHERE market_code = UPPER(p_market_code) AND created_at >= p_since;
$$;
REVOKE ALL ON FUNCTION public.get_discovery_metrics(VARCHAR,TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_discovery_metrics(VARCHAR,TIMESTAMPTZ) TO service_role;

CREATE TABLE IF NOT EXISTS public.promotion_impressions (
  impression_id VARCHAR(100) PRIMARY KEY,
  listing_promotion_id UUID NOT NULL REFERENCES public.listing_promotions(id) ON DELETE RESTRICT,
  request_id UUID NOT NULL,
  session_hash CHAR(64) NOT NULL,
  position INT NOT NULL CHECK (position > 0),
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('impression','click','favorite','contact')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_promotion_id, request_id, session_hash, event_type)
);
CREATE INDEX IF NOT EXISTS promotion_impressions_promotion_time_idx
  ON public.promotion_impressions (listing_promotion_id, created_at DESC);

DROP INDEX IF EXISTS public.idx_listings_urgent_featured;
CREATE INDEX IF NOT EXISTS listings_organic_discovery_idx
  ON public.listings (market_code, status, organic_freshness_at DESC, id)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS listings_publisher_discovery_idx
  ON public.listings (publisher_organization_id, publisher_user_id, status, organic_freshness_at DESC);
CREATE INDEX IF NOT EXISTS listings_duplicate_group_idx
  ON public.listings (duplicate_group_id, status) WHERE duplicate_group_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS listings_external_stock_unique_idx
  ON public.listings (publisher_organization_id, external_stock_id)
  WHERE publisher_organization_id IS NOT NULL AND external_stock_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.refresh_listing_effective_promotion(p_listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE effective public.listing_promotions%ROWTYPE;
BEGIN
  UPDATE public.listing_promotions
  SET status = 'expired', updated_at = NOW()
  WHERE listing_id = p_listing_id AND status = 'active' AND ends_at <= NOW();

  SELECT * INTO effective
  FROM public.listing_promotions promotion
  WHERE promotion.listing_id = p_listing_id
    AND promotion.status = 'active'
    AND promotion.starts_at <= NOW()
    AND promotion.ends_at > NOW()
  ORDER BY
    CASE promotion.placement_type
      WHEN 'sponsored_search' THEN 1 WHEN 'top_placement' THEN 2
      WHEN 'featured' THEN 3 WHEN 'search_bump' THEN 4 ELSE 5
    END,
    promotion.starts_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.listings SET
      promotion_state = 'active', promotion_type = effective.placement_type,
      promotion_source = effective.source_type,
      promotion_source_id = COALESCE(
        effective.source_order_id::TEXT,
        effective.source_entitlement_id::TEXT,
        effective.admin_grant_reference
      ),
      promotion_label = effective.label, promotion_start_at = effective.starts_at,
      promotion_end_at = effective.ends_at, promoted_at = effective.starts_at
    WHERE id = p_listing_id;
  ELSE
    UPDATE public.listings SET
      promotion_state = 'inactive', promotion_type = NULL, promotion_source = NULL,
      promotion_source_id = NULL, promotion_label = NULL,
      promotion_start_at = NULL, promotion_end_at = NULL, promoted_at = NULL
    WHERE id = p_listing_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_listing_promotion_source()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('scheduled','active') THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.listings listing
    WHERE listing.id = NEW.listing_id AND listing.status = 'published'
  ) THEN
    RAISE EXCEPTION 'only published listings can be promoted';
  END IF;
  IF NEW.source_type = 'purchase' AND NOT EXISTS (
    SELECT 1 FROM public.monetization_orders purchase
    WHERE purchase.id = NEW.source_order_id AND purchase.status = 'paid'
  ) THEN
    RAISE EXCEPTION 'promotion purchase is not paid';
  END IF;
  IF NEW.source_type = 'subscription_credit' AND NOT EXISTS (
    SELECT 1 FROM public.monetization_entitlements entitlement
    WHERE entitlement.id = NEW.source_entitlement_id
      AND entitlement.status = 'active'
      AND entitlement.starts_at <= NOW()
      AND (entitlement.ends_at IS NULL OR entitlement.ends_at > NOW())
  ) THEN
    RAISE EXCEPTION 'promotion entitlement is not active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_listing_promotion_source_trigger ON public.listing_promotions;
CREATE TRIGGER validate_listing_promotion_source_trigger
BEFORE INSERT OR UPDATE OF status, source_type, source_order_id, source_entitlement_id
ON public.listing_promotions FOR EACH ROW EXECUTE FUNCTION public.validate_listing_promotion_source();

CREATE OR REPLACE FUNCTION public.refresh_listing_promotion_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_listing_effective_promotion(OLD.listing_id);
    RETURN OLD;
  END IF;
  PERFORM public.refresh_listing_effective_promotion(NEW.listing_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_listing_promotion_after_change_trigger ON public.listing_promotions;
CREATE TRIGGER refresh_listing_promotion_after_change_trigger
AFTER INSERT OR DELETE OR UPDATE OF status, starts_at, ends_at ON public.listing_promotions
FOR EACH ROW EXECUTE FUNCTION public.refresh_listing_promotion_after_change();

CREATE OR REPLACE FUNCTION public.sync_listing_promotions_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  quote public.monetization_quotes%ROWTYPE;
  target_listing public.listings%ROWTYPE;
  line RECORD;
  placement VARCHAR;
  duration_days INT;
  promotion_label VARCHAR;
BEGIN
  SELECT * INTO quote FROM public.monetization_quotes WHERE id = NEW.quote_id;
  IF NOT FOUND OR NULLIF(quote.quote_snapshot->>'listingId', '') IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO target_listing
  FROM public.listings
  WHERE id = (quote.quote_snapshot->>'listingId')::UUID
  FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NOT (
    target_listing.publisher_user_id = NEW.account_id OR
    EXISTS (
      SELECT 1 FROM public.organizations organization
      WHERE organization.id = target_listing.publisher_organization_id
        AND organization.owner_id = NEW.account_id
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members member
      WHERE member.organization_id = target_listing.publisher_organization_id
        AND member.user_id = NEW.account_id
        AND member.status = 'active'
        AND member.role IN ('owner','admin','manager','seller')
    )
  ) THEN
    RAISE EXCEPTION 'promotion order does not own listing';
  END IF;

  IF NEW.status = 'paid' THEN
    FOR line IN
      SELECT item.*, price.duration_days
      FROM public.monetization_quote_items item
      JOIN public.monetization_prices price ON price.id = item.price_id
      WHERE item.quote_id = quote.id
    LOOP
      placement := CASE line.product_id
        WHEN 'premium.urgent' THEN 'urgent_badge'
        WHEN 'premium.search_bump' THEN 'search_bump'
        WHEN 'premium.highlight' THEN 'featured'
        WHEN 'premium.spotlight' THEN 'sponsored_search'
        ELSE NULL
      END;
      IF placement IS NULL THEN CONTINUE; END IF;
      duration_days := COALESCE(line.duration_days, 1);
      promotion_label := CASE placement
        WHEN 'urgent_badge' THEN 'Urgent'
        WHEN 'search_bump' THEN 'Remonté'
        WHEN 'featured' THEN 'À la une'
        ELSE 'Sponsorisé'
      END;
      INSERT INTO public.listing_promotions (
        listing_id, product_id, placement_type, source_type, source_order_id,
        status, label, starts_at, ends_at
      ) VALUES (
        target_listing.id, line.product_id, placement, 'purchase', NEW.id,
        'active', promotion_label, NOW(), NOW() + make_interval(days => duration_days)
      )
      ON CONFLICT (listing_id, product_id, source_order_id) WHERE source_order_id IS NOT NULL
      DO NOTHING;
    END LOOP;
  ELSIF NEW.status IN ('failed','cancelled','refunded') THEN
    UPDATE public.listing_promotions
    SET status = CASE NEW.status WHEN 'refunded' THEN 'refunded' WHEN 'failed' THEN 'failed' ELSE 'cancelled' END,
        updated_at = NOW()
    WHERE source_order_id = NEW.id AND status IN ('scheduled','active');
  END IF;
  PERFORM public.refresh_listing_effective_promotion(target_listing.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_listing_promotions_order_trigger ON public.monetization_orders;
CREATE TRIGGER sync_listing_promotions_order_trigger
AFTER INSERT OR UPDATE OF status ON public.monetization_orders
FOR EACH ROW EXECUTE FUNCTION public.sync_listing_promotions_from_order();

CREATE OR REPLACE FUNCTION public.unified_discovery_migration_dry_run()
RETURNS JSONB
LANGUAGE SQL STABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'listingsToMigrate', COUNT(*) FILTER (WHERE publisher_user_id IS NULL),
    'ambiguousOwnership', COUNT(*) FILTER (
      WHERE publisher_type = 'professional' AND publisher_organization_id IS NULL
    ),
    'invalidOrganizations', COUNT(*) FILTER (
      WHERE publisher_organization_id IS NOT NULL AND organization.id IS NULL
    ),
    'expiredPromotions', (
      SELECT COUNT(*) FROM public.listing_promotions
      WHERE status = 'active' AND ends_at <= NOW()
    ),
    'duplicatePromotions', (
      SELECT COUNT(*) FROM (
        SELECT listing_id, placement_type, COUNT(*)
        FROM public.listing_promotions WHERE status = 'active'
        GROUP BY listing_id, placement_type HAVING COUNT(*) > 1
      ) duplicates
    ),
    'orphanedListings', COUNT(*) FILTER (WHERE profile.id IS NULL),
    'searchDocumentsRequiringRebuild', COUNT(*) FILTER (WHERE search_vector IS NULL),
    'totalListings', COUNT(*)
  )
  FROM public.listings listing
  LEFT JOIN public.profiles profile ON profile.id = listing.publisher_user_id
  LEFT JOIN public.organizations organization ON organization.id = listing.publisher_organization_id;
$$;

-- Remove the legacy paid-feature bonus from the course organic search view.
-- Featured tutors remain eligible for separately labelled sponsored placement.
CREATE OR REPLACE VIEW public.course_tutor_search_view
WITH (security_invoker = true) AS
SELECT
    o.id AS offer_id,
    p.id AS tutor_profile_id,
    o.market_code,
    ARRAY[o.market_code]::text[] AS market_codes,
    o.subject_id,
    COALESCE((SELECT array_agg(ol.level_id) FROM public.course_offer_levels ol WHERE ol.course_offer_id = o.id), ARRAY[]::varchar[]) AS level_ids,
    COALESCE((SELECT array_agg(dm.delivery_mode) FROM public.course_offer_delivery_modes dm WHERE dm.course_offer_id = o.id), ARRAY[]::varchar[]) AS delivery_modes,
    p.public_payload #>> '{serviceArea,cityLabel}' AS city_label,
    o.from_price_minor,
    o.currency,
    NULL::numeric AS distance_km,
    o.status AS offer_status,
    (p.public_payload
      - 'userId' - 'availabilityRules' - 'availabilityExceptions' - 'planId'
      - 'moderationStatus' - 'profileCompletionPercent' - 'createdAt' - 'updatedAt'
      #- '{serviceArea,latitude}' #- '{serviceArea,longitude}' #- '{serviceArea,postalCodePrefix}') AS tutor_payload,
    (o.public_payload - 'moderationReason') AS offer_payload,
    s.label AS subject_label,
    COALESCE((SELECT array_agg(l.label ORDER BY l.sort_order)
      FROM public.course_offer_levels ol
      JOIN public.course_subject_levels l ON l.id = ol.level_id AND l.market_code = ol.market_code
      WHERE ol.course_offer_id = o.id), ARRAY[]::varchar[]) AS level_labels,
    COALESCE((p.public_payload #>> '{verifications,identity}') = 'verified', FALSE) AS identity_verified,
    LEAST(1.0,
      0.60
      + CASE WHEN o.capacity_status = 'available' THEN 0.20 ELSE 0 END
      + CASE WHEN p.moderation_status = 'approved' THEN 0.17 ELSE 0 END
    ) AS relevance_baseline,
    ARRAY['Matière et niveau compatibles']::text[] AS relevance_reasons,
    (p.search_vector || o.search_vector) AS search_vector
FROM public.course_offers o
JOIN public.course_tutor_profiles p ON p.id = o.tutor_profile_id
JOIN public.course_subjects s ON s.id = o.subject_id AND s.market_code = o.market_code
WHERE p.moderation_status = 'approved' AND o.status = 'published';

ALTER TABLE public.organization_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_ownership_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_configuration_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_product_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_duplicate_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_search_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active organization branches are public" ON public.organization_branches;
DROP POLICY IF EXISTS "Organization members see their organization" ON public.organization_members;
DROP POLICY IF EXISTS "Organization owners manage memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Publishers inspect listing promotion evidence" ON public.listing_promotions;
DROP POLICY IF EXISTS "Discovery configurations are publicly readable" ON public.discovery_configuration_versions;
DROP POLICY IF EXISTS "Promotion policies are publicly readable" ON public.promotion_product_policies;
DROP POLICY IF EXISTS "Moderators inspect ownership audit" ON public.listing_ownership_audit;
DROP POLICY IF EXISTS "Moderators manage duplicate reviews" ON public.listing_duplicate_reviews;
DROP POLICY IF EXISTS "Admins inspect discovery analytics" ON public.discovery_search_events;
DROP POLICY IF EXISTS "Admins inspect promotion analytics" ON public.promotion_impressions;

CREATE POLICY "Active organization branches are public"
  ON public.organization_branches FOR SELECT USING (status = 'active' OR public.is_moderator_or_admin());
CREATE POLICY "Organization members see their organization"
  ON public.organization_members FOR SELECT USING (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
    OR public.is_moderator_or_admin()
  );
CREATE POLICY "Organization owners manage memberships"
  ON public.organization_members FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organizations organization
      WHERE organization.id = organization_members.organization_id
        AND organization.owner_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
    ) OR public.is_admin()
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations organization
      WHERE organization.id = organization_members.organization_id
        AND organization.owner_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
    ) OR public.is_admin()
  );
CREATE POLICY "Publishers inspect listing promotion evidence"
  ON public.listing_promotions FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.listings listing
      LEFT JOIN public.profiles actor ON actor.id = listing.publisher_user_id
      LEFT JOIN public.organization_members member
        ON member.organization_id = listing.publisher_organization_id
       AND member.status = 'active'
      LEFT JOIN public.profiles member_profile ON member_profile.id = member.user_id
      WHERE listing.id = listing_promotions.listing_id
        AND (actor.auth_user_id = public.auth_uid() OR member_profile.auth_user_id = public.auth_uid())
    ) OR public.is_moderator_or_admin()
  );
CREATE POLICY "Discovery configurations are publicly readable"
  ON public.discovery_configuration_versions FOR SELECT USING (status = 'active' OR public.is_admin());
CREATE POLICY "Promotion policies are publicly readable"
  ON public.promotion_product_policies FOR SELECT USING (is_enabled OR public.is_admin());
CREATE POLICY "Moderators inspect ownership audit"
  ON public.listing_ownership_audit FOR SELECT USING (public.is_moderator_or_admin());
CREATE POLICY "Moderators manage duplicate reviews"
  ON public.listing_duplicate_reviews FOR ALL USING (public.is_moderator_or_admin()) WITH CHECK (public.is_moderator_or_admin());
CREATE POLICY "Admins inspect discovery analytics"
  ON public.discovery_search_events FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins inspect promotion analytics"
  ON public.promotion_impressions FOR SELECT USING (public.is_admin());

COMMENT ON COLUMN public.listings.organic_freshness_at IS
  'Legitimate freshness only. Paid bump activation must never update this column.';
COMMENT ON COLUMN public.listings.promoted_at IS
  'Paid/admin promotion activation timestamp, distinct from creation and publication.';
COMMENT ON FUNCTION public.unified_discovery_migration_dry_run() IS
  'Idempotent pre/post-migration inventory for canonical ownership, promotions, duplicates and search documents.';
