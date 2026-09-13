-- Supabase installs pgcrypto in extensions; public.digest is not portable.
-- Use PostgreSQL's built-in SHA-256 on the same UTF-8 bytes, preserving every
-- existing proof and the function's ownership, permissions and locking rules.

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
      pg_catalog.sha256(pg_catalog.convert_to(
        p_listing_id::TEXT || ':' || normalized_market_code || ':' ||
          effective.source_type || ':' || effective.id::TEXT,
        'UTF8'
      )),
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
