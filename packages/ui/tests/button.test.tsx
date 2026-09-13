import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "../src/primitives/Button.web";

describe("Button", () => {
  it("uses the shared orange surface and ink foreground for primary controls", () => {
    const markup = renderToStaticMarkup(
      <Button disabled variant="primary">
        Continuer
      </Button>,
    );

    expect(markup).toContain("bg-primary");
    expect(markup).toContain("text-on-primary");
    expect(markup).toContain("hover:bg-primary-hover");
    expect(markup).toContain("active:bg-primary-active");
    expect(markup).toContain("disabled:bg-primary-disabled");
    expect(markup).toContain("disabled:border-primary-disabled-border");
    expect(markup).not.toMatch(/(?:orange|\[#[\da-f]+\])/i);
  });
});
