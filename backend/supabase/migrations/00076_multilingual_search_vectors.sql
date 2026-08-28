-- Locale-neutral search vectors for the multi-country catalog. Existing rows
-- are queued by version and reindexed in bounded worker batches; the migration
-- itself never rewrites an entire catalog table.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS search_vector_version SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE public.auto_vehicles
  ADD COLUMN IF NOT EXISTS search_vector_version SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE public.course_tutor_profiles
  ADD COLUMN IF NOT EXISTS search_vector_version SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE public.course_offers
  ADD COLUMN IF NOT EXISTS search_vector_version SMALLINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS listings_search_reindex_pending_idx
  ON public.listings (id) WHERE search_vector_version < 2;
CREATE INDEX IF NOT EXISTS auto_search_reindex_pending_idx
  ON public.auto_vehicles (id) WHERE search_vector_version < 2;
CREATE INDEX IF NOT EXISTS course_profiles_search_reindex_pending_idx
  ON public.course_tutor_profiles (id) WHERE search_vector_version < 2;
CREATE INDEX IF NOT EXISTS course_offers_search_reindex_pending_idx
  ON public.course_offers (id) WHERE search_vector_version < 2;

CREATE OR REPLACE FUNCTION public.update_listing_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', public.unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('simple', public.unaccent(coalesce(NEW.brand, ''))), 'B') ||
    setweight(to_tsvector('simple', public.unaccent(coalesce(NEW.model, ''))), 'B') ||
    setweight(to_tsvector('simple', public.unaccent(coalesce(NEW.city, ''))), 'C') ||
    setweight(to_tsvector('simple', public.unaccent(coalesce(NEW.description, ''))), 'D');
  NEW.search_vector_version := 2;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_auto_search_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_document := to_tsvector(
    'simple',
    public.unaccent(
      COALESCE(NEW.public_payload->>'title','') || ' ' ||
      COALESCE(NEW.public_payload->>'description','') || ' ' ||
      COALESCE(NEW.public_payload->>'makeLabel','') || ' ' ||
      COALESCE(NEW.public_payload->>'modelLabel','')
    )
  );
  NEW.search_vector_version := 2;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_course_search_vectors()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'simple',
    public.unaccent(
      COALESCE(to_jsonb(NEW)->>'headline', to_jsonb(NEW)->>'title', '') || ' ' ||
      COALESCE(to_jsonb(NEW)->>'biography', to_jsonb(NEW)->>'description', '')
    )
  );
  NEW.search_vector_version := 2;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_vehicle_search_document_trigger ON public.auto_vehicles;
CREATE TRIGGER auto_vehicle_search_document_trigger
BEFORE INSERT OR UPDATE OF public_payload ON public.auto_vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_auto_search_document();

CREATE OR REPLACE FUNCTION public.reindex_multilingual_search_batch(
  p_limit INTEGER DEFAULT 250
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  bounded_limit INTEGER := LEAST(GREATEST(p_limit, 1), 1000);
  listing_count INTEGER := 0;
  auto_count INTEGER := 0;
  tutor_count INTEGER := 0;
  offer_count INTEGER := 0;
BEGIN
  WITH candidates AS (
    SELECT listing.id FROM public.listings listing
    WHERE listing.search_vector_version < 2
    ORDER BY listing.id FOR UPDATE SKIP LOCKED LIMIT bounded_limit
  )
  UPDATE public.listings listing SET title = listing.title
  FROM candidates WHERE listing.id = candidates.id;
  GET DIAGNOSTICS listing_count = ROW_COUNT;

  WITH candidates AS (
    SELECT vehicle.id FROM public.auto_vehicles vehicle
    WHERE vehicle.search_vector_version < 2
    ORDER BY vehicle.id FOR UPDATE SKIP LOCKED LIMIT bounded_limit
  )
  UPDATE public.auto_vehicles vehicle SET public_payload = vehicle.public_payload
  FROM candidates WHERE vehicle.id = candidates.id;
  GET DIAGNOSTICS auto_count = ROW_COUNT;

  WITH candidates AS (
    SELECT profile.id FROM public.course_tutor_profiles profile
    WHERE profile.search_vector_version < 2
    ORDER BY profile.id FOR UPDATE SKIP LOCKED LIMIT bounded_limit
  )
  UPDATE public.course_tutor_profiles profile SET headline = profile.headline
  FROM candidates WHERE profile.id = candidates.id;
  GET DIAGNOSTICS tutor_count = ROW_COUNT;

  WITH candidates AS (
    SELECT offer.id FROM public.course_offers offer
    WHERE offer.search_vector_version < 2
    ORDER BY offer.id FOR UPDATE SKIP LOCKED LIMIT bounded_limit
  )
  UPDATE public.course_offers offer SET title = offer.title
  FROM candidates WHERE offer.id = candidates.id;
  GET DIAGNOSTICS offer_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'listings', listing_count,
    'autoVehicles', auto_count,
    'courseProfiles', tutor_count,
    'courseOffers', offer_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reindex_multilingual_search_batch(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reindex_multilingual_search_batch(INTEGER)
  TO service_role;

COMMENT ON FUNCTION public.reindex_multilingual_search_batch(INTEGER) IS
  'Bounded online backfill for locale-neutral search vectors; safe for repeated worker execution.';
