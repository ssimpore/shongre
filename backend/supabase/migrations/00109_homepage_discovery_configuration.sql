-- Extend the revisioned homepage model so every discovery rail, including the
-- universe explorer, is selected and thresholded by administrators. Browser
-- roles never read these tables directly; the backend resolves public views.

ALTER TABLE public.homepage_sections
  ADD COLUMN IF NOT EXISTS minimum_listing_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.homepage_sections
SET minimum_listing_count = 1
WHERE section_key IN ('trending', 'deals', 'recent_listings')
  AND minimum_listing_count = 0;

ALTER TABLE public.homepage_sections
  DROP CONSTRAINT IF EXISTS homepage_sections_section_key_check;

ALTER TABLE public.homepage_sections
  ADD CONSTRAINT homepage_sections_section_key_check CHECK (section_key IN (
    'hero', 'recent_searches', 'trending', 'deals', 'recent_listings',
    'universe_explorer', 'collections', 'pro_cta'
  )),
  ADD CONSTRAINT homepage_sections_minimum_listing_count_check
    CHECK (minimum_listing_count BETWEEN 0 AND 1000);

CREATE TABLE IF NOT EXISTS public.homepage_universe_subsections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  category_id VARCHAR(100) NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 100),
  max_items INTEGER NOT NULL CHECK (max_items BETWEEN 1 AND 24),
  minimum_listing_count INTEGER NOT NULL DEFAULT 1
    CHECK (minimum_listing_count BETWEEN 0 AND 1000),
  mobile_visible BOOLEAN NOT NULL DEFAULT TRUE,
  desktop_visible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (section_id, category_id),
  UNIQUE (section_id, sort_order)
);

CREATE TABLE IF NOT EXISTS public.homepage_universe_subsection_markets (
  subsection_id UUID NOT NULL REFERENCES public.homepage_universe_subsections(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  PRIMARY KEY (subsection_id, market_code)
);

CREATE INDEX IF NOT EXISTS homepage_universe_subsection_markets_market_idx
  ON public.homepage_universe_subsection_markets (market_code, subsection_id);

ALTER TABLE public.homepage_universe_subsections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_universe_subsections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_universe_subsection_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_universe_subsection_markets FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.homepage_universe_subsections FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.homepage_universe_subsection_markets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.homepage_universe_subsections TO service_role;
GRANT SELECT, INSERT ON public.homepage_universe_subsection_markets TO service_role;

CREATE POLICY "Homepage universe subsections are service managed"
  ON public.homepage_universe_subsections FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Homepage universe subsection markets are service managed"
  ON public.homepage_universe_subsection_markets FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);

