import type {
  ModerationAppeal,
  ModerationCaseStatus,
  ModerationServiceContract,
  OwnModerationCase,
} from "../../contracts/moderation.contract";
import { httpClient } from "./http-client";

export class HttpModerationService implements ModerationServiceContract {
  async listOwnCases(_userId: string): Promise<OwnModerationCase[]> {
    const response = await httpClient.get<{ items: OwnModerationCase[] }>(
      "/moderation/cases/mine",
    );
    return response.items;
  }

  async listOwnAppeals(_userId: string): Promise<ModerationAppeal[]> {
    const response = await httpClient.get<{ items: ModerationAppeal[] }>(
      "/moderation/appeals/mine",
    );
    return response.items;
  }

  async submitAppeal(
    caseId: string,
    _userId: string,
    reason: string,
  ): Promise<ModerationAppeal> {
    return httpClient.post<ModerationAppeal>(
      `/moderation/cases/${encodeURIComponent(caseId)}/appeals`,
      { reason },
    );
  }

  async listCases(status?: ModerationCaseStatus): Promise<OwnModerationCase[]> {
    const response = await httpClient.get<{ items: OwnModerationCase[] }>(
      "/admin/moderation/cases",
      { params: { status } },
    );
    return response.items;
  }

  async listAppeals(
    status?: ModerationAppeal["status"],
  ): Promise<ModerationAppeal[]> {
    const response = await httpClient.get<{ items: ModerationAppeal[] }>(
      "/admin/moderation/appeals",
      { params: { status } },
    );
    return response.items;
  }

  async decideAppeal(
    appealId: string,
    decision: "upheld" | "overturned" | "rejected",
    reason: string,
  ): Promise<ModerationAppeal> {
    return httpClient.post<ModerationAppeal>(
      `/admin/moderation/appeals/${encodeURIComponent(appealId)}/decision`,
      { decision, reason },
    );
  }
}

export const httpModerationService = new HttpModerationService();
