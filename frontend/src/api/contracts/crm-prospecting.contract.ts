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

export type ProspectingDemoScenario =
  | "prospects_default"
  | "empty_discovery"
  | "discovery_error"
  | "duplicates_found"
  | "ai_unavailable"
  | "quota_near_limit"
  | "quota_exhausted"
  | "source_disconnected"
  | "subscription_expired"
  | "permission_denied";

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
