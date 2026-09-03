import { capabilitiesForLegacyRole } from "@shongre/contracts/access-control";
import type {
  AccountType,
  Permission,
  PlatformRole,
  StaffRole,
} from "../types";

export interface RoleMetadata {
  /** Compatibility key for existing persisted demo profiles. */
  id: PlatformRole;
  title: string;
  shortLabel: string;
  accountType: AccountType;
  hierarchyLevel: number;
  badgeColor: string;
  description: string;
  /** Derived from the shared canonical policy; never authored here. */
  defaultPermissions: Permission[];
  isInternalStaff: boolean;
}

export const ALL_PLATFORM_ROLES: PlatformRole[] = [
  "guest",
  "buyer",
  "seller",
  "pro_seller",
  "support",
  "moderator",
  "operations",
  "finance",
  "commercial",
  "content_manager",
  "market_manager",
  "admin",
  "super_admin",
];

export const STAFF_ROLE_PRESENTATION: Record<
  StaffRole,
  { title: string; shortLabel: string }
> = {
  support_agent: { title: "Agent Support Client", shortLabel: "Support" },
  moderator: { title: "Modérateur", shortLabel: "Modération" },
  trust_safety: {
    title: "Analyste Trust & Safety",
    shortLabel: "Trust & Safety",
  },
  compliance: { title: "Analyste Conformité", shortLabel: "Conformité" },
  finance: { title: "Responsable Finance", shortLabel: "Finance" },
  operations: { title: "Spécialiste Opérations", shortLabel: "Opérations" },
  commercial: { title: "Responsable Commercial", shortLabel: "Commercial" },
  content_manager: { title: "Gestionnaire de contenu", shortLabel: "Contenu" },
  market_manager: { title: "Responsable Marché", shortLabel: "Marché" },
  admin: { title: "Administrateur Plateforme", shortLabel: "Administrateur" },
  owner: { title: "Propriétaire Plateforme", shortLabel: "Propriétaire" },
};

/** Presentation-only bridge for the historical role matrix UI. */
export function platformRoleForStaffRole(role: StaffRole): PlatformRole {
  switch (role) {
    case "support_agent":
      return "support";
    case "owner":
      return "super_admin";
    case "trust_safety":
    case "compliance":
      return "operations";
    default:
      return role;
  }
}

const permissionsFor = (role: PlatformRole): Permission[] =>
  capabilitiesForLegacyRole(role);