CREATE OR REPLACE FUNCTION public.save_homepage_configuration_revision(
  p_configuration JSONB,
  p_actor_id UUID,
  p_change_reason TEXT,
  p_publish BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_market_code TEXT := upper(trim(p_configuration->>'marketCode'));
  v_locale TEXT := trim(p_configuration->>'locale');
  v_revision INTEGER;
  v_revision_id UUID;
  v_section JSONB;
  v_section_id UUID;
  v_offer JSONB;
  v_subsection JSONB;
  v_subsection_id UUID;
  v_target_market TEXT;
  v_settings JSONB;
  v_state TEXT := CASE WHEN p_publish THEN 'published' ELSE 'draft' END;
  v_hash TEXT := md5(p_configuration::TEXT);
BEGIN
  IF v_market_code !~ '^[A-Z]{2}$' OR length(v_locale) < 2 THEN
    RAISE EXCEPTION 'invalid homepage market or locale' USING ERRCODE = '22023';
  END IF;
  IF length(trim(p_change_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'homepage change reason is required' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_configuration->'sections') <> 'array'
     OR jsonb_array_length(p_configuration->'sections') > 8 THEN
    RAISE EXCEPTION 'invalid homepage section list' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.markets market WHERE market.code = v_market_code FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'homepage market not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.homepage_configuration_revisions
  SET state = 'archived', updated_at = NOW()
  WHERE market_code = v_market_code
    AND locale = v_locale
    AND state = v_state;

  SELECT COALESCE(MAX(revision), 0) + 1 INTO v_revision
  FROM public.homepage_configuration_revisions
  WHERE market_code = v_market_code AND locale = v_locale;

  INSERT INTO public.homepage_configuration_revisions (
    market_code, locale, revision, state, actor_id, change_reason,
    configuration_hash, published_at
  ) VALUES (
    v_market_code, v_locale, v_revision, v_state, p_actor_id,
    trim(p_change_reason), v_hash, CASE WHEN p_publish THEN NOW() END
  ) RETURNING id INTO v_revision_id;

  FOR v_section IN SELECT value FROM jsonb_array_elements(p_configuration->'sections')
  LOOP
    v_settings := COALESCE(v_section->'settings', '{}'::jsonb) - 'offerOverrides';
    IF v_section->>'type' = 'deals' THEN
      v_settings := v_settings
        - 'selectionMode' - 'eligibleOfferTypes' - 'allowedMarkets'
        - 'taxonomyBranches' - 'minimumDiscountBps'
        - 'includeProfessionalSellers' - 'previewEmptyState';
    ELSIF v_section->>'type' = 'universe_explorer' THEN
      v_settings := v_settings - 'universeSubsections';
      IF jsonb_typeof(v_section#>'{settings,universeSubsections}') <> 'array'
         OR jsonb_array_length(v_section#>'{settings,universeSubsections}') NOT BETWEEN 1 AND 24 THEN
        RAISE EXCEPTION 'invalid homepage universe subsection list' USING ERRCODE = '22023';
      END IF;
    END IF;

    INSERT INTO public.homepage_sections (
      revision_id, section_key, section_type, enabled, sort_order,
      title_by_locale, subtitle_by_locale, max_items, minimum_listing_count,
      mobile_visible, desktop_visible, starts_at, ends_at, settings
    ) VALUES (
      v_revision_id, v_section->>'key', v_section->>'type',
      COALESCE((v_section->>'enabled')::BOOLEAN, TRUE),
      (v_section->>'order')::INTEGER,
      COALESCE(v_section->'titleByLocale', '{}'::jsonb),
      COALESCE(v_section->'subtitleByLocale', '{}'::jsonb),
      (v_section->>'maxItems')::INTEGER,
      COALESCE((v_section->>'minimumListingCount')::INTEGER, 0),
      COALESCE((v_section->>'mobileVisible')::BOOLEAN, TRUE),
      COALESCE((v_section->>'desktopVisible')::BOOLEAN, TRUE),
      NULLIF(v_section->>'startsAt', '')::TIMESTAMPTZ,
      NULLIF(v_section->>'endsAt', '')::TIMESTAMPTZ,
      v_settings
    ) RETURNING id INTO v_section_id;

    IF v_section->>'type' = 'deals' THEN
      INSERT INTO public.homepage_offer_rules (
        section_id, selection_mode, eligible_offer_types, allowed_markets,
        taxonomy_branches, minimum_discount_bps,
        include_professional_sellers, preview_empty_state
      ) VALUES (
        v_section_id,
        COALESCE(v_section#>>'{settings,selectionMode}', 'hybrid'),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_section#>'{settings,eligibleOfferTypes}', '[]'::jsonb))),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_section#>'{settings,allowedMarkets}', '[]'::jsonb))),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_section#>'{settings,taxonomyBranches}', '[]'::jsonb))),
        COALESCE((v_section#>>'{settings,minimumDiscountBps}')::INTEGER, 500),
        COALESCE((v_section#>>'{settings,includeProfessionalSellers}')::BOOLEAN, TRUE),
        COALESCE((v_section#>>'{settings,previewEmptyState}')::BOOLEAN, FALSE)
      );
      FOR v_offer IN SELECT value FROM jsonb_array_elements(
        COALESCE(v_section#>'{settings,offerOverrides}', '[]'::jsonb)
      )
      LOOP
        INSERT INTO public.homepage_offer_overrides (
          section_id, listing_id, is_pinned, is_hidden,
          starts_at, ends_at, sort_order
        ) VALUES (
          v_section_id, v_offer->>'listingId',
          COALESCE((v_offer->>'isPinned')::BOOLEAN, FALSE),
          COALESCE((v_offer->>'isHidden')::BOOLEAN, FALSE),
          NULLIF(v_offer->>'startsAt', '')::TIMESTAMPTZ,
          NULLIF(v_offer->>'endsAt', '')::TIMESTAMPTZ,
          NULLIF(v_offer->>'sortOrder', '')::INTEGER
        );
      END LOOP;
    ELSIF v_section->>'type' = 'universe_explorer' THEN
      FOR v_subsection IN SELECT value FROM jsonb_array_elements(
        v_section#>'{settings,universeSubsections}'
      )
      LOOP
        IF NOT EXISTS (
          SELECT 1
          FROM public.categories category
          WHERE category.id = v_subsection->>'categoryId'
            AND category.parent_id IS NULL
            AND category.is_active
        ) THEN
          RAISE EXCEPTION 'homepage universe category is not an active root'
            USING ERRCODE = '22023';
        END IF;
        IF jsonb_typeof(v_subsection->'marketCodes') <> 'array'
           OR jsonb_array_length(v_subsection->'marketCodes') NOT BETWEEN 1 AND 32
           OR NOT (v_subsection->'marketCodes' ? v_market_code) THEN
          RAISE EXCEPTION 'homepage universe category excludes its configuration market'
            USING ERRCODE = '22023';
        END IF;
        INSERT INTO public.homepage_universe_subsections (
          section_id, category_id, enabled, sort_order, max_items,
          minimum_listing_count, mobile_visible, desktop_visible
        ) VALUES (
          v_section_id, v_subsection->>'categoryId',
          COALESCE((v_subsection->>'enabled')::BOOLEAN, TRUE),
          (v_subsection->>'order')::INTEGER,
          (v_subsection->>'maxItems')::INTEGER,
          COALESCE((v_subsection->>'minimumListingCount')::INTEGER, 1),
          COALESCE((v_subsection->>'mobileVisible')::BOOLEAN, TRUE),
          COALESCE((v_subsection->>'desktopVisible')::BOOLEAN, TRUE)
        ) RETURNING id INTO v_subsection_id;
        FOR v_target_market IN
          SELECT jsonb_array_elements_text(v_subsection->'marketCodes')
        LOOP
          INSERT INTO public.homepage_universe_subsection_markets (
            subsection_id, market_code
          ) VALUES (v_subsection_id, v_target_market);
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;

  INSERT INTO public.homepage_configuration_audit_events (
    revision_id, market_code, locale, actor_id, action,
    change_reason, configuration_hash
  ) VALUES (
    v_revision_id, v_market_code, v_locale, p_actor_id,
    CASE WHEN p_publish THEN 'published' ELSE 'draft_saved' END,
    trim(p_change_reason), v_hash
  );
  RETURN v_revision_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_homepage_configuration_revision(JSONB,UUID,TEXT,BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_homepage_configuration_revision(JSONB,UUID,TEXT,BOOLEAN)
  TO service_role;

-- Reissue existing active revisions through the audited function so the new
-- discovery section is present without mutating historical rows in place.
DO $$
DECLARE
  v_existing RECORD;
  v_sections JSONB;
  v_insert_order INTEGER;
  v_configuration JSONB;
BEGIN
  FOR v_existing IN
    SELECT id, market_code, locale, state
    FROM public.homepage_configuration_revisions
    WHERE state IN ('published', 'draft')
    ORDER BY market_code, locale, CASE state WHEN 'published' THEN 0 ELSE 1 END
  LOOP
    SELECT COALESCE(
      MIN(sort_order) FILTER (WHERE section_key = 'collections'),
      MAX(sort_order) + 1,
      0
    ) INTO v_insert_order
    FROM public.homepage_sections
    WHERE revision_id = v_existing.id;

    SELECT jsonb_agg(
      jsonb_build_object(
        'key', section.section_key,
        'type', section.section_type,
        'enabled', section.enabled,
        'order', CASE
          WHEN section.sort_order >= v_insert_order THEN section.sort_order + 1
          ELSE section.sort_order
        END,
        'titleByLocale', section.title_by_locale,
        'subtitleByLocale', section.subtitle_by_locale,
        'maxItems', section.max_items,
        'minimumListingCount', section.minimum_listing_count,
        'mobileVisible', section.mobile_visible,
        'desktopVisible', section.desktop_visible,
        'startsAt', section.starts_at,
        'endsAt', section.ends_at,
        'settings', CASE
          WHEN section.section_type = 'deals' THEN section.settings || jsonb_build_object(
            'selectionMode', rule.selection_mode,
            'eligibleOfferTypes', to_jsonb(rule.eligible_offer_types),
            'allowedMarkets', to_jsonb(rule.allowed_markets),
            'taxonomyBranches', to_jsonb(rule.taxonomy_branches),
            'minimumDiscountBps', rule.minimum_discount_bps,
            'includeProfessionalSellers', rule.include_professional_sellers,
            'previewEmptyState', rule.preview_empty_state,
            'offerOverrides', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'listingId', override.listing_id,
                'isPinned', override.is_pinned,
                'isHidden', override.is_hidden,
                'startsAt', override.starts_at,
                'endsAt', override.ends_at,
                'sortOrder', override.sort_order
              ) ORDER BY override.sort_order NULLS LAST, override.listing_id)
              FROM public.homepage_offer_overrides override
              WHERE override.section_id = section.id
            ), '[]'::jsonb)
          )
          ELSE section.settings
        END
      ) ORDER BY section.sort_order
    ) INTO v_sections
    FROM public.homepage_sections section
    LEFT JOIN public.homepage_offer_rules rule ON rule.section_id = section.id
    WHERE section.revision_id = v_existing.id;

    v_sections := COALESCE(v_sections, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'key', 'universe_explorer',
        'type', 'universe_explorer',
        'enabled', TRUE,
        'order', v_insert_order,
        'titleByLocale', jsonb_build_object(v_existing.locale, 'Explorez par univers'),
        'subtitleByLocale', jsonb_build_object(v_existing.locale, 'Trouvez rapidement ce qui vous intéresse'),
        'maxItems', 3,
        'minimumListingCount', 1,
        'mobileVisible', TRUE,
        'desktopVisible', TRUE,
        'settings', jsonb_build_object(
          'universeSubsections', jsonb_build_array(
            jsonb_build_object('categoryId', 'home_garden', 'enabled', TRUE, 'order', 0, 'maxItems', 8, 'minimumListingCount', 1, 'mobileVisible', TRUE, 'desktopVisible', TRUE, 'marketCodes', jsonb_build_array(v_existing.market_code)),
            jsonb_build_object('categoryId', 'vehicles', 'enabled', TRUE, 'order', 1, 'maxItems', 8, 'minimumListingCount', 1, 'mobileVisible', TRUE, 'desktopVisible', TRUE, 'marketCodes', jsonb_build_array(v_existing.market_code)),
            jsonb_build_object('categoryId', 'fashion', 'enabled', TRUE, 'order', 2, 'maxItems', 8, 'minimumListingCount', 1, 'mobileVisible', TRUE, 'desktopVisible', TRUE, 'marketCodes', jsonb_build_array(v_existing.market_code))
          )
        )
      )
    );
    v_configuration := jsonb_build_object(
      'marketCode', v_existing.market_code,
      'locale', v_existing.locale,
      'sections', v_sections
    );
    PERFORM public.save_homepage_configuration_revision(
      v_configuration,
      NULL,
      'Migration vers la découverte administrable',
      v_existing.state = 'published'
    );
  END LOOP;
END;
$$;

COMMENT ON COLUMN public.homepage_sections.minimum_listing_count IS
  'Minimum eligible listing count required before a public discovery section is returned.';
COMMENT ON TABLE public.homepage_universe_subsections IS
  'Ordered, market-targeted category rails stored with each immutable homepage revision.';
COMMENT ON TABLE public.homepage_universe_subsection_markets IS
  'Normalized market targeting for one homepage universe category rail.';
