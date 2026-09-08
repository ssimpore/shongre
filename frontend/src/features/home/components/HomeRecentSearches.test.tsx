import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import {
  createDefaultHomepageConfiguration,
  resolveHomepageConfiguration,
} from "@shongre/contracts/homepage";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { HomeRecentSearches } from "./HomeRecentSearches";

const state = vi.hoisted(() => ({
  searches: [] as string[],
  removeSearch: vi.fn(),
}));
vi.mock("../../../hooks/useRecentSearches", () => ({
  useRecentSearches: () => ({
    recentSearches: state.searches,
    removeSearch: state.removeSearch,
  }),
}));

const section: HomepageSectionView = {
  ...resolveHomepageConfiguration(
    createDefaultHomepageConfiguration({ marketCode: "FR", locale: "fr-FR" }),
  ).sections.find((item) => item.type === "recent_searches")!,
  status: "ready",
};
function render(overrides: Partial<HomepageSectionView> = {}) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <HomeRecentSearches section={{ ...section, ...overrides }} />
    </MemoryRouter>,
  );
}

describe("HomeRecentSearches", () => {
  it("renders nothing for empty history rather than sample queries", () => {
    state.searches = [];
    expect(render()).toBe("");
  });
  it("uses real search routes, escaped text, accessible removal and the configured limit", () => {
    state.searches = ["Table & chaise", "<script>query</script>", "Vélo"];
    const html = render({ maxItems: 2, title: "Reprendre mes recherches" });
    expect(html).toContain("Reprendre mes recherches");
    expect(html).toContain("/recherche?query=Table+%26+chaise");
    expect(html).toContain("&lt;script&gt;query&lt;/script&gt;");
    expect(html).not.toContain("Vélo");
    expect(html).toContain(
      'aria-label="Supprimer cette recherche : Table &amp; chaise"',
    );
    expect(html).not.toContain("truncate");
  });
  it("respects the published viewport targeting", () => {
    state.searches = ["Table"];
    expect(render({ mobileVisible: false })).toContain("hidden sm:block");
  });
});
