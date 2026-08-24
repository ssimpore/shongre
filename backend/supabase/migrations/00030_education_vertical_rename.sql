-- =============================================================================
-- EDUCATION VERTICAL RENAME
-- Canonicalizes the business dimension without renaming actual Course entities.
-- Existing subscription/payment/provider IDs and immutable snapshots are retained.
-- =============================================================================

BEGIN;

-- Expand finance validation first. The legacy value remains readable in
-- finalized catalog and invoice snapshots; newly published versions use the
-- canonical category.
ALTER TABLE public.monetization_product_commercial_profiles
  DROP CONSTRAINT IF EXISTS monetization_product_commercial_profiles_finance_category_check;
ALTER TABLE public.monetization_product_commercial_profiles
  ADD CONSTRAINT monetization_product_commercial_profiles_finance_category_check
  CHECK (finance_category IN (
    'generic_subscription','auto_subscription','immo_subscription',
    'employment_subscription','education_subscription','courses_subscription',
    'addon','promotion','marketplace_service'
  ));

INSERT INTO public.business_verticals
  (id,name,description,category_ids,capability_keys,status,sort_order,created_at,updated_at)
SELECT
  'education','Éducation',description,category_ids,capability_keys,status,sort_order,
  created_at,NOW()
FROM public.business_verticals
WHERE id = 'cours'
ON CONFLICT (id) DO UPDATE SET
  name = 'Éducation',
  description = EXCLUDED.description,
  category_ids = EXCLUDED.category_ids,
  capability_keys = EXCLUDED.capability_keys,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO public.business_verticals
  (id,name,description,category_ids,capability_keys,status,sort_order)
VALUES (
  'education','Éducation','Cours, profils enseignants et gestion des demandes.',
  ARRAY['courses'],ARRAY['course.offer.manage.own','course.organization.manage.own'],
  'active',40
)
ON CONFLICT (id) DO UPDATE SET name = 'Éducation', updated_at = NOW();

-- Three evidence tables reject ordinary updates. Temporarily suspend only
-- their immutability guard while migrating the foreign-key dimension; no
-- financial amount, business evidence, or identifier is changed.
ALTER TABLE public.monetization_quote_items
  DISABLE TRIGGER immutable_quote_items;
ALTER TABLE public.monetization_usage_records
  DISABLE TRIGGER immutable_monetization_usage_records;
ALTER TABLE public.monetization_complimentary_grants
  DISABLE TRIGGER immutable_monetization_complimentary_grants;

UPDATE public.monetization_product_commercial_profiles
SET vertical_id = 'education',
    family_id = regexp_replace(family_id, '^vertical\.cours', 'vertical.education'),
    finance_category = CASE
      WHEN finance_category = 'courses_subscription' THEN 'education_subscription'
      ELSE finance_category
    END,
    updated_at = NOW()
WHERE vertical_id = 'cours' OR family_id LIKE 'vertical.cours%';

UPDATE public.monetization_product_entitlements
SET vertical_id = 'education'
WHERE vertical_id = 'cours';

UPDATE public.monetization_entitlements
SET vertical_id = 'education'
WHERE vertical_id = 'cours';

UPDATE public.monetization_quote_items
SET vertical_id = 'education'
WHERE vertical_id = 'cours';

UPDATE public.monetization_subscriptions
SET vertical_id = 'education',
    family_id = regexp_replace(family_id, '^vertical\.cours', 'vertical.education'),
    updated_at = NOW()
WHERE vertical_id = 'cours' OR family_id LIKE 'vertical.cours%';

UPDATE public.monetization_usage_records
SET vertical_id = 'education'
WHERE vertical_id = 'cours';

UPDATE public.monetization_trial_consumptions
SET vertical_id = 'education',
    family_id = regexp_replace(family_id, '^vertical\.cours', 'vertical.education')
WHERE vertical_id = 'cours' OR family_id LIKE 'vertical.cours%';

UPDATE public.monetization_complimentary_grants
SET vertical_id = 'education'
WHERE vertical_id = 'cours';

UPDATE public.monetization_promotions promotion
SET vertical_ids = ARRAY(
      SELECT DISTINCT CASE WHEN value = 'cours' THEN 'education' ELSE value END
      FROM unnest(promotion.vertical_ids) value
      ORDER BY 1
    ),
    updated_at = NOW()
WHERE 'cours' = ANY(vertical_ids);

ALTER TABLE public.monetization_quote_items
  ENABLE TRIGGER immutable_quote_items;
ALTER TABLE public.monetization_usage_records
  ENABLE TRIGGER immutable_monetization_usage_records;
ALTER TABLE public.monetization_complimentary_grants
  ENABLE TRIGGER immutable_monetization_complimentary_grants;

-- Operational quota counters are mutable state. Merge old and new namespaces
-- before removing the alias so no account regains consumed capacity.
INSERT INTO public.monetization_usage_counters
  (account_id,rule_key,market_code,period_start,period_end,used_count,updated_at)
