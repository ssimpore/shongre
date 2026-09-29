-- A review reminder is due per participant, not per order. The worker read the
-- oldest completed orders in its window and re-inspected every one of them each
-- hour, so once that many had been handled, newer exchanges were never reached.
-- This returns only the participants still owed a reminder — neither reminded
-- nor already the author of a review for that order — so every pair the worker
-- claims drops out of the next read.
CREATE OR REPLACE FUNCTION public.list_due_review_reminders(
  p_not_before TIMESTAMPTZ,
  p_not_after TIMESTAMPTZ,
  p_limit INT
)
RETURNS TABLE (
  order_id UUID,
  listing_id UUID,
  recipient_id UUID,
  counterpart_id UUID,
  recipient_role TEXT,
  completed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT purchase.id,
         purchase.listing_id,
         participant.recipient_id,
         participant.counterpart_id,
         participant.recipient_role,
         purchase.completed_at
    FROM public.orders purchase
   CROSS JOIN LATERAL (
     VALUES ('buyer', purchase.buyer_id, purchase.seller_id),
            ('seller', purchase.seller_id, purchase.buyer_id)
   ) AS participant (recipient_role, recipient_id, counterpart_id)
   WHERE purchase.status = 'completed'
     AND purchase.completed_at BETWEEN p_not_before AND p_not_after
     AND purchase.buyer_id <> purchase.seller_id
     AND NOT EXISTS (
       SELECT 1
         FROM public.order_review_reminders reminder
        WHERE reminder.order_id = purchase.id
          AND reminder.user_id = participant.recipient_id
     )
     AND NOT EXISTS (
       SELECT 1
         FROM public.reviews review
        WHERE review.order_id = purchase.id
          AND review.author_id = participant.recipient_id
     )
   ORDER BY purchase.completed_at, purchase.id, participant.recipient_role
   LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 500));
$$;

REVOKE ALL ON FUNCTION public.list_due_review_reminders(TIMESTAMPTZ, TIMESTAMPTZ, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_due_review_reminders(TIMESTAMPTZ, TIMESTAMPTZ, INT) TO service_role;
