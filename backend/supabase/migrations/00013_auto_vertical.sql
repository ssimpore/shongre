-- =============================================================================
-- SHONGRE AUTO — VERSIONED AUTOMOTIVE VERTICAL
-- Migration 00013
--
-- Generic listings remain the publication primitive. Automotive identity,
-- catalog, indexed specifications, private documents, dealer inventory,
-- structured leads and provider-gated commerce are normalized here.
-- =============================================================================

INSERT INTO public.vertical_definitions (type, current_schema_version, public_name, configuration)
VALUES ('automotive', 1, 'Shongre Auto', '{"compatibleWithGenericListings":true,"privateVehicleIdentity":true}'::jsonb)
ON CONFLICT (type) DO UPDATE SET current_schema_version = EXCLUDED.current_schema_version, public_name = EXCLUDED.public_name, configuration = EXCLUDED.configuration, updated_at = NOW();

CREATE TABLE IF NOT EXISTS public.auto_market_configs (
    market_code VARCHAR(2) PRIMARY KEY REFERENCES public.markets(code) ON DELETE RESTRICT,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    locale VARCHAR(16) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    timezone VARCHAR(80) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    comparison_limit SMALLINT NOT NULL DEFAULT 4 CHECK (comparison_limit BETWEEN 2 AND 4),
    default_search_radius_km INT NOT NULL DEFAULT 50 CHECK (default_search_radius_km BETWEEN 1 AND 500),
    lead_retention_days INT NOT NULL DEFAULT 730 CHECK (lead_retention_days > 0),
    paid_offers_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    secure_sale_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    financing_referrals_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_referrals_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    inspection_referrals_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    warranty_referrals_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_referrals_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    trade_in_referrals_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    boat_listings_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    config_payload JSONB NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_vehicle_types (
    type VARCHAR(40) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    slug VARCHAR(120) NOT NULL,
    label VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    required_field_ids TEXT[] NOT NULL DEFAULT '{}',
    filter_field_ids TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    public_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (type, market_code),
    UNIQUE (market_code, slug),
    CHECK (type IN ('car','motorcycle','utility','truck','motorhome','boat','agricultural','construction','parts','other'))
);

CREATE TABLE IF NOT EXISTS public.auto_attribute_definitions (
    id VARCHAR(120) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    label VARCHAR(180) NOT NULL,
    field_type VARCHAR(30) NOT NULL CHECK (field_type IN ('text','number','boolean','single_select','multi_select','date')),
    unit VARCHAR(40),
    vehicle_types TEXT[] NOT NULL,
    options JSONB,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_filterable BOOLEAN NOT NULL DEFAULT FALSE,
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    public_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, market_code)
);

CREATE TABLE IF NOT EXISTS public.auto_catalog_entries (
    id VARCHAR(160) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('make','model','generation','trim')),
    parent_id VARCHAR(160),
    slug VARCHAR(180) NOT NULL,
    label VARCHAR(180) NOT NULL,
    vehicle_types TEXT[] NOT NULL,
    starts_year SMALLINT CHECK (starts_year IS NULL OR starts_year BETWEEN 1880 AND 2200),
    ends_year SMALLINT CHECK (ends_year IS NULL OR ends_year BETWEEN 1880 AND 2200),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    public_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, market_code),
    UNIQUE (market_code, kind, parent_id, slug),
    FOREIGN KEY (parent_id, market_code) REFERENCES public.auto_catalog_entries(id, market_code) ON DELETE RESTRICT,
    CHECK (ends_year IS NULL OR starts_year IS NULL OR starts_year <= ends_year)
);

CREATE TABLE IF NOT EXISTS public.auto_plans (
    id VARCHAR(120) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    audience VARCHAR(20) NOT NULL CHECK (audience IN ('individual','dealer')),
    vehicle_types TEXT[],
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    price_monthly_minor BIGINT CHECK (price_monthly_minor IS NULL OR price_monthly_minor >= 0),
    price_annual_minor BIGINT CHECK (price_annual_minor IS NULL OR price_annual_minor >= 0),
    duration_days INT CHECK (duration_days IS NULL OR duration_days > 0),
    trial_days INT CHECK (trial_days IS NULL OR trial_days >= 0),
    currency VARCHAR(3) NOT NULL,
    tax_rate_bps INT NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
    entitlements JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    public_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, market_code)
);

