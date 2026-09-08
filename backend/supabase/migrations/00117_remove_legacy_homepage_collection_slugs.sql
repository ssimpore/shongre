-- Retire selections from the removed browser editorial catalog. Reissue active
-- revisions through the audited writer, preserving history and any selections
-- already migrated to real taxonomy roots.

DO $$
DECLARE
  v_legacy_slugs CONSTANT TEXT[] := ARRAY[
    'pepites-semaine', 'offres-prix-reduit', 'nouveautes', 'tendances',
    'vedettes', 'moins-de-50', 'moins-de-100', 'dons-gratuit', 'idees-cadeaux',
    'auto-moins-10k', 'vintage-retro', 'seconde-main-premium', 'made-in-france',
    'reconditionne', 'comme-neuf', 'eco-responsable', 'premier-appartement',
    'maison-cocooning', 'teletravail', 'setup-gaming', 'famille-bebe',
    'jardin-terrasse', 'brico-weekend', 'mobilite-urbaine', 'outdoor-aventure',
    'saison-actuelle', 'pres-de-chez-vous', 'pros-certifies', 'livraison-directe',
    'vous-aimerez-aussi'
  ];
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
      AND (section.settings->'collectionSlugs') ?| v_legacy_slugs
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
            'collectionSlugs', COALESCE((
              SELECT jsonb_agg(to_jsonb(selected.slug) ORDER BY selected.ordinality)
              FROM jsonb_array_elements_text(section.settings->'collectionSlugs')
                WITH ORDINALITY AS selected(slug, ordinality)
              WHERE NOT (selected.slug = ANY(v_legacy_slugs))
            ), '[]'::jsonb)
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
      'Retrait des anciennes collections éditoriales du client Web',
      v_existing.state = 'published'
    );
  END LOOP;
END;
$$;
