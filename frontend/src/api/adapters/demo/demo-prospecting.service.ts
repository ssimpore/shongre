import type {
  LeadSourceDefinition,
  ProspectCandidate,
  ProspectDiscoveryRequest,
  ProspectDiscoveryResult,
  ProspectImportRequest,
  ProspectImportResult,
  ProspectOpportunityBrief,
  ProspectingProfile,
  ProspectingProfileInput,
  ProspectingUsage,
} from "@shongre/contracts/prospecting";
import { getCountryConfig } from "@shongre/contracts";
import type {
  CrmProspectingServiceContract,
  ProspectingDemoScenario,
} from "../../contracts/crm-prospecting.contract";
import type { CrmServiceContract } from "../../contracts/crm.contract";
import { storageService } from "../../../services/storage.service";
import { demoCrmService } from "./demo-crm.service";

const SNAPSHOT_AT = "2026-08-15T10:00:00.000Z";
const IMPORTED_AT = "2026-08-15T10:05:00.000Z";

const sourceDefinitions: LeadSourceDefinition[] = [
  {
    id: "demo_authorized_registry",
    providerId: "demo_local",
    name: "Registre professionnel de démonstration",
    category: "OFFICIAL_REGISTRY",
    description:
      "Jeu local déterministe représentant une source autorisée. Aucun appel externe n’est effectué.",
    supportedMarketCodes: ["FR", "BE", "CH", "SN", "BF"],
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
  },
  {
    id: "csv_import",
    providerId: "shongre_internal",
    name: "Import CSV ou tableur",
    category: "USER_PROVIDED",
    description: "Import appartenant au tenant avec provenance déclarée.",
    supportedMarketCodes: ["FR", "BE", "CH", "SN", "BF"],
    operations: ["IMPORT", "REFRESH", "DELETE"],
    restrictions: {
      permittedContexts: ["INTERNAL_SHONGRE", "SUBSCRIBER"],
      permittedUses: ["Import de données professionnelles du tenant"],
      prohibitedUses: ["Listes sans preuve de provenance"],
      mayStoreProfessionalContacts: true,
      requiresAttribution: false,
      retentionDays: 1_095,
      refreshAfterDays: 180,
      deletionMode: "DELETE",
      requiresLegalApproval: false,
      requiresCommercialApproval: false,
    },
    lifecycle: "ACTIVE",
    healthMessage: "Import local disponible.",
    dataFreshnessLabel: "Selon la date d’import",
    lastHealthCheckAt: SNAPSHOT_AT,
  },
  {
    id: "official_registry_contract",
    providerId: "official_registry",
    name: "Registre officiel par marché",
    category: "OFFICIAL_REGISTRY",
    description:
      "Contrat à activer uniquement après validation du marché et du fournisseur.",
    supportedMarketCodes: ["FR", "BE", "CH", "SN", "BF"],
    operations: ["SEARCH", "ENRICHMENT", "REFRESH", "DELETE"],
    restrictions: {
      permittedContexts: ["INTERNAL_SHONGRE", "SUBSCRIBER"],
      permittedUses: ["Recherche professionnelle selon la licence du marché"],
      prohibitedUses: ["Activation sans validation juridique et commerciale"],
      mayStoreProfessionalContacts: false,
      requiresAttribution: true,
      retentionDays: 365,
      refreshAfterDays: 30,
      deletionMode: "DELETE",
      requiresLegalApproval: true,
      requiresCommercialApproval: true,
    },
    lifecycle: "INACTIVE_REVIEW_REQUIRED",
    healthMessage: "Aucun fournisseur de production n’est activé.",
    dataFreshnessLabel: "À déclarer par l’adaptateur de marché",
  },
];

interface CandidateSeed {
  ordinal: number;
  name: string;
  legalName: string;
  marketCode: string;
  city: string;
  region: string;
  industry: string;
  companyType: string;
  description: string;
  score: number;
  duplicateId?: string;
}

