import { describe, expect, it } from "vitest";
import { colors } from "@shongre/design-tokens";
import { brand } from "../src";

describe("brand contract", () => {
  it("exposes the official versioned identity", () => {
    expect(brand).toMatchObject({
      name: "SHONGRE.",
      signature: "SHONGRE.",
      version: "1.0.0",
      primaryColor: "#FF6500",
      inkColor: "#172033",
    });
    expect(brand.primaryColor).toBe(colors.brand.primary);
  });
});