SELECT
  account_id,
  regexp_replace(rule_key, '^entitlement\.cours\.', 'entitlement.education.'),
  market_code,period_start,period_end,used_count,NOW()
FROM public.monetization_usage_counters
WHERE rule_key LIKE 'entitlement.cours.%'
ON CONFLICT (account_id,rule_key,market_code,period_start) DO UPDATE SET
  used_count = public.monetization_usage_counters.used_count + EXCLUDED.used_count,
  period_end = GREATEST(public.monetization_usage_counters.period_end, EXCLUDED.period_end),
  updated_at = NOW();

DELETE FROM public.monetization_usage_counters
WHERE rule_key LIKE 'entitlement.cours.%';

DELETE FROM public.business_verticals WHERE id = 'cours';

UPDATE public.vertical_definitions
SET public_name = 'Shongre Education', updated_at = NOW()
WHERE type = 'tutoring';

UPDATE public.categories
SET short_label = 'Éducation & Formation',
    short_labels = COALESCE(short_labels, '{}'::JSONB) ||
      '{"fr-FR":"Éducation & Formation","en-US":"Education & Training"}'::JSONB,
    aliases = ARRAY(
      SELECT DISTINCT value
      FROM unnest(COALESCE(aliases, '{}') ||
        ARRAY['education','éducation','cours','formation','soutien scolaire']) value
      ORDER BY value
    ),
    updated_at = NOW()
WHERE id = 'services.tutoring';

UPDATE public.course_offers
SET public_payload = jsonb_set(
      public_payload,
      '{canonicalPath}',
      to_jsonb('/education/professeur/' || slug),
      TRUE
    ),
    updated_at = NOW()
WHERE public_payload->>'canonicalPath' LIKE '/cours/%';

UPDATE public.listings
SET public_payload = jsonb_set(
      public_payload,
      '{canonicalPath}',
      to_jsonb(regexp_replace(public_payload->>'canonicalPath', '^/cours', '/education')),
      TRUE
    ),
    updated_at = NOW()
WHERE vertical_type = 'tutoring'
  AND public_payload->>'canonicalPath' LIKE '/cours/%';

-- Keep future course discovery projections on the canonical public URL.
CREATE OR REPLACE FUNCTION public.sync_course_discovery_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  tutor public.course_tutor_profiles%ROWTYPE;
  area public.course_service_areas%ROWTYPE;
  target_category_id VARCHAR(100);
  generic_status public.listing_status;
  target_organization_id UUID;
BEGIN
  SELECT * INTO tutor
    FROM public.course_tutor_profiles profile
   WHERE profile.id = NEW.tutor_profile_id;

  SELECT * INTO area
    FROM public.course_service_areas service_area
   WHERE service_area.tutor_profile_id = tutor.id
      OR (service_area.organization_id = tutor.organization_id AND tutor.organization_id IS NOT NULL)
   ORDER BY (service_area.tutor_profile_id = tutor.id) DESC, service_area.created_at ASC
   LIMIT 1;

  SELECT activation.category_ids[1]
    INTO target_category_id
    FROM public.vertical_market_activations activation
   WHERE activation.vertical_type = 'tutoring'
     AND activation.market_code = NEW.market_code
     AND activation.is_active;

  IF target_category_id IS NULL THEN
    RAISE EXCEPTION 'Tutoring vertical is not activated for market %', NEW.market_code;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('tutoring:' || NEW.slug, 0));
  NEW.listing_id := COALESCE(
    NEW.listing_id,
    (SELECT offer.listing_id FROM public.course_offers offer WHERE offer.slug = NEW.slug),
    gen_random_uuid()
  );
  target_organization_id := COALESCE(NEW.organization_id, tutor.organization_id);

  generic_status := CASE
    WHEN NEW.status = 'published' AND tutor.moderation_status = 'approved' THEN 'published'::public.listing_status
    WHEN tutor.moderation_status = 'rejected' THEN 'rejected'::public.listing_status
    WHEN NEW.status IN ('paused','suspended','archived') OR tutor.moderation_status = 'suspended' THEN 'archived'::public.listing_status
    ELSE 'draft'::public.listing_status
  END;

  NEW.listing_id := public.upsert_vertical_discovery_listing(
    NEW.listing_id,'tutoring',NEW.id,NEW.schema_version,NEW.market_code,
    target_category_id,tutor.user_id,target_organization_id,NEW.title,
    NEW.description,NEW.from_price_minor,NEW.currency,generic_status,'service',
    COALESCE(area.city_label, tutor.public_payload->>'city', 'France'),
    area.postal_code_prefix,NEW.market_code,area.center_latitude,
    area.center_longitude,
    NEW.public_payload || jsonb_build_object(
      'canonicalPath', '/education/professeur/' || tutor.slug,
      'categoryPath', ARRAY['services','services.tutoring'],
      'marketCodes', ARRAY[NEW.market_code],
      'subjectId', NEW.subject_id,
      'capacityStatus', NEW.capacity_status,
      'trialLessonAvailable', NEW.trial_lesson_available,
      'tutorProfileId', tutor.id,
      'tutorSlug', tutor.slug,
      'tutorHeadline', tutor.headline,
      'tutorRating', tutor.rating,
      'tutorReviewCount', tutor.review_count
    ),
    NEW.created_at,NEW.updated_at,NEW.published_at,NULL,FALSE,tutor.is_featured
  );
  RETURN NEW;
