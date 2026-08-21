-- ============================================================================
-- SHONGRE TRENDING DISCOVERY
-- Migration: 00007_trending_discovery.sql
--
-- Raw events are append-only input for a scheduled aggregation job. The
-- homepage reads the cached topic payloads; it never performs these rollups on
-- the request path.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.marketplace_activity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(40) NOT NULL CHECK (event_type IN (
        'listing_view', 'listing_unique_view', 'search', 'search_click',
        'favorite', 'share', 'contact', 'offer', 'reservation', 'transaction'
    )),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
    topic_type VARCHAR(30) NOT NULL DEFAULT 'category',
    topic_key VARCHAR(255) NOT NULL,
    category_id VARCHAR(100) REFERENCES public.categories(id) ON DELETE SET NULL,
    listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    actor_hash VARCHAR(128),
    session_hash VARCHAR(128),
    city VARCHAR(100),
    region VARCHAR(100),
    source VARCHAR(30) NOT NULL DEFAULT 'organic' CHECK (source IN ('organic', 'trending_now', 'editorial', 'admin')),
    is_qualified BOOLEAN NOT NULL DEFAULT TRUE,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trending_section_configs (
    market_code VARCHAR(2) PRIMARY KEY REFERENCES public.markets(code) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_topics INT NOT NULL DEFAULT 8 CHECK (max_topics BETWEEN 1 AND 12),
    min_topics INT NOT NULL DEFAULT 4 CHECK (min_topics BETWEEN 0 AND 12),
    max_topics_per_parent_category INT NOT NULL DEFAULT 1 CHECK (max_topics_per_parent_category BETWEEN 1 AND 5),
    minimum_activity NUMERIC(5,4) NOT NULL DEFAULT 0.0800 CHECK (minimum_activity BETWEEN 0 AND 1),
    display_period_days INT NOT NULL DEFAULT 7 CHECK (display_period_days BETWEEN 1 AND 30),
    cache_ttl_minutes INT NOT NULL DEFAULT 20 CHECK (cache_ttl_minutes BETWEEN 5 AND 120),
    personalization_weight NUMERIC(5,4) NOT NULL DEFAULT 0.2200 CHECK (personalization_weight BETWEEN 0 AND 1),
    title VARCHAR(255) NOT NULL DEFAULT 'En ce moment sur Shongre',
    subtitle VARCHAR(500) NOT NULL DEFAULT 'Découvrez ce qui attire le plus les acheteurs en ce moment.',
    mobile_visible BOOLEAN NOT NULL DEFAULT TRUE,
    desktop_visible BOOLEAN NOT NULL DEFAULT TRUE,
    excluded_categories TEXT[] NOT NULL DEFAULT '{}',
    excluded_topics TEXT[] NOT NULL DEFAULT '{}',
    weights JSONB NOT NULL DEFAULT '{
        "searchGrowth": 0.18, "viewGrowth": 0.12, "favorites": 0.12,
        "contacts": 0.12, "conversion": 0.10, "listingVelocity": 0.09,
        "locality": 0.07, "freshness": 0.08, "seasonality": 0.05,
        "editorial": 0.07
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trending_topic_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    topic_type VARCHAR(30) NOT NULL DEFAULT 'category',
    topic_key VARCHAR(255) NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    boost_score NUMERIC(5,4) NOT NULL DEFAULT 0 CHECK (boost_score BETWEEN 0 AND 1),
    custom_title VARCHAR(255),
    custom_subtitle VARCHAR(500),
    custom_image JSONB,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    region VARCHAR(100),
    city VARCHAR(100),
    sort_order INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (market_code, topic_type, topic_key)
);

CREATE TABLE IF NOT EXISTS public.trending_activity_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    topic_type VARCHAR(30) NOT NULL DEFAULT 'category',
    topic_key VARCHAR(255) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    view_count BIGINT NOT NULL DEFAULT 0,
    unique_view_count BIGINT NOT NULL DEFAULT 0,
    search_count BIGINT NOT NULL DEFAULT 0,
    search_click_count BIGINT NOT NULL DEFAULT 0,
    favorite_count BIGINT NOT NULL DEFAULT 0,
    share_count BIGINT NOT NULL DEFAULT 0,
    contact_count BIGINT NOT NULL DEFAULT 0,
    offer_count BIGINT NOT NULL DEFAULT 0,
    reservation_count BIGINT NOT NULL DEFAULT 0,
    transaction_count BIGINT NOT NULL DEFAULT 0,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (market_code, topic_type, topic_key, window_start, window_end)
);

CREATE TABLE IF NOT EXISTS public.trending_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
    topic_type VARCHAR(30) NOT NULL,
    topic_key VARCHAR(255) NOT NULL,
    category_id VARCHAR(100) REFERENCES public.categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(500),
    trend_score NUMERIC(8,6) NOT NULL DEFAULT 0,
    activity_score NUMERIC(8,6) NOT NULL DEFAULT 0,
    growth_score NUMERIC(8,6) NOT NULL DEFAULT 0,
    editorial_score NUMERIC(8,6) NOT NULL DEFAULT 0,
    topic_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE (market_code, topic_type, topic_key)
);

CREATE INDEX IF NOT EXISTS idx_activity_events_market_topic_time
    ON public.marketplace_activity_events (market_code, topic_key, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_qualified_time
    ON public.marketplace_activity_events (occurred_at DESC) WHERE is_qualified = TRUE;
CREATE INDEX IF NOT EXISTS idx_trending_topics_market_expiry
    ON public.trending_topics (market_code, is_enabled, expires_at, sort_order);
CREATE INDEX IF NOT EXISTS idx_trending_overrides_market_window
    ON public.trending_topic_overrides (market_code, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_trending_activity_windows_market_time
    ON public.trending_activity_windows (market_code, window_end DESC, topic_key);

ALTER TABLE public.marketplace_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_section_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topic_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_activity_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trending cache is publicly readable while active"
    ON public.trending_topics FOR SELECT
    USING (is_enabled = TRUE AND expires_at > NOW());

CREATE POLICY "Trending configuration is readable by admins"
    ON public.trending_section_configs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Trending configuration is manageable by admins"
    ON public.trending_section_configs FOR ALL
    USING (public.is_admin());

CREATE POLICY "Trending overrides are readable by admins"
    ON public.trending_topic_overrides FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Trending overrides are manageable by admins"
    ON public.trending_topic_overrides FOR ALL
    USING (public.is_admin());

CREATE POLICY "Trending activity windows are readable by admins"
    ON public.trending_activity_windows FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Trending activity windows are manageable by admins"
    ON public.trending_activity_windows FOR ALL
    USING (public.is_admin());

COMMENT ON TABLE public.marketplace_activity_events IS 'Qualified, privacy-safe marketplace signals consumed by the scheduled trending aggregation job.';
COMMENT ON TABLE public.trending_topics IS 'Short-lived homepage cache; derived from activity events and active listing quality signals.';
COMMENT ON TABLE public.trending_activity_windows IS 'Pre-aggregated qualified activity windows refreshed by the trending worker before cache publication.';
