-- ==============================================================================
-- SHONGRE TAXONOMY SCHEMA V2
-- The taxonomy is versioned and registry-driven. Existing category tables and
-- category_attributes rows remain readable while new publication/search code
-- can adopt the canonical fields incrementally.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.taxonomy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_number INT NOT NULL UNIQUE CHECK (version_number > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),
    description TEXT,
    published_at TIMESTAMPTZ,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.taxonomy_attributes (
    id VARCHAR(150) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    help_text TEXT,
    data_type VARCHAR(30) NOT NULL
        CHECK (data_type IN ('select', 'multi_select', 'number', 'text', 'long_text',
                             'boolean', 'range', 'year', 'date', 'date_time',
                             'money', 'autocomplete', 'location')),
    unit VARCHAR(30),
    field_role VARCHAR(20) NOT NULL DEFAULT 'optional'
        CHECK (field_role IN ('required', 'recommended', 'optional', 'computed', 'system')),
    privacy VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (privacy IN ('public', 'seller_only', 'moderator_only')),
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_filterable BOOLEAN NOT NULL DEFAULT FALSE,
    is_searchable BOOLEAN NOT NULL DEFAULT FALSE,
    is_sortable BOOLEAN NOT NULL DEFAULT FALSE,
    is_comparable BOOLEAN NOT NULL DEFAULT FALSE,
    is_seo_relevant BOOLEAN NOT NULL DEFAULT FALSE,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    validation JSONB NOT NULL DEFAULT '{}'::jsonb,
    publication_group VARCHAR(30) NOT NULL DEFAULT 'general'
        CHECK (publication_group IN ('general', 'specifications', 'dimensions', 'performance', 'legal')),
    display_order INT NOT NULL DEFAULT 0,
    deprecated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories
    ADD COLUMN IF NOT EXISTS code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS level VARCHAR(20),
    ADD COLUMN IF NOT EXISTS labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS short_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS listing_family VARCHAR(50),
    ADD COLUMN IF NOT EXISTS supported_intents TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS seller_eligibility JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS condition_scheme VARCHAR(50),
    ADD COLUMN IF NOT EXISTS attribute_ids TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS summary_attribute_ids TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS filter_facet_ids TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS synonyms TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS replaced_by_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS taxonomy_version_id UUID REFERENCES public.taxonomy_versions(id) ON DELETE RESTRICT;

UPDATE public.categories
SET code = COALESCE(code, UPPER(REPLACE(slug, '-', '_'))),
    level = COALESCE(level, CASE WHEN parent_id IS NULL THEN 'category' ELSE 'subcategory' END),
    labels = CASE WHEN labels = '{}'::jsonb THEN jsonb_build_object('fr-FR', name) ELSE labels END,
    short_labels = CASE WHEN short_labels = '{}'::jsonb AND short_label IS NOT NULL
                        THEN jsonb_build_object('fr-FR', short_label) ELSE short_labels END,
    status = CASE WHEN is_active THEN 'active' ELSE 'disabled' END
WHERE code IS NULL OR level IS NULL OR labels = '{}'::jsonb;

ALTER TABLE public.category_attributes
    ADD COLUMN IF NOT EXISTS attribute_id VARCHAR(150),
    ADD COLUMN IF NOT EXISTS code VARCHAR(100),
    ADD COLUMN IF NOT EXISTS data_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS help_text TEXT,
    ADD COLUMN IF NOT EXISTS is_searchable BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_sortable BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_comparable BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS field_role VARCHAR(20) NOT NULL DEFAULT 'optional',
    ADD COLUMN IF NOT EXISTS privacy VARCHAR(20) NOT NULL DEFAULT 'public',
    ADD COLUMN IF NOT EXISTS dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS validation JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS publication_group VARCHAR(30) NOT NULL DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS deprecated BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.category_attributes
SET attribute_id = COALESCE(attribute_id, name),
    code = COALESCE(code, name),
    data_type = COALESCE(data_type, type),
    labels = CASE WHEN labels = '{}'::jsonb THEN jsonb_build_object('fr-FR', label) ELSE labels END,
    field_role = CASE WHEN is_required THEN 'required' ELSE field_role END
WHERE attribute_id IS NULL OR code IS NULL OR data_type IS NULL;

CREATE TABLE IF NOT EXISTS public.taxonomy_node_attributes (
    node_id VARCHAR(100) NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    attribute_id VARCHAR(150) NOT NULL REFERENCES public.taxonomy_attributes(id) ON DELETE RESTRICT,
    inherited_from_node_id VARCHAR(100) REFERENCES public.categories(id) ON DELETE SET NULL,
    override JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_required_override BOOLEAN,
    display_order INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (node_id, attribute_id)
);

ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS taxonomy_version_id UUID REFERENCES public.taxonomy_versions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS attributes_schema_version INT NOT NULL DEFAULT 2;

CREATE INDEX IF NOT EXISTS categories_parent_slug_idx
    ON public.categories (parent_id, slug);
CREATE INDEX IF NOT EXISTS categories_taxonomy_version_idx
    ON public.categories (taxonomy_version_id, status, sort_order);
CREATE INDEX IF NOT EXISTS taxonomy_node_attributes_attribute_idx
    ON public.taxonomy_node_attributes (attribute_id, node_id);
CREATE INDEX IF NOT EXISTS listings_category_status_idx
    ON public.listings (category_id, status, market_code);
CREATE INDEX IF NOT EXISTS listings_attributes_gin_idx
    ON public.listings USING GIN (attributes);

ALTER TABLE public.taxonomy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_node_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published taxonomy versions are readable by all"
    ON public.taxonomy_versions FOR SELECT
    USING (status = 'published' OR public.is_admin());

CREATE POLICY "Taxonomy attributes are readable by all"
    ON public.taxonomy_attributes FOR SELECT
    USING (NOT deprecated OR public.is_admin());

CREATE POLICY "Taxonomy versions are manageable by admins"
    ON public.taxonomy_versions FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Taxonomy attributes are manageable by admins"
    ON public.taxonomy_attributes FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Taxonomy node attributes are readable by all"
    ON public.taxonomy_node_attributes FOR SELECT
    USING (true);

CREATE POLICY "Taxonomy node attributes are manageable by admins"
    ON public.taxonomy_node_attributes FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

COMMENT ON TABLE public.taxonomy_versions IS 'Published, auditable versions of the marketplace taxonomy contract.';
COMMENT ON TABLE public.taxonomy_attributes IS 'Global attribute registry shared by publication, search, cards, detail pages and moderation.';
COMMENT ON TABLE public.taxonomy_node_attributes IS 'Explicit node-to-attribute assignments and per-node overrides.';
COMMENT ON COLUMN public.listings.attributes_schema_version IS 'Schema version used to validate the JSON attributes payload at publication time.';
