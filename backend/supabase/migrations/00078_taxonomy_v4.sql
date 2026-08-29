-- =============================================================================
-- TAXONOMY V4 NORMALIZED MODEL (EXPAND PHASE)
--
-- This migration adds the normalized structures consumed by the v4 compiler.
-- It does not publish v4, rewrite existing listings, or import generated data.
-- Local import remains an explicit guarded seed workflow.
-- =============================================================================

INSERT INTO public.taxonomy_versions (version_number, status, description)
VALUES (4, 'draft', 'Taxonomie v4 normalisée, types d’annonce et projections résolues')
ON CONFLICT (version_number) DO NOTHING;

ALTER TABLE public.categories
    ADD COLUMN IF NOT EXISTS source_key VARCHAR(150);

CREATE UNIQUE INDEX IF NOT EXISTS categories_source_key_unique_idx
    ON public.categories (source_key)
    WHERE source_key IS NOT NULL;

ALTER TABLE public.taxonomy_attributes
    DROP CONSTRAINT IF EXISTS taxonomy_attributes_data_type_check;

ALTER TABLE public.taxonomy_attributes
    ADD CONSTRAINT taxonomy_attributes_data_type_check
    CHECK (data_type IN (
        'select', 'multi_select', 'number', 'integer', 'decimal', 'percent',
        'enum', 'multi_enum', 'string', 'text', 'long_text', 'phone', 'email',
        'url', 'boolean', 'range', 'year', 'date', 'date_time', 'money', 'media',
        'document', 'json', 'autocomplete', 'location'
    ));

