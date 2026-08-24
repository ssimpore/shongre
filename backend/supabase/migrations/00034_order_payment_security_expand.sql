-- Provider-authoritative marketplace payments and server-only handover secrets.

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS reservation_deposit_rate_bps INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS reservation_deposit_minimum_minor BIGINT NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS reservation_deposit_maximum_minor BIGINT NOT NULL DEFAULT 20000;

ALTER TABLE public.markets
  DROP CONSTRAINT IF EXISTS markets_reservation_deposit_rate_check,
  ADD CONSTRAINT markets_reservation_deposit_rate_check
    CHECK (reservation_deposit_rate_bps BETWEEN 0 AND 10000) NOT VALID,
  DROP CONSTRAINT IF EXISTS markets_reservation_deposit_range_check,
  ADD CONSTRAINT markets_reservation_deposit_range_check
    CHECK (
      reservation_deposit_minimum_minor >= 0
      AND reservation_deposit_maximum_minor >= reservation_deposit_minimum_minor
    ) NOT VALID;

ALTER TABLE public.markets
  VALIDATE CONSTRAINT markets_reservation_deposit_rate_check;
ALTER TABLE public.markets
  VALIDATE CONSTRAINT markets_reservation_deposit_range_check;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS item_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS protection_fee_minor BIGINT,
  ADD COLUMN IF NOT EXISTS shipping_fee_minor BIGINT,
  ADD COLUMN IF NOT EXISTS total_charged_minor BIGINT,
  ADD COLUMN IF NOT EXISTS escrow_secured_amount_minor BIGINT,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS checkout_session_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS handover_pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS handover_pin_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS handover_pin_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS handover_pin_locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_provider_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS refund_base_minor BIGINT,
  ADD COLUMN IF NOT EXISTS refund_idempotency_key VARCHAR(255);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS carrier_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(120),
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;

UPDATE public.orders AS orders
SET
  item_amount_minor = ROUND(orders.item_amount * 100)::BIGINT,
  protection_fee_minor = ROUND(orders.protection_fee * 100)::BIGINT,
  shipping_fee_minor = ROUND(orders.shipping_fee * 100)::BIGINT,
  total_charged_minor = ROUND(orders.total_charged * 100)::BIGINT,
  escrow_secured_amount_minor = ROUND(orders.escrow_secured_amount * 100)::BIGINT,
  currency = listings.currency
FROM public.listings AS listings
WHERE listings.id = orders.listing_id
  AND (
    orders.item_amount_minor IS NULL
    OR orders.protection_fee_minor IS NULL
    OR orders.shipping_fee_minor IS NULL
    OR orders.total_charged_minor IS NULL
    OR orders.escrow_secured_amount_minor IS NULL
    OR orders.currency IS NULL
  );

UPDATE public.orders SET currency = 'EUR' WHERE currency IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN item_amount_minor SET NOT NULL,
  ALTER COLUMN protection_fee_minor SET NOT NULL,
  ALTER COLUMN shipping_fee_minor SET NOT NULL,
  ALTER COLUMN total_charged_minor SET NOT NULL,
  ALTER COLUMN escrow_secured_amount_minor SET NOT NULL,
  ALTER COLUMN currency SET NOT NULL,
  DROP CONSTRAINT IF EXISTS orders_minor_amounts_nonnegative_check,
  ADD CONSTRAINT orders_minor_amounts_nonnegative_check CHECK (
    item_amount_minor >= 0
    AND protection_fee_minor >= 0
    AND shipping_fee_minor >= 0
    AND total_charged_minor >= 0
    AND escrow_secured_amount_minor >= 0
    AND (refund_base_minor IS NULL OR refund_base_minor > 0)
  ) NOT VALID,
  DROP CONSTRAINT IF EXISTS orders_total_minor_consistency_check,
  ADD CONSTRAINT orders_total_minor_consistency_check CHECK (
    total_charged_minor = item_amount_minor + protection_fee_minor + shipping_fee_minor
    AND escrow_secured_amount_minor = item_amount_minor + shipping_fee_minor
  ) NOT VALID,
  DROP CONSTRAINT IF EXISTS orders_currency_format_check,
  ADD CONSTRAINT orders_currency_format_check
    CHECK (currency ~ '^[A-Z]{3}$') NOT VALID,
  DROP CONSTRAINT IF EXISTS orders_handover_attempts_check,
  ADD CONSTRAINT orders_handover_attempts_check
    CHECK (handover_pin_attempts BETWEEN 0 AND 5) NOT VALID;

ALTER TABLE public.orders VALIDATE CONSTRAINT orders_minor_amounts_nonnegative_check;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_total_minor_consistency_check;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_currency_format_check;
ALTER TABLE public.orders VALIDATE CONSTRAINT orders_handover_attempts_check;

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_session_unique_idx
  ON public.orders (checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_intent_unique_idx
  ON public.orders (payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_refund_provider_unique_idx
  ON public.orders (refund_provider_id)
  WHERE refund_provider_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_refund_idempotency_unique_idx
  ON public.orders (refund_idempotency_key)
  WHERE refund_idempotency_key IS NOT NULL;

DROP INDEX IF EXISTS public.orders_one_active_per_listing_idx;
CREATE UNIQUE INDEX orders_one_active_per_listing_idx
  ON public.orders (listing_id)
  WHERE status IN (
    'initiated',
    'payment_pending',
    'escrow_funded',
    'shipped',
    'pin_pending',
    'disputed',
    'refund_pending'
  );
