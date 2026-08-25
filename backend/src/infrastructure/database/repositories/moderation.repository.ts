import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { databaseFailure } from "./repository-error.js";

export type ModerationCaseStatus =
  | "open"
  | "triaged"
  | "under_review"
  | "actioned"
  | "dismissed"
  | "appealed"
  | "closed";

export interface ModerationCaseRecord {
  id: string;
  reportId: string;
  targetType: "listing" | "user";
  listingId?: string;
  reportedUserId?: string;
  affectedUserId?: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  status: ModerationCaseStatus;
  resolutionAction?: "dismiss" | "remove_listing" | "ban_user";
  resolutionReason?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModerationAppealRecord {
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

export type OwnModerationCaseRecord = Pick<
  ModerationCaseRecord,
  | "id"
  | "targetType"
  | "category"
  | "status"
  | "resolutionAction"
  | "resolutionReason"
  | "resolvedAt"
  | "createdAt"
>;

export interface IModerationRepository {
  createCaseForReport(input: {
    reportId: string;
    reporterId: string;
    listingId?: string;
    reportedUserId?: string;
    category: string;
  }): Promise<void>;
  listCases(status?: ModerationCaseStatus): Promise<ModerationCaseRecord[]>;
  listOwnCases(userId: string): Promise<OwnModerationCaseRecord[]>;
  resolveCase(input: {
    reportId: string;
    actorId: string;
    action: "dismiss" | "remove_listing" | "ban_user";
    reason: string;
  }): Promise<ModerationCaseRecord>;
  submitAppeal(input: {
    caseId: string;
    appellantId: string;
    reason: string;
  }): Promise<ModerationAppealRecord>;
  listAppeals(input?: {
    appellantId?: string;
    status?: ModerationAppealRecord["status"];
  }): Promise<ModerationAppealRecord[]>;
  decideAppeal(input: {
    appealId: string;
    reviewerId: string;
    decision: "upheld" | "overturned" | "rejected";
    reason: string;
  }): Promise<ModerationAppealRecord>;
}

const demoCreatedAt = "2026-08-25T08:00:00.000Z";

export class DemoModerationRepository implements IModerationRepository {
  private cases = new Map<string, ModerationCaseRecord>();
  private appeals = new Map<string, ModerationAppealRecord>();

  constructor() {
    this.reset();
  }

  reset(): void {
    this.cases.clear();
    this.appeals.clear();
    this.cases.set("case_demo_1", {
      id: "case_demo_1",
      reportId: "rep_1",
      targetType: "listing",
      listingId: "list_1",
      affectedUserId: "user_camille",
      category: "counterfeit",
      severity: "high",
      status: "open",
      createdAt: demoCreatedAt,
      updatedAt: demoCreatedAt,
    });
  }

  async createCaseForReport(input: {
    reportId: string;
    reporterId: string;
    listingId?: string;
    reportedUserId?: string;
    category: string;
  }): Promise<void> {
    if (
      Array.from(this.cases.values()).some(
        (item) => item.reportId === input.reportId,
      )
    )
      return;
    const id = randomUUID();
    const now = new Date().toISOString();
    this.cases.set(id, {
      id,
      reportId: input.reportId,
      targetType: input.listingId ? "listing" : "user",
      listingId: input.listingId,
      reportedUserId: input.reportedUserId,
      affectedUserId: input.reportedUserId,
      category: input.category,
      severity: ["fraud", "counterfeit", "prohibited"].includes(input.category)
        ? "high"
        : "medium",
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  }

  async listCases(
    status?: ModerationCaseStatus,
  ): Promise<ModerationCaseRecord[]> {
    return Array.from(this.cases.values())
      .filter((item) => !status || item.status === status)
      .map((item) => ({ ...item }));
  }

  async listOwnCases(userId: string): Promise<OwnModerationCaseRecord[]> {
    return Array.from(this.cases.values())
      .filter((item) => item.affectedUserId === userId)
      .map((item) => ({
        id: item.id,
        targetType: item.targetType,
        category: item.category,
        severity: item.severity,
        status: item.status,
        resolutionAction: item.resolutionAction,
        resolutionReason: item.resolutionReason,
        resolvedAt: item.resolvedAt,
        createdAt: item.createdAt,
      }));
  }

  async resolveCase(input: {
    reportId: string;
    actorId: string;
    action: "dismiss" | "remove_listing" | "ban_user";
    reason: string;
  }): Promise<ModerationCaseRecord> {
    const target = Array.from(this.cases.values()).find(
      (item) => item.reportId === input.reportId,
    );
    if (!target)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Dossier introuvable.",
      });
    if (!["open", "triaged", "under_review"].includes(target.status))
      throw new AppError({ code: "CONFLICT", message: "Dossier déjà traité." });
    if (input.action === "remove_listing" && target.targetType !== "listing")
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cible incompatible.",
      });
    if (input.action === "ban_user" && target.targetType !== "user")
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cible incompatible.",
      });
    target.status = input.action === "dismiss" ? "dismissed" : "actioned";
    target.resolutionAction = input.action;
    target.resolutionReason = input.reason;
    target.resolvedBy = input.actorId;
    target.resolvedAt = new Date().toISOString();
    target.updatedAt = target.resolvedAt;
    return { ...target };
  }

  async submitAppeal(input: {
    caseId: string;
    appellantId: string;
    reason: string;
  }): Promise<ModerationAppealRecord> {
    const target = this.cases.get(input.caseId);
    if (!target)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Dossier introuvable.",
      });
    if (
      target.status !== "actioned" ||
      target.affectedUserId !== input.appellantId ||
      Array.from(this.appeals.values()).some(
        (appeal) =>
          appeal.caseId === input.caseId &&
          ["submitted", "under_review"].includes(appeal.status),
      )
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Recours indisponible.",
      });
    }
    const appeal: ModerationAppealRecord = {
      id: randomUUID(),
      caseId: input.caseId,
      appellantId: input.appellantId,
      reason: input.reason,
      status: "submitted",
      submittedAt: new Date().toISOString(),
    };
    this.appeals.set(appeal.id, appeal);
    target.status = "appealed";
    return { ...appeal };
  }

  async listAppeals(
    input: {
      appellantId?: string;
      status?: ModerationAppealRecord["status"];
    } = {},
  ): Promise<ModerationAppealRecord[]> {
    return Array.from(this.appeals.values())
      .filter(
        (item) =>
          (!input.appellantId || item.appellantId === input.appellantId) &&
          (!input.status || item.status === input.status),
      )
      .map((item) => ({ ...item }));
  }

  async decideAppeal(input: {
    appealId: string;
    reviewerId: string;
    decision: "upheld" | "overturned" | "rejected";
    reason: string;
  }): Promise<ModerationAppealRecord> {
    const appeal = this.appeals.get(input.appealId);
    if (!appeal)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Recours introuvable.",
      });
    const target = this.cases.get(appeal.caseId)!;
    if (target.resolvedBy === input.reviewerId)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Réexamen indépendant requis.",
      });
    if (!["submitted", "under_review"].includes(appeal.status))
      throw new AppError({ code: "CONFLICT", message: "Recours déjà traité." });
    appeal.status = input.decision;
    appeal.reviewedBy = input.reviewerId;
    appeal.decisionReason = input.reason;
    appeal.reviewedAt = new Date().toISOString();
    target.status = "closed";
    return { ...appeal };
  }
}

