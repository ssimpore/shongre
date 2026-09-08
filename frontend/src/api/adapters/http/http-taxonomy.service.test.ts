import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpTaxonomyService } from "./http-taxonomy.service";
import { activeDataLocale } from "../../../i18n/localized";
import { apiOperation } from "./generated-api-operation";

vi.mock("../../../i18n/localized", () => ({
  activeDataLocale: vi.fn(() => "fr-FR"),
}));
vi.mock("./generated-api-operation", () => ({ apiOperation: vi.fn() }));

describe("HttpTaxonomyService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(activeDataLocale).mockReturnValue("fr-FR");
  });

  it("localizes roots and children using API labels without changing identities", async () => {
    vi.mocked(activeDataLocale).mockReturnValue("en-US");
    vi.mocked(apiOperation).mockResolvedValue([
      {
        id: "vehicles",
        slug: "vehicules",
        name: "Véhicules",
        labels: { "fr-FR": "Véhicules", "en-US": "Vehicles" },
        shortLabels: { "fr-FR": "Autos", "en-US": "Autos" },
        subcategories: [
          {
            id: "vehicles.cars",
            slug: "voitures",
            name: "Voitures",
            labels: { "fr-FR": "Voitures", "en-US": "Cars" },
          },
        ],
      },
    ]);
    expect(await new HttpTaxonomyService().getRootCategories()).toEqual([
      expect.objectContaining({
        id: "vehicles",
        slug: "vehicules",
        name: "Vehicles",
        subCategories: [
          expect.objectContaining({ id: "vehicles.cars", name: "Cars" }),
        ],
      }),
    ]);
  });

  it("maps the API compatibility projection into frontend categories", async () => {
    vi.mocked(apiOperation).mockResolvedValue([
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
    expect(apiOperation).toHaveBeenCalledWith("getTaxonomyRoot", {});
  });
});
