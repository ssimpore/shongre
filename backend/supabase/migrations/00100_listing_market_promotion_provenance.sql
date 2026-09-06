-- Public discovery needs proof that an effective market promotion came from an
-- immutable commercial record. Store only a one-way proof derived from the
-- random promotion row id; order, entitlement and administrator references
-- remain private on listing_promotions.

ALTER TABLE public.listing_market_publications
  ADD COLUMN IF NOT EXISTS promotion_source VARCHAR(40),
  ADD COLUMN IF NOT EXISTS promotion_source_id TEXT;

-- Migration 00097 installed the earlier shape without provenance. Drop it
-- while every row is recomputed atomically by the replacement refresh function.
ALTER TABLE public.listing_market_publications
  DROP CONSTRAINT IF EXISTS listing_market_effective_promotion_shape_check;

CREATE OR REPLACE FUNCTION public.refresh_listing_market_effective_promotion(
  p_listing_id UUID,
  p_market_code VARCHAR
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  normalized_market_code VARCHAR(2) := UPPER(BTRIM(p_market_code));
  effective public.listing_promotions%ROWTYPE;
  effective_proof_id TEXT;
  effective_end_at TIMESTAMPTZ;
  primary_publication BOOLEAN := FALSE;
BEGIN
  IF normalized_market_code !~ '^[A-Z]{2}$' THEN
    RETURN;
  END IF;

  -- The one-argument wrapper owns the listing-wide mirror lock before this
  -- function is reached. Lock the exact publication next so publication
  -- mutations either finish their non-blocking mirror-lock attempt or roll
  -- back before the projection is read and rewritten.
  SELECT publication.is_primary INTO primary_publication
  FROM public.listing_market_publications publication
  WHERE publication.listing_id = p_listing_id
    AND publication.market_code = normalized_market_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- A concurrent promotion mutation already owns its promotion row before its
  -- AFTER trigger waits for the mirror lock. Skip that uncommitted row here;
  -- its trigger performs a complete refresh before that mutation can commit.
  WITH expirable AS (
    SELECT promotion.id
    FROM public.listing_promotions promotion
    WHERE promotion.listing_id = p_listing_id
      AND promotion.market_code = normalized_market_code
      AND promotion.status = 'active'
      AND promotion.ends_at <= NOW()
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.listing_promotions promotion
  SET status = 'expired', updated_at = NOW()
  FROM expirable
  WHERE promotion.id = expirable.id;

  SELECT promotion.* INTO effective
  FROM public.listing_promotions promotion
  JOIN public.listing_market_publications publication
    ON publication.listing_id = promotion.listing_id
   AND publication.market_code = promotion.market_code
  JOIN public.listings promoted_listing
    ON promoted_listing.id = promotion.listing_id
  WHERE promotion.listing_id = p_listing_id
    AND promotion.market_code = normalized_market_code
    AND promotion.status = 'active'
    AND promotion.starts_at <= NOW()
    AND promotion.ends_at > NOW()
    AND NULLIF(BTRIM(promotion.label), '') IS NOT NULL
    AND publication.status = 'active'
    AND publication.compliance_state = 'approved'
    AND promoted_listing.status = 'published'
    AND (
      (
        promotion.source_type = 'purchase'
        AND promotion.product_id IS NOT NULL
        AND promotion.source_order_id IS NOT NULL
        AND promotion.source_entitlement_id IS NULL
        AND NULLIF(BTRIM(promotion.admin_grant_reference), '') IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.monetization_orders purchase
          JOIN public.monetization_quotes quote ON quote.id = purchase.quote_id
          WHERE purchase.id = promotion.source_order_id
            AND purchase.status = 'paid'
            AND LOWER(NULLIF(quote.quote_snapshot->>'listingId', '')) =
              promotion.listing_id::TEXT
            AND EXISTS (
              SELECT 1
              FROM public.monetization_quote_items item
              WHERE item.quote_id = purchase.quote_id
                AND item.product_id = promotion.product_id
                AND promotion.placement_type = CASE item.product_id
                  WHEN 'premium.urgent' THEN 'urgent_badge'
                  WHEN 'premium.search_bump' THEN 'search_bump'
                  WHEN 'premium.highlight' THEN 'featured'
                  WHEN 'premium.spotlight' THEN 'featured'
                  ELSE NULL
                END
            )
            AND COALESCE(purchase.market_code, quote.market_code) =
              promotion.market_code
            AND (
              purchase.market_code IS NULL
              OR quote.market_code IS NULL
              OR purchase.market_code = quote.market_code
            )
        )
      )
      OR (
        promotion.source_type = 'subscription_credit'
        AND promotion.source_order_id IS NULL
        AND promotion.source_entitlement_id IS NOT NULL
        AND NULLIF(BTRIM(promotion.admin_grant_reference), '') IS NULL
        AND EXISTS (
          SELECT 1
          FROM public.monetization_entitlements entitlement
          LEFT JOIN public.monetization_orders source_order
            ON source_order.id = entitlement.source_order_id
          LEFT JOIN public.monetization_quotes source_quote
            ON source_quote.id = source_order.quote_id
          LEFT JOIN public.commercial_configuration_versions configuration
            ON configuration.id = entitlement.configuration_version_id
          JOIN public.listings listing ON listing.id = promotion.listing_id
          WHERE entitlement.id = promotion.source_entitlement_id
            AND promotion.product_id IS NOT NULL
            AND entitlement.product_id = promotion.product_id
            AND entitlement.status = 'active'
            AND (
              entitlement.source_order_id IS NULL
              OR source_order.status = 'paid'
            )
            AND entitlement.starts_at <= NOW()
            AND (entitlement.ends_at IS NULL OR entitlement.ends_at > NOW())
            AND COALESCE(
              source_order.market_code,
              source_quote.market_code,
              configuration.market_code
            ) = promotion.market_code
            AND (
              source_order.market_code IS NULL
              OR source_quote.market_code IS NULL
              OR source_order.market_code = source_quote.market_code
            )
            AND (
              source_order.market_code IS NULL
              OR configuration.market_code IS NULL
              OR source_order.market_code = configuration.market_code
            )
            AND (
              source_quote.market_code IS NULL
              OR configuration.market_code IS NULL
              OR source_quote.market_code = configuration.market_code
            )
            AND (
              (
                entitlement.organization_id IS NOT NULL
                AND entitlement.organization_id = listing.publisher_organization_id
              )
              OR
              (
                entitlement.organization_id IS NULL
                AND entitlement.account_id IN (
                  listing.seller_id,
                  listing.publisher_user_id
                )
              )
            )
        )
      )
      OR (
        promotion.source_type = 'admin_grant'
        AND promotion.source_order_id IS NULL
        AND promotion.source_entitlement_id IS NULL
        AND NULLIF(BTRIM(promotion.admin_grant_reference), '') IS NOT NULL
      )
    )
  ORDER BY
    CASE promotion.placement_type
      WHEN 'sponsored_search' THEN 1
      WHEN 'top_placement' THEN 2
      WHEN 'featured' THEN 3
      WHEN 'search_bump' THEN 4
      ELSE 5
    END,
    promotion.starts_at DESC,
    promotion.id
  LIMIT 1;

  effective_end_at := effective.ends_at;
  IF effective.source_type = 'subscription_credit' THEN
    SELECT LEAST(
      effective.ends_at,
      COALESCE(entitlement.ends_at, effective.ends_at)
    )
      INTO effective_end_at
    FROM public.monetization_entitlements entitlement
    WHERE entitlement.id = effective.source_entitlement_id;
  END IF;

  IF effective.id IS NOT NULL THEN
    effective_proof_id := 'promotion_' || pg_catalog.encode(
      public.digest(
        p_listing_id::TEXT || ':' || normalized_market_code || ':' ||
          effective.source_type || ':' || effective.id::TEXT,
        'sha256'
      ),
      'hex'
    );

    UPDATE public.listing_market_publications SET
      promotion_state = 'active',
      promotion_type = effective.placement_type,
      promotion_source = effective.source_type,
      promotion_source_id = effective_proof_id,
      promotion_label = effective.label,
      promotion_start_at = effective.starts_at,
      promotion_end_at = effective_end_at,
      promoted_at = effective.starts_at
    WHERE listing_id = p_listing_id
      AND market_code = normalized_market_code;

    IF primary_publication THEN
      UPDATE public.listings SET
        promotion_state = 'active',
        promotion_type = effective.placement_type,
        promotion_source = effective.source_type,
        promotion_source_id = effective_proof_id,
        promotion_label = effective.label,
        promotion_start_at = effective.starts_at,
        promotion_end_at = effective_end_at,
        promoted_at = effective.starts_at
      WHERE id = p_listing_id;
    END IF;
  ELSE
    UPDATE public.listing_market_publications SET
      promotion_state = 'inactive',
      promotion_type = NULL,
      promotion_source = NULL,
      promotion_source_id = NULL,
      promotion_label = NULL,
      promotion_start_at = NULL,
      promotion_end_at = NULL,
      promoted_at = NULL
    WHERE listing_id = p_listing_id
      AND market_code = normalized_market_code;

    IF primary_publication THEN
      UPDATE public.listings SET
        promotion_state = 'inactive',
        promotion_type = NULL,
        promotion_source = NULL,
        promotion_source_id = NULL,
        promotion_label = NULL,
        promotion_start_at = NULL,
        promotion_end_at = NULL,
        promoted_at = NULL
      WHERE id = p_listing_id;
    END IF;
  END IF;
END;
$$;

-- The compatibility wrapper is also the authoritative mirror resync. Clear
-- the legacy primary-market projection first, then let the current primary
-- publication repopulate it. This removes stale evidence when a primary
-- publication changes or no valid promotion remains.
CREATE OR REPLACE FUNCTION public.refresh_listing_effective_promotion(
  p_listing_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  publication_market_code VARCHAR(2);
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('listing-promotion-mirror:' || p_listing_id::TEXT)
  );

  UPDATE public.listings SET
    promotion_state = 'inactive',
    promotion_type = NULL,
    promotion_source = NULL,
    promotion_source_id = NULL,
    promotion_label = NULL,
    promotion_start_at = NULL,
    promotion_end_at = NULL,
    promoted_at = NULL
  WHERE id = p_listing_id;

  FOR publication_market_code IN
    SELECT publication.market_code
    FROM public.listing_market_publications publication
    WHERE publication.listing_id = p_listing_id
    ORDER BY publication.is_primary DESC, publication.market_code
  LOOP
    PERFORM public.refresh_listing_market_effective_promotion(
      p_listing_id,
      publication_market_code
    );
  END LOOP;
END;
$$;

-- Publication and listing triggers already hold the row being changed. They
-- must never wait for a refresh that may need that same row. Fail the complete
-- outer mutation with a retryable serialization error when another refresh
-- owns the listing mirror lock; committing a stale projection is not allowed.
CREATE OR REPLACE FUNCTION public.try_refresh_listing_effective_promotion(
  p_listing_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF NOT pg_catalog.pg_try_advisory_xact_lock(
    pg_catalog.hashtext('listing-promotion-mirror:' || p_listing_id::TEXT)
  ) THEN
    RAISE EXCEPTION 'listing promotion projection changed concurrently'
      USING ERRCODE = '40001';
  END IF;

  PERFORM public.refresh_listing_effective_promotion(p_listing_id);
END;
$$;

-- Promotion mutations may wait for the mirror lock because refresh skips any
-- promotion tuple held by a competing mutation. Always refresh the complete
-- listing projection so the primary-market mirror and every market stay in
-- sync. When a row moves between listings, acquire locks in UUID order.
CREATE OR REPLACE FUNCTION public.refresh_listing_promotion_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_listing_id UUID;
BEGIN
  IF pg_catalog.pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_listing_effective_promotion(OLD.listing_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.refresh_listing_effective_promotion(NEW.listing_id);
    RETURN NEW;
  END IF;

  FOR target_listing_id IN
    SELECT candidate.listing_id
    FROM (VALUES (OLD.listing_id), (NEW.listing_id)) AS candidate(listing_id)
    GROUP BY candidate.listing_id
    ORDER BY candidate.listing_id
  LOOP
    PERFORM public.refresh_listing_effective_promotion(target_listing_id);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_listing_promotion_after_publication_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_listing_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.try_refresh_listing_effective_promotion(OLD.listing_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.try_refresh_listing_effective_promotion(NEW.listing_id);
    RETURN NEW;
  END IF;

  FOR target_listing_id IN
    SELECT candidate.listing_id
    FROM (VALUES (OLD.listing_id), (NEW.listing_id)) AS candidate(listing_id)
    GROUP BY candidate.listing_id
    ORDER BY candidate.listing_id
  LOOP
    PERFORM public.try_refresh_listing_effective_promotion(target_listing_id);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_listing_promotion_after_publication_change_trigger
  ON public.listing_market_publications;
CREATE TRIGGER refresh_listing_promotion_after_publication_change_trigger
AFTER INSERT OR DELETE OR UPDATE OF
  listing_id, market_code, status, compliance_state, is_primary
ON public.listing_market_publications
FOR EACH ROW
EXECUTE FUNCTION public.refresh_listing_promotion_after_publication_change();

CREATE INDEX IF NOT EXISTS listing_promotions_entitlement_refresh_idx
  ON public.listing_promotions
    (source_entitlement_id, market_code, listing_id)
  WHERE source_entitlement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS listing_promotions_source_order_refresh_idx
  ON public.listing_promotions (source_order_id, listing_id)
  WHERE source_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS monetization_entitlements_configuration_refresh_idx
  ON public.monetization_entitlements (configuration_version_id, id)
  WHERE configuration_version_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.refresh_promotions_after_entitlement_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_listing_id UUID;
BEGIN
  FOR target_listing_id IN
    SELECT DISTINCT promotion.listing_id
    FROM public.listing_promotions promotion
    WHERE promotion.source_entitlement_id IN (OLD.id, NEW.id)
    ORDER BY promotion.listing_id
  LOOP
    PERFORM public.refresh_listing_effective_promotion(target_listing_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_promotions_after_entitlement_change_trigger
  ON public.monetization_entitlements;
CREATE TRIGGER refresh_promotions_after_entitlement_change_trigger
AFTER UPDATE OF
  status, starts_at, ends_at, product_id, account_id, organization_id,
  source_order_id, configuration_version_id
ON public.monetization_entitlements
FOR EACH ROW
EXECUTE FUNCTION public.refresh_promotions_after_entitlement_change();

-- Evidence records remain private but their operational fields can change
-- during reconciliation. Refresh every listing that depends on one of those
-- fields so the stored public projection uses the same fail-closed predicate
-- as a fresh read.
CREATE OR REPLACE FUNCTION public.refresh_promotions_after_order_evidence_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_listing_id UUID;
BEGIN
  FOR target_listing_id IN
    SELECT DISTINCT promotion.listing_id
    FROM public.listing_promotions promotion
    WHERE promotion.source_order_id IN (OLD.id, NEW.id)
    UNION
    SELECT DISTINCT promotion.listing_id
    FROM public.listing_promotions promotion
    JOIN public.monetization_entitlements entitlement
      ON entitlement.id = promotion.source_entitlement_id
    WHERE entitlement.source_order_id IN (OLD.id, NEW.id)
    ORDER BY listing_id
  LOOP
    PERFORM public.refresh_listing_effective_promotion(target_listing_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_promotions_after_order_evidence_change_trigger
  ON public.monetization_orders;
CREATE TRIGGER refresh_promotions_after_order_evidence_change_trigger
AFTER UPDATE OF status, market_code, quote_id
ON public.monetization_orders
FOR EACH ROW
WHEN (
  OLD.status IS DISTINCT FROM NEW.status
  OR OLD.market_code IS DISTINCT FROM NEW.market_code
  OR OLD.quote_id IS DISTINCT FROM NEW.quote_id
)
EXECUTE FUNCTION public.refresh_promotions_after_order_evidence_change();

CREATE OR REPLACE FUNCTION public.refresh_promotions_after_quote_evidence_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_listing_id UUID;
BEGIN
  FOR target_listing_id IN
    SELECT DISTINCT promotion.listing_id
    FROM public.listing_promotions promotion
    JOIN public.monetization_orders source_order
      ON source_order.id = promotion.source_order_id
    WHERE source_order.quote_id IN (OLD.id, NEW.id)
    UNION
    SELECT DISTINCT promotion.listing_id
    FROM public.listing_promotions promotion
    JOIN public.monetization_entitlements entitlement
      ON entitlement.id = promotion.source_entitlement_id
    JOIN public.monetization_orders source_order
      ON source_order.id = entitlement.source_order_id
    WHERE source_order.quote_id IN (OLD.id, NEW.id)
    ORDER BY listing_id
  LOOP
    PERFORM public.refresh_listing_effective_promotion(target_listing_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_promotions_after_quote_evidence_change_trigger
  ON public.monetization_quotes;
CREATE TRIGGER refresh_promotions_after_quote_evidence_change_trigger
AFTER UPDATE OF market_code, quote_snapshot
ON public.monetization_quotes
FOR EACH ROW
WHEN (
  OLD.market_code IS DISTINCT FROM NEW.market_code
  OR OLD.quote_snapshot IS DISTINCT FROM NEW.quote_snapshot
)
EXECUTE FUNCTION public.refresh_promotions_after_quote_evidence_change();

CREATE OR REPLACE FUNCTION public.refresh_promotions_after_configuration_market_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  target_listing_id UUID;
BEGIN
  FOR target_listing_id IN
    SELECT DISTINCT promotion.listing_id
    FROM public.listing_promotions promotion
    JOIN public.monetization_entitlements entitlement
      ON entitlement.id = promotion.source_entitlement_id
    WHERE entitlement.configuration_version_id IN (OLD.id, NEW.id)
    ORDER BY promotion.listing_id
  LOOP
    PERFORM public.refresh_listing_effective_promotion(target_listing_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_promotions_after_configuration_market_change_trigger
  ON public.commercial_configuration_versions;
CREATE TRIGGER refresh_promotions_after_configuration_market_change_trigger
AFTER UPDATE OF market_code
ON public.commercial_configuration_versions
FOR EACH ROW
WHEN (OLD.market_code IS DISTINCT FROM NEW.market_code)
EXECUTE FUNCTION public.refresh_promotions_after_configuration_market_change();

CREATE OR REPLACE FUNCTION public.refresh_promotions_after_listing_principal_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  PERFORM public.try_refresh_listing_effective_promotion(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_promotions_after_listing_principal_change_trigger
  ON public.listings;
CREATE TRIGGER refresh_promotions_after_listing_principal_change_trigger
AFTER UPDATE OF
  status, seller_id, publisher_user_id, publisher_organization_id
ON public.listings
FOR EACH ROW
WHEN (
  OLD.status IS DISTINCT FROM NEW.status
  OR OLD.seller_id IS DISTINCT FROM NEW.seller_id
  OR OLD.publisher_user_id IS DISTINCT FROM NEW.publisher_user_id
  OR OLD.publisher_organization_id IS DISTINCT FROM NEW.publisher_organization_id
)
EXECUTE FUNCTION public.refresh_promotions_after_listing_principal_change();

REVOKE ALL ON FUNCTION public.refresh_listing_market_effective_promotion(UUID, VARCHAR)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_listing_effective_promotion(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.try_refresh_listing_effective_promotion(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_listing_promotion_after_change()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_listing_promotion_after_publication_change()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_promotions_after_entitlement_change()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_promotions_after_order_evidence_change()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_promotions_after_quote_evidence_change()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_promotions_after_configuration_market_change()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.refresh_promotions_after_listing_principal_change()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refresh_listing_effective_promotion(UUID)
  TO service_role;

-- Recompute type, schedule and proof together. This deliberately does not copy
-- the source id from 00097, so a promotion that expired or lost valid evidence
-- between migrations is cleared instead of making constraint validation fail.
DO $$
DECLARE
  target_listing_id UUID;
BEGIN
  FOR target_listing_id IN
    SELECT DISTINCT publication.listing_id
    FROM public.listing_market_publications publication
    WHERE publication.promotion_state <> 'inactive'
       OR publication.promotion_type IS NOT NULL
       OR publication.promotion_source IS NOT NULL
       OR publication.promotion_source_id IS NOT NULL
       OR publication.promotion_label IS NOT NULL
       OR publication.promotion_start_at IS NOT NULL
       OR publication.promotion_end_at IS NOT NULL
       OR publication.promoted_at IS NOT NULL
    UNION
    SELECT DISTINCT promotion.listing_id
    FROM public.listing_promotions promotion
    UNION
    SELECT listing.id
    FROM public.listings listing
    WHERE listing.promotion_state <> 'inactive'
       OR listing.promotion_type IS NOT NULL
       OR listing.promotion_source IS NOT NULL
       OR listing.promotion_source_id IS NOT NULL
       OR listing.promotion_label IS NOT NULL
       OR listing.promotion_start_at IS NOT NULL
       OR listing.promotion_end_at IS NOT NULL
       OR listing.promoted_at IS NOT NULL
    ORDER BY listing_id
  LOOP
    PERFORM public.refresh_listing_effective_promotion(target_listing_id);
  END LOOP;
END;
$$;

ALTER TABLE public.listing_market_publications
  ADD CONSTRAINT listing_market_effective_promotion_shape_check
  CHECK (
    (
      promotion_state = 'inactive'
      AND promotion_type IS NULL
      AND promotion_source IS NULL
      AND promotion_source_id IS NULL
      AND promotion_label IS NULL
      AND promotion_start_at IS NULL
      AND promotion_end_at IS NULL
      AND promoted_at IS NULL
    )
    OR
    (
      promotion_state = 'active'
      AND promotion_type IS NOT NULL
      AND promotion_source IS NOT NULL
      AND promotion_source IN ('purchase', 'subscription_credit', 'admin_grant')
      AND NULLIF(BTRIM(promotion_source_id), '') IS NOT NULL
      AND promotion_source_id ~ '^promotion_[a-f0-9]{64}$'
      AND NULLIF(BTRIM(promotion_label), '') IS NOT NULL
      AND promotion_start_at IS NOT NULL
      AND promotion_end_at IS NOT NULL
      AND promotion_end_at > promotion_start_at
      AND promoted_at IS NOT NULL
    )
  ) NOT VALID;
ALTER TABLE public.listing_market_publications
  VALIDATE CONSTRAINT listing_market_effective_promotion_shape_check;

COMMENT ON COLUMN public.listing_market_publications.promotion_source IS
  'Type of verified evidence selected for the effective market promotion.';
COMMENT ON COLUMN public.listing_market_publications.promotion_source_id IS
  'Opaque one-way proof for the effective promotion; never an order, entitlement, or administrator reference.';

-- Vertical searches paginate before hydration, so their promoted ordering must
-- be computed from the same current, proven market projection as the card.
-- These backend-only security-invoker views replace legacy boolean ordering.
CREATE OR REPLACE VIEW public.real_estate_properties_public_search
WITH (security_invoker = true)
AS
SELECT
  property.*,
  CASE
    WHEN publication.promotion_state = 'active'
      AND publication.promotion_source IN (
        'purchase', 'subscription_credit', 'admin_grant'
      )
      AND publication.promotion_source_id ~ '^promotion_[a-f0-9]{64}$'
      AND NULLIF(BTRIM(publication.promotion_label), '') IS NOT NULL
      AND publication.promotion_start_at <= NOW()
      AND publication.promotion_end_at > NOW()
      AND publication.status = 'active'
      AND publication.compliance_state = 'approved'
    THEN CASE publication.promotion_type
      WHEN 'sponsored_search' THEN 5
      WHEN 'top_placement' THEN 4
      WHEN 'homepage_spotlight' THEN 3
      WHEN 'category_spotlight' THEN 3
      WHEN 'local_spotlight' THEN 3
      WHEN 'seller_spotlight' THEN 3
      WHEN 'featured' THEN 3
      WHEN 'search_bump' THEN 2
      WHEN 'urgent_badge' THEN 1
      ELSE 0
    END
    ELSE 0
  END AS effective_promotion_rank
FROM public.real_estate_properties property
LEFT JOIN public.listing_market_publications publication
  ON publication.listing_id = property.listing_id
 AND publication.market_code = property.market_code;

CREATE OR REPLACE VIEW public.employment_jobs_public_search
WITH (security_invoker = true)
AS
SELECT
  job.*,
  CASE
    WHEN publication.promotion_state = 'active'
      AND publication.promotion_source IN (
        'purchase', 'subscription_credit', 'admin_grant'
      )
      AND publication.promotion_source_id ~ '^promotion_[a-f0-9]{64}$'
      AND NULLIF(BTRIM(publication.promotion_label), '') IS NOT NULL
      AND publication.promotion_start_at <= NOW()
      AND publication.promotion_end_at > NOW()
      AND publication.status = 'active'
      AND publication.compliance_state = 'approved'
    THEN CASE publication.promotion_type
      WHEN 'sponsored_search' THEN 5
      WHEN 'top_placement' THEN 4
      WHEN 'homepage_spotlight' THEN 3
      WHEN 'category_spotlight' THEN 3
      WHEN 'local_spotlight' THEN 3
      WHEN 'seller_spotlight' THEN 3
      WHEN 'featured' THEN 3
      WHEN 'search_bump' THEN 2
      WHEN 'urgent_badge' THEN 1
      ELSE 0
    END
    ELSE 0
  END AS effective_promotion_rank
FROM public.employment_jobs job
LEFT JOIN public.listing_market_publications publication
  ON publication.listing_id = job.generic_listing_id
 AND publication.market_code = job.market_code;

REVOKE ALL ON TABLE public.real_estate_properties_public_search
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.employment_jobs_public_search
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.real_estate_properties_public_search
  TO service_role;
GRANT SELECT ON TABLE public.employment_jobs_public_search
  TO service_role;
