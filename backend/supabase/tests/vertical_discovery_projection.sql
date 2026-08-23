\set ON_ERROR_STOP on

BEGIN;

INSERT INTO public.auto_vehicle_types (
  type, market_code, slug, label, description, public_payload
) VALUES (
  'car', 'FR', 'voiture-projection-test', 'Voiture',
  'Véhicule de projection', '{}'
);

INSERT INTO public.auto_vehicles (
  id, owner_user_id, slug, vehicle_type, lifecycle, moderation_status,
  market_codes, model_year, mileage_value, mileage_unit, fuel_type,
  transmission, condition, seller_type, location_city, price_minor,
  currency, public_payload, private_payload
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'peugeot-3008-projection-test', 'car', 'published', 'approved',
  ARRAY['FR'], 2024, 12000, 'km', 'hybrid', 'automatic', 'excellent',
  'individual', 'Lyon', 3299000, 'EUR',
  '{"title":"Peugeot 3008 projection test","description":"Auto discoverable"}',
  '{}'
);

INSERT INTO public.course_plans (
  id, market_code, name, audience, currency, entitlements, public_payload
) VALUES (
  'projection-test', 'FR', 'Projection test', 'individual', 'EUR', '{}', '{}'
);

INSERT INTO public.course_subjects (
  id, market_code, slug, label, public_payload
) VALUES (
  'projection.math', 'FR', 'mathematiques-projection', 'Mathématiques', '{}'
);

INSERT INTO public.course_tutor_profiles (
  id, user_id, market_code, slug, profile_type, headline, biography,
  teaching_approach, moderation_status, plan_id, public_payload, private_payload
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'FR', 'sophie-martin-projection-test', 'individual',
  'Professeure de mathématiques', 'Accompagnement personnalisé',
  'Pédagogie progressive', 'approved', 'projection-test',
  '{"city":"Lyon"}', '{}'
);

INSERT INTO public.course_offers (
  id, tutor_profile_id, slug, title, description, subject_id, market_code,
  status, from_price_minor, currency, public_payload, private_payload,
  published_at
) VALUES (
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  'cours-mathematiques-projection-test',
  'Cours de mathématiques projection test', 'Cours à Lyon',
  'projection.math', 'FR', 'published', 3500, 'EUR', '{}', '{}', NOW()
);

INSERT INTO public.employment_employer_profiles (
  id, owner_user_id, employer_type_id, slug, display_name, description, status
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'employment.fr.employer_type.private', 'employeur-projection-test',
  'Employeur projection', 'Équipe produit', 'active'
);

INSERT INTO public.employment_jobs (
  id, employer_id, created_by_user_id, market_code, schema_version, slug, title,
  profession_id, industry_id, contract_type_id, working_arrangement_id,
  working_time_id, responsibilities, application_method, lifecycle,
  moderation_status, salary_minimum_minor, salary_currency, salary_frequency_id,
  salary_is_public, duplicate_fingerprint, published_at, expires_at
) VALUES (
  '30000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'FR', 1, 'developpeur-react-projection-test',
  'Développeur·se React projection test',
  'employment.fr.profession.frontend_engineer',
  'employment.fr.sector.technology',
  'employment.fr.contract_type.permanent',
  'employment.fr.working_arrangement.hybrid',
  'employment.fr.work_schedule.full_time', ARRAY['Construire le produit'],
  'shongre', 'published', 'approved', 4500000, 'EUR',
  'employment.fr.salary_frequency.year', TRUE, 'projection-test-job',
  NOW(), NOW() + INTERVAL '30 days'
);

INSERT INTO public.employment_job_locations (
  job_id, label, city, postal_code, country_code, is_primary, is_public
) VALUES (
  '30000000-0000-0000-0000-000000000002',
  'Lyon', 'Lyon', '69002', 'FR', TRUE, TRUE
);

INSERT INTO public.real_estate_property_types (
  type, market_code, slug, label, description, icon_name, transaction_types,
  required_field_ids, filter_field_ids
) VALUES (
  'apartment', 'FR', 'appartement-projection', 'Appartement',
  'Bien de projection', 'Building', ARRAY['sale'],
  ARRAY[]::text[], ARRAY[]::text[]
);

