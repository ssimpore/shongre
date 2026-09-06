-- Listing promotion evidence and its effective discovery projection are scoped
-- to one explicit market publication. Ambiguous legacy evidence is preserved
-- but cannot remain effective.

-- Migration 00018 refreshes the parent listing from an AFTER status trigger.
-- Disable that legacy trigger before any corrective status UPDATE below; the
-- market-aware replacement is recreated after the new projection functions.
DROP TRIGGER IF EXISTS refresh_listing_promotion_after_change_trigger
  ON public.listing_promotions;

ALTER TABLE public.listing_promotions
  ADD COLUMN IF NOT EXISTS market_code VARCHAR(2)
  REFERENCES public.markets(code) ON DELETE RESTRICT;

ALTER TABLE public.listing_market_publications
  ADD COLUMN IF NOT EXISTS promotion_state VARCHAR(20) NOT NULL DEFAULT 'inactive'
    CHECK (promotion_state IN ('inactive', 'active')),
  ADD COLUMN IF NOT EXISTS promotion_type VARCHAR(40),
  ADD COLUMN IF NOT EXISTS promotion_label VARCHAR(100),
  ADD COLUMN IF NOT EXISTS promotion_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promotion_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;

-- Paid evidence carries its immutable market through the order/quote. Only an
-- exact listing publication receives the backfill; mismatches remain unknown.
UPDATE public.listing_promotions promotion
SET market_code = source.market_code
FROM (
  SELECT
    candidate.id,
    COALESCE(order_row.market_code, quote.market_code) AS market_code
  FROM public.listing_promotions candidate
  JOIN public.monetization_orders order_row
    ON order_row.id = candidate.source_order_id
  JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
  JOIN public.listing_market_publications publication
    ON publication.listing_id = candidate.listing_id
   AND publication.market_code = COALESCE(order_row.market_code, quote.market_code)
  WHERE candidate.market_code IS NULL
    AND candidate.source_type = 'purchase'
    AND candidate.product_id IS NOT NULL
    AND order_row.status = 'paid'
    AND LOWER(NULLIF(quote.quote_snapshot->>'listingId', '')) =
      candidate.listing_id::TEXT
    AND EXISTS (
      SELECT 1
      FROM public.monetization_quote_items item
      WHERE item.quote_id = order_row.quote_id
        AND item.product_id = candidate.product_id
        AND candidate.placement_type = CASE item.product_id
          WHEN 'premium.urgent' THEN 'urgent_badge'
          WHEN 'premium.search_bump' THEN 'search_bump'
          WHEN 'premium.highlight' THEN 'featured'
          WHEN 'premium.spotlight' THEN 'featured'
          ELSE NULL
        END
    )
    AND COALESCE(order_row.market_code, quote.market_code) IS NOT NULL
    AND (
      order_row.market_code IS NULL
      OR quote.market_code IS NULL
      OR order_row.market_code = quote.market_code
    )
) source
WHERE promotion.id = source.id;

-- Subscription credits resolve through the order or immutable commercial
-- configuration that produced the entitlement. Missing evidence is not
-- reconstructed from an account or currency.
UPDATE public.listing_promotions promotion
SET market_code = source.market_code
FROM (
  SELECT
    candidate.id,
    COALESCE(order_row.market_code, quote.market_code, configuration.market_code)
      AS market_code
  FROM public.listing_promotions candidate
  JOIN public.monetization_entitlements entitlement
    ON entitlement.id = candidate.source_entitlement_id
  LEFT JOIN public.monetization_orders order_row
    ON order_row.id = entitlement.source_order_id
  LEFT JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
  LEFT JOIN public.commercial_configuration_versions configuration
    ON configuration.id = entitlement.configuration_version_id
  JOIN public.listing_market_publications publication
    ON publication.listing_id = candidate.listing_id
   AND publication.market_code = COALESCE(
        order_row.market_code,
        quote.market_code,
        configuration.market_code
      )
  WHERE candidate.market_code IS NULL
    AND candidate.source_type = 'subscription_credit'
    AND candidate.product_id IS NOT NULL
    AND entitlement.product_id = candidate.product_id
    AND entitlement.status = 'active'
    AND (
      entitlement.source_order_id IS NULL
      OR order_row.status = 'paid'
    )
    AND entitlement.starts_at <= NOW()
    AND (entitlement.ends_at IS NULL OR entitlement.ends_at > NOW())
    AND EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id = candidate.listing_id
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
    AND COALESCE(
      order_row.market_code,
      quote.market_code,
      configuration.market_code
    ) IS NOT NULL
    AND (
      order_row.market_code IS NULL
      OR quote.market_code IS NULL
      OR order_row.market_code = quote.market_code
    )
    AND (
      order_row.market_code IS NULL
      OR configuration.market_code IS NULL
      OR order_row.market_code = configuration.market_code
    )
    AND (
      quote.market_code IS NULL
      OR configuration.market_code IS NULL
      OR quote.market_code = configuration.market_code
    )
) source
WHERE promotion.id = source.id;

