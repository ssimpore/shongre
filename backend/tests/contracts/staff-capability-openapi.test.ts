import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "@shongre/contracts/access-control";

const specification = JSON.parse(
  readFileSync(new URL("../../openapi/openapi.json", import.meta.url), "utf8"),
);

describe("Staff capability-management OpenAPI contract", () => {
  it("keeps the public enum in exact parity with the canonical capability registry", () => {
    expect(specification.components.schemas.Capability.enum).toEqual(
      CAPABILITIES,
    );
  });

  it("declares dedicated protected read and mutation operations", () => {
    const read = specification.paths["/admin/users/{userId}/capabilities"].get;
    const update =
      specification.paths["/admin/users/{userId}/capability-overrides"].put;

    expect(read).toMatchObject({
      operationId: "getAdminUserCapabilities",
      "x-shongre-access": "permission",
      "x-shongre-permission": "admin.permissions.manage",
    });
    expect(update).toMatchObject({
      operationId: "updateAdminUserCapabilityOverrides",
      "x-shongre-access": "permission",
      "x-shongre-permission": "admin.permissions.manage",
    });
    expect(read.security).toEqual([{ CookieAuth: [] }, { BearerAuth: [] }]);
    expect(update.security).toEqual([{ CookieAuth: [] }, { BearerAuth: [] }]);
  });

  it("marks public marketplace discovery as forbidden to authenticated Staff", () => {
    for (const [path, method] of [
      ["/home", "get"],
      ["/listings", "get"],
      ["/listings/search", "post"],
      ["/auto/search", "post"],
      ["/education/search", "post"],
      ["/employment/search", "post"],
      ["/real-estate/search", "post"],
      ["/marketing/public/subscriptions", "post"],
    ] as const) {
      expect(specification.paths[path][method]).toMatchObject({
        "x-shongre-access": "public",
        "x-shongre-deny-staff-marketplace": true,
      });
    }
  });

  it("requires every public operation to make its Staff boundary explicit", () => {
    for (const [path, pathItem] of Object.entries(specification.paths)) {
      for (const method of ["get", "post", "put", "patch", "delete"]) {
        const operation = pathItem[method];
        if (!operation || operation["x-shongre-access"] !== "public") continue;
        expect(
          typeof operation["x-shongre-deny-staff-marketplace"],
          `${method.toUpperCase()} ${path}`,
        ).toBe("boolean");
      }
    }
  });

  it("requires the customer-plane capability for customer notifications and support entry points", () => {
    for (const [path, method] of [
      ["/notifications", "get"],
      ["/notifications/preferences", "put"],
      ["/notifications/devices", "post"],
      ["/support/cases", "post"],
      ["/support/cases/mine", "get"],
      ["/verification/status/{userId}", "get"],
    ] as const) {
      expect(specification.paths[path][method]).toMatchObject({
        "x-shongre-access": "permission",
        "x-shongre-permission": "marketplace.customer.access",
      });
    }
  });
});
