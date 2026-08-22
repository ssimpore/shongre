-- Deterministic France catalogue for Shongre Immo. Prices, quotas, taxes and
-- entitlements are data, not UI constants. Paid execution stays provider-gated.

INSERT INTO public.vertical_market_activations (
  vertical_type, market_code, category_ids, subcategory_ids,
  schema_version, is_active, feature_flags
)
VALUES (
  'real_estate', 'FR', ARRAY['real-estate'],
  ARRAY['real-estate-sale','real-estate-rent'], 1, TRUE,
  '{"verticalEnabled":true,"mapSearchEnabled":true,"savedSearchesEnabled":true,"recentlyViewedEnabled":true,"comparablesEnabled":true,"structuredLeadsEnabled":true,"appointmentsEnabled":true,"paidOffersEnabled":true,"professionalImportsEnabled":true,"professionalApiSyncEnabled":false,"privateDocumentsEnabled":true}'::jsonb
)
ON CONFLICT (vertical_type, market_code) DO UPDATE SET
  category_ids = EXCLUDED.category_ids,
  subcategory_ids = EXCLUDED.subcategory_ids,
  schema_version = EXCLUDED.schema_version,
  is_active = EXCLUDED.is_active,
  feature_flags = EXCLUDED.feature_flags,
  updated_at = NOW();

INSERT INTO public.real_estate_market_configs (
  market_code, schema_version, locale, currency, timezone, is_enabled,
  default_search_radius_km, lead_retention_days, draft_retention_days,
  approximate_location_radius_m, regulatory_content_version, feature_flags
)
SELECT 'FR', 1, 'fr-FR', 'EUR', 'Europe/Paris', TRUE, 25, 730, 180, 300,
  'fr-immo-2026-08', feature_flags
FROM public.vertical_market_activations
WHERE vertical_type = 'real_estate' AND market_code = 'FR'
ON CONFLICT (market_code) DO UPDATE SET
  is_enabled = EXCLUDED.is_enabled,
  feature_flags = EXCLUDED.feature_flags,
  regulatory_content_version = EXCLUDED.regulatory_content_version,
  updated_at = NOW();

WITH types(type, slug, label, description, icon_name, transactions, required, filters, sort_order) AS (
  VALUES
    ('apartment','appartements','Appartement','Studios et appartements','Building2',ARRAY['sale','long_term_rental','seasonal_rental','shared_accommodation'],ARRAY['price','livingArea','rooms','address','dpe'],ARRAY['price','livingArea','rooms','bedrooms','furnished','dpe','amenities'],10),
    ('house','maisons','Maison','Maisons individuelles et villas','House',ARRAY['sale','long_term_rental','seasonal_rental','life_annuity'],ARRAY['price','livingArea','landArea','rooms','address','dpe'],ARRAY['price','livingArea','landArea','rooms','bedrooms','dpe','amenities'],20),
    ('land','terrains','Terrain','Terrains constructibles et de loisirs','LandPlot',ARRAY['sale'],ARRAY['price','landArea','address'],ARRAY['price','landArea'],30),
    ('parking_garage','parkings-garages','Parking ou garage','Stationnements et boxes','SquareParking',ARRAY['sale','long_term_rental'],ARRAY['price','address'],ARRAY['price'],40),
    ('commercial','locaux-commerciaux','Local commercial','Commerces et locaux professionnels','Store',ARRAY['sale','long_term_rental'],ARRAY['price','livingArea','address'],ARRAY['price','livingArea'],50),
    ('office','bureaux','Bureau','Bureaux et espaces de travail','BriefcaseBusiness',ARRAY['sale','long_term_rental'],ARRAY['price','livingArea','address'],ARRAY['price','livingArea'],60),
    ('building','immeubles','Immeuble','Immeubles complets','Landmark',ARRAY['sale'],ARRAY['price','livingArea','address','dpe'],ARRAY['price','livingArea','dpe'],70),
    ('new_development','programmes-neufs','Programme neuf','Programmes et lots neufs','Blocks',ARRAY['sale'],ARRAY['price','livingArea','address'],ARRAY['price','livingArea','rooms'],80),
    ('holiday_rental','locations-vacances','Location saisonnière','Locations de courte durée','Palmtree',ARRAY['seasonal_rental'],ARRAY['price','livingArea','rooms','address'],ARRAY['price','livingArea','rooms','amenities'],90),
    ('room_shared','chambres-colocation','Chambre ou colocation','Chambres et logements partagés','BedDouble',ARRAY['shared_accommodation','long_term_rental'],ARRAY['price','livingArea','address','furnished'],ARRAY['price','livingArea','furnished','amenities'],100),
    ('other','autres-biens','Autre bien','Types administrables hors catalogue principal','CircleEllipsis',ARRAY['sale','long_term_rental','other'],ARRAY['price','address'],ARRAY['price'],110)
)
INSERT INTO public.real_estate_property_types (
  type, market_code, slug, label, description, icon_name,
  transaction_types, required_field_ids, filter_field_ids, schema_version,
  is_active, sort_order
)
SELECT type, 'FR', slug, label, description, icon_name, transactions,
  required, filters, 1, TRUE, sort_order
