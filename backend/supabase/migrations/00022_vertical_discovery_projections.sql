-- =============================================================================
-- Canonical discovery projections for Auto, Emploi, Cours and Immo
--
-- Specialized vertical tables remain authoritative. public.listings is the
-- single, backend-shaped candidate source consumed by unified discovery.
-- =============================================================================

INSERT INTO public.vertical_market_activations (
  vertical_type, market_code, category_ids, subcategory_ids,
  schema_version, is_active, feature_flags
) VALUES
  (
    'automotive', 'FR', ARRAY['vehicles'],
    ARRAY['vehicles.cars','vehicles.motos','vehicles.cycles'],
    1, TRUE, '{"discoveryProjectionEnabled":true}'::jsonb
  ),
  (
    'tutoring', 'FR', ARRAY['services'], ARRAY['services.tutoring'],
    1, TRUE, '{"discoveryProjectionEnabled":true}'::jsonb
  ),
  (
    'employment', 'FR', ARRAY['jobs'], ARRAY['jobs.offers'],
    1, TRUE, '{"discoveryProjectionEnabled":true}'::jsonb
  ),
  (
    'real_estate', 'FR', ARRAY['real_estate'],
    ARRAY['real_estate.sales','real_estate.rentals','real_estate.commercial','real_estate.parking'],
    1, TRUE, '{"discoveryProjectionEnabled":true}'::jsonb
  )
