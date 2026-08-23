import { describe, it, expect } from "vitest";
import { taxonomyService } from "./taxonomy.service";
import { TaxonomyMigration } from "./taxonomy.migration";
import { publicationResolver } from "../publication/publication.resolver";

describe("Taxonomy Service & Integrity", () => {
  it("passes full structural integrity check without orphans or cycle errors", () => {
    const check = taxonomyService.validateIntegrity();
    expect(check.isValid).toBe(true);
    expect(check.errors).toHaveLength(0);
  });

  it("provides active root categories with valid icons and slugs", () => {
    const roots = taxonomyService.getRootCategories();
    expect(roots.length).toBeGreaterThanOrEqual(10);
    roots.forEach((root) => {
      expect(root.level).toBe("category");
      expect(root.status).toBe("active");
      expect(root.slug).toBeTruthy();
      expect(root.name).toBeTruthy();
    });
  });

  it("resolves publication schema with inherited capabilities and attributes for Cars", () => {
    const schema = taxonomyService.resolvePublicationSchema("vehicles.cars");
    expect(schema).not.toBeNull();
    expect(schema?.node.name).toBe("Voitures d'occasion");
    expect(schema?.conditionScheme).toBeDefined();
    expect(schema?.capabilities.canSell).toBe(true);
    expect(schema?.capabilities.reservationAllowed).toBe(true);
    expect(schema?.capabilities.fulfillmentModes).toContain("hand_delivery");

    // Attributes check
    const attrCodes = schema?.attributes.map((a) => a.code);
    expect(attrCodes).toContain("vehicle_brand");
    expect(attrCodes).toContain("mileage");
    expect(attrCodes).toContain("year");
    expect(attrCodes).toContain("fuel");
  });

  it("resolves real estate publication schema without physical parcel shipping", () => {
    const schema =
      taxonomyService.resolvePublicationSchema("real_estate.sales");
    expect(schema).not.toBeNull();
    expect(schema?.capabilities.fulfillmentModes).toContain("none");
    expect(schema?.capabilities.securePaymentAllowed).toBe(false);

    const attrCodes = schema?.attributes.map((a) => a.code);
    expect(attrCodes).toContain("surface");
    expect(attrCodes).toContain("rooms");
    expect(attrCodes).toContain("energy_class");
  });

  it("derives dynamic search filters for category node", () => {
    const facets = taxonomyService.resolveSearchFilters("vehicles.cars");
    expect(facets.length).toBeGreaterThan(3);
    const facetCodes = facets.map((f) => f.attribute.code);
    expect(facetCodes).toContain("vehicle_brand");
    expect(facetCodes).toContain("year");
    expect(facetCodes).toContain("mileage");
  });

  it("resolves card summary preview attributes", () => {
    const summary = taxonomyService.getCardSummaryAttributes("vehicles.cars");
    expect(summary.length).toBeGreaterThanOrEqual(1);
    expect(
      summary.some(
        (s) => s.id === "vehicle.year" || s.id === "vehicle.mileage",
      ),
    ).toBe(true);
  });

  it("provides a non-empty, searchable schema for every publishable leaf", () => {
    const leaves = taxonomyService.getPublishableLeaves();
    expect(leaves.length).toBeGreaterThanOrEqual(40);

    leaves.forEach((leaf) => {
      const schema = taxonomyService.resolvePublicationSchema(leaf.id);
      expect(schema?.attributes.length, leaf.id).toBeGreaterThan(0);
      expect(
        schema?.mediaGuidance?.minimumPhotoCount,
        leaf.id,
      ).toBeGreaterThanOrEqual(0);
      expect(schema?.mediaGuidance?.maxPhotoCount, leaf.id).toBeGreaterThan(0);
      expect(
        taxonomyService
          .resolveSearchFilters(leaf.id)
          .every((facet) => facet.attribute.filterable),
        leaf.id,
      ).toBe(true);
    });
  });

  it("resolves dependent publication fields and nested descendants from metadata", () => {
    const descendants = taxonomyService.getDescendants("vehicles");
    expect(
      descendants.some((node) => node.id === "vehicles.cars.citadines"),
    ).toBe(true);

    const electricSchema = publicationResolver.resolve({
      taxonomyNodeId: "vehicles.cars",
      currentValues: { fuel: "electric" },
    });
    const connector = electricSchema?.fields.find(
      (field) => field.attribute.id === "vehicle.charging_connector",
    );
    expect(connector?.isVisiblyMet).toBe(true);
    expect(connector?.fieldRole).toBe("optional");
  });

  it("migrates legacy category slugs cleanly", () => {
    const node1 = TaxonomyMigration.resolveCanonicalNode("vehicules");
    expect(node1?.id).toBe("vehicles");

    const node2 = TaxonomyMigration.resolveCanonicalNode("maison-deco");
    expect(node2?.id).toBe("home_garden");

    const node3 = TaxonomyMigration.resolveCanonicalNode("multimedia");
    expect(node3?.id).toBe("electronics");

    const redirect =
      TaxonomyMigration.resolveCanonicalRedirect("real-estate-sale");
    expect(redirect).toEqual({
      node: expect.objectContaining({ id: "real_estate.sales" }),
      redirectPath: "/categorie/ventes-immobilieres",
    });
  });

  it("produces a non-destructive migration dry-run with ambiguous records isolated", () => {
    const report = TaxonomyMigration.buildDryRunReport([
      { id: "listing-1", categorySlug: "multimedia" },
      { id: "listing-2", categorySlug: "multimedia" },
      { id: "listing-3", categorySlug: "legacy-unknown" },
    ]);

    expect(report).toContainEqual({
      source: "multimedia",
      canonicalNodeId: "electronics",
      affectedListingIds: ["listing-1", "listing-2"],
      status: "mapped",
    });
    expect(report).toContainEqual({
      source: "legacy-unknown",
      canonicalNodeId: undefined,
      affectedListingIds: ["listing-3"],
      status: "ambiguous",
    });

    expect(
      TaxonomyMigration.normalizeListingCategory({
        categorySlug: "legacy-unknown",
        categoryLabel: "Ancienne rubrique",
      }),
    ).toMatchObject({
      categoryId: "legacy-unknown",
      categoryLabel: "Ancienne rubrique",
      subCategoryLabel: "À reclasser",
    });
  });

  describe("shortLabel Resolution & Fallbacks", () => {
    it("returns canonical full label in default/full mode and compact alias in compact mode", () => {
      const carsNode = taxonomyService.getNode("vehicles.cars");
      expect(carsNode).toBeDefined();

      const fullLabel = taxonomyService.getLabel(carsNode, "full");
      const compactLabel = taxonomyService.getLabel(carsNode, "compact");

      expect(fullLabel).toBe("Voitures d'occasion");
      expect(compactLabel).toBe("Voitures");
    });

    it("safely falls back to canonical label/name if shortLabel is undefined", () => {
      const nodeWithoutShort = {
        id: "test_node",
        slug: "test",
        name: "Mon Super Produit",
      };

      expect(taxonomyService.getLabel(nodeWithoutShort, "compact")).toBe(
        "Mon Super Produit",
      );
      expect(taxonomyService.getLabel(nodeWithoutShort, "full")).toBe(
        "Mon Super Produit",
      );
    });

    it("handles null or undefined node gracefully without throwing", () => {
      expect(taxonomyService.getLabel(null, "compact")).toBe("");
      expect(taxonomyService.getLabel(undefined, "full")).toBe("");
    });

    it("resolves localized shortLabels when locale is specified", () => {
      const carsNode = taxonomyService.getNode("vehicles.cars");
      expect(carsNode).toBeDefined();

      const enCompact = taxonomyService.getLabel(carsNode, {
        compact: true,
        locale: "en-US",
      });
      const frCompact = taxonomyService.getLabel(carsNode, {
        compact: true,
        locale: "fr-FR",
      });

      expect(enCompact).toBe("Cars");
      expect(frCompact).toBe("Voitures");
    });

    it("resolves breadcrumbs in full and compact modes", () => {
      const fullCrumbs = taxonomyService.getBreadcrumbs(
        "vehicles.cars.citadines",
        "full",
      );
      expect(fullCrumbs.map((c) => c.label)).toEqual([
        "Véhicules",
        "Voitures d'occasion",
        "Citadines",
      ]);

      const compactCrumbs = taxonomyService.getBreadcrumbs(
        "vehicles.cars.citadines",
        "compact",
      );
      expect(compactCrumbs.map((c) => c.label)).toEqual([
        "Véhicules",
        "Voitures",
        "Citadines",
      ]);
    });

    it("finds nodes using shortLabel in searchTaxonomy", () => {
      const results = taxonomyService.searchTaxonomy("Voitures", 5);
      expect(results.some((r) => r.id === "vehicles.cars")).toBe(true);

      const proResults = taxonomyService.searchTaxonomy("Matériel Pro", 5);
      expect(proResults.some((r) => r.id === "professional_btp")).toBe(true);
    });

    it("provides concise and legible shortLabels for all 16 root categories without truncation", () => {
      const roots = taxonomyService.getRootCategories();
      expect(roots).toHaveLength(16);

      const shortLabelMap = Object.fromEntries(
        roots.map((r) => [r.id, taxonomyService.getLabel(r, "compact")]),
      );

      expect(shortLabelMap["vehicles"]).toBe("Véhicules");
      expect(shortLabelMap["sports_outdoors"]).toBe("Sports");
      expect(shortLabelMap["professional_btp"]).toBe("Matériel Pro");
      expect(shortLabelMap["agriculture"]).toBe("Agriculture");
      expect(shortLabelMap["pro_it_telecom"]).toBe("IT & Serveurs");
      expect(shortLabelMap["deals_donations"]).toBe("Dons & Gratuit");

      // Ensure every root compact label is concise (under 20 characters)
      roots.forEach((root) => {
        const compact = taxonomyService.getLabel(root, "compact");
        expect(compact.length).toBeLessThanOrEqual(20);
        expect(compact.trim().length).toBeGreaterThan(0);
      });
    });
  });
});
