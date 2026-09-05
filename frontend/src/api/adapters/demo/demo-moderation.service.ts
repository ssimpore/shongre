import type {
  ModerationAppeal,
  ModerationCaseStatus,
  ModerationServiceContract,
  OwnModerationCase,
} from "../../contracts/moderation.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { deterministicRuntimeId } from "../../../utilities/deterministic-id";
import { requireDemoCapability } from "./demo-authorization";

export class DemoModerationService implements ModerationServiceContract {
  private readonly cases: OwnModerationCase[] = [
    {
      id: "case_demo_actioned",
      targetType: "listing",
      category: "counterfeit",
      status: "actioned",
      resolutionAction: "remove_listing",
      resolutionReason:
        "L’annonce a été retirée après examen des informations disponibles.",
      resolvedAt: "2026-08-24T09:00:00.000Z",
      createdAt: "2026-08-23T09:00:00.000Z",
    },
  ];
  private readonly appeals: ModerationAppeal[] = [];

  async submitReport(input: {
    listingId?: string;
    reportedUserId?: string;
    deliveryRequestId?: string;
    reason: "fraud" | "counterfeit" | "prohibited" | "harassment" | "other";
    details: string;
  }): Promise<{ id: string; status: "pending" }> {
    await simulateNetworkDelay();
    requireDemoCapability("report.create");
    if (input.details.trim().length < 10)
      throw new Error("Le signalement est incomplet.");
    const targetType = input.listingId
      ? "listing"
      : input.deliveryRequestId
        ? "delivery_request"
        : "user";
    const id = deterministicRuntimeId("moderation-case", [
      targetType,
      input.listingId ?? input.reportedUserId ?? input.deliveryRequestId ?? "",
      input.reason,
    ]);
    if (!this.cases.some((moderationCase) => moderationCase.id === id)) {
      this.cases.push({
        id,
        targetType,
        deliveryRequestId: input.deliveryRequestId,
        category: input.reason,
        status: "open",
        createdAt: new Date().toISOString(),
      });
    }
    return { id, status: "pending" };
  }

  async listOwnCases(_userId: string): Promise<OwnModerationCase[]> {
    await simulateNetworkDelay();
    requireDemoCapability("report.create");
    return this.cases.map((item) => ({ ...item }));
  }

  async listOwnAppeals(userId: string): Promise<ModerationAppeal[]> {
    await simulateNetworkDelay();
    requireDemoCapability("report.create");
    return this.appeals
      .filter((item) => item.appellantId === userId)
      .map((item) => ({ ...item }));
  }

  async submitAppeal(
    caseId: string,
    userId: string,
    reason: string,
  ): Promise<ModerationAppeal> {
    await simulateNetworkDelay();
    requireDemoCapability("report.create");
    const target = this.cases.find((item) => item.id === caseId);
    if (!target || target.status !== "actioned")
      throw new Error("Ce dossier n’est plus éligible à un recours.");
    const appeal: ModerationAppeal = {
      id: deterministicRuntimeId("appeal", [caseId, userId]),
      caseId,
      appellantId: userId,
      reason,
      status: "submitted",
      submittedAt: new Date().toISOString(),
    };
    this.appeals.push(appeal);
    target.status = "appealed";
    return { ...appeal };
  }

  async listCases(status?: ModerationCaseStatus): Promise<OwnModerationCase[]> {
    await simulateNetworkDelay();
    requireDemoCapability("moderation.review");
    return this.cases
      .filter((item) => !status || item.status === status)
      .map((item) => ({ ...item }));
  }

  async listAppeals(
    status?: ModerationAppeal["status"],
  ): Promise<ModerationAppeal[]> {
    await simulateNetworkDelay();
    requireDemoCapability("moderation.review");
    return this.appeals
      .filter((item) => !status || item.status === status)
      .map((item) => ({ ...item }));
  }

  async decideAppeal(
    appealId: string,
    decision: "upheld" | "overturned" | "rejected",
    reason: string,
  ): Promise<ModerationAppeal> {
    await simulateNetworkDelay();
    requireDemoCapability("moderation.action");
    const appeal = this.appeals.find((item) => item.id === appealId);
    if (!appeal || !["submitted", "under_review"].includes(appeal.status))
      throw new Error("Ce recours a déjà été traité.");
    appeal.status = decision;
    appeal.decisionReason = reason;
    appeal.reviewedAt = new Date().toISOString();
    return { ...appeal };
  }
}

export const demoModerationService = new DemoModerationService();
