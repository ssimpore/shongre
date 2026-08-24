-- The API/service role is the only authority allowed to transition an order.
-- Participants retain read access through the existing SELECT policy.
DROP POLICY IF EXISTS "Buyers can create orders" ON public.orders;
DROP POLICY IF EXISTS "Order participants can update orders" ON public.orders;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;

-- Invalidate every legacy plaintext code before dropping the old mechanism.
DROP TRIGGER IF EXISTS generate_order_handover_pin_trigger ON public.orders;
DROP FUNCTION IF EXISTS public.generate_handover_pin();
UPDATE public.orders SET handover_pin = NULL WHERE handover_pin IS NOT NULL;
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_handover_pin_format_check,
  DROP COLUMN IF EXISTS handover_pin,
  DROP COLUMN IF EXISTS pin_attempts;

CREATE OR REPLACE FUNCTION public.record_order_handover_pin_failure(
  p_order_id UUID
)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_attempts INTEGER;
BEGIN
  SELECT handover_pin_attempts
  INTO current_attempts
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN QUERY
  UPDATE public.orders
  SET
    handover_pin_attempts = LEAST(current_attempts + 1, 5),
    handover_pin_locked_until = CASE
      WHEN current_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
      ELSE handover_pin_locked_until
    END,
    updated_at = NOW()
  WHERE id = p_order_id
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.record_order_handover_pin_failure(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_handover_pin_failure(UUID)
  TO service_role;
