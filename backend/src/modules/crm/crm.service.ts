import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  crmAccountInputSchema,
  crmAccountDuplicateCheckSchema,
  crmContactInputSchema,
  crmCustomFieldInputSchema,
  crmOpportunityInputSchema,
  crmOpportunityTransitionSchema,
  crmPipelineInputSchema,
  crmProductInputSchema,
  crmQuoteInputSchema,
  crmSavedViewInputSchema,
  crmTaskInputSchema,
  type CrmActivity,
  type CrmDashboard,
} from "@shongre/contracts/crm";
import {
  type CrmListOptions,
  type CrmTenantContext,
  type ICrmRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import type { Principal } from "../../shared/auth/principal.js";
import {
  requireAuthenticated,
  requirePermission,
} from "../../shared/auth/principal.js";
import { AppError } from "../../shared/errors/app-error.js";

const listOptionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).optional(),
  query: z.string().trim().max(255).optional(),
});

const versionedPatchSchema = z.object({
  expectedVersion: z.number().int().positive(),
  changes: z.record(z.string(), z.unknown()),
});

const pipelineUpdateSchema = z.object({
  expectedVersion: z.number().int().positive(),
  input: crmPipelineInputSchema,
});

const activityInputSchema = z.object({
  entityType: z.enum(["account", "contact", "opportunity", "task"]),
  entityId: z.string().uuid(),
  activityType: z.enum([
    "ACCOUNT_CREATED",
    "CONTACT_CREATED",
    "NOTE_CREATED",
    "CALL_COMPLETED",
    "EMAIL_SENT",
    "EMAIL_RECEIVED",
    "MEETING_CREATED",
    "MEETING_COMPLETED",
    "TASK_CREATED",
    "TASK_COMPLETED",
    "OPPORTUNITY_CREATED",
    "STAGE_CHANGED",
    "OPPORTUNITY_WON",
    "OPPORTUNITY_LOST",
    "OWNER_CHANGED",
    "AI_ENRICHMENT",
    "AI_RECOMMENDATION",
    "EXTERNAL_EVENT",
  ]),
  title: z.string().trim().min(1).max(255),
  description: z.string().max(10_000).optional(),
  occurredAt: z.string().datetime({ offset: true }).optional(),
});

function pageInfo(nextCursor?: string) {
  return {
    hasNextPage: Boolean(nextCursor),
    ...(nextCursor ? { nextCursor } : {}),
  };
}

function conflict(error: unknown): never {
  if (error instanceof Error && error.message === "CRM_CONFLICT") {
    throw new AppError({
      code: "CONFLICT",
      message: "Cette fiche a été modifiée. Rechargez-la avant de réessayer.",
      details: { reason: "optimistic_lock" },
    });
  }
  throw error;
}

function savedViewTeamForbidden(error: unknown): never {
  if (
    error instanceof Error &&
    error.message === "CRM_SAVED_VIEW_TEAM_FORBIDDEN"
  ) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Cette équipe n’est pas accessible à votre compte.",
    });
  }
  throw error;
}

export class CrmService {
  constructor(private readonly repository: ICrmRepository = repositories.crm) {}

