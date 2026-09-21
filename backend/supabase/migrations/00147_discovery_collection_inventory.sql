-- Resolve the complete homepage collection inventory in one bounded database
-- operation. Counts remain exact as markets grow, while the cover is selected
-- from the newest discoverable listing that actually has public media.

CREATE INDEX IF NOT EXISTS listing_media_listing_display_idx
  ON public.listing_media (listing_id, is_primary DESC, sort_order, id);

CREATE OR REPLACE FUNCTION public.get_discovery_collection_inventory(
  p_market_code VARCHAR,
  p_groups JSONB
)
RETURNS TABLE (
  root_id TEXT,
  listing_count BIGINT,
  cover_image_url TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_market_code IS NULL OR p_market_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid market code' USING ERRCODE = '22023';
  END IF;
  IF p_groups IS NULL
     OR jsonb_typeof(p_groups) <> 'array'
     OR jsonb_array_length(p_groups) > 100 THEN
    RAISE EXCEPTION 'invalid discovery collection groups' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH input_groups AS (
    SELECT input.root_id,
           array_agg(DISTINCT category.value)::TEXT[] AS category_ids
      FROM jsonb_to_recordset(p_groups) AS input(root_id TEXT, category_ids JSONB)
      CROSS JOIN LATERAL jsonb_array_elements_text(
        CASE
          WHEN jsonb_typeof(input.category_ids) = 'array'
            THEN input.category_ids
          ELSE '[]'::JSONB
        END
      ) AS category(value)
     WHERE NULLIF(btrim(input.root_id), '') IS NOT NULL
     GROUP BY input.root_id
  ),
  eligible AS (
    SELECT input.root_id,
           publication.listing_id,
           publication.sort_date
      FROM input_groups input
      JOIN public.listings listing
        ON listing.category_id = ANY (input.category_ids)
       AND listing.status = 'published'
      JOIN public.listing_market_publications publication
        ON publication.listing_id = listing.id
       AND publication.market_code = p_market_code
       AND publication.status = 'active'
       AND publication.compliance_state = 'approved'
  ),
  counts AS (
    SELECT input.root_id,
           COUNT(DISTINCT eligible.listing_id)::BIGINT AS listing_count
      FROM input_groups input
      LEFT JOIN eligible ON eligible.root_id = input.root_id
     GROUP BY input.root_id
  )
  SELECT counts.root_id,
         counts.listing_count,
         cover.url AS cover_image_url
    FROM counts
    LEFT JOIN LATERAL (
      SELECT media.url
        FROM eligible
        JOIN public.listing_media media
          ON media.listing_id = eligible.listing_id
         AND NULLIF(btrim(media.url), '') IS NOT NULL
       WHERE eligible.root_id = counts.root_id
       ORDER BY eligible.sort_date DESC,
                eligible.listing_id DESC,
                media.is_primary DESC,
                media.sort_order,
                media.id
       LIMIT 1
    ) cover ON TRUE
   ORDER BY counts.root_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_discovery_collection_inventory(VARCHAR, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_discovery_collection_inventory(VARCHAR, JSONB)
  TO service_role;

COMMENT ON FUNCTION public.get_discovery_collection_inventory(VARCHAR, JSONB) IS
  'Returns exact discoverable listing counts and newest public cover media for a bounded batch of taxonomy roots.';
