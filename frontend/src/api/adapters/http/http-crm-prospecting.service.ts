import type {
  CrmProspectingServiceContract,
  LeadSourceDefinition,
  ProspectDiscoveryRequest,
  ProspectDiscoveryResult,
  ProspectImportRequest,
  ProspectImportResult,
  ProspectOpportunityBrief,
  ProspectingProfile,
  ProspectingProfileInput,
  ProspectingUsage,
} from "../../contracts/crm-prospecting.contract";

function unavailable(): never {
  throw new Error(
    "L’adaptateur HTTP Shongre Prospects est réservé mais n’est pas activé dans le frontend. Utilisez le mode démo.",
  );
}

/** Future adapter kept fail-closed until frontend connectivity is authorized. */
export class HttpCrmProspectingService implements CrmProspectingServiceContract {
  async listProfiles(): Promise<ProspectingProfile[]> {
    return unavailable();
  }
  async createProfile(
    _input: ProspectingProfileInput,
  ): Promise<ProspectingProfile> {
    return unavailable();
  }
  async listSources(_marketCode: string): Promise<LeadSourceDefinition[]> {
    return unavailable();
  }
  async discover(
    _input: ProspectDiscoveryRequest,
  ): Promise<ProspectDiscoveryResult> {
    return unavailable();
  }
  async getOpportunityBrief(
    _candidateId: string,
  ): Promise<ProspectOpportunityBrief> {
    return unavailable();
  }
  async importCandidate(
    _input: ProspectImportRequest,
  ): Promise<ProspectImportResult> {
    return unavailable();
  }
  async getUsage(_marketCode: string): Promise<ProspectingUsage> {
    return unavailable();
  }
}

export const httpCrmProspectingService = new HttpCrmProspectingService();
