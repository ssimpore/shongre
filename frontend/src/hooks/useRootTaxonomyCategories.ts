import { useCallback, useEffect, useState } from "react";
import { services } from "../api/client/service-registry";
import type { Category } from "../types";

export interface RootTaxonomyCategoriesState {
  categories: Category[];
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
}

/** Loads the public category collection through the active service adapter. */
export function useRootTaxonomyCategories(
  scope = "default",
): RootTaxonomyCategoriesState {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(null);
    void services.taxonomy
      .getRootCategories()
      .then((nextCategories) => {
        if (active) setCategories(nextCategories);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setCategories([]);
        setError(
          reason instanceof Error
            ? reason
            : new Error("Taxonomy categories are unavailable."),
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [attempt, scope]);

  return { categories, isLoading, error, reload };
}
