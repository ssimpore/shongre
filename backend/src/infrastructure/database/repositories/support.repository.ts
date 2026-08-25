import { randomUUID } from "node:crypto";
import type {
  SupportCase,
  SupportCaseCategory,
  SupportCaseMetrics,
  SupportCaseNote,
  SupportCasePriority,
  SupportCaseStatus,
} from "@shongre/contracts/support";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

export interface SupportCaseFilter {
  requesterId?: string;
  assigneeId?: string;
  status?: SupportCaseStatus;
  priority?: SupportCasePriority;
}

export interface ISupportRepository {
  getSlaResolutionMinutes(
    category: SupportCaseCategory,
    priority: SupportCasePriority,
  ): Promise<number>;
  createCase(value: SupportCase): Promise<SupportCase>;
  getCase(caseId: string): Promise<SupportCase | null>;
  listCases(filter?: SupportCaseFilter): Promise<SupportCase[]>;
  updateCase(
    value: SupportCase,
    actorId: string,
    reason: string,
  ): Promise<SupportCase>;
  listNotes(caseId: string): Promise<SupportCaseNote[]>;
  addNote(value: SupportCaseNote): Promise<SupportCaseNote>;
  getMetrics(nowIso: string): Promise<SupportCaseMetrics>;
}

const SLA_MINUTES: Record<SupportCasePriority, number> = {
  low: 72 * 60,
  normal: 48 * 60,
  high: 12 * 60,
  urgent: 4 * 60,
};

export class DemoSupportRepository implements ISupportRepository {
  private readonly cases = new Map<string, SupportCase>();
  private readonly notes = new Map<string, SupportCaseNote[]>();

  async getSlaResolutionMinutes(
    _category: SupportCaseCategory,
    priority: SupportCasePriority,
  ): Promise<number> {
    return SLA_MINUTES[priority];
  }

  async createCase(value: SupportCase): Promise<SupportCase> {
    this.cases.set(value.id, structuredClone(value));
    return structuredClone(value);
  }

  async getCase(caseId: string): Promise<SupportCase | null> {
    const value = this.cases.get(caseId);
    return value ? structuredClone(value) : null;
  }