  private async context(principal: Principal): Promise<CrmTenantContext> {
    requireAuthenticated(principal);
    const tenantId = await this.repository.resolveTenantId(principal.userId);
    if (!tenantId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Aucun espace professionnel actif n’est associé à ce compte.",
      });
    }
    return (
      (await this.repository.getTenantContext(tenantId)) ??
      this.repository.provisionTenant(tenantId, principal.userId)
    );
  }

  private options(input: unknown): CrmListOptions {
    return listOptionsSchema.parse(input);
  }

  private activity(
    context: CrmTenantContext,
    principal: Principal,
    input: Omit<
      CrmActivity,
      "id" | "tenantId" | "workspaceId" | "createdAt" | "actorName"
    >,
  ) {
    return this.repository.addActivity(context, {
      ...input,
      actorUserId: principal.userId,
      actorName: principal.email || "Utilisateur Shongre",
    });
  }

  async dashboard(principal: Principal): Promise<CrmDashboard> {
    const context = await this.context(principal);
    const [{ items: opportunities }, { items: tasks }, pipelines] =
      await Promise.all([
        this.repository.listOpportunities(context.tenantId, { limit: 100 }),
        this.repository.listTasks(context.tenantId, { limit: 100 }),
        this.repository.listPipelines(context.tenantId),
      ]);
    const open = opportunities.filter((item) => item.status === "open");
    const won = opportunities.filter((item) => item.status === "won");
    const lost = opportunities.filter((item) => item.status === "lost");
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const amount = (items: typeof opportunities) =>
      items.reduce((sum, item) => sum + item.amount.amountMinor, 0);

    return {
      marketCode: context.marketCode,
      currency: context.currency,
      activeProspects: new Set(
        open.flatMap((item) => (item.accountId ? [item.accountId] : [])),
      ).size,
      openOpportunities: open.length,
      openPipelineMinor: amount(open),
      weightedPipelineMinor: open.reduce(
        (sum, item) =>
          sum + Math.round((item.amount.amountMinor * item.probability) / 100),
        0,
      ),
      forecastMinor: amount(
        open.filter((item) =>
          ["best_case", "commit"].includes(item.forecastCategory),
        ),
      ),
      wonRevenueMinor: amount(won),
      lostValueMinor: amount(lost),
      overdueTasks: tasks.filter(
        (task) => task.status !== "completed" && task.dueAt < now.toISOString(),
      ).length,
      tasksDueToday: tasks.filter(
        (task) => task.status !== "completed" && task.dueAt.startsWith(today),
      ).length,
      opportunities: opportunities.slice(0, 12),
      priorityTasks: tasks
        .filter((task) => task.status !== "completed")
        .slice(0, 8),
      stages: pipelines
        .flatMap((pipeline) => pipeline.stages)
        .map((stage) => {
          const items = open.filter((item) => item.stageId === stage.id);
          return {
            stageId: stage.id,
            stageName: stage.name,
            position: stage.position,
            opportunityCount: items.length,
            amountMinor: amount(items),
            weightedAmountMinor: items.reduce(
              (sum, item) =>
                sum +
                Math.round((item.amount.amountMinor * item.probability) / 100),
              0,
            ),
          };
        }),
    };
  }

  async listAccounts(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const page = await this.repository.listAccounts(
      context.tenantId,
      this.options(input),
    );
    return { items: page.items, pageInfo: pageInfo(page.nextCursor) };
  }

  async findAccountDuplicates(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const parsed = crmAccountDuplicateCheckSchema.parse(input);
    return {
      items: await this.repository.findAccountDuplicates(
        context.tenantId,
        parsed,
      ),
    };
  }

  async getAccount(principal: Principal, id: string) {
    const context = await this.context(principal);
    const item = await this.repository.getAccount(context.tenantId, id);
    if (!item) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Compte CRM introuvable.",
      });
    }
    return item;
  }

  async createAccount(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const parsed = crmAccountInputSchema.parse(input);
    const value = await this.repository.createAccount(context, parsed);
    await Promise.all([
      this.activity(context, principal, {
        entityType: "account",
        entityId: value.id,
        activityType: "ACCOUNT_CREATED",
        title: "Compte créé",
        occurredAt: value.createdAt,
        isAiGenerated: false,
      }),
      this.repository.addAudit(
        context.tenantId,
        principal.userId,
        "crm.account.created",
        "account",
        value.id,
        Object.keys(parsed),
        randomUUID(),
      ),
    ]);
    return value;
  }

  async updateAccount(principal: Principal, id: string, input: unknown) {
    const context = await this.context(principal);
    const { expectedVersion, changes } = versionedPatchSchema.parse(input);
    const value = crmAccountInputSchema.partial().parse(changes);
    try {
      const updated = await this.repository.updateAccount(
        context.tenantId,
        id,
        value,
        expectedVersion,
      );
      await this.repository.addAudit(
        context.tenantId,
        principal.userId,
        "crm.account.updated",
        "account",
        id,
        Object.keys(value),
        randomUUID(),
      );
      return updated;
    } catch (error) {
      return conflict(error);
    }
  }

  async listContacts(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const page = await this.repository.listContacts(
      context.tenantId,
      this.options(input),
    );
    return { items: page.items, pageInfo: pageInfo(page.nextCursor) };
  }

  async getContact(principal: Principal, id: string) {
    const context = await this.context(principal);
    const item = await this.repository.getContact(context.tenantId, id);
    if (!item) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Contact CRM introuvable.",
      });
    }
    return item;
  }

  async createContact(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const parsed = crmContactInputSchema.parse(input);
    const value = await this.repository.createContact(context, parsed);
    await Promise.all([
      this.activity(context, principal, {
        entityType: "contact",
        entityId: value.id,
        activityType: "CONTACT_CREATED",
        title: "Contact créé",
        occurredAt: value.createdAt,
        isAiGenerated: false,
      }),
      this.repository.addAudit(
        context.tenantId,
        principal.userId,
        "crm.contact.created",
        "contact",
        value.id,
        Object.keys(parsed),
        randomUUID(),
      ),
    ]);
    return value;
  }

  async updateContact(principal: Principal, id: string, input: unknown) {
    const context = await this.context(principal);
    const { expectedVersion, changes } = versionedPatchSchema.parse(input);
    const value = crmContactInputSchema.partial().parse(changes);
    try {
      const updated = await this.repository.updateContact(
        context.tenantId,
        id,
        value,
        expectedVersion,
      );
      await this.repository.addAudit(
        context.tenantId,
        principal.userId,
        "crm.contact.updated",
        "contact",
        id,
        Object.keys(value),
        randomUUID(),
      );
      return updated;
    } catch (error) {
      return conflict(error);
    }
  }

  async listPipelines(principal: Principal) {
    const context = await this.context(principal);
    return { items: await this.repository.listPipelines(context.tenantId) };
  }

  async createPipeline(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const parsed = crmPipelineInputSchema.parse(input);
    const value = {
      ...parsed,
      stages: parsed.stages.map(({ id: _ignored, ...stage }) => stage),
    };
    const created = await this.repository.createPipeline(context, value);
    await this.repository.addAudit(
      context.tenantId,
      principal.userId,
      "crm.pipeline.created",
      "pipeline",
      created.id,
      ["name", "description", "isDefault", "stages"],
      randomUUID(),
    );
    return created;
  }

  async updatePipeline(principal: Principal, id: string, input: unknown) {
    const context = await this.context(principal);
    const { expectedVersion, input: value } = pipelineUpdateSchema.parse(input);
    try {
      const updated = await this.repository.updatePipeline(
        context.tenantId,
        context.workspaceId,
        id,
        value,
        expectedVersion,
      );
      await this.repository.addAudit(
        context.tenantId,
        principal.userId,
        "crm.pipeline.updated",
        "pipeline",
        id,
        ["name", "description", "isDefault", "stages"],
        randomUUID(),
      );
      return updated;
    } catch (error) {
      if (error instanceof Error && error.message === "CRM_STAGE_IN_USE") {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            "Une étape utilisée par des opportunités ne peut pas être supprimée.",
        });
      }
      if (
        error instanceof Error &&
        ["CRM_PIPELINE_NOT_FOUND", "CRM_STAGE_NOT_FOUND"].includes(
          error.message,
        )
      ) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Le pipeline ou l’une de ses étapes est introuvable.",
        });
      }
      return conflict(error);
    }
  }

  async listOpportunities(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const page = await this.repository.listOpportunities(
      context.tenantId,
      this.options(input),
    );
    return { items: page.items, pageInfo: pageInfo(page.nextCursor) };
  }

  async getOpportunity(principal: Principal, id: string) {
    const context = await this.context(principal);
    const item = await this.repository.getOpportunity(context.tenantId, id);
    if (!item) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Opportunité introuvable.",
      });
    }
    return item;
  }

  async createOpportunity(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const value = crmOpportunityInputSchema.parse(input);
    const stage = await this.repository.getStage(
      context.tenantId,
      value.stageId,
    );
    if (!stage || stage.pipelineId !== value.pipelineId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "L’étape ne correspond pas au pipeline sélectionné.",
      });
    }
    const created = await this.repository.createOpportunity(context, value);
    await Promise.all([
      this.activity(context, principal, {
        entityType: "opportunity",
        entityId: created.id,
        activityType: "OPPORTUNITY_CREATED",
        title: "Opportunité créée",
        occurredAt: created.createdAt,
        isAiGenerated: false,
      }),
      this.repository.addAudit(
        context.tenantId,
        principal.userId,
        "crm.opportunity.created",
        "opportunity",
        created.id,
        Object.keys(value),
        randomUUID(),
      ),
    ]);
    return created;
  }

  async transitionOpportunity(
    principal: Principal,
    id: string,
    input: unknown,
  ) {
    const context = await this.context(principal);
    const value = crmOpportunityTransitionSchema.parse(input);
    const [current, stage] = await Promise.all([
      this.repository.getOpportunity(context.tenantId, id),
      this.repository.getStage(context.tenantId, value.stageId),
    ]);
    if (!current) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Opportunité introuvable.",
      });
    }
    if (!stage || stage.pipelineId !== current.pipelineId) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Transition de pipeline invalide.",
      });
    }
    if (stage.isLost && !value.lossReason) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le motif de perte est obligatoire.",
      });
    }
    const now = new Date().toISOString();
    const status = stage.isWon ? "won" : stage.isLost ? "lost" : "open";
    const changedFields = ["stageId", "status"];
    const patch: Record<string, unknown> = {
      stageId: stage.id,
      probability: stage.probability,
      forecastCategory:
        stage.isWon || stage.isLost ? "closed" : current.forecastCategory,
      status,
      lossReason: stage.isLost ? value.lossReason : null,
      lossDetail: stage.isLost ? value.lossDetail : null,
      competitor: stage.isLost ? value.competitor : null,
      futureRecontactDate: stage.isLost ? value.futureRecontactDate : null,
      wonAt: stage.isWon ? now : null,
      lostAt: stage.isLost ? now : null,
      recurringValueMinor: value.recurringValue?.amountMinor,
      renewalDate: value.renewalDate,
      onboardingStatus: value.onboardingStatus,
    };
    if (value.contractValue) {
      patch.amountMinor = value.contractValue.amountMinor;
      patch.currency = value.contractValue.currency;
      changedFields.push("amount");
    }
    try {
      const updated = await this.repository.updateOpportunity(
        context.tenantId,
        id,
        patch,
        value.expectedVersion,
      );
      const activityType = stage.isWon
        ? "OPPORTUNITY_WON"
        : stage.isLost
          ? "OPPORTUNITY_LOST"
          : "STAGE_CHANGED";
      await Promise.all([
        this.activity(context, principal, {
          entityType: "opportunity",
          entityId: id,
          activityType,
          title: stage.isWon
            ? "Opportunité gagnée"
            : stage.isLost
              ? "Opportunité perdue"
              : `Étape passée à ${stage.name}`,
          occurredAt: now,
          isAiGenerated: false,
        }),
        this.repository.addAudit(
          context.tenantId,
          principal.userId,
          `crm.opportunity.${status === "open" ? "stage_changed" : status}`,
          "opportunity",
          id,
          changedFields,
          randomUUID(),
        ),
      ]);
      return updated;
    } catch (error) {
      return conflict(error);
    }
  }

  async listTasks(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const page = await this.repository.listTasks(
      context.tenantId,
      this.options(input),
    );
    return { items: page.items, pageInfo: pageInfo(page.nextCursor) };
  }

  async createTask(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const value = await this.repository.createTask(
      context,
      crmTaskInputSchema.parse(input),
    );
    await this.activity(context, principal, {
      entityType: "task",
      entityId: value.id,
      activityType: "TASK_CREATED",
      title: "Tâche créée",
      occurredAt: value.createdAt,
      isAiGenerated: false,
    });
    return value;
  }

  async completeTask(principal: Principal, id: string, input: unknown) {
    const context = await this.context(principal);
    const value = z
      .object({
        expectedVersion: z.number().int().positive(),
        result: z.string().max(2_000).optional(),
      })
      .parse(input);
    try {
      const task = await this.repository.completeTask(
        context.tenantId,
        id,
        principal.userId,
        value.result,
        value.expectedVersion,
      );
      await this.activity(context, principal, {
        entityType: "task",
        entityId: task.id,
        activityType: "TASK_COMPLETED",
        title: "Tâche terminée",
        description: value.result,
        occurredAt: task.completedAt ?? new Date().toISOString(),
        isAiGenerated: false,
      });
      return task;
    } catch (error) {
      return conflict(error);
    }
  }

  async listActivities(
    principal: Principal,
    entityType: string,
    entityId: string,
    limit: unknown,
  ) {
    const context = await this.context(principal);
    const type = z
      .enum(["account", "contact", "opportunity", "task"])
      .parse(entityType);
    const safeLimit = z.coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .default(100)
      .parse(limit ?? 100);
    return {
      items: await this.repository.listActivities(
        context.tenantId,
        type,
        entityId,
        safeLimit,
      ),
    };
  }

  async addActivity(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const value = activityInputSchema.parse(input);
    return this.activity(context, principal, {
      ...value,
      occurredAt: value.occurredAt ?? new Date().toISOString(),
      isAiGenerated: false,
    });
  }

  async listProducts(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const result = await this.repository.listProducts(
      context.tenantId,
      this.options(input),
    );
    return { items: result.items, pageInfo: pageInfo(result.nextCursor) };
  }

  async createProduct(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const parsed = crmProductInputSchema.parse(input);
    const value = await this.repository.createProduct(context, parsed);
    await this.repository.addAudit(
      context.tenantId,
      principal.userId,
      "crm.product.created",
      "product",
      value.id,
      Object.keys(parsed),
      randomUUID(),
    );
    return value;
  }

  async updateProduct(principal: Principal, id: string, input: unknown) {
    const context = await this.context(principal);
    const { expectedVersion, changes } = versionedPatchSchema.parse(input);
    const parsed = crmProductInputSchema.partial().parse(changes);
    try {
      const value = await this.repository.updateProduct(
        context.tenantId,
        id,
        parsed,
        expectedVersion,
      );
      await this.repository.addAudit(
        context.tenantId,
        principal.userId,
        "crm.product.updated",
        "product",
        id,
        Object.keys(parsed),
        randomUUID(),
      );
      return value;
    } catch (error) {
      return conflict(error);
    }
  }

  async listQuotes(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const parsed = listOptionsSchema
      .extend({ opportunityId: z.string().uuid().optional() })
      .parse(input);
    const result = await this.repository.listQuotes(context.tenantId, parsed);
    return { items: result.items, pageInfo: pageInfo(result.nextCursor) };
  }

  async createQuote(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const parsed = crmQuoteInputSchema.parse(input);
    const account = await this.repository.getAccount(
      context.tenantId,
      parsed.accountId,
    );
    if (!account)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Compte du devis introuvable.",
      });
    if (parsed.opportunityId) {
      const opportunity = await this.repository.getOpportunity(
        context.tenantId,
        parsed.opportunityId,
      );
      if (!opportunity || opportunity.accountId !== parsed.accountId)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "L’opportunité et le compte du devis ne correspondent pas.",
        });
    }
    const value = await this.repository.createQuote(context, parsed);
    await this.repository.addAudit(
      context.tenantId,
      principal.userId,
      "crm.quote.created",
      "quote",
      value.id,
      ["accountId", "opportunityId", "items", "totalMinor"],
      randomUUID(),
    );
    return value;
  }

  async listCustomFields(principal: Principal, entityType: unknown) {
    const context = await this.context(principal);
    const parsed = z
      .enum(["account", "contact", "opportunity", "task"])
      .optional()
      .parse(entityType || undefined);
    return {
      items: await this.repository.listCustomFields(context.tenantId, parsed),
    };
  }

  async createCustomField(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const parsed = crmCustomFieldInputSchema.parse(input);
    const value = await this.repository.createCustomField(context, parsed);
    await this.repository.addAudit(
      context.tenantId,
      principal.userId,
      "crm.custom_field.created",
      "custom_field",
      value.id,
      Object.keys(parsed),
      randomUUID(),
    );
    return value;
  }

  async listSavedViews(principal: Principal, entityType: unknown) {
    const context = await this.context(principal);
    const parsed = z
      .enum(["account", "contact", "opportunity", "task"])
      .optional()
      .parse(entityType || undefined);
    return {
      items: await this.repository.listSavedViews(
        context.tenantId,
        context.workspaceId,
        principal.userId,
        parsed,
      ),
    };
  }

  async createSavedView(principal: Principal, input: unknown) {
    const context = await this.context(principal);
    const parsed = crmSavedViewInputSchema.parse(input);
    if (parsed.visibility !== "personal") {
      requirePermission(principal, "crm.configuration.manage");
    }
    let value;
    try {
      value = await this.repository.createSavedView(
        context,
        principal.userId,
        parsed,
      );
    } catch (error) {
      return savedViewTeamForbidden(error);
    }
    await this.repository.addAudit(
      context.tenantId,
      principal.userId,
      "crm.saved_view.created",
      "saved_view",
      value.id,
      Object.keys(parsed),
      randomUUID(),
    );
    return value;
  }

  async updateSavedView(principal: Principal, id: string, input: unknown) {
    const context = await this.context(principal);
    const parsed = z
      .object({
        expectedVersion: z.number().int().positive(),
        input: crmSavedViewInputSchema,
      })
      .parse(input);
    const existing = await this.repository.getSavedView(context.tenantId, id);
    if (!existing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Vue CRM introuvable.",
      });
    }
    if (
      existing.visibility !== "personal" ||
      parsed.input.visibility !== "personal"
    ) {
      requirePermission(principal, "crm.configuration.manage");
    } else if (existing.ownerId !== principal.userId) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Vue CRM introuvable.",
      });
    }
    try {
      const value = await this.repository.updateSavedView(
        context.tenantId,
        id,
        principal.userId,
        parsed.input,
        parsed.expectedVersion,
      );
      await this.repository.addAudit(
        context.tenantId,
        principal.userId,
        "crm.saved_view.updated",
        "saved_view",
        id,
        Object.keys(parsed.input),
        randomUUID(),
      );
      return value;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "CRM_SAVED_VIEW_TEAM_FORBIDDEN"
      ) {
        return savedViewTeamForbidden(error);
      }
      return conflict(error);
    }
  }

  async deleteSavedView(
    principal: Principal,
    id: string,
    expectedVersion: unknown,
  ) {
    const context = await this.context(principal);
    const version = z.coerce.number().int().positive().parse(expectedVersion);
    const existing = await this.repository.getSavedView(context.tenantId, id);
    if (!existing) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Vue CRM introuvable.",
      });
    }
    if (existing.visibility !== "personal") {
      requirePermission(principal, "crm.configuration.manage");
    } else if (existing.ownerId !== principal.userId) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Vue CRM introuvable.",
      });
    }
    try {
      await this.repository.deleteSavedView(context.tenantId, id, version);
      await this.repository.addAudit(
        context.tenantId,
        principal.userId,
        "crm.saved_view.deleted",
        "saved_view",
        id,
        [],
        randomUUID(),
      );
      return { deleted: true };
    } catch (error) {
      return conflict(error);
    }
  }
}

export const crmService = new CrmService();
