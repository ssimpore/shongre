-- A publication can be removed directly rather than transitioned to an
-- inactive status. Preserve that public URL lifecycle edge in the durable
-- IndexNow outbox as well.

CREATE OR REPLACE FUNCTION public.capture_indexnow_publication_delete_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status = 'active' AND OLD.compliance_state = 'approved' THEN
    PERFORM public.enqueue_indexnow_listing_event(
      OLD.listing_id,
      OLD.market_code,
      'removed',
      COALESCE(OLD.updated_at, NOW())
    );
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER capture_indexnow_publication_delete_event
  AFTER DELETE ON public.listing_market_publications
  FOR EACH ROW EXECUTE FUNCTION public.capture_indexnow_publication_delete_event();

REVOKE ALL ON FUNCTION public.capture_indexnow_publication_delete_event()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_indexnow_publication_delete_event()
  TO service_role;
