-- Canonical, deterministic catalogue seed for Shongre Cours.
-- Phase 2 flags stay false until market-specific legal/provider validation.

INSERT INTO public.course_market_configs (
  market_code, schema_version, is_enabled, locale, currency, timezone,
  minimum_meaningful_review_count, minor_age_threshold,
  learner_request_validity_days, lead_validity_hours, default_lead_credit_cost,
  commission_rate_bps, cancellation_window_hours,
  learner_requests_enabled, qualified_leads_enabled,
  booking_enabled, payments_enabled, payouts_enabled, packages_enabled,
  recurring_lessons_enabled, tax_eligibility_wording, safety_guidance,
  config_payload
)
VALUES (
  'FR', 1, TRUE, 'fr-FR', 'EUR', 'Europe/Paris', 5, 18, 14, 72, 1,
  1200, 24, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE,
  'L’éligibilité éventuelle aux services à la personne dépend du statut vérifié du prestataire et des règles applicables au moment de la prestation.',
  '["Pour un mineur, un responsable légal reste l’interlocuteur du professeur.","Pour un premier cours en présentiel, privilégiez un lieu connu et informez un proche.","Conservez les échanges dans la messagerie Shongre et ne partagez pas de données sensibles."]'::jsonb,
  jsonb_build_object(
    'vertical', 'tutoring', 'schemaVersion', 1, 'marketCode', 'FR',
    'locale', 'fr-FR', 'currency', 'EUR', 'timezone', 'Europe/Paris',
    'isEnabled', TRUE, 'minimumMeaningfulReviewCount', 5,
    'minorAgeThreshold', 18, 'learnerRequestValidityDays', 14,
    'leadValidityHours', 72, 'defaultLeadCreditCost', 1,
    'commissionRateBps', 1200, 'cancellationWindowHours', 24,
    'featureFlags', jsonb_build_object(
      'learnerRequestsEnabled', TRUE, 'qualifiedLeadsEnabled', TRUE,
      'bookingEnabled', FALSE, 'paymentsEnabled', FALSE,
      'payoutsEnabled', FALSE, 'packagesEnabled', FALSE,
      'recurringLessonsEnabled', FALSE
    ),
    'taxEligibilityWording', 'L’éligibilité éventuelle aux services à la personne dépend du statut vérifié du prestataire et des règles applicables au moment de la prestation.',
    'safetyGuidance', '["Pour un mineur, un responsable légal reste l’interlocuteur du professeur.","Pour un premier cours en présentiel, privilégiez un lieu connu et informez un proche.","Conservez les échanges dans la messagerie Shongre et ne partagez pas de données sensibles."]'::jsonb,
    'updatedAt', '2026-08-22T10:00:00.000Z'
  )
)
ON CONFLICT (market_code) DO UPDATE SET
  config_payload = EXCLUDED.config_payload,
  is_enabled = EXCLUDED.is_enabled,
  updated_at = NOW();

WITH levels(id, label, sort_order) AS (
  VALUES
    ('primary', 'Primaire', 10),
    ('middle_school', 'Collège', 20),
    ('high_school', 'Lycée', 30),
    ('higher_education', 'Études supérieures', 40),
    ('adult', 'Adulte / Professionnel', 50)
)
INSERT INTO public.course_subject_levels (id, market_code, label, sort_order, is_active, public_payload)
SELECT id, 'FR', label, sort_order, TRUE,
  jsonb_build_object('id', id, 'label', label, 'sortOrder', sort_order, 'isActive', TRUE)
FROM levels
ON CONFLICT (id, market_code) DO UPDATE SET
  label = EXCLUDED.label, sort_order = EXCLUDED.sort_order,
  public_payload = EXCLUDED.public_payload, updated_at = NOW();

WITH subjects(id, slug, label, sort_order) AS (
  VALUES
    ('subject_primary_support', 'primary-support', 'Soutien scolaire primaire', 10),
    ('subject_secondary_support', 'secondary-support', 'Soutien scolaire secondaire', 20),
    ('subject_mathematics', 'mathematics', 'Mathématiques', 30),
    ('subject_physics_chemistry', 'physics-chemistry', 'Physique et chimie', 40),
    ('subject_languages', 'languages', 'Langues', 50),
    ('subject_french', 'french', 'Français', 60),
    ('subject_computer_science', 'computer-science', 'Informatique et programmation', 70),
    ('subject_data_ai', 'data-ai', 'Data et intelligence artificielle', 80),
    ('subject_music', 'music', 'Musique', 90),
    ('subject_arts', 'arts', 'Arts', 100),
    ('subject_exam_preparation', 'exam-preparation', 'Préparation aux examens', 110),
    ('subject_higher_education', 'higher-education', 'Études supérieures', 120),
    ('subject_professional_skills', 'professional-skills', 'Compétences professionnelles', 130),
    ('subject_sports_coaching', 'sports-coaching', 'Sport et coaching', 140),
    ('subject_other', 'other', 'Autres matières', 150)
)
INSERT INTO public.course_subjects (
  id, market_code, slug, label, sort_order, is_active, required_fields, public_payload
)
SELECT id, 'FR', slug, label, sort_order, TRUE,
  '["title","description","levels","deliveryModes","pricing","availability"]'::jsonb,
  jsonb_build_object(
    'id', id, 'slug', slug, 'marketCode', 'FR', 'label', label,
    'levelIds', '["primary","middle_school","high_school","higher_education","adult"]'::jsonb,
    'sortOrder', sort_order, 'isActive', TRUE
  )