CREATE TABLE IF NOT EXISTS public.taxonomy_attribute_groups (
    id VARCHAR(100) PRIMARY KEY,
    labels JSONB NOT NULL CHECK (jsonb_typeof(labels) = 'object'),
    icon_name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL CHECK (sort_order >= 0),
    collapsible BOOLEAN NOT NULL DEFAULT TRUE,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.taxonomy_option_sets (
    id VARCHAR(120) PRIMARY KEY,
    labels JSONB NOT NULL CHECK (jsonb_typeof(labels) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.taxonomy_options (
    id VARCHAR(260) PRIMARY KEY,
    option_set_id VARCHAR(120) NOT NULL
        REFERENCES public.taxonomy_option_sets(id) ON DELETE CASCADE,
    option_key VARCHAR(140) NOT NULL,
    labels JSONB NOT NULL CHECK (jsonb_typeof(labels) = 'object'),
    sort_order INT NOT NULL CHECK (sort_order >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    managed_externally BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (option_set_id, option_key)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_option_parent_links (
    option_id VARCHAR(260) NOT NULL
        REFERENCES public.taxonomy_options(id) ON DELETE CASCADE,
    parent_option_id VARCHAR(260) NOT NULL
        REFERENCES public.taxonomy_options(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (option_id, parent_option_id),
    CHECK (option_id <> parent_option_id)
);

ALTER TABLE public.taxonomy_attributes
    ADD COLUMN IF NOT EXISTS ui_component VARCHAR(40),
    ADD COLUMN IF NOT EXISTS attribute_group_id VARCHAR(100)
        REFERENCES public.taxonomy_attribute_groups(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS option_set_id VARCHAR(120)
        REFERENCES public.taxonomy_option_sets(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS immutable_after_publication BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.taxonomy_attributes
    DROP CONSTRAINT IF EXISTS taxonomy_attributes_ui_component_check;

ALTER TABLE public.taxonomy_attributes
    ADD CONSTRAINT taxonomy_attributes_ui_component_check
    CHECK (ui_component IS NULL OR ui_component IN (
        'select', 'number_input', 'switch', 'text_input', 'money_input',
        'checkbox_group', 'stepper', 'radio_group', 'autocomplete', 'date_picker',
        'segmented_control', 'textarea', 'hidden', 'cascading_select',
        'location_picker', 'readonly_text', 'size_grid', 'media_uploader',
        'document_uploader', 'tag_input', 'slider', 'checkbox', 'date_range_picker',
        'rich_textarea', 'hierarchical_select', 'multiselect', 'country_select',
        'location_autocomplete', 'postal_code_input', 'address_autocomplete',
        'hidden_geo', 'radius_input', 'image_uploader', 'video_uploader',
        'file_uploader', 'url_input', 'schedule_editor', 'business_id_input',
        'year_picker', 'secure_text_input', 'computed_readonly', 'energy_rating',
        'time_picker', 'structured_textarea', 'tags_input', 'evidence_editor',
        'status_badge', 'document_status', 'datetime_picker', 'barcode_input'
    ));

CREATE TABLE IF NOT EXISTS public.taxonomy_listing_types (
    id VARCHAR(180) PRIMARY KEY,
    source_key VARCHAR(180) NOT NULL UNIQUE,
    category_id VARCHAR(100) NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    vertical_id VARCHAR(100) NOT NULL,
    publication_flow VARCHAR(80) NOT NULL,
    intent VARCHAR(40) NOT NULL CHECK (intent IN (
        'SELL', 'WANTED', 'DONATE', 'EXCHANGE', 'RENT_OUT', 'RENT_SEEK',
        'SERVICE_REQUEST', 'SERVICE_OFFER', 'NOTICE', 'BOOK', 'COURSE_OFFER',
        'JOB_OFFER', 'BUSINESS_SALE', 'JOB_SEEK'
    )),
    labels JSONB NOT NULL CHECK (jsonb_typeof(labels) = 'object'),
    intent_labels JSONB NOT NULL CHECK (jsonb_typeof(intent_labels) = 'object'),
    slug VARCHAR(180) NOT NULL,
    seller_eligibility JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(seller_eligibility) = 'object'),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'disabled', 'deprecated')),
    seo_indexable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (category_id, slug)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_attribute_bindings (
    id TEXT PRIMARY KEY,
    category_id VARCHAR(100) NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    listing_type_id VARCHAR(180) NOT NULL
        REFERENCES public.taxonomy_listing_types(id) ON DELETE CASCADE,
    intent VARCHAR(40) NOT NULL,
    attribute_id VARCHAR(150) NOT NULL
        REFERENCES public.taxonomy_attributes(id) ON DELETE RESTRICT,
    group_id VARCHAR(100) NOT NULL
        REFERENCES public.taxonomy_attribute_groups(id) ON DELETE RESTRICT,
    scope VARCHAR(80) NOT NULL,
    source_level VARCHAR(80) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL CHECK (sort_order >= 0),
    publication_visible BOOLEAN NOT NULL DEFAULT TRUE,
    detail_visible BOOLEAN NOT NULL DEFAULT FALSE,
    card_visible BOOLEAN NOT NULL DEFAULT FALSE,
    filterable BOOLEAN NOT NULL DEFAULT FALSE,
    searchable BOOLEAN NOT NULL DEFAULT FALSE,
    sortable BOOLEAN NOT NULL DEFAULT FALSE,
    seller_eligibility JSONB NOT NULL DEFAULT '{"individualAllowed":true,"professionalAllowed":true}'::jsonb
        CHECK (jsonb_typeof(seller_eligibility) = 'object'),
    override_default TEXT,
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (category_id, listing_type_id, attribute_id),
    CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_dependency_rules (
    id VARCHAR(100) PRIMARY KEY,
    scopes JSONB NOT NULL CHECK (jsonb_typeof(scopes) = 'array'),
    trigger JSONB NOT NULL CHECK (jsonb_typeof(trigger) = 'object'),
    operator VARCHAR(40) NOT NULL,
    trigger_values JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(trigger_values) = 'array'),
    effect VARCHAR(40) NOT NULL CHECK (effect IN (
        'REQUIRE', 'SHOW', 'HIDE', 'FILTER_OPTIONS', 'SET_VALUE', 'CLEAR_VALUE',
        'SHOW_NOTICE', 'REQUIRE_INTERNAL', 'AGE_GATE', 'BLOCK',
        'REQUIRE_VERIFICATION', 'OPTIONAL'
    )),
    targets JSONB NOT NULL CHECK (jsonb_typeof(targets) = 'array'),
    detail TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'disabled', 'deprecated')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.taxonomy_validation_rules (
    id VARCHAR(100) PRIMARY KEY,
    target JSONB NOT NULL CHECK (jsonb_typeof(target) = 'object'),
    scopes JSONB NOT NULL CHECK (jsonb_typeof(scopes) = 'array'),
    rule_type VARCHAR(60) NOT NULL,
    expression TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('BLOCK', 'WARN', 'REVIEW')),
    messages JSONB NOT NULL CHECK (jsonb_typeof(messages) = 'object'),
    country_codes JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(country_codes) = 'array'),
    seller_scopes JSONB NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(seller_scopes) = 'array'),
    enforcement VARCHAR(30) NOT NULL CHECK (enforcement IN ('backend', 'backend+frontend')),
    status VARCHAR(40) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'disabled', 'deprecated', 'disabled_pending_legal')),
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_market_availability (
    category_id VARCHAR(100) NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'coming_soon', 'unavailable')),
    marketplace_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    indexable BOOLEAN NOT NULL DEFAULT FALSE,
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (category_id, market_code),
    CHECK (NOT marketplace_enabled OR status = 'active'),
    CHECK (NOT indexable OR marketplace_enabled),
    CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_seller_rules (
    id VARCHAR(100) PRIMARY KEY,
    seller_type VARCHAR(60) NOT NULL,
    capability VARCHAR(100) NOT NULL,
    proposed_allowed TEXT,
    proposed_limit TEXT,
    proposed_verification TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'disabled', 'deprecated', 'disabled_pending_policy_review')),
    effective_from TIMESTAMPTZ,
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxonomy_version VARCHAR(30) NOT NULL,
    compiler_version VARCHAR(30) NOT NULL,
    workbook_sha256 VARCHAR(64) NOT NULL CHECK (workbook_sha256 ~ '^[a-f0-9]{64}$'),
    normalized_sha256 VARCHAR(64) NOT NULL CHECK (normalized_sha256 ~ '^[a-f0-9]{64}$'),
    source_counts JSONB NOT NULL CHECK (jsonb_typeof(source_counts) = 'object'),
    status VARCHAR(30) NOT NULL CHECK (status IN ('compiled', 'dry_run', 'imported', 'rejected')),
    imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (taxonomy_version, workbook_sha256)
);

