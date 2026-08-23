import type { AutoFeatureFlags } from "@shongre/contracts/auto";

export const AUTO_FEATURE_FLAG_LABELS = {
  verticalEnabled: "Verticale Auto disponible",
  comparisonsEnabled: "Comparateur de véhicules",
  savedSearchesEnabled: "Recherches et alertes",
  structuredLeadsEnabled: "Demandes qualifiées",
  appointmentsEnabled: "Prises de rendez-vous",
  dealerImportsEnabled: "Imports des concessionnaires",
  dealerApiSyncEnabled: "Synchronisation API concessionnaires",
  paidOffersEnabled: "Offres payantes",
  secureSaleEnabled: "Vente sécurisée",
  financingReferralsEnabled: "Partenaires de financement",
  insuranceReferralsEnabled: "Partenaires d’assurance",
  inspectionReferralsEnabled: "Inspections partenaires",
  warrantyReferralsEnabled: "Garanties partenaires",
  deliveryReferralsEnabled: "Livraison partenaire",
  tradeInReferralsEnabled: "Reprise de véhicule",
  boatListingsEnabled: "Annonces nautiques",
} satisfies Record<keyof AutoFeatureFlags, string>;

export function autoFeatureFlagLabel(flag: string): string {
  const known = AUTO_FEATURE_FLAG_LABELS[flag as keyof AutoFeatureFlags];
  if (known) return known;

  const words = flag
    .replace(/Enabled$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
