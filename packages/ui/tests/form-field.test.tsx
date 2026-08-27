import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Switch } from "../src/forms/FormField.web";

describe("Switch", () => {
  it("makes the native input own the complete labelled touch target", () => {
    const markup = renderToStaticMarkup(
      <Switch
        checked={false}
        onChange={() => undefined}
        label="Mesure d’audience"
        description="Statistiques anonymisées"
      />,
    );

    expect(markup).toContain('role="switch"');
    expect(markup).toContain('aria-label="Mesure d’audience"');
    expect(markup).toContain('aria-describedby="switch-');
    expect(markup).toContain('-description"');
    expect(markup).toContain("min-h-control-touch");
    expect(markup).toContain("absolute inset-0");
    expect(markup).not.toContain("sr-only");
  });
});
