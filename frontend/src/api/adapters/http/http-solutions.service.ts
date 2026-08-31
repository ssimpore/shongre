import type { SolutionsServiceContract } from "../../contracts/solutions.contract";

/**
 * Reserved adapter boundary. The current frontend contract explicitly remains
 * offline in demo mode; implementing these methods requires the future public
 * API contract and backend authorization checks.
 */
class HttpSolutionsService implements SolutionsServiceContract {
  private unavailable(): never {
    throw new Error("L’adaptateur HTTP Solutions n’est pas activé.");
  }
  listPublicSolutions(): ReturnType<
    SolutionsServiceContract["listPublicSolutions"]
  > {
    return Promise.reject(this.unavailable());
  }
  getSolutionBySlug(): ReturnType<
    SolutionsServiceContract["getSolutionBySlug"]
  > {
    return Promise.reject(this.unavailable());
  }
  listAdminSolutions(): ReturnType<
    SolutionsServiceContract["listAdminSolutions"]
  > {
    return Promise.reject(this.unavailable());
  }
  createSolution(): ReturnType<SolutionsServiceContract["createSolution"]> {
    return Promise.reject(this.unavailable());
  }
  updateSolution(): ReturnType<SolutionsServiceContract["updateSolution"]> {
    return Promise.reject(this.unavailable());
  }
  reorderSolutions(): ReturnType<SolutionsServiceContract["reorderSolutions"]> {
    return Promise.reject(this.unavailable());
  }
  transitionLifecycle(): ReturnType<
    SolutionsServiceContract["transitionLifecycle"]
  > {
    return Promise.reject(this.unavailable());
  }
  listLifecycleHistory(): ReturnType<
    SolutionsServiceContract["listLifecycleHistory"]
  > {
    return Promise.reject(this.unavailable());
  }
}

export const httpSolutionsService = new HttpSolutionsService();
