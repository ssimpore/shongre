import type {
  CreateSolutionInput,
  SolutionDefinition,
  SolutionLifecycle,
  SolutionLifecycleHistoryEntry,
  SolutionListOptions,
  UpdateSolutionInput,
} from "../../domains/solutions/solutions.types";

export interface SolutionsServiceContract {
  listPublicSolutions(
    options?: SolutionListOptions,
  ): Promise<SolutionDefinition[]>;
  getSolutionBySlug(
    slug: string,
    options?: SolutionListOptions & { includeAdminOnly?: boolean },
  ): Promise<SolutionDefinition | null>;
  listAdminSolutions(): Promise<SolutionDefinition[]>;
  createSolution(input: CreateSolutionInput): Promise<SolutionDefinition>;
  updateSolution(
    solutionId: string,
    input: UpdateSolutionInput,
  ): Promise<SolutionDefinition>;
  reorderSolutions(
    solutionIds: readonly string[],
  ): Promise<SolutionDefinition[]>;
  transitionLifecycle(
    solutionId: string,
    lifecycle: SolutionLifecycle,
    options: { explanation: string },
  ): Promise<SolutionDefinition>;
  listLifecycleHistory(
    solutionId: string,
  ): Promise<SolutionLifecycleHistoryEntry[]>;
}
