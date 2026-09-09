import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const specification = JSON.parse(
  readFileSync(new URL("../../openapi/openapi.json", import.meta.url), "utf8"),
);

/**
 * The collection rail used to be assembled in the browser: one taxonomy read
 * plus one `search(limit: 1)` per root category, purely to obtain a count and a
 * cover image — 19 requests on a French homepage, repeated on `/collections`
 * and again during server rendering. This operation is the backend projection
 * that replaced it, so the contract has to keep it a single bounded public
 * read that carries both facts.
 */
describe("discovery collections OpenAPI contract", () => {
  const operation = specification.paths["/discovery/collections"]?.get;

  it("is a public, market-scoped read", () => {
    expect(operation).toBeDefined();
    expect(operation.operationId).toBe("getDiscoveryCollections");
    expect(operation.security).toEqual([]);
    expect(operation["x-shongre-access"]).toBe("public");
    // Customer read-only discovery: authenticated Staff are not denied.
    expect(operation["x-shongre-deny-staff-marketplace"]).toBe(false);
    expect(operation.parameters).toContainEqual({
      $ref: "#/components/parameters/MarketContext",
    });
  });

  it("returns both inventory facts the rail needs, so no per-card call remains", () => {
    expect(
      operation.responses["200"].content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/DiscoveryCollectionPage" });

    const collection = specification.components.schemas.DiscoveryCollection;
    expect(collection.required).toEqual(
      expect.arrayContaining(["coverImageUrl", "listingCount", "slug"]),
    );
    expect(collection.properties.listingCount).toMatchObject({
      type: "integer",
      minimum: 0,
    });
    expect(collection.additionalProperties).toBe(false);
  });

  it("binds the rail to a taxonomy publication revision", () => {
    const page = specification.components.schemas.DiscoveryCollectionPage;
    expect(page.required).toEqual(
      expect.arrayContaining(["collections", "taxonomyRevision"]),
    );
    expect(page.properties.taxonomyRevision.type).toBe("integer");
  });

  it("declares the errors a public discovery read can return", () => {
    for (const status of ["400", "404", "429", "500"]) {
      expect(
        operation.responses[status],
        `missing ${status} response`,
      ).toBeDefined();
    }
  });
});
