import { createHash, randomUUID } from "node:crypto";
import type {
  ComplianceAuditEvent,
  ComplianceRequirementDecision,
  ComplianceRule,
  ManualReviewCase,
  ManualReviewState,
  VerificationDimension,
  VerificationRecord,
} from "@shongre/contracts/compliance";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

export interface IComplianceRepository {
  listRules(): Promise<ComplianceRule[]>;
  saveRule(input: {
    rule: ComplianceRule;
    actorId: string;
    reason: string;
  }): Promise<ComplianceRule>;
  listVerificationRecords(userId: string): Promise<VerificationRecord[]>;
  saveVerificationRecord(userId: string, record: VerificationRecord): Promise<void>;
  saveDecision(userId: string, decision: ComplianceRequirementDecision): Promise<void>;
  appendAuditEvent(event: Omit<ComplianceAuditEvent, "id">): Promise<ComplianceAuditEvent>;
  claimProviderEvent(input: {
    provider: string;
    eventId: string;
    payloadHash: string;
  }): Promise<"CLAIMED" | "PROCESSED" | "IN_PROGRESS" | "HASH_MISMATCH">;
  completeProviderEvent(input: {
    provider: string;
    eventId: string;
    payloadHash: string;
  }): Promise<void>;
  listManualReviews(state?: ManualReviewState): Promise<ManualReviewCase[]>;
  createManualReview(
    input: Omit<ManualReviewCase, "id" | "openedAt" | "updatedAt">,
  ): Promise<ManualReviewCase>;
  updateManualReview(input: {
    caseId: string;
    state: ManualReviewState;
    assignedTo?: string;
    decisionReason: string;
  }): Promise<ManualReviewCase>;
  listAuditEvents(limit?: number): Promise<ComplianceAuditEvent[]>;
  runApprovedRetention(actorId: string): Promise<{
    providerEventsDeleted: number;
    skippedLegalReview: string[];
  }>;
}

export class DemoComplianceRepository implements IComplianceRepository {
  private readonly rules = new Map<string, ComplianceRule>();
  private readonly records = new Map<string, Map<VerificationDimension, VerificationRecord>>();
  private readonly events: ComplianceAuditEvent[] = [];
  private readonly providerEvents = new Map<
    string,
    { payloadHash: string; processed: boolean }
  >();
  private readonly reviews = new Map<string, ManualReviewCase>();

  async listRules(): Promise<ComplianceRule[]> {
    return [...this.rules.values()];
  }

  async saveRule(input: {
    rule: ComplianceRule;
    actorId: string;
    reason: string;
  }): Promise<ComplianceRule> {
    this.rules.set(input.rule.id, structuredClone(input.rule));
    return structuredClone(input.rule);
  }

  async listVerificationRecords(userId: string): Promise<VerificationRecord[]> {
    return [...(this.records.get(userId)?.values() ?? [])];
  }

  async saveVerificationRecord(userId: string, record: VerificationRecord): Promise<void> {
    const current = this.records.get(userId) ?? new Map();
    current.set(record.dimension, { ...record });
    this.records.set(userId, current);
  }

  async saveDecision(
    userId: string,
    decision: ComplianceRequirementDecision,
  ): Promise<void> {
    await this.appendAuditEvent({
      userId,
      eventType: "policy_evaluated",
      actorType: "SYSTEM",
      occurredAt: decision.evaluatedAt,
      policyVersion: decision.policyVersions.join(","),
      reasonCode: decision.reasonCodes.join(",") || undefined,
    });
  }

  async appendAuditEvent(
    event: Omit<ComplianceAuditEvent, "id">,
  ): Promise<ComplianceAuditEvent> {
    const saved = { ...event, id: randomUUID() };
    this.events.push(saved);
    return saved;
  }

  async claimProviderEvent(input: {
    provider: string;
    eventId: string;
    payloadHash: string;
  }): Promise<"CLAIMED" | "PROCESSED" | "IN_PROGRESS" | "HASH_MISMATCH"> {
    const key = `${input.provider}:${input.eventId}`;
    const current = this.providerEvents.get(key);
    if (current && current.payloadHash !== input.payloadHash)
      return "HASH_MISMATCH";
    if (current?.processed) return "PROCESSED";
    if (current) return "IN_PROGRESS";
    this.providerEvents.set(key, {
      payloadHash: input.payloadHash,
      processed: false,
    });
    return "CLAIMED";
  }

