-- Canonical deterministic catalogue seed for Shongre Auto (France).
-- Paid offers, secure-sale and partner referrals remain disabled until their
-- server providers, legal texts, webhooks and refund operations are approved.

INSERT INTO public.auto_market_configs (
  market_code, schema_version, locale, currency, timezone, is_enabled,
  comparison_limit, default_search_radius_km, lead_retention_days,
  paid_offers_enabled, secure_sale_enabled, financing_referrals_enabled,
  insurance_referrals_enabled, inspection_referrals_enabled,
  warranty_referrals_enabled, delivery_referrals_enabled,
  trade_in_referrals_enabled,
  boat_listings_enabled, config_payload
)
VALUES (
  'FR', 1, 'fr-FR', 'EUR', 'Europe/Paris', TRUE, 4, 50, 730,
  FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE,
  jsonb_build_object(
    'vertical', 'automotive', 'schemaVersion', 1, 'marketCode', 'FR',
    'locale', 'fr-FR', 'currency', 'EUR', 'timezone', 'Europe/Paris',
    'isEnabled', TRUE, 'comparisonLimit', 4, 'defaultSearchRadiusKm', 50,
    'leadRetentionDays', 730,
    'featureFlags', jsonb_build_object(
      'verticalEnabled', TRUE, 'comparisonsEnabled', TRUE,
      'savedSearchesEnabled', TRUE, 'structuredLeadsEnabled', TRUE,
      'appointmentsEnabled', TRUE, 'dealerImportsEnabled', TRUE,
      'dealerApiSyncEnabled', FALSE, 'paidOffersEnabled', FALSE,
      'secureSaleEnabled', FALSE, 'financingReferralsEnabled', FALSE,
      'insuranceReferralsEnabled', FALSE, 'inspectionReferralsEnabled', FALSE,
      'warrantyReferralsEnabled', FALSE, 'deliveryReferralsEnabled', FALSE,
      'tradeInReferralsEnabled', FALSE,
      'boatListingsEnabled', FALSE
    ),
    'financingDisclaimer', 'Estimation mensuelle fournie à titre indicatif, sans décision de crédit ni engagement d’un partenaire financier.',
    'priceEstimateDisclaimer', 'Estimation indicative calculée à partir d’annonces comparables. Elle ne constitue ni une expertise ni une garantie de prix de vente.',
    'safetyGuidance', '["Vérifiez l’identité du vendeur, le numéro de série et les documents originaux avant tout paiement.","Ne versez jamais d’acompte hors d’un parcours Shongre explicitement sécurisé.","Pour un véhicule immatriculé en France, consultez les informations HistoVec communiquées par le vendeur."]'::jsonb,
    'updatedAt', '2026-08-22T10:00:00.000Z'
  )
)
ON CONFLICT (market_code) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  paid_offers_enabled = EXCLUDED.paid_offers_enabled,
  secure_sale_enabled = EXCLUDED.secure_sale_enabled,
  financing_referrals_enabled = EXCLUDED.financing_referrals_enabled,
  insurance_referrals_enabled = EXCLUDED.insurance_referrals_enabled,
  inspection_referrals_enabled = EXCLUDED.inspection_referrals_enabled,
  warranty_referrals_enabled = EXCLUDED.warranty_referrals_enabled,
  delivery_referrals_enabled = EXCLUDED.delivery_referrals_enabled,
  trade_in_referrals_enabled = EXCLUDED.trade_in_referrals_enabled,
  boat_listings_enabled = EXCLUDED.boat_listings_enabled,
  config_payload = EXCLUDED.config_payload,
  updated_at = NOW();

