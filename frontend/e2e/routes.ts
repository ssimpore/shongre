import { PersonaName } from "./personas";

export interface RouteUnderTest {
  path: string;
  name: string;
  persona: PersonaName;
  /** Set when the route needs a beat longer than `domcontentloaded` to settle. */
  settleMs?: number;
}

/**
 * `list-117` is a seeded demo listing. A numeric id such as `/annonce/1` renders
 * the not-found page, which quietly turns a listing-detail assertion into a
 * 404-page assertion — so the fixture id is pinned here on purpose.
 */
export const DEMO_LISTING_ID = "list-117";

export const PUBLIC_ROUTES: RouteUnderTest[] = [
  { path: "/", name: "homepage", persona: "guest" },
  { path: "/recherche", name: "search", persona: "guest" },
  {
    path: "/recherche?query=velo",
    name: "search-with-query",
    persona: "guest",
  },
  {
    path: `/annonce/${DEMO_LISTING_ID}`,
    name: "listing-detail",
    persona: "guest",
  },
  { path: "/collections", name: "collections", persona: "guest" },
  {
    path: "/collections/pepites-semaine",
    name: "collection-detail",
    persona: "guest",
  },
  {
    path: "/collections/selection-inconnue",
    name: "collection-not-found",
    persona: "guest",
  },
  {
    path: "/boutique/atelier-nordique",
    name: "pro-storefront",
    persona: "guest",
  },
  { path: "/profil/camille-martin", name: "seller-profile", persona: "guest" },
  { path: "/professionnels", name: "pro-directory", persona: "guest" },
  { path: "/solutions-pro", name: "pro-plans", persona: "guest" },
  { path: "/solutions", name: "solutions-catalog", persona: "guest" },
  { path: "/facturation", name: "facturation-product", persona: "guest" },
  {
    path: "/solutions/facturation",
    name: "solutions-facturation-detail",
    persona: "guest",
  },
  { path: "/emploi", name: "employment-search", persona: "guest" },
  {
    path: "/emploi/metier/frontend_engineer",
    name: "employment-profession-landing",
    persona: "guest",
  },
  {
    path: "/emploi/secteur/technology",
    name: "employment-sector-landing",
    persona: "guest",
  },
  {
    path: "/emploi/lieu/lyon",
    name: "employment-location-landing",
    persona: "guest",
  },
  {
    path: "/emploi/offre/developpeur-se-front-end-react-job-react-lyon",
    name: "employment-job-detail",
    persona: "guest",
  },
  { path: "/offres-prix-reduit", name: "deals", persona: "guest" },
  {
    path: "/bons-plans",
    name: "deals-legacy-redirect",
    persona: "guest",
  },
  {
    path: "/collections/bons-plans",
    name: "discount-collection-legacy-redirect",
    persona: "guest",
  },
  {
    path: "/categorie/dons-solidarite-bons-plans",
    name: "donation-category-legacy-redirect",
    persona: "guest",
  },
  {
    path: "/categorie/jet-skis-and-scooters-des-mers",
    name: "personal-watercraft-category-legacy-redirect",
    persona: "guest",
  },
  { path: "/connexion", name: "login", persona: "guest" },
  { path: "/inscription", name: "register-choice", persona: "guest" },
  { path: "/aide", name: "help-center", persona: "guest" },
  { path: "/contact", name: "contact", persona: "guest" },
  { path: "/newsletter", name: "newsletter", persona: "guest" },
  { path: "/une-page-qui-nexiste-pas", name: "not-found", persona: "guest" },
  { path: "/categories", name: "categories", persona: "guest" },
  {
    path: "/categorie/vehicules",
    name: "category-landing",
    persona: "guest",
  },
  { path: "/auto", name: "auto-search", persona: "guest" },
  {
    path: "/auto/vehicule/peugeot-3008-bluehdi-130-allure-2019",
    name: "auto-vehicle-detail",
    persona: "guest",
  },
  { path: "/auto/comparer", name: "auto-compare", persona: "guest" },
  { path: "/immo", name: "immo-search", persona: "guest" },
  {
    path: "/immo/bien/appartement-lumineux-lyon-montchat",
    name: "immo-property-detail",
    persona: "guest",
  },
  { path: "/education", name: "courses-search", persona: "guest" },
  {
    path: "/education/professeur/thomas-bernard-mathematiques",
    name: "course-teacher-detail",
    persona: "guest",
  },
  {
    path: "/education/demande",
    name: "course-request",
    persona: "guest",
  },
  // `/cours` is the pre-rename education path. It must keep resolving to a
  // rendered page rather than a blank redirect frame.
  { path: "/cours", name: "legacy-education-redirect", persona: "guest" },
  { path: "/tarifs", name: "pro-pricing", persona: "guest" },
  { path: "/publier", name: "publish-entry", persona: "guest" },
  { path: "/prospects", name: "prospects-product", persona: "guest" },
  {
    path: "/solutions/prospects",
    name: "solutions-prospects-detail",
    persona: "guest",
  },
  {
    path: "/solutions/marketplace",
    name: "solutions-marketplace-detail",
    persona: "guest",
  },
  // The three seller-profile aliases render the same page; each is linked from
  // a different surface, so each has to stay routable.
  {
    path: "/u/camille-martin",
    name: "seller-profile-u-alias",
    persona: "guest",
  },
  {
    path: "/vendeur/camille-martin",
    name: "seller-profile-vendeur-alias",
    persona: "guest",
  },
  {
    path: "/inscription/particulier",
    name: "register-individual",
    persona: "guest",
  },
  {
    path: "/inscription/professionnel",
    name: "register-pro",
    persona: "guest",
  },
  {
    path: "/mot-de-passe-oublie",
    name: "forgot-password",
    persona: "guest",
  },
  {
    path: "/reinitialisation-mot-de-passe",
    name: "reset-password",
    persona: "guest",
  },
  { path: "/verification-email", name: "verify-email", persona: "guest" },
  {
    path: "/newsletter/confirmer",
    name: "newsletter-confirm",
    persona: "guest",
  },
  {
    path: "/newsletter/desabonnement",
    name: "newsletter-unsubscribe",
    persona: "guest",
  },
  {
    path: "/newsletter/preferences",
    name: "newsletter-preferences",
    persona: "guest",
  },
  {
    path: "/conditions-utilisation",
    name: "legal-terms",
    persona: "guest",
  },
  { path: "/confidentialite", name: "legal-privacy", persona: "guest" },
  { path: "/cookies", name: "legal-cookies", persona: "guest" },
  { path: "/mentions-legales", name: "legal-notices", persona: "guest" },
  { path: "/accessibilite", name: "legal-accessibility", persona: "guest" },
  { path: "/securite", name: "help-safety", persona: "guest" },
  { path: "/support", name: "help-center-alias", persona: "guest" },
  { path: "/terms", name: "legal-terms-en-alias", persona: "guest" },
  { path: "/privacy", name: "legal-privacy-en-alias", persona: "guest" },
];