  async completeProviderEvent(input: {
    provider: string;
    eventId: string;
    payloadHash: string;
  }): Promise<void> {
    const key = `${input.provider}:${input.eventId}`;
    const current = this.providerEvents.get(key);
    if (!current || current.payloadHash !== input.payloadHash)
      throw new Error("Provider event completion does not match its claim");
    current.processed = true;
  }

  async listManualReviews(state?: ManualReviewState): Promise<ManualReviewCase[]> {
    return [...this.reviews.values()].filter((review) => !state || review.state === state);
  }

  async createManualReview(
    input: Omit<ManualReviewCase, "id" | "openedAt" | "updatedAt">,
  ): Promise<ManualReviewCase> {
    const now = new Date().toISOString();
    const review = { ...input, id: randomUUID(), openedAt: now, updatedAt: now };
    this.reviews.set(review.id, review);
    return review;
  }

  async updateManualReview(input: {
    caseId: string;
    state: ManualReviewState;
    assignedTo?: string;
    decisionReason: string;
  }): Promise<ManualReviewCase> {
    const current = this.reviews.get(input.caseId);
    if (!current) throw new Error("Manual review not found");
    const updated: ManualReviewCase = {
      ...current,
      state: input.state,
      assignedTo: input.assignedTo ?? current.assignedTo,
      decisionReason: input.decisionReason,
      updatedAt: new Date().toISOString(),
    };
    this.reviews.set(updated.id, updated);
    return updated;
  }

  async listAuditEvents(limit = 100): Promise<ComplianceAuditEvent[]> {
    return this.events.slice(-limit).reverse();
  }

  async runApprovedRetention(): Promise<{
    providerEventsDeleted: number;
    skippedLegalReview: string[];
  }> {
    return {
      providerEventsDeleted: 0,
      skippedLegalReview: [
        "provider_verification_metadata",
        "compliance_decisions",
        "manual_review",
        "legacy_verification_requests",
      ],
    };
  }
}

