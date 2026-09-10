-- Returns had no representation at all. `openDispute` wrote a status and free
-- text, and `refundOrder` only issued money, so there was no way for a buyer to
-- ask for a return, for a seller to answer, or for the platform to know a
-- return window had closed.
--
-- The withdrawal right that makes this mandatory applies to a consumer buying
-- from a trader, so eligibility is decided from the seller's publisher type
-- rather than offered on every order. A private-to-private sale keeps the
-- dispute path; it does not gain a statutory return.

CREATE TABLE public.order_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (
    reason IN (
      'withdrawal',
      'damaged',
      'not_as_described',
      'wrong_item',
      'missing_parts',
      'other'
    )
  ),
  details TEXT NOT NULL CHECK (char_length(btrim(details)) BETWEEN 10 AND 5000),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (
    status IN (
      'requested',
      'approved',
      'rejected',
      'shipped',
      'received',
      'refunded',
      'cancelled',
      'expired'
    )
  ),
  -- Statutory withdrawal is unconditional, so an approval decision may not
  -- refuse it. Recorded per return because the right depends on who sold.
  is_statutory_withdrawal BOOLEAN NOT NULL DEFAULT FALSE,
  requested_base_minor BIGINT NOT NULL CHECK (requested_base_minor > 0),
  currency VARCHAR(3) NOT NULL,
  window_expires_at TIMESTAMPTZ NOT NULL,
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_note TEXT CHECK (
    decision_note IS NULL OR char_length(btrim(decision_note)) BETWEEN 1 AND 2000
  ),
  carrier_name TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  refund_id UUID REFERENCES public.order_refunds(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status IN ('requested', 'cancelled', 'expired') AND decided_at IS NULL)
    OR (status NOT IN ('requested', 'cancelled', 'expired') AND decided_at IS NOT NULL)
  )
);

-- One open return per order. A buyer who wants to change the reason cancels
-- and reopens rather than accumulating parallel claims a seller must answer.
CREATE UNIQUE INDEX order_returns_one_open_per_order_idx
  ON public.order_returns (order_id)
  WHERE status IN ('requested', 'approved', 'shipped', 'received');

CREATE INDEX order_returns_open_by_age_idx
  ON public.order_returns (status, window_expires_at, id)
  WHERE status IN ('requested', 'approved', 'shipped');

CREATE INDEX order_returns_requester_idx
  ON public.order_returns (requester_id, created_at DESC, id);

ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_returns FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_returns FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_returns TO service_role;

DROP TRIGGER IF EXISTS order_returns_touch_updated_at ON public.order_returns;
CREATE TRIGGER order_returns_touch_updated_at
  BEFORE UPDATE ON public.order_returns
  FOR EACH ROW EXECUTE FUNCTION public.touch_order_refund_updated_at();

/**
 * Expires return windows that nobody acted on.
 *
 * A request the seller never answered is not silently dropped: it expires,
 * which is a state the buyer can see and escalate from, rather than an open
 * claim that stays open forever.
 */
CREATE OR REPLACE FUNCTION public.expire_stale_order_returns(
  p_limit INTEGER DEFAULT 500
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expired INTEGER := 0;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'invalid return expiry limit' USING ERRCODE = '22023';
  END IF;

  WITH stale AS (
    SELECT r.id
      FROM public.order_returns r
     WHERE r.status = 'requested'
       AND r.window_expires_at <= NOW()
     ORDER BY r.window_expires_at, r.id
     LIMIT p_limit
       FOR UPDATE SKIP LOCKED
  ),
  closed AS (
    UPDATE public.order_returns r
       SET status = 'expired'
      FROM stale s
     WHERE r.id = s.id
    RETURNING r.id
  )
  SELECT COUNT(*)::INTEGER INTO v_expired FROM closed;

  RETURN v_expired;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_stale_order_returns(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_stale_order_returns(INTEGER)
  TO service_role;

COMMENT ON TABLE public.order_returns IS
  'Buyer return requests and the seller decision on them. Statutory withdrawal returns cannot be refused.';
COMMENT ON COLUMN public.order_returns.window_expires_at IS
  'End of the period in which this return may be requested or answered.';
