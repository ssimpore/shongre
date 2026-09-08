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
import { apiOperation } from "./generated-api-operation";
import {
  leadSourceDefinitionSchema,
  prospectDiscoveryResultSchema,
  prospectImportResultSchema,
  prospectOpportunityBriefSchema,
  prospectingProfileSchema,
  prospectingUsageSchema,
} from "@shongre/contracts/prospecting";
import { z } from "zod";

const profileListSchema = z.object({
  items: z.array(prospectingProfileSchema),
});
const sourceListSchema = z.object({
  items: z.array(leadSourceDefinitionSchema),
});

/** Live adapter for the canonical CRM prospecting OpenAPI operations. */
export class HttpCrmProspectingService implements CrmProspectingServiceContract {
  async listProfiles(): Promise<ProspectingProfile[]> {
    const response = await apiOperation<unknown, "listProspectingProfiles">(
      "listProspectingProfiles",
      {},
    );
    return profileListSchema.parse(response).items;
  }
  async createProfile(
    input: ProspectingProfileInput,
  ): Promise<ProspectingProfile> {
    return prospectingProfileSchema.parse(
      await apiOperation<unknown, "createProspectingProfile">(
        "createProspectingProfile",
        { body: input },
      ),
    );
  }
  async listSources(marketCode: string): Promise<LeadSourceDefinition[]> {
    const response = await apiOperation<unknown, "listProspectingSources">(
      "listProspectingSources",
      { query: { marketCode } },
    );
    return sourceListSchema.parse(response).items;
  }
  async discover(
    input: ProspectDiscoveryRequest,
  ): Promise<ProspectDiscoveryResult> {
    return prospectDiscoveryResultSchema.parse(
      await apiOperation<unknown, "discoverProspects">("discoverProspects", {
        body: input,
      }),
    );
  }
  async getOpportunityBrief(
    candidateId: string,
  ): Promise<ProspectOpportunityBrief> {
    return prospectOpportunityBriefSchema.parse(
      await apiOperation<unknown, "getProspectOpportunityBrief">(
        "getProspectOpportunityBrief",
        { path: { candidateId: candidateId } },
      ),
    );
  }
  async importCandidate(
    input: ProspectImportRequest,
  ): Promise<ProspectImportResult> {
    return prospectImportResultSchema.parse(
      await apiOperation<unknown, "importProspectCandidate">(
        "importProspectCandidate",
        { body: input },
      ),
    );
  }
  async getUsage(marketCode: string): Promise<ProspectingUsage> {
    return prospectingUsageSchema.parse(
      await apiOperation<unknown, "getProspectingUsage">(
        "getProspectingUsage",
        { query: { marketCode } },
      ),
    );
  }
}

export const httpCrmProspectingService = new HttpCrmProspectingService();
