import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpTaxonomyService } from "./http-taxonomy.service";
import { httpClient } from "./http-client";

describe("HttpTaxonomyService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps the API compatibility projection into frontend categories", async () => {
    vi.spyOn(httpClient, "get").mockResolvedValue([
      {
        id: "vehicles",
        slug: "vehicules",
        name: "Véhicules",
        shortLabel: "Véhicules",
        iconName: "car",
        subcategories: [
          {
            id: "vehicles.cars",
            slug: "voitures",
            name: "Voitures",
            iconName: "car-front",
          },
        ],
      },
    ]);

    await expect(
      new HttpTaxonomyService().getRootCategories(),
    ).resolves.toEqual([
      {
        id: "vehicles",
        slug: "vehicules",
        name: "Véhicules",
        label: "Véhicules",
        shortLabel: "Véhicules",
        iconName: "car",
        description: "Véhicules",
        subCategories: [
          {
            id: "vehicles.cars",
            slug: "voitures",
            name: "Voitures",
            label: "Voitures",
            shortLabel: undefined,
            parentSlug: "vehicules",
            iconName: "car-front",
            attributesSchema: [],
          },
        ],
      },
    ]);
    expect(httpClient.get).toHaveBeenCalledWith("/taxonomy/root");
  });
});
