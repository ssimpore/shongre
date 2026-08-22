-- =============================================================================
-- SHONGRE COURS — VERSIONED TUTORING VERTICAL
-- Migration 00011
--
-- Generic listings remain the marketplace publication primitive.  Course
-- profiles, offers, availability, evidence, leads and future lesson commerce
-- are normalized here and linked to listings without duplicating identity.
-- Phase 2 booking/payment flags default to false for every market.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vertical_definitions (
    type VARCHAR(50) PRIMARY KEY,
    current_schema_version INT NOT NULL CHECK (current_schema_version > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    public_name VARCHAR(120) NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.vertical_definitions (type, current_schema_version, public_name, configuration)
VALUES ('tutoring', 1, 'Shongre Cours', '{"compatibleWithGenericListings":true}'::jsonb)
ON CONFLICT (type) DO UPDATE SET
    current_schema_version = EXCLUDED.current_schema_version,
    public_name = EXCLUDED.public_name,
    updated_at = NOW();

ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS vertical_type VARCHAR(50) REFERENCES public.vertical_definitions(type) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS vertical_entity_id UUID,
    ADD COLUMN IF NOT EXISTS vertical_schema_version INT;

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_vertical_shape_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_vertical_shape_check CHECK (
    (vertical_type IS NULL AND vertical_entity_id IS NULL AND vertical_schema_version IS NULL)
    OR
    (vertical_type IS NOT NULL AND vertical_entity_id IS NOT NULL AND vertical_schema_version > 0)
);

CREATE INDEX IF NOT EXISTS listings_vertical_entity_idx
    ON public.listings (vertical_type, vertical_entity_id)
    WHERE vertical_type IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.course_market_configs (
    market_code VARCHAR(2) PRIMARY KEY REFERENCES public.markets(code) ON DELETE RESTRICT,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    locale VARCHAR(16) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    timezone VARCHAR(80) NOT NULL,
    minimum_meaningful_review_count INT NOT NULL DEFAULT 5 CHECK (minimum_meaningful_review_count >= 0),
    minor_age_threshold INT NOT NULL DEFAULT 18 CHECK (minor_age_threshold BETWEEN 13 AND 21),
    learner_request_validity_days INT NOT NULL DEFAULT 14 CHECK (learner_request_validity_days > 0),
    lead_validity_hours INT NOT NULL DEFAULT 72 CHECK (lead_validity_hours > 0),
    default_lead_credit_cost INT NOT NULL DEFAULT 1 CHECK (default_lead_credit_cost >= 0),
    commission_rate_bps INT NOT NULL DEFAULT 0 CHECK (commission_rate_bps BETWEEN 0 AND 10000),
    cancellation_window_hours INT NOT NULL DEFAULT 24 CHECK (cancellation_window_hours >= 0),
    learner_requests_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    qualified_leads_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    booking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    payments_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    packages_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    recurring_lessons_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    tax_eligibility_wording TEXT NOT NULL,
    safety_guidance JSONB NOT NULL DEFAULT '[]'::jsonb,
    config_payload JSONB NOT NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT course_market_payment_gate CHECK (
        NOT payments_enabled OR (booking_enabled AND payouts_enabled)
    ),
    CONSTRAINT course_market_recurring_gate CHECK (
        NOT recurring_lessons_enabled OR packages_enabled
    )
);

CREATE TABLE IF NOT EXISTS public.course_subject_levels (
    id VARCHAR(100) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    label VARCHAR(160) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    public_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, market_code)
);

CREATE TABLE IF NOT EXISTS public.course_subjects (
    id VARCHAR(120) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    slug VARCHAR(160) NOT NULL,
    parent_id VARCHAR(120),
    label VARCHAR(200) NOT NULL,
    description TEXT,
    icon_name VARCHAR(100),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    public_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, market_code),
    UNIQUE (market_code, slug),
    FOREIGN KEY (parent_id, market_code) REFERENCES public.course_subjects(id, market_code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.course_subject_allowed_levels (
    subject_id VARCHAR(120) NOT NULL,
    level_id VARCHAR(100) NOT NULL,
    market_code VARCHAR(2) NOT NULL,
    PRIMARY KEY (subject_id, level_id, market_code),
    FOREIGN KEY (subject_id, market_code) REFERENCES public.course_subjects(id, market_code) ON DELETE CASCADE,
    FOREIGN KEY (level_id, market_code) REFERENCES public.course_subject_levels(id, market_code) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.course_plans (
    id VARCHAR(100) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    audience VARCHAR(30) NOT NULL CHECK (audience IN ('individual', 'organization')),
    monthly_price_minor BIGINT CHECK (monthly_price_minor IS NULL OR monthly_price_minor >= 0),
    annual_price_minor BIGINT CHECK (annual_price_minor IS NULL OR annual_price_minor >= 0),
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

CREATE TABLE IF NOT EXISTS public.course_add_ons (
    id VARCHAR(100) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL CHECK (type IN (
        'featured_subject', 'local_spotlight', 'search_bump', 'qualified_lead',
        'profile_verification', 'promotional_credits'
    )),
    name VARCHAR(160) NOT NULL,
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    validity_days INT CHECK (validity_days IS NULL OR validity_days > 0),
    credit_quantity INT CHECK (credit_quantity IS NULL OR credit_quantity > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    public_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, market_code)
);

CREATE TABLE IF NOT EXISTS public.course_organizations (
    id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    slug VARCHAR(180) NOT NULL UNIQUE,
    verification_status VARCHAR(30) NOT NULL DEFAULT 'not_submitted' CHECK (verification_status IN (
        'not_submitted', 'pending', 'verified', 'rejected', 'expired'
    )),
    plan_id VARCHAR(100) NOT NULL,
    public_payload JSONB NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (plan_id, market_code) REFERENCES public.course_plans(id, market_code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.course_organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.course_organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'tutor', 'lead_coordinator', 'billing')),
    permissions TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended', 'removed')),
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.course_tutor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.course_organizations(id) ON DELETE SET NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    slug VARCHAR(180) NOT NULL UNIQUE,
    profile_type VARCHAR(30) NOT NULL CHECK (profile_type IN ('individual', 'organization_member')),
    headline VARCHAR(240) NOT NULL,
    biography TEXT NOT NULL,
    teaching_approach TEXT NOT NULL,
    experience_years INT NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
    moderation_status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (moderation_status IN (
        'draft', 'pending_review', 'approved', 'rejected', 'suspended'
    )),
    profile_completion_percent INT NOT NULL DEFAULT 0 CHECK (profile_completion_percent BETWEEN 0 AND 100),
    plan_id VARCHAR(100) NOT NULL,
    response_time_minutes INT CHECK (response_time_minutes IS NULL OR response_time_minutes >= 0),
    response_rate_percent NUMERIC(5,2) CHECK (response_rate_percent IS NULL OR response_rate_percent BETWEEN 0 AND 100),
    rating NUMERIC(3,2) CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
    review_count INT NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    rating_is_statistically_meaningful BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    public_payload JSONB NOT NULL,
    private_payload JSONB NOT NULL,
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (plan_id, market_code) REFERENCES public.course_plans(id, market_code) ON DELETE RESTRICT,
    CONSTRAINT course_profile_organization_shape CHECK (
        (profile_type = 'individual' AND organization_id IS NULL)
        OR (profile_type = 'organization_member' AND organization_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS course_tutor_individual_user_unique_idx
    ON public.course_tutor_profiles (user_id, market_code)
    WHERE organization_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS course_tutor_org_user_unique_idx
    ON public.course_tutor_profiles (user_id, organization_id, market_code)
    WHERE organization_id IS NOT NULL;

ALTER TABLE public.course_organization_members
    ADD COLUMN IF NOT EXISTS tutor_profile_id UUID REFERENCES public.course_tutor_profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.course_tutor_subjects (
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
    subject_id VARCHAR(120) NOT NULL,
    market_code VARCHAR(2) NOT NULL,
    PRIMARY KEY (tutor_profile_id, subject_id),
    FOREIGN KEY (subject_id, market_code) REFERENCES public.course_subjects(id, market_code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.course_tutor_levels (
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
    level_id VARCHAR(100) NOT NULL,
    market_code VARCHAR(2) NOT NULL,
    PRIMARY KEY (tutor_profile_id, level_id),
    FOREIGN KEY (level_id, market_code) REFERENCES public.course_subject_levels(id, market_code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.course_tutor_languages (
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
    language_code VARCHAR(16) NOT NULL,
    proficiency VARCHAR(20) NOT NULL DEFAULT 'teaching' CHECK (proficiency IN ('conversational', 'fluent', 'native', 'teaching')),
    PRIMARY KEY (tutor_profile_id, language_code)
);

CREATE TABLE IF NOT EXISTS public.course_tutor_delivery_modes (
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
    delivery_mode VARCHAR(20) NOT NULL CHECK (delivery_mode IN ('online', 'in_person', 'hybrid')),
    PRIMARY KEY (tutor_profile_id, delivery_mode)
);

CREATE TABLE IF NOT EXISTS public.course_service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_profile_id UUID REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.course_organizations(id) ON DELETE CASCADE,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    city_label VARCHAR(160) NOT NULL,
    postal_code_prefix VARCHAR(12),
    region VARCHAR(160),
    center_latitude NUMERIC(10,7),
    center_longitude NUMERIC(10,7),
    radius_km NUMERIC(6,2) NOT NULL CHECK (radius_km BETWEEN 0 AND 250),
    public_location_label VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT course_service_area_owner_check CHECK (
        (tutor_profile_id IS NOT NULL)::int + (organization_id IS NOT NULL)::int = 1
    )
);
CREATE UNIQUE INDEX IF NOT EXISTS course_service_area_tutor_unique_idx
    ON public.course_service_areas (tutor_profile_id)
    WHERE tutor_profile_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS course_service_area_organization_city_unique_idx
    ON public.course_service_areas (organization_id, city_label)
    WHERE organization_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.course_availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    starts_at_local TIME NOT NULL,
    ends_at_local TIME NOT NULL,
    timezone VARCHAR(80) NOT NULL,
    delivery_modes TEXT[] NOT NULL,
    effective_from DATE,
    effective_until DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT course_availability_time_order CHECK (starts_at_local < ends_at_local),
    CONSTRAINT course_availability_effective_order CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_from <= effective_until)
);

CREATE TABLE IF NOT EXISTS public.course_availability_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    reason VARCHAR(240),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT course_availability_exception_order CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS public.course_qualification_types (
    id VARCHAR(100) NOT NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    label VARCHAR(180) NOT NULL,
    evidence_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    validity_days INT CHECK (validity_days IS NULL OR validity_days > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id, market_code)
);

CREATE TABLE IF NOT EXISTS public.course_tutor_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
    qualification_type_id VARCHAR(100) NOT NULL,
    market_code VARCHAR(2) NOT NULL,
    label VARCHAR(240) NOT NULL,
    issuer VARCHAR(240),
    issued_year INT CHECK (issued_year IS NULL OR issued_year BETWEEN 1900 AND 2200),
    evidence_status VARCHAR(30) NOT NULL DEFAULT 'self_declared' CHECK (evidence_status IN (
        'self_declared', 'uploaded_private', 'provider_verified', 'shongre_verified'
    )),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'not_submitted' CHECK (verification_status IN (
        'not_submitted', 'pending', 'verified', 'rejected', 'expired'
    )),
    public_label VARCHAR(240) NOT NULL,
    public_details_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (qualification_type_id, market_code) REFERENCES public.course_qualification_types(id, market_code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.course_qualification_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qualification_id UUID NOT NULL REFERENCES public.course_tutor_qualifications(id) ON DELETE CASCADE,
    storage_object_path TEXT NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    original_filename_hash VARCHAR(128),
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    provider_reference VARCHAR(240),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID UNIQUE REFERENCES public.listings(id) ON DELETE SET NULL,
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.course_organizations(id) ON DELETE SET NULL,
    schema_version INT NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    slug VARCHAR(220) NOT NULL UNIQUE,
    title VARCHAR(240) NOT NULL,
    description TEXT NOT NULL,
    subject_id VARCHAR(120) NOT NULL,
    market_code VARCHAR(2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_review', 'published', 'paused', 'suspended', 'archived'
    )),
    capacity_status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (capacity_status IN ('available', 'limited', 'full')),
    trial_lesson_available BOOLEAN NOT NULL DEFAULT FALSE,
    from_price_minor BIGINT NOT NULL CHECK (from_price_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    public_payload JSONB NOT NULL,
    private_payload JSONB NOT NULL,
    search_vector TSVECTOR,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (subject_id, market_code) REFERENCES public.course_subjects(id, market_code) ON DELETE RESTRICT
);

-- `vertical_entity_id` is intentionally not a foreign key: it is a polymorphic
-- reference whose target depends on `vertical_type`.  Domain publication owns
-- the pairing and the shape constraint above prevents half-populated links.

CREATE TABLE IF NOT EXISTS public.course_offer_levels (
    course_offer_id UUID NOT NULL REFERENCES public.course_offers(id) ON DELETE CASCADE,
    level_id VARCHAR(100) NOT NULL,
    market_code VARCHAR(2) NOT NULL,
    PRIMARY KEY (course_offer_id, level_id),
    FOREIGN KEY (level_id, market_code) REFERENCES public.course_subject_levels(id, market_code) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.course_offer_delivery_modes (
    course_offer_id UUID NOT NULL REFERENCES public.course_offers(id) ON DELETE CASCADE,
    delivery_mode VARCHAR(20) NOT NULL CHECK (delivery_mode IN ('online', 'in_person', 'hybrid')),
    PRIMARY KEY (course_offer_id, delivery_mode)
);

CREATE TABLE IF NOT EXISTS public.course_offer_languages (
    course_offer_id UUID NOT NULL REFERENCES public.course_offers(id) ON DELETE CASCADE,
    language_code VARCHAR(16) NOT NULL,
    PRIMARY KEY (course_offer_id, language_code)
);

CREATE TABLE IF NOT EXISTS public.course_pricing_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offer_id UUID NOT NULL REFERENCES public.course_offers(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('hourly', 'trial', 'package')),
    label VARCHAR(180) NOT NULL,
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    lesson_count INT CHECK (lesson_count IS NULL OR lesson_count > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_learner_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    subject_id VARCHAR(120) NOT NULL,
    level_id VARCHAR(100) NOT NULL,
    objective TEXT NOT NULL,
    delivery_modes TEXT[] NOT NULL,
    preferred_schedule TEXT[] NOT NULL,
    city VARCHAR(160),
    radius_km NUMERIC(6,2) CHECK (radius_km IS NULL OR radius_km BETWEEN 0 AND 250),
    budget_min_minor BIGINT CHECK (budget_min_minor IS NULL OR budget_min_minor >= 0),
    budget_max_minor BIGINT CHECK (budget_max_minor IS NULL OR budget_max_minor >= 0),
    currency VARCHAR(3),
    desired_start_date DATE NOT NULL,
    learner_age_band VARCHAR(20) NOT NULL CHECK (learner_age_band IN ('under_13', '13_15', '16_17', 'adult')),
    guardian_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    guardian_consent_confirmed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'matched', 'closed', 'expired')),
    private_payload JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (subject_id, market_code) REFERENCES public.course_subjects(id, market_code) ON DELETE RESTRICT,
    FOREIGN KEY (level_id, market_code) REFERENCES public.course_subject_levels(id, market_code) ON DELETE RESTRICT,
    CONSTRAINT course_request_budget_order CHECK (budget_max_minor IS NULL OR budget_min_minor IS NULL OR budget_min_minor <= budget_max_minor),
    CONSTRAINT course_request_minor_guardian_check CHECK (
        learner_age_band = 'adult' OR guardian_consent_confirmed_at IS NOT NULL
    )
);

CREATE TABLE IF NOT EXISTS public.course_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_request_id UUID NOT NULL REFERENCES public.course_learner_requests(id) ON DELETE CASCADE,
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.course_organizations(id) ON DELETE SET NULL,
    state VARCHAR(30) NOT NULL DEFAULT 'offered' CHECK (state IN (
        'offered', 'viewed', 'accepted', 'declined', 'contact_released', 'converted',
        'expired', 'invalid_disputed', 'invalid_confirmed'
    )),
    relevance_score NUMERIC(5,4) NOT NULL CHECK (relevance_score BETWEEN 0 AND 1),
    relevance_reasons TEXT[] NOT NULL DEFAULT '{}',
    contact_release_status VARCHAR(20) NOT NULL DEFAULT 'withheld' CHECK (contact_release_status IN ('withheld', 'released', 'revoked')),
    credit_cost INT NOT NULL DEFAULT 0 CHECK (credit_cost >= 0),
    decline_reason VARCHAR(240),
    credit_restored_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    private_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (learner_request_id, tutor_profile_id)
);

CREATE TABLE IF NOT EXISTS public.course_lead_credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_profile_id UUID REFERENCES public.course_tutor_profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.course_organizations(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.course_leads(id) ON DELETE SET NULL,
    delta INT NOT NULL CHECK (delta <> 0),
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('plan_grant', 'purchase', 'lead_acceptance', 'invalid_lead_restoration', 'admin_adjustment', 'expiry')),
    balance_after INT NOT NULL CHECK (balance_after >= 0),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT course_credit_owner_check CHECK (
        (tutor_profile_id IS NOT NULL)::int + (organization_id IS NOT NULL)::int = 1
    )
);

-- Phase 2 tables exist so the workflow and its invariants can be tested before
-- a market is enabled.  No endpoint may insert while market flags are false.
CREATE TABLE IF NOT EXISTS public.course_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_offer_id UUID NOT NULL REFERENCES public.course_offers(id) ON DELETE RESTRICT,
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE RESTRICT,
    learner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name VARCHAR(180) NOT NULL,
    lesson_count INT NOT NULL CHECK (lesson_count > 0),
    remaining_lessons INT NOT NULL CHECK (remaining_lessons >= 0),
    lesson_duration_minutes INT NOT NULL CHECK (lesson_duration_minutes > 0),
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    recurring BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'exhausted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE RESTRICT,
    course_offer_id UUID NOT NULL REFERENCES public.course_offers(id) ON DELETE RESTRICT,
    package_id UUID REFERENCES public.course_packages(id) ON DELETE SET NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(80) NOT NULL,
    delivery_mode VARCHAR(20) NOT NULL CHECK (delivery_mode IN ('online', 'in_person', 'hybrid')),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'disputed', 'refunded'
    )),
    price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
    currency VARCHAR(3) NOT NULL,
    platform_commission_minor BIGINT NOT NULL DEFAULT 0 CHECK (platform_commission_minor >= 0),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'not_required' CHECK (payment_status IN (
        'not_required', 'requires_action', 'authorized', 'captured', 'cancelled',
        'partially_refunded', 'refunded', 'failed'
    )),
    provider_payment_reference VARCHAR(240),
    payout_status VARCHAR(30) NOT NULL DEFAULT 'not_applicable' CHECK (payout_status IN (
        'not_applicable', 'pending', 'eligible', 'paid', 'held', 'failed'
    )),
    provider_payout_reference VARCHAR(240),
    cancellation_policy_version VARCHAR(100) NOT NULL,
    idempotency_key VARCHAR(240) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT course_booking_time_order CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS public.course_lesson_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.course_bookings(id) ON DELETE CASCADE,
    package_id UUID REFERENCES public.course_packages(id) ON DELETE SET NULL,
    sequence INT NOT NULL CHECK (sequence > 0),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show', 'disputed')),
    attendance_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (booking_id, sequence),
    CONSTRAINT course_session_time_order CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS public.course_payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.course_bookings(id) ON DELETE CASCADE,
    provider VARCHAR(60) NOT NULL,
    provider_event_id VARCHAR(240) NOT NULL UNIQUE,
    event_type VARCHAR(120) NOT NULL,
    payload_hash VARCHAR(128) NOT NULL,
    processed_at TIMESTAMPTZ,
    processing_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.course_bookings(id) ON DELETE RESTRICT,
    converted_lead_id UUID REFERENCES public.course_leads(id) ON DELETE RESTRICT,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (moderation_status IN ('pending', 'published', 'hidden', 'removed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT course_review_verified_interaction_check CHECK (
        (booking_id IS NOT NULL)::int + (converted_lead_id IS NOT NULL)::int = 1
    ),
    UNIQUE (author_user_id, booking_id),
    UNIQUE (author_user_id, converted_lead_id)
);

CREATE OR REPLACE FUNCTION public.enforce_course_review_interaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.course_bookings b
        WHERE b.id = NEW.booking_id
          AND b.learner_user_id = NEW.author_user_id
          AND b.tutor_profile_id = NEW.tutor_profile_id
          AND b.status = 'completed'
    ) THEN
        RAISE EXCEPTION 'course review requires a completed booking';
    END IF;
    IF NEW.converted_lead_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.course_leads l
        JOIN public.course_learner_requests r ON r.id = l.learner_request_id
        WHERE l.id = NEW.converted_lead_id
          AND l.tutor_profile_id = NEW.tutor_profile_id
          AND r.requester_user_id = NEW.author_user_id
          AND l.state = 'converted'
    ) THEN
        RAISE EXCEPTION 'course review requires a converted verified lead';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS course_review_interaction_guard ON public.course_reviews;