function mapRule(row: any): ComplianceRule {
  return {
    id: row.id,
    jurisdiction: row.jurisdiction,
    regulation: row.regulation,
    ruleCode: row.rule_code,
    description: row.description,
    action: row.action,
    conditions: row.conditions ?? {},
    requiredChecks: row.required_checks ?? [],
    recommendedChecks: row.recommended_checks ?? [],
    reasonCodes: row.reason_codes ?? [],
    legalBasis: row.legal_basis ?? [],
    sourceReferences: row.source_references ?? [],
    policyVersion: row.policy_version,
    governance: row.governance,
    status: row.status,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until ?? undefined,
    priority: row.priority,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

function mapRecord(row: any): VerificationRecord {
  return {
    dimension: row.dimension,
    state: row.state,
    provider: row.provider ?? undefined,
    providerReference: row.provider_reference ?? undefined,
    method: row.method ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    lastCheckedAt: row.last_checked_at ?? undefined,
    refreshRequiredAt: row.refresh_required_at ?? undefined,
    reasonCode: row.reason_code ?? undefined,
    visibility: row.visibility,
  };
}

function mapReview(row: any): ManualReviewCase {
  return {
    id: row.id,
    userId: row.user_id,
    dimension: row.dimension,
    state: row.state,
    reasonCode: row.reason_code,
    assignedTo: row.assigned_to ?? undefined,
    openedAt: row.opened_at,
    updatedAt: row.updated_at,
    decisionReason: row.decision_reason ?? undefined,
  };
}

export class PostgresComplianceRepository implements IComplianceRepository {
  async listRules(): Promise<ComplianceRule[]> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from("compliance_rules" as any)
        .select("*");
      if (error) databaseFailure("compliance.listRules", error);
      return (data ?? []).map(mapRule);
    } catch (error) {
      databaseFailure("compliance.listRules", error);
    }
  }

  async saveRule(input: {
    rule: ComplianceRule;
    actorId: string;
    reason: string;
  }): Promise<ComplianceRule> {
    try {
      const { data, error } = await getSupabaseAdminClient().rpc(
        "admin_upsert_compliance_rule" as any,
        {
          p_rule: input.rule,
          p_reason: input.reason,
          p_actor_id: input.actorId,
        } as any,
      );
      if (error || !data) databaseFailure("compliance.saveRule", error);
      return mapRule(data);
    } catch (error) {
      databaseFailure("compliance.saveRule", error);
    }
  }

  async listVerificationRecords(userId: string): Promise<VerificationRecord[]> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from("compliance_verification_records" as any)
        .select("*")
        .eq("user_id", userId);
      if (error) databaseFailure("compliance.listVerificationRecords", error);
      return (data ?? []).map(mapRecord);
    } catch (error) {
      databaseFailure("compliance.listVerificationRecords", error);
    }
  }

  async saveVerificationRecord(userId: string, record: VerificationRecord): Promise<void> {
    try {
      const { error } = await getSupabaseAdminClient()
        .from("compliance_verification_records" as any)
        .upsert(
          {
            user_id: userId,
            dimension: record.dimension,
            state: record.state,
            provider: record.provider ?? null,
            provider_reference: record.providerReference ?? null,
            method: record.method ?? null,
            verified_at: record.verifiedAt ?? null,
            expires_at: record.expiresAt ?? null,
            last_checked_at: record.lastCheckedAt ?? null,
            refresh_required_at: record.refreshRequiredAt ?? null,
            reason_code: record.reasonCode ?? null,
            visibility: record.visibility,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id,dimension" },
        );
      if (error) databaseFailure("compliance.saveVerificationRecord", error);
    } catch (error) {
      databaseFailure("compliance.saveVerificationRecord", error);
    }
  }

  async saveDecision(userId: string, decision: ComplianceRequirementDecision): Promise<void> {
    try {
      const { error } = await getSupabaseAdminClient()
        .from("compliance_requirement_decisions" as any)
        .insert({
          user_id: userId,
          requested_action: decision.requestedAction,
          capability: decision.capability,
          allowed: decision.allowed,
          required_checks: decision.required,
          missing_checks: decision.missing,
          reason_codes: decision.reasonCodes,
          applicable_rule_ids: decision.applicableRuleIds,
          policy_versions: decision.policyVersions,
          legal_review_required: decision.legalReviewRequired,
          evaluated_at: decision.evaluatedAt,
        } as any);
      if (error) databaseFailure("compliance.saveDecision", error);
    } catch (error) {
      databaseFailure("compliance.saveDecision", error);
    }
  }

  async appendAuditEvent(
    event: Omit<ComplianceAuditEvent, "id">,
  ): Promise<ComplianceAuditEvent> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from("compliance_audit_events" as any)
        .insert({
          user_id: event.userId,
          event_type: event.eventType,
          dimension: event.dimension ?? null,
          actor_type: event.actorType,
          actor_id: event.actorId ?? null,
          occurred_at: event.occurredAt,
          policy_version: event.policyVersion ?? null,
          reason_code: event.reasonCode ?? null,
          previous_state: event.previousState ?? null,
          new_state: event.newState ?? null,
          provider_reference: event.providerReference ?? null,
        } as any)
        .select("id")
        .single();
      if (error || !data) databaseFailure("compliance.appendAuditEvent", error);
      return { ...event, id: (data as any).id };
    } catch (error) {
      databaseFailure("compliance.appendAuditEvent", error);
    }
  }

  async claimProviderEvent(input: {
    provider: string;
    eventId: string;
    payloadHash: string;
  }): Promise<"CLAIMED" | "PROCESSED" | "IN_PROGRESS" | "HASH_MISMATCH"> {
    try {
      const { data, error } = await getSupabaseAdminClient().rpc(
        "claim_compliance_provider_event" as any,
        {
          p_provider: input.provider,
          p_event_id: input.eventId,
          p_payload_hash: input.payloadHash,
        } as any,
      );
      if (error) databaseFailure("compliance.claimProviderEvent", error);
      return data as "CLAIMED" | "PROCESSED" | "IN_PROGRESS" | "HASH_MISMATCH";
    } catch (error) {
      databaseFailure("compliance.claimProviderEvent", error);
    }
  }

  async completeProviderEvent(input: {
    provider: string;
    eventId: string;
    payloadHash: string;
  }): Promise<void> {
    try {
      const { error } = await getSupabaseAdminClient().rpc(
        "complete_compliance_provider_event" as any,
        {
          p_provider: input.provider,
          p_event_id: input.eventId,
          p_payload_hash: input.payloadHash,
        } as any,
      );
      if (error) databaseFailure("compliance.completeProviderEvent", error);
    } catch (error) {
      databaseFailure("compliance.completeProviderEvent", error);
    }
  }

  async listManualReviews(state?: ManualReviewState): Promise<ManualReviewCase[]> {
    try {
      let query: any = getSupabaseAdminClient()
        .from("compliance_manual_reviews" as any)
        .select("*")
        .order("opened_at", { ascending: true });
      if (state) query = query.eq("state", state);
      const { data, error } = await query;
      if (error) databaseFailure("compliance.listManualReviews", error);
      return (data ?? []).map(mapReview);
    } catch (error) {
      databaseFailure("compliance.listManualReviews", error);
    }
  }

  async createManualReview(
    input: Omit<ManualReviewCase, "id" | "openedAt" | "updatedAt">,
  ): Promise<ManualReviewCase> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from("compliance_manual_reviews" as any)
        .insert({
          user_id: input.userId,
          dimension: input.dimension,
          state: input.state,
          reason_code: input.reasonCode,
          assigned_to: input.assignedTo ?? null,
          decision_reason: input.decisionReason ?? null,
        } as any)
        .select("*")
        .single();
      if (error || !data) databaseFailure("compliance.createManualReview", error);
      return mapReview(data);
    } catch (error) {
      databaseFailure("compliance.createManualReview", error);
    }
  }

  async updateManualReview(input: {
    caseId: string;
    state: ManualReviewState;
    assignedTo?: string;
    decisionReason: string;
  }): Promise<ManualReviewCase> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from("compliance_manual_reviews" as any)
        .update({
          state: input.state,
          assigned_to: input.assignedTo ?? null,
          decision_reason: input.decisionReason,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", input.caseId)
        .select("*")
        .single();
      if (error || !data) databaseFailure("compliance.updateManualReview", error);
      return mapReview(data);
    } catch (error) {
      databaseFailure("compliance.updateManualReview", error);
    }
  }

  async listAuditEvents(limit = 100): Promise<ComplianceAuditEvent[]> {
    try {
      const { data, error } = await getSupabaseAdminClient()
        .from("compliance_audit_events" as any)
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 500));
      if (error) databaseFailure("compliance.listAuditEvents", error);
      return (data ?? []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        eventType: row.event_type,
        dimension: row.dimension ?? undefined,
        actorType: row.actor_type,
        actorId: row.actor_id ?? undefined,
        occurredAt: row.occurred_at,
        policyVersion: row.policy_version ?? undefined,
        reasonCode: row.reason_code ?? undefined,
        previousState: row.previous_state ?? undefined,
        newState: row.new_state ?? undefined,
        providerReference: row.provider_reference ?? undefined,
      }));
    } catch (error) {
      databaseFailure("compliance.listAuditEvents", error);
    }
  }

  async runApprovedRetention(actorId: string): Promise<{
    providerEventsDeleted: number;
    skippedLegalReview: string[];
  }> {
    try {
      const { data, error } = await getSupabaseAdminClient().rpc(
        "run_approved_compliance_retention" as any,
        { p_actor_id: actorId } as any,
      );
      if (error) databaseFailure("compliance.runApprovedRetention", error);
      const result = data as any;
      return {
        providerEventsDeleted: Number(result?.providerEventsDeleted ?? 0),
        skippedLegalReview: Array.isArray(result?.skippedLegalReview)
          ? result.skippedLegalReview.map(String)
          : [],
      };
    } catch (error) {
      databaseFailure("compliance.runApprovedRetention", error);
    }
  }
}

export function hashProviderPayload(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}
