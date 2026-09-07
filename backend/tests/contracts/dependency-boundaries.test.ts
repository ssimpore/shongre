import { describe, expect, it } from "vitest";
import { importBoundaryViolation } from "../../scripts/maintenance/check-boundary.js";

describe("monorepo dependency direction", () => {
  it.each([
    ["frontend/src/feature.ts", "../../backend/src/modules/auth/auth.service"],
    ["mobile/src/feature.ts", "../../frontend/src/services/storage"],
    ["backend/src/feature.ts", "@shongre/ui"],
    ["packages/contracts/src/schema.ts", "@shongre/shared"],
    ["packages/ui/src/view.ts", "@shongre/features"],
    ["packages/shared/src/helper.ts", "../../../backend/src/app/config/index"],
  ])("rejects %s → %s", (source, target) => {
    expect(importBoundaryViolation(source, target)).toBeTypeOf("string");
  });

  it.each([
    ["frontend/src/feature.ts", "@shongre/contracts/openapi"],
    ["mobile/src/feature.ts", "@shongre/ui"],
    ["backend/src/module.ts", "@shongre/shared"],
    ["packages/features/src/card.ts", "@shongre/ui"],
    ["packages/contracts/src/schema.ts", "./primitives"],
  ])("allows %s → %s", (source, target) => {
    expect(importBoundaryViolation(source, target)).toBeNull();
  });
});
