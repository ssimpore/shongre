import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import { TaxonomyV4PublicResolver } from "@shongre/contracts/taxonomy-v4-resolver";
import { DELIVERY_TAXONOMY_CATEGORY_ID } from "@shongre/contracts/delivery";
import { excludeExternallyManagedPublicationNodes } from "./useListingOnboardingController";

const market = resolveMarketContext({
  hostname: "shongre.fr",
  pathname: "/deposer",
  infrastructure: {
    franceDomain: "shongre.fr",
    globalDomain: "shongre.com",
    canonicalProtocol: "https",
  },
});

describe("generic listing onboarding taxonomy", () => {
  it("delegates delivery requests to their private domain without hiding moving offers", () => {
    const tree = new TaxonomyV4PublicResolver(getTaxonomyV4PublicBundle()).tree(
      market,
      "fr-FR",
    );
    const genericTree = excludeExternallyManagedPublicationNodes(tree);

    expect(
      genericTree.items.some(
        (item) => item.id === DELIVERY_TAXONOMY_CATEGORY_ID,
      ),
    ).toBe(false);
    expect(
      genericTree.listingTypes.some(
        (listingType) =>
          listingType.categoryId === DELIVERY_TAXONOMY_CATEGORY_ID,
      ),
    ).toBe(false);
    expect(
      genericTree.items.some(
        (item) => item.id === "services.local_services.moving",
      ),
    ).toBe(true);
  });
});
