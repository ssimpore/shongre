-- ==============================================================================
-- SHONGRE STORED PROCEDURES, FUNCTIONS & TRIGGERS
-- Migration: 00003_functions_and_triggers.sql
-- ==============================================================================

-- 1. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_verification_updated_at BEFORE UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Full-Text Search tsvector update trigger
CREATE OR REPLACE FUNCTION public.update_listing_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('french', unaccent(coalesce(NEW.title, ''))), 'A') ||
        setweight(to_tsvector('french', unaccent(coalesce(NEW.brand, ''))), 'B') ||
        setweight(to_tsvector('french', unaccent(coalesce(NEW.model, ''))), 'B') ||
        setweight(to_tsvector('french', unaccent(coalesce(NEW.city, ''))), 'C') ||
        setweight(to_tsvector('french', unaccent(coalesce(NEW.description, ''))), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_listing_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, description, brand, model, city ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.update_listing_search_vector();

-- 3. Automatic 4-digit PIN generation for Hand Delivery Orders
CREATE OR REPLACE FUNCTION public.generate_handover_pin()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delivery_method = 'hand_delivery' AND NEW.handover_pin IS NULL THEN
        NEW.handover_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_order_handover_pin_trigger
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.generate_handover_pin();

-- 4. Seller Rating & Review Aggregation Trigger
CREATE OR REPLACE FUNCTION public.update_seller_rating_summary()
RETURNS TRIGGER AS $$
DECLARE
    target_user UUID;
    avg_score NUMERIC(3,2);
    total_reviews INT;
BEGIN
    target_user := coalesce(NEW.target_user_id, OLD.target_user_id);
    
    SELECT COALESCE(AVG(rating), 5.00), COUNT(*)
    INTO avg_score, total_reviews
    FROM public.reviews
    WHERE target_user_id = target_user;
    
    UPDATE public.profiles
    SET 
        rating = avg_score,
        review_count = total_reviews,
        updated_at = NOW()
    WHERE id = target_user;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seller_rating_after_review
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_seller_rating_summary();

-- 5. Atomic Escrow Release Procedure
CREATE OR REPLACE FUNCTION public.release_order_escrow(
    p_order_id UUID,
    p_actor_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_seller public.profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order with ID % not found', p_order_id;
    END IF;
    
    IF v_order.status = 'completed' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Order already completed');
    END IF;
    
    -- Update order status
    UPDATE public.orders
    SET 
        status = 'completed',
        funds_released_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;
    
    -- Mark listing as sold
    UPDATE public.listings
    SET status = 'sold', updated_at = NOW()
    WHERE id = v_order.listing_id;
    
    -- Insert payout record for seller
    INSERT INTO public.payouts (
        seller_id,
        order_id,
        amount,
        currency,
        iban_last4,
        status,
        created_at
    ) VALUES (
        v_order.seller_id,
        v_order.id,
        v_order.item_amount,
        'EUR',
        '4242',
        'processing',
        NOW()
    );
    
    -- Log security audit event
    INSERT INTO public.audit_logs (
        actor_id,
        actor_name,
        actor_role,
        target_id,
        target_name,
        action,
        details,
        created_at
    ) VALUES (
        p_actor_id,
        'System Escrow Engine',
        'system',
        v_order.order_number,
        'Order',
        'escrow_released',
        format('Escrow amount of %s EUR released to seller %s', v_order.item_amount, v_order.seller_id),
        NOW()
    );
    
    RETURN jsonb_build_object(
        'success', true, 
        'order_id', p_order_id, 
        'released_amount', v_order.item_amount,
        'status', 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
