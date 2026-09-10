import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MarketContext } from "@shongre/contracts/market-country";
import { AddressAutocomplete } from "./AddressAutocomplete";

/**
 * The accessibility contract of the address combobox.
 *
 * This suite renders on the server, so effects never run: what it can prove is
 * the structure a screen reader and a keyboard depend on, which is exactly the
 * part that regresses silently. Debounce, request sequencing and arrow-key
 * navigation live in effects and handlers, and the repository has no DOM test
 * environment to exercise them — they are covered by the server-side
 * geocoding service tests and by manual use, and that gap is deliberate rather
 * than overlooked.
 */

const marketContext = {
  kind: "market",
  countryCode: "FR",
  locale: "fr-FR",
} as unknown as MarketContext;

const render = (
  props: Partial<React.ComponentProps<typeof AddressAutocomplete>> = {},
) =>
  renderToStaticMarkup(
    React.createElement(AddressAutocomplete, {
      marketContext,
      label: "Rechercher une adresse",
      value: "",
      onValueChange: vi.fn(),
      onSelect: vi.fn(),
      labels: {
        searching: "Recherche en cours…",
        noResults: "Aucun lieu trouvé.",
        resultsAvailable: (count: number) => `${count} lieux proposés.`,
        unavailable: "Recherche indisponible.",
      },
      ...props,
    }),
  );

describe("AddressAutocomplete", () => {
  it("is a combobox with a listbox popup", () => {
    const markup = render();
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-autocomplete="list"');
    expect(markup).toContain('aria-expanded="false"');
  });

  it("names the input through a real label rather than a placeholder", () => {
    const markup = render();
    const inputId = /id="([^"]*)"[^>]*role="combobox"/.exec(markup)?.[1];
    expect(inputId).toBeTruthy();
    expect(markup).toContain(`for="${inputId}"`);
    expect(markup).toContain("Rechercher une adresse");
  });

  it("points the input at the listbox it controls and its status region", () => {
    const markup = render();
    const controls = /aria-controls="([^"]*)"/.exec(markup)?.[1];
    const describedby = /aria-describedby="([^"]*)"/.exec(markup)?.[1];
    expect(controls).toBeTruthy();
    expect(describedby).toBeTruthy();
    // The status region exists before any search, so an assistive technology
    // has something to observe rather than a node appearing mid-announcement.
    expect(markup).toContain(`id="${describedby}"`);
    expect(markup).toContain('aria-live="polite"');
  });

  it("does not claim an active option before one is highlighted", () => {
    expect(render()).not.toContain("aria-activedescendant");
  });

  it("keeps autofill from competing with the suggestion list", () => {
    // Matched case-insensitively: React's server renderer emits the prop name
    // as written, and HTML attribute names are case-insensitive, so the browser
    // reads `autoComplete="off"` exactly as `autocomplete="off"`.
    expect(render()).toMatch(/autocomplete="off"/i);
  });

  it("gives the control a touch-sized target", () => {
    // `h-control-touch` resolves to 44px, and to the same value under a coarse
    // pointer where the compact control tokens are floored.
    expect(render()).toContain("h-control-touch");
  });

  it("disables the input when the caller says so", () => {
    expect(render({ disabled: true })).toContain("disabled");
  });

  it("accepts a caller-supplied id, so a form can label it externally", () => {
    expect(render({ id: "listing-address" })).toContain('id="listing-address"');
  });
});