-- Migration 00018 recorded the listing's then-authoritative market explicitly
-- on the legacy listing. Preserve that narrow meaning even if another market
-- publication was added later.
UPDATE public.listing_promotions promotion
SET market_code = listing.market_code
FROM public.listings listing
JOIN public.listing_market_publications publication
  ON publication.listing_id = listing.id
 AND publication.market_code = listing.market_code
WHERE promotion.listing_id = listing.id
  AND promotion.market_code IS NULL
  AND promotion.source_type = 'admin_grant'
  AND promotion.admin_grant_reference =
    'migration-00018:' || listing.id::TEXT || ':' || promotion.placement_type;

-- Other administrator grants can be recovered only when the listing has one
-- unambiguous publication. Multi-market grants require reviewed reassignment.
WITH sole_publication AS (
  SELECT
    publication.listing_id,
    MIN(publication.market_code) AS market_code
  FROM public.listing_market_publications publication
  GROUP BY publication.listing_id
  HAVING COUNT(*) = 1
)
UPDATE public.listing_promotions promotion
SET market_code = sole.market_code
FROM sole_publication sole
WHERE promotion.listing_id = sole.listing_id
  AND promotion.market_code IS NULL
  AND promotion.source_type = 'admin_grant';

-- Retain ambiguous rows as operational evidence, but fail closed so they are
-- never shown in any market until an operator reviews their scope.
UPDATE public.listing_promotions
SET status = 'failed', updated_at = NOW()
WHERE market_code IS NULL AND status IN ('scheduled', 'active');

