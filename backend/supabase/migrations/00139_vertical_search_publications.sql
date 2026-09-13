-- Keep the existing vertical discovery writer in step with explicit market
-- publication discovery. Before this migration, new vertical inventory had a
-- shared listing but no searchable publication.

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
  previous_status public.listing_status;
  currency_digits SMALLINT;
BEGIN
  target_publisher_user_id := public.resolve_vertical_publisher_user(
    p_actor_user_id,
    p_organization_id
  );
  SELECT status INTO previous_status
    FROM public.listings WHERE id = target_listing_id FOR UPDATE;

  SELECT minor_unit_digits INTO currency_digits
    FROM public.currency_definitions WHERE code = UPPER(p_currency);
  IF currency_digits IS NULL THEN
    RAISE EXCEPTION 'Unknown discovery currency %', p_currency;
  END IF;

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
    (p_price_minor::numeric / power(10::numeric, currency_digits)),
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

  -- The vertical's explicit market and approved lifecycle supply publication
  -- evidence. Other markets, services and paid placements are never inferred.
  INSERT INTO public.listing_market_publications AS publication (
    listing_id, market_code, status, is_primary, price_minor, currency,
    compliance_state, published_at, sort_date, created_at, updated_at
  ) VALUES (
    target_listing_id, p_market_code,
    CASE
      WHEN p_status IN ('published', 'reserved', 'sold') THEN 'active'
      WHEN p_status = 'flagged' THEN 'pending_review'
      WHEN p_status = 'rejected' THEN 'rejected'
      WHEN p_status = 'archived' THEN 'expired'
      ELSE 'draft'
    END,
    NOT EXISTS (
      SELECT 1 FROM public.listing_market_publications
       WHERE listing_id = target_listing_id AND is_primary
    ),
    p_price_minor, UPPER(p_currency),
    CASE
      WHEN p_status IN ('published', 'reserved', 'sold') THEN 'approved'
      WHEN p_status = 'rejected' THEN 'rejected'
      ELSE 'pending'
    END,
    p_published_at, COALESCE(p_published_at, p_created_at), p_created_at, p_updated_at
  )
  ON CONFLICT (listing_id, market_code) DO UPDATE SET
    price_minor = EXCLUDED.price_minor,
    currency = EXCLUDED.currency,
    -- Content refreshes cannot undo a market-specific moderation decision.
    -- Lifecycle changes still advance drafts and close withdrawn inventory.
    status = CASE
      WHEN publication.status IN ('paused', 'suspended', 'rejected')
        OR publication.compliance_state IN ('restricted', 'rejected')
        OR previous_status IS NOT DISTINCT FROM p_status
        THEN publication.status
      ELSE EXCLUDED.status
    END,
    compliance_state = CASE
      WHEN publication.compliance_state IN ('restricted', 'rejected')
        OR previous_status IS NOT DISTINCT FROM p_status
        THEN publication.compliance_state
      ELSE EXCLUDED.compliance_state
    END,
    published_at = COALESCE(publication.published_at, EXCLUDED.published_at),
    sort_date = CASE
      WHEN previous_status IS DISTINCT FROM p_status AND p_status = 'published'
        THEN EXCLUDED.sort_date
      ELSE publication.sort_date
    END,
    updated_at = EXCLUDED.updated_at;

  RETURN target_listing_id;
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

  -- Auto's public photo list is authoritative for its shared discovery card.
  INSERT INTO public.listing_media (id, listing_id, url, sort_order, is_primary)
  SELECT md5(NEW.listing_id::text || ':auto-media:' || photo.ordinality::text)::uuid,
    NEW.listing_id, photo.url, photo.ordinality - 1, photo.ordinality = 1
  FROM jsonb_array_elements_text(COALESCE(NEW.public_payload->'mediaUrls', '[]'::jsonb))
    WITH ORDINALITY AS photo(url, ordinality)
  ON CONFLICT (id) DO UPDATE SET
    url = EXCLUDED.url, sort_order = EXCLUDED.sort_order, is_primary = EXCLUDED.is_primary;

  DELETE FROM public.listing_media media
   WHERE media.listing_id = NEW.listing_id
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_array_elements_text(COALESCE(NEW.public_payload->'mediaUrls', '[]'::jsonb))
         WITH ORDINALITY AS photo(url, ordinality)
       WHERE media.id = md5(NEW.listing_id::text || ':auto-media:' || photo.ordinality::text)::uuid
     );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_vertical_discovery_listing(UUID, VARCHAR, UUID, INT, VARCHAR, VARCHAR, UUID, UUID, TEXT, TEXT, BIGINT, VARCHAR, public.listing_status, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, NUMERIC, JSONB, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_vertical_discovery_listing(UUID, VARCHAR, UUID, INT, VARCHAR, VARCHAR, UUID, UUID, TEXT, TEXT, BIGINT, VARCHAR, public.listing_status, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, NUMERIC, JSONB, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, BOOLEAN)
  TO service_role;

-- Replay only incomplete projections through their source-owned lifecycle and
-- moderation rules. Existing market restrictions and unrelated listings survive.
UPDATE public.auto_vehicles source SET updated_at = source.updated_at
WHERE EXISTS (
  SELECT 1 FROM public.listings listing
  LEFT JOIN public.listing_market_publications publication
    ON publication.listing_id = listing.id AND publication.market_code = listing.market_code
  WHERE listing.id = source.listing_id
    AND publication.listing_id IS NULL
) OR COALESCE((
  SELECT jsonb_agg(media.url ORDER BY media.sort_order)
  FROM public.listing_media media WHERE media.listing_id = source.listing_id
), '[]'::jsonb) IS DISTINCT FROM COALESCE(source.public_payload->'mediaUrls', '[]'::jsonb);

UPDATE public.course_offers source SET updated_at = source.updated_at
WHERE EXISTS (
  SELECT 1 FROM public.listings listing
  LEFT JOIN public.listing_market_publications publication
    ON publication.listing_id = listing.id AND publication.market_code = listing.market_code
  WHERE listing.id = source.listing_id
    AND publication.listing_id IS NULL
);

UPDATE public.employment_jobs source SET updated_at = source.updated_at
WHERE EXISTS (
  SELECT 1 FROM public.listings listing
  LEFT JOIN public.listing_market_publications publication
    ON publication.listing_id = listing.id AND publication.market_code = listing.market_code
  WHERE listing.id = source.generic_listing_id
    AND publication.listing_id IS NULL
);

UPDATE public.real_estate_properties source SET updated_at = source.updated_at
WHERE EXISTS (
  SELECT 1 FROM public.listings listing
  LEFT JOIN public.listing_market_publications publication
    ON publication.listing_id = listing.id AND publication.market_code = listing.market_code
  WHERE listing.id = source.listing_id
    AND publication.listing_id IS NULL
);

