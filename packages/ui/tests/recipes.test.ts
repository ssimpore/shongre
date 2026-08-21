import { describe, expect, it } from "vitest";
import { createVariants } from "../src/utils/variants";

describe("shared UI recipes", () => {
  it("applies the same semantic variant selection deterministically", () => {
    const recipe = createVariants({
      base: "control",
      variants: {
        variant: { primary: "action-primary", danger: "status-error" },
      },
      defaultVariants: { variant: "primary" },
    });
    expect(recipe()).toBe("control action-primary");
    expect(recipe({ variant: "danger" })).toBe("control status-error");
  });
});
