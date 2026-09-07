import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const specification = JSON.parse(
  readFileSync(new URL("../../openapi/openapi.json", import.meta.url), "utf8"),
);

describe("public listings OpenAPI contract", () => {
  it("uses explicit projections for collection, detail and ranked search", () => {
    expect(
      specification.paths["/listings"].get.responses["200"].content[
        "application/json"
      ].schema,
    ).toEqual({ $ref: "#/components/schemas/PublicListingCollection" });
    expect(
      specification.paths["/listings/{id}"].get.responses["200"].content[
        "application/json"
      ].schema,
    ).toEqual({
      oneOf: [{ $ref: "#/components/schemas/PublicListing" }, { type: "null" }],
    });
    expect(
      specification.paths["/listings/search"].get.responses["200"].content[
        "application/json"
      ].schema,
    ).toEqual({ $ref: "#/components/schemas/PublicListingSearchResult" });
    expect(
      specification.paths["/listings/search"].post.responses["200"].content[
        "application/json"
      ].schema,
    ).toEqual({ $ref: "#/components/schemas/PublicListingSearchResult" });
    expect(specification.paths["/listings/cards"].post).toMatchObject({
      security: [],
      "x-shongre-access": "public",
      "x-shongre-deny-staff-marketplace": false,
      requestBody: {
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/PublicListingCardsRequest",
            },
          },
        },
      },
    });
    expect(
      specification.paths["/listings/cards"].post.responses["200"].content[
        "application/json"
      ].schema,
    ).toEqual({ $ref: "#/components/schemas/PublicListingCollection" });
    expect(
      specification.components.schemas.PublicListingCardsRequest,
    ).toMatchObject({
      additionalProperties: false,
      required: ["listingIds"],
      properties: {
        listingIds: {
          minItems: 1,
          maxItems: 100,
          uniqueItems: true,
          items: { type: "string", format: "uuid" },
        },
      },
    });
  });

  it("exposes a bounded public cursor projection for sitemap generation", () => {
    const operation = specification.paths["/discovery/sitemap-listings"].get;
    expect(operation).toMatchObject({
      operationId: "getDiscoverySitemapListings",
      security: [],
      "x-shongre-access": "public",
      "x-shongre-deny-staff-marketplace": false,
    });
    expect(operation.parameters).toContainEqual({
      $ref: "#/components/parameters/MarketContext",
    });
    expect(
      operation.responses["200"].content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/PublicSitemapListingPage" });
    expect(
      specification.components.schemas.PublicSitemapListingPage,
    ).toMatchObject({
      additionalProperties: false,
      required: ["items", "snapshotAt", "pageInfo"],
      properties: {
        items: {
          type: "array",
          maxItems: 500,
          items: { $ref: "#/components/schemas/PublicListing" },
        },
      },
    });
  });

  it("includes card facts while excluding private listing internals", () => {
    const schemas = specification.components.schemas;
    expect(schemas.PublicListing.required).toEqual(
      expect.arrayContaining([
        "categoryId",
        "price",
        "currency",
        "marketCode",
        "images",
        "attributes",
        "fulfillmentTypes",
      ]),
    );
    expect(schemas.PublicSellerProfile.required).toEqual(
      expect.arrayContaining([
        "accountType",
        "sellerType",
        "rating",
        "reviewCount",
      ]),
    );
    for (const privateField of [
      "publisherStatus",
      "publicationOfferId",
      "subscriptionId",
      "entitlementSnapshot",
      "externalStockId",
      "duplicateGroupId",
      "safetyRiskScore",
      "digitalFulfillmentVersionId",
    ]) {
      expect(schemas.PublicListing.properties).not.toHaveProperty(privateField);
    }
    expect(schemas.ListingMarketPublication.properties).not.toHaveProperty(
      "promotionSource",
    );
    expect(schemas.ListingMarketPublication.properties).not.toHaveProperty(
      "promotionSourceId",
    );
    for (const privateSellerField of [
      "email",
      "phone",
      "staffStatus",
      "staffRole",
      "customPermissions",
      "isIdentityVerified",
    ]) {
      expect(schemas.PublicSellerProfile.properties).not.toHaveProperty(
        privateSellerField,
      );
    }

    expect(schemas.PublicListing.properties.promotionSource).toMatchObject({
      $ref: "#/components/schemas/ListingPromotionSource",
    });
    expect(schemas.PublicListing.properties.promotionSourceId).toMatchObject({
      type: "string",
      minLength: 1,
    });
    expect(schemas.FavoriteCollection.required).toEqual(
      expect.arrayContaining(["listingIds", "listings"]),
    );
    expect(schemas.FavoriteCollection.properties.listings).toEqual({
      type: "array",
      items: { $ref: "#/components/schemas/PublicListing" },
    });
  });

  it.each([
    ["/auto/search", "post", "#/components/schemas/AutoVehicleSearchResponse"],
    ["/auto/vehicles/{id}", "get", "#/components/schemas/AutoVehiclePublic"],
    [
      "/real-estate/search",
      "post",
      "#/components/schemas/RealEstatePropertySearchResult",
    ],
    [
      "/real-estate/properties/{id}",
      "get",
      "#/components/schemas/RealEstatePropertyPublic",
    ],
    [
      "/employment/search",
      "post",
      "#/components/schemas/EmploymentSearchResult",
    ],
    [
      "/employment/jobs/{id}",
      "get",
      "#/components/schemas/EmploymentJobPostingDetail",
    ],
  ])(
    "types the market-scoped public response for %s",
    (path, method, responseSchema) => {
      const operation = specification.paths[path][method];
      expect(operation.parameters).toContainEqual({
        $ref: "#/components/parameters/MarketContext",
      });
      expect(
        operation.responses["200"].content["application/json"].schema,
      ).toEqual({ $ref: responseSchema });
    },
  );

  it("keeps structured vertical promotion evidence opaque and market-resolved", () => {
    const schemas = specification.components.schemas;
    expect(schemas.MarketResolvedListingPromotion.required).toEqual(
      expect.arrayContaining([
        "state",
        "type",
        "marketCode",
        "source",
        "sourceId",
        "startsAt",
        "endsAt",
      ]),
    );
    expect(schemas.MarketResolvedListingPromotion.properties.sourceId).toEqual({
      type: "string",
      minLength: 1,
    });
    for (const schemaName of [
      "AutoVehiclePublic",
      "RealEstatePropertyPublic",
      "EmploymentJobPostingCard",
      "EmploymentJobPostingDetail",
    ]) {
      expect(schemas[schemaName].properties.resolvedPromotion).toEqual({
        $ref: "#/components/schemas/MarketResolvedListingPromotion",
      });
    }
  });
});
