-- Local-only transaction test: make db-shell < backend/tests/rls/homepage-automatic-collections.sql
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  scenario RECORD;
  configuration JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM public.homepage_configuration_revisions WHERE locale LIKE 'qa-collections-%') THEN
    RAISE EXCEPTION 'Refusing to reuse existing QA configuration';
  END IF;
  FOR scenario IN SELECT * FROM (VALUES
    ('automatic', TRUE, TRUE, '{"collectionSlugs":[]}'::jsonb),
    ('missing', TRUE, TRUE, '{}'::jsonb),
    ('manual', TRUE, TRUE, '{"selectionMode":"manual","collectionSlugs":[]}'::jsonb),
    ('curated', TRUE, TRUE, '{"collectionSlugs":["maison-jardin"]}'::jsonb),
    ('disabled', FALSE, TRUE, '{"collectionSlugs":[]}'::jsonb),
    ('draft', TRUE, FALSE, '{"collectionSlugs":[]}'::jsonb)
  ) AS scenarios(name, enabled, published, settings)
  LOOP
    configuration := jsonb_build_object(
      'marketCode', 'FR', 'locale', 'qa-collections-' || scenario.name,
      'sections', jsonb_build_array(jsonb_build_object(
        'key', 'collections', 'type', 'collections', 'enabled', scenario.enabled,
        'order', 4, 'maxItems', 3, 'minimumListingCount', 2,
        'mobileVisible', FALSE, 'desktopVisible', TRUE,
        'titleByLocale', jsonb_build_object('fr-FR', 'Mon titre'),
        'subtitleByLocale', jsonb_build_object('fr-FR', 'Ma sélection'),
        'settings', scenario.settings
      ))
    );
    PERFORM public.save_homepage_configuration_revision(configuration, NULL, 'QA collections rollback', scenario.published);
    IF scenario.name = 'automatic' THEN
      PERFORM public.save_homepage_configuration_revision(configuration, NULL, 'QA preserved draft', FALSE);
    END IF;
  END LOOP;
END;
$$;

CREATE TEMP TABLE original_sections AS SELECT * FROM public.homepage_sections;
CREATE TEMP TABLE original_controls AS
SELECT revision.* FROM public.homepage_configuration_revisions revision
WHERE revision.locale IN ('qa-collections-manual', 'qa-collections-curated', 'qa-collections-disabled', 'qa-collections-draft')
   OR (revision.locale = 'qa-collections-automatic' AND revision.state = 'draft');

\i backend/supabase/migrations/00119_restore_automatic_homepage_collections.sql

DO $$
BEGIN
  IF EXISTS (SELECT * FROM original_sections EXCEPT SELECT * FROM public.homepage_sections) THEN
    RAISE EXCEPTION 'Historical sections were modified';
  END IF;
  IF EXISTS (SELECT * FROM original_controls EXCEPT SELECT * FROM public.homepage_configuration_revisions) THEN
    RAISE EXCEPTION 'Drafts or explicit choices were modified';
  END IF;
  IF (SELECT count(*) FROM public.homepage_configuration_revisions revision
      JOIN public.homepage_sections section ON section.revision_id = revision.id
      WHERE revision.locale IN ('qa-collections-automatic', 'qa-collections-missing')
        AND revision.state = 'published' AND section.settings->>'selectionMode' = 'automatic'
        AND section.sort_order = 4 AND section.max_items = 3 AND section.minimum_listing_count = 2
        AND NOT section.mobile_visible AND section.desktop_visible
        AND section.title_by_locale->>'fr-FR' = 'Mon titre'
        AND section.subtitle_by_locale->>'fr-FR' = 'Ma sélection') <> 2 THEN
    RAISE EXCEPTION 'Eligible sections were not repaired with their settings intact';
  END IF;
END;
$$;

CREATE TEMP TABLE repaired_revisions AS SELECT * FROM public.homepage_configuration_revisions;
\i backend/supabase/migrations/00119_restore_automatic_homepage_collections.sql
DO $$
BEGIN
  IF EXISTS (SELECT * FROM public.homepage_configuration_revisions EXCEPT SELECT * FROM repaired_revisions)
     OR EXISTS (SELECT * FROM repaired_revisions EXCEPT SELECT * FROM public.homepage_configuration_revisions) THEN
    RAISE EXCEPTION 'Repair is not idempotent';
  END IF;
END;
$$;
ROLLBACK;
\echo 'PASS: automatic collection repair, history preservation, manual/disabled/draft isolation and idempotency (rolled back).'