export const BUYER_ROUTES: RouteUnderTest[] = [
  {
    path: "/compte/finances",
    name: "account-finance",
    persona: "individual_buyer",
  },
  { path: "/compte/favoris", name: "favorites", persona: "individual_buyer" },
  { path: "/compte/messages", name: "messaging", persona: "individual_buyer" },
  { path: "/compte/achats", name: "transactions", persona: "individual_buyer" },
  {
    path: "/compte/notifications",
    name: "notifications",
    persona: "individual_buyer",
  },
  {
    path: "/compte/notifications/preferences",
    name: "notification-preferences",
    persona: "individual_buyer",
  },
  {
    path: "/compte/recours",
    name: "moderation-appeals",
    persona: "individual_buyer",
  },
  {
    path: "/compte/recherches",
    name: "saved-searches",
    persona: "individual_buyer",
  },
  {
    path: "/compte/profil",
    name: "account-overview",
    persona: "individual_buyer",
  },
  {
    path: "/compte/emploi",
    name: "employment-candidate-workspace",
    persona: "individual_buyer",
  },
  {
    path: "/emploi/offre/equipier-ere-polyvalent-e-saisonnier-job-seasonal-nice/postuler",
    name: "employment-apply",
    persona: "individual_buyer",
  },
  { path: "/compte", name: "account-index", persona: "individual_buyer" },
  {
    path: "/compte/type-de-compte",
    name: "account-type",
    persona: "individual_buyer",
  },
  {
    path: "/compte/securite-compte",
    name: "account-security",
    persona: "individual_buyer",
  },
  {
    path: "/compte/newsletter",
    name: "account-newsletter",
    persona: "individual_buyer",
  },
  {
    path: "/compte/education",
    name: "account-education",
    persona: "individual_buyer",
  },
  {
    path: "/messages",
    name: "messaging-standalone",
    persona: "individual_buyer",
  },
  {
    path: "/account/delete",
    name: "account-deletion",
    persona: "individual_buyer",
  },
  // No demo fixture creates a support case, so this id exercises the
  // not-found state of the detail route rather than a populated one.
  {
    path: "/compte/support/support-case-absent",
    name: "support-request-detail-missing",
    persona: "individual_buyer",
  },
];

