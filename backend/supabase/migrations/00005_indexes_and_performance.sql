-- ==============================================================================
-- SHONGRE HIGH-PERFORMANCE INDEXES
-- Migration: 00005_indexes_and_performance.sql
-- ==============================================================================

-- 1. Full-Text Search and Trigram Indexing
CREATE INDEX IF NOT EXISTS idx_listings_search_vector ON public.listings USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON public.listings USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_city_trgm ON public.listings USING GIN (city gin_trgm_ops);

-- 2. Category & Market Filtering Indexes
CREATE INDEX IF NOT EXISTS idx_listings_category_status ON public.listings (category_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_market_status ON public.listings (market_code, status, price ASC);
CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON public.listings (seller_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_price_range ON public.listings (price) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_listings_urgent_featured ON public.listings (is_urgent, is_featured, bumped_at DESC) WHERE status = 'published';

-- 3. Geo & Location Indexes
CREATE INDEX IF NOT EXISTS idx_listings_geo_coords ON public.listings (latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_postal_code ON public.listings (postal_code, department);

-- 4. JSONB Attribute Indexing
CREATE INDEX IF NOT EXISTS idx_listings_attributes_gin ON public.listings USING GIN (attributes);

-- 5. Orders, Escrow & Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_orders_buyer_status ON public.orders (buyer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status ON public.orders (seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON public.orders (listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);

-- 6. Messaging & Notifications Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON public.conversations (buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON public.conversations (seller_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

-- 7. Audit & Safety Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_target_user ON public.reviews (target_user_id, created_at DESC);
