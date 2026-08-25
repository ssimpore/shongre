export interface ProspectResearchQuery {
  naturalLanguageQuery: string;
  marketCode?: string;
  region?: string;
  taxonomySlugs?: string[];
  industry?: string;
  requireWebsite?: boolean;
  limit?: number;
}

export interface ProspectSource {
  id: string;
  url: string;
  title: string;
  snippet?: string;
  sourceType: string;
  retrievedAt: string;
}

export interface ProspectResearchCandidate {
  id: string;
  company: {
    name: string;
    website?: string;
    domain?: string;
    location?: string;
    industry?: string;
    description?: string;
    estimatedSize?: string;
  };
  suggestedTaxonomySlugs?: string[];
  fit: {
    score: number;
    level: "high" | "medium" | "low";
    reasons: string[];
    caveats?: string[];
  };
  sources: ProspectSource[];
  possibleExistingEntityId?: string;
  isDuplicate?: boolean;
  status: "discovered" | "imported" | "dismissed";
}

export interface ProspectResearchResult {
  query: ProspectResearchQuery;
  candidates: ProspectResearchCandidate[];
  totalFound: number;
  researchedAt: string;
}

export interface CompanyEnrichmentDiff {
  companyId: string;
  suggestedIndustry?: string;
  suggestedWebsite?: string;
  suggestedCatalogSize?: number;
  suggestedSummary?: string;
  suggestedTaxonomySlugs?: string[];
  sources: ProspectSource[];
}

export interface CrmProspectingServiceContract {
  searchProspects(query: ProspectResearchQuery): Promise<ProspectResearchResult>;
  enrichCompany(companyId: string): Promise<CompanyEnrichmentDiff>;
}
