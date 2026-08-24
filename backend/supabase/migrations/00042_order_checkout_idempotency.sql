-- A client retry after a lost checkout response must resolve the original
-- order and Stripe idempotency key instead of creating a second purchase.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_idempotency_key VARCHAR(200);

CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_idempotency_unique_idx
  ON public.orders (checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_checkout_idempotency_format_check,
  ADD CONSTRAINT orders_checkout_idempotency_format_check CHECK (
    checkout_idempotency_key IS NULL
    OR char_length(checkout_idempotency_key) BETWEEN 8 AND 200
  ) NOT VALID;

ALTER TABLE public.orders
  VALIDATE CONSTRAINT orders_checkout_idempotency_format_check;
