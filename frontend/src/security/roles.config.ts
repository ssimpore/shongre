import { PlatformRole, AccountType, Permission } from '../types';

export interface RoleMetadata {
  id: PlatformRole;
  title: string;
  shortLabel: string;
  accountType: AccountType;
  hierarchyLevel: number; // 0 for guest, 10 for buyer, 20 for seller, 30 for pro, 50-90 for internal, 100 for super_admin
  badgeColor: string;
  description: string;
  defaultPermissions: Permission[];
  isInternalStaff: boolean;
}

// 1. Base Public & Guest Permissions
const GUEST_PERMISSIONS: Permission[] = [
  'profile.read',
  'seller.profile.read',
  'listing.read',
  'report.create',
];

// 2. Individual Buyer Permissions
const BUYER_PERMISSIONS: Permission[] = [
  ...GUEST_PERMISSIONS,
  'profile.update.own',
  'message.read.own',
  'message.send',
  'message.block',
  'conversation.manage.own',
  'favorite.manage.own',
  'saved_search.manage.own',
  'order.create',
  'order.read.own',
  'payment.initiate',
  'review.create',
  'review.update.own',
];

// 3. Individual Seller Permissions
const SELLER_PERMISSIONS: Permission[] = [
  ...BUYER_PERMISSIONS,
  'seller.profile.update.own',
  'listing.create',
  'listing.update.own',
  'listing.delete.own',
  'listing.publish',
  'listing.mark_reserved',
  'listing.mark_sold',
  'listing.promote',
  'order.manage.seller',
];

// 4. Professional Seller Permissions
const PRO_SELLER_PERMISSIONS: Permission[] = [
  ...SELLER_PERMISSIONS,
  'listing.bulk_import',
  'store.manage.own',
  'store.analytics.read.own',
  'store.customization.manage',
  'subscription.manage.own',
  'subscription.upgrade',
];

// 5. Support Specialist
const SUPPORT_PERMISSIONS: Permission[] = [
  ...BUYER_PERMISSIONS,
  'admin.access',
  'staff.support.access',
  'user.read',
  'user.manage',
  'conversation.audit.privileged',
  'report.review',
  'provider.read',
  'provider.health.read',
];

// 6. Moderator
const MODERATOR_PERMISSIONS: Permission[] = [
  ...BUYER_PERMISSIONS,
  'admin.access',
  'listing.moderate',
  'report.review',
  'moderation.review',
  'moderation.action',
  'user.read',
  'user.suspend',
  'user.reactivate',
  'review.moderate',
  'conversation.audit.privileged',
  'audit.read',
];

// 7. Operations & Logistics Specialist
const OPERATIONS_PERMISSIONS: Permission[] = [
  ...BUYER_PERMISSIONS,
  'admin.access',
  'staff.operations.access',
  'order.read.own',
  'order.manage.seller',
  'order.refund',
  'user.read',
  'report.review',
  'provider.read',
  'provider.configuration.read',
  'provider.health.read',
];

// 8. Finance & Billing Specialist
const FINANCE_PERMISSIONS: Permission[] = [
  ...BUYER_PERMISSIONS,
  'admin.access',
  'staff.finance.access',
  'transaction.audit.finance',
  'payment.refund',
  'order.refund',
  'monetization.manage',
  'user.read',
  'audit.read',
  'provider.read',
  'provider.configuration.read',
  'provider.health.read',
];

// 9. Commercial & Partnerships
const COMMERCIAL_PERMISSIONS: Permission[] = [
  ...PRO_SELLER_PERMISSIONS,
  'admin.access',
  'staff.commercial.access',
  'user.read',
  'user.verify',
  'listing.feature',
  'crm.access',
  'crm.contact.read',
  'crm.contact.manage',
  'crm.company.read',
  'crm.company.manage',
  'crm.opportunity.read',
  'crm.opportunity.manage',
  'crm.ai_prospecting.use',
];

// 10. Content & Taxonomy Manager
const CONTENT_MANAGER_PERMISSIONS: Permission[] = [
  ...BUYER_PERMISSIONS,
  'admin.access',
  'taxonomy.manage',
  'listing.feature',
  'listing.moderate',
];

// 11. Market Manager (Country/Region Scoped)
const MARKET_MANAGER_PERMISSIONS: Permission[] = [
  ...BUYER_PERMISSIONS,
  'admin.access',
  'market.manage',
  'market.configure',
  'taxonomy.manage',
  'listing.moderate',
  'listing.feature',
  'user.read',
  'user.verify',
  'report.review',
  'audit.read',
  'crm.access',
  'crm.contact.read',
  'crm.company.read',
  'crm.opportunity.read',
  'provider.read',
  'provider.configuration.read',
  'provider.configuration.manage',
  'provider.health.read',
];