END;
$$;

-- Historical evidence stays unchanged; reports collapse its old dimension.
CREATE OR REPLACE VIEW public.monetization_vertical_subscription_metrics AS
SELECT
  CASE WHEN subscription.vertical_id = 'cours' THEN 'education' ELSE subscription.vertical_id END AS vertical_id,
  regexp_replace(subscription.family_id, '^vertical\.cours', 'vertical.education')::VARCHAR(120) AS family_id,
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
GROUP BY 1,2,3,4;

CREATE OR REPLACE VIEW public.finance_vertical_revenue_attribution AS
SELECT
  CASE WHEN profile.vertical_id = 'cours' THEN 'education' ELSE COALESCE(profile.vertical_id,'general') END AS vertical_id,
  regexp_replace(profile.family_id, '^vertical\.cours', 'vertical.education')::VARCHAR(120) AS family_id,
  CASE WHEN profile.finance_category = 'courses_subscription' THEN 'education_subscription' ELSE profile.finance_category END AS finance_category,
  transaction.market_code,transaction.currency,
  date_trunc('month',transaction.occurred_at) AS revenue_month,
  SUM(CASE WHEN ledger.side = 'credit' THEN ledger.amount_minor ELSE -ledger.amount_minor END)::BIGINT AS net_revenue_minor
FROM public.finance_transactions transaction
JOIN public.finance_ledger_entries ledger ON ledger.transaction_id = transaction.id
LEFT JOIN public.monetization_orders purchase_order ON purchase_order.id = transaction.order_reference
LEFT JOIN public.monetization_quote_items quote_item ON quote_item.quote_id = purchase_order.quote_id
LEFT JOIN public.monetization_product_commercial_profiles profile
  ON profile.product_version_id = quote_item.product_version_id
WHERE ledger.account_code IN ('7061','7062','7063','7064','7065','7091')
GROUP BY 1,2,3,4,5,6;

CREATE OR REPLACE VIEW public.commission_analytics_daily
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', calculation.calculated_at)::DATE AS date,
  calculation.snapshot->'inputSnapshot'->>'marketCode' AS market_code,
  CASE
    WHEN calculation.snapshot->'inputSnapshot'->>'verticalId' = 'cours' THEN 'education'
    ELSE calculation.snapshot->'inputSnapshot'->>'verticalId'
  END AS vertical_id,
  calculation.snapshot->'inputSnapshot'->>'categoryId' AS category_id,
  calculation.snapshot->'inputSnapshot'->>'planId' AS plan_id,
  calculation.currency,
  COUNT(*)::BIGINT AS transaction_count,
  COALESCE(SUM((calculation.snapshot->'inputSnapshot'->>'itemSubtotalMinor')::BIGINT),0)::BIGINT AS gmv_minor,
  COALESCE(SUM(calculation.gross_commission_minor),0)::BIGINT AS gross_commission_minor,
  COALESCE(SUM(calculation.adjustment_minor),0)::BIGINT AS commission_discount_minor,
  COALESCE(SUM(calculation.platform_revenue_minor),0)::BIGINT AS commission_revenue_minor,
  COALESCE(SUM(reversal.platform_revenue_reversal_minor),0)::BIGINT AS commission_refund_minor,
  CASE
    WHEN SUM((calculation.snapshot->'inputSnapshot'->>'itemSubtotalMinor')::BIGINT) = 0 THEN 0
    ELSE ROUND(
      10000.0 *
      (SUM(calculation.platform_revenue_minor) - COALESCE(SUM(reversal.platform_revenue_reversal_minor),0)) /
      SUM((calculation.snapshot->'inputSnapshot'->>'itemSubtotalMinor')::BIGINT)
    )::INTEGER
  END AS effective_take_rate_bps
FROM public.commission_calculations calculation
LEFT JOIN (
  SELECT calculation_id,
    SUM(platform_revenue_reversal_minor)::BIGINT AS platform_revenue_reversal_minor
  FROM public.commission_reversals
  WHERE state <> 'manual_review'
  GROUP BY calculation_id
) reversal ON reversal.calculation_id = calculation.id
WHERE calculation.eligible AND calculation.state <> 'cancelled'
GROUP BY 1,2,3,4,5,6;

REVOKE ALL ON public.monetization_vertical_subscription_metrics FROM anon,authenticated;
REVOKE ALL ON public.finance_vertical_revenue_attribution FROM anon,authenticated;
REVOKE ALL ON public.commission_analytics_daily FROM anon,authenticated;

COMMIT;