function seededCandidate(seed: CandidateSeed): ProspectCandidate {
  const id = `b0000000-0000-4000-8000-${String(seed.ordinal).padStart(12, "0")}`;
  const evidenceId = `e0000000-0000-4000-8000-${String(seed.ordinal).padStart(12, "0")}`;
  const slug = seed.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return {
    company: {
      id,
      canonicalName: seed.name,
      legalName: seed.legalName,
      officialIdentifier: {
        marketCode: seed.marketCode,
        scheme: "DEMO_REGISTRY_ID",
        value: `${seed.marketCode}-DEMO-${String(seed.ordinal).padStart(3, "0")}`,
      },
      domain: `${slug}.example`,
      website: `https://${slug}.example`,
      description: seed.description,
      industry: seed.industry,
      companyType: seed.companyType,
      estimatedSize: seed.ordinal % 2 ? "10–49 personnes" : "1–9 personnes",
      marketCodes: [seed.marketCode],
      countryCode: seed.marketCode,
      region: seed.region,
      city: seed.city,
      sourceIds: ["demo_authorized_registry"],
      discoveredAt: SNAPSHOT_AT,
      refreshedAt: SNAPSHOT_AT,
      reviewState: seed.duplicateId ? "DUPLICATE_REVIEW" : "UNREVIEWED",
      duplicateOfCrmAccountId: seed.duplicateId,
    },
    score: {
      totalScore: seed.score,
      fitScore: Math.min(100, seed.score + 7),
      opportunityScore: Math.max(0, seed.score - 11),
      dataConfidence: Math.min(96, seed.score + 3),
      positiveFactors: [
        {
          code: "MARKET_MATCH",
          label: "Entreprise active sur le marché sélectionné",
          impact: 20,
          evidenceIds: [evidenceId],
        },
        {
          code: "CURRENT_EVIDENCE",
          label: "Preuve professionnelle récente",
          impact: 20,
          evidenceIds: [evidenceId],
        },
      ],
      negativeFactors: [],
      missingInformation: seed.duplicateId
        ? ["Confirmation du doublon", "Historique de contact"]
        : ["Rôle du décideur"],
      evidenceIds: [evidenceId],
      ruleVersion: "prospecting-rules-v1",
      model: "shongre-demo-deterministic-v1",
      promptVersion: "prospecting-score-v1",
      confidence: Math.min(0.96, (seed.score + 3) / 100),
      evaluatedAt: SNAPSHOT_AT,
      recommendedNextAction: seed.duplicateId
        ? "Confirmer le doublon avant toute création de compte CRM."
        : "Valider les preuves puis ajouter l’entreprise à une liste ciblée.",
    },
    evidence: [
      {
        id: evidenceId,
        sourceId: "demo_authorized_registry",
        sourceCategory: "OFFICIAL_REGISTRY",
        title: "Fiche professionnelle de démonstration",
        url: `https://registry-demo.invalid/${seed.marketCode.toLocaleLowerCase()}-${seed.ordinal}`,
        excerpt: `${seed.legalName} — ${seed.description}`,
        observedAt: SNAPSHOT_AT,
        freshness: "CURRENT",
        attributionRequired: true,
        confidence: Math.min(0.96, (seed.score + 3) / 100),
      },
    ],
    status: "DISCOVERED",
    humanReviewRequired: true,
  };
}