-- Existing effective rows must pass the same immutable-source checks as new
-- writes. Invalid history remains on listing_promotions for operator review but
-- cannot feed a public placement projection.
UPDATE public.listing_promotions promotion
SET status = 'failed', updated_at = NOW()
WHERE promotion.status IN ('scheduled', 'active')
  AND (
    (
      CASE promotion.source_type
        WHEN 'purchase' THEN
          promotion.source_order_id IS NOT NULL
          AND promotion.product_id IS NOT NULL
          AND promotion.source_entitlement_id IS NULL
          AND NULLIF(BTRIM(promotion.admin_grant_reference), '') IS NULL
        WHEN 'subscription_credit' THEN
          promotion.source_order_id IS NULL
          AND promotion.product_id IS NOT NULL
          AND promotion.source_entitlement_id IS NOT NULL
          AND NULLIF(BTRIM(promotion.admin_grant_reference), '') IS NULL
        WHEN 'admin_grant' THEN
          promotion.source_order_id IS NULL
          AND promotion.source_entitlement_id IS NULL
          AND NULLIF(BTRIM(promotion.admin_grant_reference), '') IS NOT NULL
        ELSE FALSE
      END
    ) IS DISTINCT FROM TRUE
    OR NULLIF(BTRIM(promotion.label), '') IS NULL
    OR (
      promotion.source_type = 'purchase'
      AND NOT EXISTS (
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
      AND NOT EXISTS (
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
  );

ALTER TABLE public.listing_promotions
  DROP CONSTRAINT IF EXISTS listing_promotions_effective_source_shape;
ALTER TABLE public.listing_promotions
  ADD CONSTRAINT listing_promotions_effective_source_shape
  CHECK (
    status NOT IN ('scheduled', 'active')
    OR (
      CASE source_type
        WHEN 'purchase' THEN
          source_order_id IS NOT NULL
          AND product_id IS NOT NULL
          AND source_entitlement_id IS NULL
          AND NULLIF(BTRIM(admin_grant_reference), '') IS NULL
        WHEN 'subscription_credit' THEN
          source_order_id IS NULL
          AND product_id IS NOT NULL
          AND source_entitlement_id IS NOT NULL
          AND NULLIF(BTRIM(admin_grant_reference), '') IS NULL
        WHEN 'admin_grant' THEN
          source_order_id IS NULL
          AND source_entitlement_id IS NULL
          AND NULLIF(BTRIM(admin_grant_reference), '') IS NOT NULL
        ELSE FALSE
      END
      AND NULLIF(BTRIM(label), '') IS NOT NULL
    ) IS TRUE
  ) NOT VALID;
ALTER TABLE public.listing_promotions
  VALIDATE CONSTRAINT listing_promotions_effective_source_shape;

ALTER TABLE public.listing_promotions
  DROP CONSTRAINT IF EXISTS listing_promotions_market_publication_fk;
ALTER TABLE public.listing_promotions
  ADD CONSTRAINT listing_promotions_market_publication_fk
  FOREIGN KEY (listing_id, market_code)
  REFERENCES public.listing_market_publications(listing_id, market_code)
  ON DELETE RESTRICT NOT VALID;
ALTER TABLE public.listing_promotions
  VALIDATE CONSTRAINT listing_promotions_market_publication_fk;

ALTER TABLE public.listing_promotions
  DROP CONSTRAINT IF EXISTS listing_promotions_effective_market_required;
ALTER TABLE public.listing_promotions
  ADD CONSTRAINT listing_promotions_effective_market_required
  CHECK (
    market_code IS NOT NULL OR status NOT IN ('scheduled', 'active')
  ) NOT VALID;
ALTER TABLE public.listing_promotions
  VALIDATE CONSTRAINT listing_promotions_effective_market_required;

ALTER TABLE public.listing_market_publications
  DROP CONSTRAINT IF EXISTS listing_market_effective_promotion_dates_check;
ALTER TABLE public.listing_market_publications
  ADD CONSTRAINT listing_market_effective_promotion_dates_check
  CHECK (
    promotion_end_at IS NULL
    OR promotion_start_at IS NULL
    OR promotion_end_at > promotion_start_at
  ) NOT VALID;
ALTER TABLE public.listing_market_publications
  VALIDATE CONSTRAINT listing_market_effective_promotion_dates_check;

ALTER TABLE public.listing_market_publications
  DROP CONSTRAINT IF EXISTS listing_market_effective_promotion_shape_check;
ALTER TABLE public.listing_market_publications
  ADD CONSTRAINT listing_market_effective_promotion_shape_check
  CHECK (
    (
      promotion_state = 'inactive'
      AND promotion_type IS NULL
      AND promotion_label IS NULL
      AND promotion_start_at IS NULL
      AND promotion_end_at IS NULL
      AND promoted_at IS NULL
    )
    OR
    (
      promotion_state = 'active'
      AND promotion_type IS NOT NULL
      AND promotion_label IS NOT NULL
      AND promotion_start_at IS NOT NULL
      AND promotion_end_at IS NOT NULL
      AND promoted_at IS NOT NULL
    )
  ) NOT VALID;
ALTER TABLE public.listing_market_publications
  VALIDATE CONSTRAINT listing_market_effective_promotion_shape_check;

CREATE INDEX IF NOT EXISTS listing_promotions_market_active_placement_idx
  ON public.listing_promotions
    (listing_id, market_code, status, starts_at, ends_at, placement_type)
  WHERE market_code IS NOT NULL AND status IN ('scheduled', 'active');

COMMENT ON COLUMN public.listing_promotions.market_code IS
  'Exact market publication purchased or granted this placement. NULL is retained only for inactive unresolved legacy evidence.';
COMMENT ON COLUMN public.listing_market_publications.promotion_state IS
  'Effective promotion state for this exact listing-market publication; refreshed from listing_promotions.';

-- Market publication state, compliance, ranking and paid placement are domain
-- decisions. They are written by the backend service role, never through
-- browser/native PostgREST DML or the former broad publisher policy.
DROP POLICY IF EXISTS "Publishers manage listing market publications"
  ON public.listing_market_publications;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.listing_market_publications
  FROM PUBLIC, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.listing_market_publications
  TO service_role;

CREATE OR REPLACE FUNCTION public.validate_listing_promotion_source()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE
  source_market_code VARCHAR(2);
  source_status VARCHAR(30);
  source_market_conflict BOOLEAN := FALSE;
  source_listing_id TEXT;
  source_product_id VARCHAR(180);
  source_product_matches BOOLEAN := FALSE;
  source_subject_matches BOOLEAN := FALSE;
  source_order_is_paid BOOLEAN := TRUE;
  entitlement_starts_at TIMESTAMPTZ;
  entitlement_ends_at TIMESTAMPTZ;
BEGIN
  IF (
    CASE NEW.source_type
      WHEN 'purchase' THEN
        NEW.source_order_id IS NOT NULL
        AND NEW.product_id IS NOT NULL
        AND NEW.source_entitlement_id IS NULL
        AND NULLIF(BTRIM(NEW.admin_grant_reference), '') IS NULL
      WHEN 'subscription_credit' THEN
        NEW.source_order_id IS NULL
        AND NEW.product_id IS NOT NULL
        AND NEW.source_entitlement_id IS NOT NULL
        AND NULLIF(BTRIM(NEW.admin_grant_reference), '') IS NULL
      WHEN 'admin_grant' THEN
        NEW.source_order_id IS NULL
        AND NEW.source_entitlement_id IS NULL
        AND NULLIF(BTRIM(NEW.admin_grant_reference), '') IS NOT NULL
      ELSE FALSE
    END
  ) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'promotion source shape is invalid';
  END IF;
  IF NEW.status IN ('scheduled', 'active')
     AND NULLIF(BTRIM(NEW.label), '') IS NULL THEN
    RAISE EXCEPTION 'effective promotion label is required';
  END IF;

  IF TG_OP = 'UPDATE' AND ROW(
    OLD.listing_id,
    OLD.product_id,
    OLD.placement_type,
    OLD.source_type,
    OLD.source_order_id,
    OLD.source_entitlement_id,
    OLD.admin_grant_reference
  ) IS DISTINCT FROM ROW(
    NEW.listing_id,
    NEW.product_id,
    NEW.placement_type,
    NEW.source_type,
    NEW.source_order_id,
    NEW.source_entitlement_id,
    NEW.admin_grant_reference
  ) THEN
    RAISE EXCEPTION 'promotion source evidence is immutable';
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.market_code IS NOT NULL
     AND OLD.market_code IS DISTINCT FROM NEW.market_code THEN
    RAISE EXCEPTION 'promotion market is immutable once resolved';
  END IF;

  IF NEW.source_type = 'purchase' THEN
    SELECT
      COALESCE(purchase.market_code, quote.market_code),
      purchase.status,
      NULLIF(quote.quote_snapshot->>'listingId', ''),
      EXISTS (
        SELECT 1
        FROM public.monetization_quote_items item
        WHERE item.quote_id = purchase.quote_id
          AND item.product_id = NEW.product_id
          AND NEW.placement_type = CASE item.product_id
            WHEN 'premium.urgent' THEN 'urgent_badge'
            WHEN 'premium.search_bump' THEN 'search_bump'
            WHEN 'premium.highlight' THEN 'featured'
            WHEN 'premium.spotlight' THEN 'featured'
            ELSE NULL
          END
      ),
      purchase.market_code IS NOT NULL
        AND quote.market_code IS NOT NULL
        AND purchase.market_code <> quote.market_code
      INTO
        source_market_code,
        source_status,
        source_listing_id,
        source_product_matches,
        source_market_conflict
    FROM public.monetization_orders purchase
    JOIN public.monetization_quotes quote ON quote.id = purchase.quote_id
    WHERE purchase.id = NEW.source_order_id;

    IF NEW.status IN ('scheduled', 'active')
       AND (
         source_market_conflict
         OR source_market_code IS NULL
         OR source_status <> 'paid'
         OR LOWER(source_listing_id) IS DISTINCT FROM NEW.listing_id::TEXT
         OR source_product_matches IS NOT TRUE
       ) THEN
      RAISE EXCEPTION 'promotion purchase is not paid or has no market';
    END IF;
  ELSIF NEW.source_type = 'subscription_credit' THEN
    SELECT COALESCE(
        source_order.market_code,
        source_quote.market_code,
        configuration.market_code
      ),
      entitlement.status,
      entitlement.product_id,
      (
        entitlement.source_order_id IS NULL
        OR source_order.status = 'paid'
      ),
      EXISTS (
        SELECT 1
        FROM public.listings listing
        WHERE listing.id = NEW.listing_id
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
      ),
      entitlement.starts_at,
      entitlement.ends_at,
      (
        source_order.market_code IS NOT NULL
        AND source_quote.market_code IS NOT NULL
        AND source_order.market_code <> source_quote.market_code
      ) OR (
        source_order.market_code IS NOT NULL
        AND configuration.market_code IS NOT NULL
        AND source_order.market_code <> configuration.market_code
      ) OR (
        source_quote.market_code IS NOT NULL
        AND configuration.market_code IS NOT NULL
        AND source_quote.market_code <> configuration.market_code
      )
      INTO
        source_market_code,
        source_status,
        source_product_id,
        source_order_is_paid,
        source_subject_matches,
        entitlement_starts_at,
        entitlement_ends_at,
        source_market_conflict
    FROM public.monetization_entitlements entitlement
    LEFT JOIN public.monetization_orders source_order
      ON source_order.id = entitlement.source_order_id
    LEFT JOIN public.monetization_quotes source_quote
      ON source_quote.id = source_order.quote_id
    LEFT JOIN public.commercial_configuration_versions configuration
      ON configuration.id = entitlement.configuration_version_id
    WHERE entitlement.id = NEW.source_entitlement_id;

    IF NEW.status IN ('scheduled', 'active')
       AND (
         source_market_code IS NULL
         OR source_market_conflict
         OR source_status <> 'active'
         OR source_order_is_paid IS NOT TRUE
         OR NEW.product_id IS NULL
         OR source_product_id IS DISTINCT FROM NEW.product_id
         OR source_subject_matches IS NOT TRUE
         OR entitlement_starts_at > NOW()
         OR (entitlement_ends_at IS NOT NULL AND entitlement_ends_at <= NOW())
       ) THEN
      RAISE EXCEPTION 'promotion entitlement is not active or has no market';
    END IF;
  ELSIF NEW.market_code IS NULL
        AND NEW.status IN ('scheduled', 'active') THEN
    SELECT MIN(publication.market_code)
      INTO source_market_code
    FROM public.listing_market_publications publication
    WHERE publication.listing_id = NEW.listing_id
    HAVING COUNT(*) = 1;
  END IF;

  NEW.market_code := UPPER(COALESCE(NEW.market_code, source_market_code));
  IF NEW.market_code IS NULL THEN
    IF NEW.status IN ('scheduled', 'active') THEN
      RAISE EXCEPTION 'promotion market is required';
    END IF;
    RETURN NEW;
  END IF;
  IF source_market_code IS NOT NULL
     AND NEW.market_code <> UPPER(source_market_code) THEN
    RAISE EXCEPTION 'promotion source market does not match target publication';
  END IF;
  IF NEW.status NOT IN ('scheduled', 'active') THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.listings listing
    WHERE listing.id = NEW.listing_id AND listing.status = 'published'
  ) THEN
    RAISE EXCEPTION 'only published listings can be promoted';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.listing_market_publications publication
    WHERE publication.listing_id = NEW.listing_id
      AND publication.market_code = NEW.market_code
  ) THEN
    RAISE EXCEPTION 'promotion market publication does not exist';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_listing_promotion_source_trigger
  ON public.listing_promotions;
CREATE TRIGGER validate_listing_promotion_source_trigger
BEFORE INSERT OR UPDATE OF
  listing_id, product_id, placement_type, label, market_code, status,
  source_type, source_order_id, source_entitlement_id, admin_grant_reference
ON public.listing_promotions
FOR EACH ROW EXECUTE FUNCTION public.validate_listing_promotion_source();

CREATE OR REPLACE FUNCTION public.refresh_listing_market_effective_promotion(
  p_listing_id UUID,
  p_market_code VARCHAR
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  normalized_market_code VARCHAR(2) := UPPER(BTRIM(p_market_code));
  effective public.listing_promotions%ROWTYPE;
  primary_publication BOOLEAN := FALSE;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.listing_market_publications publication
    WHERE publication.listing_id = p_listing_id
      AND publication.market_code = normalized_market_code
  ) THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('listing-promotion:' || p_listing_id::TEXT || ':' || normalized_market_code)
  );

  UPDATE public.listing_promotions
  SET status = 'expired', updated_at = NOW()
  WHERE listing_id = p_listing_id
    AND market_code = normalized_market_code
    AND status = 'active'
    AND ends_at <= NOW();

  SELECT promotion.* INTO effective
  FROM public.listing_promotions promotion
  JOIN public.listing_market_publications publication
    ON publication.listing_id = promotion.listing_id
   AND publication.market_code = promotion.market_code
  WHERE promotion.listing_id = p_listing_id
    AND promotion.market_code = normalized_market_code
    AND promotion.status = 'active'
    AND promotion.starts_at <= NOW()
    AND promotion.ends_at > NOW()
    AND NULLIF(BTRIM(promotion.label), '') IS NOT NULL
    AND publication.status = 'active'
    AND publication.compliance_state = 'approved'
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

  SELECT publication.is_primary INTO primary_publication
  FROM public.listing_market_publications publication
  WHERE publication.listing_id = p_listing_id
    AND publication.market_code = normalized_market_code;

  IF effective.id IS NOT NULL THEN
    UPDATE public.listing_market_publications SET
      promotion_state = 'active',
      promotion_type = effective.placement_type,
      promotion_label = effective.label,
      promotion_start_at = effective.starts_at,
      promotion_end_at = effective.ends_at,
      promoted_at = effective.starts_at
    WHERE listing_id = p_listing_id
      AND market_code = normalized_market_code;

    IF primary_publication THEN
      UPDATE public.listings SET
        promotion_state = 'active',
        promotion_type = effective.placement_type,
        promotion_source = effective.source_type,
        promotion_source_id = effective.id::TEXT,
        promotion_label = effective.label,
        promotion_start_at = effective.starts_at,
        promotion_end_at = effective.ends_at,
        promoted_at = effective.starts_at
      WHERE id = p_listing_id;
    END IF;
  ELSE
    UPDATE public.listing_market_publications SET
      promotion_state = 'inactive',
      promotion_type = NULL,
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

