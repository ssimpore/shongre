-- Preserve historical unbound reviews without manufacturing transaction evidence.
-- New reviews are written only by the backend after authentication.
ALTER TABLE public.reviews DROP CONSTRAINT unique_review_order;
ALTER TABLE public.reviews ADD CONSTRAINT unique_review_order_author
  UNIQUE (order_id, author_id);

CREATE OR REPLACE FUNCTION public.enforce_transaction_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  purchase public.orders%ROWTYPE;
BEGIN
  SELECT * INTO purchase FROM public.orders WHERE id = NEW.order_id FOR UPDATE;
  IF NOT FOUND OR NEW.author_id NOT IN (purchase.buyer_id, purchase.seller_id)
     OR purchase.buyer_id = purchase.seller_id THEN
    RAISE EXCEPTION 'REVIEW_ORDER_NOT_FOUND' USING ERRCODE = '23514';
  END IF;
  IF purchase.status <> 'completed' THEN
    RAISE EXCEPTION 'REVIEW_ORDER_NOT_COMPLETED' USING ERRCODE = '23514';
  END IF;
  IF char_length(btrim(NEW.comment)) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'REVIEW_COMMENT_INVALID' USING ERRCODE = '23514';
  END IF;
  NEW.target_user_id := CASE WHEN NEW.author_id = purchase.buyer_id
    THEN purchase.seller_id ELSE purchase.buyer_id END;
  SELECT title INTO NEW.listing_title FROM public.listings WHERE id = purchase.listing_id;
  NEW.comment := btrim(NEW.comment);
  RETURN NEW;
END;
$$;
CREATE TRIGGER transaction_review_guard BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_transaction_review();
REVOKE ALL ON FUNCTION public.enforce_transaction_review() FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.reviews FROM anon, authenticated;

-- Public reviews must not disclose the private purchase identifier.
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, target_user_id, author_id, rating, comment, listing_title, created_at)
  ON public.reviews TO anon, authenticated;

-- Keep the existing insert/update/delete trigger, serializing each recipient's
-- aggregate before reading it. Empty profiles must never acquire five stars.
CREATE OR REPLACE FUNCTION public.update_seller_rating_summary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  target_user uuid;
BEGIN
  FOR target_user IN
    SELECT DISTINCT id FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.target_user_id END,
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.target_user_id END
    ]) AS targets(id) WHERE id IS NOT NULL ORDER BY id
  LOOP
    PERFORM 1 FROM public.profiles WHERE id = target_user FOR UPDATE;
    UPDATE public.profiles p SET
      rating = (SELECT coalesce(round(avg(rating)::numeric, 2), 0) FROM public.reviews WHERE target_user_id = p.id),
      review_count = (SELECT count(*) FROM public.reviews WHERE target_user_id = p.id),
      updated_at = now()
    WHERE p.id = target_user;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.update_seller_rating_summary() FROM PUBLIC, anon, authenticated;
