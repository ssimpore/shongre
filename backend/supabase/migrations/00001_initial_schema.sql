-- ==============================================================================
-- SHONGRE POSTGRESQL INITIAL SCHEMA
-- Migration: 00001_initial_schema.sql
-- ==============================================================================

-- Enable essential extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ------------------------------------------------------------------------------
-- 1. ENUMS & DOMAIN TYPES
-- ------------------------------------------------------------------------------
CREATE TYPE platform_role AS ENUM (
    'guest',
    'individual_buyer',
    'individual_seller',
    'pro_seller',
    'support',
    'moderator',
    'operations',
    'finance',
    'commercial',
    'content_manager',
    'market_manager',
    'admin',
    'super_admin'
);

CREATE TYPE account_type AS ENUM ('individual', 'professional', 'internal');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'pending_verification', 'banned', 'archived');
CREATE TYPE listing_status AS ENUM ('draft', 'published', 'reserved', 'sold', 'archived', 'rejected', 'flagged');
CREATE TYPE delivery_type AS ENUM ('hand_delivery', 'relay_point', 'home_delivery', 'cocolis', 'express');
CREATE TYPE transaction_type AS ENUM ('DIRECT_PURCHASE', 'RESERVATION');
CREATE TYPE transaction_status AS ENUM (
    'initiated',
    'escrow_funded',
    'shipped',
    'pin_pending',
    'disputed',
    'completed',
    'refunded',
    'cancelled'
);
CREATE TYPE boost_type AS ENUM ('urgent', 'search_bump', 'featured');
CREATE TYPE verification_status AS ENUM ('not_started', 'pending', 'verified', 'rejected');
CREATE TYPE report_status AS ENUM ('pending', 'investigating', 'resolved', 'dismissed');

-- ------------------------------------------------------------------------------
-- 2. USERS, PROFILES, ORGANIZATIONS & STORES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    slug VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type account_type NOT NULL DEFAULT 'individual',
    primary_role platform_role NOT NULL DEFAULT 'individual_buyer',
    status account_status NOT NULL DEFAULT 'active',
    avatar_url TEXT,
    phone VARCHAR(50),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    department VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(2) NOT NULL DEFAULT 'FR',
    bio TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_business_verified BOOLEAN NOT NULL DEFAULT FALSE,
    rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    review_count INT NOT NULL DEFAULT 0,
    response_rate_percent INT NOT NULL DEFAULT 100,
    response_time_text VARCHAR(100) DEFAULT 'en quelques minutes',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    legal_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    siren VARCHAR(9) NOT NULL,
    siret VARCHAR(14) NOT NULL UNIQUE,
    vat_number VARCHAR(30),
    legal_form VARCHAR(100),
    registered_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(2) NOT NULL DEFAULT 'FR',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    slug VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255),
    description TEXT,
    banner_url TEXT,
    logo_url TEXT,
    primary_market VARCHAR(2) NOT NULL DEFAULT 'FR',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. MARKETS, TAXONOMY & ATTRIBUTES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.markets (
    code VARCHAR(2) PRIMARY KEY, -- 'FR', 'BE', 'CH', 'LU', 'DE', 'ES'
    name VARCHAR(100) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '€',
    locale VARCHAR(10) NOT NULL DEFAULT 'fr-FR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_base_market BOOLEAN NOT NULL DEFAULT FALSE,
    protection_fee_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0400,
    protection_fixed_fee NUMERIC(10,2) NOT NULL DEFAULT 0.70,
    free_listings_limit INT NOT NULL DEFAULT 10,
    allowed_delivery_methods delivery_type[] NOT NULL DEFAULT '{hand_delivery,relay_point,home_delivery}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
    id VARCHAR(100) PRIMARY KEY, -- slug-based ID
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_label VARCHAR(100),
    parent_id VARCHAR(100) REFERENCES public.categories(id) ON DELETE RESTRICT,
    icon_name VARCHAR(100) NOT NULL DEFAULT 'Package',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.category_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id VARCHAR(100) NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'text', 'number', 'select', 'boolean', 'range'
    options JSONB,
    unit VARCHAR(30),
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_filterable BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. LISTINGS & MEDIA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    category_id VARCHAR(100) NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(12,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status listing_status NOT NULL DEFAULT 'published',
    condition VARCHAR(50) NOT NULL DEFAULT 'bon-etat',
    brand VARCHAR(100),
    model VARCHAR(100),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    department VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(2) NOT NULL DEFAULT 'FR',
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    allowed_delivery delivery_type[] NOT NULL DEFAULT '{hand_delivery}',
    shipping_cost NUMERIC(10,2) DEFAULT 0.00,
    package_weight_kg NUMERIC(6,2),
    is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    urgent_expires_at TIMESTAMPTZ,
    featured_expires_at TIMESTAMPTZ,
    bumped_at TIMESTAMPTZ,
    view_count INT NOT NULL DEFAULT 0,
    favorite_count INT NOT NULL DEFAULT 0,
    safety_risk_score INT DEFAULT 0,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    search_vector tsvector,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '60 days')
);

