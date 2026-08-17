-- ==============================================================================
-- SHONGRE INITIAL SEED DATA
-- Migration: 00004_seed_data.sql
-- ==============================================================================

-- 1. Markets
INSERT INTO public.markets (code, name, currency, currency_symbol, locale, is_active, is_base_market, protection_fee_rate, protection_fixed_fee, free_listings_limit)
VALUES
    ('FR', 'France', 'EUR', '€', 'fr-FR', TRUE, TRUE, 0.0400, 0.70, 10),
    ('BE', 'Belgique', 'EUR', '€', 'fr-BE', TRUE, FALSE, 0.0450, 0.80, 10),
    ('CH', 'Suisse', 'CHF', 'CHF', 'fr-CH', TRUE, FALSE, 0.0350, 1.00, 5),
    ('LU', 'Luxembourg', 'EUR', '€', 'fr-LU', TRUE, FALSE, 0.0400, 0.70, 10),
    ('DE', 'Allemagne', 'EUR', '€', 'de-DE', TRUE, FALSE, 0.0400, 0.70, 10),
    ('ES', 'Espagne', 'EUR', '€', 'es-ES', TRUE, FALSE, 0.0450, 0.70, 10)
ON CONFLICT (code) DO NOTHING;

-- 2. Subscription Plans
INSERT INTO public.subscription_plans (id, name, price_monthly, price_yearly, features, is_active)
VALUES
    ('starter', 'Pack Starter Pro', 19.90, 199.00, '["Jusqu''à 50 annonces simultanées", "Badge Vendeur Professionnel", "Support prioritaire 7j/7"]'::jsonb, TRUE),
    ('pro', 'Pack Performance Pro', 49.90, 499.00, '["Annonces illimitées", "Boutique personnalisée avec logo et bannière", "Statistiques avancées des vues et conversions", "5 boosts offerts par mois"]'::jsonb, TRUE),
    ('enterprise', 'Pack Entreprise Sur-Mesure', 99.90, 999.00, '["Gestion multi-comptes et équipes", "Accès API CRM et import de catalogue automatique", "Gestionnaire de compte dédié", "Visibilité maximale sur tous les marchés"]'::jsonb, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Core Categories
INSERT INTO public.categories (id, slug, name, short_label, parent_id, icon_name, sort_order, is_active, description)
VALUES
    ('vehicles', 'vehicles', 'Véhicules', 'Véhicules', NULL, 'Car', 1, TRUE, 'Voitures, motos, vélos, utilitaires et pièces auto'),
    ('cars', 'cars', 'Voitures d''occasion', 'Voitures', 'vehicles', 'Car', 1, TRUE, 'Berlines, SUV, citadines et hybrides'),
    ('motorcycles', 'motorcycles', 'Motos & Scooters', 'Motos', 'vehicles', 'Bike', 2, TRUE, 'Motos, scooters, quads et équipements'),
    ('bicycles', 'bicycles', 'Vélos & Mobilité douce', 'Vélos', 'vehicles', 'Bike', 3, TRUE, 'Vélos électriques, gravel, VTT et trottinettes'),

    ('real-estate', 'real-estate', 'Immobilier', 'Immobilier', NULL, 'Home', 2, TRUE, 'Ventes, locations, colocations et bureaux'),
    ('real-estate-sale', 'real-estate-sale', 'Ventes immobilières', 'Ventes', 'real-estate', 'Home', 1, TRUE, 'Appartements, maisons et terrains à vendre'),
    ('real-estate-rent', 'real-estate-rent', 'Locations', 'Locations', 'real-estate', 'Key', 2, TRUE, 'Appartements et maisons en location'),

    ('multimedia', 'multimedia', 'Multimédia & High-Tech', 'Multimédia', NULL, 'Smartphone', 3, TRUE, 'Smartphones, informatique, son et photo'),
    ('smartphones', 'smartphones', 'Smartphones & Téléphonie', 'Téléphonie', 'multimedia', 'Smartphone', 1, TRUE, 'iPhones, smartphones Android et accessoires'),
    ('computers', 'computers', 'Informatique & Ordinateurs', 'Informatique', 'multimedia', 'Laptop', 2, TRUE, 'PC portables, MacBooks, composants et écrans'),
    ('gaming', 'gaming', 'Consoles & Jeux vidéo', 'Gaming', 'multimedia', 'Gamepad2', 3, TRUE, 'PS5, Xbox, Nintendo Switch et jeux rétro'),

    ('home-garden', 'home-garden', 'Maison & Jardin', 'Maison', NULL, 'Armchair', 4, TRUE, 'Mobilier, décoration, électroménager et bricolage'),
    ('furniture', 'furniture', 'Meubles & Salon', 'Meubles', 'home-garden', 'Armchair', 1, TRUE, 'Canapés, tables, chaises et literie'),
    ('appliances', 'appliances', 'Électroménager', 'Électroménager', 'home-garden', 'Tv', 2, TRUE, 'Lave-linge, réfrigérateurs, robots cuisine'),

    ('fashion', 'fashion', 'Mode & Accessoires', 'Mode', NULL, 'Shirt', 5, TRUE, 'Vêtements homme, femme, enfants, maroquinerie et montres'),
    ('clothing-women', 'clothing-women', 'Vêtements Femme', 'Femme', 'fashion', 'Shirt', 1, TRUE, 'Robes, vestes, jeans et manteaux'),
    ('clothing-men', 'clothing-men', 'Vêtements Homme', 'Homme', 'fashion', 'Shirt', 2, TRUE, 'Costumes, chemises, vestes et streetwear'),
    ('luxury-watches', 'luxury-watches', 'Montres & Bijoux', 'Horlogerie', 'fashion', 'Watch', 3, TRUE, 'Montres automatiques, bijoux et pièces de collection'),

    ('leisure-sports', 'leisure-sports', 'Loisirs & Sport', 'Loisirs', NULL, 'Trophy', 6, TRUE, 'Matériel de sport, musique, livres et instruments'),
    ('musical-instruments', 'musical-instruments', 'Instruments de Musique', 'Musique', 'leisure-sports', 'Music', 1, TRUE, 'Guitares, pianos, synthétiseurs et amplis'),
    ('sport-equipment', 'sport-equipment', 'Équipements Sportifs', 'Sport', 'leisure-sports', 'Trophy', 2, TRUE, 'Musculation, ski, randonnée et sports nautiques'),

    ('professional', 'professional', 'Matériel Professionnel', 'Pro', NULL, 'Briefcase', 7, TRUE, 'Équipements industriels, outillage et commerce')
ON CONFLICT (id) DO NOTHING;

-- 4. Initial Demo Profiles
INSERT INTO public.profiles (
    id, slug, email, name, account_type, primary_role, status, avatar_url, city, postal_code, department, region, country, is_verified, is_identity_verified, is_phone_verified, is_email_verified, rating, review_count
) VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'thomas-laurent',
    'thomas.laurent@example.fr',
    'Thomas Laurent',
    'individual',
    'individual_buyer',
    'active',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    'Paris',
    '75011',
    '75 - Paris',
    'Île-de-France',
    'FR',
    TRUE, TRUE, TRUE, TRUE, 4.90, 14
),
(
    '00000000-0000-0000-0000-000000000002',
    'camille-martin',
    'camille.martin@example.fr',
    'Camille Martin',
    'individual',
    'individual_seller',
    'active',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    'Lyon',
    '69002',
    '69 - Rhône',
    'Auvergne-Rhône-Alpes',
    'FR',
    TRUE, TRUE, TRUE, TRUE, 4.95, 42
),
(
    '00000000-0000-0000-0000-000000000003',
    'lucas-bernard',
    'lucas.bernard@example.fr',
    'Lucas Bernard',
    'individual',
    'individual_seller',
    'active',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    'Rennes',
    '35000',
    '35 - Ille-et-Vilaine',
    'Bretagne',
    'FR',
    TRUE, TRUE, TRUE, TRUE, 5.00, 3
),
(
    '00000000-0000-0000-0000-000000000004',
    'admin-shongre',
    'admin@shongre.com',
    'Administrateur Shongre',
    'internal',
    'admin',
    'active',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    'Paris',
    '75008',
    '75 - Paris',
    'Île-de-France',
    'FR',
    TRUE, TRUE, TRUE, TRUE, 5.00, 0
)
ON CONFLICT (id) DO NOTHING;
