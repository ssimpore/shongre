import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
}));
import {
  resolveMarketContext,
  TaxonomyV4PublicResolver,
} from "@shongre/contracts";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import { taxonomyService } from "@/features/taxonomy/taxonomy.service";

const marketContext = resolveMarketContext({
  hostname: "fr.mobile-test.shongre.invalid",
  pathname: "/",
  infrastructure: {
    franceDomain: "fr.mobile-test.shongre.invalid",
    globalDomain: "intl.mobile-test.shongre.invalid",
    canonicalProtocol: "https",
  },
});

describe("mobile taxonomy service", () => {
  it("matches the shared Web/demo projection and resolved schema", async () => {
    const shared = new TaxonomyV4PublicResolver(getTaxonomyV4PublicBundle());
    const input = {
      marketContext,
      categoryIdentity: "vehicles.cars.suv",
      listingTypeId: "vehicles.cars.suv.listing",
      sellerType: "individual" as const,
      locale: "fr-FR",
      taxonomyVersion: "4.0.0",
    };
    const [mobileTree, mobileSchema] = await Promise.all([
      taxonomyService.tree({ marketContext, locale: "fr-FR" }),
      taxonomyService.resolve(input),
    ]);
    const sharedSchema = shared.resolve(input);
    expect(mobileTree.items.map((item) => item.id)).toEqual(
      shared.tree(marketContext, "fr-FR").items.map((item) => item.id),
    );
    expect(mobileSchema.listingType.id).toBe(sharedSchema.listingType.id);
    expect(
      mobileSchema.attributes.map(({ definition }) => definition.id),
    ).toEqual(sharedSchema.attributes.map(({ definition }) => definition.id));
  });

  it("returns the same bounded cascade children as the shared resolver", async () => {
    const shared = new TaxonomyV4PublicResolver(getTaxonomyV4PublicBundle());
    const input = {
      marketContext,
      optionSetId: "OS_VEHICLE_MODEL",
      parentOptionId: "OS_VEHICLE_BRAND:renault",
      limit: 5,
    };
    await expect(taxonomyService.lookupOptions(input)).resolves.toEqual(
      shared.lookupOptions(input),
    );
  });
});
