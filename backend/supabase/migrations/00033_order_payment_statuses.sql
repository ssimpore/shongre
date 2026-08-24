-- Payment provider callbacks can leave an order awaiting asynchronous payment or
-- refund settlement. Add the states in their own migration because PostgreSQL
-- cannot safely use a newly-added enum value until the adding transaction commits.
ALTER TYPE public.transaction_status
  ADD VALUE IF NOT EXISTS 'payment_pending' AFTER 'initiated';

ALTER TYPE public.transaction_status
  ADD VALUE IF NOT EXISTS 'refund_pending' AFTER 'completed';
