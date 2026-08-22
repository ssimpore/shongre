-- =============================================================================
-- CANONICAL TAXONOMY GOVERNANCE AND LEGACY RECONCILIATION
-- Expand → map → verify. Legacy category rows are deprecated, never deleted.
-- =============================================================================

ALTER TABLE public.categories
    ADD COLUMN IF NOT EXISTS publishable BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS schema_version INT NOT NULL DEFAULT 2 CHECK (schema_version > 0),
    ADD COLUMN IF NOT EXISTS schema_status VARCHAR(20) NOT NULL DEFAULT 'published'
        CHECK (schema_status IN ('draft', 'published', 'deprecated')),
    ADD COLUMN IF NOT EXISTS primary_cta VARCHAR(40),
    ADD COLUMN IF NOT EXISTS publication_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS presentation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS moderation_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS media_guidance JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS seo_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS active_market_codes TEXT[] NOT NULL DEFAULT ARRAY['FR'],
    ADD COLUMN IF NOT EXISTS premium_feature_availability JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.taxonomy_aliases (
    alias VARCHAR(160) PRIMARY KEY,
    canonical_node_id VARCHAR(100) NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    alias_kind VARCHAR(20) NOT NULL CHECK (alias_kind IN ('id', 'slug', 'label', 'translation')),
    redirect_path TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (alias = LOWER(TRIM(alias)))
);

CREATE TABLE IF NOT EXISTS public.taxonomy_merge_mappings (
    source_node_id VARCHAR(100) PRIMARY KEY,
    canonical_node_id VARCHAR(100) NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    source_slug VARCHAR(160) NOT NULL,
    listing_count_before BIGINT NOT NULL DEFAULT 0,
    saved_search_count_before BIGINT NOT NULL DEFAULT 0,
    attribute_count_before BIGINT NOT NULL DEFAULT 0,
    migration_version INT NOT NULL,
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (source_node_id <> canonical_node_id)
);

INSERT INTO public.taxonomy_versions (version_number, status, description, published_at)
VALUES (3, 'published', 'Identités canoniques partagées, politiques de publication, modération et aliases', NOW())
ON CONFLICT (version_number) DO UPDATE
SET status = EXCLUDED.status,
    description = EXCLUDED.description,
    published_at = COALESCE(public.taxonomy_versions.published_at, EXCLUDED.published_at);

