import type {
  CompanyEnrichmentDiff,
  CrmProspectingServiceContract,
  ProspectResearchQuery,
  ProspectResearchResult,
} from "../../contracts/crm-prospecting.contract";

/**
 * AI prospecting is intentionally unavailable until its reviewed backend
 * orchestration endpoint is enabled. API mode must fail closed rather than run
 * browser-side provider calls or silently substitute demo research.
 */
export class HttpCrmProspectingService implements CrmProspectingServiceContract {
  async searchProspects(_query: ProspectResearchQuery): Promise<ProspectResearchResult> {
    throw new Error("La prospection IA doit être configurée côté serveur avant utilisation.");
  }

  async enrichCompany(_companyId: string): Promise<CompanyEnrichmentDiff> {
    throw new Error("L’enrichissement IA doit être configuré côté serveur avant utilisation.");
  }
}

export const httpCrmProspectingService = new HttpCrmProspectingService();
