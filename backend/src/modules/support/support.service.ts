import { randomUUID } from "node:crypto";
import {
  supportCaseCreateSchema,
  supportCaseFilterSchema,
  supportCaseNoteCreateSchema,
  supportCaseSchema,
  supportCaseUpdateSchema,
  type SupportCase,
  type SupportCaseFilter,
} from "./support.types.js";
import type { Principal } from "../../shared/auth/principal.js";
import {
  requireAuthenticated,
  requirePermission,
} from "../../shared/auth/principal.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createSupportCaseId,
  type ISupportRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";

function canReadSupportCases(principal: Principal): boolean {
  return Boolean(principal.capabilities?.includes("support.case.read"));
}

function initialPriority(
  category: SupportCase["category"],
): SupportCase["priority"] {
  if (category === "safety" || category === "payment") return "high";
  return "normal";
}

export class SupportService {
  constructor(
    private readonly repository: ISupportRepository = repositories.support,
  ) {}

  async createCase(principal: Principal, input: unknown): Promise<SupportCase> {
    requireAuthenticated(principal);
    const value = supportCaseCreateSchema.parse(input);
    const priority = initialPriority(value.category);
    const now = new Date();
    const resolutionMinutes = await this.repository.getSlaResolutionMinutes(
      value.category,
      priority,
    );
    const id = createSupportCaseId();
    return this.repository.createCase(
      supportCaseSchema.parse({
        ...value,
        id,
        reference: `SHG-${id.slice(0, 8).toUpperCase()}`,
        requesterId: principal.userId,
        priority,
        status: "open",
        slaDueAt: new Date(
          now.getTime() + resolutionMinutes * 60 * 1000,
        ).toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }),
    );
  }

  async getCase(
    principal: Principal,
    caseId: string,
  ): Promise<{
    case: SupportCase;
    notes: Awaited<ReturnType<ISupportRepository["listNotes"]>>;
  }> {
    requireAuthenticated(principal);
    const supportCase = await this.repository.getCase(caseId);
    if (
      !supportCase ||
      (supportCase.requesterId !== principal.userId &&
        !canReadSupportCases(principal))
    ) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande d’assistance introuvable.",
      });
    }
    const notes = await this.repository.listNotes(caseId);
    return {
      case: supportCase,
      notes: canReadSupportCases(principal)
        ? notes
        : notes.filter((note) => note.visibility === "customer"),
    };
  }

  listOwnCases(principal: Principal): Promise<SupportCase[]> {
    requireAuthenticated(principal);
    return this.repository.listCases({ requesterId: principal.userId });
  }

  listCases(
    principal: Principal,
    filter: SupportCaseFilter = {},
  ): Promise<SupportCase[]> {
    requirePermission(principal, "support.case.read");
    return this.repository.listCases(supportCaseFilterSchema.parse(filter));
  }

  async updateCase(
    principal: Principal,
    caseId: string,
    input: unknown,
  ): Promise<SupportCase> {
    requirePermission(principal, "support.case.manage");
    const patch = supportCaseUpdateSchema.parse(input);
    const current = await this.repository.getCase(caseId);
    if (!current) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande d’assistance introuvable.",
      });
    }
    const now = new Date().toISOString();
    return this.repository.updateCase(
      supportCaseSchema.parse({
        ...current,
        status: patch.status ?? current.status,
        priority: patch.priority ?? current.priority,
        assigneeId:
          patch.assigneeId === null
            ? undefined
            : (patch.assigneeId ?? current.assigneeId),
        resolvedAt:
          patch.status === "resolved" || patch.status === "closed"
            ? (current.resolvedAt ?? now)
            : patch.status
              ? undefined
              : current.resolvedAt,
        updatedAt: now,
      }),
      principal.userId,
      patch.reason,
    );
  }

  async addNote(principal: Principal, caseId: string, input: unknown) {
    requireAuthenticated(principal);
    const value = supportCaseNoteCreateSchema.parse(input);
    const current = await this.repository.getCase(caseId);
    const isStaff = canReadSupportCases(principal);
    if (!current || (current.requesterId !== principal.userId && !isStaff)) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Demande d’assistance introuvable.",
      });
    }
    if (!isStaff && value.visibility === "internal") {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Cette action n’est pas autorisée.",
      });
    }
    if (current.status === "closed") {
      throw new AppError({
        code: "CONFLICT",
        message: "Cette demande d’assistance est clôturée.",
      });
    }
    const now = new Date().toISOString();
    const note = await this.repository.addNote({
      id: randomUUID(),
      caseId,
      authorId: principal.userId,
      visibility: value.visibility,
      body: value.body,
      createdAt: now,
    });
    const customerVisibleStaffReply =
      isStaff && value.visibility === "customer";
    await this.repository.updateCase(
      supportCaseSchema.parse({
        ...current,
        status: isStaff
          ? customerVisibleStaffReply
            ? "waiting_customer"
            : current.status
          : "waiting_internal",
        lastCustomerReplyAt: isStaff ? current.lastCustomerReplyAt : now,
        lastStaffReplyAt: customerVisibleStaffReply
          ? now
          : current.lastStaffReplyAt,
        updatedAt: now,
      }),
      principal.userId,
      isStaff
        ? "Réponse ou note ajoutée par le support"
        : "Réponse ajoutée par le demandeur",
    );
    return note;
  }

  getMetrics(principal: Principal) {
    requirePermission(principal, "support.case.read");
    return this.repository.getMetrics(new Date().toISOString());
  }
}

export const supportService = new SupportService();