INSERT INTO public.real_estate_properties (
  id, created_by_user_id, owner_user_id, market_code, slug, property_type,
  transaction_type, seller_type, lifecycle, title, description, price_minor,
  currency, price_period, living_area_sqm, rooms, bedrooms, bathrooms, city,
  postal_code, public_location_label, location_precision, location_point,
  moderation_status, published_at
) VALUES (
  '40000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'FR', 'appartement-lyon-projection-test', 'apartment', 'sale', 'owner',
  'published', 'Appartement Lyon projection test', 'Immo discoverable',
  42000000, 'EUR', 'total', 72, 3, 2, 1, 'Lyon', '69002', 'Lyon 2e',
  'city',
  extensions.ST_SetSRID(
    extensions.ST_MakePoint(4.8357, 45.7640), 4326
  )::extensions.geography,
  'approved', NOW()
);

DO $$
DECLARE
  projected_count INT;
  canonical_path_count INT;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT attributes->>'canonicalPath')
    INTO projected_count, canonical_path_count
    FROM public.listings
   WHERE vertical_entity_id IN (
     '10000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000002',
     '30000000-0000-0000-0000-000000000002',
     '40000000-0000-0000-0000-000000000001'
   )
     AND status = 'published';

  IF projected_count <> 4 OR canonical_path_count <> 4 THEN
    RAISE EXCEPTION 'Expected four unique published projections, got % rows and % paths',
      projected_count, canonical_path_count;
  END IF;
END;
$$;

UPDATE public.auto_vehicles
   SET lifecycle = 'suspended'
 WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE public.course_offers
   SET status = 'paused'
 WHERE id = '20000000-0000-0000-0000-000000000002';
UPDATE public.employment_jobs
   SET lifecycle = 'suspended'
 WHERE id = '30000000-0000-0000-0000-000000000002';
UPDATE public.real_estate_properties
   SET lifecycle = 'suspended'
 WHERE id = '40000000-0000-0000-0000-000000000001';

DO $$
DECLARE archived_count INT;
BEGIN
  SELECT COUNT(*) INTO archived_count
    FROM public.listings
   WHERE vertical_entity_id IN (
     '10000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000002',
     '30000000-0000-0000-0000-000000000002',
     '40000000-0000-0000-0000-000000000001'
   ) AND status = 'archived';
  IF archived_count <> 4 THEN
    RAISE EXCEPTION 'Suspension did not archive every projection: %', archived_count;
  END IF;
END;
$$;

UPDATE public.auto_vehicles
   SET lifecycle = 'published'
 WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE public.course_offers
   SET status = 'published'
 WHERE id = '20000000-0000-0000-0000-000000000002';
UPDATE public.employment_jobs
   SET lifecycle = 'published'
 WHERE id = '30000000-0000-0000-0000-000000000002';
UPDATE public.real_estate_properties
   SET lifecycle = 'published'
 WHERE id = '40000000-0000-0000-0000-000000000001';

DELETE FROM public.auto_vehicles
 WHERE id = '10000000-0000-0000-0000-000000000001';
DELETE FROM public.course_offers
 WHERE id = '20000000-0000-0000-0000-000000000002';
DELETE FROM public.employment_jobs
 WHERE id = '30000000-0000-0000-0000-000000000002';
DELETE FROM public.real_estate_properties
 WHERE id = '40000000-0000-0000-0000-000000000001';

DO $$
DECLARE archived_count INT;
BEGIN
  SELECT COUNT(*) INTO archived_count
    FROM public.listings
   WHERE vertical_entity_id IN (
     '10000000-0000-0000-0000-000000000001',
     '20000000-0000-0000-0000-000000000002',
     '30000000-0000-0000-0000-000000000002',
     '40000000-0000-0000-0000-000000000001'
   )
     AND status = 'archived'
     AND attributes ? 'projectionDeletedAt';
  IF archived_count <> 4 THEN
    RAISE EXCEPTION 'Deletion did not retain and archive every projection: %', archived_count;
  END IF;
END;
$$;

ROLLBACK;
