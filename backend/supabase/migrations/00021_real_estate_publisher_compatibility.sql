-- Keep the specialized real-estate projection compatible with the canonical
-- publisher columns introduced by migration 00018. The former trigger wrote
-- only the legacy seller_id, so new properties failed publisher-integrity
-- checks after the unified catalog migration.

CREATE OR REPLACE FUNCTION public.sync_real_estate_generic_listing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    target_category_id VARCHAR(100);
    generic_status public.listing_status;
    publisher_kind VARCHAR(20);
    publisher_verification VARCHAR(30);
BEGIN
    SELECT category_ids[1]
      INTO target_category_id
      FROM public.vertical_market_activations
     WHERE vertical_type = 'real_estate'
       AND market_code = NEW.market_code
       AND is_active = TRUE;

    IF target_category_id IS NULL THEN
        RAISE EXCEPTION 'Real-estate vertical is not activated for market %', NEW.market_code;
    END IF;

    publisher_kind := CASE WHEN NEW.organization_id IS NULL THEN 'private' ELSE 'professional' END;
    SELECT CASE
        WHEN NEW.organization_id IS NOT NULL AND COALESCE(organization.is_verified, FALSE)
          THEN 'business_verified'
        WHEN profile.is_identity_verified THEN 'identity_verified'
        WHEN profile.is_phone_verified THEN 'phone_verified'
        WHEN profile.is_email_verified THEN 'email_verified'
        ELSE 'unverified'
      END
      INTO publisher_verification
      FROM public.profiles profile
      LEFT JOIN public.organizations organization ON organization.id = NEW.organization_id
     WHERE profile.id = NEW.created_by_user_id;

    -- The property catalogue upserts by slug. A BEFORE INSERT trigger still
    -- runs on the conflicting attempt, so reuse the current projection under a
    -- transaction-scoped slug lock instead of creating an orphan listing.
    PERFORM pg_advisory_xact_lock(hashtextextended('real_estate:' || NEW.slug, 0));
    NEW.listing_id := COALESCE(
        NEW.listing_id,
        (SELECT property.listing_id
           FROM public.real_estate_properties property
          WHERE property.slug = NEW.slug),
        gen_random_uuid()
    );
    generic_status := CASE
        WHEN NEW.lifecycle = 'published' AND NEW.moderation_status = 'approved' THEN 'published'::public.listing_status
        WHEN NEW.lifecycle = 'reserved' THEN 'reserved'::public.listing_status
        WHEN NEW.lifecycle = 'sold' THEN 'sold'::public.listing_status
        WHEN NEW.lifecycle = 'rejected' THEN 'rejected'::public.listing_status
        WHEN NEW.lifecycle IN ('expired', 'suspended', 'removed', 'archived') THEN 'archived'::public.listing_status
        ELSE 'draft'::public.listing_status
    END;

    INSERT INTO public.listings (
        id, seller_id, publisher_type, publisher_user_id,
        publisher_organization_id, publisher_verification_status,
        publication_offer_id, category_id, title, description, price, currency,
        status, condition, market_code, city, postal_code, country,
        latitude, longitude, allowed_delivery, is_urgent, is_featured,
        urgent_expires_at, featured_expires_at, bumped_at, attributes,
        vertical_type, vertical_entity_id, vertical_schema_version,
        published_at, organic_freshness_at, created_at, updated_at
    ) VALUES (
        NEW.listing_id,
        NEW.created_by_user_id,
        publisher_kind,
        NEW.created_by_user_id,
        NEW.organization_id,
        publisher_verification,
        CASE WHEN publisher_kind = 'professional'
          THEN 'listing.standard.professional'
          ELSE 'listing.standard.individual'
        END,
        target_category_id,
        NEW.title,
        NEW.description,
        (NEW.price_minor::numeric / 100),
        NEW.currency,
        generic_status,
        COALESCE(NEW.custom_attributes #>> '{_contract,characteristics,condition}', 'bon-etat'),
        NEW.market_code,
        NEW.city,
        NEW.postal_code,
        NEW.market_code,
        extensions.ST_Y(NEW.location_point::extensions.geometry),
        extensions.ST_X(NEW.location_point::extensions.geometry),
        ARRAY['hand_delivery'::public.delivery_type],
        COALESCE((NEW.promotion_payload->>'urgent')::boolean, FALSE),
        COALESCE((NEW.promotion_payload->>'featured')::boolean, FALSE),
        CASE WHEN COALESCE((NEW.promotion_payload->>'urgent')::boolean, FALSE)
          THEN NULLIF(NEW.promotion_payload->>'endsAt', '')::timestamptz END,
        CASE WHEN COALESCE((NEW.promotion_payload->>'featured')::boolean, FALSE)
          THEN NULLIF(NEW.promotion_payload->>'endsAt', '')::timestamptz END,
        NULLIF(NEW.promotion_payload->>'bumpedAt', '')::timestamptz,
        jsonb_build_object(
            'propertyType', NEW.property_type,
            'transactionType', NEW.transaction_type,
            'livingAreaSquareMeters', NEW.living_area_sqm,
            'rooms', NEW.rooms,
            'bedrooms', NEW.bedrooms,
            'bathrooms', NEW.bathrooms,
            'dpeClass', NEW.dpe_class,
            'gesClass', NEW.ges_class,
            'sellerType', NEW.seller_type,
            'publicLocationLabel', NEW.public_location_label,
            'canonicalPath', '/immo/bien/' || NEW.slug
        ),
        'real_estate',
        NEW.id,
        NEW.schema_version,
        COALESCE(NEW.published_at, NEW.created_at),
        NEW.created_at,
        NEW.created_at,
        NEW.updated_at
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
        urgent_expires_at = EXCLUDED.urgent_expires_at,
        featured_expires_at = EXCLUDED.featured_expires_at,
        bumped_at = EXCLUDED.bumped_at,
        attributes = EXCLUDED.attributes,
        vertical_type = EXCLUDED.vertical_type,
        vertical_entity_id = EXCLUDED.vertical_entity_id,
        vertical_schema_version = EXCLUDED.vertical_schema_version,
        published_at = EXCLUDED.published_at,
        updated_at = EXCLUDED.updated_at;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_real_estate_generic_listing() FROM PUBLIC;