ON CONFLICT (vertical_type, market_code) DO UPDATE SET
  category_ids = EXCLUDED.category_ids,
  subcategory_ids = EXCLUDED.subcategory_ids,
  schema_version = EXCLUDED.schema_version,
  is_active = EXCLUDED.is_active,
  feature_flags = public.vertical_market_activations.feature_flags || EXCLUDED.feature_flags,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.resolve_vertical_publisher_user(
  p_actor_user_id UUID,
  p_organization_id UUID
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_organization_id IS NULL THEN p_actor_user_id
    WHEN EXISTS (
      SELECT 1
        FROM public.organizations organization
       WHERE organization.id = p_organization_id
         AND organization.owner_id = p_actor_user_id
         AND organization.status = 'active'
    ) OR EXISTS (
      SELECT 1
        FROM public.organization_members member
       WHERE member.organization_id = p_organization_id
         AND member.user_id = p_actor_user_id
         AND member.status = 'active'
         AND member.role IN ('owner','admin','manager','seller')
    ) THEN p_actor_user_id
    ELSE (
      SELECT organization.owner_id
        FROM public.organizations organization
       WHERE organization.id = p_organization_id
         AND organization.status = 'active'
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_vertical_publisher_verification(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS VARCHAR
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN organization.id IS NOT NULL AND organization.is_verified THEN 'business_verified'
    WHEN profile.is_identity_verified THEN 'identity_verified'
    WHEN profile.is_phone_verified THEN 'phone_verified'
    WHEN profile.is_email_verified THEN 'email_verified'
    ELSE 'unverified'
  END
  FROM public.profiles profile
  LEFT JOIN public.organizations organization
    ON organization.id = p_organization_id
  WHERE profile.id = p_user_id;
$$;

-- All vertical adapters call this routine. It intentionally does not use a
-- paid bump date as organic freshness: paid placement is represented by the
-- promotion columns and the discovery ranker inserts it transparently.
CREATE OR REPLACE FUNCTION public.upsert_vertical_discovery_listing(
  p_listing_id UUID,
  p_vertical_type VARCHAR,
  p_vertical_entity_id UUID,
  p_schema_version INT,
  p_market_code VARCHAR,
  p_category_id VARCHAR,
  p_actor_user_id UUID,
  p_organization_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_price_minor BIGINT,
  p_currency VARCHAR,
  p_status public.listing_status,
  p_condition VARCHAR,
  p_city VARCHAR,
  p_postal_code VARCHAR,
  p_country VARCHAR,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_attributes JSONB,
  p_created_at TIMESTAMPTZ,
  p_updated_at TIMESTAMPTZ,
  p_published_at TIMESTAMPTZ,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_is_urgent BOOLEAN DEFAULT FALSE,
  p_is_featured BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_listing_id UUID := COALESCE(p_listing_id, gen_random_uuid());
  target_publisher_user_id UUID;
  target_publisher_type VARCHAR(20);
  target_verification VARCHAR(30);
BEGIN
  target_publisher_user_id := public.resolve_vertical_publisher_user(
    p_actor_user_id,
    p_organization_id
  );
  target_publisher_type := CASE
    WHEN p_organization_id IS NULL THEN 'private'
    ELSE 'professional'
  END;

  IF target_publisher_user_id IS NULL THEN
    RAISE EXCEPTION 'No active publisher can own % discovery entity %',
      p_vertical_type, p_vertical_entity_id;
  END IF;

  target_verification := public.resolve_vertical_publisher_verification(
    target_publisher_user_id,
    p_organization_id
  );

  INSERT INTO public.listings (
    id, seller_id, publisher_type, publisher_user_id,
    publisher_organization_id, publisher_verification_status,
    publication_offer_id, category_id, title, description, price, currency,
    status, condition, market_code, city, postal_code, country,
    latitude, longitude, allowed_delivery, is_urgent, is_featured,
    attributes, vertical_type, vertical_entity_id, vertical_schema_version,
    published_at, organic_freshness_at, created_at, updated_at, expires_at
  ) VALUES (
    target_listing_id,
    target_publisher_user_id,
    target_publisher_type,
    target_publisher_user_id,
    p_organization_id,
    COALESCE(target_verification, 'unverified'),
    CASE WHEN target_publisher_type = 'professional'
      THEN 'listing.standard.professional'
      ELSE 'listing.standard.individual'
    END,
    p_category_id,
    p_title,
    p_description,
    (p_price_minor::numeric / 100),
    p_currency,
    p_status,
    COALESCE(NULLIF(p_condition, ''), 'bon-etat'),
    p_market_code,
    COALESCE(NULLIF(p_city, ''), 'France'),
    COALESCE(NULLIF(p_postal_code, ''), '00000'),
    COALESCE(NULLIF(p_country, ''), p_market_code),
    p_latitude,
    p_longitude,
    ARRAY['hand_delivery'::public.delivery_type],
    COALESCE(p_is_urgent, FALSE),
    COALESCE(p_is_featured, FALSE),
    COALESCE(p_attributes, '{}'::jsonb),
    p_vertical_type,
    p_vertical_entity_id,
    p_schema_version,
    COALESCE(p_published_at, p_created_at),
    COALESCE(p_published_at, p_created_at),
    p_created_at,
    p_updated_at,
    COALESCE(p_expires_at, p_created_at + INTERVAL '60 days')
  )
  ON CONFLICT (id) DO UPDATE SET
    seller_id = EXCLUDED.seller_id,
    publisher_type = EXCLUDED.publisher_type,
    publisher_user_id = EXCLUDED.publisher_user_id,
    publisher_organization_id = EXCLUDED.publisher_organization_id,
    publisher_verification_status = EXCLUDED.publisher_verification_status,
    publication_offer_id = EXCLUDED.publication_offer_id,
    category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status,
    condition = EXCLUDED.condition,
    market_code = EXCLUDED.market_code,
    city = EXCLUDED.city,
    postal_code = EXCLUDED.postal_code,
    country = EXCLUDED.country,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    is_urgent = EXCLUDED.is_urgent,
    is_featured = EXCLUDED.is_featured,
    attributes = EXCLUDED.attributes,
    vertical_type = EXCLUDED.vertical_type,
    vertical_entity_id = EXCLUDED.vertical_entity_id,
    vertical_schema_version = EXCLUDED.vertical_schema_version,
    published_at = EXCLUDED.published_at,
    organic_freshness_at = EXCLUDED.organic_freshness_at,
    updated_at = EXCLUDED.updated_at,
    expires_at = EXCLUDED.expires_at;

  RETURN target_listing_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_vertical_discovery_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_listing_id UUID;
BEGIN
  target_listing_id := NULLIF(to_jsonb(OLD)->>TG_ARGV[0], '')::uuid;
  IF target_listing_id IS NOT NULL THEN
    UPDATE public.listings
       SET status = 'archived',
           attributes = attributes || jsonb_build_object(
             'projectionDeletedAt', NOW(),
             'projectionDeletedFrom', TG_TABLE_NAME
           ),
           updated_at = NOW()
     WHERE id = target_listing_id;
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_auto_discovery_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_category_id VARCHAR(100);
  generic_status public.listing_status;
  target_actor_user_id UUID;
  target_city VARCHAR(160);
  target_postal_code VARCHAR(20);
BEGIN
  SELECT activation.category_ids[1]
    INTO target_category_id
    FROM public.vertical_market_activations activation
   WHERE activation.vertical_type = 'automotive'
     AND activation.market_code = NEW.market_codes[1]
     AND activation.is_active;

  IF target_category_id IS NULL THEN
    RAISE EXCEPTION 'Automotive vertical is not activated for market %', NEW.market_codes[1];
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('automotive:' || NEW.slug, 0));
  NEW.listing_id := COALESCE(
    NEW.listing_id,
    (SELECT vehicle.listing_id FROM public.auto_vehicles vehicle WHERE vehicle.slug = NEW.slug),
    gen_random_uuid()
  );

  IF NEW.dealer_organization_id IS NULL THEN
    target_actor_user_id := NEW.owner_user_id;
  ELSE
    SELECT organization.owner_id
      INTO target_actor_user_id
      FROM public.organizations organization
     WHERE organization.id = NEW.dealer_organization_id;
  END IF;

  SELECT COALESCE(location.city, NEW.location_city), location.postal_code
    INTO target_city, target_postal_code
    FROM (SELECT 1) singleton
    LEFT JOIN public.auto_dealer_locations location
      ON location.id = NEW.dealer_location_id;

  generic_status := CASE
    WHEN NEW.lifecycle = 'published' AND NEW.moderation_status = 'approved' THEN 'published'::public.listing_status
    WHEN NEW.lifecycle = 'reserved' THEN 'reserved'::public.listing_status
    WHEN NEW.lifecycle = 'sold' THEN 'sold'::public.listing_status
    WHEN NEW.lifecycle = 'rejected' OR NEW.moderation_status = 'rejected' THEN 'rejected'::public.listing_status
    WHEN NEW.lifecycle IN ('expired','suspended','archived') OR NEW.moderation_status = 'suspended' THEN 'archived'::public.listing_status
    ELSE 'draft'::public.listing_status
  END;

  NEW.listing_id := public.upsert_vertical_discovery_listing(
    NEW.listing_id,
    'automotive',
    NEW.id,
    NEW.schema_version,
    NEW.market_codes[1],
    target_category_id,
    target_actor_user_id,
    NEW.dealer_organization_id,
    COALESCE(
      NULLIF(NEW.public_payload->>'title', ''),
      concat_ws(' ', NEW.model_year::text, NEW.make_id, NEW.model_id)
    ),
    COALESCE(
      NULLIF(NEW.public_payload->>'description', ''),
      concat_ws(' · ', NEW.vehicle_type, NEW.fuel_type, NEW.transmission)
    ),
    NEW.price_minor,
    NEW.currency,
    generic_status,
    NEW.condition,
    COALESCE(target_city, NEW.location_city),
    target_postal_code,
    NEW.market_codes[1],
    NULL,
    NULL,
    NEW.dynamic_attributes || jsonb_build_object(
      'canonicalPath', '/auto/vehicule/' || NEW.slug,
      'categoryPath', ARRAY['vehicles'],
      'marketCodes', NEW.market_codes,
      'vehicleType', NEW.vehicle_type,
      'makeId', NEW.make_id,
      'modelId', NEW.model_id,
      'modelYear', NEW.model_year,
      'mileageValue', NEW.mileage_value,
      'mileageUnit', NEW.mileage_unit,
      'fuelType', NEW.fuel_type,
      'transmission', NEW.transmission,
      'sellerType', NEW.seller_type,
      'equipment', NEW.equipment
    ),
    NEW.created_at,
    NEW.updated_at,
    NEW.published_at,
    NULL,
    COALESCE((NEW.public_payload->>'isUrgent')::boolean, FALSE),
    COALESCE((NEW.public_payload->>'isFeatured')::boolean, FALSE)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_course_discovery_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  tutor public.course_tutor_profiles%ROWTYPE;
  area public.course_service_areas%ROWTYPE;
  target_category_id VARCHAR(100);
  generic_status public.listing_status;
  target_organization_id UUID;
BEGIN
  SELECT * INTO tutor
    FROM public.course_tutor_profiles profile
   WHERE profile.id = NEW.tutor_profile_id;

  SELECT * INTO area
    FROM public.course_service_areas service_area
   WHERE service_area.tutor_profile_id = tutor.id
      OR (service_area.organization_id = tutor.organization_id AND tutor.organization_id IS NOT NULL)
   ORDER BY (service_area.tutor_profile_id = tutor.id) DESC, service_area.created_at ASC
   LIMIT 1;

  SELECT activation.category_ids[1]
    INTO target_category_id
    FROM public.vertical_market_activations activation
   WHERE activation.vertical_type = 'tutoring'
     AND activation.market_code = NEW.market_code
     AND activation.is_active;

  IF target_category_id IS NULL THEN
    RAISE EXCEPTION 'Tutoring vertical is not activated for market %', NEW.market_code;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('tutoring:' || NEW.slug, 0));
  NEW.listing_id := COALESCE(
    NEW.listing_id,
    (SELECT offer.listing_id FROM public.course_offers offer WHERE offer.slug = NEW.slug),
    gen_random_uuid()
  );
  target_organization_id := COALESCE(NEW.organization_id, tutor.organization_id);

  generic_status := CASE
    WHEN NEW.status = 'published' AND tutor.moderation_status = 'approved' THEN 'published'::public.listing_status
    WHEN tutor.moderation_status = 'rejected' THEN 'rejected'::public.listing_status
    WHEN NEW.status IN ('paused','suspended','archived') OR tutor.moderation_status = 'suspended' THEN 'archived'::public.listing_status
    ELSE 'draft'::public.listing_status
  END;

  NEW.listing_id := public.upsert_vertical_discovery_listing(
    NEW.listing_id,
    'tutoring',
    NEW.id,
    NEW.schema_version,
    NEW.market_code,
    target_category_id,
    tutor.user_id,
    target_organization_id,
    NEW.title,
    NEW.description,
    NEW.from_price_minor,
    NEW.currency,
    generic_status,
    'service',
    COALESCE(area.city_label, tutor.public_payload->>'city', 'France'),
    area.postal_code_prefix,
    NEW.market_code,
    area.center_latitude,
    area.center_longitude,
    NEW.public_payload || jsonb_build_object(
      'canonicalPath', '/cours/professeur/' || tutor.slug,
      'categoryPath', ARRAY['services','services.tutoring'],
      'marketCodes', ARRAY[NEW.market_code],
      'subjectId', NEW.subject_id,
      'capacityStatus', NEW.capacity_status,
      'trialLessonAvailable', NEW.trial_lesson_available,
      'tutorProfileId', tutor.id,
      'tutorSlug', tutor.slug,
      'tutorHeadline', tutor.headline,
      'tutorRating', tutor.rating,
      'tutorReviewCount', tutor.review_count
    ),
    NEW.created_at,
    NEW.updated_at,
    NEW.published_at,
    NULL,
    FALSE,
    tutor.is_featured
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_employment_discovery_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  employer public.employment_employer_profiles%ROWTYPE;
  location public.employment_job_locations%ROWTYPE;
  branch public.employment_employer_branches%ROWTYPE;
  target_category_id VARCHAR(100);
  generic_status public.listing_status;
BEGIN
  SELECT * INTO employer
    FROM public.employment_employer_profiles profile
   WHERE profile.id = NEW.employer_id;
  SELECT * INTO location
    FROM public.employment_job_locations job_location
   WHERE job_location.job_id = NEW.id AND job_location.is_public
   ORDER BY job_location.is_primary DESC, job_location.created_at ASC
   LIMIT 1;
  SELECT * INTO branch
    FROM public.employment_employer_branches employer_branch
   WHERE employer_branch.id = NEW.branch_id;

  SELECT activation.category_ids[1]
    INTO target_category_id
    FROM public.vertical_market_activations activation
   WHERE activation.vertical_type = 'employment'
     AND activation.market_code = NEW.market_code
     AND activation.is_active;

  IF target_category_id IS NULL THEN
    RAISE EXCEPTION 'Employment vertical is not activated for market %', NEW.market_code;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('employment:' || NEW.slug, 0));
  NEW.generic_listing_id := COALESCE(
    NEW.generic_listing_id,
    (SELECT job.generic_listing_id FROM public.employment_jobs job WHERE job.slug = NEW.slug),
    gen_random_uuid()
  );

  generic_status := CASE
    WHEN NEW.lifecycle = 'published' AND NEW.moderation_status = 'approved' AND employer.status = 'active' THEN 'published'::public.listing_status
    WHEN NEW.lifecycle = 'rejected' OR NEW.moderation_status = 'rejected' THEN 'rejected'::public.listing_status
    WHEN NEW.lifecycle IN ('closed','expired','suspended','archived') OR employer.status IN ('suspended','closed') THEN 'archived'::public.listing_status
    WHEN NEW.moderation_status = 'flagged' THEN 'flagged'::public.listing_status
    ELSE 'draft'::public.listing_status
  END;

  NEW.generic_listing_id := public.upsert_vertical_discovery_listing(
    NEW.generic_listing_id,
    'employment',
    NEW.id,
    NEW.schema_version,
    NEW.market_code,
    target_category_id,
    NEW.created_by_user_id,
    employer.organization_id,
    NEW.title,
    concat_ws(E'\n\n', employer.description, array_to_string(NEW.responsibilities, E'\n')),
    COALESCE(NEW.salary_minimum_minor, NEW.salary_maximum_minor, 0),
    COALESCE(NEW.salary_currency, 'EUR'),
    generic_status,
    'service',
    COALESCE(location.city, branch.city, 'France'),
    COALESCE(location.postal_code, branch.postal_code),
    COALESCE(location.country_code, branch.country_code, NEW.market_code),
    location.latitude,
    location.longitude,
    jsonb_build_object(
      'canonicalPath', '/emploi/offre/' || NEW.slug,
      'categoryPath', ARRAY['jobs','jobs.offers'],
      'marketCodes', ARRAY[NEW.market_code],
      'employerId', NEW.employer_id,
      'employerName', employer.display_name,
      'employerLogoUrl', employer.logo_url,
      'professionId', NEW.profession_id,
      'industryId', NEW.industry_id,
      'contractTypeId', NEW.contract_type_id,
      'workingArrangementId', NEW.working_arrangement_id,
      'workingTimeId', NEW.working_time_id,
      'salaryMinimumMinor', NEW.salary_minimum_minor,
      'salaryMaximumMinor', NEW.salary_maximum_minor,
      'salaryFrequencyId', NEW.salary_frequency_id,
      'salaryIsPublic', NEW.salary_is_public,
      'positionsCount', NEW.positions_count
    ),
    NEW.created_at,
    NEW.updated_at,
    NEW.published_at,
    NEW.expires_at,
    NEW.is_urgent,
    NEW.is_featured
  );

  RETURN NEW;
END;
$$;

-- Immo now uses the same canonical writer as the other verticals.
CREATE OR REPLACE FUNCTION public.sync_real_estate_generic_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  target_category_id VARCHAR(100);
  generic_status public.listing_status;
BEGIN
  SELECT activation.category_ids[1]
    INTO target_category_id
    FROM public.vertical_market_activations activation
   WHERE activation.vertical_type = 'real_estate'
     AND activation.market_code = NEW.market_code
     AND activation.is_active;

  IF target_category_id IS NULL THEN
    RAISE EXCEPTION 'Real-estate vertical is not activated for market %', NEW.market_code;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('real_estate:' || NEW.slug, 0));
  NEW.listing_id := COALESCE(
    NEW.listing_id,
    (SELECT property.listing_id FROM public.real_estate_properties property WHERE property.slug = NEW.slug),
    gen_random_uuid()
  );

  generic_status := CASE
    WHEN NEW.lifecycle = 'published' AND NEW.moderation_status = 'approved' THEN 'published'::public.listing_status
    WHEN NEW.lifecycle = 'reserved' THEN 'reserved'::public.listing_status
    WHEN NEW.lifecycle = 'sold' THEN 'sold'::public.listing_status
    WHEN NEW.lifecycle = 'rejected' OR NEW.moderation_status = 'rejected' THEN 'rejected'::public.listing_status
    WHEN NEW.lifecycle IN ('expired','suspended','removed','archived') THEN 'archived'::public.listing_status
    ELSE 'draft'::public.listing_status
  END;

  NEW.listing_id := public.upsert_vertical_discovery_listing(
    NEW.listing_id,
    'real_estate',
    NEW.id,
    NEW.schema_version,
    NEW.market_code,
    target_category_id,
    NEW.created_by_user_id,
    NEW.organization_id,
    NEW.title,
    NEW.description,
    NEW.price_minor,
    NEW.currency,
    generic_status,
    COALESCE(NEW.custom_attributes #>> '{_contract,characteristics,condition}', 'bon-etat'),
    NEW.city,
    NEW.postal_code,
    NEW.market_code,
    extensions.ST_Y(NEW.location_point::extensions.geometry)::numeric,
    extensions.ST_X(NEW.location_point::extensions.geometry)::numeric,
    NEW.custom_attributes || jsonb_build_object(
      'canonicalPath', '/immo/bien/' || NEW.slug,
      'categoryPath', ARRAY['real_estate'],
      'marketCodes', ARRAY[NEW.market_code],
      'propertyType', NEW.property_type,
      'transactionType', NEW.transaction_type,
      'livingAreaSquareMeters', NEW.living_area_sqm,
      'rooms', NEW.rooms,
      'bedrooms', NEW.bedrooms,
      'bathrooms', NEW.bathrooms,
      'dpeClass', NEW.dpe_class,
      'gesClass', NEW.ges_class,
      'sellerType', NEW.seller_type,
      'publicLocationLabel', NEW.public_location_label
    ),
    NEW.created_at,
    NEW.updated_at,
    NEW.published_at,
    NULL,
    NEW.is_urgent,
    NEW.is_featured
  );

  RETURN NEW;
END;
$$;

-- Updates to parent/profile/location rows change the discovery card too. A
-- no-op update reuses the authoritative vertical trigger rather than copying
-- its projection logic into secondary triggers.
CREATE OR REPLACE FUNCTION public.refresh_course_offer_discovery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.course_offers
     SET updated_at = updated_at
   WHERE tutor_profile_id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_employment_job_discovery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_job_id UUID;
BEGIN
  target_job_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.job_id ELSE NEW.job_id END;
  UPDATE public.employment_jobs SET updated_at = updated_at WHERE id = target_job_id;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_employer_job_discovery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.employment_jobs SET updated_at = updated_at WHERE employer_id = NEW.id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_vertical_publisher_user(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_vertical_publisher_verification(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_vertical_discovery_listing(UUID, VARCHAR, UUID, INT, VARCHAR, VARCHAR, UUID, UUID, TEXT, TEXT, BIGINT, VARCHAR, public.listing_status, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, NUMERIC, JSONB, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_vertical_discovery_listing() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_auto_discovery_listing() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_course_discovery_listing() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_employment_discovery_listing() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_real_estate_generic_listing() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_course_offer_discovery() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_employment_job_discovery() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_employer_job_discovery() FROM PUBLIC;

DROP TRIGGER IF EXISTS auto_discovery_listing_sync_trigger ON public.auto_vehicles;
CREATE TRIGGER auto_discovery_listing_sync_trigger
BEFORE INSERT OR UPDATE ON public.auto_vehicles
FOR EACH ROW EXECUTE FUNCTION public.sync_auto_discovery_listing();

DROP TRIGGER IF EXISTS auto_discovery_listing_delete_trigger ON public.auto_vehicles;
CREATE TRIGGER auto_discovery_listing_delete_trigger
AFTER DELETE ON public.auto_vehicles
FOR EACH ROW EXECUTE FUNCTION public.archive_vertical_discovery_listing('listing_id');

DROP TRIGGER IF EXISTS course_discovery_listing_sync_trigger ON public.course_offers;
CREATE TRIGGER course_discovery_listing_sync_trigger
BEFORE INSERT OR UPDATE ON public.course_offers
FOR EACH ROW EXECUTE FUNCTION public.sync_course_discovery_listing();

DROP TRIGGER IF EXISTS course_discovery_listing_delete_trigger ON public.course_offers;
CREATE TRIGGER course_discovery_listing_delete_trigger
AFTER DELETE ON public.course_offers
FOR EACH ROW EXECUTE FUNCTION public.archive_vertical_discovery_listing('listing_id');

DROP TRIGGER IF EXISTS course_tutor_discovery_refresh_trigger ON public.course_tutor_profiles;
CREATE TRIGGER course_tutor_discovery_refresh_trigger
AFTER UPDATE OF slug, headline, moderation_status, rating, review_count, is_featured, public_payload
ON public.course_tutor_profiles
FOR EACH ROW EXECUTE FUNCTION public.refresh_course_offer_discovery();

DROP TRIGGER IF EXISTS employment_discovery_listing_sync_trigger ON public.employment_jobs;
CREATE TRIGGER employment_discovery_listing_sync_trigger
BEFORE INSERT OR UPDATE ON public.employment_jobs
FOR EACH ROW EXECUTE FUNCTION public.sync_employment_discovery_listing();

DROP TRIGGER IF EXISTS employment_discovery_listing_delete_trigger ON public.employment_jobs;
CREATE TRIGGER employment_discovery_listing_delete_trigger
AFTER DELETE ON public.employment_jobs
FOR EACH ROW EXECUTE FUNCTION public.archive_vertical_discovery_listing('generic_listing_id');

DROP TRIGGER IF EXISTS employment_location_discovery_refresh_trigger ON public.employment_job_locations;
CREATE TRIGGER employment_location_discovery_refresh_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.employment_job_locations
FOR EACH ROW EXECUTE FUNCTION public.refresh_employment_job_discovery();

DROP TRIGGER IF EXISTS employment_employer_discovery_refresh_trigger ON public.employment_employer_profiles;
CREATE TRIGGER employment_employer_discovery_refresh_trigger
AFTER UPDATE OF display_name, description, logo_url, verification_level, status
ON public.employment_employer_profiles
FOR EACH ROW EXECUTE FUNCTION public.refresh_employer_job_discovery();

-- Preserve the generic row for favorites/audit, but remove deleted Immo offers
-- from discovery just like every other vertical.
DROP TRIGGER IF EXISTS real_estate_generic_listing_delete_trigger ON public.real_estate_properties;
CREATE TRIGGER real_estate_generic_listing_delete_trigger
AFTER DELETE ON public.real_estate_properties
FOR EACH ROW EXECUTE FUNCTION public.archive_vertical_discovery_listing('listing_id');

DROP FUNCTION IF EXISTS public.delete_real_estate_generic_listing();

-- Existing specialized inventory becomes discoverable immediately after the
-- migration. The updates are idempotent and fire each vertical's canonical
-- projection trigger without changing business data.
UPDATE public.auto_vehicles SET updated_at = updated_at;
UPDATE public.course_offers SET updated_at = updated_at;
UPDATE public.employment_jobs SET updated_at = updated_at;
UPDATE public.real_estate_properties SET updated_at = updated_at;

CREATE INDEX IF NOT EXISTS listings_vertical_discovery_candidate_idx
  ON public.listings (vertical_type, market_code, category_id, organic_freshness_at DESC)
  WHERE status = 'published';

COMMENT ON FUNCTION public.upsert_vertical_discovery_listing(UUID, VARCHAR, UUID, INT, VARCHAR, VARCHAR, UUID, UUID, TEXT, TEXT, BIGINT, VARCHAR, public.listing_status, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, NUMERIC, JSONB, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, BOOLEAN)
IS 'Canonical Auto, Emploi, Cours and Immo projection writer for unified discovery.';