// 12. Administrator
const ADMIN_PERMISSIONS: Permission[] = [
  ...PRO_SELLER_PERMISSIONS,
  'admin.access',
  'listing.moderate',
  'listing.feature',
  'report.review',
  'moderation.review',
  'moderation.action',
  'user.read',
  'user.manage',
  'user.suspend',
  'user.reactivate',
  'user.verify',
  'staff.support.access',
  'staff.operations.access',
  'staff.finance.access',
  'staff.commercial.access',
  'transaction.audit.finance',
  'payment.refund',
  'order.refund',
  'review.moderate',
  'market.manage',
  'market.configure',
  'taxonomy.manage',
  'monetization.manage',
  'monetization.pricing.update',
  'role.manage',
  'audit.read',
  'crm.access',
  'crm.contact.read',
  'crm.contact.manage',
  'crm.company.read',
  'crm.company.manage',
  'crm.opportunity.read',
  'crm.opportunity.manage',
  'crm.ai_prospecting.use',
  'provider.read',
  'provider.manage',
  'provider.configuration.read',
  'provider.configuration.manage',
  'provider.routing.manage',
  'provider.credentials.status.read',
  'provider.health.read',
  'provider.test',
];

// 13. Super Administrator (Unrestricted platform access)
const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  'permission.manage',
  'provider.credentials.manage',
];

export const ALL_PLATFORM_ROLES: PlatformRole[] = [
  'guest',
  'buyer',
  'seller',
  'pro_seller',
  'support',
  'moderator',
  'operations',
  'finance',
  'commercial',
  'content_manager',
  'market_manager',
  'admin',
  'super_admin',
];