const prospects = [
  seededCandidate({
    ordinal: 1,
    name: "Atelier Horizon Mobilité",
    legalName: "Horizon Mobilité Services",
    marketCode: "FR",
    city: "Montreuil",
    region: "Île-de-France",
    industry: "Automobile",
    companyType: "PME",
    description:
      "Atelier automobile multimarque et vente de véhicules reconditionnés.",
    score: 88,
  }),
  seededCandidate({
    ordinal: 2,
    name: "Maison Seconde Vie",
    legalName: "Maison Seconde Vie SAS",
    marketCode: "FR",
    city: "Lyon",
    region: "Auvergne-Rhône-Alpes",
    industry: "Maison et mobilier",
    companyType: "Commerce spécialisé",
    description:
      "Commerce de mobilier reconditionné pour particuliers et professionnels.",
    score: 79,
    duplicateId: "20000000-0000-4000-8000-000000000001",
  }),
  seededCandidate({
    ordinal: 3,
    name: "Talent Local Partners",
    legalName: "Talent Local Partners SRL",
    marketCode: "BE",
    city: "Bruxelles",
    region: "Bruxelles-Capitale",
    industry: "Recrutement",
    companyType: "Cabinet de services",
    description:
      "Cabinet de recrutement spécialisé dans les métiers de proximité.",
    score: 82,
  }),
  seededCandidate({
    ordinal: 4,
    name: "Teranga Livraison Pro",
    legalName: "Teranga Livraison Pro SUARL",
    marketCode: "SN",
    city: "Dakar",
    region: "Dakar",
    industry: "Logistique",
    companyType: "PME",
    description: "Logistique urbaine, livraison et solutions de retrait local.",
    score: 85,
  }),
  seededCandidate({
    ordinal: 5,
    name: "Alpina Mobilité Services",
    legalName: "Alpina Mobilité Services SA",
    marketCode: "CH",
    city: "Lausanne",
    region: "Vaud",
    industry: "Mobilité",
    companyType: "PME",
    description:
      "Services de mobilité professionnelle et gestion de flottes locales.",
    score: 84,
  }),
];

function defaultProfile(): ProspectingProfile {
  return {
    id: "a0000000-0000-4000-8000-000000000001",
    name: "Professionnels à potentiel local",
    description:
      "Entreprises avec activité locale, catalogue professionnel et présence en ligne identifiable.",
    context: "SUBSCRIBER",
    marketCodes: ["FR", "BE", "CH"],
    locale: "fr-FR",
    currency: "EUR",
    timezone: "Europe/Paris",
    geographicAreas: ["Île-de-France", "Auvergne-Rhône-Alpes"],
    radiusKm: 80,
    industries: [
      "Automobile",
      "Maison et mobilier",
      "Recrutement",
      "Logistique",
    ],
    taxonomySlugs: ["vehicles", "furniture", "jobs", "services"],
    companyTypes: ["PME", "Commerce spécialisé", "Cabinet de services"],
    estimatedSizeMin: 1,
    estimatedSizeMax: 250,
    businessMaturity: ["Activité établie"],
    onlinePresence: ["Site professionnel"],
    targetRoles: ["Direction", "Responsable commercial"],
    fitRules: ["Marché compatible", "Preuve professionnelle récente"],
    exclusionRules: ["Particulier", "Source sans provenance"],
    requiredSignals: ["Activité professionnelle identifiable"],
    optionalSignals: ["Catalogue en ligne", "Plusieurs établissements"],
    isDefault: true,
    version: 1,
    createdAt: SNAPSHOT_AT,
    updatedAt: SNAPSHOT_AT,
  };
}

const tenantKey = () => storageService.getCurrentUser()?.id || "guest";
const copy = <T>(value: T): T => structuredClone(value);

function searchTokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((token) => (token.length > 4 ? token.replace(/s$/, "") : token));
}

export class DemoProspectingService implements CrmProspectingServiceContract {
  private readonly profiles = new Map<string, ProspectingProfile[]>();
  private readonly candidates = new Map<string, ProspectCandidate[]>();
  private readonly imports = new Map<string, ProspectImportResult>();

  constructor(
    private readonly scenario: ProspectingDemoScenario = "prospects_default",
    private readonly integrations?: { crm: CrmServiceContract },
  ) {}