FROM types
ON CONFLICT (type, market_code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  transaction_types = EXCLUDED.transaction_types,
  required_field_ids = EXCLUDED.required_field_ids,
  filter_field_ids = EXCLUDED.filter_field_ids,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

WITH attrs(id, label, help_text, field_type, unit, privacy, required, filterable, sort_order, options) AS (
  VALUES
    ('livingArea','Surface habitable','Surface selon les règles applicables au marché.','number','m²','public',TRUE,TRUE,10,NULL::jsonb),
    ('landArea','Surface du terrain',NULL,'number','m²','public',FALSE,TRUE,20,NULL::jsonb),
    ('rooms','Nombre de pièces',NULL,'number',NULL,'public',TRUE,TRUE,30,NULL::jsonb),
    ('bedrooms','Chambres',NULL,'number',NULL,'public',FALSE,TRUE,40,NULL::jsonb),
    ('bathrooms','Salles de bain',NULL,'number',NULL,'public',FALSE,FALSE,50,NULL::jsonb),
    ('furnished','Meublé',NULL,'boolean',NULL,'public',FALSE,TRUE,60,NULL::jsonb),
    ('dpe','Classe DPE','Affichée uniquement lorsque requise et renseignée.','single_select',NULL,'public',FALSE,TRUE,70,'[{"value":"A","label":"A","sortOrder":10},{"value":"B","label":"B","sortOrder":20},{"value":"C","label":"C","sortOrder":30},{"value":"D","label":"D","sortOrder":40},{"value":"E","label":"E","sortOrder":50},{"value":"F","label":"F","sortOrder":60},{"value":"G","label":"G","sortOrder":70}]'::jsonb),
    ('ges','Classe GES',NULL,'single_select',NULL,'public',FALSE,TRUE,80,'[{"value":"A","label":"A","sortOrder":10},{"value":"B","label":"B","sortOrder":20},{"value":"C","label":"C","sortOrder":30},{"value":"D","label":"D","sortOrder":40},{"value":"E","label":"E","sortOrder":50},{"value":"F","label":"F","sortOrder":60},{"value":"G","label":"G","sortOrder":70}]'::jsonb),
    ('coOwnership','Copropriété',NULL,'boolean',NULL,'public',FALSE,TRUE,90,NULL::jsonb),
    ('coOwnershipLots','Nombre de lots',NULL,'number',NULL,'public',FALSE,FALSE,100,NULL::jsonb),
    ('riskInformationStatus','Information sur les risques',NULL,'single_select',NULL,'public',FALSE,FALSE,110,'[{"value":"available","label":"Disponible","sortOrder":10},{"value":"pending","label":"En attente","sortOrder":20},{"value":"not_applicable","label":"Non applicable","sortOrder":30}]'::jsonb),
    ('professionalIdentity','Identification professionnelle','Référence déclarée par le professionnel.','text',NULL,'public',FALSE,FALSE,120,NULL::jsonb),
    ('diagnostics','Diagnostics et documents','Les fichiers restent privés.','document_status',NULL,'reviewer_only',FALSE,FALSE,130,NULL::jsonb),
    ('amenities','Équipements',NULL,'multi_select',NULL,'public',FALSE,TRUE,140,'[{"value":"lift","label":"Ascenseur","sortOrder":10},{"value":"balcony","label":"Balcon","sortOrder":20},{"value":"terrace","label":"Terrasse","sortOrder":30},{"value":"garden","label":"Jardin","sortOrder":40},{"value":"parking","label":"Parking","sortOrder":50},{"value":"cellar","label":"Cave","sortOrder":60},{"value":"accessible","label":"Accessible PMR","sortOrder":70}]'::jsonb)
)
INSERT INTO public.real_estate_attribute_definitions (
  id, market_code, property_types, transaction_types, label, help_text,
  field_type, unit, options, privacy, is_required, is_filterable,
  is_active, schema_version, sort_order
)
SELECT id, 'FR', ARRAY['apartment','house','land','parking_garage','commercial','office','building','new_development','holiday_rental','room_shared','other'],
  ARRAY['sale','long_term_rental','seasonal_rental','shared_accommodation','life_annuity','other'],
  label, help_text, field_type, unit, options, privacy, required, filterable,
  TRUE, 1, sort_order
FROM attrs
ON CONFLICT (id, market_code) DO UPDATE SET
  label = EXCLUDED.label,
  help_text = EXCLUDED.help_text,
  options = EXCLUDED.options,
  privacy = EXCLUDED.privacy,
  is_required = EXCLUDED.is_required,
  is_filterable = EXCLUDED.is_filterable,
  updated_at = NOW();

WITH rules(id, property_type, transaction_type, field_id, requirement, condition_payload) AS (
  VALUES
    ('10000000-0000-0000-0000-000000000001'::uuid,NULL::varchar,NULL::varchar,'dpe','required','{"path":"energy.dpeClass","excludedPropertyTypes":["land","parking_garage"]}'::jsonb),
    ('10000000-0000-0000-0000-000000000002'::uuid,NULL::varchar,NULL::varchar,'ges','required','{"path":"energy.gesClass","excludedPropertyTypes":["land","parking_garage"]}'::jsonb),
    ('10000000-0000-0000-0000-000000000003'::uuid,'apartment',NULL::varchar,'coOwnershipLots','required','{"path":"regulatory.coOwnershipLots","whenPath":"regulatory.coOwnershipApplicable","whenEquals":true}'::jsonb),
    ('10000000-0000-0000-0000-000000000004'::uuid,NULL::varchar,NULL::varchar,'riskInformationStatus','required','{"path":"regulatory.riskInformationStatus"}'::jsonb),
    ('10000000-0000-0000-0000-000000000005'::uuid,NULL::varchar,NULL::varchar,'professionalIdentity','required','{"path":"seller.professionalIdentity","sellerTypes":["agency","developer","property_manager"]}'::jsonb)
)
INSERT INTO public.real_estate_field_rules (
  id, market_code, property_type, transaction_type, field_id, requirement,
  condition_payload, schema_version, is_active
)
SELECT id, 'FR', property_type, transaction_type, field_id, requirement,
  condition_payload, 1, TRUE
FROM rules
ON CONFLICT (id) DO UPDATE SET
  property_type = EXCLUDED.property_type,
  transaction_type = EXCLUDED.transaction_type,
  field_id = EXCLUDED.field_id,
  requirement = EXCLUDED.requirement,
  condition_payload = EXCLUDED.condition_payload,
  is_active = EXCLUDED.is_active;

WITH offers(id,audience,kind,name,description,recommended,sort_order) AS (
  VALUES
    ('immo_owner_free','individual','free','Propriétaire Gratuit','Publication standard, contacts et statistiques essentielles.',FALSE,10),
    ('immo_owner_visibility','individual','pack','Pack Visibilité Propriétaire','Médias renforcés, visite virtuelle, statistiques détaillées et crédits visibilité.',TRUE,20),
    ('immo_agency_starter','professional','subscription','Agency Starter','Profil agence, équipe, leads et statistiques essentielles.',FALSE,30),
    ('immo_agency_growth','professional','subscription','Agency Growth','Imports, synchronisation, assignation des leads et rapports avancés.',TRUE,40),
    ('immo_agency_network','organization','custom','Agency Network','Agences multiples, facturation centralisée, API, quotas et tarification sur mesure.',FALSE,50)
)
INSERT INTO public.vertical_offers (
  id, vertical_type, market_code, audience, kind, name, description,
  is_active, is_recommended, sort_order
)
SELECT id, 'real_estate', 'FR', audience, kind, name, description, TRUE,
  recommended, sort_order FROM offers
ON CONFLICT (id, vertical_type, market_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  is_recommended = EXCLUDED.is_recommended,
  updated_at = NOW();

WITH prices(id,offer_id,amount,billing,duration,trial,tax) AS (
  VALUES
    ('immo_owner_free_once','immo_owner_free',0::bigint,'once',60,NULL::int,0),
    ('immo_owner_visibility_once','immo_owner_visibility',2990::bigint,'once',30,NULL::int,2000),
    ('immo_agency_starter_month','immo_agency_starter',7900::bigint,'month',NULL::int,14,2000),
    ('immo_agency_growth_month','immo_agency_growth',16900::bigint,'month',NULL::int,14,2000),
    ('immo_agency_network_month','immo_agency_network',39900::bigint,'month',NULL::int,0,2000)
)
INSERT INTO public.vertical_offer_prices (
  id, offer_id, vertical_type, market_code, amount_minor, currency,
  billing_period, duration_days, trial_days, tax_rate_bps, is_active
)
SELECT id, offer_id, 'real_estate', 'FR', amount, 'EUR', billing, duration,
  trial, tax, TRUE FROM prices
ON CONFLICT (id) DO UPDATE SET amount_minor = EXCLUDED.amount_minor,
  duration_days = EXCLUDED.duration_days,
  trial_days = EXCLUDED.trial_days,
  tax_rate_bps = EXCLUDED.tax_rate_bps,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

WITH e(offer_id,key,value) AS (
  VALUES
    ('immo_owner_free','maxActiveListings','1'::jsonb),
    ('immo_owner_free','maxMedia','12'::jsonb),
    ('immo_owner_free','basicAnalytics','true'::jsonb),
    ('immo_owner_visibility','maxActiveListings','3'::jsonb),
    ('immo_owner_visibility','maxMedia','30'::jsonb),
    ('immo_owner_visibility','virtualTour','true'::jsonb),
    ('immo_owner_visibility','qualifiedContactForm','true'::jsonb),
    ('immo_owner_visibility','detailedAnalytics','true'::jsonb),
    ('immo_owner_visibility','includedBumpCredits','3'::jsonb),
    ('immo_owner_visibility','includedUrgentCredits','1'::jsonb),
    ('immo_owner_visibility','includedFeaturedCredits','1'::jsonb),
    ('immo_agency_starter','maxActiveListings','25'::jsonb),
    ('immo_agency_starter','maxTeamMembers','3'::jsonb),
    ('immo_agency_starter','agencyProfile','true'::jsonb),
    ('immo_agency_starter','leadInbox','true'::jsonb),
    ('immo_agency_growth','maxActiveListings','200'::jsonb),
    ('immo_agency_growth','maxTeamMembers','20'::jsonb),
    ('immo_agency_growth','csvImport','true'::jsonb),
    ('immo_agency_growth','xmlImport','true'::jsonb),
    ('immo_agency_growth','automaticSync','true'::jsonb),
    ('immo_agency_growth','leadAssignment','true'::jsonb),
    ('immo_agency_growth','advancedReports','true'::jsonb),
    ('immo_agency_growth','includedVisibilityCredits','2000'::jsonb),
    ('immo_agency_network','maxActiveListings','1000'::jsonb),
    ('immo_agency_network','maxTeamMembers','100'::jsonb),
    ('immo_agency_network','maxBranches','50'::jsonb),
    ('immo_agency_network','centralizedBilling','true'::jsonb),
    ('immo_agency_network','branchPermissions','true'::jsonb),
    ('immo_agency_network','apiAccess','true'::jsonb),
    ('immo_agency_network','customPricing','true'::jsonb)
)
INSERT INTO public.vertical_offer_entitlements (
  offer_id, vertical_type, market_code, entitlement_key, entitlement_value
)
SELECT offer_id, 'real_estate', 'FR', key, value FROM e
ON CONFLICT (offer_id, vertical_type, market_code, entitlement_key)
DO UPDATE SET entitlement_value = EXCLUDED.entitlement_value, updated_at = NOW();

WITH a(id,type,name,description,amount,days,credits,modes,sort_order) AS (
  VALUES
    ('immo_urgent','urgent','Urgent','Badge visible pendant la durée configurée.',790::bigint,7,1,ARRAY['immediate'],10),
    ('immo_bump','search_bump','Remonter l’annonce','Actualise le tri sans modifier la date de publication.',490::bigint,1,1,ARRAY['immediate','daily','scheduled'],20),
    ('immo_featured','featured','À la une','Emplacement payant identifiable, ciblé par catégorie et zone.',1490::bigint,7,1,ARRAY['immediate','scheduled'],30),
    ('immo_home_spotlight','homepage_spotlight','Spotlight accueil','Emplacement sponsorisé identifiable sur l’accueil.',2990::bigint,7,1,ARRAY['scheduled'],40),
    ('immo_local_spotlight','local_spotlight','Spotlight local','Emplacement sponsorisé identifiable dans une zone locale.',1990::bigint,7,1,ARRAY['scheduled'],50),
    ('immo_qualified_lead','qualified_lead','Crédit lead qualifié','Crédit pour une demande structurée qualifiée.',590::bigint,NULL::int,1,ARRAY['immediate'],60),
    ('immo_sponsored_agency','sponsored_professional','Agence sponsorisée','Placement professionnel payant et identifiable.',4990::bigint,30,1,ARRAY['scheduled'],70)
)
INSERT INTO public.vertical_add_ons (
  id, vertical_type, market_code, type, name, description, amount_minor,
  currency, tax_rate_bps, validity_days, credit_quantity, schedule_modes,
  is_active, sort_order
)
SELECT id, 'real_estate', 'FR', type, name, description, amount, 'EUR', 2000,
  days, credits, modes, TRUE, sort_order FROM a
ON CONFLICT (id, vertical_type, market_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  amount_minor = EXCLUDED.amount_minor,
  validity_days = EXCLUDED.validity_days,
  schedule_modes = EXCLUDED.schedule_modes,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Optional deterministic property fixture. It is inserted only when the base
-- seed already contains a profile, so the file also works in catalogue-only DBs.
WITH owner AS (
  SELECT id FROM public.profiles ORDER BY created_at LIMIT 1
)
INSERT INTO public.real_estate_properties (
  created_by_user_id, owner_user_id, market_code, slug, schema_version, property_type,
  transaction_type, seller_type, lifecycle, title, description,
  price_minor, currency, price_period, price_per_sqm_minor,
  living_area_sqm, rooms, bedrooms, bathrooms, floor, furnished,
  dpe_class, ges_class, city, postal_code, public_location_label,
  location_precision, location_point, exact_address_private, amenities,
  regulatory_payload, seller_public_payload, promotion_payload,
  is_featured, is_sponsored,
  moderation_status, risk_signals_private, published_at, sort_date
)
SELECT owner.id, owner.id, 'FR', 'appartement-lumineux-lyon-montchat', 1, 'apartment',
  'sale', 'owner', 'published', 'Appartement lumineux avec balcon',
  'Appartement traversant, calme et lumineux, proche des commerces et transports.',
  48500000, 'EUR', 'total', 527200, 92, 4, 3, 1, 3, FALSE,
  'B', 'B', 'Lyon', '69003', 'Lyon 3e · Montchat', 'district',
  extensions.ST_SetSRID(extensions.ST_MakePoint(4.888,45.750),4326)::extensions.geography,
  'Adresse privée de démonstration', ARRAY['lift','balcony','cellar'],
  '{"coOwnershipApplicable":true,"coOwnershipLots":48,"coOwnershipProcedureStatus":"none","riskInformationStatus":"available","ownershipDeclared":true,"legalNotices":[]}'::jsonb,
  '{"type":"owner","id":"seed-owner","displayName":"Marie D.","verificationLabels":["Téléphone vérifié"],"responseTimeLabel":"Répond généralement dans la journée"}'::jsonb,
  '{"urgent":false,"featured":true,"sponsored":true,"endsAt":"2026-09-01T10:00:00.000Z"}'::jsonb,
  TRUE, TRUE,
  'approved', '[]'::jsonb, '2026-08-20T10:00:00.000Z', '2026-08-22T10:00:00.000Z'
FROM owner
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  price_minor = EXCLUDED.price_minor,
  moderation_status = EXCLUDED.moderation_status,
  updated_at = NOW();