  async listCases(filter: SupportCaseFilter = {}): Promise<SupportCase[]> {
    return [...this.cases.values()]
      .filter(
        (value) =>
          (!filter.requesterId || value.requesterId === filter.requesterId) &&
          (!filter.assigneeId || value.assigneeId === filter.assigneeId) &&
          (!filter.status || value.status === filter.status) &&
          (!filter.priority || value.priority === filter.priority),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((value) => structuredClone(value));
  }

  async updateCase(
    value: SupportCase,
    _actorId: string,
    _reason: string,
  ): Promise<SupportCase> {
    this.cases.set(value.id, structuredClone(value));
    return structuredClone(value);
  }

  async listNotes(caseId: string): Promise<SupportCaseNote[]> {
    return structuredClone(this.notes.get(caseId) ?? []);
  }

  async addNote(value: SupportCaseNote): Promise<SupportCaseNote> {
    this.notes.set(value.caseId, [
      ...(this.notes.get(value.caseId) ?? []),
      structuredClone(value),
    ]);
    return structuredClone(value);
  }

  async getMetrics(nowIso: string): Promise<SupportCaseMetrics> {
    const open = [...this.cases.values()].filter(
      (value) => !["resolved", "closed"].includes(value.status),
    );
    const today = nowIso.slice(0, 10);
    return {
      open: open.length,
      urgent: open.filter((value) => value.priority === "urgent").length,
      overdue: open.filter((value) => value.slaDueAt < nowIso).length,
      unassigned: open.filter((value) => !value.assigneeId).length,
      resolvedToday: [...this.cases.values()].filter((value) =>
        value.resolvedAt?.startsWith(today),
      ).length,
      averageFirstResponseMinutes: 0,
    };
  }
}

function mapCase(row: any): SupportCase {
  return {
    id: row.id,
    reference: `SHG-${String(row.case_number).padStart(8, "0")}`,
    requesterId: row.requester_id,
    assigneeId: row.assignee_id ?? undefined,
    category: row.category,
    priority: row.priority,
    status: row.status,
    subject: row.subject,
    description: row.description,
    listingId: row.listing_id ?? undefined,
    orderId: row.order_id ?? undefined,
    paymentId: row.payment_id ?? undefined,
    organizationId: row.organization_id ?? undefined,
    slaDueAt: row.sla_resolution_due_at,
    lastCustomerReplyAt: row.last_customer_reply_at ?? undefined,
    lastStaffReplyAt: row.last_staff_reply_at ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNote(row: any): SupportCaseNote {
  return {
    id: row.id,
    caseId: row.case_id,
    authorId: row.author_id,
    visibility: row.visibility,
    body: row.body,
    createdAt: row.created_at,
  };
}

export class PostgresSupportRepository implements ISupportRepository {
  async getSlaResolutionMinutes(
    category: SupportCaseCategory,
    priority: SupportCasePriority,
  ): Promise<number> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("support_sla_policies")
        .select("resolution_minutes")
        .eq("category", category)
        .eq("priority", priority)
        .eq("is_active", true)
        .maybeSingle();
      if (error) databaseFailure("support.getSlaPolicy", error);
      return Number(data?.resolution_minutes ?? SLA_MINUTES[priority]);
    } catch (error) {
      databaseFailure("support.getSlaPolicy", error);
    }
  }

  async createCase(value: SupportCase): Promise<SupportCase> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("support_cases")
        .insert({
          id: value.id,
          requester_id: value.requesterId,
          assignee_id: value.assigneeId ?? null,
          category: value.category,
          priority: value.priority,
          status: value.status,
          subject: value.subject,
          description: value.description,
          listing_id: value.listingId ?? null,
          order_id: value.orderId ?? null,
          payment_id: value.paymentId ?? null,
          organization_id: value.organizationId ?? null,
          sla_resolution_due_at: value.slaDueAt,
          created_at: value.createdAt,
          updated_at: value.updatedAt,
        })
        .select()
        .single();
      if (error || !data) databaseFailure("support.createCase", error);
      return mapCase(data);
    } catch (error) {
      databaseFailure("support.createCase", error);
    }
  }

  async getCase(caseId: string): Promise<SupportCase | null> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("support_cases")
        .select("*")
        .eq("id", caseId)
        .maybeSingle();
      if (error) databaseFailure("support.getCase", error);
      return data ? mapCase(data) : null;
    } catch (error) {
      databaseFailure("support.getCase", error);
    }
  }

  async listCases(filter: SupportCaseFilter = {}): Promise<SupportCase[]> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      let query = supabase
        .from("support_cases")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(250);
      if (filter.requesterId)
        query = query.eq("requester_id", filter.requesterId);
      if (filter.assigneeId) query = query.eq("assignee_id", filter.assigneeId);
      if (filter.status) query = query.eq("status", filter.status);
      if (filter.priority) query = query.eq("priority", filter.priority);
      const { data, error } = await query;
      if (error) databaseFailure("support.listCases", error);
      return (data ?? []).map(mapCase);
    } catch (error) {
      databaseFailure("support.listCases", error);
    }
  }

  async updateCase(
    value: SupportCase,
    actorId: string,
    reason: string,
  ): Promise<SupportCase> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase.rpc("update_support_case", {
        p_case_id: value.id,
        p_actor_id: actorId,
        p_status: value.status,
        p_priority: value.priority,
        p_assignee_id: value.assigneeId ?? null,
        p_last_customer_reply_at: value.lastCustomerReplyAt ?? null,
        p_last_staff_reply_at: value.lastStaffReplyAt ?? null,
        p_reason: reason,
      });
      if (error || !data) databaseFailure("support.updateCase", error);
      return mapCase(Array.isArray(data) ? data[0] : data);
    } catch (error) {
      databaseFailure("support.updateCase", error);
    }
  }

  async listNotes(caseId: string): Promise<SupportCaseNote[]> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("support_case_notes")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });
      if (error) databaseFailure("support.listNotes", error);
      return (data ?? []).map(mapNote);
    } catch (error) {
      databaseFailure("support.listNotes", error);
    }
  }

  async addNote(value: SupportCaseNote): Promise<SupportCaseNote> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("support_case_notes")
        .insert({
          id: value.id,
          case_id: value.caseId,
          author_id: value.authorId,
          visibility: value.visibility,
          body: value.body,
          created_at: value.createdAt,
        })
        .select()
        .single();
      if (error || !data) databaseFailure("support.addNote", error);
      return mapNote(data);
    } catch (error) {
      databaseFailure("support.addNote", error);
    }
  }

  async getMetrics(nowIso: string): Promise<SupportCaseMetrics> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase.rpc("support_case_metrics", {
        p_now: nowIso,
      });
      if (error || !data) databaseFailure("support.getMetrics", error);
      const row = Array.isArray(data) ? data[0] : data;
      return {
        open: Number(row.open_count ?? 0),
        urgent: Number(row.urgent_count ?? 0),
        overdue: Number(row.overdue_count ?? 0),
        unassigned: Number(row.unassigned_count ?? 0),
        resolvedToday: Number(row.resolved_today_count ?? 0),
        averageFirstResponseMinutes: Number(
          row.average_first_response_minutes ?? 0,
        ),
      };
    } catch (error) {
      databaseFailure("support.getMetrics", error);
    }
  }
}

export function createSupportCaseId(): string {
  return randomUUID();
}
