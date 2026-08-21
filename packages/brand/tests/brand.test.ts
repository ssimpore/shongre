import { describe, expect, it } from "vitest";
import { colors } from "@shongre/design-tokens";
import { brand } from "../src";

describe("brand contract", () => {
  it("derives brand colors from the canonical token package", () => {
    expect(brand.primaryColor).toBe(colors.action.primary);
  });
});