CREATE TABLE IF NOT EXISTS public.auto_add_ons (
    id VARCHAR(120) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    vehicle_type VARCHAR(40),
    type VARCHAR(40) NOT NULL CHECK (type IN ('secure_sale','urgent','search_bump','featured','homepage_spotlight','category_spotlight','qualified_lead','sponsored_dealer','inspection_referral','warranty_referral','financing_referral','insurance_referral','delivery_referral','trade_in_referral','extra_vehicle_pack','lead_credit_pack')),
    name VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    tax_rate_bps INT NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
    validity_days INT CHECK (validity_days IS NULL OR validity_days > 0),
    credit_quantity INT CHECK (credit_quantity IS NULL OR credit_quantity > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    public_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, market_code),
    FOREIGN KEY (vehicle_type, market_code) REFERENCES public.auto_vehicle_types(type, market_code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.auto_dealer_organizations (
    id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    slug VARCHAR(180) NOT NULL UNIQUE,
    plan_id VARCHAR(120) NOT NULL,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'not_submitted' CHECK (verification_status IN ('not_submitted','pending','verified','rejected')),
    public_payload JSONB NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (plan_id, market_code) REFERENCES public.auto_plans(id, market_code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.auto_dealer_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_organization_id UUID NOT NULL REFERENCES public.auto_dealer_organizations(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    name VARCHAR(180) NOT NULL,
    public_address TEXT NOT NULL,
    city VARCHAR(160) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    phone VARCHAR(40),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    public_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dealer_organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.auto_dealer_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_organization_id UUID NOT NULL REFERENCES public.auto_dealer_organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner','admin','manager','seller','support','analyst')),
    location_ids UUID[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','suspended')),
    public_payload JSONB NOT NULL,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (dealer_organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.auto_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID UNIQUE REFERENCES public.listings(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    dealer_organization_id UUID REFERENCES public.auto_dealer_organizations(id) ON DELETE SET NULL,
    dealer_location_id UUID REFERENCES public.auto_dealer_locations(id) ON DELETE SET NULL,
    stock_reference VARCHAR(120),
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    slug VARCHAR(240) NOT NULL UNIQUE,
    vehicle_type VARCHAR(40) NOT NULL,
    lifecycle VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (lifecycle IN ('draft','pending_review','published','reserved','sold','expired','suspended','rejected','archived')),
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (moderation_status IN ('draft','pending_review','approved','rejected','suspended')),
    moderation_reason TEXT,
    market_codes TEXT[] NOT NULL CHECK (cardinality(market_codes) > 0),
    make_id VARCHAR(160),
    model_id VARCHAR(160),
    generation_id VARCHAR(160),
    trim_id VARCHAR(160),
    body_type VARCHAR(80),
    model_year SMALLINT NOT NULL CHECK (model_year BETWEEN 1880 AND 2200),
    first_registration_date DATE,
    mileage_value BIGINT NOT NULL CHECK (mileage_value >= 0),
    mileage_unit VARCHAR(10) NOT NULL CHECK (mileage_unit IN ('km','mi','hours')),
    fuel_type VARCHAR(30) NOT NULL CHECK (fuel_type IN ('petrol','diesel','electric','hybrid','plug_in_hybrid','lpg','hydrogen','other')),
    transmission VARCHAR(30) NOT NULL CHECK (transmission IN ('manual','automatic','semi_automatic','other')),
    power_kw INT CHECK (power_kw IS NULL OR power_kw >= 0),
    power_hp INT CHECK (power_hp IS NULL OR power_hp >= 0),
    fiscal_power INT CHECK (fiscal_power IS NULL OR fiscal_power >= 0),
    battery_capacity_kwh NUMERIC(8,2) CHECK (battery_capacity_kwh IS NULL OR battery_capacity_kwh >= 0),
    electric_range_km INT CHECK (electric_range_km IS NULL OR electric_range_km >= 0),
    co2_grams_per_km INT CHECK (co2_grams_per_km IS NULL OR co2_grams_per_km >= 0),
    condition VARCHAR(30) NOT NULL CHECK (condition IN ('new','excellent','good','fair','damaged','for_parts')),
    seller_type VARCHAR(20) NOT NULL CHECK (seller_type IN ('individual','dealer')),
    location_city VARCHAR(180) NOT NULL,
    warranty_months INT NOT NULL DEFAULT 0 CHECK (warranty_months >= 0),
    financing_available BOOLEAN NOT NULL DEFAULT FALSE,
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    price_includes_tax BOOLEAN NOT NULL DEFAULT TRUE,
    price_negotiable BOOLEAN NOT NULL DEFAULT FALSE,
    vin_hash VARCHAR(128),
    vin_masked VARCHAR(40),
    registration_hash VARCHAR(128),
    description_hash VARCHAR(128),
    media_hashes TEXT[] NOT NULL DEFAULT '{}',
    dynamic_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    equipment TEXT[] NOT NULL DEFAULT '{}',
    risk_signals TEXT[] NOT NULL DEFAULT '{}',
    public_payload JSONB NOT NULL,
    private_payload JSONB NOT NULL,
    search_document TSVECTOR,
    published_at TIMESTAMPTZ,
    sort_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT auto_vehicle_owner_shape CHECK ((owner_user_id IS NOT NULL)::int + (dealer_organization_id IS NOT NULL)::int = 1),
    CONSTRAINT auto_vehicle_location_shape CHECK (dealer_location_id IS NULL OR dealer_organization_id IS NOT NULL),
    CONSTRAINT auto_vehicle_electric_fields CHECK (fuel_type IN ('electric','plug_in_hybrid','hybrid') OR (battery_capacity_kwh IS NULL AND electric_range_km IS NULL))
);

-- PostgreSQL does not support array element expressions in FK definitions in
-- all supported versions. The market/type relationship is enforced through a
-- trigger below instead of the declarative expression above.
CREATE OR REPLACE FUNCTION public.enforce_auto_vehicle_type_market()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.auto_vehicle_types t
    WHERE t.type = NEW.vehicle_type AND t.market_code = ANY(NEW.market_codes) AND t.is_active
  ) THEN RAISE EXCEPTION 'vehicle type is not active for any selected market'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS auto_vehicle_type_market_guard ON public.auto_vehicles;
CREATE TRIGGER auto_vehicle_type_market_guard BEFORE INSERT OR UPDATE OF vehicle_type, market_codes ON public.auto_vehicles
FOR EACH ROW EXECUTE FUNCTION public.enforce_auto_vehicle_type_market();

CREATE UNIQUE INDEX IF NOT EXISTS auto_vehicles_vin_hash_unique_idx ON public.auto_vehicles (vin_hash) WHERE vin_hash IS NOT NULL AND lifecycle NOT IN ('archived','rejected');
CREATE UNIQUE INDEX IF NOT EXISTS auto_vehicles_registration_hash_unique_idx ON public.auto_vehicles (registration_hash) WHERE registration_hash IS NOT NULL AND lifecycle NOT IN ('archived','rejected');
CREATE UNIQUE INDEX IF NOT EXISTS auto_vehicles_dealer_stock_unique_idx ON public.auto_vehicles (dealer_organization_id, stock_reference) WHERE dealer_organization_id IS NOT NULL AND stock_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.auto_vehicle_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    current_step SMALLINT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 11),
    duplicate_check VARCHAR(30) NOT NULL DEFAULT 'not_checked' CHECK (duplicate_check IN ('not_checked','clear','possible_match','blocked')),
    vin_hash VARCHAR(128),
    vin_masked VARCHAR(40),
    registration_hash VARCHAR(128),
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_organization_id UUID NOT NULL REFERENCES public.auto_dealer_organizations(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.auto_vehicles(id) ON DELETE RESTRICT,
    from_location_id UUID NOT NULL REFERENCES public.auto_dealer_locations(id) ON DELETE RESTRICT,
    to_location_id UUID NOT NULL REFERENCES public.auto_dealer_locations(id) ON DELETE RESTRICT,
    requested_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','in_transit','completed','cancelled')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    public_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (from_location_id <> to_location_id)
);

CREATE TABLE IF NOT EXISTS public.auto_vehicle_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.auto_vehicles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('registration_certificate','roadworthiness_inspection','histovec_or_non_pledge','transfer_document','maintenance_invoice','warranty','other')),
    status VARCHAR(30) NOT NULL DEFAULT 'uploaded_private' CHECK (status IN ('missing','uploaded_private','pending_review','verified','rejected','expired')),
    storage_object_path TEXT,
    content_hash VARCHAR(128),
    public_label VARCHAR(240) NOT NULL,
    expires_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (vehicle_id, type)
);

CREATE TABLE IF NOT EXISTS public.auto_price_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.auto_vehicles(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    band VARCHAR(30) NOT NULL CHECK (band IN ('below_market','within_market','above_market','insufficient_data')),
    low_minor BIGINT CHECK (low_minor IS NULL OR low_minor >= 0),
    high_minor BIGINT CHECK (high_minor IS NULL OR high_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    sample_size INT NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
    methodology_version VARCHAR(80) NOT NULL,
    disclaimer TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    CHECK (high_minor IS NULL OR low_minor IS NULL OR low_minor <= high_minor)
);

CREATE TABLE IF NOT EXISTS public.auto_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.auto_vehicles(id) ON DELETE RESTRICT,
    dealer_organization_id UUID REFERENCES public.auto_dealer_organizations(id) ON DELETE SET NULL,
    requester_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contact_email TEXT NOT NULL,
    intention VARCHAR(30) NOT NULL CHECK (intention IN ('information','availability','callback','viewing','test_drive','price_proposal','purchase','trade_in','financing','insurance','warranty','inspection','delivery')),
    status VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (status IN ('new','qualified','in_progress','appointment','won','lost','spam')),
    source VARCHAR(30) NOT NULL CHECK (source IN ('vehicle_page','comparison','seller_store','campaign','import')),
    assigned_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    contact_consent_at TIMESTAMPTZ NOT NULL,
    spam_assessment VARCHAR(20) NOT NULL CHECK (spam_assessment IN ('clear','review','blocked')),
    next_reminder_at TIMESTAMPTZ,
    private_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_lead_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.auto_leads(id) ON DELETE CASCADE,
    actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    type VARCHAR(30) NOT NULL CHECK (type IN ('note','status_change','assignment','call','email','appointment','reminder')),
    note TEXT,
    from_status VARCHAR(30),
    to_status VARCHAR(30),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.auto_leads(id) ON DELETE CASCADE,
    dealer_location_id UUID NOT NULL REFERENCES public.auto_dealer_locations(id) ON DELETE RESTRICT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(80) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('test_drive','showroom','video_call','handover')),
    status VARCHAR(30) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','completed','cancelled','no_show')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS public.auto_inventory_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_organization_id UUID NOT NULL REFERENCES public.auto_dealer_organizations(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('csv','xml','api')),
    source_object_path TEXT,
    source_content_hash VARCHAR(128),
    status VARCHAR(40) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','validating','completed','completed_with_errors','failed')),
    total_rows INT NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
    created_count INT NOT NULL DEFAULT 0 CHECK (created_count >= 0),
    updated_count INT NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
    skipped_count INT NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
    error_count INT NOT NULL DEFAULT 0 CHECK (error_count >= 0),
    idempotency_key VARCHAR(240) NOT NULL UNIQUE,
    public_payload JSONB NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.auto_inventory_import_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID NOT NULL REFERENCES public.auto_inventory_imports(id) ON DELETE CASCADE,
    row_number INT CHECK (row_number IS NULL OR row_number > 0),
    field_name VARCHAR(160),
    error_code VARCHAR(120) NOT NULL,
    safe_message TEXT NOT NULL,
    row_fingerprint VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_organization_id UUID NOT NULL REFERENCES public.auto_dealer_organizations(id) ON DELETE CASCADE,
    label VARCHAR(160) NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    last_four VARCHAR(4) NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_partner_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES public.auto_vehicles(id) ON DELETE RESTRICT,
    requester_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('financing','insurance','inspection','warranty','delivery','trade_in')),
    provider_id VARCHAR(120),
    status VARCHAR(30) NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','consented','sent','provider_received','closed','cancelled')),
    consent_text_version VARCHAR(120) NOT NULL,
    consented_at TIMESTAMPTZ,
    provider_reference VARCHAR(240),
    private_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_organization_id UUID NOT NULL REFERENCES public.auto_dealer_organizations(id) ON DELETE RESTRICT,
    plan_id VARCHAR(120) NOT NULL,
    market_code VARCHAR(2) NOT NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('incomplete','trialing','active','past_due','cancelled','expired')),
    provider VARCHAR(40),
    provider_customer_reference VARCHAR(240),
    provider_subscription_reference VARCHAR(240),
    current_period_starts_at TIMESTAMPTZ,
    current_period_ends_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (plan_id, market_code) REFERENCES public.auto_plans(id, market_code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.auto_add_on_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    dealer_organization_id UUID REFERENCES public.auto_dealer_organizations(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.auto_vehicles(id) ON DELETE RESTRICT,
    add_on_id VARCHAR(120) NOT NULL,
    market_code VARCHAR(2) NOT NULL,
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    tax_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
    status VARCHAR(30) NOT NULL CHECK (status IN ('checkout_pending','requires_action','paid','failed','cancelled','refunded')),
    provider_checkout_reference VARCHAR(240),
    provider_payment_reference VARCHAR(240),
    idempotency_key VARCHAR(240) NOT NULL UNIQUE,
    activates_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (add_on_id, market_code) REFERENCES public.auto_add_ons(id, market_code) ON DELETE RESTRICT,
    CHECK ((buyer_user_id IS NOT NULL)::int + (dealer_organization_id IS NOT NULL)::int = 1)
);

CREATE TABLE IF NOT EXISTS public.auto_provider_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(60) NOT NULL,
    provider_event_id VARCHAR(240) NOT NULL UNIQUE,
    event_type VARCHAR(160) NOT NULL,
    payload_hash VARCHAR(128) NOT NULL,
    processed_at TIMESTAMPTZ,
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES public.auto_vehicles(id) ON DELETE SET NULL,
    dealer_organization_id UUID REFERENCES public.auto_dealer_organizations(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type VARCHAR(120) NOT NULL,
    anonymous_session_hash VARCHAR(128),
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.auto_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    market_code VARCHAR(2) REFERENCES public.markets(code) ON DELETE SET NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id UUID,
    action VARCHAR(120) NOT NULL,
    before_payload JSONB,
    after_payload JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search and operational indexes. Frequently combined filters lead each B-tree;
-- sparse states use partial indexes and dynamic attributes use GIN.
CREATE INDEX IF NOT EXISTS auto_catalog_parent_idx ON public.auto_catalog_entries (market_code, parent_id, kind, label) WHERE is_active;
CREATE INDEX IF NOT EXISTS auto_attributes_filter_idx ON public.auto_attribute_definitions (market_code, sort_order) WHERE is_active AND is_filterable;
CREATE INDEX IF NOT EXISTS auto_dealer_members_user_idx ON public.auto_dealer_members (user_id, status, dealer_organization_id);
CREATE INDEX IF NOT EXISTS auto_dealer_locations_org_idx ON public.auto_dealer_locations (dealer_organization_id, is_active, city);
CREATE INDEX IF NOT EXISTS auto_vehicles_market_status_sort_idx ON public.auto_vehicles USING GIN (market_codes);
CREATE INDEX IF NOT EXISTS auto_vehicles_search_filters_idx ON public.auto_vehicles (vehicle_type, make_id, model_id, lifecycle, model_year DESC, price_minor, sort_date DESC);
CREATE INDEX IF NOT EXISTS auto_vehicles_fuel_transmission_idx ON public.auto_vehicles (fuel_type, transmission, price_minor, model_year DESC) WHERE lifecycle = 'published';
CREATE INDEX IF NOT EXISTS auto_vehicles_buyer_filters_idx ON public.auto_vehicles (body_type, seller_type, warranty_months, financing_available, model_year DESC) WHERE lifecycle = 'published' AND moderation_status = 'approved';
CREATE INDEX IF NOT EXISTS auto_vehicles_location_city_idx ON public.auto_vehicles (LOWER(location_city), sort_date DESC) WHERE lifecycle = 'published' AND moderation_status = 'approved';
CREATE INDEX IF NOT EXISTS auto_vehicles_dealer_stock_idx ON public.auto_vehicles (dealer_organization_id, lifecycle, updated_at DESC) WHERE dealer_organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS auto_vehicles_owner_idx ON public.auto_vehicles (owner_user_id, lifecycle, updated_at DESC) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS auto_vehicles_search_document_idx ON public.auto_vehicles USING GIN (search_document);
CREATE INDEX IF NOT EXISTS auto_vehicles_dynamic_attributes_idx ON public.auto_vehicles USING GIN (dynamic_attributes jsonb_path_ops);
CREATE INDEX IF NOT EXISTS auto_vehicles_equipment_idx ON public.auto_vehicles USING GIN (equipment);
CREATE INDEX IF NOT EXISTS auto_vehicles_description_hash_idx ON public.auto_vehicles (description_hash) WHERE description_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS auto_vehicles_media_hashes_gin_idx ON public.auto_vehicles USING GIN (media_hashes);
CREATE INDEX IF NOT EXISTS auto_vehicles_pending_moderation_idx ON public.auto_vehicles (moderation_status, created_at) WHERE moderation_status = 'pending_review';
CREATE INDEX IF NOT EXISTS auto_vehicles_risk_idx ON public.auto_vehicles USING GIN (risk_signals) WHERE cardinality(risk_signals) > 0;
CREATE INDEX IF NOT EXISTS auto_drafts_owner_updated_idx ON public.auto_vehicle_drafts (owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS auto_documents_vehicle_status_idx ON public.auto_vehicle_documents (vehicle_id, status, type);
CREATE INDEX IF NOT EXISTS auto_price_estimates_vehicle_idx ON public.auto_price_estimates (vehicle_id, generated_at DESC, expires_at);
CREATE INDEX IF NOT EXISTS auto_leads_dealer_status_idx ON public.auto_leads (dealer_organization_id, status, created_at DESC) WHERE dealer_organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS auto_leads_assignee_reminder_idx ON public.auto_leads (assigned_user_id, next_reminder_at) WHERE assigned_user_id IS NOT NULL AND status IN ('new','qualified','in_progress','appointment');
CREATE INDEX IF NOT EXISTS auto_leads_requester_idx ON public.auto_leads (requester_user_id, created_at DESC) WHERE requester_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS auto_lead_actions_lead_idx ON public.auto_lead_actions (lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS auto_appointments_location_schedule_idx ON public.auto_appointments (dealer_location_id, starts_at, ends_at) WHERE status IN ('requested','confirmed');
CREATE INDEX IF NOT EXISTS auto_stock_transfers_org_status_idx ON public.auto_stock_transfers (dealer_organization_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS auto_imports_org_status_idx ON public.auto_inventory_imports (dealer_organization_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS auto_referrals_market_status_idx ON public.auto_partner_referrals (market_code, type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS auto_subscriptions_org_status_idx ON public.auto_subscriptions (dealer_organization_id, status, current_period_ends_at);
CREATE INDEX IF NOT EXISTS auto_analytics_market_event_idx ON public.auto_analytics_events (market_code, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS auto_audit_entity_idx ON public.auto_audit_logs (entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_auto_search_document()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_document := to_tsvector('french', unaccent(COALESCE(NEW.public_payload->>'title','') || ' ' || COALESCE(NEW.public_payload->>'description','') || ' ' || COALESCE(NEW.public_payload->>'makeLabel','') || ' ' || COALESCE(NEW.public_payload->>'modelLabel','')));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_vehicle_search_document_trigger ON public.auto_vehicles;
CREATE TRIGGER auto_vehicle_search_document_trigger BEFORE INSERT OR UPDATE OF public_payload ON public.auto_vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_auto_search_document();

CREATE OR REPLACE FUNCTION public.is_auto_dealer_member(target_organization UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.auto_dealer_members m
    WHERE m.dealer_organization_id = target_organization
      AND m.user_id = public.current_profile_id()
      AND m.status = 'active'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auto_admin_metrics(p_market_code VARCHAR)
RETURNS JSONB AS $$
  SELECT jsonb_build_object(
    'activeVehicles', COUNT(*) FILTER (WHERE lifecycle = 'published'),
    'pendingModeration', COUNT(*) FILTER (WHERE moderation_status = 'pending_review'),
    'dealers', (SELECT COUNT(*) FROM public.auto_dealer_organizations WHERE market_code = p_market_code),
    'newLeads30d', (SELECT COUNT(*) FROM public.auto_leads WHERE created_at >= NOW() - INTERVAL '30 days'),
    'duplicateSignals30d', COUNT(*) FILTER (WHERE risk_signals && ARRAY['duplicate_vin','duplicate_registration']),
    'partnerReferrals30d', (SELECT COUNT(*) FROM public.auto_partner_referrals WHERE market_code = p_market_code AND created_at >= NOW() - INTERVAL '30 days')
  ) FROM public.auto_vehicles WHERE p_market_code = ANY(market_codes);
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- RLS: no frontend direct table access is required. Public vehicle browsing is
-- served by the domain API from privacy-safe public_payload values.
ALTER TABLE public.auto_market_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_attribute_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_catalog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_dealer_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_dealer_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_dealer_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_vehicle_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_price_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_lead_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_inventory_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_inventory_import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_add_on_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enabled Auto market configs are public" ON public.auto_market_configs FOR SELECT USING (is_enabled OR public.is_admin());
CREATE POLICY "Active Auto vehicle types are public" ON public.auto_vehicle_types FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Active Auto attributes are public" ON public.auto_attribute_definitions FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Active Auto catalog is public" ON public.auto_catalog_entries FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Active Auto plans are public" ON public.auto_plans FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Active Auto add-ons are public" ON public.auto_add_ons FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Auto market config is admin managed" ON public.auto_market_configs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Auto vehicle types are admin managed" ON public.auto_vehicle_types FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Auto attributes are admin managed" ON public.auto_attribute_definitions FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Auto catalog is admin managed" ON public.auto_catalog_entries FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Auto plans are admin managed" ON public.auto_plans FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Auto add-ons are admin managed" ON public.auto_add_ons FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Verified Auto dealers are public" ON public.auto_dealer_organizations FOR SELECT USING (verification_status = 'verified' OR public.is_auto_dealer_member(id) OR public.is_moderator_or_admin());
CREATE POLICY "Dealer locations are public for verified dealers" ON public.auto_dealer_locations FOR SELECT USING (dealer_organization_id IN (SELECT id FROM public.auto_dealer_organizations WHERE verification_status = 'verified') OR public.is_auto_dealer_member(dealer_organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Dealer members see their team" ON public.auto_dealer_members FOR SELECT USING (public.is_auto_dealer_member(dealer_organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Dealer admins manage their team" ON public.auto_dealer_members FOR ALL
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.auto_dealer_members manager WHERE manager.dealer_organization_id = auto_dealer_members.dealer_organization_id AND manager.user_id = public.current_profile_id() AND manager.role IN ('owner','admin') AND manager.status = 'active'))
  WITH CHECK (public.is_admin() OR public.is_auto_dealer_member(dealer_organization_id));

CREATE POLICY "Vehicle owners and reviewers read private rows" ON public.auto_vehicles FOR SELECT USING (owner_user_id = public.current_profile_id() OR public.is_auto_dealer_member(dealer_organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Vehicle owners manage rows" ON public.auto_vehicles FOR ALL
  USING (owner_user_id = public.current_profile_id() OR public.is_auto_dealer_member(dealer_organization_id) OR public.is_admin())
  WITH CHECK (owner_user_id = public.current_profile_id() OR public.is_auto_dealer_member(dealer_organization_id) OR public.is_admin());
CREATE POLICY "Owners manage Auto drafts" ON public.auto_vehicle_drafts FOR ALL USING (owner_user_id = public.current_profile_id() OR public.is_admin()) WITH CHECK (owner_user_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Vehicle documents stay owner and reviewer private" ON public.auto_vehicle_documents FOR ALL
  USING (vehicle_id IN (SELECT id FROM public.auto_vehicles WHERE owner_user_id = public.current_profile_id() OR public.is_auto_dealer_member(dealer_organization_id)) OR public.is_moderator_or_admin())
  WITH CHECK (vehicle_id IN (SELECT id FROM public.auto_vehicles WHERE owner_user_id = public.current_profile_id() OR public.is_auto_dealer_member(dealer_organization_id)) OR public.is_moderator_or_admin());
CREATE POLICY "Price estimates follow vehicle ownership" ON public.auto_price_estimates FOR SELECT USING (vehicle_id IN (SELECT id FROM public.auto_vehicles) OR public.is_moderator_or_admin());

CREATE POLICY "Lead requesters and recipient dealers read leads" ON public.auto_leads FOR SELECT USING (requester_user_id = public.current_profile_id() OR public.is_auto_dealer_member(dealer_organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Recipient dealers update leads" ON public.auto_leads FOR UPDATE USING (public.is_auto_dealer_member(dealer_organization_id) OR public.is_admin());
CREATE POLICY "Lead actions stay with recipient dealer" ON public.auto_lead_actions FOR ALL
  USING (lead_id IN (SELECT id FROM public.auto_leads WHERE public.is_auto_dealer_member(dealer_organization_id)) OR public.is_admin())
  WITH CHECK (actor_user_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Appointments stay with participants" ON public.auto_appointments FOR SELECT USING (lead_id IN (SELECT id FROM public.auto_leads) OR public.is_moderator_or_admin());
CREATE POLICY "Dealer members access stock transfers" ON public.auto_stock_transfers FOR SELECT USING (public.is_auto_dealer_member(dealer_organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Dealer managers manage stock transfers" ON public.auto_stock_transfers FOR ALL
  USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.auto_dealer_members manager WHERE manager.dealer_organization_id = auto_stock_transfers.dealer_organization_id AND manager.user_id = public.current_profile_id() AND manager.role IN ('owner','admin','manager') AND manager.status = 'active'))
  WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.auto_dealer_members manager WHERE manager.dealer_organization_id = auto_stock_transfers.dealer_organization_id AND manager.user_id = public.current_profile_id() AND manager.role IN ('owner','admin','manager') AND manager.status = 'active'));

CREATE POLICY "Dealer members access imports" ON public.auto_inventory_imports FOR SELECT USING (public.is_auto_dealer_member(dealer_organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Dealer members create imports" ON public.auto_inventory_imports FOR INSERT WITH CHECK (public.is_auto_dealer_member(dealer_organization_id) AND requested_by = public.current_profile_id());
CREATE POLICY "Import errors follow the import" ON public.auto_inventory_import_errors FOR SELECT USING (import_id IN (SELECT id FROM public.auto_inventory_imports) OR public.is_moderator_or_admin());
CREATE POLICY "API credentials are dealer admin private" ON public.auto_api_credentials FOR SELECT USING (public.is_auto_dealer_member(dealer_organization_id) OR public.is_admin());
CREATE POLICY "Referral requesters and admins read referrals" ON public.auto_partner_referrals FOR SELECT USING (requester_user_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Dealer subscriptions are member visible" ON public.auto_subscriptions FOR SELECT USING (public.is_auto_dealer_member(dealer_organization_id) OR public.is_admin());
CREATE POLICY "Add-on purchases are buyer or dealer visible" ON public.auto_add_on_purchases FOR SELECT USING (buyer_user_id = public.current_profile_id() OR public.is_auto_dealer_member(dealer_organization_id) OR public.is_admin());
CREATE POLICY "Provider events are admin only" ON public.auto_provider_events FOR SELECT USING (public.is_admin());
CREATE POLICY "Auto analytics are admin managed" ON public.auto_analytics_events FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Auto audit logs are admin read" ON public.auto_audit_logs FOR SELECT USING (public.is_admin());

COMMENT ON COLUMN public.auto_vehicles.public_payload IS 'Privacy-safe versioned API view model. Never store VIN, registration, exact private address, document path or fraud signal here.';
COMMENT ON COLUMN public.auto_vehicles.private_payload IS 'Server-side vehicle model. Base-table RLS forbids anonymous access.';
COMMENT ON COLUMN public.auto_vehicles.vin_hash IS 'One-way normalized hash for duplicate detection. The full VIN is never a public field.';
COMMENT ON TABLE public.auto_vehicle_documents IS 'Private document metadata. Storage objects must use a private bucket and short-lived signed reviewer access.';
COMMENT ON TABLE public.auto_partner_referrals IS 'Referral audit record only. Creating a row never means financing, insurance, valuation or partner approval.';
COMMENT ON TABLE public.auto_provider_events IS 'Idempotent server-side webhook ledger. Browser clients never write provider events.';