export const ROLE_DEFINITIONS: Record<PlatformRole, RoleMetadata> = {
  guest: {
    id: 'guest',
    title: 'Visiteur non authentifié',
    shortLabel: 'Visiteur',
    accountType: 'individual',
    hierarchyLevel: 0,
    badgeColor: 'bg-stone-100 text-stone-700 border-stone-200',
    description: 'Accès public libre pour la consultation et la recherche.',
    defaultPermissions: GUEST_PERMISSIONS,
    isInternalStaff: false,
  },
  buyer: {
    id: 'buyer',
    title: 'Acheteur Particulier',
    shortLabel: 'Particulier',
    accountType: 'individual',
    hierarchyLevel: 10,
    badgeColor: 'bg-success-surface text-success border-success-border',
    description: 'Compte membre standard pour dialoguer, acheter et enregistrer des favoris.',
    defaultPermissions: BUYER_PERMISSIONS,
    isInternalStaff: false,
  },
  seller: {
    id: 'seller',
    title: 'Vendeur Particulier',
    shortLabel: 'Particulier Vendeur',
    accountType: 'individual',
    hierarchyLevel: 20,
    badgeColor: 'bg-success-surface text-success border-success-border',
    description: 'Particulier avec annonces actives et gestion de ventes personnelles.',
    defaultPermissions: SELLER_PERMISSIONS,
    isInternalStaff: false,
  },
  pro_seller: {
    id: 'pro_seller',
    title: 'Vendeur Professionnel',
    shortLabel: 'Boutique Pro',
    accountType: 'professional',
    hierarchyLevel: 30,
    badgeColor: 'bg-primary-light text-primary border-primary-border',
    description: 'Entreprise ou artisan avec vitrine dédiée, SIRET vérifié et outils avancés.',
    defaultPermissions: PRO_SELLER_PERMISSIONS,
    isInternalStaff: false,
  },
  support: {
    id: 'support',
    title: 'Agent Support Client',
    shortLabel: 'Support',
    accountType: 'internal',
    hierarchyLevel: 50,
    badgeColor: 'bg-info-surface text-info border-info-border',
    description: 'Assistance aux utilisateurs, gestion des tickets et requêtes de litiges.',
    defaultPermissions: SUPPORT_PERMISSIONS,
    isInternalStaff: true,
  },
  moderator: {
    id: 'moderator',
    title: 'Modérateur Confiance & Sécurité',
    shortLabel: 'Modérateur',
    accountType: 'internal',
    hierarchyLevel: 60,
    badgeColor: 'bg-warning-surface text-warning border-warning-border',
    description: 'Traitement des signalements, modération des annonces et suspensions.',
    defaultPermissions: MODERATOR_PERMISSIONS,
    isInternalStaff: true,
  },
  operations: {
    id: 'operations',
    title: 'Spécialiste Opérations & Logistique',
    shortLabel: 'Opérations',
    accountType: 'internal',
    hierarchyLevel: 65,
    badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    description: 'Gestion des incidents de livraison, relais et suivi opérationnel.',
    defaultPermissions: OPERATIONS_PERMISSIONS,
    isInternalStaff: true,
  },
  finance: {
    id: 'finance',
    title: 'Responsable Finance & Comptabilité',
    shortLabel: 'Finance',
    accountType: 'internal',
    hierarchyLevel: 70,
    badgeColor: 'bg-teal-100 text-teal-900 border-teal-300',
    description: 'Supervision des séquestres, remboursements et conformité fiscale.',
    defaultPermissions: FINANCE_PERMISSIONS,
    isInternalStaff: true,
  },
  commercial: {
    id: 'commercial',
    title: 'Responsable Développement Marchand',
    shortLabel: 'Commercial',
    accountType: 'internal',
    hierarchyLevel: 68,
    badgeColor: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300',
    description: 'Accompagnement des grands comptes et partenariats vendeurs.',
    defaultPermissions: COMMERCIAL_PERMISSIONS,
    isInternalStaff: true,
  },
  content_manager: {
    id: 'content_manager',
    title: 'Gestionnaire Contenu & Taxonomie',
    shortLabel: 'Contenu',
    accountType: 'internal',
    hierarchyLevel: 62,
    badgeColor: 'bg-violet-100 text-violet-900 border-violet-300',
    description: 'Administration de l\'arborescence des catégories, filtres et sélections.',
    defaultPermissions: CONTENT_MANAGER_PERMISSIONS,
    isInternalStaff: true,
  },
  market_manager: {
    id: 'market_manager',
    title: 'Responsable Marché & Pays',
    shortLabel: 'Market Manager',
    accountType: 'internal',
    hierarchyLevel: 75,
    badgeColor: 'bg-info-surface text-info border-info-border',
    description: 'Gestion territoriale locale pour un pays spécifique (FR, BE, etc.).',
    defaultPermissions: MARKET_MANAGER_PERMISSIONS,
    isInternalStaff: true,
  },
  admin: {
    id: 'admin',
    title: 'Administrateur Plateforme',
    shortLabel: 'Administrateur',
    accountType: 'internal',
    hierarchyLevel: 90,
    badgeColor: 'bg-danger-surface text-danger border-danger-border',
    description: 'Supervision globale de la plateforme, gestion des comptes et tarifs.',
    defaultPermissions: ADMIN_PERMISSIONS,
    isInternalStaff: true,
  },
  super_admin: {
    id: 'super_admin',
    title: 'Super Administrateur Système',
    shortLabel: 'Super Admin',
    accountType: 'internal',
    hierarchyLevel: 100,
    badgeColor: 'bg-purple-100 text-purple-950 border-purple-400 font-black',
    description: 'Accès sans restriction, gestion de la matrice de sécurité et des permissions.',
    defaultPermissions: SUPER_ADMIN_PERMISSIONS,
    isInternalStaff: true,
  },
};

/**
 * Normalizes any legacy or arbitrary role string into a canonical PlatformRole.
 */
export function normalizePlatformRole(rawRole?: string): PlatformRole {
  if (!rawRole) return 'guest';
  const clean = rawRole.toLowerCase().trim();

  switch (clean) {
    case 'guest':
      return 'guest';
    case 'individual_buyer':
    case 'buyer':
      return 'buyer';
    case 'individual_seller':
    case 'seller':
      return 'seller';
    case 'pro_seller':
    case 'pro':
      return 'pro_seller';
    case 'support':
      return 'support';
    case 'moderator':
    case 'mod':
      return 'moderator';
    case 'operations':
    case 'ops':
      return 'operations';
    case 'finance':
      return 'finance';
    case 'commercial':
    case 'sales':
      return 'commercial';
    case 'content_manager':
    case 'content':
      return 'content_manager';
    case 'market_manager':
    case 'market_mgr':
      return 'market_manager';
    case 'admin':
      return 'admin';
    case 'super_admin':
    case 'superadmin':
    case 'root':
      return 'super_admin';
    default:
      return 'buyer';
  }
}

/**
 * Staff-readable name for a role identifier.
 *
 * Role keys are storage values, not copy. Rendering them directly put
 * `super_admin` in front of staff in audit rows and role columns. Falls back to
 * a de-slugified form so an unknown key still reads as words rather than as an
 * identifier.
 */
export function roleLabel(role: string | undefined | null): string {
  if (!role) return '—';
  const known = ROLE_DEFINITIONS[role as PlatformRole];
  if (known) return known.shortLabel;
  const spaced = String(role).replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