export const ROLE_DEFINITIONS: Record<PlatformRole, RoleMetadata> = {
  guest: {
    id: "guest",
    title: "Visiteur non authentifié",
    shortLabel: "Visiteur",
    accountType: "individual",
    hierarchyLevel: 0,
    badgeColor: "bg-stone-100 text-stone-700 border-stone-200",
    description: "Accès public libre pour la consultation et la recherche.",
    defaultPermissions: permissionsFor("guest"),
    isInternalStaff: false,
  },
  buyer: {
    id: "buyer",
    title: "Compte Particulier",
    shortLabel: "Particulier",
    accountType: "individual",
    hierarchyLevel: 10,
    badgeColor: "bg-success-surface text-success border-success-border",
    description:
      "Compte individuel pouvant acheter et vendre selon son activité.",
    defaultPermissions: permissionsFor("buyer"),
    isInternalStaff: false,
  },
  seller: {
    id: "seller",
    title: "Compte Particulier",
    shortLabel: "Particulier",
    accountType: "individual",
    hierarchyLevel: 10,
    badgeColor: "bg-success-surface text-success border-success-border",
    description:
      "Alias historique d'un compte individuel, sans identité séparée vendeur.",
    defaultPermissions: permissionsFor("seller"),
    isInternalStaff: false,
  },
  pro_seller: {
    id: "pro_seller",
    title: "Compte Professionnel",
    shortLabel: "Professionnel",
    accountType: "professional",
    hierarchyLevel: 30,
    badgeColor: "bg-primary-light text-primary border-primary-border",
    description:
      "Entreprise avec socle Pro et outils métier déterminés par sa verticale.",
    defaultPermissions: permissionsFor("pro_seller"),
    isInternalStaff: false,
  },
  support: {
    id: "support",
    title: "Agent Support Client",
    shortLabel: "Support",
    accountType: "individual",
    hierarchyLevel: 50,
    badgeColor: "bg-info-surface text-info border-info-border",
    description: "Assistance et gestion des dossiers support autorisés.",
    defaultPermissions: permissionsFor("support"),
    isInternalStaff: true,
  },
  moderator: {
    id: "moderator",
    title: "Modérateur",
    shortLabel: "Modérateur",
    accountType: "individual",
    hierarchyLevel: 60,
    badgeColor: "bg-warning-surface text-warning border-warning-border",
    description: "Traitement des signalements et actions de modération.",
    defaultPermissions: permissionsFor("moderator"),
    isInternalStaff: true,
  },
  operations: {
    id: "operations",
    title: "Spécialiste Opérations",
    shortLabel: "Opérations",
    accountType: "individual",
    hierarchyLevel: 65,
    badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
    description: "Suivi opérationnel dans un périmètre explicitement attribué.",
    defaultPermissions: permissionsFor("operations"),
    isInternalStaff: true,
  },
  finance: {
    id: "finance",
    title: "Responsable Finance",
    shortLabel: "Finance",
    accountType: "individual",
    hierarchyLevel: 70,
    badgeColor: "bg-teal-100 text-teal-900 border-teal-300",
    description: "Transactions, remboursements et rapprochement financier.",
    defaultPermissions: permissionsFor("finance"),
    isInternalStaff: true,
  },
  commercial: {
    id: "commercial",
    title: "Responsable Développement Marchand",
    shortLabel: "Commercial",
    accountType: "individual",
    hierarchyLevel: 68,
    badgeColor: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300",
    description: "Accompagnement des comptes et partenariats autorisés.",
    defaultPermissions: permissionsFor("commercial"),
    isInternalStaff: true,
  },
  content_manager: {
    id: "content_manager",
    title: "Gestionnaire Contenu & Taxonomie",
    shortLabel: "Contenu",
    accountType: "individual",
    hierarchyLevel: 62,
    badgeColor: "bg-violet-100 text-violet-900 border-violet-300",
    description: "Taxonomie et sélections éditoriales, sans privilège global.",
    defaultPermissions: permissionsFor("content_manager"),
    isInternalStaff: true,
  },
  market_manager: {
    id: "market_manager",
    title: "Responsable Marché & Pays",
    shortLabel: "Responsable Marché",
    accountType: "individual",
    hierarchyLevel: 75,
    badgeColor: "bg-info-surface text-info border-info-border",
    description:
      "Configuration d'un périmètre de marché explicitement attribué.",
    defaultPermissions: permissionsFor("market_manager"),
    isInternalStaff: true,
  },
  admin: {
    id: "admin",
    title: "Administrateur Plateforme",
    shortLabel: "Administrateur",
    accountType: "individual",
    hierarchyLevel: 90,
    badgeColor: "bg-danger-surface text-danger border-danger-border",
    description:
      "Configuration et administration; aucun privilège opérationnel implicite.",
    defaultPermissions: permissionsFor("admin"),
    isInternalStaff: true,
  },
  super_admin: {
    id: "super_admin",
    title: "Propriétaire Plateforme",
    shortLabel: "Propriétaire",
    accountType: "individual",
    hierarchyLevel: 100,
    badgeColor: "bg-purple-100 text-purple-950 border-purple-400 font-bold",
    description:
      "Gouvernance critique et permissions, avec droits explicites et auditables.",
    defaultPermissions: permissionsFor("super_admin"),
    isInternalStaff: true,
  },
};

/** Normalize storage aliases without treating unknown input as privileged. */
export function normalizePlatformRole(rawRole?: string): PlatformRole {
  const clean = rawRole?.toLowerCase().trim();
  switch (clean) {
    case "guest":
      return "guest";
    case "individual_buyer":
    case "buyer":
      return "buyer";
    case "individual_seller":
    case "seller":
      return "seller";
    case "pro_seller":
    case "pro":
      return "pro_seller";
    case "support":
      return "support";
    case "moderator":
    case "mod":
      return "moderator";
    case "operations":
    case "ops":
      return "operations";
    case "finance":
      return "finance";
    case "commercial":
    case "sales":
      return "commercial";
    case "content_manager":
    case "content":
      return "content_manager";
    case "market_manager":
    case "market_mgr":
      return "market_manager";
    case "admin":
      return "admin";
    case "super_admin":
    case "superadmin":
    case "root":
      return "super_admin";
    default:
      return "guest";
  }
}

export function roleLabel(role: string | undefined | null): string {
  if (!role) return "—";
  const known = ROLE_DEFINITIONS[normalizePlatformRole(role)];
  if (known) return known.shortLabel;
  const spaced = String(role).replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