WITH types(type, slug, label, description, icon_name, active, sort_order) AS (
  VALUES
    ('car','voitures','Voitures','Voitures particulières neuves et d’occasion','CarFront',TRUE,10),
    ('motorcycle','motos-scooters','Motos & scooters','Deux-roues motorisés','Bike',TRUE,20),
    ('utility','utilitaires','Vans & utilitaires','Véhicules utilitaires légers','Truck',TRUE,30),
    ('truck','poids-lourds','Poids lourds','Camions et véhicules industriels','Truck',TRUE,40),
    ('motorhome','camping-cars-caravanes','Camping-cars & caravanes','Véhicules de loisirs','Caravan',TRUE,50),
    ('boat','bateaux','Bateaux','Navigation de plaisance — activation par marché','ShipWheel',FALSE,60),
    ('agricultural','agricoles','Matériel agricole','Tracteurs et équipements agricoles','Tractor',TRUE,70),
    ('construction','construction','Engins de chantier','Construction et travaux publics','Construction',TRUE,80),
    ('parts','pieces-accessoires','Pièces & accessoires','Pièces, pneus et équipements','Wrench',TRUE,90),
    ('other','autres-vehicules','Autres véhicules','Véhicules hors catégories principales','CircleEllipsis',TRUE,100)
)
INSERT INTO public.auto_vehicle_types (
  type, market_code, slug, label, description, schema_version,
  required_field_ids, filter_field_ids, is_active, sort_order, public_payload
)
SELECT type, 'FR', slug, label, description, 1,
  CASE WHEN type = 'parts' THEN ARRAY['condition','price'] ELSE ARRAY['make','model','modelYear','mileage','fuelType','price'] END,
  CASE WHEN type = 'parts' THEN ARRAY['condition','price'] ELSE ARRAY['make','model','modelYear','mileage','fuelType','transmission','price'] END,
  active, sort_order,
  jsonb_build_object(
    'type', type, 'slug', slug, 'label', label, 'description', description,
    'iconName', icon_name, 'schemaVersion', 1, 'isActive', active,
    'requiredFieldIds', CASE WHEN type = 'parts' THEN '["condition","price"]'::jsonb ELSE '["make","model","modelYear","mileage","fuelType","price"]'::jsonb END,
    'filterFieldIds', CASE WHEN type = 'parts' THEN '["condition","price"]'::jsonb ELSE '["make","model","modelYear","mileage","fuelType","transmission","price"]'::jsonb END,
    'sortOrder', sort_order
  )
FROM types
ON CONFLICT (type, market_code) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description, is_active = EXCLUDED.is_active, public_payload = EXCLUDED.public_payload, updated_at = NOW();

WITH attrs(id, label, field_type, unit, vehicle_types, required, filterable, sort_order, options) AS (
  VALUES
    ('bodyType','Carrosserie','single_select',NULL,ARRAY['car','utility'],FALSE,TRUE,10,'[{"value":"SUV","label":"SUV","sortOrder":10},{"value":"sedan","label":"Berline","sortOrder":20}]'::jsonb),
    ('batteryCapacityKwh','Capacité de batterie','number','kWh',ARRAY['car','utility','motorcycle'],FALSE,TRUE,20,NULL),
    ('electricRangeKm','Autonomie électrique','number','km',ARRAY['car','utility','motorcycle'],FALSE,TRUE,30,NULL),
    ('chargingPowerKw','Puissance de recharge','number','kW',ARRAY['car','utility','motorcycle'],FALSE,TRUE,40,NULL),
    ('critAirClass','Classe Crit’Air','single_select',NULL,ARRAY['car','utility','truck','motorhome'],FALSE,TRUE,50,'[{"value":"0","label":"Électrique / Hydrogène","sortOrder":10},{"value":"1","label":"Crit’Air 1","sortOrder":20},{"value":"2","label":"Crit’Air 2","sortOrder":30}]'::jsonb)
)
INSERT INTO public.auto_attribute_definitions (
  id, market_code, label, field_type, unit, vehicle_types, options,
  is_required, is_filterable, is_public, schema_version, is_active,
  sort_order, public_payload
)
SELECT id, 'FR', label, field_type, unit, vehicle_types, options, required,
  filterable, TRUE, 1, TRUE, sort_order,
  jsonb_strip_nulls(jsonb_build_object(
    'id', id, 'marketCode', 'FR', 'vehicleTypes', to_jsonb(vehicle_types),
    'label', label, 'fieldType', field_type, 'unit', unit, 'options', options,
    'isRequired', required, 'isFilterable', filterable, 'isPublic', TRUE,
    'sortOrder', sort_order, 'schemaVersion', 1, 'isActive', TRUE
  ))
FROM attrs
ON CONFLICT (id, market_code) DO UPDATE SET label = EXCLUDED.label, options = EXCLUDED.options, is_filterable = EXCLUDED.is_filterable, public_payload = EXCLUDED.public_payload, updated_at = NOW();

WITH entries(id, kind, parent_id, slug, label, vehicle_types) AS (
  VALUES
    ('peugeot','make',NULL,'peugeot','Peugeot',ARRAY['car','utility']),
    ('bmw','make',NULL,'bmw','BMW',ARRAY['car','motorcycle']),
    ('renault','make',NULL,'renault','Renault',ARRAY['car','utility','truck']),
    ('citroen','make',NULL,'citroen','Citroën',ARRAY['car','utility']),
    ('peugeot-3008','model','peugeot','3008','3008',ARRAY['car']),
    ('peugeot-208','model','peugeot','208','208',ARRAY['car']),
    ('bmw-x3','model','bmw','x3','X3',ARRAY['car']),
    ('renault-captur','model','renault','captur','Captur',ARRAY['car']),
    ('citroen-c3','model','citroen','c3','C3',ARRAY['car'])
)
INSERT INTO public.auto_catalog_entries (
  id, market_code, kind, parent_id, slug, label, vehicle_types, is_active, public_payload
)
SELECT id, 'FR', kind, parent_id, slug, label, vehicle_types, TRUE,
  jsonb_strip_nulls(jsonb_build_object('id',id,'kind',kind,'parentId',parent_id,'vehicleTypes',to_jsonb(vehicle_types),'slug',slug,'label',label,'isActive',TRUE))
