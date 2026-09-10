-- Card-network chargebacks had no representation. The order webhook handler
-- only recognised `checkout.session.*` and `refund.updated`, so a
-- `charge.dispute.created` was answered "not_marketplace_order": the order
-- stayed `completed`, the seller kept a transfer the platform had already lost
-- from its balance, and the commission was never reversed.
--
-- A chargeback is not a buyer-opened dispute and not a refund. The money is
-- taken by the network, so no refund may be issued for it — issuing one pays
-- the buyer twice. It therefore gets its own columns rather than reusing the
-- refund ventilation, and the order status moves to `disputed`, which already
-- blocks payout and completion.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS chargeback_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS chargeback_status TEXT,
  ADD COLUMN IF NOT EXISTS chargeback_reason TEXT,
  ADD COLUMN IF NOT EXISTS chargeback_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS chargeback_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS chargeback_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_failure_code TEXT,
  ADD COLUMN IF NOT EXISTS payout_failed_at TIMESTAMPTZ;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_chargeback_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_chargeback_status_check CHECK (
    chargeback_status IS NULL
    OR chargeback_status IN (
      'warning',
      'open',
      'under_review',
      'won',
      'lost',
      'withdrawn'
    )
  );

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_chargeback_amount_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_chargeback_amount_check CHECK (
    chargeback_amount_minor IS NULL OR chargeback_amount_minor > 0
  );

-- A provider dispute belongs to exactly one order. The unique index is what
-- makes replaying `charge.dispute.created` for a second order impossible.
CREATE UNIQUE INDEX IF NOT EXISTS orders_chargeback_provider_id_key
  ON public.orders (chargeback_provider_id)
  WHERE chargeback_provider_id IS NOT NULL;

-- Operations needs the open ones without scanning the order table.
CREATE INDEX IF NOT EXISTS orders_open_chargebacks_idx
  ON public.orders (chargeback_opened_at DESC, id)
  WHERE chargeback_status IN ('warning', 'open', 'under_review');

COMMENT ON COLUMN public.orders.chargeback_provider_id IS
  'Payment-provider dispute identifier. Unique: one dispute maps to one order.';
COMMENT ON COLUMN public.orders.payout_failure_code IS
  'Provider reason code from the last failed seller payout, for reconciliation.';
