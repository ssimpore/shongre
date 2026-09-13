import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SemanticIcon } from "../src/primitives/Icon.web";

describe("semantic icon fill", () => {
  it("keeps outline icons unfilled by default", () => {
    for (const name of ["heart", "payment", "rocket"] as const) {
      const markup = renderToStaticMarkup(<SemanticIcon name={name} />);
      expect(markup).toContain('fill="none"');
    }
  });

  it("inherits the badge foreground for filled promotion icons", () => {
    for (const name of ["flame", "tag"] as const) {
      const markup = renderToStaticMarkup(<SemanticIcon name={name} filled />);
      expect(markup).toContain('fill="currentColor"');
    }
  });
});
