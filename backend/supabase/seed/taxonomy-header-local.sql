-- Deterministic local header configuration. Production and other hosted
-- environments are administered through the protected taxonomy API instead.
CREATE TEMP TABLE new_local_header_markets ON COMMIT DROP AS
SELECT code AS market_code FROM public.markets
WHERE code IN ('FR', 'BE', 'CH') AND NOT EXISTS (
  SELECT 1 FROM public.taxonomy_header_configurations configuration WHERE configuration.market_code = markets.code
);

INSERT INTO public.taxonomy_header_configurations (market_code, revision)
SELECT market_code, 1
FROM new_local_header_markets
ON CONFLICT (market_code) DO NOTHING;

INSERT INTO public.taxonomy_header_categories (
    market_code,
    category_id,
    is_active,
    display_order
)
SELECT
    default_items.market_code,
    default_items.category_id,
    TRUE,
    default_items.display_order
FROM (VALUES
    ('FR', 'real_estate', 0),
    ('FR', 'vehicles', 1),
    ('FR', 'professional_equipment', 2),
    ('FR', 'jobs', 3),
    ('FR', 'fashion', 4),
    ('FR', 'home_garden', 5),
    ('FR', 'baby_family', 6),
    ('FR', 'electronics', 7),
    ('FR', 'leisure_culture', 8),
    ('FR', 'education', 9),
    ('BE', 'real_estate', 0),
    ('BE', 'vehicles', 1),
    ('BE', 'professional_equipment', 2),
    ('BE', 'jobs', 3),
    ('BE', 'fashion', 4),
    ('BE', 'home_garden', 5),
    ('BE', 'baby_family', 6),
    ('BE', 'electronics', 7),
    ('BE', 'leisure_culture', 8),
    ('BE', 'education', 9),
    ('CH', 'real_estate', 0),
    ('CH', 'vehicles', 1),
    ('CH', 'professional_equipment', 2),
    ('CH', 'jobs', 3),
    ('CH', 'fashion', 4),
    ('CH', 'home_garden', 5),
    ('CH', 'baby_family', 6),
    ('CH', 'electronics', 7),
    ('CH', 'leisure_culture', 8),
    ('CH', 'education', 9)
) AS default_items(market_code, category_id, display_order)
JOIN new_local_header_markets configuration
    ON configuration.market_code = default_items.market_code
JOIN public.categories category
    ON category.id = default_items.category_id
   AND category.parent_id IS NULL
   AND category.status = 'active'
   AND category.is_active = TRUE;

INSERT INTO public.taxonomy_header_links (market_code, target, labels, short_labels, is_active, display_order)
SELECT configuration.market_code, link.target, link.labels, link.labels, TRUE, link.display_order
FROM new_local_header_markets configuration
CROSS JOIN (VALUES
    ('category_overview', '{"fr-FR":"Autres","en-GB":"Other"}'::jsonb, 10),
    ('promotions', '{"fr-FR":"Promotions","en-GB":"Deals"}'::jsonb, 11)
) AS link(target, labels, display_order)
WHERE configuration.market_code IN ('FR', 'BE', 'CH');
