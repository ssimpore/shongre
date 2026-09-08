import { describe, expect, it } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { getTaxonomyV1PublicBundle } from "@shongre/contracts/testing/taxonomy";

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
    const bundle = getTaxonomyV1PublicBundle();
    const tree = {
      taxonomyVersion: "v1" as const,
      compilerVersion: bundle.metadata.compilerVersion,
      checksum: bundle.metadata.normalizedSha256,
      marketCode: "FR" as const,
      locale: market.locale!,
      items: bundle.categories,
      listingTypes: bundle.listingTypes,
    };
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
