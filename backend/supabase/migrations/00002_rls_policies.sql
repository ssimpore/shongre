-- ==============================================================================
-- SHONGRE ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 00002_rls_policies.sql
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_boost_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper functions to check auth roles
CREATE OR REPLACE FUNCTION public.auth_uid()
RETURNS UUID AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS VARCHAR AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')::varchar;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_user_id = public.auth_uid()
        AND primary_role IN ('admin', 'super_admin')
    );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE auth_user_id = public.auth_uid()
        AND primary_role IN ('moderator', 'admin', 'super_admin')
    );
$$ LANGUAGE SQL STABLE;

-- ------------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (status != 'banned' OR public.is_moderator_or_admin());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth_user_id = public.auth_uid() OR public.is_admin());

CREATE POLICY "Service role can insert profiles"
    ON public.profiles FOR INSERT
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. MARKETS & TAXONOMY (PUBLIC READ)
-- ------------------------------------------------------------------------------
CREATE POLICY "Markets are readable by all"
    ON public.markets FOR SELECT
    USING (true);

CREATE POLICY "Markets are manageable by admins"
    ON public.markets FOR ALL
    USING (public.is_admin());

CREATE POLICY "Categories are readable by all"
    ON public.categories FOR SELECT
    USING (true);

CREATE POLICY "Categories are manageable by admins"
    ON public.categories FOR ALL
    USING (public.is_admin());

CREATE POLICY "Category attributes are readable by all"
    ON public.category_attributes FOR SELECT
    USING (true);

-- ------------------------------------------------------------------------------
-- 3. LISTINGS & MEDIA
-- ------------------------------------------------------------------------------
CREATE POLICY "Active listings are viewable by everyone"
    ON public.listings FOR SELECT
    USING (
        status = 'published' 
        OR (status IN ('reserved', 'sold') AND expires_at > NOW())
        OR seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_moderator_or_admin()
    );

CREATE POLICY "Sellers can create listings"
    ON public.listings FOR INSERT
    WITH CHECK (
        seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_admin()
    );

CREATE POLICY "Sellers can update own listings"
    ON public.listings FOR UPDATE
    USING (
        seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_moderator_or_admin()
    );

CREATE POLICY "Sellers can delete own listings"
    ON public.listings FOR DELETE
    USING (
        seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_admin()
    );

CREATE POLICY "Listing media is readable by all"
    ON public.listing_media FOR SELECT
    USING (true);

CREATE POLICY "Sellers can manage media for own listings"
    ON public.listing_media FOR ALL
    USING (
        listing_id IN (
            SELECT id FROM public.listings 
            WHERE seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        )
        OR public.is_admin()
    );

-- ------------------------------------------------------------------------------
-- 4. FAVORITES & SAVED SEARCHES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can manage own favorites"
    ON public.favorites FOR ALL
    USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid()));

CREATE POLICY "Users can manage own saved searches"
    ON public.saved_searches FOR ALL
    USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid()));

-- ------------------------------------------------------------------------------
-- 5. MESSAGING & NOTIFICATIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can access their conversations"
    ON public.conversations FOR SELECT
    USING (
        buyer_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_moderator_or_admin()
    );

CREATE POLICY "Users can access messages in their conversations"
    ON public.messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations
            WHERE buyer_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
            OR seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        )
        OR public.is_moderator_or_admin()
    );

CREATE POLICY "Users can send messages to their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        AND conversation_id IN (
            SELECT id FROM public.conversations
            WHERE buyer_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
            OR seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        )
    );

CREATE POLICY "Users can access own notifications"
    ON public.notifications FOR ALL
    USING (user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid()));

-- ------------------------------------------------------------------------------
-- 6. ORDERS, ESCROW & PAYOUTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Buyers and sellers can view their orders"
    ON public.orders FOR SELECT
    USING (
        buyer_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_admin()
    );

CREATE POLICY "Buyers can create orders"
    ON public.orders FOR INSERT
    WITH CHECK (
        buyer_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_admin()
    );

CREATE POLICY "Order participants can update orders"
    ON public.orders FOR UPDATE
    USING (
        buyer_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_admin()
    );

CREATE POLICY "Sellers can view own payouts"
    ON public.payouts FOR SELECT
    USING (
        seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_admin()
    );

-- ------------------------------------------------------------------------------
-- 7. MONETIZATION & PLANS
-- ------------------------------------------------------------------------------
CREATE POLICY "Plans are viewable by all"
    ON public.subscription_plans FOR SELECT
    USING (true);

CREATE POLICY "Sellers can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (
        seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_admin()
    );

CREATE POLICY "Sellers can view own boost orders"
    ON public.listing_boost_orders FOR SELECT
    USING (
        seller_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_admin()
    );

-- ------------------------------------------------------------------------------
-- 8. VERIFICATION & FRAUD
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view own verification requests"
    ON public.verification_requests FOR SELECT
    USING (
        user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_admin()
    );

CREATE POLICY "Users can create own verification requests"
    ON public.verification_requests FOR INSERT
    WITH CHECK (
        user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
        OR public.is_admin()
    );

CREATE POLICY "Admins only for fraud scores"
    ON public.fraud_risk_scores FOR ALL
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 9. REVIEWS, REPORTS & AUDIT
-- ------------------------------------------------------------------------------
CREATE POLICY "Reviews are viewable by all"
    ON public.reviews FOR SELECT
    USING (true);

CREATE POLICY "Buyers can write reviews"
    ON public.reviews FOR INSERT
    WITH CHECK (
        author_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
    );

CREATE POLICY "Users can create reports"
    ON public.reports FOR INSERT
    WITH CHECK (
        reporter_id IN (SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid())
    );

CREATE POLICY "Staff can view and resolve reports"
    ON public.reports FOR ALL
    USING (public.is_moderator_or_admin());

CREATE POLICY "Staff can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.is_admin());
