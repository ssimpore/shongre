import type {
  LeadSourceDefinition,
  ProspectDiscoveryRequest,
  ProspectDiscoveryResult,
  ProspectImportRequest,
  ProspectImportResult,
  ProspectOpportunityBrief,
  ProspectingProfile,
  ProspectingProfileInput,
  ProspectingUsage,
} from "@shongre/contracts/prospecting";

/** Shared UI boundary for the standalone, Pro and internal entry points. */
export interface CrmProspectingServiceContract {
  listProfiles(): Promise<ProspectingProfile[]>;
  createProfile(input: ProspectingProfileInput): Promise<ProspectingProfile>;
  listSources(marketCode: string): Promise<LeadSourceDefinition[]>;
  discover(input: ProspectDiscoveryRequest): Promise<ProspectDiscoveryResult>;
  getOpportunityBrief(candidateId: string): Promise<ProspectOpportunityBrief>;
  importCandidate(input: ProspectImportRequest): Promise<ProspectImportResult>;
  getUsage(marketCode: string): Promise<ProspectingUsage>;
}

export type {
  LeadSourceDefinition,
  ProspectDiscoveryRequest,
  ProspectDiscoveryResult,
  ProspectImportRequest,
  ProspectImportResult,
  ProspectOpportunityBrief,
  ProspectingProfile,
  ProspectingProfileInput,
  ProspectingUsage,
};
