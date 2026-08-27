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
import {
  leadSourceDefinitionSchema,
  prospectDiscoveryResultSchema,
  prospectImportResultSchema,
  prospectOpportunityBriefSchema,
  prospectingProfileSchema,
  prospectingUsageSchema,
} from "@shongre/contracts/prospecting";
import { z } from "zod";
import { httpClient } from "./http-client";

const profileListSchema = z.object({
  items: z.array(prospectingProfileSchema),
});
const sourceListSchema = z.object({
  items: z.array(leadSourceDefinitionSchema),
});

/** Live adapter for the canonical CRM prospecting OpenAPI operations. */
export class HttpCrmProspectingService implements CrmProspectingServiceContract {
  async listProfiles(): Promise<ProspectingProfile[]> {
    const response = await httpClient.get<unknown>("/crm/prospecting/profiles");
    return profileListSchema.parse(response).items;
  }
  async createProfile(
    input: ProspectingProfileInput,
  ): Promise<ProspectingProfile> {
    return prospectingProfileSchema.parse(
      await httpClient.post<unknown>("/crm/prospecting/profiles", input),
    );
  }
  async listSources(marketCode: string): Promise<LeadSourceDefinition[]> {
    const response = await httpClient.get<unknown>("/crm/prospecting/sources", {
      params: { marketCode },
    });
    return sourceListSchema.parse(response).items;
  }
  async discover(
    input: ProspectDiscoveryRequest,
  ): Promise<ProspectDiscoveryResult> {
    return prospectDiscoveryResultSchema.parse(
      await httpClient.post<unknown>("/crm/prospecting/discover", input),
    );
  }
  async getOpportunityBrief(
    candidateId: string,
  ): Promise<ProspectOpportunityBrief> {
    return prospectOpportunityBriefSchema.parse(
      await httpClient.get<unknown>(
        `/crm/prospecting/candidates/${encodeURIComponent(candidateId)}/brief`,
      ),
    );
  }
  async importCandidate(
    input: ProspectImportRequest,
  ): Promise<ProspectImportResult> {
    return prospectImportResultSchema.parse(
      await httpClient.post<unknown>("/crm/prospecting/imports", input),
    );
  }
  async getUsage(marketCode: string): Promise<ProspectingUsage> {
    return prospectingUsageSchema.parse(
      await httpClient.get<unknown>("/crm/prospecting/usage", {
        params: { marketCode },
      }),
    );
  }
}

export const httpCrmProspectingService = new HttpCrmProspectingService();
