-- Keep the stable v3 taxonomy identity while retiring its former public slug.
-- The current v4 category uses the stable id free_exchange.offers.free_items;
-- historical URLs are redirected by the canonical Web SEO policy.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.categories
        WHERE slug = 'dons-et-objets-gratuits'
          AND id <> 'deals_donations'
    ) THEN
        RAISE EXCEPTION 'Cannot migrate deals_donations: target slug is already owned';
    END IF;
END
$$;

UPDATE public.categories
SET slug = 'dons-et-objets-gratuits',
    seo_config = jsonb_set(
        COALESCE(seo_config, '{}'::jsonb),
        '{canonicalPath}',
        to_jsonb('/categorie/don-d-objet'::text),
        TRUE
    ),
    updated_at = NOW()
WHERE id = 'deals_donations'
  AND slug IS DISTINCT FROM 'dons-et-objets-gratuits';

UPDATE public.taxonomy_aliases
SET status = 'retired'
WHERE alias = 'dons-solidarite-bons-plans'
  AND status <> 'retired';
