import { describe, expect, it } from "vitest";
import {
  taxonomyV4NodeSchema,
  taxonomyV4PublicBundleSchema,
} from "../schemas/taxonomy";
import rawBundle from "./generated/taxonomy-v4.public.json?raw";

const bundle = taxonomyV4PublicBundleSchema.parse(JSON.parse(rawBundle));

describe("generated taxonomy v4 public projection", () => {
  it("matches the normalized source coverage", () => {
    expect(bundle.metadata.sourceCounts).toEqual({
      categories: 301,
      listingTypes: 212,
      attributes: 323,
      bindings: 10_831,
    });
    expect(bundle.categories).toHaveLength(301);
    expect(
      bundle.categories.filter((category) => !category.parentId),
    ).toHaveLength(19);
    expect(
      bundle.categories.filter((category) => category.publishable),
    ).toHaveLength(212);
    expect(bundle.listingTypes).toHaveLength(212);
    expect(bundle.attributes).toHaveLength(317);
    expect(bundle.attributeGroups).toHaveLength(56);
    expect(
      bundle.attributeGroups.some((group) => group.id === "G_INTERNAL"),
    ).toBe(false);
    expect(bundle.optionSets).toHaveLength(104);
    expect(bundle.options).toHaveLength(725);
    expect(bundle.optionParentLinks).toHaveLength(75);
    expect(bundle.bindings).toHaveLength(10_831);
    expect(bundle.dependencyRules).toHaveLength(203);
    expect(bundle.validationRules).toHaveLength(499);
    expect(bundle.projections.filters).toHaveLength(2_720);
    expect(bundle.projections.cardFields).toHaveLength(1_406);
    expect(bundle.projections.detailFields).toHaveLength(10_139);
    expect(bundle.projections.publicationFlow).toHaveLength(1_632);
    expect(bundle.projections.search).toHaveLength(212);
    expect(bundle.projections.seo).toHaveLength(301);
    expect(
      bundle.attributes.some(
        (attribute) => attribute.id === "moderation_risk_level",
      ),
    ).toBe(false);
  });

  it("normalizes option identities and explicit parent links", () => {
    expect(new Set(bundle.options.map((option) => option.id)).size).toBe(
      bundle.options.length,
    );
    const optionIds = new Set(bundle.options.map((option) => option.id));
    bundle.optionParentLinks.forEach((link) => {
      expect(optionIds.has(link.optionId), link.optionId).toBe(true);
      expect(optionIds.has(link.parentOptionId), link.parentOptionId).toBe(
        true,
      );
    });
  });

  it("retains every market explicitly without activating coming-soon markets", () => {
    bundle.categories.forEach((category) => {
      expect(
        category.marketAvailability.map((entry) => entry.marketCode),
      ).toEqual(["FR", "BE", "CH", "SN", "BF"]);
      for (const market of category.marketAvailability) {
        if (market.marketCode === "SN" || market.marketCode === "BF") {
          expect(market.status).toBe("coming_soon");
          expect(market.marketplaceEnabled).toBe(false);
          expect(market.indexable).toBe(false);
        }
      }
    });
  });

  it("publishes the canonical digital-products branch without client-owned category rules", () => {
    const root = bundle.categories.find(
      (category) => category.id === "digital_products",
    );
    const publishableChildren = bundle.categories.filter(
      (category) =>
        category.id.startsWith("digital_products.") && category.publishable,
    );

    expect(root).toMatchObject({
      slug: "produits-numeriques",
      labels: { "fr-FR": "Produits numériques" },
      publishable: false,
    });
    expect(publishableChildren.map((category) => category.id).sort()).toEqual([
      "digital_products.access.courses",
      "digital_products.access.software_licenses",
      "digital_products.downloads.creative_assets",
      "digital_products.downloads.documents",
    ]);
    for (const category of [root!, ...publishableChildren]) {
      expect(category.marketAvailability).toEqual([
        expect.objectContaining({
          marketCode: "FR",
          status: "active",
          marketplaceEnabled: true,
          indexable: true,
        }),
        expect.objectContaining({
          marketCode: "BE",
          status: "active",
          marketplaceEnabled: true,
          indexable: true,
        }),
        expect.objectContaining({
          marketCode: "CH",
          status: "active",
          marketplaceEnabled: true,
          indexable: true,
        }),
        expect.objectContaining({
          marketCode: "SN",
          status: "coming_soon",
          marketplaceEnabled: false,
          indexable: false,
        }),
        expect.objectContaining({
          marketCode: "BF",
          status: "coming_soon",
          marketplaceEnabled: false,
          indexable: false,
        }),
      ]);
    }
  });

  it("requires localized compact labels without changing canonical names", () => {
    bundle.categories.forEach((category) => {
      expect(category.shortLabels["fr-FR"], category.id).toBeTruthy();
      expect(
        category.shortLabels["fr-FR"].length,
        category.id,
      ).toBeLessThanOrEqual(28);
    });
    expect(
      bundle.categories.find(
        (category) =>
          category.id === "services.local_services.electronics_repair",
      ),
    ).toMatchObject({
      labels: {
        "fr-FR": "Réparation électronique & informatique",
      },
      shortLabels: { "fr-FR": "Réparation électronique" },
    });

    const missingShortLabel = structuredClone(bundle.categories[0]) as any;
    delete missingShortLabel.shortLabels;
    expect(taxonomyV4NodeSchema.safeParse(missingShortLabel).success).toBe(
      false,
    );
    expect(
      taxonomyV4NodeSchema.safeParse({
        ...bundle.categories[0],
        shortLabels: { "fr-FR": "x".repeat(29) },
      }).success,
    ).toBe(false);
    expect(
      taxonomyV4NodeSchema.safeParse({
        ...bundle.categories[0],
        shortLabels: { "fr-FR": "Véhicules", fr_CA: "Véhicules" },
      }).success,
    ).toBe(false);
  });

  it("generates complete localized SEO rules for every taxonomy category", () => {
    const categoryById = new Map(
      bundle.categories.map((category) => [category.id, category]),
    );
    expect(bundle.projections.seo).toHaveLength(bundle.categories.length);
    expect(
      new Set(bundle.projections.seo.map((projection) => projection.categoryId))
        .size,
    ).toBe(bundle.categories.length);
    expect(
      new Set(bundle.projections.seo.map((projection) => projection.urlPattern))
        .size,
    ).toBe(bundle.categories.length);

    bundle.projections.seo.forEach((projection) => {
      const category = categoryById.get(projection.categoryId)!;
      expect(projection.urlPattern).toBe(`/categorie/${category.slug}`);
      expect(projection.canonicalStrategy).toBe("market_url_builder");
      expect(projection.indexable).toBe(category.seo.indexable);
      expect(projection.sitemap).toEqual({
        eligible: category.seo.indexable,
        policy: "seo_policy",
      });
      expect(projection.structuredData).toContain("CollectionPage");
      expect(projection.structuredData.includes("ItemList")).toBe(
        category.publishable,
      );
      Object.entries(category.labels).forEach(([locale, canonicalLabel]) => {
        expect(projection.h1[locale], `${category.id}:${locale}:h1`).toBe(
          canonicalLabel,
        );
        expect(
          projection.titleTemplate[locale],
          `${category.id}:${locale}:title`,
        ).toContain(canonicalLabel);
        expect(
          projection.titleTemplate[locale].length,
          `${category.id}:${locale}:title-length`,
        ).toBeLessThanOrEqual(60);
        expect(
          projection.descriptionTemplate[locale],
          `${category.id}:${locale}:description`,
        ).toBeTruthy();
        expect(
          projection.descriptionTemplate[locale].length,
          `${category.id}:${locale}:description-length`,
        ).toBeLessThanOrEqual(160);
      });
    });

    const homeSeo = bundle.projections.seo.find(
      (projection) => projection.categoryId === "home_garden",
    )!;
    expect(homeSeo.h1["fr-FR"]).toBe("Maison & Jardin");
    expect(homeSeo.titleTemplate["fr-FR"]).not.toBe("Maison | Shongre");
    expect(homeSeo.descriptionTemplate["en-US"]).toBe(
      "Browse Home & Garden listings on Shongre.",
    );
  });

  it("uses the master workbook category namespace", () => {
    expect(
      bundle.aliases.some((alias) =>
        ["bons-plans", "dons-solidarite-bons-plans"].includes(alias.alias),
      ),
    ).toBe(false);
    expect(
      bundle.aliases.find((alias) => alias.alias === "dons-et-objets-gratuits")
        ?.canonicalCategoryId,
    ).toBe("free_exchange.offers.free_items");
    expect(
      bundle.categories.find(
        (category) => category.id === "vehicles.nautical.personal_watercraft",
      ),
    ).toMatchObject({
      slug: "scooters-des-mers-et-motos-nautiques",
      labels: { "fr-FR": "Scooters des mers & motos nautiques" },
    });
    expect(
      bundle.listingTypes.find(
        (listingType) =>
          listingType.id === "vehicles.nautical.personal_watercraft.listing",
      ),
    ).toMatchObject({
      slug: "annonce-scooters-des-mers-et-motos-nautiques",
      labels: {
        "fr-FR": "Annonce — Scooters des mers & motos nautiques",
      },
    });
    expect(
      bundle.categories.find(
        (category) =>
          category.slug === "brocantes-marches-and-evenements-locaux",
      )?.id,
    ).toBe("events_tickets.events.local_events");
  });
});
