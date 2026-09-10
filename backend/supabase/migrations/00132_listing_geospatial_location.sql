-- Canonical geospatial location for the generic listing backbone.
--
-- Until now only `real_estate_properties` had an authoritative point: it carries
-- `location_point geography(POINT,4326)`, a GiST index and a spatial RPC, while
-- `public.listings` — every other listing in the marketplace — carried a pair of
-- NUMERIC columns with no index, no constraint and no spatial query. There was
-- therefore no radius search on the marketplace at all, and nothing stopped a
-- row holding (0, 0), 200 degrees of latitude, or a point that disagreed with
-- its own latitude/longitude pair.
--
-- This adds the same shape the real-estate vertical already proves, on the
-- generic table, plus the provenance and precision a location needs before it
-- can be published safely:
--
--   * `geographic_point` is authoritative for every spatial operation.
--   * `latitude`/`longitude` stay, because the public API and both clients read
--     them today, and are kept in step by trigger rather than by callers.
--   * `location_precision` decides what a public reader is allowed to see. It
--     defaults to `approximate`: a private seller's doorstep is not a public
--     fact, and a default that leaked would leak silently.
--   * `location_source` and `geocoding_provider` record where a coordinate came
--     from, so a backfill can tell a geocoded point from a town centroid and
--     never re-resolve an address that has not changed.
--
-- Backfill is deliberately not performed here. Geocoding hundreds of thousands
-- of addresses inside a migration would hold a transaction open against a
-- third-party rate limit; `make geo-backfill` does it resumably instead.

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.listings
    ADD COLUMN IF NOT EXISTS administrative_area VARCHAR(160),
    ADD COLUMN IF NOT EXISTS normalized_address TEXT,
    ADD COLUMN IF NOT EXISTS geographic_point extensions.geography(POINT, 4326),
    ADD COLUMN IF NOT EXISTS location_precision VARCHAR(20) NOT NULL DEFAULT 'approximate',
    ADD COLUMN IF NOT EXISTS location_source VARCHAR(20),
    ADD COLUMN IF NOT EXISTS geocoding_provider VARCHAR(60),
    ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.listings.geographic_point IS
    'Authoritative location. Every spatial filter, distance and sort reads this column, never latitude/longitude.';
COMMENT ON COLUMN public.listings.location_precision IS
    'The most revealing precision a public reader may receive. Never publish the stored point when this is not exact.';
COMMENT ON COLUMN public.listings.location_source IS
    'Where the coordinate came from. Lets a backfill skip what is already resolved and retry only what failed.';

-- ---------------------------------------------------------------------------
-- 2. Constraints
-- ---------------------------------------------------------------------------
-- Coordinate ranges. Written as NOT VALID first so an existing table with a bad
-- row is reported by `make geo-backfill` rather than blocking the deployment.
DO $constraints$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listings_latitude_range_check'
    ) THEN
        ALTER TABLE public.listings
            ADD CONSTRAINT listings_latitude_range_check
            CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listings_longitude_range_check'
    ) THEN
        ALTER TABLE public.listings
            ADD CONSTRAINT listings_longitude_range_check
            CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listings_country_code_format_check'
    ) THEN
        ALTER TABLE public.listings
            ADD CONSTRAINT listings_country_code_format_check
            CHECK (country ~ '^[A-Z]{2}$') NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listings_location_precision_check'
    ) THEN
        ALTER TABLE public.listings
            ADD CONSTRAINT listings_location_precision_check
            CHECK (location_precision IN ('exact','approximate','city','postal_code','hidden'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listings_location_source_check'
    ) THEN
        ALTER TABLE public.listings
            ADD CONSTRAINT listings_location_source_check
            CHECK (
                location_source IS NULL
                OR location_source IN ('user_pin','geocoded','gazetteer','device','imported')
            );
    END IF;

    -- The point and the pair must describe the same place. Half a millidegree
    -- is roughly 55 m, which absorbs the NUMERIC(10,7) rounding without
    -- admitting a genuinely different coordinate.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listings_point_matches_coordinates_check'
    ) THEN
        ALTER TABLE public.listings
            ADD CONSTRAINT listings_point_matches_coordinates_check
            CHECK (
                geographic_point IS NULL
                OR (
                    latitude IS NOT NULL
                    AND longitude IS NOT NULL
                    AND ABS(extensions.ST_Y(geographic_point::extensions.geometry) - latitude) < 0.0005
                    AND ABS(extensions.ST_X(geographic_point::extensions.geometry) - longitude) < 0.0005
                )
            ) NOT VALID;
    END IF;
END
$constraints$;

