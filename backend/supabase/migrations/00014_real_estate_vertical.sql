-- =============================================================================
-- SHONGRE IMMO — REUSABLE VERTICAL OFFERS + VERSIONED REAL-ESTATE DOMAIN
-- Migration 00014 (expand-only; rollback procedure is documented separately)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

INSERT INTO public.vertical_definitions (type, current_schema_version, public_name, configuration)
VALUES ('real_estate', 1, 'Shongre Immo', '{"compatibleWithGenericListings":true,"privateDocuments":true,"normalizedSearch":true}'::jsonb)
ON CONFLICT (type) DO UPDATE SET
    current_schema_version = EXCLUDED.current_schema_version,
    public_name = EXCLUDED.public_name,
    configuration = EXCLUDED.configuration,
    updated_at = NOW();

-- Generic offer mechanism shared by future verticals. Product code resolves
-- offer entitlements; UI never branches on plan names.
CREATE TABLE IF NOT EXISTS public.vertical_market_activations (
    vertical_type VARCHAR(50) NOT NULL REFERENCES public.vertical_definitions(type) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    category_ids TEXT[] NOT NULL,
    subcategory_ids TEXT[] NOT NULL DEFAULT '{}',
    schema_version INT NOT NULL CHECK (schema_version > 0),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (vertical_type, market_code),
    CHECK (cardinality(category_ids) > 0)
);

CREATE TABLE IF NOT EXISTS public.vertical_offers (
    id VARCHAR(120) NOT NULL,
    vertical_type VARCHAR(50) NOT NULL REFERENCES public.vertical_definitions(type) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    audience VARCHAR(20) NOT NULL CHECK (audience IN ('individual','professional','organization')),
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('free','pack','subscription','custom')),
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, vertical_type, market_code)
);