export const SELLER_ROUTES: RouteUnderTest[] = [
  { path: "/deposer", name: "publish-wizard", persona: "individual_seller" },
  {
    path: "/compte/annonces",
    name: "my-listings",
    persona: "individual_seller",
  },
  {
    path: "/compte/verification",
    name: "verification-center",
    persona: "individual_seller",
  },
  {
    path: "/compte/support",
    name: "support-requests",
    persona: "individual_seller",
  },
  {
    path: "/deposer/emploi",
    name: "employment-publish",
    persona: "individual_seller",
  },
  {
    path: "/deposer/auto",
    name: "auto-publish",
    persona: "individual_seller",
  },
  {
    path: "/deposer/immo",
    name: "immo-publish",
    persona: "individual_seller",
  },
  {
    path: "/deposer/education",
    name: "course-publish",
    persona: "individual_seller",
  },
  {
    path: "/compte/cours",
    name: "account-legacy-education-redirect",
    persona: "individual_seller",
  },
  {
    path: "/deposer/cours",
    name: "publish-legacy-education-redirect",
    persona: "individual_seller",
  },
];

export const PRO_ROUTES: RouteUnderTest[] = [
  {
    path: "/facturation/activation",
    name: "facturation-activation",
    persona: "pro_immo",
  },
  {
    path: "/facturation/onboarding",
    name: "facturation-onboarding",
    persona: "standalone_facturation",
  },
  {
    path: "/facturation/app",
    name: "facturation-workspace",
    persona: "standalone_facturation",
  },
  {
    path: "/compte/pro/finances",
    name: "pro-organization-finance",
    persona: "pro_seller",
  },
  {
    path: "/compte/pro/tableau-de-bord",
    name: "pro-dashboard",
    persona: "pro_seller",
  },
  {
    path: "/compte/pro/vitrine",
    name: "pro-storefront-editor",
    persona: "pro_seller",
  },
  {
    path: "/compte/pro/abonnements",
    name: "pro-subscription",
    persona: "pro_seller",
  },
  {
    path: "/compte/emploi/recruteur",
    name: "employment-recruiter-workspace",
    persona: "pro_employment",
  },
  {
    path: "/compte/immo",
    name: "immo-agency-workspace",
    persona: "pro_immo",
  },
  {
    path: "/compte/auto",
    name: "auto-dealer-workspace",
    persona: "pro_auto",
  },
  {
    path: "/compte/education/organisation",
    name: "course-organization-workspace",
    persona: "pro_courses",
  },
  {
    path: "/compte/pro/prospects",
    name: "pro-prospects",
    persona: "pro_seller",
  },
  {
    path: "/prospects/app",
    name: "prospects-standalone-workspace",
    persona: "standalone_prospects",
  },
  { path: "/app", name: "crm-app-overview", persona: "standalone_prospects" },
  {
    path: "/app/discover",
    name: "crm-app-discover",
    persona: "standalone_prospects",
  },
  {
    path: "/app/companies",
    name: "crm-app-companies",
    persona: "standalone_prospects",
  },
  {
    path: "/app/companies/20000000-0000-4000-8000-000000000001",
    name: "crm-app-company-detail",
    persona: "standalone_prospects",
  },
  {
    path: "/app/contacts",
    name: "crm-app-contacts",
    persona: "standalone_prospects",
  },
  {
    path: "/app/contacts/30000000-0000-4000-8000-000000000001",
    name: "crm-app-contact-detail",
    persona: "standalone_prospects",
  },
  {
    path: "/app/lists",
    name: "crm-app-lists",
    persona: "standalone_prospects",
  },
  {
    path: "/app/pipeline",
    name: "crm-app-pipeline",
    persona: "standalone_prospects",
  },
  {
    path: "/app/opportunities/40000000-0000-4000-8000-000000000003",
    name: "crm-app-opportunity-detail",
    persona: "standalone_prospects",
  },
  {
    path: "/app/tasks",
    name: "crm-app-tasks",
    persona: "standalone_prospects",
  },
  {
    path: "/app/activities",
    name: "crm-app-activities",
    persona: "standalone_prospects",
  },
  {
    path: "/app/campaigns",
    name: "crm-app-campaigns",
    persona: "standalone_prospects",
  },
  {
    path: "/app/analytics",
    name: "crm-app-analytics",
    persona: "standalone_prospects",
  },
  {
    path: "/app/sources",
    name: "crm-app-sources",
    persona: "standalone_prospects",
  },
  {
    path: "/app/team",
    name: "crm-app-team",
    persona: "standalone_prospects",
  },
  {
    path: "/app/billing",
    name: "crm-app-billing",
    persona: "standalone_prospects",
  },
  {
    path: "/app/settings",
    name: "crm-app-settings",
    persona: "standalone_prospects",
  },
];

