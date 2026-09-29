-- A UGC report and a paid placement order are evidence that moderation and the
-- ledger rely on, yet both were erased with their listing. Removing a listing
-- archives it; a hard delete is reserved for a never-published draft and for
-- compensating a creation that failed, and a delete that reaches a listing
-- carrying either kind of evidence must now fail instead of destroying it.
ALTER TABLE public.reports
  DROP CONSTRAINT reports_listing_id_fkey,
  ADD CONSTRAINT reports_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id)
    ON DELETE RESTRICT;

ALTER TABLE public.listing_boost_orders
  DROP CONSTRAINT listing_boost_orders_listing_id_fkey,
  ADD CONSTRAINT listing_boost_orders_listing_id_fkey
    FOREIGN KEY (listing_id) REFERENCES public.listings(id)
    ON DELETE RESTRICT;
