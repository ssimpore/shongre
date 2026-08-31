import { storageService } from "../../../services/storage.service";
import type {
  SolutionDefinition,
  SolutionLifecycleHistoryEntry,
} from "../../../domains/solutions/solutions.types";
import { DEMO_SOLUTIONS } from "./demo-solutions.data";

const STORAGE_KEY = "shongre_solutions_catalog_v1";
const HISTORY_KEY = "shongre_solutions_history_v1";
const clone = <T>(value: T): T => structuredClone(value);

const legacyCatalogVisibility = (solution: SolutionDefinition): boolean => {
  const seeded = DEMO_SOLUTIONS.find((value) => value.id === solution.id);
  return (
    solution.catalogVisible ??
    seeded?.catalogVisible ??
    !["DRAFT", "INTERNAL", "RETIRED"].includes(solution.lifecycle)
  );
};

export class DemoSolutionsStore {
  list(): SolutionDefinition[] {
    const stored = storageService.get<SolutionDefinition[]>(STORAGE_KEY, [
      ...DEMO_SOLUTIONS,
    ]);
    const storedIds = new Set(stored.map((solution) => solution.id));
    const newlySeeded = DEMO_SOLUTIONS.filter(
      (solution) => !storedIds.has(solution.id),
    );
    return clone(
      [...stored, ...newlySeeded].map((solution) => ({
        ...solution,
        catalogVisible: legacyCatalogVisibility(solution),
      })),
    );
  }

  save(solutions: SolutionDefinition[]): void {
    storageService.set(STORAGE_KEY, clone(solutions));
  }

  history(): SolutionLifecycleHistoryEntry[] {
    return clone(storageService.get(HISTORY_KEY, []));
  }

  saveHistory(entries: SolutionLifecycleHistoryEntry[]): void {
    storageService.set(HISTORY_KEY, clone(entries));
  }

  reset(): void {
    storageService.remove(STORAGE_KEY);
    storageService.remove(HISTORY_KEY);
  }
}

export const demoSolutionsStore = new DemoSolutionsStore();
