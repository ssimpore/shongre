-- Say what `geocoded_at` means, and index the retry it exists to support.
--
-- The column was introduced alongside the geographic point and reads, to anyone
-- who has not run the backfill, as "the time this row was successfully
-- geocoded". It is not: `make geo-backfill` stamps it on every *attempt*,
-- including the ones it refuses, because a row the provider declined to place
-- must not be asked about again on the next run. Success is
-- `geographic_point IS NOT NULL` together with `location_source = 'geocoded'`;
-- this column only says when the question was last asked.
--
-- Documented in a migration rather than in the script because the misreading
-- happens at the schema, where the script is not in view.

COMMENT ON COLUMN public.listings.geocoded_at IS
    'When a geocoding provider was last consulted for this row, whether or not it answered. Success is geographic_point IS NOT NULL with location_source = ''geocoded''.';

COMMENT ON COLUMN public.listings.location_updated_at IS
    'When this row''s coordinate or town last changed. Maintained by trigger, not by callers.';

COMMENT ON COLUMN public.listings.geocoding_provider IS
    'The adapter that produced the stored coordinate. Never published; it identifies a supplier, not a place.';

-- The backfill selects rows with no point that were either never attempted or
-- attempted long enough ago to be worth retrying. The existing partial index
-- narrows to "no point"; without `geocoded_at` in it, every run re-reads and
-- discards the rows the previous run already refused, and that share grows with
-- each pass until the useful work is a minority of the scan.
CREATE INDEX IF NOT EXISTS listings_geocoding_retry_idx
    ON public.listings (market_code, geocoded_at NULLS FIRST, created_at)
    WHERE geographic_point IS NULL;
