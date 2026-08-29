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
});
