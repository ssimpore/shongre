-- Two assists for the people on either side of a listing.
--
-- A seller choosing a price gets what comparable items actually went for:
-- percentiles over recent sales in the same category, falling back to asking
-- prices when the market is thin. This is arithmetic over the catalogue, not
-- a model, so it works in every environment.
--
-- A buyer or seller receiving a message gets a warning when it carries the
-- usual marks of a scam. The flags are recorded with the message so the
-- warning is the same on every device and survives a reload; the message
-- itself is delivered untouched — the assessment is advisory.

-- ---------------------------------------------------------------------------
-- 1. Price comparables
-- ---------------------------------------------------------------------------

-- Sold listings keep their `updated_at` moving with later events; the sale
-- itself is stamped once so the comparables window is honest.
ALTER TABLE public.listings ADD COLUMN sold_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.stamp_listing_sold_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'sold'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'sold') THEN
    NEW.sold_at := COALESCE(NEW.sold_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_listing_sold_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER listings_stamp_sold_at
  BEFORE INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.stamp_listing_sold_at();

UPDATE public.listings SET sold_at = updated_at
 WHERE status = 'sold' AND sold_at IS NULL;

CREATE INDEX listings_price_comparables_idx
  ON public.listings (market_code, category_id, sold_at)
  WHERE status = 'sold';

-- Percentiles of what comparable listings sold for (`basis = 'sold'`), or
-- were listed at when fewer than `p_min_sample` sales exist
-- (`basis = 'asking'`). Brand and model narrow the sample only when the
-- narrowed sample is still large enough to mean something.
CREATE OR REPLACE FUNCTION public.estimate_listing_price(
  p_market_code VARCHAR,
  p_category_ids TEXT[],
  p_brand TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_condition TEXT DEFAULT NULL,
  p_window_days INTEGER DEFAULT 180,
  p_min_sample INTEGER DEFAULT 5
)
RETURNS TABLE (
  basis TEXT,
  sample_size INTEGER,
  currency VARCHAR,
  p25_minor BIGINT,
  median_minor BIGINT,
  p75_minor BIGINT,
  narrowed_by TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_window INTERVAL := make_interval(days => LEAST(GREATEST(coalesce(p_window_days, 180), 7), 730));
  v_min INTEGER := LEAST(GREATEST(coalesce(p_min_sample, 5), 1), 100);
  v_brand TEXT := NULLIF(lower(btrim(coalesce(p_brand, ''))), '');
  v_model TEXT := NULLIF(lower(btrim(coalesce(p_model, ''))), '');
  v_condition TEXT := NULLIF(btrim(coalesce(p_condition, '')), '');
  v_step INTEGER;
  v_rows RECORD;
BEGIN
  IF p_market_code IS NULL OR coalesce(array_length(p_category_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  -- Try the most specific sample first, then relax brand, model and
  -- condition until the sample is large enough.
  FOR v_step IN 0..3 LOOP
    FOR v_rows IN
      WITH comparable AS (
        SELECT publication.price_minor, publication.currency
          FROM public.listings listing
          JOIN public.listing_market_publications publication
            ON publication.listing_id = listing.id
           AND publication.market_code = p_market_code
           AND publication.is_primary
         WHERE listing.status = 'sold'
           AND listing.sold_at >= NOW() - v_window
           AND listing.category_id = ANY (p_category_ids)
           AND publication.price_minor > 0
           AND (v_step >= 1 OR v_brand IS NULL OR lower(listing.brand) = v_brand)
           AND (v_step >= 2 OR v_model IS NULL OR lower(listing.model) = v_model)
           AND (v_step >= 3 OR v_condition IS NULL OR listing.condition::TEXT = v_condition)
      )
      SELECT 'sold'::TEXT AS basis,
             COUNT(*)::INTEGER AS sample_size,
             (array_agg(comparable.currency ORDER BY comparable.currency))[1] AS currency,
             percentile_cont(0.25) WITHIN GROUP (ORDER BY comparable.price_minor)::BIGINT AS p25_minor,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY comparable.price_minor)::BIGINT AS median_minor,
             percentile_cont(0.75) WITHIN GROUP (ORDER BY comparable.price_minor)::BIGINT AS p75_minor
        FROM comparable
      HAVING COUNT(*) >= v_min
    LOOP
      basis := v_rows.basis;
      sample_size := v_rows.sample_size;
      currency := v_rows.currency;
      p25_minor := v_rows.p25_minor;
      median_minor := v_rows.median_minor;
      p75_minor := v_rows.p75_minor;
      narrowed_by := ARRAY_REMOVE(ARRAY[
        CASE WHEN v_step < 1 AND v_brand IS NOT NULL THEN 'brand' END,
        CASE WHEN v_step < 2 AND v_model IS NOT NULL THEN 'model' END,
        CASE WHEN v_step < 3 AND v_condition IS NOT NULL THEN 'condition' END
      ], NULL);
      RETURN NEXT;
      RETURN;
    END LOOP;
  END LOOP;

  -- No sales to speak of: asking prices of what is currently discoverable.
  FOR v_rows IN
    WITH asking AS (
      SELECT publication.price_minor, publication.currency
        FROM public.listings listing
        JOIN public.listing_market_publications publication
          ON publication.listing_id = listing.id
         AND publication.market_code = p_market_code
       WHERE listing.status = 'published'
         AND publication.status = 'active'
         AND publication.compliance_state = 'approved'
         AND listing.category_id = ANY (p_category_ids)
         AND publication.price_minor > 0
    )
    SELECT 'asking'::TEXT AS basis,
           COUNT(*)::INTEGER AS sample_size,
           (array_agg(asking.currency ORDER BY asking.currency))[1] AS currency,
           percentile_cont(0.25) WITHIN GROUP (ORDER BY asking.price_minor)::BIGINT AS p25_minor,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY asking.price_minor)::BIGINT AS median_minor,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY asking.price_minor)::BIGINT AS p75_minor
      FROM asking
    HAVING COUNT(*) >= 3
  LOOP
    basis := v_rows.basis;
    sample_size := v_rows.sample_size;
    currency := v_rows.currency;
    p25_minor := v_rows.p25_minor;
    median_minor := v_rows.median_minor;
    p75_minor := v_rows.p75_minor;
    narrowed_by := '{}'::TEXT[];
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.estimate_listing_price(VARCHAR, TEXT[], TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.estimate_listing_price(VARCHAR, TEXT[], TEXT, TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Message safety flags
-- ---------------------------------------------------------------------------

ALTER TABLE public.messages
  ADD COLUMN safety_flags TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.messages.safety_flags IS
  'Advisory scam markers assessed at send time; shown to the recipient, never used to block delivery.';