CREATE TRIGGER course_review_interaction_guard
BEFORE INSERT OR UPDATE ON public.course_reviews
FOR EACH ROW EXECUTE FUNCTION public.enforce_course_review_interaction();

CREATE TABLE IF NOT EXISTS public.course_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN (
        'tutor_onboarding_started', 'tutor_onboarding_completed', 'tutor_published',
        'learner_search', 'tutor_profile_view', 'learner_contact', 'lead_offered',
        'lead_accepted', 'lead_declined', 'first_lesson_completed', 'repeat_booking',
        'subscription_started', 'subscription_cancelled', 'lead_purchased',
        'commission_recognized', 'invalid_lead', 'dispute_opened'
    )),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tutor_profile_id UUID REFERENCES public.course_tutor_profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.course_organizations(id) ON DELETE SET NULL,
    course_offer_id UUID REFERENCES public.course_offers(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.course_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(240) NOT NULL,
    market_code VARCHAR(2),
    previous_value JSONB,
    new_value JSONB,
    request_id VARCHAR(160),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search and operational indexes.  The normalized join tables carry the
-- subject/level/language/delivery facets; prices, location and availability
-- have direct indexes for bounded queries.
CREATE INDEX IF NOT EXISTS course_subjects_market_active_idx ON public.course_subjects (market_code, is_active, sort_order);
CREATE INDEX IF NOT EXISTS course_profiles_market_status_idx ON public.course_tutor_profiles (market_code, moderation_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS course_profiles_plan_idx ON public.course_tutor_profiles (market_code, plan_id, moderation_status);
CREATE INDEX IF NOT EXISTS course_profiles_search_gin_idx ON public.course_tutor_profiles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS course_tutor_subjects_subject_idx ON public.course_tutor_subjects (subject_id, market_code, tutor_profile_id);
CREATE INDEX IF NOT EXISTS course_tutor_levels_level_idx ON public.course_tutor_levels (level_id, market_code, tutor_profile_id);
CREATE INDEX IF NOT EXISTS course_tutor_languages_language_idx ON public.course_tutor_languages (language_code, tutor_profile_id);
CREATE INDEX IF NOT EXISTS course_service_areas_city_idx ON public.course_service_areas (market_code, lower(city_label), radius_km);
CREATE INDEX IF NOT EXISTS course_service_areas_geo_idx ON public.course_service_areas (center_latitude, center_longitude) WHERE center_latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS course_availability_rules_lookup_idx ON public.course_availability_rules (tutor_profile_id, day_of_week, starts_at_local, ends_at_local);
CREATE INDEX IF NOT EXISTS course_availability_exceptions_lookup_idx ON public.course_availability_exceptions (tutor_profile_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS course_offers_market_subject_status_idx ON public.course_offers (market_code, subject_id, status, from_price_minor);
CREATE INDEX IF NOT EXISTS course_offers_search_gin_idx ON public.course_offers USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS course_offer_levels_level_idx ON public.course_offer_levels (level_id, market_code, course_offer_id);
CREATE INDEX IF NOT EXISTS course_offer_delivery_mode_idx ON public.course_offer_delivery_modes (delivery_mode, course_offer_id);
CREATE INDEX IF NOT EXISTS course_pricing_offer_active_price_idx ON public.course_pricing_options (course_offer_id, is_active, price_minor);
CREATE INDEX IF NOT EXISTS course_requests_match_idx ON public.course_learner_requests (market_code, subject_id, level_id, status, expires_at);
CREATE INDEX IF NOT EXISTS course_requests_delivery_gin_idx ON public.course_learner_requests USING GIN (delivery_modes);
CREATE INDEX IF NOT EXISTS course_leads_tutor_state_idx ON public.course_leads (tutor_profile_id, state, expires_at);
CREATE INDEX IF NOT EXISTS course_leads_organization_state_idx ON public.course_leads (organization_id, state, expires_at) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS course_bookings_tutor_schedule_idx ON public.course_bookings (tutor_profile_id, starts_at, ends_at) WHERE status IN ('pending', 'confirmed');
CREATE INDEX IF NOT EXISTS course_bookings_learner_schedule_idx ON public.course_bookings (learner_user_id, starts_at DESC);
CREATE INDEX IF NOT EXISTS course_sessions_schedule_idx ON public.course_lesson_sessions (starts_at, status);
CREATE INDEX IF NOT EXISTS course_analytics_market_event_idx ON public.course_analytics_events (market_code, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS course_audit_entity_idx ON public.course_audit_logs (entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_course_search_vectors()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector(
      'french',
      unaccent(
        COALESCE(to_jsonb(NEW)->>'headline', to_jsonb(NEW)->>'title', '')
        || ' '
        || COALESCE(to_jsonb(NEW)->>'biography', to_jsonb(NEW)->>'description', '')
      )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS course_profile_search_vector_trigger ON public.course_tutor_profiles;
CREATE TRIGGER course_profile_search_vector_trigger
BEFORE INSERT OR UPDATE OF headline, biography ON public.course_tutor_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_course_search_vectors();

DROP TRIGGER IF EXISTS course_offer_search_vector_trigger ON public.course_offers;
CREATE TRIGGER course_offer_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, description ON public.course_offers
FOR EACH ROW EXECUTE FUNCTION public.update_course_search_vectors();

-- Search view contains only privacy-safe payload. Precise coordinates and
-- postal prefixes are removed even if a bad writer accidentally included them
-- in public_payload.
CREATE OR REPLACE VIEW public.course_tutor_search_view
WITH (security_invoker = true) AS
SELECT
    o.id AS offer_id,
    p.id AS tutor_profile_id,
    o.market_code,
    ARRAY[o.market_code]::text[] AS market_codes,
    o.subject_id,
    COALESCE((SELECT array_agg(ol.level_id) FROM public.course_offer_levels ol WHERE ol.course_offer_id = o.id), ARRAY[]::varchar[]) AS level_ids,
    COALESCE((SELECT array_agg(dm.delivery_mode) FROM public.course_offer_delivery_modes dm WHERE dm.course_offer_id = o.id), ARRAY[]::varchar[]) AS delivery_modes,
    p.public_payload #>> '{serviceArea,cityLabel}' AS city_label,
    o.from_price_minor,
    o.currency,
    NULL::numeric AS distance_km,
    o.status AS offer_status,
    (p.public_payload
      - 'userId' - 'availabilityRules' - 'availabilityExceptions' - 'planId'
      - 'moderationStatus' - 'profileCompletionPercent' - 'createdAt' - 'updatedAt'
      #- '{serviceArea,latitude}' #- '{serviceArea,longitude}' #- '{serviceArea,postalCodePrefix}') AS tutor_payload,
    (o.public_payload - 'moderationReason') AS offer_payload,
    s.label AS subject_label,
    COALESCE((SELECT array_agg(l.label ORDER BY l.sort_order)
      FROM public.course_offer_levels ol
      JOIN public.course_subject_levels l ON l.id = ol.level_id AND l.market_code = ol.market_code
      WHERE ol.course_offer_id = o.id), ARRAY[]::varchar[]) AS level_labels,
    COALESCE((p.public_payload #>> '{verifications,identity}') = 'verified', FALSE) AS identity_verified,
    LEAST(1.0,
      0.60
      + CASE WHEN o.capacity_status = 'available' THEN 0.20 ELSE 0 END
      + CASE WHEN p.moderation_status = 'approved' THEN 0.17 ELSE 0 END
      + CASE WHEN p.is_featured THEN 0.03 ELSE 0 END
    ) AS relevance_baseline,
    ARRAY['Matière et niveau compatibles']::text[] AS relevance_reasons,
    (p.search_vector || o.search_vector) AS search_vector
FROM public.course_offers o
JOIN public.course_tutor_profiles p ON p.id = o.tutor_profile_id
JOIN public.course_subjects s ON s.id = o.subject_id AND s.market_code = o.market_code
WHERE p.moderation_status = 'approved' AND o.status = 'published';

-- -----------------------------------------------------------------------------
-- RLS — public catalogue, private evidence and participant-only workflows.
-- -----------------------------------------------------------------------------
ALTER TABLE public.vertical_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_market_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_subject_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_subject_allowed_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tutor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tutor_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tutor_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tutor_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tutor_delivery_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_qualification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tutor_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_qualification_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_offer_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_offer_delivery_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_offer_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_pricing_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_learner_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lead_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lesson_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
    SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_course_organization_member(target_organization UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.course_organization_members m
        WHERE m.organization_id = target_organization
          AND m.user_id = public.current_profile_id()
          AND m.status = 'active'
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE POLICY "Course vertical definitions are publicly readable" ON public.vertical_definitions FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Enabled course market config is publicly readable" ON public.course_market_configs FOR SELECT USING (is_enabled OR public.is_admin());
CREATE POLICY "Course catalogue levels are publicly readable" ON public.course_subject_levels FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Course catalogue subjects are publicly readable" ON public.course_subjects FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Course subject level links are publicly readable" ON public.course_subject_allowed_levels FOR SELECT USING (TRUE);
CREATE POLICY "Active course plans are publicly readable" ON public.course_plans FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Active course add-ons are publicly readable" ON public.course_add_ons FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Course configuration is admin managed" ON public.course_market_configs FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Course subjects are admin managed" ON public.course_subjects FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Course levels are admin managed" ON public.course_subject_levels FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Course plans are admin managed" ON public.course_plans FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Course add-ons are admin managed" ON public.course_add_ons FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Verified course organizations are public" ON public.course_organizations FOR SELECT USING (verification_status = 'verified' OR public.is_course_organization_member(id) OR public.is_moderator_or_admin());
CREATE POLICY "Organization members see their team" ON public.course_organization_members FOR SELECT USING (public.is_course_organization_member(organization_id) OR public.is_moderator_or_admin());
CREATE POLICY "Organization admins manage their team" ON public.course_organization_members FOR ALL
    USING (public.is_admin() OR EXISTS (
      SELECT 1 FROM public.course_organization_members manager
      WHERE manager.organization_id = course_organization_members.organization_id
        AND manager.user_id = public.current_profile_id()
        AND manager.role IN ('owner', 'admin') AND manager.status = 'active'
    ))
    WITH CHECK (public.is_admin() OR public.is_course_organization_member(organization_id));

CREATE POLICY "Tutor profiles are owner and reviewer readable" ON public.course_tutor_profiles FOR SELECT USING (
    user_id = public.current_profile_id() OR public.is_course_organization_member(organization_id) OR public.is_moderator_or_admin()
);
CREATE POLICY "Tutors manage own profile" ON public.course_tutor_profiles FOR ALL
    USING (user_id = public.current_profile_id() OR public.is_course_organization_member(organization_id) OR public.is_admin())
    WITH CHECK (user_id = public.current_profile_id() OR public.is_course_organization_member(organization_id) OR public.is_admin());

CREATE POLICY "Course offers are owner and reviewer readable" ON public.course_offers FOR SELECT USING (
    tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles WHERE user_id = public.current_profile_id())
    OR public.is_course_organization_member(organization_id)
    OR public.is_moderator_or_admin()
);
CREATE POLICY "Tutors manage own course offers" ON public.course_offers FOR ALL
    USING (tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles WHERE user_id = public.current_profile_id()) OR public.is_course_organization_member(organization_id) OR public.is_admin())
    WITH CHECK (tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles WHERE user_id = public.current_profile_id()) OR public.is_course_organization_member(organization_id) OR public.is_admin());

CREATE POLICY "Public tutor facets follow profile visibility" ON public.course_tutor_subjects FOR SELECT USING (tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles));
CREATE POLICY "Public tutor levels follow profile visibility" ON public.course_tutor_levels FOR SELECT USING (tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles));
CREATE POLICY "Public tutor languages follow profile visibility" ON public.course_tutor_languages FOR SELECT USING (tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles));
CREATE POLICY "Public tutor delivery modes follow profile visibility" ON public.course_tutor_delivery_modes FOR SELECT USING (tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles));
CREATE POLICY "Service areas are owner and reviewer private" ON public.course_service_areas FOR SELECT USING (
    tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles WHERE user_id = public.current_profile_id())
    OR public.is_course_organization_member(organization_id)
    OR public.is_moderator_or_admin()
);
CREATE POLICY "Public availability rules follow profile visibility" ON public.course_availability_rules FOR SELECT USING (tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles));
CREATE POLICY "Availability exceptions are tutor private" ON public.course_availability_exceptions FOR SELECT USING (tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles WHERE user_id = public.current_profile_id()) OR public.is_moderator_or_admin());
CREATE POLICY "Qualification types are public" ON public.course_qualification_types FOR SELECT USING (is_active OR public.is_admin());
CREATE POLICY "Qualifications are owner and reviewer visible" ON public.course_tutor_qualifications FOR SELECT USING (
    tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles WHERE user_id = public.current_profile_id())
    OR tutor_profile_id IN (
      SELECT id FROM public.course_tutor_profiles WHERE public.is_course_organization_member(organization_id)
    )
    OR public.is_moderator_or_admin()
);
CREATE POLICY "Qualification evidence is owner and reviewer only" ON public.course_qualification_evidence FOR ALL
    USING (qualification_id IN (
      SELECT q.id FROM public.course_tutor_qualifications q JOIN public.course_tutor_profiles p ON p.id = q.tutor_profile_id
      WHERE p.user_id = public.current_profile_id()
    ) OR public.is_moderator_or_admin())
    WITH CHECK (uploaded_by = public.current_profile_id() OR public.is_moderator_or_admin());

