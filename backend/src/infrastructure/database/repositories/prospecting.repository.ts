import { createHash, randomUUID } from "node:crypto";
import type {
  LeadSourceDefinition,
  ProspectCandidate,
  ProspectDiscoveryFilters,
  ProspectImportResult,
  ProspectOpportunityBrief,
  ProspectingProfile,
  ProspectingProfileInput,
} from "@shongre/contracts/prospecting";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import type { CrmTenantContext } from "./crm.repository.js";
import { databaseFailure } from "./repository-error.js";

export type ProspectUsageType =
  | "DISCOVERY"
  | "ENRICHMENT"
  | "AI_INPUT"
  | "AI_OUTPUT"
  | "OUTREACH"
  | "EXPORT"
  | "API_REQUEST";

export interface ProspectUsageCounts {
  discoveries: number;
  enrichments: number;
  aiCredits: number;
  outreach: number;
  records: number;
}

export interface IProspectingRepository {
  listProfiles(tenantId: string): Promise<ProspectingProfile[]>;
  createProfile(
    context: CrmTenantContext,
    actorId: string,
    input: ProspectingProfileInput,
  ): Promise<ProspectingProfile>;
  listSources(marketCode: string): Promise<LeadSourceDefinition[]>;
  saveDiscovery(input: {
    context: CrmTenantContext;
    actorId: string;
    operatingContext: ProspectingProfileInput["context"];
    filters: ProspectDiscoveryFilters;
    sourceIds: string[];
    candidates: ProspectCandidate[];
    idempotencyKey: string;
  }): Promise<ProspectCandidate[]>;
  getCandidate(
    tenantId: string,
    candidateId: string,
  ): Promise<ProspectCandidate | null>;
  getImportResult(
    tenantId: string,
    idempotencyKey: string,
  ): Promise<ProspectImportResult | null>;
  recordImport(input: {
    tenantId: string;
    actorId: string;
    candidateId: string;
    crmAccountId: string;
    evidenceIds: string[];
    idempotencyKey: string;
    importedAt: string;
  }): Promise<ProspectImportResult>;
  recordOpportunityBrief(input: {
    tenantId: string;
    candidateId: string;
    marketCode: string;
    providerConnectionId?: string;
    providerId?: string;
    brief: ProspectOpportunityBrief;
    status: "SUCCEEDED" | "RULE_FALLBACK";
    correlationId: string;
    inputUnits?: number;
    outputUnits?: number;
  }): Promise<void>;
  getUsage(
    tenantId: string,
    accountId: string,
    marketCode: string,
    period: string,
  ): Promise<ProspectUsageCounts>;
  recordUsage(input: {
    tenantId: string;
    accountId: string;
    marketCode: string;
    type: ProspectUsageType;
    units: number;
    periodStart: string;
    periodEnd: string;
    idempotencyKey: string;
    correlationId: string;
    metadata?: Record<string, string | number | boolean>;
  }): Promise<void>;
}

