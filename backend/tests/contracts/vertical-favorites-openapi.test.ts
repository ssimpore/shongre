import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const specification = JSON.parse(
  readFileSync(new URL("../../openapi/openapi.json", import.meta.url), "utf8"),
);

describe("vertical favorite OpenAPI contracts", () => {
  it.each([
    [
      "/education/favorites",
      "#/components/schemas/EducationFavoriteCollection",
    ],
    [
      "/employment/favorites",
      "#/components/schemas/EmploymentFavoriteCollection",
    ],
    ["/delivery/favorites", "#/components/schemas/DeliveryFavoriteCollection"],
  ])("scopes %s reads to the authenticated market", (path, responseSchema) => {
    const operation = specification.paths[path].get;
    expect(operation.parameters).toContainEqual({
      $ref: "#/components/parameters/MarketContext",
    });
    expect(
      operation.responses["200"].content["application/json"].schema,
    ).toEqual({ $ref: responseSchema });
    expect(operation["x-shongre-deny-staff-marketplace"]).toBe(true);
  });

  it.each([
    "/education/tutors/{id}/favorite",
    "/employment/jobs/{id}/save",
    "/delivery/requests/{requestId}/favorite",
  ])("uses a market-scoped idempotent PUT for %s", (path) => {
    expect(specification.paths[path].post).toBeUndefined();
    const operation = specification.paths[path].put;
    expect(operation.parameters).toContainEqual({
      $ref: "#/components/parameters/MarketContext",
    });
    expect(operation.requestBody.content["application/json"].schema).toEqual({
      $ref: "#/components/schemas/FavoriteSetRequest",
    });
    expect(
      operation.responses["200"].content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/FavoriteStateResult" });
    expect(operation["x-shongre-deny-staff-marketplace"]).toBe(true);
  });
});
