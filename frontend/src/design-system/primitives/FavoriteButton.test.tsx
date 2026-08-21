import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FavoriteButton } from "./FavoriteButton";

const render = (
  props: Partial<React.ComponentProps<typeof FavoriteButton>> = {},
) =>
  renderToStaticMarkup(
    React.createElement(FavoriteButton, {
      isFavorite: false,
      onToggle: vi.fn(),
      ...props,
    }),
  );

const classAttr = (markup: string) => /class="([^"]*)"/.exec(markup)?.[1] ?? "";

describe("FavoriteButton", () => {
  /**
   * Tailwind resolves conflicting utilities by stylesheet order, not attribute
   * order, and `.relative` is emitted after `.absolute`. So emitting both here
   * silently beat the `absolute top-2.5 right-2.5` every overlay call site
   * passes: the control laid out in normal flow instead, and inside a listing
   * card's `overflow-hidden` media well that clipped it away entirely — no
   * visible favourite control, and nothing to tap.
   */
  it("does not emit its own position when the caller supplies one", () => {
    for (const position of ["absolute", "fixed", "sticky", "static"]) {
      const classes = classAttr(
        render({ className: `${position} top-2.5 right-2.5 z-raised` }),
      );
      expect(classes.split(/\s+/), `${position} call site`).toContain(position);
      expect(
        classes.split(/\s+/),
        `${position} call site kept a conflicting relative`,
      ).not.toContain("relative");
    }
  });

  it("establishes its own containing block when the caller supplies no position", () => {
    // The touch expansion is an absolutely-positioned pseudo-element, so an
    // unpositioned control still needs a containing block of its own.
    expect(classAttr(render()).split(/\s+/)).toContain("relative");
  });

  it("keeps the painted size independent of the touch target", () => {
    // Growing the box itself turned the 24px rail heart into a 44px opaque disc
    // sitting on the listing title. The 44px target is a pseudo-element instead.
    const classes = classAttr(render({ size: "sm" }));
    expect(classes).toContain("w-6");
    expect(classes).toContain("h-6");
    expect(classes).not.toMatch(
      /(?:^|\s)pointer-coarse:w-control-touch(?:\s|$)/,
    );
    expect(classes).toContain("pointer-coarse:after:w-control-touch");
    expect(classes).toContain("pointer-coarse:after:h-control-touch");
  });

  it("names its state for assistive technology", () => {
    expect(render({ isFavorite: true })).toContain('aria-pressed="true"');
    expect(render({ isFavorite: true })).toContain("Retirer des favoris");
    expect(render({ isFavorite: false })).toContain("Ajouter aux favoris");
  });
});
