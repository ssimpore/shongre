import type {
  LeadSourceDefinition,
  ProspectCandidate,
  ProspectDiscoveryFilters,
} from "@shongre/contracts/prospecting";
import type {
  LeadSourceAdapter,
  LeadSourceSearchContext,
} from "./lead-source.adapter.js";
import { calculateExplainableProspectScore } from "./prospecting.rules.js";

const SNAPSHOT_AT = "2026-08-15T10:00:00.000Z";

export const demoAuthorizedSourceDefinition: LeadSourceDefinition = {
  id: "demo_authorized_registry",
  providerId: "demo_local",
  name: "Registre professionnel de démonstration",
  category: "OFFICIAL_REGISTRY",
  description:
    "Jeu local déterministe représentant un registre autorisé. Il n’effectue aucun appel externe.",
  supportedMarketCodes: ["FR", "BE", "SN", "BF"],
  operations: ["SEARCH", "ENRICHMENT", "REFRESH", "DELETE"],
  restrictions: {
    permittedContexts: ["INTERNAL_SHONGRE", "SUBSCRIBER"],
    permittedUses: ["Démonstration de recherche B2B avec provenance"],
    prohibitedUses: ["Utilisation comme source de production"],
    mayStoreProfessionalContacts: false,
    requiresAttribution: true,
    attributionText: "Données professionnelles locales de démonstration",
    retentionDays: 90,
    refreshAfterDays: 30,
    deletionMode: "DELETE",
    rateLimitPerMinute: 60,
    requiresLegalApproval: false,
    requiresCommercialApproval: false,
  },
  lifecycle: "ACTIVE",
  healthMessage: "Données locales disponibles; aucun fournisseur connecté.",
  dataFreshnessLabel: "Instantané déterministe du 15 août 2026",
  lastHealthCheckAt: SNAPSHOT_AT,
};

const records = [
  {
    id: "b0000000-0000-4000-8000-000000000001",
    evidenceId: "e0000000-0000-4000-8000-000000000001",
    sourceRecordId: "demo-fr-auto-001",
    marketCode: "FR",
    canonicalName: "Atelier Horizon Mobilité",
    legalName: "Horizon Mobilité Services",
    officialScheme: "DEMO_REGISTRY_ID",
    officialValue: "FR-DEMO-001",
    domain: "horizon-mobilite.example",
    website: "https://horizon-mobilite.example",
    description:
      "Atelier automobile multimarque et vente de véhicules reconditionnés.",
    industry: "Automobile",
    companyType: "PME",
    estimatedSize: "10–49 personnes",
    countryCode: "FR",
    region: "Île-de-France",
    city: "Montreuil",
    postalCode: "93100",
  },
  {
    id: "b0000000-0000-4000-8000-000000000002",
    evidenceId: "e0000000-0000-4000-8000-000000000002",
    sourceRecordId: "demo-fr-home-002",
    marketCode: "FR",
    canonicalName: "Maison Seconde Vie",
    legalName: "Maison Seconde Vie SAS",
    officialScheme: "DEMO_REGISTRY_ID",
    officialValue: "FR-DEMO-002",
    domain: "maison-seconde-vie.example",
    website: "https://maison-seconde-vie.example",
    description:
      "Commerce de mobilier reconditionné pour particuliers et professionnels.",
    industry: "Maison et mobilier",
    companyType: "Commerce spécialisé",
    estimatedSize: "10–49 personnes",
    countryCode: "FR",
    region: "Auvergne-Rhône-Alpes",
    city: "Lyon",
    postalCode: "69007",
  },
  {
    id: "b0000000-0000-4000-8000-000000000003",
    evidenceId: "e0000000-0000-4000-8000-000000000003",
    sourceRecordId: "demo-be-recruit-003",
    marketCode: "BE",
    canonicalName: "Talent Local Partners",
    legalName: "Talent Local Partners SRL",
    officialScheme: "DEMO_REGISTRY_ID",
    officialValue: "BE-DEMO-003",
    domain: "talent-local.example",
    website: "https://talent-local.example",
    description:
      "Cabinet de recrutement spécialisé dans les métiers de proximité.",
    industry: "Recrutement",
    companyType: "Cabinet de services",
    estimatedSize: "1–9 personnes",
    countryCode: "BE",
    region: "Bruxelles-Capitale",
    city: "Bruxelles",
    postalCode: "1000",
  },
  {
    id: "b0000000-0000-4000-8000-000000000004",
    evidenceId: "e0000000-0000-4000-8000-000000000004",
    sourceRecordId: "demo-sn-logistics-004",
    marketCode: "SN",
    canonicalName: "Teranga Livraison Pro",
    legalName: "Teranga Livraison Pro SUARL",
    officialScheme: "DEMO_REGISTRY_ID",
    officialValue: "SN-DEMO-004",
    domain: "teranga-livraison.example",
    website: "https://teranga-livraison.example",
    description: "Logistique urbaine, livraison et solutions de retrait local.",
    industry: "Logistique",
    companyType: "PME",
    estimatedSize: "10–49 personnes",
    countryCode: "SN",
    region: "Dakar",
    city: "Dakar",
    postalCode: "11000",
  },
  {
    id: "b0000000-0000-4000-8000-000000000005",
    evidenceId: "e0000000-0000-4000-8000-000000000005",
    sourceRecordId: "demo-bf-equipment-005",
    marketCode: "BF",
    canonicalName: "Sahel Équipements Pro",
    legalName: "Sahel Équipements Pro SARL",
    officialScheme: "DEMO_REGISTRY_ID",
    officialValue: "BF-DEMO-005",
    domain: "sahel-equipements.example",
    website: "https://sahel-equipements.example",
    description:
      "Distribution et maintenance d’équipements agricoles professionnels.",
    industry: "Équipement agricole",
    companyType: "Distributeur",
    estimatedSize: "10–49 personnes",
    countryCode: "BF",
    region: "Centre",
    city: "Ouagadougou",
    postalCode: "01 BP",
  },
] as const;