  private async integrateCandidateWithCrm(
    candidate: ProspectCandidate,
  ): Promise<string | null> {
    const crm = this.integrations?.crm;
    if (!crm) return null;

    const duplicateMatches = await crm.findAccountDuplicates({
      name: candidate.company.canonicalName,
      domain: candidate.company.domain,
    });
    const duplicateId =
      candidate.company.duplicateOfCrmAccountId ??
      duplicateMatches[0]?.entityId;
    const account = duplicateId
      ? await crm.getAccount(duplicateId)
      : await crm.createAccount({
          name: candidate.company.canonicalName,
          legalName: candidate.company.legalName,
          website: candidate.company.website,
          domain: candidate.company.domain,
          industry: candidate.company.industry,
          description: candidate.company.description,
          country: candidate.company.countryCode,
          region: candidate.company.region,
          city: candidate.company.city,
          postalCode: candidate.company.postalCode,
          marketCode: candidate.company.marketCodes[0],
          lifecycle: "prospect",
          fitScore: candidate.score.totalScore,
          source: "ai_research",
          sourceDetail: `Shongre Prospects · ${candidate.evidence.length} preuve(s) conservée(s)`,
          tags: [
            "Shongre Prospects",
            ...(candidate.company.industry ? [candidate.company.industry] : []),
          ],
          customValues: {
            prospectCandidateId: candidate.company.id,
            evidenceIds: candidate.evidence.map((item) => item.id),
            scoreRuleVersion: candidate.score.ruleVersion,
          },
        });

    const [pipelines, opportunities] = await Promise.all([
      crm.listPipelines(),
      crm.listOpportunities({ limit: 100 }),
    ]);
    const selectedPipeline =
      pipelines.find((item) => item.isDefault && item.isActive) ?? pipelines[0];
    const firstStage = selectedPipeline?.stages.find((stage) => stage.isOpen);
    const sourceDetail = `prospect:${candidate.company.id}`;
    let opportunity = opportunities.items.find(
      (item) => item.sourceDetail === sourceDetail,
    );

    if (selectedPipeline && firstStage && !opportunity) {
      const market = getCountryConfig(candidate.company.marketCodes[0]);
      if (!market) throw new Error("Le marché du prospect est inconnu.");
      opportunity = await crm.createOpportunity({
        accountId: account.id,
        pipelineId: selectedPipeline.id,
        stageId: firstStage.id,
        name: `Qualification · ${candidate.company.canonicalName}`,
        description:
          "Opportunité créée après validation humaine des preuves de prospection.",
        amount: {
          amountMinor: 0,
          currency: market.currency,
        },
        expectedCloseDate: "2026-09-30",
        nextStep: candidate.score.recommendedNextAction,
        source: "ai_research",
        sourceDetail,
        forecastCategory: "pipeline",
        tags: ["Shongre Prospects"],
        customValues: {
          prospectCandidateId: candidate.company.id,
          evidenceIds: candidate.evidence.map((item) => item.id),
        },
      });
      await crm.createTask({
        accountId: account.id,
        opportunityId: opportunity.id,
        type: "qualification",
        title: `Qualifier ${candidate.company.canonicalName}`,
        description: candidate.score.recommendedNextAction,
        dueAt: "2026-08-28T09:00:00.000Z",
        priority: candidate.score.totalScore >= 85 ? "high" : "medium",
      });
    }

    await crm.createActivity({
      entityType: "account",
      entityId: account.id,
      activityType: "AI_ENRICHMENT",
      title: duplicateId
        ? "Prospect relié à une entreprise existante"
        : "Prospect ajouté depuis Découvrir",
      description: `${candidate.evidence.length} preuve(s) professionnelle(s) conservée(s) · validation humaine effectuée.`,
      occurredAt: IMPORTED_AT,
    });

    return account.id;
  }

  private assertAvailable(): void {
    if (this.scenario === "permission_denied")
      throw new Error(
        "Vous n’avez pas les droits nécessaires pour cette action.",
      );
    if (this.scenario === "subscription_expired")
      throw new Error("L’abonnement Shongre Prospects a expiré.");
  }

  async listProfiles(): Promise<ProspectingProfile[]> {
    this.assertAvailable();
    const key = tenantKey();
    if (!this.profiles.has(key)) this.profiles.set(key, [defaultProfile()]);
    return copy(this.profiles.get(key)!);
  }

