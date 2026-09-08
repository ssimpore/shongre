-- Non-taxonomy destinations belong to the same market-scoped header aggregate.
-- Labels and publication state are persisted, never appended by clients.
CREATE TABLE public.taxonomy_header_links (
    market_code VARCHAR(2) NOT NULL REFERENCES public.taxonomy_header_configurations(market_code) ON DELETE CASCADE,
    target TEXT NOT NULL CHECK (target IN ('category_overview', 'promotions')),
    labels JSONB NOT NULL CHECK (jsonb_typeof(labels) = 'object' AND COALESCE(LENGTH(TRIM(labels->>'fr-FR')), 0) > 0),
    short_labels JSONB NOT NULL CHECK (jsonb_typeof(short_labels) = 'object' AND COALESCE(LENGTH(TRIM(short_labels->>'fr-FR')), 0) BETWEEN 1 AND 28),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL CHECK (display_order >= 0),
    PRIMARY KEY (market_code, target),
    UNIQUE (market_code, display_order)
);
ALTER TABLE public.taxonomy_header_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_header_links FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.taxonomy_header_links FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.taxonomy_header_links TO service_role;

-- Preserve the two existing destinations after the configured categories.
INSERT INTO public.taxonomy_header_links (market_code, target, labels, short_labels, is_active, display_order)
SELECT configuration.market_code, link.target, link.labels, link.labels, TRUE,
       COALESCE((SELECT MAX(display_order) + 1 FROM public.taxonomy_header_categories WHERE market_code = configuration.market_code), 0) + link.ordinal
FROM public.taxonomy_header_configurations configuration
CROSS JOIN (VALUES
    ('category_overview', '{"fr-FR":"Autres","en-GB":"Other"}'::jsonb, 0),
    ('promotions', '{"fr-FR":"Promotions","en-GB":"Deals"}'::jsonb, 1)
) AS link(target, labels, ordinal)
WHERE configuration.market_code IN ('FR', 'BE', 'CH');

CREATE FUNCTION public.replace_taxonomy_header_navigation(
    p_market_code VARCHAR,
    p_expected_revision INTEGER,
    p_items JSONB,
    p_actor_profile_id UUID,
    p_change_reason TEXT,
    p_request_id VARCHAR DEFAULT NULL,
    p_links JSONB DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    next_revision INTEGER;
    resolved_links JSONB;
BEGIN
    -- The existing category operation acquires the aggregate lock, verifies the
    -- revision and category availability, and writes the shared audit event.
    -- Any later validation failure rolls that entire operation back.
    next_revision := public.replace_taxonomy_header_categories(
        p_market_code, p_expected_revision, p_items, p_actor_profile_id,
        p_change_reason, p_request_id
    );
    SELECT COALESCE(p_links, jsonb_agg(jsonb_build_object(
        'target', target, 'labels', labels, 'shortLabels', short_labels,
        'isActive', is_active, 'displayOrder', display_order
    )), '[]'::jsonb)
    INTO resolved_links FROM public.taxonomy_header_links WHERE market_code = p_market_code;

    IF jsonb_typeof(resolved_links) IS DISTINCT FROM 'array' OR jsonb_array_length(resolved_links) > 2 THEN
        RAISE EXCEPTION 'Invalid header navigation links.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_to_recordset(resolved_links) AS link(target TEXT, labels JSONB, "shortLabels" JSONB, "isActive" BOOLEAN, "displayOrder" INTEGER)
        WHERE target IS NULL OR target NOT IN ('category_overview', 'promotions')
           OR "isActive" IS NULL OR "displayOrder" IS NULL OR "displayOrder" < 0
           OR jsonb_typeof(labels) IS DISTINCT FROM 'object'
           OR jsonb_typeof("shortLabels") IS DISTINCT FROM 'object'
           OR COALESCE(LENGTH(TRIM(labels->>'fr-FR')), 0) = 0
           OR COALESCE(LENGTH(TRIM("shortLabels"->>'fr-FR')), 0) NOT BETWEEN 1 AND 28
    ) OR (SELECT COUNT(DISTINCT value->>'target') <> COUNT(*) FROM jsonb_array_elements(resolved_links)) THEN
        RAISE EXCEPTION 'Header links must have unique supported targets and complete labels.' USING ERRCODE = '22023';
    END IF;
    IF (SELECT COUNT(DISTINCT value->>'displayOrder') <> COUNT(*) FROM jsonb_array_elements(p_items || resolved_links)) THEN
        RAISE EXCEPTION 'Header display orders must be unique across categories and links.' USING ERRCODE = '22023';
    END IF;
    IF p_links IS NOT NULL THEN
        DELETE FROM public.taxonomy_header_links WHERE market_code = p_market_code;
        INSERT INTO public.taxonomy_header_links (market_code, target, labels, short_labels, is_active, display_order)
        SELECT p_market_code, target, labels, "shortLabels", "isActive", "displayOrder"
        FROM jsonb_to_recordset(resolved_links) AS link(target TEXT, labels JSONB, "shortLabels" JSONB, "isActive" BOOLEAN, "displayOrder" INTEGER);
        INSERT INTO public.taxonomy_audit_events (taxonomy_version, action, actor_profile_id, request_id, safe_payload)
        VALUES ('4.0.0', 'header_navigation.links_updated', p_actor_profile_id, p_request_id,
            jsonb_build_object('marketCode', p_market_code, 'revision', next_revision, 'linkCount', jsonb_array_length(resolved_links), 'changeReason', TRIM(p_change_reason)));
    END IF;
    RETURN next_revision;
END;
$$;
REVOKE ALL ON FUNCTION public.replace_taxonomy_header_navigation(VARCHAR, INTEGER, JSONB, UUID, TEXT, VARCHAR, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_taxonomy_header_navigation(VARCHAR, INTEGER, JSONB, UUID, TEXT, VARCHAR, JSONB) TO service_role;

COMMENT ON TABLE public.taxonomy_header_links IS 'Market-managed public navigation destinations in the revisioned taxonomy header aggregate. No direct client access.';
