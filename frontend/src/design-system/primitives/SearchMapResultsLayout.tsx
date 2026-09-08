import type { ReactNode } from "react";

export interface SearchMapResultsLayoutProps {
  results: ReactNode;
  map: ReactNode;
  resultsLabel: string;
  narrowView?: "map" | "results";
  className?: string;
}

/**
 * Shared map-search workspace. Wide screens keep a bounded, independently
 * scrollable result list beside the map; smaller screens preserve the complete
 * map and rely on its marker preview instead of compressing both surfaces.
 */
export function SearchMapResultsLayout({
  results,
  map,
  resultsLabel,
  narrowView = "map",
  className = "",
}: SearchMapResultsLayoutProps) {
  return (
    <div
      data-search-map-results-layout="true"
      className={`grid min-w-0 items-start gap-4 xl:grid-cols-search-map-split ${className}`}
    >
      <section
        data-search-map-results-list="true"
        aria-label={resultsLabel}
        className={`search-map-results-list min-w-0 ${
          narrowView === "map" ? "hidden" : "block"
        } xl:block xl:h-search-map-panel xl:overflow-y-auto xl:overscroll-contain xl:pr-1`}
      >
        {results}
      </section>
      <div
        data-search-map-panel="true"
        className={`${
          narrowView === "results" ? "hidden" : "block"
        } h-search-map min-h-112 min-w-0 sm:h-search-map-tall xl:sticky xl:top-24 xl:block xl:h-search-map-panel`}
      >
        {map}
      </div>
    </div>
  );
}
