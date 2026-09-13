import type { SolutionsServiceContract } from "../../contracts/solutions.contract";
import { apiOperation } from "./generated-api-operation";
import type {
  CreateSolutionInput,
  SolutionDefinition,
  SolutionLifecycle,
  SolutionLifecycleHistoryEntry,
  SolutionListOptions,
  UpdateSolutionInput,
} from "../../../domains/solutions/solutions.types";
import { deterministicRuntimeId } from "../../../utilities/deterministic-id";

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
    const request = marketOptions(options);
    return apiOperation<SolutionDefinition[], "getSolutions">("getSolutions", {
      query: request.params,
      headers: request.headers,
    });
  }

  getSolutionBySlug(
    slug: string,
    options: SolutionListOptions & { includeAdminOnly?: boolean } = {},
  ): Promise<SolutionDefinition | null> {
    const request = marketOptions(options);
    return apiOperation<SolutionDefinition | null, "getSolutionBySlug">(
      "getSolutionBySlug",
      {
        path: { solutionSlug: slug },
        query: request.params,
        headers: request.headers,
      },
    );
  }

  listAdminSolutions(): Promise<SolutionDefinition[]> {
    return apiOperation<SolutionDefinition[], "getAdminSolutions">(
      "getAdminSolutions",
      {},
    );
  }

  createSolution(input: CreateSolutionInput): Promise<SolutionDefinition> {
    return apiOperation<SolutionDefinition, "postAdminSolution">(
      "postAdminSolution",
      { body: input, headers: mutationHeaders("create") },
    );
  }

  updateSolution(
    solutionId: string,
    input: UpdateSolutionInput,
  ): Promise<SolutionDefinition> {
    return apiOperation<SolutionDefinition, "patchAdminSolution">(
      "patchAdminSolution",
      {
        path: { solutionId: solutionId },
        body: serializeUpdate(input),
        headers: mutationHeaders("update"),
      },
    );
  }

  reorderSolutions(
    solutionIds: readonly string[],
  ): Promise<SolutionDefinition[]> {
    return apiOperation<SolutionDefinition[], "putAdminSolutionsOrder">(
      "putAdminSolutionsOrder",
      { body: { solutionIds }, headers: mutationHeaders("reorder") },
    );
  }

  transitionLifecycle(
    solutionId: string,
    lifecycle: SolutionLifecycle,
    options: { explanation: string },
  ): Promise<SolutionDefinition> {
    return apiOperation<SolutionDefinition, "postAdminSolutionLifecycle">(
      "postAdminSolutionLifecycle",
      {
        path: { solutionId: solutionId },
        body: { lifecycle, explanation: options.explanation },
        headers: mutationHeaders("transition"),
      },
    );
  }

  listLifecycleHistory(
    solutionId: string,
  ): Promise<SolutionLifecycleHistoryEntry[]> {
    return apiOperation<
      SolutionLifecycleHistoryEntry[],
      "getAdminSolutionLifecycleHistory"
    >("getAdminSolutionLifecycleHistory", { path: { solutionId: solutionId } });
  }
}

export const httpSolutionsService = new HttpSolutionsService();