CREATE POLICY "Offer levels are public" ON public.course_offer_levels FOR SELECT USING (course_offer_id IN (SELECT id FROM public.course_offers));
CREATE POLICY "Offer delivery modes are public" ON public.course_offer_delivery_modes FOR SELECT USING (course_offer_id IN (SELECT id FROM public.course_offers));
CREATE POLICY "Offer languages are public" ON public.course_offer_languages FOR SELECT USING (course_offer_id IN (SELECT id FROM public.course_offers));
CREATE POLICY "Active pricing options are public" ON public.course_pricing_options FOR SELECT USING (is_active AND course_offer_id IN (SELECT id FROM public.course_offers));

CREATE POLICY "Learners access own requests" ON public.course_learner_requests FOR ALL
    USING (requester_user_id = public.current_profile_id() OR guardian_user_id = public.current_profile_id() OR public.is_moderator_or_admin())
    WITH CHECK (requester_user_id = public.current_profile_id() OR guardian_user_id = public.current_profile_id() OR public.is_admin());
CREATE POLICY "Tutors access assigned leads" ON public.course_leads FOR SELECT USING (
    tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles WHERE user_id = public.current_profile_id())
    OR public.is_course_organization_member(organization_id)
    OR public.is_moderator_or_admin()
);
CREATE POLICY "Tutors respond to assigned leads" ON public.course_leads FOR UPDATE USING (
    tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles WHERE user_id = public.current_profile_id())
    OR public.is_course_organization_member(organization_id)
    OR public.is_admin()
);
CREATE POLICY "Lead credit ledger is owner visible" ON public.course_lead_credit_ledger FOR SELECT USING (
    tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles WHERE user_id = public.current_profile_id())
    OR public.is_course_organization_member(organization_id)
    OR public.is_admin()
);