export class DemoAuthorizedLeadSourceAdapter implements LeadSourceAdapter {
  readonly definition = demoAuthorizedSourceDefinition;

  async search(
    _context: LeadSourceSearchContext,
    filters: ProspectDiscoveryFilters,
  ): Promise<ProspectCandidate[]> {
    const query = filters.query?.toLocaleLowerCase("fr") ?? "";
    const candidates = records
      .filter((record) => record.marketCode === filters.marketCode)
      .filter(
        (record) =>
          !filters.industries.length ||
          filters.industries.some((industry) =>
            record.industry
              .toLocaleLowerCase("fr")
              .includes(industry.toLocaleLowerCase("fr")),
          ),
      )
      .filter(
        (record) =>
          !query ||
          `${record.canonicalName} ${record.description} ${record.industry}`
            .toLocaleLowerCase("fr")
            .includes(query),
      )
      .map((record) => {
        const evidence = [
          {
            id: record.evidenceId,
            sourceId: this.definition.id,
            sourceCategory: this.definition.category,
            title: "Fiche professionnelle du registre de démonstration",
            url: `https://registry-demo.invalid/${record.sourceRecordId}`,
            excerpt: `${record.legalName} — ${record.description}`,
            observedAt: SNAPSHOT_AT,
            freshness: "CURRENT" as const,
            attributionRequired: true,
            confidence: 0.91,
          },
        ];
        const candidate = {
          company: {
            id: record.id,
            canonicalName: record.canonicalName,
            legalName: record.legalName,
            officialIdentifier: {
              marketCode: record.marketCode,
              scheme: record.officialScheme,
              value: record.officialValue,
            },
            domain: record.domain,
            website: record.website,
            description: record.description,
            industry: record.industry,
            companyType: record.companyType,
            estimatedSize: record.estimatedSize,
            marketCodes: [record.marketCode],
            countryCode: record.countryCode,
            region: record.region,
            city: record.city,
            postalCode: record.postalCode,
            sourceIds: [this.definition.id],
            discoveredAt: SNAPSHOT_AT,
            refreshedAt: SNAPSHOT_AT,
            reviewState: "UNREVIEWED" as const,
          },
          evidence,
          status: "DISCOVERED" as const,
          humanReviewRequired: true as const,
        };
        return {
          ...candidate,
          score: calculateExplainableProspectScore({
            filters,
            candidate,
            evaluatedAt: SNAPSHOT_AT,
          }),
        };
      });
    return candidates.slice(0, filters.limit);
  }
}