FROM entries
ON CONFLICT (id, market_code) DO UPDATE SET label = EXCLUDED.label, vehicle_types = EXCLUDED.vehicle_types, public_payload = EXCLUDED.public_payload, updated_at = NOW();

WITH base(entitlements) AS (
  VALUES ('{"maxActiveVehicles":1,"maxPhotosPerVehicle":12,"maxVideosPerVehicle":0,"maxTeamMembers":1,"maxLocations":1,"monthlyPromotionCredits":0,"includedUrgentCredits":0,"includedBumpCredits":0,"includedFeaturedCredits":0,"inventoryCsvImport":false,"inventoryXmlImport":false,"inventoryApiSync":false,"leadAssignment":false,"leadReminders":false,"publicStorefront":false,"vehicleVideo":false,"vehicleView360":false,"detailedAnalytics":false,"networkAnalytics":false,"apiAccess":false,"centralizedBilling":false,"branchPermissions":false,"stockTransfers":false,"customPlan":false,"serviceLevelAgreement":false,"prioritySupport":false}'::jsonb)
), plans(id,audience,name,description,monthly,annual,duration_days,trial_days,recommended,sort_order,patch) AS (
  VALUES
    ('auto_private_free','individual','Particulier Gratuit','Une annonce active et les outils essentiels pour vendre soi-même.',NULL::bigint,NULL::bigint,NULL::int,NULL::int,FALSE,10,'{}'::jsonb),
    ('auto_private_secure','individual','Vente Sérénité','Accompagnement documentaire et parcours renforcé, selon disponibilité du service.',4990::bigint,NULL::bigint,30,NULL::int,TRUE,20,'{"maxPhotosPerVehicle":24,"maxVideosPerVehicle":1,"includedUrgentCredits":1,"includedBumpCredits":2,"includedFeaturedCredits":1,"vehicleVideo":true,"detailedAnalytics":true}'::jsonb),
    ('auto_dealer_starter','dealer','Dealer Starter','Stock, leads et vitrine pour une petite concession.',7900::bigint,79000::bigint,NULL::int,14,FALSE,30,'{"maxActiveVehicles":25,"maxPhotosPerVehicle":24,"maxTeamMembers":3,"monthlyPromotionCredits":5,"inventoryCsvImport":true,"leadAssignment":true,"leadReminders":true,"publicStorefront":true,"detailedAnalytics":true}'::jsonb),
    ('auto_dealer_growth','dealer','Dealer Growth','Capacité renforcée, imports multi-formats, équipe et analyse détaillée.',16900::bigint,169000::bigint,NULL::int,14,TRUE,40,'{"maxActiveVehicles":120,"maxPhotosPerVehicle":40,"maxVideosPerVehicle":2,"maxTeamMembers":12,"maxLocations":3,"monthlyPromotionCredits":50,"inventoryCsvImport":true,"inventoryXmlImport":true,"leadAssignment":true,"leadReminders":true,"publicStorefront":true,"vehicleVideo":true,"vehicleView360":true,"detailedAnalytics":true,"prioritySupport":true}'::jsonb),
    ('auto_dealer_network','dealer','Dealer Network','Pilotage multi-sites, synchronisation, API et analyse réseau.',39900::bigint,399000::bigint,NULL::int,0,FALSE,50,'{"maxActiveVehicles":1000,"maxPhotosPerVehicle":50,"maxVideosPerVehicle":3,"maxTeamMembers":75,"maxLocations":30,"monthlyPromotionCredits":250,"inventoryCsvImport":true,"inventoryXmlImport":true,"inventoryApiSync":true,"leadAssignment":true,"leadReminders":true,"publicStorefront":true,"vehicleVideo":true,"vehicleView360":true,"detailedAnalytics":true,"networkAnalytics":true,"apiAccess":true,"centralizedBilling":true,"branchPermissions":true,"stockTransfers":true,"customPlan":true,"serviceLevelAgreement":true,"prioritySupport":true}'::jsonb)
)
INSERT INTO public.auto_plans (
  id, market_code, audience, name, description, price_monthly_minor,
  price_annual_minor, duration_days, trial_days, currency, tax_rate_bps, entitlements, is_active,
  is_recommended, sort_order, public_payload
)
SELECT p.id, 'FR', p.audience, p.name, p.description, p.monthly, p.annual,
  p.duration_days, p.trial_days, 'EUR', 2000, b.entitlements || p.patch, TRUE, p.recommended, p.sort_order,
  jsonb_strip_nulls(jsonb_build_object(
    'id',p.id,'marketCode','FR','audience',p.audience,'name',p.name,
    'description',p.description,
    'monthlyPrice',CASE WHEN p.monthly IS NULL THEN NULL ELSE jsonb_build_object('amountMinor',p.monthly,'currency','EUR') END,
    'annualPrice',CASE WHEN p.annual IS NULL THEN NULL ELSE jsonb_build_object('amountMinor',p.annual,'currency','EUR') END,
    'durationDays',p.duration_days,'trialDays',p.trial_days,
    'taxRateBps',2000,'isActive',TRUE,'isRecommended',p.recommended,
    'entitlements',b.entitlements || p.patch
  ))
