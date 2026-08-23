-- =============================================================================
-- Order concurrency, lifecycle integrity and secure handover verification
-- Migration: 00019_order_integrity_and_handover.sql
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.orders
    WHERE status IN ('initiated', 'escrow_funded', 'shipped', 'pin_pending', 'disputed')
    GROUP BY listing_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot enforce one active order per listing: duplicate active orders must be reconciled first.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS orders_one_active_per_listing_idx
  ON public.orders (listing_id)
  WHERE status IN ('initiated', 'escrow_funded', 'shipped', 'pin_pending', 'disputed');

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_handover_pin_format_check,
  ADD CONSTRAINT orders_handover_pin_format_check
    CHECK (handover_pin IS NULL OR handover_pin ~ '^[0-9]{4}$') NOT VALID;

ALTER TABLE public.orders
  VALIDATE CONSTRAINT orders_handover_pin_format_check;

CREATE OR REPLACE FUNCTION public.generate_handover_pin()
RETURNS TRIGGER AS $$
DECLARE
  entropy BYTEA;
  pin_value INTEGER;
BEGIN
  IF NEW.delivery_method = 'hand_delivery' AND NEW.handover_pin IS NULL THEN
    entropy := gen_random_bytes(2);
    pin_value := (get_byte(entropy, 0) * 256 + get_byte(entropy, 1)) % 10000;
    NEW.handover_pin := LPAD(pin_value::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.synchronize_listing_order_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.listings
    SET status = 'reserved', updated_at = NOW()
    WHERE id = NEW.listing_id AND status = 'published';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Listing % is not available for an order', NEW.listing_id
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'completed' THEN
      UPDATE public.listings
      SET status = 'sold', updated_at = NOW()
      WHERE id = NEW.listing_id AND status = 'reserved';
    ELSIF NEW.status IN ('cancelled', 'refunded') THEN
      UPDATE public.listings
      SET status = 'published', updated_at = NOW()
      WHERE id = NEW.listing_id AND status = 'reserved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS synchronize_listing_order_lifecycle_trigger ON public.orders;
CREATE TRIGGER synchronize_listing_order_lifecycle_trigger
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.synchronize_listing_order_lifecycle();

REVOKE ALL ON FUNCTION public.synchronize_listing_order_lifecycle() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
      AND p_user_id IN (buyer_id, seller_id)
  ) THEN
    RAISE EXCEPTION 'Conversation participant required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.messages
  SET read_by = array_append(COALESCE(read_by, '{}'), p_user_id)
  WHERE conversation_id = p_conversation_id
    AND sender_id <> p_user_id
    AND NOT (p_user_id = ANY(COALESCE(read_by, '{}')));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.mark_conversation_read(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.get_unread_message_count(p_user_id UUID)
RETURNS BIGINT AS $$
  SELECT COUNT(*)
  FROM public.messages message
  JOIN public.conversations conversation ON conversation.id = message.conversation_id
  WHERE p_user_id IN (conversation.buyer_id, conversation.seller_id)
    AND message.sender_id <> p_user_id
    AND NOT (p_user_id = ANY(COALESCE(message.read_by, '{}')));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_unread_message_count(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count(UUID) TO service_role;

CREATE TABLE IF NOT EXISTS public.listing_drafts (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.listing_drafts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_listing_drafts_updated_at ON public.listing_drafts;
CREATE TRIGGER set_listing_drafts_updated_at
BEFORE UPDATE ON public.listing_drafts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Users manage their own listing draft" ON public.listing_drafts;
CREATE POLICY "Users manage their own listing draft"
  ON public.listing_drafts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = listing_drafts.user_id
        AND profiles.auth_user_id = public.auth_uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = listing_drafts.user_id
        AND profiles.auth_user_id = public.auth_uid()
    )
  );

CREATE OR REPLACE FUNCTION public.toggle_favorite(p_user_id UUID, p_listing_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_now_favorite BOOLEAN;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::TEXT || ':' || p_listing_id::TEXT, 0));

  DELETE FROM public.favorites
  WHERE user_id = p_user_id AND listing_id = p_listing_id;

  IF FOUND THEN
    is_now_favorite := FALSE;
  ELSE
    INSERT INTO public.favorites (user_id, listing_id)
    VALUES (p_user_id, p_listing_id);
    is_now_favorite := TRUE;
  END IF;

  RETURN is_now_favorite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

REVOKE ALL ON FUNCTION public.toggle_favorite(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_favorite(UUID, UUID) TO service_role;
