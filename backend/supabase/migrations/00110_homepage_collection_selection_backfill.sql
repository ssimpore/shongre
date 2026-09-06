-- Legacy homepage revisions predate administrator-controlled collection
-- selection. Reissue only active revisions missing that setting so existing
-- collection discovery remains explicit, auditable and database-owned.

DO $$
DECLARE
  v_existing RECORD;
  v_sections JSONB;
  v_configuration JSONB;
BEGIN
  FOR v_existing IN
    SELECT revision.id, revision.market_code, revision.locale, revision.state
    FROM public.homepage_configuration_revisions revision
    JOIN public.homepage_sections section ON section.revision_id = revision.id
    WHERE revision.state IN ('published', 'draft')
      AND section.section_type = 'collections'
      AND NOT (section.settings ? 'collectionSlugs')
    ORDER BY revision.market_code, revision.locale,
      CASE revision.state WHEN 'published' THEN 0 ELSE 1 END
  LOOP
    SELECT jsonb_agg(
      jsonb_build_object(
        'key', section.section_key,
        'type', section.section_type,
        'enabled', section.enabled,
        'order', section.sort_order,
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
          WHEN section.section_type = 'universe_explorer' THEN section.settings || jsonb_build_object(
            'universeSubsections', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'categoryId', subsection.category_id,
                'enabled', subsection.enabled,
                'order', subsection.sort_order,
                'maxItems', subsection.max_items,
                'minimumListingCount', subsection.minimum_listing_count,
                'mobileVisible', subsection.mobile_visible,
                'desktopVisible', subsection.desktop_visible,
                'marketCodes', COALESCE((
                  SELECT jsonb_agg(target.market_code ORDER BY target.market_code)
                  FROM public.homepage_universe_subsection_markets target
                  WHERE target.subsection_id = subsection.id
                ), '[]'::jsonb)
              ) ORDER BY subsection.sort_order)
              FROM public.homepage_universe_subsections subsection
              WHERE subsection.section_id = section.id
            ), '[]'::jsonb)
          )
          WHEN section.section_type = 'collections' THEN section.settings || jsonb_build_object(
            'collectionSlugs', jsonb_build_array(
              'pepites-semaine',
              'vintage-retro',
              'maison-cocooning',
              'mobilite-urbaine',
              'reconditionne'
            )
          )
          ELSE section.settings
        END
      ) ORDER BY section.sort_order
    ) INTO v_sections
    FROM public.homepage_sections section
    LEFT JOIN public.homepage_offer_rules rule ON rule.section_id = section.id
    WHERE section.revision_id = v_existing.id;

    v_configuration := jsonb_build_object(
      'marketCode', v_existing.market_code,
      'locale', v_existing.locale,
      'sections', v_sections
    );
    PERFORM public.save_homepage_configuration_revision(
      v_configuration,
      NULL,
      'Migration vers la sélection administrable des collections',
      v_existing.state = 'published'
    );
  END LOOP;
END;
$$;
