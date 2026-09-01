import { describe, expect, it } from "vitest";
import { buildTaxonomyCoverageReport } from "./taxonomy.coverage";
import { taxonomyService } from "./taxonomy.service";
import { TaxonomyMigration } from "./taxonomy.migration";
import { INITIAL_LISTINGS } from "../../mocks/initialDemoData";

describe("canonical taxonomy coverage gate", () => {
  it("keeps every active publishable leaf complete", () => {
    const report = buildTaxonomyCoverageReport();

    expect(report.totals.roots).toBe(19);
    expect(report.totals.publishableLeaves).toBe(212);
    expect(report.totals.completeLeaves).toBe(report.totals.publishableLeaves);
    expect(report.blockingIssues).toEqual([]);
  });

  it("resolves a free standard policy and relevant buyer comparison for every leaf", () => {
    taxonomyService.getPublishableLeaves().forEach((node) => {
      const schema = taxonomyService.resolvePublicationSchema(node.id);

      expect(schema?.publication.standardPolicy).toMatchObject({
        enabled: true,
        label: "Publication standard gratuite",
        paidUpgradesOptional: true,
      });
      if (schema?.sellerEligibility.individualAllowed) {
        expect(schema.publication.standardPolicy.eligibleSellerTypes).toContain(
          "individual",
        );
      }
      expect(
        taxonomyService.getComparisonAttributes(node.id).length,
      ).toBeGreaterThan(0);
    });
  });

  it("only compares listings classified in the same publishable leaf", () => {
    expect(
      taxonomyService.canCompare([
        "vehicles.cars.city_cars",
        "vehicles.cars.city_cars",
      ]),
    ).toBe(true);
    expect(
      taxonomyService.canCompare([
        "vehicles.cars.city_cars",
        "vehicles.motos.motorcycles",
      ]),
    ).toBe(false);
  });

  it("keeps every seeded listing reference resolvable through canonical aliases", () => {
    const dryRun = TaxonomyMigration.buildDryRunReport(INITIAL_LISTINGS);
    expect(dryRun.length).toBeGreaterThan(0);
    expect(dryRun.filter((entry) => entry.status === "ambiguous")).toEqual([]);

    INITIAL_LISTINGS.forEach((listing) => {
      const normalized = TaxonomyMigration.normalizeListingCategory(listing);
      expect(
        taxonomyService.getNode(normalized.categoryId),
        listing.id,
      ).toBeDefined();
    });
  });
});