CREATE TABLE IF NOT EXISTS public.taxonomy_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxonomy_version VARCHAR(30) NOT NULL,
    action VARCHAR(80) NOT NULL,
    actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    request_id VARCHAR(120),
    safe_payload JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(safe_payload) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS listing_type_id VARCHAR(180)
        REFERENCES public.taxonomy_listing_types(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS listing_intent VARCHAR(40);

ALTER TABLE public.listings
    DROP CONSTRAINT IF EXISTS listings_listing_intent_check;

ALTER TABLE public.listings
    ADD CONSTRAINT listings_listing_intent_check
    CHECK (listing_intent IS NULL OR listing_intent IN (
        'SELL', 'WANTED', 'DONATE', 'EXCHANGE', 'RENT_OUT', 'RENT_SEEK',
        'SERVICE_REQUEST', 'SERVICE_OFFER', 'NOTICE', 'BOOK', 'COURSE_OFFER',
        'JOB_OFFER', 'BUSINESS_SALE', 'JOB_SEEK'
    ));

CREATE INDEX IF NOT EXISTS taxonomy_listing_types_category_idx
    ON public.taxonomy_listing_types (category_id, status, intent, id);
CREATE INDEX IF NOT EXISTS taxonomy_options_lookup_idx
    ON public.taxonomy_options (option_set_id, is_active, sort_order, id);
CREATE INDEX IF NOT EXISTS taxonomy_option_parent_lookup_idx
    ON public.taxonomy_option_parent_links (parent_option_id, option_id);
CREATE INDEX IF NOT EXISTS taxonomy_attribute_bindings_resolver_idx
    ON public.taxonomy_attribute_bindings
    (category_id, listing_type_id, publication_visible, sort_order, attribute_id);
CREATE INDEX IF NOT EXISTS taxonomy_attribute_bindings_filter_idx
    ON public.taxonomy_attribute_bindings (category_id, filterable, attribute_id)
    WHERE filterable;
CREATE INDEX IF NOT EXISTS taxonomy_market_availability_active_idx
    ON public.taxonomy_market_availability (market_code, marketplace_enabled, category_id);
CREATE INDEX IF NOT EXISTS listings_listing_type_status_idx
    ON public.listings (listing_type_id, status, market_code)
    WHERE listing_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS taxonomy_audit_events_version_idx
    ON public.taxonomy_audit_events (taxonomy_version, created_at DESC, id);

ALTER TABLE public.taxonomy_attribute_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_option_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_option_parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_listing_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_attribute_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_dependency_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_market_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_seller_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_audit_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.taxonomy_attribute_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_option_sets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_options FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_option_parent_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_listing_types FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_attribute_bindings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_dependency_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_validation_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_market_availability FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_seller_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_imports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY "Public taxonomy groups are readable"
    ON public.taxonomy_attribute_groups FOR SELECT
    USING (is_public OR public.is_admin());
CREATE POLICY "Taxonomy option sets are publicly readable"
    ON public.taxonomy_option_sets FOR SELECT USING (TRUE);
CREATE POLICY "Active taxonomy options are publicly readable"
    ON public.taxonomy_options FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Active taxonomy option links are publicly readable"
    ON public.taxonomy_option_parent_links FOR SELECT
    USING (
        public.is_admin()
        OR (
            EXISTS (SELECT 1 FROM public.taxonomy_options child WHERE child.id = option_id AND child.is_active)
            AND EXISTS (SELECT 1 FROM public.taxonomy_options parent WHERE parent.id = parent_option_id AND parent.is_active)
        )
    );
CREATE POLICY "Active taxonomy listing types are publicly readable"
    ON public.taxonomy_listing_types FOR SELECT
    USING (status = 'active' OR public.is_admin());
CREATE POLICY "Active taxonomy bindings are publicly readable"
    ON public.taxonomy_attribute_bindings FOR SELECT
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.taxonomy_listing_types lt
            WHERE lt.id = listing_type_id AND lt.status = 'active'
        )
    );
