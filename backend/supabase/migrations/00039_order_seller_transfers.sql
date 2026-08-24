-- Decouple customer charges from seller transfers. A successful checkout is a
-- platform charge; the API creates exactly one Stripe transfer only after the
-- order's handover/delivery transition has been confirmed.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS destination_account_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS seller_transfer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS seller_transfer_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS seller_transfer_status VARCHAR(32);

UPDATE public.orders
SET seller_transfer_status = CASE
  WHEN status = 'completed' THEN 'completed'
  ELSE 'pending'
END
WHERE seller_transfer_status IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN seller_transfer_status SET DEFAULT 'pending',
  DROP CONSTRAINT IF EXISTS orders_seller_transfer_amount_check,
  ADD CONSTRAINT orders_seller_transfer_amount_check CHECK (
    seller_transfer_amount_minor IS NULL OR seller_transfer_amount_minor >= 0
  ) NOT VALID,
  DROP CONSTRAINT IF EXISTS orders_seller_transfer_status_check,
  ADD CONSTRAINT orders_seller_transfer_status_check CHECK (
    seller_transfer_status IS NULL OR seller_transfer_status IN (
      'pending',
      'processing',
      'completed',
      'partially_reversed',
      'reversed'
    )
  ) NOT VALID,
  DROP CONSTRAINT IF EXISTS orders_seller_transfer_reference_check,
  ADD CONSTRAINT orders_seller_transfer_reference_check CHECK (
    seller_transfer_status NOT IN ('completed', 'partially_reversed', 'reversed')
    OR seller_transfer_amount_minor = 0
    OR seller_transfer_id IS NOT NULL
  ) NOT VALID;

ALTER TABLE public.orders
  VALIDATE CONSTRAINT orders_seller_transfer_amount_check;
ALTER TABLE public.orders
  VALIDATE CONSTRAINT orders_seller_transfer_status_check;
ALTER TABLE public.orders
  VALIDATE CONSTRAINT orders_seller_transfer_reference_check;

CREATE UNIQUE INDEX IF NOT EXISTS orders_seller_transfer_unique_idx
  ON public.orders (seller_transfer_id)
  WHERE seller_transfer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_pending_seller_transfer_idx
  ON public.orders (updated_at)
  WHERE seller_transfer_status IN ('pending', 'processing');

