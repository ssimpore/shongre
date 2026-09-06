import { useCallback, useEffect, useState } from "react";
import { services } from "../../api/client/service-registry";
import { PAGE_SIZES } from "../../configuration/pagination.config";
import { taxonomyService } from "../../domains/taxonomy/taxonomy.service";
import type { TaxonomyNode } from "../../domains/taxonomy/taxonomy.types";
import type { Listing } from "../../types";

const HOME_UNIVERSE_ROOT_SLUGS = [
  "maison-jardin",
  "vehicules",
  "mode",
] as const;

export type HomeUniverseListingStatus = "loading" | "ready" | "empty" | "error";

export interface HomeUniverseListingGroup {
  root: TaxonomyNode;
  status: HomeUniverseListingStatus;
  listings: Listing[];
}

const roots = HOME_UNIVERSE_ROOT_SLUGS.flatMap((slug) => {
  const root = taxonomyService.getNodeBySlug(slug);
  return root?.status === "active" ? [root] : [];
});

function groupsWithStatus(
  status: HomeUniverseListingStatus,
): HomeUniverseListingGroup[] {
  return roots.map((root) => ({ root, status, listings: [] }));
}

interface HomeUniverseListingSnapshot {
  marketCode: string;
  groups: HomeUniverseListingGroup[];
}

export async function loadHomeUniverseListingGroups(
  marketCode: string,
): Promise<HomeUniverseListingGroup[]> {
  const results = await Promise.allSettled(
    roots.map(async (root) =>
      services.listings.getListings({
        marketCode,
        categorySlug: root.id,
        sortBy: "date_desc",
        page: 1,
        limit: PAGE_SIZES.homepageUniverseListings,
      }),
    ),
  );

  return roots.map((root, index) => {
    const result = results[index];
    if (!result || result.status === "rejected") {
      return { root, status: "error", listings: [] };
    }
    return {
      root,
      status: result.value.listings.length ? "ready" : "empty",
      listings: result.value.listings,
    };
  });
}

/**
 * Loads one bounded listing result per homepage universe through the public
 * listings contract. Canonical taxonomy ids keep legacy slugs and descendants
 * inside their owning universe without introducing category logic in the UI.
 */
export function useHomeUniverseListings(marketCode: string): {
  groups: HomeUniverseListingGroup[];
  retry: () => void;
} {
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<HomeUniverseListingSnapshot>(() => ({
    marketCode,
    groups: groupsWithStatus("loading"),
  }));

  useEffect(() => {
    let cancelled = false;
    setSnapshot({ marketCode, groups: groupsWithStatus("loading") });

    void loadHomeUniverseListingGroups(marketCode).then((groups) => {
      if (cancelled) return;
      setSnapshot({ marketCode, groups });
    });

    return () => {
      cancelled = true;
    };
  }, [attempt, marketCode]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  return {
    groups:
      snapshot.marketCode === marketCode
        ? snapshot.groups
        : groupsWithStatus("loading"),
    retry,
  };
}