export const ADMIN_ROUTES: RouteUnderTest[] = [
  { path: "/admin/finance", name: "platform-finance", persona: "finance" },
  { path: "/admin", name: "admin-overview", persona: "admin" },
  { path: "/admin/support", name: "admin-support", persona: "support" },
  {
    path: "/admin/fonctionnalites",
    name: "admin-feature-flags",
    persona: "admin",
  },
  { path: "/admin/solutions", name: "admin-solutions", persona: "admin" },
  { path: "/securite-interne", name: "staff-mfa", persona: "admin" },
  { path: "/admin/moderation", name: "admin-moderation", persona: "moderator" },
  { path: "/admin/utilisateurs", name: "admin-users", persona: "admin" },
  {
    path: "/admin/verifications",
    name: "admin-verifications",
    persona: "trust_safety",
  },
  { path: "/admin/marches", name: "admin-markets", persona: "admin" },
  { path: "/admin/taxonomie", name: "admin-taxonomy", persona: "admin" },
  { path: "/admin/monetisation", name: "admin-monetization", persona: "admin" },
  { path: "/admin/fournisseurs", name: "admin-providers", persona: "admin" },
  { path: "/admin/roles", name: "admin-roles", persona: "admin" },
  { path: "/admin/audit", name: "admin-audit", persona: "admin" },
  { path: "/admin/crm", name: "crm-overview", persona: "commercial" },
  {
    path: "/admin/crm/contacts",
    name: "crm-contacts",
    persona: "commercial",
  },
  {
    path: "/admin/crm/pipeline",
    name: "crm-pipeline",
    persona: "commercial",
  },
  { path: "/admin/emploi", name: "employment-admin", persona: "admin" },
  { path: "/admin/analytics", name: "admin-analytics", persona: "admin" },
  { path: "/admin/marketing", name: "admin-marketing", persona: "admin" },
  { path: "/admin/newsletter", name: "admin-newsletter", persona: "admin" },
  { path: "/admin/tendances", name: "admin-trends", persona: "admin" },
  { path: "/admin/education", name: "admin-education", persona: "admin" },
  { path: "/admin/auto", name: "admin-auto", persona: "admin" },
  { path: "/admin/immo", name: "admin-immo", persona: "admin" },
  // `/admin/taxonomy` is the English alias of `/admin/taxonomie`.
  {
    path: "/admin/taxonomy",
    name: "admin-taxonomy-alias",
    persona: "admin",
  },
  {
    path: "/admin/fournisseurs/stripe",
    name: "admin-provider-detail",
    persona: "admin",
  },
  {
    path: "/admin/crm/entreprises",
    name: "crm-companies",
    persona: "commercial",
  },
  {
    path: "/admin/crm/entreprises/20000000-0000-4000-8000-000000000001",
    name: "crm-company-detail",
    persona: "commercial",
  },
  {
    path: "/admin/crm/contacts/30000000-0000-4000-8000-000000000001",
    name: "crm-contact-detail",
    persona: "commercial",
  },
  {
    path: "/admin/crm/opportunites/40000000-0000-4000-8000-000000000003",
    name: "crm-opportunity-detail",
    persona: "commercial",
  },
  {
    path: "/admin/crm/prospection",
    name: "crm-ai-prospecting",
    persona: "commercial",
  },
  { path: "/admin/crm/taches", name: "crm-tasks", persona: "commercial" },
  { path: "/admin/crm/produits", name: "crm-products", persona: "commercial" },
  {
    path: "/admin/crm/automations",
    name: "crm-automations",
    persona: "commercial",
  },
  { path: "/admin/crm/rapports", name: "crm-reports", persona: "commercial" },
  {
    path: "/admin/crm/configuration",
    name: "crm-settings",
    persona: "commercial",
  },
  {
    path: "/admin/crm/configuration/pipelines",
    name: "crm-settings-pipelines",
    persona: "commercial",
  },
  {
    path: "/admin/crm/configuration/champs",
    name: "crm-settings-fields",
    persona: "commercial",
  },
  {
    path: "/admin/crm/configuration/providers",
    name: "crm-settings-providers",
    persona: "commercial",
  },
  {
    path: "/admin/crm/configuration/ai",
    name: "crm-settings-ai",
    persona: "commercial",
  },
  {
    path: "/admin/cours",
    name: "admin-legacy-education-redirect",
    persona: "admin",
  },
];

export const ALL_ROUTES: RouteUnderTest[] = [
  ...PUBLIC_ROUTES,
  ...BUYER_ROUTES,
  ...SELLER_ROUTES,
  ...PRO_ROUTES,
  ...ADMIN_ROUTES,
];