FROM subjects
ON CONFLICT (id, market_code) DO UPDATE SET
  slug = EXCLUDED.slug, label = EXCLUDED.label, sort_order = EXCLUDED.sort_order,
  public_payload = EXCLUDED.public_payload, updated_at = NOW();

INSERT INTO public.course_subject_allowed_levels (subject_id, level_id, market_code)
SELECT subject.id, level.id, 'FR'
FROM public.course_subjects subject
CROSS JOIN public.course_subject_levels level
WHERE subject.market_code = 'FR' AND level.market_code = 'FR'
ON CONFLICT DO NOTHING;

WITH entitlement_sets(id, entitlements) AS (
  VALUES
    ('tutor_free', '{"maxActiveOffers":1,"maxMonthlyLeads":5,"teamMembers":1,"locations":1,"visibilityCreditsMonthly":0,"featuredProfile":false,"priorityPlacement":false,"advancedAvailability":false,"detailedAnalytics":false,"profileMedia":false,"introVideo":false,"leadManagement":false,"bookingTools":false,"recurringPackages":false,"bulkCourseManagement":false,"centralLeadInbox":false}'::jsonb),
    ('tutor_pro', '{"maxActiveOffers":8,"maxMonthlyLeads":30,"teamMembers":1,"locations":1,"visibilityCreditsMonthly":5,"featuredProfile":true,"priorityPlacement":false,"advancedAvailability":true,"detailedAnalytics":true,"profileMedia":true,"introVideo":true,"leadManagement":true,"bookingTools":false,"recurringPackages":false,"bulkCourseManagement":false,"centralLeadInbox":false}'::jsonb),
    ('tutor_premium', '{"maxActiveOffers":20,"maxMonthlyLeads":80,"teamMembers":1,"locations":1,"visibilityCreditsMonthly":15,"featuredProfile":true,"priorityPlacement":true,"advancedAvailability":true,"detailedAnalytics":true,"profileMedia":true,"introVideo":true,"leadManagement":true,"bookingTools":true,"recurringPackages":true,"bulkCourseManagement":false,"centralLeadInbox":false}'::jsonb),
    ('school_organization', '{"maxActiveOffers":250,"maxMonthlyLeads":500,"teamMembers":25,"locations":10,"visibilityCreditsMonthly":30,"featuredProfile":false,"priorityPlacement":false,"advancedAvailability":true,"detailedAnalytics":true,"profileMedia":true,"introVideo":true,"leadManagement":true,"bookingTools":true,"recurringPackages":true,"bulkCourseManagement":true,"centralLeadInbox":true}'::jsonb)
), plans(id, name, audience, description, monthly, annual, recommended, sort_order) AS (
  VALUES
    ('tutor_free', 'Professeur Gratuit', 'individual', 'Un profil public, un cours actif et les outils essentiels pour démarrer.', NULL::bigint, NULL::bigint, FALSE, 10),
    ('tutor_pro', 'Professeur Pro', 'individual', 'Plus de cours, un calendrier avancé et des outils de suivi des demandes.', 1990::bigint, 19900::bigint, TRUE, 20),
    ('tutor_premium', 'Professeur Premium', 'individual', 'Capacité renforcée, priorité encadrée et outils de fidélisation.', 3990::bigint, 39900::bigint, FALSE, 30),
    ('school_organization', 'École ou organisme', 'organization', 'Équipe, lieux, cours et demandes centralisés avec facturation unique.', 9900::bigint, 99000::bigint, FALSE, 40)
)
INSERT INTO public.course_plans (
  id, market_code, name, audience, monthly_price_minor, annual_price_minor,
  currency, tax_rate_bps, entitlements, is_active, is_recommended, sort_order,
  public_payload
)
SELECT p.id, 'FR', p.name, p.audience, p.monthly, p.annual, 'EUR', 2000,
  e.entitlements, TRUE, p.recommended, p.sort_order,
  jsonb_strip_nulls(jsonb_build_object(
    'id', p.id, 'marketCode', 'FR', 'name', p.name, 'audience', p.audience,
    'description', p.description,
    'monthlyPrice', CASE WHEN p.monthly IS NULL THEN NULL ELSE jsonb_build_object('amountMinor', p.monthly, 'currency', 'EUR') END,
    'annualPrice', CASE WHEN p.annual IS NULL THEN NULL ELSE jsonb_build_object('amountMinor', p.annual, 'currency', 'EUR') END,
    'taxRateBps', 2000, 'isActive', TRUE, 'isRecommended', p.recommended,
    'entitlements', e.entitlements
  ))
