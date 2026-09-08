import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";

vi.mock("@/api/http-client", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/api/http-client";
import { HttpMobileTaxonomyService } from "@/features/taxonomy/taxonomy.service";

const marketContext = resolveMarketContext({
  hostname: "fr.mobile-test.shongre.invalid",
  pathname: "/",
  infrastructure: {
    franceDomain: "fr.mobile-test.shongre.invalid",
    globalDomain: "intl.mobile-test.shongre.invalid",
    canonicalProtocol: "https",
  },
});

const marketAvailability = ["FR", "BE", "CH", "SN", "BF"].map((marketCode) => ({
  marketCode,
  status: marketCode === "FR" ? "active" : "unavailable",
  marketplaceEnabled: marketCode === "FR",
  indexable: marketCode === "FR",
}));
const category = {
  id: "vehicles.cars.suv",
  sourceKey: "vehicles.cars.suv",
  level: 2,
  slug: "suv",
  labels: { "fr-FR": "SUV" },
  shortLabels: { "fr-FR": "SUV" },
  iconName: "car",
  sortOrder: 0,
  status: "active",
  publishable: true,
  sellerEligibility: {
    individualAllowed: true,
    professionalAllowed: true,
  },
  marketAvailability,
  seo: { indexable: true },
};
const listingType = {
  id: "vehicles.cars.suv.listing",
  sourceKey: "vehicles.cars.suv.listing",
  categoryId: category.id,
  verticalId: "auto",
  publicationFlow: "default",
  intent: "SELL",
  intentLabel: { "fr-FR": "Vendre" },
  labels: { "fr-FR": "Annonce SUV" },
  slug: "annonce-suv",
  sellerEligibility: {
    individualAllowed: true,
    professionalAllowed: true,
  },
  status: "active",
  marketAvailability,
  seoIndexable: true,
};
const tree = {
  taxonomyVersion: "4.0.0",
  compilerVersion: "test",
  checksum: "0".repeat(64),
  marketCode: "FR",
  locale: "fr-FR",
  items: [category],
  listingTypes: [listingType],
};
const resolved = {
  taxonomyVersion: "4.0.0",
  category,
  listingType,
  attributes: [],
  dependencyRules: [],
  validationRules: [],
  eligible: true,
  locale: "fr-FR",
  marketCode: "FR",
  projections: {
    filters: [],
    cardFields: [],
    detailFields: [],
    publicationFlow: [],
    search: null,
    seo: null,
  },
};
const options = {
  items: [],
  total: 0,
  taxonomyVersion: "4.0.0",
};

describe("API-backed mobile taxonomy service", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset());

  it("loads the versioned taxonomy tree from the canonical API", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce(tree);

    await expect(
      new HttpMobileTaxonomyService().tree({
        marketContext,
        locale: "fr-FR",
      }),
    ).resolves.toEqual(tree);
    expect(apiRequest).toHaveBeenCalledWith(
      "/taxonomy/v4/tree?locale=fr-FR&version=4.0.0",
      expect.objectContaining({ method: "GET", headers: expect.any(Headers) }),
      "FR",
    );
  });

  it("encodes schema and bounded option queries without local resolution", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(resolved)
      .mockResolvedValueOnce(options);
    const service = new HttpMobileTaxonomyService();

    await service.resolve({
      marketContext,
      categoryIdentity: "vehicles.cars.suv",
      listingTypeId: "vehicles.cars.suv.listing",
      sellerType: "individual",
      locale: "fr-FR",
      taxonomyVersion: "4.0.0",
    });
    await service.lookupOptions({
      marketContext,
      optionSetId: "OS_VEHICLE_MODEL",
      parentOptionId: "OS_VEHICLE_BRAND:renault",
      limit: 5,
    });

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/taxonomy/v4/resolve?category=vehicles.cars.suv&sellerType=individual&locale=fr-FR&version=4.0.0&listingTypeId=vehicles.cars.suv.listing",
      expect.objectContaining({ method: "GET", headers: expect.any(Headers) }),
      "FR",
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/taxonomy/v4/options/OS_VEHICLE_MODEL?version=4.0.0&parentOptionId=OS_VEHICLE_BRAND%3Arenault&limit=5",
      expect.objectContaining({ method: "GET", headers: expect.any(Headers) }),
      "FR",
    );
  });

  it("propagates lookup failures instead of using the bundled taxonomy", async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error("offline"));

    await expect(
      new HttpMobileTaxonomyService().tree({
        marketContext,
        locale: "fr-FR",
      }),
    ).rejects.toThrow("offline");
  });
});
