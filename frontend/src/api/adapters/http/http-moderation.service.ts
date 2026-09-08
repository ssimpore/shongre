import type {
  ModerationAppeal,
  ModerationCaseStatus,
  ModerationServiceContract,
  OwnModerationCase,
} from "../../contracts/moderation.contract";
import { apiOperation } from "./generated-api-operation";

export class HttpModerationService implements ModerationServiceContract {
  async submitReport(input: {
    listingId?: string;
    reportedUserId?: string;
    deliveryRequestId?: string;
    reason: "fraud" | "counterfeit" | "prohibited" | "harassment" | "other";
    details: string;
  }): Promise<{ id: string; status: "pending" }> {
    return apiOperation<{ id: string; status: "pending" }, "postReports">(
      "postReports",
      { body: input },
    );
  }

  async listOwnCases(_userId: string): Promise<OwnModerationCase[]> {
    const response = await apiOperation<
      { items: OwnModerationCase[] },
      "getOwnModerationCases"
    >("getOwnModerationCases", {});
    return response.items;
  }

  async listOwnAppeals(_userId: string): Promise<ModerationAppeal[]> {
    const response = await apiOperation<
      { items: ModerationAppeal[] },
      "getOwnModerationAppeals"
    >("getOwnModerationAppeals", {});
    return response.items;
  }

  async submitAppeal(
    caseId: string,
    _userId: string,
    reason: string,
  ): Promise<ModerationAppeal> {
    return apiOperation<ModerationAppeal, "postModerationCaseAppeal">(
      "postModerationCaseAppeal",
      { path: { caseId: caseId }, body: { reason } },
    );
  }

  async listCases(status?: ModerationCaseStatus): Promise<OwnModerationCase[]> {
    const response = await apiOperation<
      { items: OwnModerationCase[] },
      "getAdminModerationCases"
    >("getAdminModerationCases", { query: { status } });
    return response.items;
  }

  async listAppeals(
    status?: ModerationAppeal["status"],
  ): Promise<ModerationAppeal[]> {
    const response = await apiOperation<
      { items: ModerationAppeal[] },
      "getAdminModerationAppeals"
    >("getAdminModerationAppeals", { query: { status } });
    return response.items;
  }

  async decideAppeal(
    appealId: string,
    decision: "upheld" | "overturned" | "rejected",
    reason: string,
  ): Promise<ModerationAppeal> {
    return apiOperation<ModerationAppeal, "postAdminModerationAppealDecision">(
      "postAdminModerationAppealDecision",
      { path: { appealId: appealId }, body: { decision, reason } },
    );
  }
}

export const httpModerationService = new HttpModerationService();