-- Preserve the one-argument RPC for rollback compatibility. It now refreshes
-- every explicit publication and mirrors only the primary market to listings.
CREATE OR REPLACE FUNCTION public.refresh_listing_effective_promotion(
  p_listing_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE
  publication_market_code VARCHAR(2);
BEGIN
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

REVOKE ALL ON FUNCTION public.refresh_listing_market_effective_promotion(UUID, VARCHAR)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_listing_effective_promotion(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_listing_market_effective_promotion(UUID, VARCHAR)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_listing_effective_promotion(UUID)
  TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_listing_promotion_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  -- Expiring a row inside the refresh function fires this trigger again. Stop
  -- the nested invocation so one statement never rewrites its own tuples.
  IF pg_catalog.pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.market_code IS NULL THEN
      PERFORM public.refresh_listing_effective_promotion(OLD.listing_id);
    ELSE
      PERFORM public.refresh_listing_market_effective_promotion(
        OLD.listing_id,
        OLD.market_code
      );
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE'
     AND ROW(OLD.listing_id, OLD.market_code)
       IS DISTINCT FROM ROW(NEW.listing_id, NEW.market_code) THEN
    IF OLD.market_code IS NULL THEN
      PERFORM public.refresh_listing_effective_promotion(OLD.listing_id);
    ELSE
      PERFORM public.refresh_listing_market_effective_promotion(
        OLD.listing_id,
        OLD.market_code
      );
    END IF;
  END IF;

  IF NEW.market_code IS NULL THEN
    PERFORM public.refresh_listing_effective_promotion(NEW.listing_id);
  ELSE
    PERFORM public.refresh_listing_market_effective_promotion(
      NEW.listing_id,
      NEW.market_code
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_listing_promotion_after_change_trigger
  ON public.listing_promotions;
CREATE TRIGGER refresh_listing_promotion_after_change_trigger
AFTER INSERT OR DELETE OR UPDATE OF
  listing_id, market_code, status, placement_type, label, starts_at, ends_at,
  source_type, source_order_id, source_entitlement_id, admin_grant_reference
ON public.listing_promotions
FOR EACH ROW EXECUTE FUNCTION public.refresh_listing_promotion_after_change();

CREATE OR REPLACE FUNCTION public.refresh_listing_promotion_after_publication_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  PERFORM public.refresh_listing_market_effective_promotion(
    NEW.listing_id,
    NEW.market_code
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refresh_listing_promotion_after_publication_change_trigger
  ON public.listing_market_publications;
CREATE TRIGGER refresh_listing_promotion_after_publication_change_trigger
AFTER INSERT OR UPDATE OF status, compliance_state, is_primary
ON public.listing_market_publications
FOR EACH ROW EXECUTE FUNCTION public.refresh_listing_promotion_after_publication_change();

DO $$
DECLARE
  target_listing_id UUID;
BEGIN
  FOR target_listing_id IN
    SELECT DISTINCT promotion.listing_id
    FROM public.listing_promotions promotion
  LOOP
    PERFORM public.refresh_listing_effective_promotion(target_listing_id);
  END LOOP;
END;
$$;
