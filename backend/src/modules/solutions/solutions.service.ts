import { createHash } from "node:crypto";
import {
  createSolutionInputSchema,
  reorderSolutionsInputSchema,
  solutionDefinitionSchema,
  transitionSolutionLifecycleInputSchema,
  updateSolutionInputSchema,
  type CreateSolutionInput,
  type SolutionDefinition,
  type UpdateSolutionInput,
} from "@shongre/contracts/solutions";
import type { MarketContext } from "@shongre/contracts";
import type {
  ISolutionsRepository,
  SolutionMutationActor,
  SolutionMutationEvidence,
} from "../../infrastructure/database/repositories/solutions.repository.js";
import { repositories } from "../../infrastructure/database/repositories/repository-container.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { Principal } from "../../shared/auth/principal.js";
import {
  requirePermission,
  requireRecentAuthentication,
} from "../../shared/auth/principal.js";

function requireCatalogMarket(context: MarketContext): {
  marketCode: string;
  locale: string;
} {
  if (
    !context.country ||
    !context.countryCode ||
    context.country.code !== context.countryCode ||
    !context.country.enabled ||
    !["market", "coming_soon"].includes(context.kind)
  ) {
    throw new AppError({
      code: "CONFLICT",
      message: "Le catalogue n’est pas disponible pour ce contexte de marché.",
    });
  }
  return {
    marketCode: context.countryCode,
    locale: context.locale || context.country.defaultLocale,
  };
}

function languageMatches(
  solution: SolutionDefinition,
  locale: string,
): boolean {
  const normalizedLocale = locale.trim().toLowerCase();
  if (!normalizedLocale) return true;
  const language = normalizedLocale.split("-")[0];
  return solution.languages.some(
    (candidate) => candidate.toLowerCase().split("-")[0] === language,
  );
}

function normalizedUpdateForValidation(input: UpdateSolutionInput) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      value === null ? undefined : value,
    ]),
  );
}

export class SolutionsService {
  constructor(
    private readonly repository: ISolutionsRepository = repositories.solutions,
  ) {}

  async listPublicSolutions(context: MarketContext, locale?: string) {
    const catalogMarket = requireCatalogMarket(context);
    const selectedLocale = locale?.trim() || catalogMarket.locale;
    const values = await this.repository.list({
      publicOnly: true,
      marketCode: catalogMarket.marketCode,
    });
    return values.filter((value) => languageMatches(value, selectedLocale));
  }

  async getPublicSolutionBySlug(
    context: MarketContext,
    slug: string,
    locale?: string,
  ): Promise<SolutionDefinition | null> {
    const catalogMarket = requireCatalogMarket(context);
    const values = await this.repository.list({
      publicOnly: true,
      marketCode: catalogMarket.marketCode,
      slug,
    });
    const value = values[0] ?? null;
    if (!value) return null;
    return languageMatches(value, locale?.trim() || catalogMarket.locale)
      ? value
      : null;
  }

  async listAdminSolutions(principal: Principal) {
    requirePermission(principal, "admin.configuration.manage");
    return this.repository.list({ publicOnly: false });
  }

  async createSolution(
    principal: Principal,
    input: unknown,
    idempotencyKey: unknown,
  ) {
    const actor = this.requireMutationActor(principal);
    const parsed = createSolutionInputSchema.parse(input);
    const value: CreateSolutionInput & {
      releaseNotes: SolutionDefinition["releaseNotes"];
    } = { ...parsed, releaseNotes: parsed.releaseNotes ?? [] };
    return this.repository.create(
      value,
      actor,
      this.evidence("create", value, idempotencyKey),
    );
  }

  async updateSolution(
    principal: Principal,
    solutionId: string,
    input: unknown,
    idempotencyKey: unknown,
  ) {
    const actor = this.requireMutationActor(principal);
    const parsed = updateSolutionInputSchema.parse(input);
    const current = await this.requireSolution(solutionId);
    solutionDefinitionSchema.parse({
      ...current,
      ...normalizedUpdateForValidation(parsed),
      id: current.id,
      lifecycle: current.lifecycle,
      createdAt: current.createdAt,
      updatedAt: current.updatedAt,
    });
    return this.repository.update(
      solutionId,
      parsed as UpdateSolutionInput,
      actor,
      this.evidence("update", { solutionId, input: parsed }, idempotencyKey),
    );
  }

  async reorderSolutions(
    principal: Principal,
    input: unknown,
    idempotencyKey: unknown,
  ) {
    const actor = this.requireMutationActor(principal);
    const parsed = reorderSolutionsInputSchema.parse(input);
    const current = await this.repository.list({ publicOnly: false });
    const knownIds = new Set(current.map((value) => value.id));
    if (
      parsed.solutionIds.length !== current.length ||
      parsed.solutionIds.some((id) => !knownIds.has(id))
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "L’ordre doit référencer chaque solution exactement une fois.",
      });
    }
    return this.repository.reorder(
      parsed.solutionIds,
      actor,
      this.evidence("reorder", parsed, idempotencyKey),
    );
  }

  async transitionLifecycle(
    principal: Principal,
    solutionId: string,
    input: unknown,
    idempotencyKey: unknown,
  ) {
    const actor = this.requireMutationActor(principal);
    const parsed = transitionSolutionLifecycleInputSchema.parse(input);
    const current = await this.requireSolution(solutionId);
    if (current.lifecycle === parsed.lifecycle) {
      throw new AppError({
        code: "CONFLICT",
        message: "La solution utilise déjà ce cycle de vie.",
      });
    }
    if (
      current.lifecycle === "RETIRED" &&
      [
        "COMING_SOON",
        "BETA",
        "AVAILABLE",
        "MAINTENANCE",
        "DEPRECATED",
      ].includes(parsed.lifecycle)
    ) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Une solution retirée doit d’abord repasser par un cycle privé.",
      });
    }
    solutionDefinitionSchema.parse({
      ...current,
      lifecycle: parsed.lifecycle,
      updatedAt: current.updatedAt,
    });
    return this.repository.transition(
      solutionId,
      parsed.lifecycle,
      parsed.explanation,
      actor,
      this.evidence("transition", { solutionId, ...parsed }, idempotencyKey),
    );
  }

  async listLifecycleHistory(principal: Principal, solutionId: string) {
    requirePermission(principal, "admin.configuration.manage");
    return this.repository.listLifecycleHistory(solutionId);
  }

  private requireMutationActor(principal: Principal): SolutionMutationActor {
    requirePermission(principal, "admin.configuration.manage");
    requireRecentAuthentication(principal);
    return {
      id: principal.userId,
      name: principal.email || principal.userId,
      role: principal.staffRole || principal.role,
    };
  }

  private evidence(
    operation: string,
    payload: unknown,
    rawIdempotencyKey: unknown,
  ): SolutionMutationEvidence {
    const idempotencyKey = Array.isArray(rawIdempotencyKey)
      ? rawIdempotencyKey[0]
      : rawIdempotencyKey;
    if (
      typeof idempotencyKey !== "string" ||
      idempotencyKey.length < 8 ||
      idempotencyKey.length > 255
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une clé d’idempotence valide est requise.",
      });
    }
    return {
      idempotencyKey,
      requestHash: createHash("sha256")
        .update(JSON.stringify({ operation, payload }))
        .digest("hex"),
    };
  }

  private async requireSolution(solutionId: string) {
    const value = await this.repository.getById(solutionId);
    if (!value) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Solution introuvable.",
      });
    }
    return value;
  }
}

export const solutionsService = new SolutionsService();
