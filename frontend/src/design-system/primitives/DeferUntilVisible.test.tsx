import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DeferUntilVisible } from "./DeferUntilVisible";

describe("DeferUntilVisible", () => {
  /**
   * The server never knows what is on screen, so it must always render the
   * fallback: a document that shipped the children would download the very
   * module the primitive exists to hold back, and hydrating a fallback over
   * server-rendered children would throw.
   */
  it("server-renders only the fallback", () => {
    const html = renderToStaticMarkup(
      <DeferUntilVisible
        fallback={<div data-fallback="true">Chargement</div>}
        className="h-96"
        data-testid="deferred-map"
      >
        <div data-heavy="true">Carte</div>
      </DeferUntilVisible>,
    );

    expect(html).toContain('data-fallback="true"');
    expect(html).not.toContain('data-heavy="true"');
    expect(html).toMatch(/^<div class="h-96" data-testid="deferred-map">/);
  });

  it("renders an empty slot when no fallback is given", () => {
    const html = renderToStaticMarkup(
      <DeferUntilVisible className="h-full">
        <div>Carte</div>
      </DeferUntilVisible>,
    );

    expect(html).toBe('<div class="h-full"></div>');
  });
});
