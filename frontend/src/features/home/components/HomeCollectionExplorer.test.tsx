import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import {
  createDefaultHomepageConfiguration,
  resolveHomepageConfiguration,
} from "@shongre/contracts/homepage";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import type { Collection } from "../../../domains/collection/collection.types";
import {
  HomeCollectionExplorer,
  selectHomeCollections,
} from "./HomeCollectionExplorer";

const queryState = vi.hoisted(() => ({
  data: undefined,
  isPending: true,
  isError: false,
  refetch: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => queryState }));
vi.mock("../../../app/providers/MarketLocationProvider", () => ({
  useMarketLocation: () => ({
    currentLocale: "fr-FR",
    marketContext: { countryCode: "FR" },
  }),
}));

const section: HomepageSectionView = {
  ...resolveHomepageConfiguration(
    createDefaultHomepageConfiguration({ marketCode: "FR", locale: "fr-FR" }),
  ).sections.find((item) => item.type === "collections")!,
  status: "ready",
};
const items = ["maison", "velo", "mode"].map(
  (slug, index) => ({ id: slug, slug, listingCount: index + 1 }) as Collection,
);

describe("homepage collection selection", () => {
  it("renders a bounded loading state and an accessible retry instead of invented collections", () => {
    const render = () =>
      renderToStaticMarkup(
        <MemoryRouter>
          <HomeCollectionExplorer section={section} />
        </MemoryRouter>,
      );
    expect(render()).toContain('role="status"');
    queryState.isPending = false;
    queryState.isError = true;
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).toContain("Réessayer");
    expect(html).not.toContain("/collections/maison");
    queryState.isError = false;
    expect(render()).toBe("");
  });
  it("uses the API inventory order only when automatic selection is published", () => {
    expect(selectHomeCollections(items, { ...section, maxItems: 2 })).toEqual(
      items.slice(0, 2),
    );
    expect(selectHomeCollections([], section)).toEqual([]);
  });
  it("preserves manual order, omits unavailable slugs and never substitutes an empty selection", () => {
    expect(
      selectHomeCollections(items, {
        ...section,
        settings: {
          selectionMode: "manual",
          collectionSlugs: ["mode", "retired", "maison"],
        },
      }),
    ).toEqual([items[2], items[0]]);
    expect(
      selectHomeCollections(items, {
        ...section,
        settings: { selectionMode: "manual", collectionSlugs: [] },
      }),
    ).toEqual([]);
    expect(selectHomeCollections(items, { ...section, settings: {} })).toEqual(
      [],
    );
  });
  it("applies minimum eligible listings to each collection, not to the number of cards", () => {
    expect(
      selectHomeCollections(items, { ...section, minimumListingCount: 3 }),
    ).toEqual([items[2]]);
    expect(
      selectHomeCollections([{ ...items[0]!, listingCount: 0 }], section),
    ).toEqual([]);
  });
});
