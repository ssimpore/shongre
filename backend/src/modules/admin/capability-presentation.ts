import type {
  Capability,
  CapabilityResolutionFact,
  CapabilityManagementEntry,
} from "@shongre/contracts/access-control";

const LABELS: Partial<Record<Capability, string>> = {
  "staff.internal.access": "Accéder aux espaces internes Shongre",
  "admin.access": "Accéder à la console d’administration",
  "admin.staff.manage": "Gérer les accès Staff",
  "admin.permissions.manage": "Gérer les permissions directes",
  "permission.manage": "Gérer la gouvernance des permissions",
};

const ACTIONS: Record<string, string> = {
  read: "Consulter",
  access: "Accéder à",
  create: "Créer",
  update: "Modifier",
  delete: "Supprimer",
  manage: "Gérer",
  publish: "Publier",
  approve: "Approuver",
  moderate: "Modérer",
  suspend: "Suspendre",
  reactivate: "Réactiver",
  verify: "Vérifier",
  refund: "Rembourser",
  export: "Exporter",
  send: "Envoyer",
  test: "Tester",
};

function categoryFor(capability: Capability): string {
  const prefix = capability.split(".")[0];
  if (["admin", "role", "permission", "audit"].includes(prefix))
    return "Gouvernance et administration";
  if (["staff", "user", "profile", "support"].includes(prefix))
    return "Identités et équipe";
  if (["finance", "payment", "invoice", "invoicing"].includes(prefix))
    return "Finance et paiements";
  if (["listing", "store", "favorite", "saved_search"].includes(prefix))
    return "Marketplace";
  if (["message", "conversation", "notification"].includes(prefix))
    return "Communication";
  if (["moderation", "report", "compliance", "review"].includes(prefix))
    return "Confiance et conformité";
  if (["market", "taxonomy", "provider"].includes(prefix))
    return "Marchés et configuration";
  if (["crm", "marketing", "commercial_rules", "commissions"].includes(prefix))
    return "CRM, marketing et commercial";
  return "Produits et opérations";
}

function fallbackLabel(capability: Capability): string {
  const parts = capability.split(".");
  const action = parts.at(-1) ?? "manage";
  const resource = parts
    .slice(0, -1)
    .join(" ")
    .replaceAll("_", " ")
    .replace(/\bown\b/g, "propre périmètre");
  const actionLabel = ACTIONS[action] ?? "Utiliser";
  return `${actionLabel} ${resource}`.replace(/\s+/g, " ").trim();
}

export function presentCapabilityFact(
  fact: CapabilityResolutionFact,
): CapabilityManagementEntry {
  return {
    ...fact,
    label: LABELS[fact.capability] ?? fallbackLabel(fact.capability),
    category: categoryFor(fact.capability),
  };
}