const DEMO_NOW = "2026-08-15T10:00:00.000Z";

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Stable tenant-scoped UUID for source records whose provider IDs are global. */
function deterministicUuid(value: unknown): string {
  const hash = sha256(value);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${((Number.parseInt(hash[16], 16) & 3) | 8).toString(16)}${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const demoSources: LeadSourceDefinition[] = [
  {
    id: "demo_authorized_registry",
    providerId: "demo_local",
    name: "Registre professionnel de démonstration",
    category: "OFFICIAL_REGISTRY",
    description:
      "Jeu local déterministe représentant un registre déjà autorisé. Aucun appel externe n’est effectué.",
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
    lastHealthCheckAt: DEMO_NOW,
  },
  {
    id: "csv_import",
    providerId: "shongre_internal",
    name: "Import CSV ou tableur",
    category: "USER_PROVIDED",
    description:
      "Fichiers appartenant au tenant, neutralisés contre les formules de tableur.",
    supportedMarketCodes: ["FR", "BE", "SN", "BF"],
    operations: ["IMPORT", "REFRESH", "DELETE"],
    restrictions: {
      permittedContexts: ["INTERNAL_SHONGRE", "SUBSCRIBER"],
      permittedUses: ["Import de données professionnelles avec provenance"],
      prohibitedUses: ["Liste sans preuve de provenance"],
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
    lastHealthCheckAt: DEMO_NOW,
  },
  {
    id: "official_registry_contract",
    providerId: "official_registry",
    name: "Registre officiel par marché",
    category: "OFFICIAL_REGISTRY",
    description:
      "Contrat réservé aux API et jeux de données approuvés par marché.",
    supportedMarketCodes: ["FR", "BE", "SN", "BF"],
    operations: ["SEARCH", "ENRICHMENT", "REFRESH", "DELETE"],
    restrictions: {
      permittedContexts: ["INTERNAL_SHONGRE", "SUBSCRIBER"],
      permittedUses: ["Recherche B2B selon la licence du marché"],
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
    healthMessage: "Aucun fournisseur de registre de production n’est activé.",
    dataFreshnessLabel: "À déclarer par l’adaptateur de marché",
  },
];

export class DemoProspectingRepository implements IProspectingRepository {
  private readonly profilesByTenant = new Map<string, ProspectingProfile[]>();
  private readonly candidatesByTenant = new Map<string, ProspectCandidate[]>();
  private readonly importsByTenant = new Map<string, ProspectImportResult[]>();
  private readonly usage = new Map<string, ProspectUsageCounts>();

  async listProfiles(tenantId: string): Promise<ProspectingProfile[]> {
    return structuredClone(this.profilesByTenant.get(tenantId) ?? []);
  }

  async createProfile(
    context: CrmTenantContext,
    _actorId: string,
    input: ProspectingProfileInput,
  ): Promise<ProspectingProfile> {
    const current = this.profilesByTenant.get(context.tenantId) ?? [];
    const value: ProspectingProfile = {
      id: randomUUID(),
      ...input,
      version: 1,
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    this.profilesByTenant.set(context.tenantId, [value, ...current]);
    return structuredClone(value);
  }

  async listSources(marketCode: string): Promise<LeadSourceDefinition[]> {
    return structuredClone(
      demoSources.filter((source) =>
        source.supportedMarketCodes.includes(marketCode),
      ),
    );
  }

  async saveDiscovery(input: {
    context: CrmTenantContext;
    candidates: ProspectCandidate[];
  }): Promise<ProspectCandidate[]> {
    const current = this.candidatesByTenant.get(input.context.tenantId) ?? [];
    const merged = [...input.candidates];
    for (const candidate of current) {
      if (!merged.some((item) => item.company.id === candidate.company.id))
        merged.push(candidate);
    }
    this.candidatesByTenant.set(input.context.tenantId, merged);
    return structuredClone(input.candidates);
  }

  async getCandidate(tenantId: string, candidateId: string) {
    const candidate = (this.candidatesByTenant.get(tenantId) ?? []).find(
      (item) => item.company.id === candidateId,
    );
    return structuredClone(candidate ?? null);
  }

  async getImportResult(tenantId: string, idempotencyKey: string) {
    return structuredClone(
      (this.importsByTenant.get(tenantId) ?? []).find(
        (item) =>
          (item as ProspectImportResult & { key?: string }).key ===
          idempotencyKey,
      ) ?? null,
    );
  }

  async recordImport(input: {
    tenantId: string;
    candidateId: string;
    crmAccountId: string;
    idempotencyKey: string;
    importedAt: string;
  }): Promise<ProspectImportResult> {
    const existing = await this.getImportResult(
      input.tenantId,
      input.idempotencyKey,
    );
    if (existing) return existing;
    const value: ProspectImportResult & { key: string } = {
      key: input.idempotencyKey,
      companyId: input.candidateId,
      crmAccountId: input.crmAccountId,
      duplicateDetected: false,
      importedAt: input.importedAt,
      provenancePreserved: true,
    };
    this.importsByTenant.set(input.tenantId, [
      value,
      ...(this.importsByTenant.get(input.tenantId) ?? []),
    ]);
    return structuredClone(value);
  }

  async recordOpportunityBrief(_input: {
    tenantId: string;
    candidateId: string;
    marketCode: string;
    brief: ProspectOpportunityBrief;
    status: "SUCCEEDED" | "RULE_FALLBACK";
    correlationId: string;
  }): Promise<void> {
    return;
  }

  async getUsage(
    tenantId: string,
    accountId: string,
    marketCode: string,
    period: string,
  ): Promise<ProspectUsageCounts> {
    const key = `${tenantId}:${accountId}:${marketCode}:${period}`;
    const counts = this.usage.get(key) ?? {
      discoveries: 0,
      enrichments: 0,
      aiCredits: 0,
      outreach: 0,
      records: (this.candidatesByTenant.get(tenantId) ?? []).length,
    };
    return structuredClone(counts);
  }

  async recordUsage(input: {
    tenantId: string;
    accountId: string;
    marketCode: string;
    type: ProspectUsageType;
    units: number;
    periodStart: string;
  }): Promise<void> {
    const period = input.periodStart.slice(0, 7);
    const key = `${input.tenantId}:${input.accountId}:${input.marketCode}:${period}`;
    const current = await this.getUsage(
      input.tenantId,
      input.accountId,
      input.marketCode,
      period,
    );
    if (input.type === "DISCOVERY") current.discoveries += input.units;
    if (input.type === "ENRICHMENT") current.enrichments += input.units;
    if (input.type === "AI_INPUT" || input.type === "AI_OUTPUT")
      current.aiCredits += input.units;
    if (input.type === "OUTREACH") current.outreach += input.units;
    current.records = (
      this.candidatesByTenant.get(input.tenantId) ?? []
    ).length;
    this.usage.set(key, current);
  }
}

function mapProfile(row: any, markets: string[]): ProspectingProfile {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    context: row.operating_context,
    marketCodes: markets,
    locale: row.locale,
    currency: row.currency,
    timezone: row.timezone,
    geographicAreas: row.geographic_areas ?? [],
    radiusKm: row.radius_km ?? undefined,
    industries: row.industries ?? [],
    taxonomySlugs: row.taxonomy_slugs ?? [],
    companyTypes: row.company_types ?? [],
    estimatedSizeMin: row.estimated_size_min ?? undefined,
    estimatedSizeMax: row.estimated_size_max ?? undefined,
    businessMaturity: row.business_maturity ?? [],
    onlinePresence: row.online_presence ?? [],
    targetRoles: row.target_roles ?? [],
    fitRules: row.fit_rules ?? [],
    exclusionRules: row.exclusion_rules ?? [],
    requiredSignals: row.required_signals ?? [],
    optionalSignals: row.optional_signals ?? [],
    isDefault: Boolean(row.is_default),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSource(row: any): LeadSourceDefinition {
  return {
    id: row.id,
    providerId: row.provider_id,
    name: row.name,
    category: row.category,
    description: row.description,
    supportedMarketCodes: (row.market_availability ?? []).map(
      (item: any) => item.market_code,
    ),
    operations: row.operations,
    restrictions: {
      permittedContexts: row.permitted_contexts,
      permittedUses: row.permitted_uses,
      prohibitedUses: row.prohibited_uses ?? [],
      mayStoreProfessionalContacts: Boolean(
        row.may_store_professional_contacts,
      ),
      requiresAttribution: Boolean(row.requires_attribution),
      attributionText: row.attribution_text ?? undefined,
      termsReference: row.terms_reference ?? undefined,
      licenseReference: row.license_reference ?? undefined,
      retentionDays: row.retention_days ?? undefined,
      refreshAfterDays: row.refresh_after_days ?? undefined,
      deletionMode: row.deletion_mode,
      rateLimitPerMinute: row.rate_limit_per_minute ?? undefined,
      requiresLegalApproval: Boolean(row.requires_legal_approval),
      requiresCommercialApproval: Boolean(row.requires_commercial_approval),
    },
    lifecycle: row.lifecycle,
    healthMessage: row.health_message,
    dataFreshnessLabel: row.data_freshness_label,
    lastHealthCheckAt: row.last_health_check_at ?? undefined,
  };
}

export class PostgresProspectingRepository implements IProspectingRepository {
  private get client(): any {
    return getSupabaseAdminClient() as any;
  }

  private async query<T>(
    operation: string,
    request: PromiseLike<{ data: T; error: unknown }>,
  ): Promise<T> {
    try {
      const { data, error } = await request;
      if (error) databaseFailure(operation, error);
      return data;
    } catch (error) {
      databaseFailure(operation, error);
    }
  }

  async listProfiles(tenantId: string): Promise<ProspectingProfile[]> {
    const rows: any[] = await this.query(
      "prospecting.listProfiles",
      this.client
        .from("crm_prospecting_profiles")
        .select("*,market_links:crm_prospecting_profile_markets(market_code)")
        .eq("tenant_id", tenantId)
        .is("archived_at", null)
        .order("updated_at", { ascending: false }),
    );
    return rows.map((row) =>
      mapProfile(
        row,
        (row.market_links ?? []).map((item: any) => item.market_code),
      ),
    );
  }

  async createProfile(
    context: CrmTenantContext,
    actorId: string,
    input: ProspectingProfileInput,
  ): Promise<ProspectingProfile> {
    const row: any = await this.query(
      "prospecting.createProfile",
      this.client
        .from("crm_prospecting_profiles")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          name: input.name,
          description: input.description,
          operating_context: input.context,
          locale: input.locale,
          currency: input.currency,
          timezone: input.timezone,
          geographic_areas: input.geographicAreas,
          radius_km: input.radiusKm,
          industries: input.industries,
          taxonomy_slugs: input.taxonomySlugs,
          company_types: input.companyTypes,
          estimated_size_min: input.estimatedSizeMin,
          estimated_size_max: input.estimatedSizeMax,
          business_maturity: input.businessMaturity,
          online_presence: input.onlinePresence,
          target_roles: input.targetRoles,
          fit_rules: input.fitRules,
          exclusion_rules: input.exclusionRules,
          required_signals: input.requiredSignals,
          optional_signals: input.optionalSignals,
          is_default: input.isDefault,
          created_by: actorId,
        })
        .select("*")
        .single(),
    );
    await this.query(
      "prospecting.createProfileMarkets",
      this.client.from("crm_prospecting_profile_markets").insert(
        input.marketCodes.map((marketCode) => ({
          tenant_id: context.tenantId,
          profile_id: row.id,
          market_code: marketCode,
        })),
      ),
    );
    return mapProfile(row, input.marketCodes);
  }

  async listSources(marketCode: string): Promise<LeadSourceDefinition[]> {
    const rows: any[] = await this.query(
      "prospecting.listSources",
      this.client
        .from("crm_prospect_source_catalog")
        .select(
          "*,market_availability:crm_prospect_source_markets!inner(market_code,availability,legal_review_status,commercial_review_status)",
        )
        .eq("crm_prospect_source_markets.market_code", marketCode)
        .order("name"),
    );
    return rows.map((row) => {
      const market = row.market_availability?.[0];
      const active =
        market?.availability === "ACTIVE" &&
        ["APPROVED", "NOT_REQUIRED"].includes(market.legal_review_status) &&
        ["APPROVED", "NOT_REQUIRED"].includes(market.commercial_review_status);
      return mapSource({
        ...row,
        lifecycle: active ? row.lifecycle : "INACTIVE_REVIEW_REQUIRED",
      });
    });
  }

  async saveDiscovery(input: {
    context: CrmTenantContext;
    actorId: string;
    operatingContext: ProspectingProfileInput["context"];
    filters: ProspectDiscoveryFilters;
    sourceIds: string[];
    candidates: ProspectCandidate[];
    idempotencyKey: string;
  }): Promise<ProspectCandidate[]> {
    const run: any = await this.query(
      "prospecting.createDiscoveryRun",
      this.client
        .from("crm_prospect_discovery_runs")
        .upsert(
          {
            tenant_id: input.context.tenantId,
            workspace_id: input.context.workspaceId,
            profile_id: input.filters.profileId,
            requested_by: input.actorId,
            market_code: input.filters.marketCode,
            locale: input.filters.locale,
            currency: input.filters.currency,
            timezone: input.filters.timezone,
            operating_context: input.operatingContext,
            filters: input.filters,
            source_ids: input.sourceIds,
            status: "COMPLETED",
            result_count: input.candidates.length,
            idempotency_key: input.idempotencyKey,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,market_code,idempotency_key" },
        )
        .select("id")
        .single(),
    );
    const savedCandidates: ProspectCandidate[] = [];
    for (const candidate of input.candidates) {
      const company = candidate.company;
      const sourceFingerprint = sha256({
        marketCode: input.filters.marketCode,
        sourceIds: [...company.sourceIds].sort(),
        officialIdentifier: company.officialIdentifier,
        domain: company.domain?.trim().toLocaleLowerCase("en-US"),
        canonicalName: company.canonicalName.trim().toLocaleLowerCase("en-US"),
      });
      const candidateId = deterministicUuid({
        tenantId: input.context.tenantId,
        marketCode: input.filters.marketCode,
        sourceFingerprint,
      });
      const evidenceIdMap = new Map<string, string>();
      const normalizedEvidence = candidate.evidence.map((evidence) => {
        const sourceRecordId = evidence.url || evidence.id;
        const contentHash = sha256({
          sourceId: evidence.sourceId,
          sourceRecordId,
          title: evidence.title,
          excerpt: evidence.excerpt,
          observedAt: evidence.observedAt,
        });
        const id = deterministicUuid({
          tenantId: input.context.tenantId,
          sourceId: evidence.sourceId,
          sourceRecordId,
          contentHash,
        });
        evidenceIdMap.set(evidence.id, id);
        return { ...evidence, id, sourceRecordId, contentHash };
      });
      const remapEvidenceIds = (ids: string[]) =>
        ids.map((id) => evidenceIdMap.get(id) ?? id);
      const normalizedScore = {
        ...candidate.score,
        evidenceIds: remapEvidenceIds(candidate.score.evidenceIds),
        positiveFactors: candidate.score.positiveFactors.map((factor) => ({
          ...factor,
          evidenceIds: remapEvidenceIds(factor.evidenceIds),
        })),
        negativeFactors: candidate.score.negativeFactors.map((factor) => ({
          ...factor,
          evidenceIds: remapEvidenceIds(factor.evidenceIds),
        })),
      };
      const candidateRow: any = await this.query(
        "prospecting.saveCandidate",
        this.client
          .from("crm_prospect_candidates")
          .upsert(
            {
              id: candidateId,
              tenant_id: input.context.tenantId,
              workspace_id: input.context.workspaceId,
              discovery_run_id: run.id,
              crm_account_id: company.crmAccountId,
              canonical_name: company.canonicalName,
              legal_name: company.legalName,
              trading_name: company.tradingName,
              official_identifier_scheme: company.officialIdentifier?.scheme,
              official_identifier_value: company.officialIdentifier?.value,
              normalized_domain: company.domain,
              website: company.website,
              description: company.description,
              industry: company.industry,
              company_type: company.companyType,
              estimated_size: company.estimatedSize,
              market_code: input.filters.marketCode,
              country_code: company.countryCode,
              region: company.region,
              city: company.city,
              postal_code: company.postalCode,
              review_state: company.reviewState,
              duplicate_crm_account_id: company.duplicateOfCrmAccountId,
              source_fingerprint: sourceFingerprint,
              discovered_at: company.discoveredAt,
              refreshed_at: company.refreshedAt,
            },
            { onConflict: "tenant_id,market_code,source_fingerprint" },
          )
          .select("id")
          .single(),
      );
      await this.query(
        "prospecting.saveEvidence",
        this.client.from("crm_prospect_evidence").upsert(
          normalizedEvidence.map((evidence) => ({
            id: evidence.id,
            tenant_id: input.context.tenantId,
            candidate_id: candidateRow.id,
            source_id: evidence.sourceId,
            market_code: input.filters.marketCode,
            source_record_id: evidence.sourceRecordId,
            title: evidence.title,
            source_url: evidence.url,
            excerpt: evidence.excerpt,
            observed_at: evidence.observedAt,
            freshness: evidence.freshness,
            confidence: evidence.confidence,
            attribution_required: evidence.attributionRequired,
            content_hash: evidence.contentHash,
          })),
          { onConflict: "tenant_id,source_id,source_record_id,content_hash" },
        ),
      );
      await this.query(
        "prospecting.saveScore",
        this.client.from("crm_prospect_scores").upsert(
          {
            tenant_id: input.context.tenantId,
            candidate_id: candidateRow.id,
            market_code: input.filters.marketCode,
            total_score: normalizedScore.totalScore,
            fit_score: normalizedScore.fitScore,
            opportunity_score: normalizedScore.opportunityScore,
            data_confidence: normalizedScore.dataConfidence,
            positive_factors: normalizedScore.positiveFactors,
            negative_factors: normalizedScore.negativeFactors,
            missing_information: normalizedScore.missingInformation,
            evidence_ids: normalizedScore.evidenceIds,
            rule_version: normalizedScore.ruleVersion,
            model: normalizedScore.model,
            prompt_version: normalizedScore.promptVersion,
            confidence: normalizedScore.confidence,
            recommended_next_action: normalizedScore.recommendedNextAction,
            evaluated_at: normalizedScore.evaluatedAt,
          },
          {
            onConflict: "tenant_id,candidate_id,rule_version,evaluated_at",
            ignoreDuplicates: true,
          },
        ),
      );
      savedCandidates.push({
        ...candidate,
        company: { ...company, id: candidateRow.id },
        evidence: normalizedEvidence.map(
          ({
            sourceRecordId: _sourceRecordId,
            contentHash: _contentHash,
            ...evidence
          }) => evidence,
        ),
        score: normalizedScore,
      });
    }
    return savedCandidates;
  }

  async getCandidate(
    tenantId: string,
    candidateId: string,
  ): Promise<ProspectCandidate | null> {
    const rows: any[] = await this.query(
      "prospecting.getCandidate",
      this.client
        .from("crm_prospect_candidates")
        .select(
          "*,evidence:crm_prospect_evidence(*),scores:crm_prospect_scores(*)",
        )
        .eq("tenant_id", tenantId)
        .eq("id", candidateId)
        .limit(1),
    );
    const row = rows[0];
    if (!row) return null;
    const sourceIds = [
      ...new Set<string>(
        (row.evidence ?? []).map((item: any) => item.source_id),
      ),
    ];
    const sourceRows: any[] = sourceIds.length
      ? await this.query(
          "prospecting.getCandidateSources",
          this.client
            .from("crm_prospect_source_catalog")
            .select("id,category")
            .in("id", sourceIds),
        )
      : [];
    const sourceCategories = new Map(
      sourceRows.map((source) => [source.id, source.category]),
    );
    const evidence = (row.evidence ?? []).map((item: any) => ({
      id: item.id,
      sourceId: item.source_id,
      sourceCategory: sourceCategories.get(item.source_id) ?? "USER_PROVIDED",
      title: item.title,
      url: item.source_url ?? undefined,
      excerpt: item.excerpt ?? undefined,
      observedAt: item.observed_at,
      freshness: item.freshness,
      attributionRequired: Boolean(item.attribution_required),
      confidence: Number(item.confidence),
    }));
    const scoreRow = [...(row.scores ?? [])].sort((a, b) =>
      String(b.evaluated_at).localeCompare(String(a.evaluated_at)),
    )[0];
    if (!scoreRow) return null;
    return {
      company: {
        id: row.id,
        crmAccountId: row.crm_account_id ?? undefined,
        canonicalName: row.canonical_name,
        legalName: row.legal_name ?? undefined,
        tradingName: row.trading_name ?? undefined,
        officialIdentifier: row.official_identifier_value
          ? {
              marketCode: row.market_code,
              scheme: row.official_identifier_scheme,
              value: row.official_identifier_value,
            }
          : undefined,
        domain: row.normalized_domain ?? undefined,
        website: row.website ?? undefined,
        description: row.description ?? undefined,
        industry: row.industry ?? undefined,
        companyType: row.company_type ?? undefined,
        estimatedSize: row.estimated_size ?? undefined,
        marketCodes: [row.market_code],
        countryCode: row.country_code,
        region: row.region ?? undefined,
        city: row.city ?? undefined,
        postalCode: row.postal_code ?? undefined,
        sourceIds: [
          ...new Set<string>(
            evidence.map((item: { sourceId: string }) => item.sourceId),
          ),
        ],
        discoveredAt: row.discovered_at,
        refreshedAt: row.refreshed_at,
        reviewState: row.review_state,
        duplicateOfCrmAccountId: row.duplicate_crm_account_id ?? undefined,
      },
      evidence,
      score: {
        totalScore: scoreRow.total_score,
        fitScore: scoreRow.fit_score,
        opportunityScore: scoreRow.opportunity_score,
        dataConfidence: scoreRow.data_confidence,
        positiveFactors: scoreRow.positive_factors ?? [],
        negativeFactors: scoreRow.negative_factors ?? [],
        missingInformation: scoreRow.missing_information ?? [],
        evidenceIds: scoreRow.evidence_ids ?? [],
        ruleVersion: scoreRow.rule_version,
        model: scoreRow.model ?? undefined,
        promptVersion: scoreRow.prompt_version ?? undefined,
        confidence: Number(scoreRow.confidence),
        evaluatedAt: scoreRow.evaluated_at,
        recommendedNextAction: scoreRow.recommended_next_action,
      },
      status: row.crm_account_id ? "IMPORTED" : "DISCOVERED",
      humanReviewRequired: true,
    };
  }

  async recordOpportunityBrief(input: {
    tenantId: string;
    candidateId: string;
    marketCode: string;
    providerConnectionId?: string;
    providerId?: string;
    brief: ProspectOpportunityBrief;
    status: "SUCCEEDED" | "RULE_FALLBACK";
    correlationId: string;
    inputUnits?: number;
    outputUnits?: number;
  }): Promise<void> {
    await this.query(
      "prospecting.recordOpportunityBrief",
      this.client.from("crm_prospect_ai_insights").insert({
        tenant_id: input.tenantId,
        candidate_id: input.candidateId,
        market_code: input.marketCode,
        task: "OPPORTUNITY_BRIEF",
        provider_connection_id: input.providerConnectionId,
        provider_id: input.providerId,
        model: input.brief.model,
        prompt_version: input.brief.promptVersion,
        rule_version: input.brief.score.ruleVersion,
        summary: input.brief.summary,
        confidence: input.brief.score.confidence,
        evidence_ids: input.brief.evidence.map((item) => item.id),
        missing_information: input.brief.missingInformation,
        status: input.status,
        correlation_id: input.correlationId,
        input_units: input.inputUnits,
        output_units: input.outputUnits,
        generated_at: input.brief.generatedAt,
      }),
    );
  }

  async getImportResult(tenantId: string, idempotencyKey: string) {
    const rows: any[] = await this.query(
      "prospecting.getImportCommand",
      this.client
        .from("crm_prospect_import_commands")
        .select("candidate_id,crm_account_id,imported_at")
        .eq("tenant_id", tenantId)
        .eq("idempotency_key", idempotencyKey)
        .limit(1),
    );
    const row = rows[0];
    return row
      ? {
          companyId: row.candidate_id,
          crmAccountId: row.crm_account_id,
          duplicateDetected: false,
          importedAt: row.imported_at,
          provenancePreserved: true as const,
        }
      : null;
  }

  async recordImport(input: {
    tenantId: string;
    actorId: string;
    candidateId: string;
    crmAccountId: string;
    evidenceIds: string[];
    idempotencyKey: string;
    importedAt: string;
  }): Promise<ProspectImportResult> {
    const existing = await this.getImportResult(
      input.tenantId,
      input.idempotencyKey,
    );
    if (existing) return existing;
    await this.query(
      "prospecting.recordImport",
      this.client.from("crm_prospect_import_commands").insert({
        tenant_id: input.tenantId,
        candidate_id: input.candidateId,
        crm_account_id: input.crmAccountId,
        idempotency_key: input.idempotencyKey,
        review_decision: "APPROVED",
        evidence_ids: input.evidenceIds,
        imported_by: input.actorId,
        imported_at: input.importedAt,
      }),
    );
    await this.query(
      "prospecting.markCandidateImported",
      this.client
        .from("crm_prospect_candidates")
        .update({
          crm_account_id: input.crmAccountId,
          review_state: "APPROVED",
        })
        .eq("tenant_id", input.tenantId)
        .eq("id", input.candidateId),
    );
    return {
      companyId: input.candidateId,
      crmAccountId: input.crmAccountId,
      duplicateDetected: false,
      importedAt: input.importedAt,
      provenancePreserved: true,
    };
  }

  async getUsage(
    tenantId: string,
    accountId: string,
    marketCode: string,
    period: string,
  ): Promise<ProspectUsageCounts> {
    const start = `${period}-01T00:00:00.000Z`;
    const end = new Date(`${period}-01T00:00:00.000Z`);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const [ledger, records]: [any[], any[]] = await Promise.all([
      this.query<any[]>(
        "prospecting.getUsageLedger",
        this.client
          .from("crm_prospect_usage_ledger")
          .select("usage_type,units")
          .eq("tenant_id", tenantId)
          .eq("account_id", accountId)
          .eq("market_code", marketCode)
          .gte("period_start", start)
          .lt("period_start", end.toISOString()),
      ),
      this.query<any[]>(
        "prospecting.countCandidates",
        this.client
          .from("crm_prospect_candidates")
          .select("id")
          .eq("tenant_id", tenantId)
          .eq("market_code", marketCode),
      ) as any,
    ]);
    const total = (type: ProspectUsageType) =>
      ledger
        .filter((item) => item.usage_type === type)
        .reduce((sum, item) => sum + Number(item.units), 0);
    return {
      discoveries: total("DISCOVERY"),
      enrichments: total("ENRICHMENT"),
      aiCredits: total("AI_INPUT") + total("AI_OUTPUT"),
      outreach: total("OUTREACH"),
      records: records.length,
    };
  }

  async recordUsage(input: {
    tenantId: string;
    accountId: string;
    marketCode: string;
    type: ProspectUsageType;
    units: number;
    periodStart: string;
    periodEnd: string;
    idempotencyKey: string;
    correlationId: string;
    metadata?: Record<string, string | number | boolean>;
  }): Promise<void> {
    await this.query(
      "prospecting.recordUsage",
      this.client.from("crm_prospect_usage_ledger").upsert(
        {
          tenant_id: input.tenantId,
          account_id: input.accountId,
          market_code: input.marketCode,
          usage_type: input.type,
          units: input.units,
          period_start: input.periodStart,
          period_end: input.periodEnd,
          idempotency_key: input.idempotencyKey,
          correlation_id: input.correlationId,
          safe_metadata: input.metadata ?? {},
        },
        {
          onConflict: "tenant_id,market_code,usage_type,idempotency_key",
          ignoreDuplicates: true,
        },
      ),
    );
  }
}
