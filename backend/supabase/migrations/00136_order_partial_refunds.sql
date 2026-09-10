-- Partial refunds were rejected by the order service even though the
-- commission engine already computes proportional reversals and tracks
-- previously reversed amounts. What was actually missing was somewhere to put
-- more than one refund per order: the order row holds a single provider refund
-- id and a single idempotency key, so a second refund had nowhere to live.
--
-- This adds the ledger. One row per provider refund, unique on both the
-- idempotency key and the provider id, so a replayed request returns the
-- original refund instead of issuing a second one.

CREATE TABLE public.order_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider_refund_id TEXT,
  idempotency_key TEXT NOT NULL,
  -- The item-value portion being refunded. Drives the commission reversal.
  base_minor BIGINT NOT NULL CHECK (base_minor > 0),
  -- What the buyer is actually credited, which includes fees on a full refund.
  refunded_minor BIGINT NOT NULL CHECK (refunded_minor > 0),
  currency VARCHAR(3) NOT NULL,
  is_full BOOLEAN NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, idempotency_key)
);

CREATE UNIQUE INDEX order_refunds_provider_id_key
  ON public.order_refunds (provider_refund_id)
  WHERE provider_refund_id IS NOT NULL;

CREATE INDEX order_refunds_order_created_idx
  ON public.order_refunds (order_id, created_at DESC, id);

ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_refunds FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_refunds FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_refunds TO service_role;

-- Running total of the item value refunded so far. The order only becomes
-- `refunded` when this reaches the item amount; a partial refund leaves the
-- order in its fulfilled state with money returned against it.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_base_total_minor BIGINT NOT NULL DEFAULT 0
    CHECK (refunded_base_total_minor >= 0);

-- Preserve the refunds that already exist as single-row ledgers so the
-- accumulator and the ledger agree from the first deployment onward.
INSERT INTO public.order_refunds (
  order_id,
  provider_refund_id,
  idempotency_key,
  base_minor,
  refunded_minor,
  currency,
  is_full,
  status,
  created_at,
  updated_at
)
SELECT
  o.id,
  o.refund_provider_id,
  COALESCE(o.refund_idempotency_key, 'migrated:' || o.id::TEXT),
  GREATEST(COALESCE(o.refund_base_minor, 0), 1),
  GREATEST(
    COALESCE(o.total_charged_minor, ROUND(o.total_charged * 100)::BIGINT),
    1
  ),
  o.currency,
  TRUE,
  CASE WHEN o.status = 'refunded' THEN 'succeeded' ELSE 'pending' END,
  o.updated_at,
  o.updated_at
FROM public.orders o
WHERE o.refund_provider_id IS NOT NULL
ON CONFLICT (order_id, idempotency_key) DO NOTHING;

UPDATE public.orders o
   SET refunded_base_total_minor = COALESCE(o.refund_base_minor, 0)
 WHERE o.status = 'refunded'
   AND o.refunded_base_total_minor = 0;

CREATE OR REPLACE FUNCTION public.touch_order_refund_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_order_refund_updated_at()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS order_refunds_touch_updated_at ON public.order_refunds;
CREATE TRIGGER order_refunds_touch_updated_at
  BEFORE UPDATE ON public.order_refunds
  FOR EACH ROW EXECUTE FUNCTION public.touch_order_refund_updated_at();

COMMENT ON TABLE public.order_refunds IS
  'One row per provider refund against an order. Unique on idempotency key and provider id so a replay never issues a second refund.';
COMMENT ON COLUMN public.orders.refunded_base_total_minor IS
  'Running total of item value refunded. Reaching the item amount is what makes an order fully refunded.';