  async createProfile(input: ProspectingProfileInput) {
    this.assertAvailable();
    const key = tenantKey();
    const current = await this.listProfiles();
    const value: ProspectingProfile = {
      id: `a0000000-0000-4000-8000-${String(current.length + 1).padStart(12, "0")}`,
      ...input,
      version: 1,
      createdAt: SNAPSHOT_AT,
      updatedAt: SNAPSHOT_AT,
    };
    this.profiles.set(key, [value, ...current]);
    return copy(value);
  }

  async listSources(marketCode: string) {
    this.assertAvailable();
    const items = sourceDefinitions.filter((source) =>
      source.supportedMarketCodes.includes(marketCode),
    );
    return copy(
      this.scenario === "source_disconnected"
        ? items.map((source) =>
            source.id === "demo_authorized_registry"
              ? {
                  ...source,
                  lifecycle: "DISCONNECTED" as const,
                  healthMessage: "Source déconnectée dans ce scénario.",
                }
              : source,
          )
        : items,
    );
  }

  async discover(
    input: ProspectDiscoveryRequest,
  ): Promise<ProspectDiscoveryResult> {
    this.assertAvailable();
    const market = getCountryConfig(input.filters.marketCode);
    if (
      !market ||
      market.launchStatus !== "active" ||
      !market.capabilities.discovery
    ) {
      throw new Error("Shongre Prospects n’est pas disponible sur ce marché.");
    }
    if (this.scenario === "discovery_error")
      throw new Error(
        "La recherche de démonstration est temporairement indisponible.",
      );
    if (this.scenario === "quota_exhausted")
      throw new Error("Le quota mensuel de découvertes est atteint.");
    const source = (await this.listSources(input.filters.marketCode)).find(
      (item) => item.id === "demo_authorized_registry",
    );
    if (!source || source.lifecycle !== "ACTIVE")
      throw new Error(
        "Aucune source de découverte autorisée n’est disponible.",
      );
    const queryTokens = searchTokens(input.filters.query || "");
    let items = prospects
      .filter((item) =>
        item.company.marketCodes.includes(input.filters.marketCode),
      )
      .filter(
        (item) =>
          !input.filters.industries.length ||
          input.filters.industries.some((industry) =>
            item.company.industry
              ?.toLocaleLowerCase("fr")
              .includes(industry.toLocaleLowerCase("fr")),
          ),
      )
      .filter(
        (item) =>
          !queryTokens.length ||
          queryTokens.every((queryToken) =>
            searchTokens(
              `${item.company.canonicalName} ${item.company.description || ""} ${item.company.industry || ""}`,
            ).some(
              (candidateToken) =>
                candidateToken.startsWith(queryToken) ||
                queryToken.startsWith(candidateToken),
            ),
          ),
      );
    if (this.scenario === "empty_discovery") items = [];
    const limited = items.slice(0, input.filters.limit);
    this.candidates.set(tenantKey(), copy(limited));
    return {
      items: copy(limited),
      pageInfo: { hasNextPage: false },
      appliedFilters: copy(input.filters),
      sourceIds: [source.id],
      measuredTotal: limited.length,
      generatedAt: SNAPSHOT_AT,
    };
  }

  async getOpportunityBrief(
    candidateId: string,
  ): Promise<ProspectOpportunityBrief> {
    this.assertAvailable();
    const candidate = (this.candidates.get(tenantKey()) || prospects).find(
      (item) => item.company.id === candidateId,
    );
    if (!candidate) throw new Error("Prospect introuvable.");
    const aiAvailable = this.scenario !== "ai_unavailable";
    return {
      companyId: candidate.company.id,
      headline: `Pourquoi ${candidate.company.canonicalName} correspond au profil`,
      summary: aiAvailable
        ? `Synthèse assistée et déterministe : ${candidate.company.description || "activité professionnelle identifiée"}`
        : `Synthèse par règles : ${candidate.evidence.length} preuve(s) professionnelle(s) enregistrée(s).`,
      knownFacts: candidate.evidence.map((item) => ({
        statement: item.excerpt || item.title,
        evidenceIds: [item.id],
      })),
      estimates: [],
      suggestions: [candidate.score.recommendedNextAction],
      missingInformation: candidate.score.missingInformation,
      score: copy(candidate.score),
      evidence: copy(candidate.evidence),
      model: aiAvailable
        ? "shongre-demo-deterministic-v1"
        : "rules/deterministic-v1",
      promptVersion: "prospecting-opportunity-brief-v1",
      generatedAt: SNAPSHOT_AT,
      humanReviewRequired: true,
    };
  }