FROM plans p CROSS JOIN base b
ON CONFLICT (id, market_code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price_monthly_minor = EXCLUDED.price_monthly_minor, price_annual_minor = EXCLUDED.price_annual_minor, duration_days = EXCLUDED.duration_days, trial_days = EXCLUDED.trial_days, entitlements = EXCLUDED.entitlements, public_payload = EXCLUDED.public_payload, updated_at = NOW();

WITH addons(id,type,name,description,price,days,active,sort_order) AS (
  VALUES
    ('auto_addon_secure_sale','secure_sale','Vente Sérénité','Parcours renforcé, selon disponibilité du service.',4990::bigint,NULL::int,TRUE,10),
    ('auto_addon_urgent','urgent','Urgent','Signale visiblement le caractère urgent de la vente.',790::bigint,7,TRUE,20),
    ('auto_addon_bump','search_bump','Remonter l’annonce','Actualise la date de tri sans modifier la date de publication.',490::bigint,1,TRUE,30),
    ('auto_addon_featured','featured','À la une','Emplacement payant identifiable, sous réserve de disponibilité.',1490::bigint,7,TRUE,40),
    ('auto_addon_homepage','homepage_spotlight','Spotlight accueil','Emplacement sponsorisé identifiable sur l’accueil.',2990::bigint,7,TRUE,50),
    ('auto_addon_category','category_spotlight','Spotlight catégorie','Emplacement sponsorisé identifiable dans la catégorie.',1990::bigint,7,TRUE,60),
    ('auto_addon_qualified_lead','qualified_lead','Lead acheteur qualifié','Crédit de traitement pour une demande qualifiée.',590::bigint,NULL::int,TRUE,70),
    ('auto_addon_sponsored_dealer','sponsored_dealer','Concession sponsorisée','Visibilité professionnelle payante et identifiable.',4990::bigint,30,TRUE,80),
    ('auto_addon_inspection_referral','inspection_referral','Demande d’inspection','Réservé à une future intégration partenaire validée.',0::bigint,NULL::int,FALSE,90),
    ('auto_addon_warranty_referral','warranty_referral','Demande de garantie','Réservé à une future intégration partenaire validée.',0::bigint,NULL::int,FALSE,100),
    ('auto_addon_financing_referral','financing_referral','Demande de financement','Réservé à une future intégration partenaire validée.',0::bigint,NULL::int,FALSE,110),
    ('auto_addon_insurance_referral','insurance_referral','Demande d’assurance','Réservé à une future intégration partenaire validée.',0::bigint,NULL::int,FALSE,120),
    ('auto_addon_delivery_referral','delivery_referral','Demande de livraison','Réservé à une future intégration partenaire validée.',0::bigint,NULL::int,FALSE,130),
    ('auto_addon_trade_in_referral','trade_in_referral','Demande de reprise','Réservé à une future intégration partenaire validée.',0::bigint,NULL::int,FALSE,140)
)
INSERT INTO public.auto_add_ons (
  id, market_code, type, name, description, price_minor, currency,
  tax_rate_bps, validity_days, is_active, sort_order, public_payload
)
SELECT id, 'FR', type, name, description, price, 'EUR', 2000, days, active,
  sort_order, jsonb_strip_nulls(jsonb_build_object(
    'id',id,'marketCode','FR','type',type,'name',name,'description',description,
    'price',jsonb_build_object('amountMinor',price,'currency','EUR'),
    'taxRateBps',2000,'validityDays',days,'isActive',active
  ))
FROM addons
ON CONFLICT (id, market_code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price_minor = EXCLUDED.price_minor, validity_days = EXCLUDED.validity_days, is_active = EXCLUDED.is_active, public_payload = EXCLUDED.public_payload, updated_at = NOW();