FROM plans p JOIN entitlement_sets e USING (id)
ON CONFLICT (id, market_code) DO UPDATE SET
  name = EXCLUDED.name, monthly_price_minor = EXCLUDED.monthly_price_minor,
  annual_price_minor = EXCLUDED.annual_price_minor,
  entitlements = EXCLUDED.entitlements, public_payload = EXCLUDED.public_payload,
  updated_at = NOW();

WITH add_ons(id, type, name, price_minor, validity_days, credit_quantity, sort_order) AS (
  VALUES
    ('addon_featured_subject', 'featured_subject', 'Mise en avant matière', 990::bigint, 7, NULL::int, 10),
    ('addon_local_spotlight', 'local_spotlight', 'Visibilité locale', 790::bigint, 7, NULL::int, 20),
    ('addon_search_bump', 'search_bump', 'Remonter le profil', 390::bigint, 1, NULL::int, 30),
    ('addon_qualified_lead', 'qualified_lead', 'Crédit demande qualifiée', 250::bigint, NULL::int, 1, 40),
    ('addon_verification', 'profile_verification', 'Vérification de justificatif', 1200::bigint, NULL::int, NULL::int, 50),
    ('addon_promotional_credits', 'promotional_credits', 'Crédits promotionnels', 1500::bigint, 90, 10, 60)
)
INSERT INTO public.course_add_ons (
  id, market_code, type, name, price_minor, currency, validity_days,
  credit_quantity, is_active, sort_order, public_payload
)
SELECT id, 'FR', type, name, price_minor, 'EUR', validity_days, credit_quantity,
  TRUE, sort_order,
  jsonb_strip_nulls(jsonb_build_object(
    'id', id, 'marketCode', 'FR', 'type', type, 'name', name,
    'price', jsonb_build_object('amountMinor', price_minor, 'currency', 'EUR'),
    'validityDays', validity_days, 'creditQuantity', credit_quantity,
    'isActive', TRUE
  ))
FROM add_ons
ON CONFLICT (id, market_code) DO UPDATE SET
  price_minor = EXCLUDED.price_minor, validity_days = EXCLUDED.validity_days,
  credit_quantity = EXCLUDED.credit_quantity,
  public_payload = EXCLUDED.public_payload, updated_at = NOW();

INSERT INTO public.course_qualification_types (
  id, market_code, label, evidence_requirements, validity_days, is_active
)
VALUES
  ('degree', 'FR', 'Diplôme', '{"acceptedMimeTypes":["application/pdf","image/jpeg","image/png"],"private":true}'::jsonb, NULL, TRUE),
  ('certification', 'FR', 'Certification', '{"acceptedMimeTypes":["application/pdf","image/jpeg","image/png"],"private":true}'::jsonb, NULL, TRUE),
  ('employment', 'FR', 'Attestation d’emploi', '{"acceptedMimeTypes":["application/pdf"],"private":true}'::jsonb, 365, TRUE),
  ('identity', 'FR', 'Identité', '{"providerManaged":true,"private":true}'::jsonb, NULL, TRUE),
  ('criminal_record', 'FR', 'Extrait de casier judiciaire', '{"providerManaged":true,"private":true}'::jsonb, 180, TRUE),
  ('professional_status', 'FR', 'Statut professionnel', '{"acceptedMimeTypes":["application/pdf"],"private":true}'::jsonb, 365, TRUE),
  ('other', 'FR', 'Autre justificatif', '{"acceptedMimeTypes":["application/pdf","image/jpeg","image/png"],"private":true}'::jsonb, NULL, TRUE)
ON CONFLICT (id, market_code) DO UPDATE SET
  label = EXCLUDED.label, evidence_requirements = EXCLUDED.evidence_requirements,
  validity_days = EXCLUDED.validity_days, is_active = EXCLUDED.is_active;
