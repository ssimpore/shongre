import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const specification = JSON.parse(
  readFileSync(new URL("../../openapi/openapi.json", import.meta.url), "utf8"),
);

const operations = Object.entries(specification.paths).flatMap(
  ([path, pathItem]: [string, any]) =>
    path.startsWith("/digital/")
      ? Object.entries(pathItem)
          .filter(([method]) =>
            ["get", "put", "post", "delete", "patch"].includes(method),
          )
          .map(([method, operation]: [string, any]) => ({
            path,
            method,
            operation,
          }))
      : [],
);

describe("digital-products OpenAPI contract", () => {
  it("documents every operation with explicit authentication, permission and Staff treatment", () => {
    expect(operations).toHaveLength(27);
    expect(
      new Set(operations.map(({ operation }) => operation.operationId)).size,
    ).toBe(operations.length);
    for (const { operation } of operations) {
      expect(operation.security).toEqual([
        { CookieAuth: [] },
        { BearerAuth: [] },
      ]);
      expect(operation["x-shongre-access"]).toBe("permission");
      expect(operation["x-shongre-permission"]).toEqual(expect.any(String));
      expect(operation["x-shongre-deny-staff-marketplace"]).toEqual(
        expect.any(Boolean),
      );
    }
  });

  it("requires explicit market context wherever the router resolves a market", () => {
    for (const { path } of operations) {
      const pathParameters = specification.paths[path].parameters ?? [];
      if (path === "/digital/access-grants/{id}/consume") {
        expect(pathParameters).not.toContainEqual({
          $ref: "#/components/parameters/MarketContext",
        });
      } else {
        expect(pathParameters).toContainEqual({
          $ref: "#/components/parameters/MarketContext",
        });
      }
    }
  });

  it("marks raw access material write-only and excludes storage internals from projections", () => {
    const schemas = specification.components.schemas;
    expect(
      schemas.DigitalAccessSecretInput.properties.destinationUrl.writeOnly,
    ).toBe(true);
    expect(schemas.DigitalAccessSecretInput.properties.fields.writeOnly).toBe(
      true,
    );
    expect(
      schemas.DigitalCredentialImportInput.properties.credentials.writeOnly,
    ).toBe(true);
    expect(
      schemas.DigitalConsumedAccess.oneOf[1].properties.destinationUrl
        .writeOnly,
    ).toBe(true);
    expect(
      schemas.DigitalConsumedAccess.oneOf[1].properties.fields.writeOnly,
    ).toBe(true);

    for (const schemaName of [
      "DigitalAsset",
      "DigitalEntitlement",
      "DigitalInventory",
      "DigitalAdminOverview",
      "DigitalProvisioningTask",
    ]) {
      const serialized = JSON.stringify(schemas[schemaName]);
      expect(serialized).not.toMatch(
        /storageKey|privatePath|encryptedPayload|ciphertext|passwordHash/,
      );
    }
  });

  it("uses typed bounded administration and seller task projections", () => {
    expect(
      specification.paths["/digital/admin/overview"].get.responses["200"]
        .content["application/json"].schema,
    ).toEqual({ $ref: "#/components/schemas/DigitalAdminOverview" });
    expect(specification.components.schemas.DigitalAdminOverview).toMatchObject(
      {
        additionalProperties: false,
        required: ["assets", "inventory", "entitlements", "openReportCount"],
      },
    );
    expect(
      specification.components.schemas.DigitalProvisioningTask.required,
    ).toContain("productAccessClass");
  });
});
