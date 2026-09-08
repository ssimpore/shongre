-- Deterministic France business configuration for Shongre Immo. Prices, quotas, taxes and
-- entitlements are data, not UI constants. Paid execution stays provider-gated.

INSERT INTO public.vertical_market_activations (
  vertical_type, market_code, category_ids, subcategory_ids,
  schema_version, is_active, feature_flags
)
VALUES (
  'real_estate', 'FR', ARRAY['real_estate'],
  ARRAY['real_estate.sales','real_estate.rentals'], 1, TRUE,
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
  SELECT profile.id
  FROM public.profiles profile
  LEFT JOIN public.staff_memberships staff
    ON staff.user_id = profile.id
  WHERE staff.user_id IS NULL
    AND profile.status = 'active'
  ORDER BY profile.created_at, profile.id
  LIMIT 1
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
