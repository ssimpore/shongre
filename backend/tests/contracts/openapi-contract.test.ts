import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { OPENAPI_OPERATIONS } from "../../src/generated/openapi-manifest.js";
import { findUndeclaredOperationRemovals } from "../../scripts/openapi/check-breaking-change.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../../..");
const specification = JSON.parse(
  readFileSync(resolve(repositoryRoot, "backend/openapi/openapi.json"), "utf8"),
);

describe("canonical OpenAPI contract", () => {
  it("has one unique, versioned operation inventory", () => {
    const operationIds = new Set<string>();
    let operationCount = 0;
    let routerOperationCount = 0;

    for (const [path, pathItem] of Object.entries<any>(specification.paths)) {
      expect(path.startsWith("/")).toBe(true);
      for (const method of ["get", "post", "put", "patch", "delete"]) {
        const operation = pathItem[method];
        if (!operation) continue;
        operationCount += 1;
        if (operation["x-shongre-runtime"] !== "server") {
          routerOperationCount += 1;
        }
        expect(operationIds.has(operation.operationId)).toBe(false);
        operationIds.add(operation.operationId);
        expect(operation.security).toBeDefined();
        if (operation["x-shongre-runtime"] !== "server") {
          expect(Object.keys(operation.responses)).toContain("400");
        }
      }
    }

    expect(routerOperationCount).toBe(Object.keys(OPENAPI_OPERATIONS).length);
    expect(operationCount - routerOperationCount).toBe(5);
    expect(operationCount).toBeGreaterThan(250);
  });

  it("matches every implemented router operation", () => {
    expect(() =>
      execFileSync(
        process.execPath,
        ["backend/scripts/openapi/check-contract.mjs"],
        { cwd: repositoryRoot, stdio: "pipe" },
      ),
    ).not.toThrow();
  });

  it("rejects removal until deprecation and sunset are declared", () => {
    const current = { paths: {} };
    const undeclared = {
      paths: {
        "/example": { get: { operationId: "getExample" } },
      },
    };
    const announced = {
      paths: {
        "/example": {
          get: {
            operationId: "getExample",
            deprecated: true,
            "x-sunset-at": "2027-01-01",
          },
        },
      },
    };

    expect(findUndeclaredOperationRemovals(undeclared, current)).toEqual([
      "GET /example",
    ]);
    expect(findUndeclaredOperationRemovals(announced, current)).toEqual([]);
  });
});