CREATE POLICY "Active public dependency rules are readable"
    ON public.taxonomy_dependency_rules FOR SELECT
    USING (status = 'active' OR public.is_admin());
CREATE POLICY "Active public validation rules are readable"
    ON public.taxonomy_validation_rules FOR SELECT
    USING (status = 'active' OR public.is_admin());
CREATE POLICY "Taxonomy market availability is publicly readable"
    ON public.taxonomy_market_availability FOR SELECT USING (TRUE);

CREATE POLICY "Admins manage taxonomy groups"
    ON public.taxonomy_attribute_groups FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage taxonomy option sets"
    ON public.taxonomy_option_sets FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage taxonomy options"
    ON public.taxonomy_options FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage taxonomy option links"
    ON public.taxonomy_option_parent_links FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage taxonomy listing types"
    ON public.taxonomy_listing_types FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage taxonomy bindings"
    ON public.taxonomy_attribute_bindings FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage taxonomy dependency rules"
    ON public.taxonomy_dependency_rules FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage taxonomy validation rules"
    ON public.taxonomy_validation_rules FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage taxonomy market availability"
    ON public.taxonomy_market_availability FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage taxonomy seller rules"
    ON public.taxonomy_seller_rules FOR ALL
    USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins read taxonomy import evidence"
    ON public.taxonomy_imports FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins insert taxonomy import evidence"
    ON public.taxonomy_imports FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins read taxonomy audit history"
    ON public.taxonomy_audit_events FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins append taxonomy audit history"
    ON public.taxonomy_audit_events FOR INSERT WITH CHECK (public.is_admin());

COMMENT ON TABLE public.taxonomy_listing_types IS
    'First-class listing intents bound to publishable v4 category leaves.';
COMMENT ON TABLE public.taxonomy_attribute_bindings IS
    'Resolved category/listing-type attribute policy; listing attributes remain JSONB on listings.';
COMMENT ON TABLE public.taxonomy_option_parent_links IS
    'Normalized cascade links; repeated option identities are stored once.';
COMMENT ON TABLE public.taxonomy_imports IS
    'Immutable checksum and row-count evidence for deterministic taxonomy compilation/import.';
COMMENT ON TABLE public.taxonomy_audit_events IS
    'Append-only safe taxonomy governance history. Raw sensitive policy data is forbidden.';
COMMENT ON COLUMN public.listings.listing_type_id IS
    'Nullable expand-phase v4 listing type; existing listings remain valid until reviewed backfill.';
