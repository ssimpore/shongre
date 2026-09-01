import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const specification = JSON.parse(
  readFileSync(new URL("../../openapi/openapi.json", import.meta.url), "utf8"),
);

describe("Solutions OpenAPI contract", () => {
  it("requires explicit market context for public reads", () => {
    for (const path of ["/solutions", "/solutions/{solutionSlug}"]) {
      const operation = specification.paths[path].get;
      expect(operation.security).toEqual([]);
      expect(operation["x-shongre-deny-staff-marketplace"]).toBe(false);
      expect(operation.parameters).toContainEqual({
        $ref: "#/components/parameters/MarketContext",
      });
    }
  });

  it("uses typed schemas instead of an unbounded JSON payload", () => {
    expect(
      specification.paths["/admin/solutions"].post.requestBody.content[
        "application/json"
      ].schema,
    ).toEqual({ $ref: "#/components/schemas/CreateSolutionInput" });
    expect(
      specification.paths["/admin/solutions/{solutionId}"].patch.requestBody
        .content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/UpdateSolutionInput" });
  });

  it("protects every privileged write with permission and required idempotency", () => {
    const writes = [
      specification.paths["/admin/solutions"].post,
      specification.paths["/admin/solutions/order"].put,
      specification.paths["/admin/solutions/{solutionId}"].patch,
      specification.paths["/admin/solutions/{solutionId}/lifecycle"].post,
    ];
    for (const operation of writes) {
      expect(operation["x-shongre-access"]).toBe("permission");
      expect(operation["x-shongre-permission"]).toBe(
        "admin.configuration.manage",
      );
      expect(operation["x-shongre-idempotency"]).toBe("required");
      expect(operation.parameters).toContainEqual({
        $ref: "#/components/parameters/RequiredIdempotencyKey",
      });
      expect(operation.security).toEqual([
        { CookieAuth: [] },
        { BearerAuth: [] },
      ]);
    }
  });
});
