export type ModerationCaseStatus =
  | "open"
  | "triaged"
  | "under_review"
  | "actioned"
  | "dismissed"
  | "appealed"
  | "closed";

export interface OwnModerationCase {
  id: string;
  targetType: "listing" | "user" | "delivery_request";
  deliveryRequestId?: string;
  category: string;
  status: ModerationCaseStatus;
  resolutionAction?: "dismiss" | "remove_listing" | "ban_user";
  resolutionReason?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ModerationAppeal {
  id: string;
  caseId: string;
  appellantId: string;
  reason: string;
  status:
    | "submitted"
    | "under_review"
    | "upheld"
    | "overturned"
    | "rejected"
    | "withdrawn";
  decisionReason?: string;
  reviewedBy?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface ModerationServiceContract {
  submitReport(input: {
    listingId?: string;
    reportedUserId?: string;
    deliveryRequestId?: string;
    reason: "fraud" | "counterfeit" | "prohibited" | "harassment" | "other";
    details: string;
  }): Promise<{ id: string; status: "pending" }>;
  listOwnCases(userId: string): Promise<OwnModerationCase[]>;
  listOwnAppeals(userId: string): Promise<ModerationAppeal[]>;
  submitAppeal(
    caseId: string,
    userId: string,
    reason: string,
  ): Promise<ModerationAppeal>;
  listCases(status?: ModerationCaseStatus): Promise<OwnModerationCase[]>;
  listAppeals(status?: ModerationAppeal["status"]): Promise<ModerationAppeal[]>;
  decideAppeal(
    appealId: string,
    decision: "upheld" | "overturned" | "rejected",
    reason: string,
  ): Promise<ModerationAppeal>;
}