CREATE TABLE IF NOT EXISTS public.listing_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    width INT,
    height INT,
    file_size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. FAVORITES & SAVED SEARCHES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.favorites (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    query VARCHAR(255),
    category_id VARCHAR(100) REFERENCES public.categories(id) ON DELETE SET NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    market_code VARCHAR(2) NOT NULL DEFAULT 'FR',
    email_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_notified_at TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- 6. MESSAGING & NOTIFICATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_conversation_buyer_seller_listing UNIQUE(listing_id, buyer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    is_offer BOOLEAN NOT NULL DEFAULT FALSE,
    offer_price NUMERIC(12,2),
    offer_status VARCHAR(30), -- 'pending', 'accepted', 'declined', 'expired'
    is_pickup_proposal BOOLEAN NOT NULL DEFAULT FALSE,
    pickup_details JSONB,
    read_by UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'message', 'order', 'escrow', 'boost', 'verification', 'system'
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. ORDERS, ESCROW & PAYMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    transaction_type transaction_type NOT NULL DEFAULT 'DIRECT_PURCHASE',
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status transaction_status NOT NULL DEFAULT 'initiated',
    item_amount NUMERIC(12,2) NOT NULL CHECK (item_amount >= 0),
    protection_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_charged NUMERIC(12,2) NOT NULL CHECK (total_charged >= 0),
    escrow_secured_amount NUMERIC(12,2) NOT NULL CHECK (escrow_secured_amount >= 0),
    deposit_amount NUMERIC(12,2) DEFAULT 0.00,
    remaining_balance NUMERIC(12,2) DEFAULT 0.00,
    delivery_method delivery_type NOT NULL DEFAULT 'hand_delivery',
    shipping_address JSONB,
    handover_pin VARCHAR(4),
    pin_attempts INT NOT NULL DEFAULT 0,
    is_pin_verified BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_confirmed_at TIMESTAMPTZ,
    funds_released_at TIMESTAMPTZ,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
    payment_intent_id VARCHAR(255),
    dispute_reason TEXT,
    dispute_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    iban_last4 VARCHAR(4) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    stripe_payout_id VARCHAR(255),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. MONETIZATION, PLANS & BOOSTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id VARCHAR(50) PRIMARY KEY, -- 'starter', 'pro', 'enterprise'
    name VARCHAR(100) NOT NULL,
    price_monthly NUMERIC(10,2) NOT NULL,
    price_yearly NUMERIC(10,2) NOT NULL,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    plan_id VARCHAR(50) NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due'
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.listing_boost_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    boost_type boost_type NOT NULL,
    duration_days INT NOT NULL DEFAULT 7,
    price_paid NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. VERIFICATION, KYC, KYB & FRAUD
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'identity_document', 'siret_registry', 'bank_iban', 'phone'
    status verification_status NOT NULL DEFAULT 'pending',
    document_type VARCHAR(50),
    document_url TEXT,
    siret VARCHAR(14),
    company_name VARCHAR(255),
    iban VARCHAR(34),
    bic VARCHAR(11),
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fraud_risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'user', 'listing', 'transaction'
    entity_id UUID NOT NULL,
    risk_score INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    factors JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. REVIEWS, REPORTS & AUDIT LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    listing_title VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_review_order UNIQUE(order_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    status report_status NOT NULL DEFAULT 'pending',
    resolution_action VARCHAR(50),
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    target_id VARCHAR(255),
    target_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
