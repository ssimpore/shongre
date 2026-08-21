import { describe, expect, it } from "vitest";
import { cn, createVariants } from "./variants";

describe("design-system class recipes", () => {
  it("joins only meaningful class values", () => {
    expect(cn("base", false, undefined, "active")).toBe("base active");
  });

  it("applies typed defaults and explicit variants", () => {
    const recipe = createVariants({
      base: "control",
      variants: {
        size: { sm: "small", md: "medium" },
        tone: { neutral: "neutral", danger: "danger" },
      },
      defaultVariants: { size: "md", tone: "neutral" },
    });

    expect(recipe()).toBe("control medium neutral");
    expect(recipe({ size: "sm", tone: "danger", className: "extra" })).toBe(
      "control small danger extra",
    );
  });
});