  async importCandidate(
    input: ProspectImportRequest,
  ): Promise<ProspectImportResult> {
    this.assertAvailable();
    const importKey = `${tenantKey()}:${input.idempotencyKey}`;
    const previous = this.imports.get(importKey);
    if (previous) return copy(previous);
    const candidate = (this.candidates.get(tenantKey()) || prospects).find(
      (item) => item.company.id === input.companyId,
    );
    if (!candidate) throw new Error("Prospect introuvable.");
    if (
      input.expectedEvidenceIds.some(
        (id) => !candidate.evidence.some((evidence) => evidence.id === id),
      )
    )
      throw new Error("Les preuves ont changé. Réexaminez le prospect.");
    const duplicateId = candidate.company.duplicateOfCrmAccountId;
    const integratedAccountId = await this.integrateCandidateWithCrm(candidate);
    const value: ProspectImportResult = {
      companyId: candidate.company.id,
      crmAccountId:
        integratedAccountId ||
        duplicateId ||
        `c${candidate.company.id.slice(1, 8)}-0000-4000-8000-000000000001`,
      duplicateDetected: Boolean(duplicateId),
      duplicateCrmAccountId: duplicateId,
      importedAt: IMPORTED_AT,
      provenancePreserved: true,
    };
    this.imports.set(importKey, value);
    this.candidates.set(
      tenantKey(),
      (this.candidates.get(tenantKey()) || []).map((item) =>
        item.company.id === input.companyId
          ? {
              ...item,
              status: "IMPORTED" as const,
              company: {
                ...item.company,
                crmAccountId: value.crmAccountId,
                reviewState: "APPROVED" as const,
              },
            }
          : item,
      ),
    );
    return copy(value);
  }

  async getUsage(_marketCode: string): Promise<ProspectingUsage> {
    const expired = this.scenario === "subscription_expired";
    const exhausted = this.scenario === "quota_exhausted";
    const nearLimit = this.scenario === "quota_near_limit";
    const records = (this.candidates.get(tenantKey()) || prospects).length;
    const standalone = tenantKey() === "user_standalone_trial_owner";
    return {
      period: "2026-08",
      accessMode: standalone ? "STANDALONE" : "SHONGRE_PRO",
      planName: standalone
        ? "Prospects Growth · Démo"
        : "Allocation Shongre Pro + Prospects — démonstration",
      discoveriesUsed: exhausted ? 500 : nearLimit ? 430 : 126,
      enrichmentsUsed: nearLimit ? 88 : 24,
      aiCreditsUsed: nearLimit ? 220 : 58,
      prospectRecords: records,
      outreachUsed: nearLimit ? 840 : 218,
      entitlements: {
        enabled: !expired,
        maxProspectRecords: standalone ? 2_000 : 500,
        monthlyDiscoveries: standalone ? 500 : 150,
        monthlyEnrichments: 100,
        monthlyAiCredits: 250,
        seats: 5,
        savedLists: 20,
        activeCampaigns: 5,
        monthlyOutreach: 1_000,
        sourceIntegrations: 3,
        advancedFilters: true,
        exports: true,
        apiAccess: false,
        webhooks: false,
        analyticsLevel: "ADVANCED",
        retentionDays: 365,
        auditRetentionDays: 730,
        customAiTemplates: false,
        shongreConversionTools: true,
        internalFirstPartyAccess: false,
      },
      status: expired
        ? "EXPIRED"
        : exhausted
          ? "EXHAUSTED"
          : nearLimit
            ? "NEAR_LIMIT"
            : "AVAILABLE",
    };
  }
}

export const demoCrmProspectingService: CrmProspectingServiceContract =
  new DemoProspectingService("prospects_default", { crm: demoCrmService });
