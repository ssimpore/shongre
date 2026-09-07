import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchMapResultsLayout } from "./SearchMapResultsLayout";

describe("search map results layout", () => {
  it("keeps a bounded result list beside a responsive map", () => {
    const html = renderToStaticMarkup(
      <SearchMapResultsLayout
        results={<div>Cards</div>}
        map={<div>Map</div>}
        resultsLabel="Résultats sur la carte"
      />,
    );

    expect(html).toContain('data-search-map-results-layout="true"');
    expect(html).toContain("xl:grid-cols-search-map-split");
    expect(html).toContain('data-search-map-results-list="true"');
    expect(html).toContain("h-search-map-panel");
    expect(html).toContain('aria-label="Résultats sur la carte"');
    expect(html).toContain('data-search-map-panel="true"');
    expect(html).toContain("sm:h-search-map-tall");
  });
});