CREATE TABLE IF NOT EXISTS public.vertical_offer_prices (
    id VARCHAR(160) PRIMARY KEY,
    offer_id VARCHAR(120) NOT NULL,
    vertical_type VARCHAR(50) NOT NULL,
    market_code VARCHAR(2) NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('once','month','year')),
    duration_days INT CHECK (duration_days IS NULL OR duration_days > 0),
    trial_days INT CHECK (trial_days IS NULL OR trial_days >= 0),
    tax_rate_bps INT NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (offer_id, vertical_type, market_code)
      REFERENCES public.vertical_offers(id, vertical_type, market_code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.vertical_offer_entitlements (
    offer_id VARCHAR(120) NOT NULL,
    vertical_type VARCHAR(50) NOT NULL,
    market_code VARCHAR(2) NOT NULL,
    entitlement_key VARCHAR(120) NOT NULL,
    entitlement_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (offer_id, vertical_type, market_code, entitlement_key),
    FOREIGN KEY (offer_id, vertical_type, market_code)
      REFERENCES public.vertical_offers(id, vertical_type, market_code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.vertical_add_ons (
    id VARCHAR(120) NOT NULL,
    vertical_type VARCHAR(50) NOT NULL REFERENCES public.vertical_definitions(type) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    category_ids TEXT[] NOT NULL DEFAULT '{}',
    geographic_area_ids TEXT[] NOT NULL DEFAULT '{}',
    type VARCHAR(40) NOT NULL CHECK (type IN ('urgent','search_bump','featured','homepage_spotlight','local_spotlight','qualified_lead','sponsored_professional')),
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    tax_rate_bps INT NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
    validity_days INT CHECK (validity_days IS NULL OR validity_days > 0),
    credit_quantity INT CHECK (credit_quantity IS NULL OR credit_quantity > 0),
    schedule_modes TEXT[] NOT NULL DEFAULT '{immediate}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, vertical_type, market_code)
);

CREATE TABLE IF NOT EXISTS public.vertical_checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_type VARCHAR(50) NOT NULL REFERENCES public.vertical_definitions(type) ON DELETE RESTRICT,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    offer_id VARCHAR(120),
    add_on_ids TEXT[] NOT NULL DEFAULT '{}',
    total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
    tax_minor BIGINT NOT NULL CHECK (tax_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('created','pending','requires_action','paid','failed','cancelled','refunded')),
    provider VARCHAR(30) NOT NULL CHECK (provider IN ('demo','stripe')),
    provider_checkout_id VARCHAR(255),
    provider_checkout_url TEXT,
    provider_payment_id VARCHAR(255),
    invoice_id VARCHAR(255),
    idempotency_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (account_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.vertical_payment_webhook_events (
    provider VARCHAR(30) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(160) NOT NULL,
    payload_hash VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (status IN ('received','processed','ignored','failed')),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS public.real_estate_market_configs (
    market_code VARCHAR(2) PRIMARY KEY REFERENCES public.markets(code) ON DELETE RESTRICT,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    locale VARCHAR(16) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    timezone VARCHAR(80) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    default_search_radius_km INT NOT NULL DEFAULT 25 CHECK (default_search_radius_km BETWEEN 1 AND 500),
    lead_retention_days INT NOT NULL DEFAULT 730 CHECK (lead_retention_days > 0),
    draft_retention_days INT NOT NULL DEFAULT 180 CHECK (draft_retention_days > 0),
    approximate_location_radius_m INT NOT NULL DEFAULT 300 CHECK (approximate_location_radius_m BETWEEN 50 AND 5000),
    regulatory_content_version VARCHAR(80) NOT NULL,
    feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.real_estate_property_types (
    type VARCHAR(40) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    slug VARCHAR(120) NOT NULL,
    label VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    icon_name VARCHAR(100) NOT NULL,
    transaction_types TEXT[] NOT NULL,
    required_field_ids TEXT[] NOT NULL DEFAULT '{}',
    filter_field_ids TEXT[] NOT NULL DEFAULT '{}',
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (type, market_code),
    UNIQUE (market_code, slug),
    CHECK (type IN ('apartment','house','land','parking_garage','commercial','office','building','new_development','holiday_rental','room_shared','other')),
    CHECK (cardinality(transaction_types) > 0)
);

CREATE TABLE IF NOT EXISTS public.real_estate_attribute_definitions (
    id VARCHAR(120) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    property_types TEXT[] NOT NULL,
    transaction_types TEXT[] NOT NULL,
    label VARCHAR(180) NOT NULL,
    help_text TEXT,
    field_type VARCHAR(30) NOT NULL CHECK (field_type IN ('text','number','boolean','single_select','multi_select','date','money','document_status')),
    unit VARCHAR(40),
    options JSONB,
    privacy VARCHAR(30) NOT NULL CHECK (privacy IN ('public','seller_only','reviewer_only')),
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_filterable BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, market_code)
);

CREATE TABLE IF NOT EXISTS public.real_estate_field_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    property_type VARCHAR(40),
    transaction_type VARCHAR(40),
    field_id VARCHAR(120) NOT NULL,
    requirement VARCHAR(20) NOT NULL CHECK (requirement IN ('required','recommended','optional','hidden')),
    condition_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (market_code, property_type, transaction_type, field_id, schema_version),
    FOREIGN KEY (field_id, market_code) REFERENCES public.real_estate_attribute_definitions(id, market_code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.real_estate_agencies (
    organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    slug VARCHAR(180) NOT NULL UNIQUE,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'not_submitted' CHECK (verification_status IN ('not_submitted','pending','verified','rejected')),
    public_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.real_estate_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.real_estate_agencies(organization_id) ON DELETE CASCADE,
    name VARCHAR(180) NOT NULL,
    city VARCHAR(160) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    public_address TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.real_estate_agency_members (
    organization_id UUID NOT NULL REFERENCES public.real_estate_agencies(organization_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('owner','admin','manager','agent','support','analyst','billing')),
    branch_ids UUID[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.real_estate_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID UNIQUE REFERENCES public.listings(id) ON DELETE SET NULL,
    created_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.real_estate_agencies(organization_id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.real_estate_branches(id) ON DELETE SET NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    slug VARCHAR(220) NOT NULL UNIQUE,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    property_type VARCHAR(40) NOT NULL,
    transaction_type VARCHAR(40) NOT NULL CHECK (transaction_type IN ('sale','long_term_rental','seasonal_rental','shared_accommodation','life_annuity','other')),
    seller_type VARCHAR(30) NOT NULL CHECK (seller_type IN ('owner','agency','developer','property_manager')),
    lifecycle VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (lifecycle IN ('draft','pending_review','published','reserved','sold','expired','suspended','rejected','removed','archived')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    price_period VARCHAR(20) NOT NULL CHECK (price_period IN ('total','month','week','night')),
    charges_minor BIGINT CHECK (charges_minor IS NULL OR charges_minor >= 0),
    agency_fees_minor BIGINT CHECK (agency_fees_minor IS NULL OR agency_fees_minor >= 0),
    deposit_minor BIGINT CHECK (deposit_minor IS NULL OR deposit_minor >= 0),
    price_per_sqm_minor BIGINT CHECK (price_per_sqm_minor IS NULL OR price_per_sqm_minor >= 0),
    living_area_sqm NUMERIC(10,2) NOT NULL CHECK (living_area_sqm > 0),
    land_area_sqm NUMERIC(12,2) CHECK (land_area_sqm IS NULL OR land_area_sqm >= 0),
    rooms SMALLINT NOT NULL CHECK (rooms >= 0),
    bedrooms SMALLINT NOT NULL CHECK (bedrooms >= 0),
    bathrooms SMALLINT NOT NULL CHECK (bathrooms >= 0),
    floor SMALLINT,
    floor_count SMALLINT CHECK (floor_count IS NULL OR floor_count >= 0),
    furnished BOOLEAN,
    dpe_class CHAR(1) CHECK (dpe_class IS NULL OR dpe_class IN ('A','B','C','D','E','F','G')),
    ges_class CHAR(1) CHECK (ges_class IS NULL OR ges_class IN ('A','B','C','D','E','F','G')),
    city VARCHAR(160) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    public_location_label VARCHAR(255) NOT NULL,
    location_precision VARCHAR(20) NOT NULL CHECK (location_precision IN ('exact','street','district','city')),
    location_point extensions.geography(POINT,4326) NOT NULL,
    exact_address_private TEXT,
    amenities TEXT[] NOT NULL DEFAULT '{}',
    accessibility_features TEXT[] NOT NULL DEFAULT '{}',
    custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    regulatory_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    seller_public_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    promotion_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (moderation_status IN ('draft','pending','approved','rejected')),
    moderation_reason TEXT,
    risk_signals_private JSONB NOT NULL DEFAULT '[]'::jsonb,
    search_vector TSVECTOR,
    published_at TIMESTAMPTZ,
    sort_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (property_type, market_code) REFERENCES public.real_estate_property_types(type, market_code) ON DELETE RESTRICT,
    CHECK ((owner_user_id IS NOT NULL)::int + (organization_id IS NOT NULL)::int = 1)
);

CREATE TABLE IF NOT EXISTS public.real_estate_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('photo','floor_plan','video','virtual_tour')),
    public_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    width INT,
    height INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (property_id, type, sort_order)
);

CREATE TABLE IF NOT EXISTS public.real_estate_private_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE CASCADE,
    document_type VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'uploaded' CHECK (status IN ('missing','uploaded','under_review','verified','rejected','expired')),
    private_storage_key TEXT NOT NULL,
    issued_at DATE,
    expires_at DATE,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (expires_at IS NULL OR issued_at IS NULL OR issued_at <= expires_at)
);

CREATE TABLE IF NOT EXISTS public.real_estate_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.real_estate_agencies(organization_id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    current_step SMALLINT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 10),
    completed_steps SMALLINT[] NOT NULL DEFAULT '{}',
    draft_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
    revision INT NOT NULL DEFAULT 1 CHECK (revision > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.real_estate_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.real_estate_agencies(organization_id) ON DELETE SET NULL,
    requester_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('information','visit','call','financing')),
    status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','visit_planned','won','lost','spam')),
    requester_name VARCHAR(180) NOT NULL,
    requester_email_private TEXT NOT NULL,
    requester_phone_private TEXT,
    message_private TEXT NOT NULL,
    desired_move_date DATE,
    preferred_contact_channel VARCHAR(20) NOT NULL CHECK (preferred_contact_channel IN ('message','email','phone')),
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    qualification_answers_private JSONB NOT NULL DEFAULT '{}'::jsonb,
    assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    next_reminder_at TIMESTAMPTZ,
    first_responded_at TIMESTAMPTZ,
    duplicate_of_lead_id UUID REFERENCES public.real_estate_leads(id) ON DELETE SET NULL,
    contact_details_released BOOLEAN NOT NULL DEFAULT FALSE,
    spam_fingerprint VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.real_estate_lead_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.real_estate_leads(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    note_private TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.real_estate_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.real_estate_leads(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.real_estate_agencies(organization_id) ON DELETE SET NULL,
    assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','completed','cancelled','no_show')),
    private_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS public.real_estate_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.real_estate_agencies(organization_id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('csv','xml','api')),
    status VARCHAR(40) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','validating','processing','completed','completed_with_errors','failed')),
    file_name TEXT,
    imported_count INT NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
    rejected_count INT NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
    error_report_key_private TEXT,
    idempotency_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE (organization_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.real_estate_moderation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.real_estate_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(80) NOT NULL CHECK (event_name IN ('listing_created','publication_step_completed','publication_completed','offer_selected','checkout_completed','lead_created','lead_responded','visit_requested','visit_completed','search_performed','property_viewed','search_contacted','subscription_started','add_on_purchased','agency_workspace_opened')),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    property_id UUID REFERENCES public.real_estate_properties(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.real_estate_agencies(organization_id) ON DELETE SET NULL,
    anonymous_session_hash VARCHAR(100),
    dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
    value_minor BIGINT,
    currency VARCHAR(3),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vertical_offers_market_active_idx ON public.vertical_offers (vertical_type, market_code, audience, sort_order) WHERE is_active;
CREATE INDEX IF NOT EXISTS vertical_add_ons_market_active_idx ON public.vertical_add_ons (vertical_type, market_code, type, sort_order) WHERE is_active;
CREATE INDEX IF NOT EXISTS real_estate_properties_market_transaction_status_idx ON public.real_estate_properties (market_code, transaction_type, lifecycle, sort_date DESC);
CREATE INDEX IF NOT EXISTS real_estate_properties_market_type_price_idx ON public.real_estate_properties (market_code, property_type, price_minor, sort_date DESC) WHERE lifecycle = 'published';
CREATE INDEX IF NOT EXISTS real_estate_properties_surface_rooms_idx ON public.real_estate_properties (living_area_sqm, rooms, bedrooms) WHERE lifecycle = 'published';
CREATE INDEX IF NOT EXISTS real_estate_properties_dpe_idx ON public.real_estate_properties (dpe_class, market_code) WHERE lifecycle = 'published';
CREATE INDEX IF NOT EXISTS real_estate_properties_location_gist_idx ON public.real_estate_properties USING GIST (location_point);
CREATE INDEX IF NOT EXISTS real_estate_properties_search_gin_idx ON public.real_estate_properties USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS real_estate_properties_amenities_gin_idx ON public.real_estate_properties USING GIN (amenities);
CREATE INDEX IF NOT EXISTS real_estate_properties_promoted_sort_idx ON public.real_estate_properties (market_code, is_sponsored DESC, is_featured DESC, is_urgent DESC, sort_date DESC) WHERE lifecycle = 'published' AND moderation_status = 'approved';
CREATE INDEX IF NOT EXISTS real_estate_drafts_org_updated_idx ON public.real_estate_drafts (organization_id, updated_at DESC) WHERE organization_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.search_real_estate_property_ids_spatial(
    p_market_code VARCHAR,
    p_center_latitude DOUBLE PRECISION DEFAULT NULL,
    p_center_longitude DOUBLE PRECISION DEFAULT NULL,
    p_radius_km DOUBLE PRECISION DEFAULT NULL,
    p_north DOUBLE PRECISION DEFAULT NULL,
    p_east DOUBLE PRECISION DEFAULT NULL,
    p_south DOUBLE PRECISION DEFAULT NULL,
    p_west DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (id UUID)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
    SELECT property.id
      FROM public.real_estate_properties AS property
     WHERE property.market_code = p_market_code
       AND property.lifecycle = 'published'
       AND property.moderation_status = 'approved'
       AND (
         p_radius_km IS NULL
         OR (
           p_center_latitude IS NOT NULL
           AND p_center_longitude IS NOT NULL
           AND extensions.ST_DWithin(
             property.location_point,
             extensions.ST_SetSRID(
               extensions.ST_MakePoint(p_center_longitude, p_center_latitude),
               4326
             )::extensions.geography,
             p_radius_km * 1000
           )
         )
       )
       AND (
         p_north IS NULL
         OR extensions.ST_Intersects(
           property.location_point::extensions.geometry,
           extensions.ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
         )
       );
$$;

REVOKE ALL ON FUNCTION public.search_real_estate_property_ids_spatial(VARCHAR, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_real_estate_property_ids_spatial(VARCHAR, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO service_role;

-- Keep every specialized property addressable through the generic listing
-- backbone. The specialized row remains authoritative for Immo fields while
-- generic favorites, saved searches and cross-vertical surfaces keep working.
CREATE OR REPLACE FUNCTION public.sync_real_estate_generic_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_category_id VARCHAR(100);
    generic_status public.listing_status;
BEGIN
    SELECT category_ids[1]
      INTO target_category_id
      FROM public.vertical_market_activations
     WHERE vertical_type = 'real_estate'
       AND market_code = NEW.market_code
       AND is_active = TRUE;

    IF target_category_id IS NULL THEN
        RAISE EXCEPTION 'Real-estate vertical is not activated for market %', NEW.market_code;
    END IF;

    NEW.listing_id := COALESCE(NEW.listing_id, gen_random_uuid());
    generic_status := CASE
        WHEN NEW.lifecycle = 'published' AND NEW.moderation_status = 'approved' THEN 'published'::public.listing_status
        WHEN NEW.lifecycle = 'reserved' THEN 'reserved'::public.listing_status
        WHEN NEW.lifecycle = 'sold' THEN 'sold'::public.listing_status
        WHEN NEW.lifecycle = 'rejected' THEN 'rejected'::public.listing_status
        WHEN NEW.lifecycle IN ('expired', 'suspended', 'removed', 'archived') THEN 'archived'::public.listing_status
        ELSE 'draft'::public.listing_status
    END;

    INSERT INTO public.listings (
        id, seller_id, category_id, title, description, price, currency,
        status, condition, market_code, city, postal_code, country,
        latitude, longitude, allowed_delivery, is_urgent, is_featured,
        urgent_expires_at, featured_expires_at, bumped_at, attributes,
        vertical_type, vertical_entity_id, vertical_schema_version,
        created_at, updated_at
    ) VALUES (
        NEW.listing_id,
        NEW.created_by_user_id,
        target_category_id,
        NEW.title,
        NEW.description,
        (NEW.price_minor::numeric / 100),
        NEW.currency,
        generic_status,
        COALESCE(NEW.custom_attributes #>> '{_contract,characteristics,condition}', 'bon-etat'),
        NEW.market_code,
        NEW.city,
        NEW.postal_code,
        NEW.market_code,
        extensions.ST_Y(NEW.location_point::extensions.geometry),
        extensions.ST_X(NEW.location_point::extensions.geometry),
        ARRAY['hand_delivery'::public.delivery_type],
        COALESCE((NEW.promotion_payload->>'urgent')::boolean, FALSE),
        COALESCE((NEW.promotion_payload->>'featured')::boolean, FALSE),
        CASE WHEN COALESCE((NEW.promotion_payload->>'urgent')::boolean, FALSE) THEN NULLIF(NEW.promotion_payload->>'endsAt', '')::timestamptz END,
        CASE WHEN COALESCE((NEW.promotion_payload->>'featured')::boolean, FALSE) THEN NULLIF(NEW.promotion_payload->>'endsAt', '')::timestamptz END,
        NULLIF(NEW.promotion_payload->>'bumpedAt', '')::timestamptz,
        jsonb_build_object(
            'propertyType', NEW.property_type,
            'transactionType', NEW.transaction_type,
            'livingAreaSquareMeters', NEW.living_area_sqm,
            'rooms', NEW.rooms,
            'bedrooms', NEW.bedrooms,
            'bathrooms', NEW.bathrooms,
            'dpeClass', NEW.dpe_class,
            'gesClass', NEW.ges_class,
            'sellerType', NEW.seller_type,
            'publicLocationLabel', NEW.public_location_label,
            'canonicalPath', '/immo/bien/' || NEW.slug
        ),
        'real_estate',
        NEW.id,
        NEW.schema_version,
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE SET
        seller_id = EXCLUDED.seller_id,
        category_id = EXCLUDED.category_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        currency = EXCLUDED.currency,
        status = EXCLUDED.status,
        condition = EXCLUDED.condition,
        market_code = EXCLUDED.market_code,
        city = EXCLUDED.city,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        is_urgent = EXCLUDED.is_urgent,
        is_featured = EXCLUDED.is_featured,
        urgent_expires_at = EXCLUDED.urgent_expires_at,
        featured_expires_at = EXCLUDED.featured_expires_at,
        bumped_at = EXCLUDED.bumped_at,
        attributes = EXCLUDED.attributes,
        vertical_type = EXCLUDED.vertical_type,
        vertical_entity_id = EXCLUDED.vertical_entity_id,
        vertical_schema_version = EXCLUDED.vertical_schema_version,
        updated_at = EXCLUDED.updated_at;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_real_estate_generic_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    DELETE FROM public.listings WHERE id = OLD.listing_id;
    RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_real_estate_generic_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_listing_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM public.listing_media WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    SELECT listing_id INTO target_listing_id
      FROM public.real_estate_properties
     WHERE id = NEW.property_id;

    IF NEW.type IN ('photo', 'floor_plan') AND target_listing_id IS NOT NULL THEN
        INSERT INTO public.listing_media (id, listing_id, url, sort_order, is_primary, width, height)
        VALUES (NEW.id, target_listing_id, NEW.public_url, NEW.sort_order, NEW.type = 'photo' AND NEW.sort_order = 0, NEW.width, NEW.height)
        ON CONFLICT (id) DO UPDATE SET
            listing_id = EXCLUDED.listing_id,
            url = EXCLUDED.url,
            sort_order = EXCLUDED.sort_order,
            is_primary = EXCLUDED.is_primary,
            width = EXCLUDED.width,
            height = EXCLUDED.height;
    ELSE
        DELETE FROM public.listing_media WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_real_estate_generic_listing() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_real_estate_generic_listing() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_real_estate_generic_media() FROM PUBLIC;

DROP TRIGGER IF EXISTS real_estate_generic_listing_sync_trigger ON public.real_estate_properties;
CREATE TRIGGER real_estate_generic_listing_sync_trigger
BEFORE INSERT OR UPDATE ON public.real_estate_properties
FOR EACH ROW EXECUTE FUNCTION public.sync_real_estate_generic_listing();

DROP TRIGGER IF EXISTS real_estate_generic_listing_delete_trigger ON public.real_estate_properties;
CREATE TRIGGER real_estate_generic_listing_delete_trigger
AFTER DELETE ON public.real_estate_properties
FOR EACH ROW EXECUTE FUNCTION public.delete_real_estate_generic_listing();

DROP TRIGGER IF EXISTS real_estate_generic_media_sync_trigger ON public.real_estate_media;
CREATE TRIGGER real_estate_generic_media_sync_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.real_estate_media
FOR EACH ROW EXECUTE FUNCTION public.sync_real_estate_generic_media();
CREATE INDEX IF NOT EXISTS real_estate_leads_org_status_created_idx ON public.real_estate_leads (organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS real_estate_leads_fingerprint_idx ON public.real_estate_leads (property_id, spam_fingerprint, created_at DESC) WHERE spam_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS real_estate_appointments_org_starts_idx ON public.real_estate_appointments (organization_id, starts_at) WHERE status IN ('requested','confirmed');
CREATE INDEX IF NOT EXISTS real_estate_analytics_event_time_idx ON public.real_estate_analytics_events (event_name, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.real_estate_search_vector_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.city, '') || ' ' || COALESCE(NEW.public_location_label, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS real_estate_search_vector_trigger ON public.real_estate_properties;
CREATE TRIGGER real_estate_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, description, city, public_location_label ON public.real_estate_properties
FOR EACH ROW EXECUTE FUNCTION public.real_estate_search_vector_update();

CREATE OR REPLACE FUNCTION public.is_real_estate_agency_member(target_organization_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.real_estate_agency_members member
    WHERE member.organization_id = target_organization_id
      AND member.user_id = public.current_profile_id()
      AND member.status = 'active'
  );
$$;

ALTER TABLE public.vertical_market_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_offer_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_offer_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_market_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_attribute_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_field_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_private_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_moderation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active vertical activation is public" ON public.vertical_market_activations FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Active vertical offers are public" ON public.vertical_offers FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Active vertical prices are public" ON public.vertical_offer_prices FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Active vertical entitlements are public" ON public.vertical_offer_entitlements FOR SELECT USING (TRUE);
CREATE POLICY "Active vertical add-ons are public" ON public.vertical_add_ons FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Admins manage vertical configuration" ON public.vertical_market_activations FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage vertical offers" ON public.vertical_offers FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage vertical prices" ON public.vertical_offer_prices FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage vertical entitlements" ON public.vertical_offer_entitlements FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage vertical add-ons" ON public.vertical_add_ons FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Accounts read own vertical checkouts" ON public.vertical_checkouts FOR SELECT USING (account_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Finance manages vertical checkouts" ON public.vertical_checkouts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Payment webhook events are admin only" ON public.vertical_payment_webhook_events FOR SELECT USING (public.is_admin());
CREATE POLICY "Active Immo config is public" ON public.real_estate_market_configs FOR SELECT USING (is_enabled OR public.is_admin());
CREATE POLICY "Active property types are public" ON public.real_estate_property_types FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Active property attributes are public" ON public.real_estate_attribute_definitions FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Active property field rules are public" ON public.real_estate_field_rules FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Verified agencies are public" ON public.real_estate_agencies FOR SELECT USING (verification_status = 'verified' OR public.is_real_estate_agency_member(organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Active branches are public" ON public.real_estate_branches FOR SELECT USING (is_active OR public.is_real_estate_agency_member(organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Agency members see their team" ON public.real_estate_agency_members FOR SELECT USING (public.is_real_estate_agency_member(organization_id) OR public.is_admin());
CREATE POLICY "Published properties are public" ON public.real_estate_properties FOR SELECT USING (lifecycle = 'published' AND moderation_status = 'approved' OR owner_user_id = public.current_profile_id() OR public.is_real_estate_agency_member(organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Owners manage their properties" ON public.real_estate_properties FOR ALL USING (owner_user_id = public.current_profile_id() OR public.is_real_estate_agency_member(organization_id) OR public.is_admin()) WITH CHECK (owner_user_id = public.current_profile_id() OR public.is_real_estate_agency_member(organization_id) OR public.is_admin());
CREATE POLICY "Public media follows visible properties" ON public.real_estate_media FOR SELECT USING (property_id IN (SELECT id FROM public.real_estate_properties));
CREATE POLICY "Private property documents are owner or reviewer only" ON public.real_estate_private_documents FOR ALL USING (property_id IN (SELECT id FROM public.real_estate_properties WHERE owner_user_id = public.current_profile_id() OR public.is_real_estate_agency_member(organization_id) OR public.is_moderator_or_admin())) WITH CHECK (property_id IN (SELECT id FROM public.real_estate_properties WHERE owner_user_id = public.current_profile_id() OR public.is_real_estate_agency_member(organization_id) OR public.is_moderator_or_admin()));
CREATE POLICY "Owners and agency members manage Immo drafts" ON public.real_estate_drafts FOR ALL
USING (
  owner_user_id = public.current_profile_id()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.real_estate_agency_members member
    WHERE member.organization_id = real_estate_drafts.organization_id
      AND member.user_id = public.current_profile_id()
      AND member.status = 'active'
  )
)
WITH CHECK (
  owner_user_id = public.current_profile_id()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.real_estate_agency_members member
    WHERE member.organization_id = real_estate_drafts.organization_id
      AND member.user_id = public.current_profile_id()
      AND member.status = 'active'
  )
);
CREATE POLICY "Lead participants access leads" ON public.real_estate_leads FOR SELECT USING (requester_user_id = public.current_profile_id() OR public.is_real_estate_agency_member(organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Authenticated users create compliant leads" ON public.real_estate_leads FOR INSERT WITH CHECK (requester_user_id = public.current_profile_id() AND consent_given);
CREATE POLICY "Agency members update leads" ON public.real_estate_leads FOR UPDATE USING (public.is_real_estate_agency_member(organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Agency members manage lead notes" ON public.real_estate_lead_notes FOR ALL USING (lead_id IN (SELECT id FROM public.real_estate_leads WHERE public.is_real_estate_agency_member(organization_id)) OR public.is_admin()) WITH CHECK (lead_id IN (SELECT id FROM public.real_estate_leads WHERE public.is_real_estate_agency_member(organization_id)) OR public.is_admin());
CREATE POLICY "Appointment participants access visits" ON public.real_estate_appointments FOR SELECT USING (lead_id IN (SELECT id FROM public.real_estate_leads WHERE requester_user_id = public.current_profile_id()) OR public.is_real_estate_agency_member(organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Agency members manage visits" ON public.real_estate_appointments FOR ALL USING (public.is_real_estate_agency_member(organization_id) OR public.is_admin()) WITH CHECK (public.is_real_estate_agency_member(organization_id) OR public.is_admin());
CREATE POLICY "Agency members access imports" ON public.real_estate_imports FOR ALL USING (public.is_real_estate_agency_member(organization_id) OR public.is_admin()) WITH CHECK (public.is_real_estate_agency_member(organization_id) OR public.is_admin());
CREATE POLICY "Moderation history is owner or reviewer visible" ON public.real_estate_moderation_history FOR SELECT USING (property_id IN (SELECT id FROM public.real_estate_properties WHERE owner_user_id = public.current_profile_id() OR public.is_real_estate_agency_member(organization_id)) OR public.is_moderator_or_admin());
CREATE POLICY "Immo analytics are admin only" ON public.real_estate_analytics_events FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.real_estate_private_documents IS 'Private metadata only. Objects belong in a private bucket and require short-lived signed URLs after authorization.';
COMMENT ON COLUMN public.real_estate_properties.exact_address_private IS 'Never expose on public search/detail projections unless the seller explicitly selected exact precision and policy permits it.';
COMMENT ON COLUMN public.real_estate_properties.risk_signals_private IS 'Internal fraud/moderation signals. Never return to ordinary clients.';
COMMENT ON TABLE public.vertical_payment_webhook_events IS 'Provider event ledger used for signature-verified, idempotent webhook processing.';
