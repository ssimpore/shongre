-- Deleting a listing (`PostgresListingRepository.delete`) makes PostgreSQL
-- check or cascade every foreign key that references it. Without an index on
-- the referencing column each check is a sequential scan, so one delete read
-- the whole favourites, watch-event, upload and IndexNow outbox tables — all of
-- which grow with traffic — while holding the listing row lock.
CREATE INDEX IF NOT EXISTS listing_market_favorites_listing_idx
  ON public.listing_market_favorites (listing_id);

CREATE INDEX IF NOT EXISTS listing_media_assets_listing_idx
  ON public.listing_media_assets (listing_id)
  WHERE listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS watch_events_listing_idx
  ON public.watch_events (listing_id);

CREATE INDEX IF NOT EXISTS indexnow_events_listing_idx
  ON public.indexnow_events (listing_id)
  WHERE listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS digital_credential_batches_listing_idx
  ON public.digital_credential_batches (listing_id);

CREATE INDEX IF NOT EXISTS digital_order_items_listing_idx
  ON public.digital_order_items (listing_id);

CREATE INDEX IF NOT EXISTS digital_entitlements_listing_idx
  ON public.digital_entitlements (listing_id);
