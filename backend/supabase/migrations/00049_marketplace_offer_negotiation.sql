-- Race-safe marketplace price negotiation.
--
-- Offers are first-class records rather than an interpretation of chat text.
-- All state changes are serialized in PostgreSQL and every transition produces
-- an immutable event. The original messages columns remain populated while old
-- clients are retired, but amount_minor/currency are authoritative.

CREATE TABLE IF NOT EXISTS public.marketplace_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_offer_id UUID REFERENCES public.marketplace_offers(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'declined', 'countered', 'withdrawn', 'expired')
  ),
  expires_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (creator_id <> recipient_id),
  CHECK (expires_at > created_at),
  CHECK (
    (status = 'pending' AND resolved_at IS NULL)
    OR (status <> 'pending' AND resolved_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_offers_one_pending_per_conversation_idx
  ON public.marketplace_offers (conversation_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS marketplace_offers_participant_idx
  ON public.marketplace_offers (recipient_id, status, expires_at);
CREATE INDEX IF NOT EXISTS marketplace_offers_expiry_idx
  ON public.marketplace_offers (expires_at)
  WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.marketplace_offer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.marketplace_offers(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('proposed', 'accepted', 'declined', 'countered', 'withdrawn', 'expired')
  ),
  from_status TEXT,
  to_status TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS marketplace_offer_events_offer_idx
  ON public.marketplace_offer_events (offer_id, created_at, id);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.marketplace_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_amount_minor BIGINT CHECK (offer_amount_minor > 0),
  ADD COLUMN IF NOT EXISTS offer_currency VARCHAR(3) CHECK (offer_currency ~ '^[A-Z]{3}$'),
  ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS messages_offer_origin_idx
  ON public.messages (offer_id)
  WHERE is_offer AND offer_id IS NOT NULL;

-- Safely adopt legacy offer messages. If a conversation contains several
-- legacy pending offers, only the newest unexpired one stays pending.
WITH ranked AS (
  SELECT
    m.*,
    c.buyer_id,
    c.seller_id,
    ROW_NUMBER() OVER (
      PARTITION BY m.conversation_id
      ORDER BY m.created_at DESC, m.id DESC
    ) AS pending_rank
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.is_offer AND m.offer_price IS NOT NULL
), adopted AS (
  INSERT INTO public.marketplace_offers (
    id, conversation_id, creator_id, recipient_id, amount_minor, currency,
    status, expires_at, resolved_at, created_at, updated_at
  )
  SELECT
    id,
    conversation_id,
    sender_id,
    CASE WHEN sender_id = buyer_id THEN seller_id ELSE buyer_id END,
    GREATEST(1, ROUND(offer_price * 100)::BIGINT),
    'EUR',
    CASE
      WHEN offer_status IN ('accepted', 'declined', 'expired') THEN offer_status
      WHEN pending_rank = 1 AND created_at + INTERVAL '7 days' > NOW() THEN 'pending'
      ELSE 'expired'
    END,
    GREATEST(created_at + INTERVAL '7 days', created_at + INTERVAL '1 second'),
    CASE
      WHEN offer_status IN ('accepted', 'declined', 'expired') THEN created_at
      WHEN pending_rank = 1 AND created_at + INTERVAL '7 days' > NOW() THEN NULL
      ELSE NOW()
    END,
    created_at,
    created_at
  FROM ranked
  WHERE sender_id IN (buyer_id, seller_id)
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
UPDATE public.messages m
SET
  offer_id = o.id,
  offer_amount_minor = o.amount_minor,
  offer_currency = o.currency,
  offer_expires_at = o.expires_at,
  offer_status = o.status
FROM public.marketplace_offers o
WHERE m.id = o.id AND m.is_offer;

CREATE OR REPLACE FUNCTION public.create_marketplace_offer(
  p_conversation_id UUID,
  p_actor_id UUID,
  p_amount_minor BIGINT,
  p_currency TEXT,
  p_message_text TEXT,
  p_expires_at TIMESTAMPTZ,
  p_parent_offer_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_conversation public.conversations%ROWTYPE;
  parent_offer public.marketplace_offers%ROWTYPE;
  created_offer public.marketplace_offers%ROWTYPE;
  created_message public.messages%ROWTYPE;
  recipient UUID;
  now_at TIMESTAMPTZ := NOW();
BEGIN
  IF p_amount_minor IS NULL OR p_amount_minor <= 0 OR p_amount_minor > 999999999999 THEN
    RAISE EXCEPTION 'invalid offer amount' USING ERRCODE = '22023';
  END IF;
  IF p_currency IS NULL OR UPPER(p_currency) !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'invalid offer currency' USING ERRCODE = '22023';
  END IF;
  IF p_message_text IS NULL OR char_length(btrim(p_message_text)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'invalid offer message' USING ERRCODE = '22023';
  END IF;
  IF p_expires_at <= now_at OR p_expires_at > now_at + INTERVAL '30 days' THEN
    RAISE EXCEPTION 'invalid offer expiry' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO target_conversation
  FROM public.conversations
  WHERE id = p_conversation_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_actor_id NOT IN (target_conversation.buyer_id, target_conversation.seller_id) THEN
    RAISE EXCEPTION 'conversation access denied' USING ERRCODE = '42501';
  END IF;
  recipient := CASE
    WHEN p_actor_id = target_conversation.buyer_id THEN target_conversation.seller_id
    ELSE target_conversation.buyer_id
  END;
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = p_actor_id AND blocked_id = recipient)
       OR (blocker_id = recipient AND blocked_id = p_actor_id)
  ) THEN
    RAISE EXCEPTION 'conversation blocked' USING ERRCODE = '42501';
  END IF;

  -- Expiry is materialized before checking the one-pending invariant.
  UPDATE public.marketplace_offers
  SET status = 'expired', resolved_at = now_at, updated_at = now_at
  WHERE conversation_id = p_conversation_id
    AND status = 'pending'
    AND expires_at <= now_at;
  UPDATE public.messages m
  SET offer_status = 'expired'
  FROM public.marketplace_offers o
  WHERE m.offer_id = o.id
    AND o.conversation_id = p_conversation_id
    AND o.status = 'expired'
    AND m.is_offer;

  IF p_parent_offer_id IS NOT NULL THEN
    SELECT * INTO parent_offer
    FROM public.marketplace_offers
    WHERE id = p_parent_offer_id AND conversation_id = p_conversation_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'parent offer not found' USING ERRCODE = 'P0002';
    END IF;
    IF parent_offer.status <> 'pending' OR parent_offer.expires_at <= now_at THEN
      RAISE EXCEPTION 'parent offer is no longer pending' USING ERRCODE = '23514';
    END IF;
    IF parent_offer.recipient_id <> p_actor_id THEN
      RAISE EXCEPTION 'only the recipient may counter an offer' USING ERRCODE = '42501';
    END IF;
    UPDATE public.marketplace_offers
    SET status = 'countered', resolved_at = now_at, updated_at = now_at
    WHERE id = parent_offer.id;
    UPDATE public.messages SET offer_status = 'countered'
    WHERE offer_id = parent_offer.id AND is_offer;
    INSERT INTO public.marketplace_offer_events (
      offer_id, actor_id, event_type, from_status, to_status
    ) VALUES (
      parent_offer.id, p_actor_id, 'countered', 'pending', 'countered'
    );
  ELSIF EXISTS (
    SELECT 1 FROM public.marketplace_offers
    WHERE conversation_id = p_conversation_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'a pending offer already exists' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.marketplace_offers (
    conversation_id, creator_id, recipient_id, parent_offer_id,
    amount_minor, currency, expires_at
  ) VALUES (
    p_conversation_id, p_actor_id, recipient, p_parent_offer_id,
    p_amount_minor, UPPER(p_currency), p_expires_at
  ) RETURNING * INTO created_offer;

  INSERT INTO public.messages (
    id, conversation_id, sender_id, text, is_offer, offer_price,
    offer_status, offer_id, offer_amount_minor, offer_currency,
    offer_expires_at, created_at
  ) VALUES (
    created_offer.id, p_conversation_id, p_actor_id, btrim(p_message_text), TRUE,
    p_amount_minor::NUMERIC / 100, 'pending', created_offer.id,
    p_amount_minor, UPPER(p_currency), p_expires_at, now_at
  ) RETURNING * INTO created_message;

  INSERT INTO public.marketplace_offer_events (
    offer_id, actor_id, event_type, from_status, to_status,
    metadata
  ) VALUES (
    created_offer.id, p_actor_id, 'proposed', NULL, 'pending',
    jsonb_build_object('amountMinor', p_amount_minor, 'currency', UPPER(p_currency))
  );
  UPDATE public.conversations
  SET last_message_text = created_message.text,
      last_message_at = created_message.created_at,
      updated_at = now_at
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('offer_message', to_jsonb(created_message));
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_marketplace_offer(
  p_offer_id UUID,
  p_actor_id UUID,
  p_decision TEXT,
  p_message_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_offer public.marketplace_offers%ROWTYPE;
  offer_message public.messages%ROWTYPE;
  event_message public.messages%ROWTYPE;
  now_at TIMESTAMPTZ := NOW();
BEGIN
  IF p_decision NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'invalid offer decision' USING ERRCODE = '22023';
  END IF;
  IF p_message_text IS NULL OR char_length(btrim(p_message_text)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'invalid response message' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO target_offer
  FROM public.marketplace_offers
  WHERE id = p_offer_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer not found' USING ERRCODE = 'P0002';
  END IF;
  IF target_offer.recipient_id <> p_actor_id THEN
    RAISE EXCEPTION 'only the recipient may respond' USING ERRCODE = '42501';
  END IF;
  IF target_offer.status <> 'pending' THEN
    RAISE EXCEPTION 'offer is no longer pending' USING ERRCODE = '23514';
  END IF;

  IF target_offer.expires_at <= now_at THEN
    UPDATE public.marketplace_offers
    SET status = 'expired', resolved_at = now_at, updated_at = now_at
    WHERE id = target_offer.id;
    UPDATE public.messages SET offer_status = 'expired'
    WHERE offer_id = target_offer.id AND is_offer
    RETURNING * INTO offer_message;
    INSERT INTO public.marketplace_offer_events (
      offer_id, actor_id, event_type, from_status, to_status
    ) VALUES (target_offer.id, p_actor_id, 'expired', 'pending', 'expired');
    RETURN jsonb_build_object('offer_message', to_jsonb(offer_message));
  END IF;

  UPDATE public.marketplace_offers
  SET status = p_decision, resolved_at = now_at, updated_at = now_at
  WHERE id = target_offer.id;
  UPDATE public.messages SET offer_status = p_decision
  WHERE offer_id = target_offer.id AND is_offer
  RETURNING * INTO offer_message;
  INSERT INTO public.marketplace_offer_events (
    offer_id, actor_id, event_type, from_status, to_status
  ) VALUES (target_offer.id, p_actor_id, p_decision, 'pending', p_decision);
  INSERT INTO public.messages (
    conversation_id, sender_id, text, created_at
  ) VALUES (
    target_offer.conversation_id, p_actor_id, btrim(p_message_text), now_at
  ) RETURNING * INTO event_message;
  UPDATE public.conversations
  SET last_message_text = event_message.text,
      last_message_at = event_message.created_at,
      updated_at = now_at
  WHERE id = target_offer.conversation_id;
  RETURN jsonb_build_object(
    'offer_message', to_jsonb(offer_message),
    'event_message', to_jsonb(event_message)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_marketplace_offer(
  p_offer_id UUID,
  p_actor_id UUID,
  p_message_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_offer public.marketplace_offers%ROWTYPE;
  offer_message public.messages%ROWTYPE;
  event_message public.messages%ROWTYPE;
  now_at TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO target_offer
  FROM public.marketplace_offers
  WHERE id = p_offer_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer not found' USING ERRCODE = 'P0002';
  END IF;
  IF target_offer.creator_id <> p_actor_id THEN
    RAISE EXCEPTION 'only the creator may withdraw' USING ERRCODE = '42501';
  END IF;
  IF target_offer.status <> 'pending' THEN
    RAISE EXCEPTION 'offer is no longer pending' USING ERRCODE = '23514';
  END IF;
  UPDATE public.marketplace_offers
  SET status = 'withdrawn', resolved_at = now_at, updated_at = now_at
  WHERE id = target_offer.id;
  UPDATE public.messages SET offer_status = 'withdrawn'
  WHERE offer_id = target_offer.id AND is_offer
  RETURNING * INTO offer_message;
  INSERT INTO public.marketplace_offer_events (
    offer_id, actor_id, event_type, from_status, to_status
  ) VALUES (target_offer.id, p_actor_id, 'withdrawn', 'pending', 'withdrawn');
  INSERT INTO public.messages (conversation_id, sender_id, text, created_at)
  VALUES (target_offer.conversation_id, p_actor_id, btrim(p_message_text), now_at)
  RETURNING * INTO event_message;
  UPDATE public.conversations
  SET last_message_text = event_message.text,
      last_message_at = event_message.created_at,
      updated_at = now_at
  WHERE id = target_offer.conversation_id;
  RETURN jsonb_build_object(
    'offer_message', to_jsonb(offer_message),
    'event_message', to_jsonb(event_message)
  );
END;
$$;

ALTER TABLE public.marketplace_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_offer_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketplace_offers FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.marketplace_offer_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_offers TO service_role;
GRANT SELECT, INSERT ON public.marketplace_offer_events TO service_role;

REVOKE ALL ON FUNCTION public.create_marketplace_offer(UUID, UUID, BIGINT, TEXT, TEXT, TIMESTAMPTZ, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.respond_marketplace_offer(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.withdraw_marketplace_offer(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_marketplace_offer(UUID, UUID, BIGINT, TEXT, TEXT, TIMESTAMPTZ, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_marketplace_offer(UUID, UUID, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.withdraw_marketplace_offer(UUID, UUID, TEXT)
  TO service_role;