CREATE POLICY "Course packages are participant visible" ON public.course_packages FOR SELECT USING (
    learner_user_id = public.current_profile_id()
    OR tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles WHERE user_id = public.current_profile_id())
    OR public.is_admin()
);
CREATE POLICY "Course bookings are participant visible" ON public.course_bookings FOR SELECT USING (
    learner_user_id = public.current_profile_id()
    OR tutor_profile_id IN (SELECT id FROM public.course_tutor_profiles WHERE user_id = public.current_profile_id())
    OR public.is_admin()
);
CREATE POLICY "Course sessions are participant visible" ON public.course_lesson_sessions FOR SELECT USING (
    booking_id IN (SELECT id FROM public.course_bookings) OR public.is_admin()
);
CREATE POLICY "Payment events are finance/admin only" ON public.course_payment_events FOR SELECT USING (public.is_admin());
CREATE POLICY "Verified course reviews are public" ON public.course_reviews FOR SELECT USING (moderation_status = 'published' OR author_user_id = public.current_profile_id() OR public.is_moderator_or_admin());
CREATE POLICY "Learners create verified interaction reviews" ON public.course_reviews FOR INSERT WITH CHECK (author_user_id = public.current_profile_id());
CREATE POLICY "Course analytics are admin write/read" ON public.course_analytics_events FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Course audit logs are admin read" ON public.course_audit_logs FOR SELECT USING (public.is_admin());

COMMENT ON TABLE public.course_qualification_evidence IS 'Private evidence metadata only. Storage objects must use a private bucket and signed reviewer access.';
COMMENT ON TABLE public.course_bookings IS 'Phase 2 table. API writes are forbidden until booking, payment and payout flags are market-enabled.';
COMMENT ON COLUMN public.course_tutor_profiles.public_payload IS 'Privacy-safe versioned API view model. Never store document URLs, exact home coordinates or private contact data here.';
COMMENT ON COLUMN public.course_tutor_profiles.private_payload IS 'Server-side complete profile model. Base-table RLS forbids anonymous access.';
COMMENT ON COLUMN public.course_offers.public_payload IS 'Privacy-safe published course offer view model.';
COMMENT ON COLUMN public.course_offers.private_payload IS 'Server-side complete offer model including moderation workflow fields.';
COMMENT ON COLUMN public.course_learner_requests.private_payload IS 'Private request details including guardian context; never expose through public tutor search.';