-- ---------------------------------------------------------------------------
-- 3. Keeping the point and the pair in step
-- ---------------------------------------------------------------------------
-- Callers write whichever they have. A publication flow writes latitude and
-- longitude; a backfill writes the point. Deriving the other here means no
-- caller can leave the two disagreeing, and the constraint above can be trusted.
CREATE OR REPLACE FUNCTION public.sync_listing_geographic_point()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    -- (0, 0) is in the Gulf of Guinea and is what a defaulted number looks like.
    IF NEW.latitude = 0 AND NEW.longitude = 0 THEN
        NEW.latitude := NULL;
        NEW.longitude := NULL;
    END IF;

    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        IF TG_OP = 'INSERT'
           OR NEW.latitude IS DISTINCT FROM OLD.latitude
           OR NEW.longitude IS DISTINCT FROM OLD.longitude
           OR NEW.geographic_point IS NULL THEN
            NEW.geographic_point := extensions.ST_SetSRID(
                extensions.ST_MakePoint(NEW.longitude, NEW.latitude),
                4326
            )::extensions.geography;
        END IF;
    ELSIF NEW.geographic_point IS NOT NULL THEN
        NEW.latitude := extensions.ST_Y(NEW.geographic_point::extensions.geometry);
        NEW.longitude := extensions.ST_X(NEW.geographic_point::extensions.geometry);
    ELSE
        NEW.geographic_point := NULL;
    END IF;

    IF TG_OP = 'INSERT'
       OR NEW.geographic_point IS DISTINCT FROM OLD.geographic_point
       OR NEW.city IS DISTINCT FROM OLD.city
       OR NEW.postal_code IS DISTINCT FROM OLD.postal_code THEN
        NEW.location_updated_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_sync_geographic_point ON public.listings;
CREATE TRIGGER listings_sync_geographic_point
    BEFORE INSERT OR UPDATE OF latitude, longitude, geographic_point, city, postal_code
    ON public.listings
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_listing_geographic_point();

-- Adopt the coordinates rows already hold. This touches only rows that have a
-- usable pair and no point, so it is idempotent and safe to re-run.
UPDATE public.listings
   SET geographic_point = extensions.ST_SetSRID(
           extensions.ST_MakePoint(longitude, latitude),
           4326
       )::extensions.geography,
       location_source = COALESCE(location_source, 'imported'),
       location_updated_at = COALESCE(location_updated_at, updated_at)
 WHERE geographic_point IS NULL
   AND latitude IS NOT NULL
   AND longitude IS NOT NULL
   AND NOT (latitude = 0 AND longitude = 0)
   AND latitude BETWEEN -90 AND 90
   AND longitude BETWEEN -180 AND 180;

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS listings_geographic_point_gist_idx
    ON public.listings USING GIST (geographic_point);

-- Every spatial query is market-scoped and lifecycle-scoped first; a partial
-- index keeps expired and unpublished rows out of the map's working set.
CREATE INDEX IF NOT EXISTS listings_market_published_point_idx
    ON public.listings USING GIST (geographic_point)
    WHERE status = 'published' AND geographic_point IS NOT NULL;

CREATE INDEX IF NOT EXISTS listings_country_city_idx
    ON public.listings (country, city);
CREATE INDEX IF NOT EXISTS listings_postal_code_idx
    ON public.listings (postal_code)
    WHERE postal_code IS NOT NULL AND postal_code <> '';

-- Backfill scans this: published rows with no point, oldest first.
CREATE INDEX IF NOT EXISTS listings_missing_point_idx
    ON public.listings (market_code, created_at)
    WHERE geographic_point IS NULL;

-- ---------------------------------------------------------------------------
-- 5. Spatial search
-- ---------------------------------------------------------------------------
-- Identifier-only, like the real-estate equivalent: the caller already owns
-- projection, permissions and hydration, and returning rows here would fork
-- that logic. `ST_DWithin` on a geography column is the index-using form;
-- `ST_Distance(...) < x` is not, and would degrade to a sequential scan.
CREATE OR REPLACE FUNCTION public.search_listing_ids_spatial(
    p_market_code VARCHAR,
    p_center_latitude DOUBLE PRECISION DEFAULT NULL,
    p_center_longitude DOUBLE PRECISION DEFAULT NULL,
    p_radius_km DOUBLE PRECISION DEFAULT NULL,
    p_north DOUBLE PRECISION DEFAULT NULL,
    p_east DOUBLE PRECISION DEFAULT NULL,
    p_south DOUBLE PRECISION DEFAULT NULL,
    p_west DOUBLE PRECISION DEFAULT NULL,
    p_limit INTEGER DEFAULT 200
)
RETURNS TABLE (id UUID, distance_km DOUBLE PRECISION)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
    SELECT listing.id,
           CASE
               WHEN p_center_latitude IS NULL OR p_center_longitude IS NULL THEN NULL
               ELSE extensions.ST_Distance(
                        listing.geographic_point,
                        extensions.ST_SetSRID(
                            extensions.ST_MakePoint(p_center_longitude, p_center_latitude),
                            4326
                        )::extensions.geography
                    ) / 1000.0
           END AS distance_km
      FROM public.listings AS listing
     WHERE listing.market_code = p_market_code
       AND listing.status = 'published'
       AND listing.geographic_point IS NOT NULL
       AND (
         p_radius_km IS NULL
         OR (
           p_center_latitude IS NOT NULL
           AND p_center_longitude IS NOT NULL
           AND extensions.ST_DWithin(
             listing.geographic_point,
             extensions.ST_SetSRID(
               extensions.ST_MakePoint(p_center_longitude, p_center_latitude),
               4326
             )::extensions.geography,
             p_radius_km * 1000
           )
         )
       )
       AND (
         p_north IS NULL
         OR extensions.ST_Intersects(
           listing.geographic_point::extensions.geometry,
           extensions.ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
         )
       )
     ORDER BY distance_km NULLS LAST, listing.id
     LIMIT LEAST(GREATEST(p_limit, 1), 500);
$$;

REVOKE ALL ON FUNCTION public.search_listing_ids_spatial(
    VARCHAR, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION,
    DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_listing_ids_spatial(
    VARCHAR, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION,
    DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER
) TO service_role;
