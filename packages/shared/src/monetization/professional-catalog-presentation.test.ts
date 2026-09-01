import { describe, expect, it } from "vitest";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import {
  PROPOSED_MONETIZATION_DRAFT_CATALOG,
  PROPOSED_MONETIZATION_DRAFT_VERSION,
} from "@shongre/contracts/monetization-proposed-catalog";
import { selectProfessionalCatalogPresentation } from "./professional-catalog-presentation";

describe("professional catalogue presentation", () => {
  it("presents the newest explicit migration target without legacy plan duplication", () => {
    const presentation = selectProfessionalCatalogPresentation(
      BASELINE_MONETIZATION_CATALOG,
      [
        {
          version: PROPOSED_MONETIZATION_DRAFT_VERSION,
          catalog: PROPOSED_MONETIZATION_DRAFT_CATALOG,
        },
      ],
    );

    expect(presentation).toMatchObject({
      mode: "draft_preview",
      checkoutEnabled: false,
      planProductIds: [
        "pro.target.starter",
        "pro.target.growth",
        "pro.target.performance",
      ],
    });
    expect(
      presentation.planProductIds.some((productId) =>
        productId.startsWith("plan.pro."),
      ),
    ).toBe(false);
    expect(new Set(presentation.planProductIds).size).toBe(
      presentation.planProductIds.length,
    );
    expect(presentation.catalog).not.toHaveProperty("commercialEconomics");
    expect(presentation.catalog).not.toHaveProperty("providerMappings");
    expect(presentation.catalog).not.toHaveProperty("migrationMappings");
    expect(presentation.catalog).not.toHaveProperty("commissionPolicies");
  });

  it("uses the active catalogue when no newer migration target exists", () => {
    const presentation = selectProfessionalCatalogPresentation(
      BASELINE_MONETIZATION_CATALOG,
      [],
    );

    expect(presentation.mode).toBe("active");
    expect(presentation.checkoutEnabled).toBe(true);
    expect(presentation.catalog.configurationVersionId).toBe(
      BASELINE_MONETIZATION_CATALOG.configurationVersionId,
    );
    expect(presentation.planProductIds).toContain("plan.pro.business");
  });

  it("ignores a newer catalogue that does not define migration targets", () => {
    const unrelated = structuredClone(PROPOSED_MONETIZATION_DRAFT_CATALOG);
    unrelated.migrationMappings = [];

    const presentation = selectProfessionalCatalogPresentation(
      BASELINE_MONETIZATION_CATALOG,
      [
        {
          version: PROPOSED_MONETIZATION_DRAFT_VERSION,
          catalog: unrelated,
        },
      ],
    );

    expect(presentation.mode).toBe("active");
  });

  it("keeps legacy plans and add-ons out after the target catalogue is active", () => {
    const published = structuredClone(PROPOSED_MONETIZATION_DRAFT_CATALOG);
    const targetIds = new Set([
      "pro.target.starter",
      "pro.target.growth",
      "pro.target.performance",
      "visibility.bump.v4",
      "visibility.featured.3d.v4",
    ]);
    published.products.forEach((product) => {
      product.status = targetIds.has(product.id) ? "active" : "archived";
    });

    const presentation = selectProfessionalCatalogPresentation(published, [
      {
        version: {
          id: BASELINE_MONETIZATION_CATALOG.configurationVersionId,
          setId: "commercial-core",
          versionNumber: BASELINE_MONETIZATION_CATALOG.versionNumber,
          marketCode: "FR",
          status: "archived",
          reason: "Version précédente conservée pour preuve historique",
          createdBy: "system:test",
          createdAt: BASELINE_MONETIZATION_CATALOG.generatedAt,
          productCount: BASELINE_MONETIZATION_CATALOG.products.length,
          ruleCount: BASELINE_MONETIZATION_CATALOG.rules.length,
          conflicts: [],
        },
        catalog: BASELINE_MONETIZATION_CATALOG,
      },
    ]);

    expect(presentation.mode).toBe("active");
    expect(presentation.checkoutEnabled).toBe(true);
    expect(presentation.planProductIds).toEqual([
      "pro.target.starter",
      "pro.target.growth",
      "pro.target.performance",
    ]);
    expect(presentation.addonProductIds).toEqual([
      "visibility.bump.v4",
      "visibility.featured.3d.v4",
    ]);
    expect(
      presentation.catalog.products.some((product) =>
        product.id.startsWith("plan.pro."),
      ),
    ).toBe(false);
  });
});