WITH canonical (
    id, code, slug, label_fr, label_en, short_fr, parent_id, icon_name,
    sort_order, level, publishable, listing_family, supported_intents
) AS (VALUES
    ('vehicles','VEH','vehicules','Véhicules','Vehicles','Véhicules',NULL,'Car',1,'category',FALSE,'vehicle',ARRAY['SELL','GIVE','EXCHANGE']),
    ('vehicles.cars','VEH_CARS','voitures','Voitures d''occasion','Used Cars','Voitures','vehicles','Tag',1,'subcategory',FALSE,'vehicle',ARRAY['SELL','GIVE','EXCHANGE']),
    ('vehicles.cars.citadines','VEH_CARS_CITADINE','citadines','Citadines','City cars',NULL,'vehicles.cars','Tag',1,'type',TRUE,'vehicle',ARRAY['SELL','GIVE','EXCHANGE']),
    ('vehicles.cars.berlines','VEH_CARS_BERLINE','berlines','Berlines','Sedans',NULL,'vehicles.cars','Tag',2,'type',TRUE,'vehicle',ARRAY['SELL','GIVE','EXCHANGE']),
    ('vehicles.cars.suv','VEH_CARS_SUV','suv-4x4','SUV & 4x4','SUVs & 4x4',NULL,'vehicles.cars','Tag',3,'type',TRUE,'vehicle',ARRAY['SELL','GIVE','EXCHANGE']),
    ('vehicles.cars.breaks','VEH_CARS_BREAK','breaks','Breaks','Station wagons',NULL,'vehicles.cars','Tag',4,'type',TRUE,'vehicle',ARRAY['SELL','GIVE','EXCHANGE']),
    ('vehicles.cars.coupes_cabriolets','VEH_CARS_COUPE','coupes-cabriolets','Coupés & Cabriolets','Coupes & Convertibles',NULL,'vehicles.cars','Tag',5,'type',TRUE,'vehicle',ARRAY['SELL','GIVE','EXCHANGE']),
    ('vehicles.cars.utilitaires','VEH_CARS_UTILITAIRE','utilitaires-fourgons','Utilitaires & Fourgons','Vans & Commercial',NULL,'vehicles.cars','Tag',6,'type',TRUE,'vehicle',ARRAY['SELL','GIVE','EXCHANGE']),
    ('vehicles.motos','VEH_MOTOS','motos-scooters','Motos & Scooters','Motorcycles & Scooters','Motos & Scooters','vehicles','Tag',2,'subcategory',TRUE,'vehicle',ARRAY['SELL','GIVE','EXCHANGE']),
    ('vehicles.cycles','VEH_CYCLES','velos-trottinettes','Vélos & Trottinettes électriques','Bicycles & E-scooters','Vélos & Trottinettes','vehicles','Tag',3,'subcategory',TRUE,'vehicle',ARRAY['SELL','GIVE','EXCHANGE']),
    ('vehicles.parts','VEH_PARTS','equipement-pieces-auto-moto','Équipements & Pièces Auto / Moto','Auto & Moto Parts','Pièces auto & moto','vehicles','Tag',4,'subcategory',TRUE,'vehicle',ARRAY['SELL','GIVE','EXCHANGE']),
    ('real_estate','RE','immobilier','Immobilier','Real Estate','Immobilier',NULL,'Building',2,'category',FALSE,'real_estate',ARRAY['SELL','RENT']),
    ('real_estate.sales','RE_SALES','ventes-immobilieres','Ventes immobilières','Properties for Sale','Ventes immo','real_estate','Tag',1,'subcategory',TRUE,'real_estate',ARRAY['SELL','RENT']),
    ('real_estate.rentals','RE_RENTALS','locations-immobilieres','Locations à l''année','Long-term Rentals','Locations','real_estate','Tag',2,'subcategory',TRUE,'real_estate',ARRAY['RENT']),
    ('real_estate.commercial','RE_COMMERCIAL','bureaux-commerces','Bureaux & Commerces','Commercial Properties','Bureaux & Commerces','real_estate','Tag',3,'subcategory',TRUE,'real_estate',ARRAY['SELL','RENT']),
    ('real_estate.parking','RE_PARKING','parkings-garages','Parkings & Garages','Parking & Garages','Parkings & Garages','real_estate','Tag',4,'subcategory',TRUE,'real_estate',ARRAY['SELL','RENT']),
    ('jobs','JOB','emploi','Emploi & Recrutement','Jobs & Careers','Emploi',NULL,'Briefcase',3,'category',FALSE,'job',ARRAY['JOB_OFFER']),
    ('jobs.offers','JOB_OFFERS','offres-d-emploi','Offres d''emploi','Job Offers','Offres d''emploi','jobs','Tag',1,'subcategory',TRUE,'job',ARRAY['JOB_OFFER']),
    ('services','SRV','services','Services & Prestations','Services','Services',NULL,'Wrench',4,'category',FALSE,'service',ARRAY['OFFER_SERVICE']),
    ('services.home_repairs','SRV_HOME','bricolage-travaux','Bricolage, Rénovation & Travaux','Home Improvement','Bricolage & Travaux','services','Tag',1,'subcategory',TRUE,'service',ARRAY['OFFER_SERVICE']),
    ('services.tutoring','SRV_TUTOR','cours-particuliers','Cours particuliers & Formation','Tutoring & Lessons','Cours & Formation','services','Tag',2,'subcategory',TRUE,'service',ARRAY['OFFER_SERVICE']),
    ('services.events','SRV_EVENT','evenementiel-animation','Événementiel, Photo & DJ','Events & Entertainment','Événementiel & Photo','services','Tag',3,'subcategory',TRUE,'service',ARRAY['OFFER_SERVICE']),
    ('home_garden','HOME','maison-jardin','Maison, Meubles & Jardin','Home & Garden','Maison & Jardin',NULL,'Home',5,'category',FALSE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('home_garden.furniture','HOME_FURNITURE','mobilier','Mobilier & Meubles','Furniture','Mobilier','home_garden','Tag',1,'subcategory',FALSE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('home_garden.furniture.sofas','HOME_SOFAS','canapes-fauteuils','Canapés & Fauteuils','Sofas & Armchairs',NULL,'home_garden.furniture','Tag',1,'type',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('home_garden.furniture.tables','HOME_TABLES','tables-chaises','Tables & Chaises','Tables & Chairs',NULL,'home_garden.furniture','Tag',2,'type',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('home_garden.furniture.beds','HOME_BEDS','lits-literie','Lits & Literie','Beds & Mattresses',NULL,'home_garden.furniture','Tag',3,'type',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('home_garden.appliances','HOME_APPLIANCES','electromenager','Électroménager','Home Appliances','Électroménager','home_garden','Tag',2,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('home_garden.diy_garden','HOME_DIY','bricolage-outillage-jardin','Bricolage, Outillage & Jardin','DIY & Gardening','Bricolage & Jardin','home_garden','Tag',3,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('electronics','ELEC','multimedia-electronique','Électronique & Multimédia','Electronics & Tech','Multimédia',NULL,'Smartphone',6,'category',FALSE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('electronics.smartphones','ELEC_PHONES','smartphones-telephones','Smartphones & Téléphones','Smartphones','Téléphones','electronics','Tag',1,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('electronics.computers','ELEC_COMPUTERS','informatique-pc-portables','Informatique & PC Portables','Computers & Laptops','Informatique','electronics','Tag',2,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('electronics.gaming','ELEC_GAMING','consoles-jeux-video','Consoles & Jeux vidéo','Video Games & Consoles','Jeux vidéo','electronics','Tag',3,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('electronics.audio_hifi','ELEC_AUDIO','audio-hi-fi-casques','Audio, Hi-Fi & Casques','Audio & Headphones','Audio & Hi-Fi','electronics','Tag',4,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('fashion','FASH','mode-accessoires','Mode & Accessoires','Fashion & Accessories','Mode',NULL,'Shirt',7,'category',FALSE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('fashion.women','FASH_WOMEN','vetements-femme','Vêtements Femme','Women''s Clothing','Mode Femme','fashion','Tag',1,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('fashion.men','FASH_MEN','vetements-homme','Vêtements Homme','Men''s Clothing','Mode Homme','fashion','Tag',2,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('fashion.shoes','FASH_SHOES','chaussures','Chaussures','Shoes','Chaussures','fashion','Tag',3,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('fashion.jewelry','FASH_JEWELRY','montres-bijoux','Montres & Bijoux','Watches & Jewelry','Montres & Bijoux','fashion','Tag',4,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('baby_kids','BABY','bebe-puericulture-enfants','Bébé & Puériculture','Baby & Kids','Bébé & Enfant',NULL,'Baby',8,'category',FALSE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('baby_kids.strollers','BABY_STROLLERS','poussettes-sieges-auto','Poussettes & Sièges auto','Strollers & Car Seats','Poussettes & Sièges','baby_kids','Tag',1,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('baby_kids.toys','BABY_TOYS','jouets-jeux-eveil','Jouets & Jeux d''éveil','Toys & Games','Jouets & Éveil','baby_kids','Tag',2,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('leisure_culture','LEIS','loisirs-culture','Loisirs, Livres & Musique','Leisure & Culture','Loisirs & Culture',NULL,'BookOpen',9,'category',FALSE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('leisure_culture.instruments','LEIS_MUSIC','instruments-de-musique','Instruments de musique','Musical Instruments','Instruments','leisure_culture','Tag',1,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('leisure_culture.books','LEIS_BOOKS','livres-bd-mangas','Livres, BD & Mangas','Books & Comics','Livres & BD','leisure_culture','Tag',2,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('sports_outdoors','SPORT','sports-plein-air','Sports & Plein air','Sports & Outdoors','Sports',NULL,'Trophy',10,'category',FALSE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('sports_outdoors.fitness','SPORT_FITNESS','fitness-musculation','Fitness & Musculation','Fitness & Gym','Fitness','sports_outdoors','Tag',1,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('sports_outdoors.outdoor','SPORT_OUTDOOR','randonnee-camping-ski','Randonnée, Camping & Ski','Outdoor & Ski','Outdoor & Rando','sports_outdoors','Tag',2,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('sports_outdoors.water_sports','SPORT_WATER','sports-nautiques','Sports nautiques & Glisse','Water Sports & Boardsports','Sports nautiques','sports_outdoors','Tag',3,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('pets','PETS','animaux-accessoires','Animaux & Accessoires','Pets & Accessories','Animaux',NULL,'Dog',11,'category',FALSE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('pets.accessories','PETS_ACC','accessoires-animaux','Accessoires & Alimentation','Pet Supplies','Accessoires & Soins','pets','Tag',1,'subcategory',TRUE,'physical_product',ARRAY['SELL','GIVE','EXCHANGE']),
    ('professional_btp','PRO_BTP','materiel-professionnel','Matériel Professionnel & BTP','Professional Equipment','Matériel Pro',NULL,'HardHat',12,'category',FALSE,'professional_equipment',ARRAY['SELL','RENT']),
    ('professional_btp.machinery','PRO_MACHINERY','btp-chantier-engins','BTP, Chantier & Engins','Construction & Heavy Machinery','Engins & BTP','professional_btp','Tag',1,'subcategory',TRUE,'professional_equipment',ARRAY['SELL','RENT']),
    ('professional_btp.catering','PRO_CATERING','restauration-hotellerie','Restauration & Hôtellerie (CHR)','Catering & Hospitality','Restauration CHR','professional_btp','Tag',2,'subcategory',TRUE,'professional_equipment',ARRAY['SELL','RENT']),
    ('agriculture','AGRI','materiel-agricole-espaces-verts','Agriculture & Espaces verts','Agriculture & Farming','Agriculture',NULL,'Tractor',13,'category',FALSE,'professional_equipment',ARRAY['SELL','RENT']),
    ('agriculture.tractors','AGRI_TRACTORS','tracteurs-materiel-recolte','Tracteurs & Matériel de récolte','Tractors & Harvesters','Tracteurs & Récolte','agriculture','Tag',1,'subcategory',TRUE,'professional_equipment',ARRAY['SELL','RENT']),
    ('energy_transition','ENERGY','energie-solaire-transition','Énergie & Transition Écologique','Solar Energy & EV','Énergie & Solaire',NULL,'Sun',14,'category',FALSE,'professional_equipment',ARRAY['SELL','RENT']),
    ('energy_transition.solar','ENERGY_SOLAR','panneaux-solaires-onduleurs','Panneaux solaires & Onduleurs','Solar Panels & Inverters','Panneaux solaires','energy_transition','Tag',1,'subcategory',TRUE,'professional_equipment',ARRAY['SELL','RENT']),
    ('energy_transition.ev_charging','ENERGY_EV','bornes-recharge-ve','Bornes de recharge VE','EV Charging Stations','Bornes de recharge','energy_transition','Tag',2,'subcategory',TRUE,'professional_equipment',ARRAY['SELL','RENT']),
    ('pro_it_telecom','PRO_IT','informatique-pro-serveurs','Informatique Pro & Serveurs','Enterprise IT & Servers','IT & Serveurs',NULL,'Server',15,'category',TRUE,'professional_equipment',ARRAY['SELL','RENT']),
    ('deals_donations','DEALS','dons-solidarite-bons-plans','Dons & Solidarité','Free Items & Donations','Dons & Gratuit',NULL,'Gift',16,'category',TRUE,'physical_product',ARRAY['GIVE','EXCHANGE'])
)
INSERT INTO public.categories (
    id, code, slug, name, short_label, parent_id, icon_name, sort_order,
    is_active, labels, short_labels, level, publishable, status,
    listing_family, supported_intents, capabilities, seller_eligibility,
    schema_version, schema_status,
    primary_cta, publication_config, presentation_config, moderation_policy,
    media_guidance, seo_config, active_market_codes,
    premium_feature_availability, taxonomy_version_id
)
SELECT
    c.id, c.code, c.slug, c.label_fr, c.short_fr, c.parent_id, c.icon_name,
    c.sort_order, TRUE,
    jsonb_build_object('fr-FR', c.label_fr, 'en-US', c.label_en),
    CASE WHEN c.short_fr IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('fr-FR', c.short_fr) END,
    c.level, c.publishable, 'active', c.listing_family, c.supported_intents,
    jsonb_build_object(
      'canSell', c.listing_family NOT IN ('job','service'),
      'canGive', c.listing_family = 'physical_product',
      'canExchange', c.listing_family = 'physical_product',
      'canRent', c.listing_family IN ('real_estate','professional_equipment'),
      'reservationAllowed', c.listing_family NOT IN ('job','real_estate'),
      'securePaymentAllowed', c.listing_family NOT IN ('job','real_estate','service'),
      'negotiablePrice', c.listing_family <> 'job',
      'fulfillmentModes', CASE
        WHEN c.listing_family IN ('job','real_estate') THEN jsonb_build_array('none')
        WHEN c.listing_family = 'service' THEN jsonb_build_array('on_site_service','none')
        ELSE jsonb_build_array('hand_delivery','parcel_shipping')
      END
    ),
    CASE WHEN c.listing_family = 'job'
      THEN jsonb_build_object('individualAllowed',FALSE,'proAllowed',TRUE,'proVerificationRequired',TRUE)
      ELSE jsonb_build_object('individualAllowed',TRUE,'proAllowed',TRUE,'proVerificationRequired',FALSE)
    END,
    2, 'published',
    CASE
      WHEN c.listing_family = 'job' THEN 'apply'
      WHEN c.listing_family = 'real_estate' THEN 'request_visit'
      WHEN c.listing_family = 'vehicle' THEN 'request_test_drive'
      WHEN c.id = 'services.tutoring' THEN 'request_lesson'
      WHEN c.listing_family IN ('service', 'professional_equipment') THEN 'request_quote'
      ELSE 'contact_seller'
    END,
    jsonb_build_object(
      'steps', jsonb_build_array('intent','taxonomy','essential','condition_history','price_compensation','fulfillment_location','media_documents','contact_preferences','preview','standard_or_upgrades','confirmation'),
      'standardPolicy', jsonb_build_object(
        'enabled', TRUE,
        'label', 'Publication standard gratuite',
        'eligibleSellerTypes', CASE
          WHEN c.listing_family = 'job' THEN jsonb_build_array('professional')
          ELSE jsonb_build_array('individual','professional')
        END,
        'durationDays', 60,
        'mediaAllowance', CASE WHEN c.listing_family = 'real_estate' THEN 20 WHEN c.listing_family = 'job' THEN 4 ELSE 12 END,
        'includesMessaging', TRUE,
        'includesListingManagement', TRUE,
        'includesStandardStatistics', TRUE,
        'paidUpgradesOptional', TRUE
      )
    ),
    jsonb_build_object('detailGroupOrder', jsonb_build_array('general','specifications','dimensions','performance','legal')),
    jsonb_build_object(
      'policyId', 'moderation.' || split_part(c.id, '.', 1) || '.v1',
      'reviewMode', CASE WHEN c.listing_family IN ('vehicle','real_estate','professional_equipment') THEN 'enhanced' ELSE 'standard' END,
      'prohibitedItemRuleIds', jsonb_build_array('prohibited.illegal','prohibited.counterfeit','prohibited.' || split_part(c.id, '.', 1)),
      'safetyNoticeKeys', jsonb_build_array('safety.' || split_part(c.id, '.', 1) || '.general')
    ),
    jsonb_build_object(
      'minimumPhotoCount', CASE WHEN c.listing_family = 'real_estate' THEN 5 WHEN c.listing_family IN ('job','service') THEN 0 WHEN c.listing_family IN ('vehicle','professional_equipment') THEN 3 ELSE 1 END,
      'maxPhotoCount', CASE WHEN c.listing_family = 'real_estate' THEN 20 WHEN c.listing_family = 'job' THEN 4 ELSE 12 END
    ),
    jsonb_build_object('canonicalPath', '/categorie/' || c.slug, 'indexable', TRUE),
    ARRAY['FR'],
    jsonb_build_object('urgent',TRUE,'searchBump',TRUE,'featured',TRUE,'extraMedia',TRUE,'preselected',FALSE),
    (SELECT id FROM public.taxonomy_versions WHERE version_number = 3)
FROM canonical c
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    slug = EXCLUDED.slug,
    name = EXCLUDED.name,
    short_label = EXCLUDED.short_label,
    parent_id = EXCLUDED.parent_id,
    icon_name = EXCLUDED.icon_name,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE,
    labels = EXCLUDED.labels,
    short_labels = EXCLUDED.short_labels,
    level = EXCLUDED.level,
    publishable = EXCLUDED.publishable,
    status = EXCLUDED.status,
    listing_family = EXCLUDED.listing_family,
    supported_intents = EXCLUDED.supported_intents,
    capabilities = EXCLUDED.capabilities,
    seller_eligibility = EXCLUDED.seller_eligibility,
    schema_version = EXCLUDED.schema_version,
    schema_status = EXCLUDED.schema_status,
    primary_cta = EXCLUDED.primary_cta,
    publication_config = EXCLUDED.publication_config,
    presentation_config = EXCLUDED.presentation_config,
    moderation_policy = EXCLUDED.moderation_policy,
    media_guidance = EXCLUDED.media_guidance,
    seo_config = EXCLUDED.seo_config,
    active_market_codes = EXCLUDED.active_market_codes,
    premium_feature_availability = EXCLUDED.premium_feature_availability,
    taxonomy_version_id = EXCLUDED.taxonomy_version_id,
    updated_at = NOW();

WITH mappings (source_id, source_slug, canonical_id) AS (VALUES
    ('cars','cars','vehicles.cars'),
    ('motorcycles','motorcycles','vehicles.motos'),
    ('bicycles','bicycles','vehicles.cycles'),
    ('real-estate','real-estate','real_estate'),
    ('real-estate-sale','real-estate-sale','real_estate.sales'),
    ('real-estate-rent','real-estate-rent','real_estate.rentals'),
    ('multimedia','multimedia','electronics'),
    ('smartphones','smartphones','electronics.smartphones'),
    ('computers','computers','electronics.computers'),
    ('gaming','gaming','electronics.gaming'),
    ('home-garden','home-garden','home_garden'),
    ('furniture','furniture','home_garden.furniture'),
    ('appliances','appliances','home_garden.appliances'),
    ('clothing-women','clothing-women','fashion.women'),
    ('clothing-men','clothing-men','fashion.men'),
    ('luxury-watches','luxury-watches','fashion.jewelry'),
    ('leisure-sports','leisure-sports','leisure_culture'),
    ('musical-instruments','musical-instruments','leisure_culture.instruments'),
    ('sport-equipment','sport-equipment','sports_outdoors.fitness'),
    ('professional','professional','professional_btp')
)
INSERT INTO public.taxonomy_merge_mappings (
    source_node_id, canonical_node_id, source_slug,
    listing_count_before, saved_search_count_before, attribute_count_before,
    migration_version
)
SELECT
    m.source_id,
    m.canonical_id,
    m.source_slug,
    (SELECT COUNT(*) FROM public.listings l WHERE l.category_id = m.source_id),
    (SELECT COUNT(*) FROM public.saved_searches s WHERE s.category_id = m.source_id),
    (SELECT COUNT(*) FROM public.category_attributes a WHERE a.category_id = m.source_id),
    3
FROM mappings m
WHERE EXISTS (SELECT 1 FROM public.categories c WHERE c.id = m.source_id)
ON CONFLICT (source_node_id) DO UPDATE SET
    canonical_node_id = EXCLUDED.canonical_node_id,
    source_slug = EXCLUDED.source_slug,
    listing_count_before = GREATEST(public.taxonomy_merge_mappings.listing_count_before, EXCLUDED.listing_count_before),
    saved_search_count_before = GREATEST(public.taxonomy_merge_mappings.saved_search_count_before, EXCLUDED.saved_search_count_before),
    attribute_count_before = GREATEST(public.taxonomy_merge_mappings.attribute_count_before, EXCLUDED.attribute_count_before),
    migration_version = EXCLUDED.migration_version;

INSERT INTO public.taxonomy_aliases (alias, canonical_node_id, alias_kind, redirect_path)
SELECT LOWER(source_slug), canonical_node_id, 'slug', '/categorie/' || c.slug
FROM public.taxonomy_merge_mappings m
JOIN public.categories c ON c.id = m.canonical_node_id
ON CONFLICT (alias) DO UPDATE SET
    canonical_node_id = EXCLUDED.canonical_node_id,
    redirect_path = EXCLUDED.redirect_path,
    status = 'active';

INSERT INTO public.taxonomy_aliases (alias, canonical_node_id, alias_kind, redirect_path)
SELECT LOWER(source_node_id), canonical_node_id, 'id', '/categorie/' || c.slug
FROM public.taxonomy_merge_mappings m
JOIN public.categories c ON c.id = m.canonical_node_id
ON CONFLICT (alias) DO UPDATE SET
    canonical_node_id = EXCLUDED.canonical_node_id,
    redirect_path = EXCLUDED.redirect_path,
    status = 'active';

WITH legacy_aliases (alias, canonical_node_id) AS (VALUES
    ('vehicules','vehicles'),
    ('voitures','vehicles.cars'),
    ('motos','vehicles.motos'),
    ('velos','vehicles.cycles'),
    ('immobilier','real_estate'),
    ('ventes-immobilieres','real_estate.sales'),
    ('locations','real_estate.rentals'),
    ('smartphones','electronics.smartphones'),
    ('informatique','electronics.computers'),
    ('consoles-jeux','electronics.gaming'),
    ('consoles-jeux-video','electronics.gaming'),
    ('maison-deco','home_garden'),
    ('mobilier','home_garden.furniture'),
    ('electromenager','home_garden.appliances'),
    ('bricolage-jardin','home_garden.diy_garden'),
    ('mode','fashion'),
    ('mode-beaute','fashion'),
    ('mode-accessoires','fashion'),
    ('vetements-femme','fashion.women'),
    ('vetements-homme','fashion.men'),
    ('loisirs-sport','leisure_culture'),
    ('instruments-musique','leisure_culture.instruments'),
    ('sports','sports_outdoors'),
    ('sports-loisirs','sports_outdoors'),
    ('sports-hobbies','sports_outdoors'),
    ('poussettes-siege-auto','baby_kids.strollers'),
    ('materiel-pro','professional_btp'),
    ('materiel-professionnel-btp','professional_btp'),
    ('outillage-btp','professional_btp.machinery'),
    ('emploi','jobs'),
    ('offres-emploi','jobs.offers'),
    ('animaux','pets'),
    ('cours-formations','services.tutoring')
)
INSERT INTO public.taxonomy_aliases (alias, canonical_node_id, alias_kind, redirect_path)
SELECT a.alias, a.canonical_node_id, 'slug', '/categorie/' || c.slug
FROM legacy_aliases a
JOIN public.categories c ON c.id = a.canonical_node_id
ON CONFLICT (alias) DO UPDATE SET
    canonical_node_id = EXCLUDED.canonical_node_id,
    alias_kind = EXCLUDED.alias_kind,
    redirect_path = EXCLUDED.redirect_path,
    status = 'active';

UPDATE public.listings l
SET category_id = m.canonical_node_id,
    taxonomy_version_id = (SELECT id FROM public.taxonomy_versions WHERE version_number = 3),
    attributes_schema_version = GREATEST(attributes_schema_version, 2),
    updated_at = NOW()
FROM public.taxonomy_merge_mappings m
WHERE l.category_id = m.source_node_id;

UPDATE public.saved_searches s
SET category_id = m.canonical_node_id
FROM public.taxonomy_merge_mappings m
WHERE s.category_id = m.source_node_id;

UPDATE public.category_attributes a
SET category_id = m.canonical_node_id
FROM public.taxonomy_merge_mappings m
WHERE a.category_id = m.source_node_id;

UPDATE public.marketplace_activity_events e
SET category_id = m.canonical_node_id
FROM public.taxonomy_merge_mappings m
WHERE e.category_id = m.source_node_id;

UPDATE public.trending_topics t
SET category_id = m.canonical_node_id
FROM public.taxonomy_merge_mappings m
WHERE t.category_id = m.source_node_id;

UPDATE public.categories legacy
SET status = 'deprecated',
    schema_status = 'deprecated',
    is_active = FALSE,
    publishable = FALSE,
    replaced_by_id = mappings.canonical_node_id,
    updated_at = NOW()
FROM public.taxonomy_merge_mappings mappings
WHERE legacy.id = mappings.source_node_id;

INSERT INTO public.taxonomy_attributes (
    id, code, label, labels, data_type, unit, field_role, privacy,
    is_required, is_filterable, is_searchable, is_sortable, is_comparable,
    options, validation, publication_group, display_order
)
SELECT DISTINCT ON (COALESCE(NULLIF(ca.code, ''), ca.name))
    COALESCE(NULLIF(ca.attribute_id, ''), ca.name),
    COALESCE(NULLIF(ca.code, ''), ca.name),
    ca.label,
    CASE WHEN ca.labels = '{}'::jsonb THEN jsonb_build_object('fr-FR', ca.label) ELSE ca.labels END,
    COALESCE(NULLIF(ca.data_type, ''), ca.type),
    ca.unit,
    CASE WHEN ca.is_required THEN 'required' ELSE ca.field_role END,
    ca.privacy,
    ca.is_required,
    ca.is_filterable,
    ca.is_searchable,
    ca.is_sortable,
    ca.is_comparable,
    COALESCE(ca.options, '[]'::jsonb),
    ca.validation,
    ca.publication_group,
    ca.sort_order
FROM public.category_attributes ca
ORDER BY COALESCE(NULLIF(ca.code, ''), ca.name), ca.sort_order
ON CONFLICT (code) DO UPDATE SET
    label = EXCLUDED.label,
    labels = EXCLUDED.labels,
    data_type = EXCLUDED.data_type,
    unit = EXCLUDED.unit,
    field_role = EXCLUDED.field_role,
    privacy = EXCLUDED.privacy,
    is_required = EXCLUDED.is_required,
    is_filterable = EXCLUDED.is_filterable,
    is_searchable = EXCLUDED.is_searchable,
    is_sortable = EXCLUDED.is_sortable,
    is_comparable = EXCLUDED.is_comparable,
    options = EXCLUDED.options,
    validation = EXCLUDED.validation,
    publication_group = EXCLUDED.publication_group,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

INSERT INTO public.taxonomy_node_attributes (node_id, attribute_id, display_order)
SELECT DISTINCT ca.category_id, ta.id, ca.sort_order
FROM public.category_attributes ca
JOIN public.taxonomy_attributes ta ON ta.code = COALESCE(NULLIF(ca.code, ''), ca.name)
ON CONFLICT (node_id, attribute_id) DO UPDATE
SET display_order = EXCLUDED.display_order;

CREATE INDEX IF NOT EXISTS categories_active_hierarchy_idx
    ON public.categories (parent_id, sort_order, id)
    WHERE status = 'active';
CREATE INDEX IF NOT EXISTS categories_publishable_marketplace_idx
    ON public.categories (listing_family, sort_order, id)
    WHERE status = 'active' AND publishable = TRUE;
CREATE INDEX IF NOT EXISTS taxonomy_aliases_canonical_idx
    ON public.taxonomy_aliases (canonical_node_id, status);

ALTER TABLE public.taxonomy_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_merge_mappings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'taxonomy_aliases'
          AND policyname = 'Active taxonomy aliases are publicly readable'
    ) THEN
        CREATE POLICY "Active taxonomy aliases are publicly readable"
            ON public.taxonomy_aliases FOR SELECT
            USING (status = 'active' OR public.is_admin());
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'taxonomy_aliases'
          AND policyname = 'Taxonomy aliases are manageable by admins'
    ) THEN
        CREATE POLICY "Taxonomy aliases are manageable by admins"
            ON public.taxonomy_aliases FOR ALL
            USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'taxonomy_merge_mappings'
          AND policyname = 'Taxonomy merge reports are readable by admins'
    ) THEN
        CREATE POLICY "Taxonomy merge reports are readable by admins"
            ON public.taxonomy_merge_mappings FOR SELECT
            USING (public.is_admin());
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'taxonomy_merge_mappings'
          AND policyname = 'Taxonomy merge reports are manageable by admins'
    ) THEN
        CREATE POLICY "Taxonomy merge reports are manageable by admins"
            ON public.taxonomy_merge_mappings FOR ALL
            USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.resolve_taxonomy_alias(input_alias TEXT)
RETURNS TABLE (canonical_node_id VARCHAR, redirect_path TEXT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT a.canonical_node_id, a.redirect_path
    FROM public.taxonomy_aliases a
    WHERE a.alias = LOWER(TRIM(input_alias))
      AND a.status = 'active'
    LIMIT 1;
$$;

COMMENT ON TABLE public.taxonomy_aliases IS 'Legacy ids, slugs and localized aliases resolving to one canonical taxonomy identity.';
COMMENT ON TABLE public.taxonomy_merge_mappings IS 'Auditable dry-run counts and source-to-canonical mappings; source rows are deprecated rather than deleted.';
