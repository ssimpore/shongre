import type { SolutionsServiceContract } from "../../contracts/solutions.contract";
import type {
  CreateSolutionInput,
  SolutionDefinition,
  SolutionLifecycle,
  SolutionLifecycleHistoryEntry,
  SolutionListOptions,
  SolutionsAdminActor,
  UpdateSolutionInput,
} from "../../../domains/solutions/solutions.types";
import { deterministicRuntimeId } from "../../../utilities/deterministic-id";
import { httpClient } from "./http-client";

let mutationSequence = 0;

function idempotencyKey(operation: string): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `solutions:${operation}:${globalThis.crypto.randomUUID()}`;
  }
  mutationSequence += 1;
  return deterministicRuntimeId("solutions-mutation", [
    operation,
    String(mutationSequence),
  ]);
}

function mutationHeaders(operation: string): HeadersInit {
  return { "Idempotency-Key": idempotencyKey(operation) };
}

function marketOptions(options: SolutionListOptions) {
  return {
    params: { locale: options.language },
    headers: options.marketCode
      ? { "X-Shongre-Market": options.marketCode.toUpperCase() }
      : undefined,
  };
}

const CLEARABLE_UPDATE_FIELDS = [
  "availableFrom",
  "availableUntil",
  "launchApplicationId",
  "launchPath",
  "documentationUrl",
  "entitlementKey",
  "notice",
  "maintenanceMessage",
  "replacementSlug",
] as const;

function serializeUpdate(input: UpdateSolutionInput): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...input };
  for (const field of CLEARABLE_UPDATE_FIELDS) {
    if (
      Object.prototype.hasOwnProperty.call(input, field) &&
      input[field] === undefined
    ) {
      payload[field] = null;
    }
  }
  return payload;
}

export class HttpSolutionsService implements SolutionsServiceContract {
  listPublicSolutions(
    options: SolutionListOptions = {},
  ): Promise<SolutionDefinition[]> {
    return httpClient.get<SolutionDefinition[]>(
      "/solutions",
      marketOptions(options),
    );
  }

  getSolutionBySlug(
    slug: string,
    options: SolutionListOptions & { includeAdminOnly?: boolean } = {},
  ): Promise<SolutionDefinition | null> {
    return httpClient.get<SolutionDefinition | null>(
      `/solutions/${encodeURIComponent(slug)}`,
      marketOptions(options),
    );
  }

  listAdminSolutions(
    _actor: SolutionsAdminActor,
  ): Promise<SolutionDefinition[]> {
    return httpClient.get<SolutionDefinition[]>("/admin/solutions");
  }

  createSolution(
    input: CreateSolutionInput,
    _actor: SolutionsAdminActor,
  ): Promise<SolutionDefinition> {
    return httpClient.post<SolutionDefinition>("/admin/solutions", input, {
      headers: mutationHeaders("create"),
    });
  }

  updateSolution(
    solutionId: string,
    input: UpdateSolutionInput,
    _actor: SolutionsAdminActor,
  ): Promise<SolutionDefinition> {
    return httpClient.patch<SolutionDefinition>(
      `/admin/solutions/${encodeURIComponent(solutionId)}`,
      serializeUpdate(input),
      { headers: mutationHeaders("update") },
    );
  }

  reorderSolutions(
    solutionIds: readonly string[],
    _actor: SolutionsAdminActor,
  ): Promise<SolutionDefinition[]> {
    return httpClient.put<SolutionDefinition[]>(
      "/admin/solutions/order",
      { solutionIds },
      { headers: mutationHeaders("reorder") },
    );
  }

  transitionLifecycle(
    solutionId: string,
    lifecycle: SolutionLifecycle,
    options: { explanation: string; actor: SolutionsAdminActor },
  ): Promise<SolutionDefinition> {
    return httpClient.post<SolutionDefinition>(
      `/admin/solutions/${encodeURIComponent(solutionId)}/lifecycle`,
      { lifecycle, explanation: options.explanation },
      { headers: mutationHeaders("transition") },
    );
  }

  listLifecycleHistory(
    solutionId: string,
    _actor: SolutionsAdminActor,
  ): Promise<SolutionLifecycleHistoryEntry[]> {
    return httpClient.get<SolutionLifecycleHistoryEntry[]>(
      `/admin/solutions/${encodeURIComponent(solutionId)}/lifecycle-history`,
    );
  }
}

export const httpSolutionsService = new HttpSolutionsService();
