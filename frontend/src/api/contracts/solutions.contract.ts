import type {
  CreateSolutionInput,
  SolutionDefinition,
  SolutionLifecycle,
  SolutionLifecycleHistoryEntry,
  SolutionListOptions,
  SolutionsAdminActor,
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
  listAdminSolutions(actor: SolutionsAdminActor): Promise<SolutionDefinition[]>;
  createSolution(
    input: CreateSolutionInput,
    actor: SolutionsAdminActor,
  ): Promise<SolutionDefinition>;
  updateSolution(
    solutionId: string,
    input: UpdateSolutionInput,
    actor: SolutionsAdminActor,
  ): Promise<SolutionDefinition>;
  reorderSolutions(
    solutionIds: readonly string[],
    actor: SolutionsAdminActor,
  ): Promise<SolutionDefinition[]>;
  transitionLifecycle(
    solutionId: string,
    lifecycle: SolutionLifecycle,
    options: { explanation: string; actor: SolutionsAdminActor },
  ): Promise<SolutionDefinition>;
  listLifecycleHistory(
    solutionId: string,
    actor: SolutionsAdminActor,
  ): Promise<SolutionLifecycleHistoryEntry[]>;
}
