-- =============================================================================
-- MARKET-SCOPED TAXONOMY HEADER NAVIGATION
-- Administrators select, activate, and order root taxonomy categories without
-- changing application code. Public clients receive a backend-shaped projection.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.taxonomy_header_configurations (
    market_code VARCHAR(2) PRIMARY KEY
        REFERENCES public.markets(code) ON DELETE CASCADE,
    revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.taxonomy_header_categories (
    market_code VARCHAR(2) NOT NULL,
    category_id VARCHAR(100) NOT NULL
        REFERENCES public.categories(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL CHECK (display_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (market_code, category_id),
    UNIQUE (market_code, display_order),
    FOREIGN KEY (market_code)
        REFERENCES public.taxonomy_header_configurations(market_code)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS taxonomy_header_categories_public_idx
    ON public.taxonomy_header_categories (market_code, display_order, category_id)
    WHERE is_active = TRUE;

ALTER TABLE public.taxonomy_header_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_header_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_header_configurations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_header_categories FORCE ROW LEVEL SECURITY;

CREATE POLICY "Taxonomy header configurations are manageable by admins"
    ON public.taxonomy_header_configurations FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Taxonomy header categories are manageable by admins"
    ON public.taxonomy_header_categories FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

INSERT INTO public.taxonomy_header_configurations (market_code, revision)
SELECT market_code, 1
FROM (VALUES ('FR'), ('BE'), ('CH')) AS configured_markets(market_code)
JOIN public.markets ON public.markets.code = configured_markets.market_code
ON CONFLICT (market_code) DO NOTHING;

INSERT INTO public.taxonomy_header_categories (
    market_code,
    category_id,
    is_active,
    display_order
)
SELECT market_code, category_id, TRUE, display_order
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
JOIN public.taxonomy_header_configurations configuration
    ON configuration.market_code = default_items.market_code
JOIN public.categories category
    ON category.id = default_items.category_id
ON CONFLICT (market_code, category_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.replace_taxonomy_header_categories(
    p_market_code VARCHAR,
    p_expected_revision INTEGER,
    p_items JSONB,
    p_actor_profile_id UUID,
    p_change_reason TEXT,
    p_request_id VARCHAR DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_revision INTEGER;
    next_revision INTEGER;
    parsed_count INTEGER;
BEGIN
    IF p_market_code IS NULL OR p_market_code !~ '^[A-Z]{2}$' THEN
        RAISE EXCEPTION 'Invalid taxonomy header market.' USING ERRCODE = '22023';
    END IF;
    IF p_expected_revision IS NULL OR p_expected_revision < 0 THEN
        RAISE EXCEPTION 'Invalid taxonomy header revision.' USING ERRCODE = '22023';
    END IF;
    IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) > 30 THEN
        RAISE EXCEPTION 'Invalid taxonomy header category collection.' USING ERRCODE = '22023';
    END IF;
    IF LENGTH(TRIM(COALESCE(p_change_reason, ''))) < 10
       OR LENGTH(TRIM(COALESCE(p_change_reason, ''))) > 500 THEN
        RAISE EXCEPTION 'A bounded taxonomy header change reason is required.' USING ERRCODE = '22023';
    END IF;

    SELECT COUNT(*)
    INTO parsed_count
    FROM jsonb_to_recordset(p_items) AS item(
        "categoryId" TEXT,
        "isActive" BOOLEAN,
        "displayOrder" INTEGER
    )
    WHERE item."categoryId" IS NOT NULL
      AND item."isActive" IS NOT NULL
      AND item."displayOrder" IS NOT NULL
      AND item."displayOrder" >= 0;

    IF parsed_count <> jsonb_array_length(p_items) THEN
        RAISE EXCEPTION 'Every taxonomy header item must be complete.' USING ERRCODE = '22023';
    END IF;

    IF (
        SELECT COUNT(DISTINCT item."categoryId") <> COUNT(*)
            OR COUNT(DISTINCT item."displayOrder") <> COUNT(*)
        FROM jsonb_to_recordset(p_items) AS item(
            "categoryId" TEXT,
            "isActive" BOOLEAN,
            "displayOrder" INTEGER
        )
    ) THEN
        RAISE EXCEPTION 'Taxonomy header categories and display orders must be unique.' USING ERRCODE = '22023';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_items) AS item(
            "categoryId" TEXT,
            "isActive" BOOLEAN,
            "displayOrder" INTEGER
        )
        LEFT JOIN public.categories category ON category.id = item."categoryId"
        WHERE category.id IS NULL OR category.parent_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Only existing root taxonomy categories may appear in the header.' USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(p_items) AS item(
            "categoryId" TEXT,
            "isActive" BOOLEAN,
            "displayOrder" INTEGER
        )
        JOIN public.categories category ON category.id = item."categoryId"
        LEFT JOIN public.taxonomy_market_availability availability
            ON availability.category_id = category.id
           AND availability.market_code = p_market_code
        WHERE item."isActive"
          AND (
              category.status <> 'active'
              OR NOT category.is_active
              OR NOT COALESCE(availability.marketplace_enabled, FALSE)
          )
    ) THEN
        RAISE EXCEPTION 'Active header categories must be enabled in the selected market.' USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.taxonomy_header_configurations (market_code, revision)
    VALUES (p_market_code, 0)
    ON CONFLICT (market_code) DO NOTHING;

    SELECT revision
    INTO current_revision
    FROM public.taxonomy_header_configurations
    WHERE market_code = p_market_code
    FOR UPDATE;

    IF current_revision <> p_expected_revision THEN
        RAISE EXCEPTION 'Taxonomy header configuration revision conflict.' USING ERRCODE = '40001';
    END IF;

    DELETE FROM public.taxonomy_header_categories
    WHERE market_code = p_market_code;

    INSERT INTO public.taxonomy_header_categories (
        market_code,
        category_id,
        is_active,
        display_order
    )
    SELECT
        p_market_code,
        item."categoryId",
        item."isActive",
        item."displayOrder"
    FROM jsonb_to_recordset(p_items) AS item(
        "categoryId" TEXT,
        "isActive" BOOLEAN,
        "displayOrder" INTEGER
    );

    next_revision := current_revision + 1;
    UPDATE public.taxonomy_header_configurations
    SET revision = next_revision,
        updated_by = p_actor_profile_id,
        updated_at = NOW()
    WHERE market_code = p_market_code;

    INSERT INTO public.taxonomy_audit_events (
        taxonomy_version,
        action,
        actor_profile_id,
        request_id,
        safe_payload
    ) VALUES (
        '4.0.0',
        'header_navigation.updated',
        p_actor_profile_id,
        p_request_id,
        jsonb_build_object(
            'marketCode', p_market_code,
            'revision', next_revision,
            'itemCount', jsonb_array_length(p_items),
            'changeReason', TRIM(p_change_reason)
        )
    );

    RETURN next_revision;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_taxonomy_header_categories(
    VARCHAR, INTEGER, JSONB, UUID, TEXT, VARCHAR
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_taxonomy_header_categories(
    VARCHAR, INTEGER, JSONB, UUID, TEXT, VARCHAR
) TO service_role;

COMMENT ON TABLE public.taxonomy_header_configurations IS
    'Market-scoped, revisioned ownership record for the public header category bar.';
COMMENT ON TABLE public.taxonomy_header_categories IS
    'Administrator-selected root taxonomy categories, activation state, and display order for one market header.';
COMMENT ON FUNCTION public.replace_taxonomy_header_categories(
    VARCHAR, INTEGER, JSONB, UUID, TEXT, VARCHAR
) IS 'Atomically replaces one market header category selection with optimistic concurrency and an audit event.';