export class PostgresModerationRepository implements IModerationRepository {
  private mapCase(row: any): ModerationCaseRecord {
    return {
      id: row.id,
      reportId: row.report_id,
      targetType: row.target_type,
      listingId: row.listing_id || undefined,
      reportedUserId: row.reported_user_id || undefined,
      category: row.category,
      severity: row.severity,
      status: row.status,
      resolutionAction: row.resolution_action || undefined,
      resolutionReason: row.resolution_reason || undefined,
      resolvedBy: row.resolved_by || undefined,
      resolvedAt: row.resolved_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapAppeal(row: any): ModerationAppealRecord {
    return {
      id: row.id,
      caseId: row.case_id,
      appellantId: row.appellant_id,
      reason: row.reason,
      status: row.status,
      decisionReason: row.decision_reason || undefined,
      reviewedBy: row.reviewed_by || undefined,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at || undefined,
    };
  }

  async createCaseForReport(): Promise<void> {
    // Database mode creates the case in the report INSERT trigger.
  }

  async listCases(
    status?: ModerationCaseStatus,
  ): Promise<ModerationCaseRecord[]> {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("moderation_cases" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error || !data) databaseFailure("moderation.listCases", error);
    return data.map((row: any) => this.mapCase(row));
  }

  async listOwnCases(userId: string): Promise<OwnModerationCaseRecord[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "list_own_moderation_cases",
      { p_user_id: userId },
    );
    if (error || !data) databaseFailure("moderation.listOwnCases", error);
    return data.map((row: any) => ({
      id: row.id,
      targetType: row.target_type,
      category: row.category,
      status: row.status,
      resolutionAction: row.resolution_action || undefined,
      resolutionReason: row.resolution_reason || undefined,
      resolvedAt: row.resolved_at || undefined,
      createdAt: row.created_at,
    }));
  }

  async resolveCase(input: {
    reportId: string;
    actorId: string;
    action: "dismiss" | "remove_listing" | "ban_user";
    reason: string;
  }): Promise<ModerationCaseRecord> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "resolve_moderation_case",
      {
        p_report_id: input.reportId,
        p_actor_id: input.actorId,
        p_action: input.action,
        p_reason: input.reason,
      },
    );
    if (error || !data) this.fail("resolveCase", error);
    return this.mapCase(data);
  }

  async submitAppeal(input: {
    caseId: string;
    appellantId: string;
    reason: string;
  }): Promise<ModerationAppealRecord> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "submit_moderation_appeal",
      {
        p_case_id: input.caseId,
        p_appellant_id: input.appellantId,
        p_reason: input.reason,
      },
    );
    if (error || !data?.[0]) this.fail("submitAppeal", error);
    return this.mapAppeal(data[0]);
  }

  async listAppeals(
    input: {
      appellantId?: string;
      status?: ModerationAppealRecord["status"];
    } = {},
  ): Promise<ModerationAppealRecord[]> {
    const supabase = getSupabaseAdminClient();
    let query = supabase
      .from("moderation_appeals" as any)
      .select("*")
      .order("submitted_at", { ascending: false });
    if (input.appellantId) query = query.eq("appellant_id", input.appellantId);
    if (input.status) query = query.eq("status", input.status);
    const { data, error } = await query;
    if (error || !data) databaseFailure("moderation.listAppeals", error);
    return data.map((row: any) => this.mapAppeal(row));
  }

  async decideAppeal(input: {
    appealId: string;
    reviewerId: string;
    decision: "upheld" | "overturned" | "rejected";
    reason: string;
  }): Promise<ModerationAppealRecord> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await (supabase as any).rpc(
      "decide_moderation_appeal",
      {
        p_appeal_id: input.appealId,
        p_reviewer_id: input.reviewerId,
        p_decision: input.decision,
        p_reason: input.reason,
      },
    );
    if (error || !data?.appeal) this.fail("decideAppeal", error);
    return this.mapAppeal(data.appeal);
  }

  private fail(operation: string, error: { code?: string } | null): never {
    if (error?.code === "P0002")
      throw new AppError({
        code: "NOT_FOUND",
        message: "Dossier introuvable.",
      });
    if (error?.code === "42501")
      throw new AppError({
        code: "FORBIDDEN",
        message: "Action de modération interdite.",
      });
    if (error?.code === "23514" || error?.code === "23505")
      throw new AppError({
        code: "CONFLICT",
        message: "État de modération incompatible.",
      });
    databaseFailure(`moderation.${operation}`, error);
  }
}
