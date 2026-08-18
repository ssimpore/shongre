import { PersonaName } from './personas';

export interface RouteUnderTest {
  path: string;
  name: string;
  persona: PersonaName;
  /** Set when the route needs a beat longer than `networkidle` to settle. */
  settleMs?: number;
}

/**
 * `list-117` is a seeded demo listing. A numeric id such as `/annonce/1` renders
 * the not-found page, which quietly turns a listing-detail assertion into a
 * 404-page assertion — so the fixture id is pinned here on purpose.
 */
export const DEMO_LISTING_ID = 'list-117';

export const PUBLIC_ROUTES: RouteUnderTest[] = [
  { path: '/', name: 'homepage', persona: 'guest' },
  { path: '/recherche', name: 'search', persona: 'guest' },
  { path: '/recherche?query=velo', name: 'search-with-query', persona: 'guest' },
  { path: `/annonce/${DEMO_LISTING_ID}`, name: 'listing-detail', persona: 'guest' },
  { path: '/boutique/atelier-nordique', name: 'pro-storefront', persona: 'guest' },
  { path: '/profil/camille-martin', name: 'seller-profile', persona: 'guest' },
  { path: '/professionnels', name: 'pro-directory', persona: 'guest' },
  { path: '/solutions-pro', name: 'pro-plans', persona: 'guest' },
  { path: '/bons-plans', name: 'deals', persona: 'guest' },
  { path: '/connexion', name: 'login', persona: 'guest' },
  { path: '/inscription', name: 'register-choice', persona: 'guest' },
  { path: '/aide', name: 'help-center', persona: 'guest' },
  { path: '/contact', name: 'contact', persona: 'guest' },
  { path: '/newsletter', name: 'newsletter', persona: 'guest' },
  { path: '/une-page-qui-nexiste-pas', name: 'not-found', persona: 'guest' },
];

export const BUYER_ROUTES: RouteUnderTest[] = [
  { path: '/compte/favoris', name: 'favorites', persona: 'individual_buyer' },
  { path: '/compte/messages', name: 'messaging', persona: 'individual_buyer' },
  { path: '/compte/achats', name: 'transactions', persona: 'individual_buyer' },
  { path: '/compte/notifications', name: 'notifications', persona: 'individual_buyer' },
  { path: '/compte/recherches', name: 'saved-searches', persona: 'individual_buyer' },
  { path: '/compte/profil', name: 'account-overview', persona: 'individual_buyer' },
];

export const SELLER_ROUTES: RouteUnderTest[] = [
  { path: '/deposer', name: 'publish-wizard', persona: 'individual_seller' },
  { path: '/compte/annonces', name: 'my-listings', persona: 'individual_seller' },
  { path: '/compte/verification', name: 'verification-center', persona: 'individual_seller' },
  { path: '/compte/support', name: 'support-requests', persona: 'individual_seller' },
];

export const PRO_ROUTES: RouteUnderTest[] = [
  { path: '/compte/pro/tableau-de-bord', name: 'pro-dashboard', persona: 'pro_seller' },
  { path: '/compte/pro/vitrine', name: 'pro-storefront-editor', persona: 'pro_seller' },
  { path: '/compte/pro/abonnements', name: 'pro-subscription', persona: 'pro_seller' },
];

export const ADMIN_ROUTES: RouteUnderTest[] = [
  { path: '/admin', name: 'admin-overview', persona: 'admin' },
  { path: '/admin/moderation', name: 'admin-moderation', persona: 'moderator' },
  { path: '/admin/utilisateurs', name: 'admin-users', persona: 'admin' },
  { path: '/admin/verifications', name: 'admin-verifications', persona: 'admin' },
  { path: '/admin/marches', name: 'admin-markets', persona: 'admin' },
  { path: '/admin/taxonomie', name: 'admin-taxonomy', persona: 'admin' },
  { path: '/admin/monetisation', name: 'admin-monetization', persona: 'admin' },
  { path: '/admin/fournisseurs', name: 'admin-providers', persona: 'admin' },
  { path: '/admin/roles', name: 'admin-roles', persona: 'admin' },
  { path: '/admin/audit', name: 'admin-audit', persona: 'admin' },
  { path: '/admin/crm', name: 'crm-overview', persona: 'admin' },
  { path: '/admin/crm/contacts', name: 'crm-contacts', persona: 'admin' },
  { path: '/admin/crm/pipeline', name: 'crm-pipeline', persona: 'admin' },
];

export const ALL_ROUTES: RouteUnderTest[] = [
  ...PUBLIC_ROUTES,
  ...BUYER_ROUTES,
  ...SELLER_ROUTES,
  ...PRO_ROUTES,
  ...ADMIN_ROUTES,
];
