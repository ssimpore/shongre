import { describe, it, expect } from "vitest";
import React from "react";
import {
  LanguageSelector,
  SUPPORTED_LANGUAGES,
  SHIPPED_LOCALES,
} from "./LanguageSelector";

describe("LanguageSelector Primitive", () => {
  it("instantiates correctly as a React component element", () => {
    const element = React.createElement(LanguageSelector, {
      variant: "header",
      idPrefix: "test-lang",
    });

    expect(element).toBeDefined();
    expect(element.type).toBe(LanguageSelector);
    expect(element.props.variant).toBe("header");
  });

  it("provides comprehensive list of European languages with flags", () => {
    expect(SUPPORTED_LANGUAGES.length).toBeGreaterThanOrEqual(4);

    const french = SUPPORTED_LANGUAGES.find((l) => l.code === "fr-FR");
    expect(french).toBeDefined();
    expect(french?.flag).toBe("🇫🇷");

    const english = SUPPORTED_LANGUAGES.find((l) => l.code === "en-US");
    expect(english).toBeDefined();
    expect(english?.flag).toBe("🇬🇧");

    const german = SUPPORTED_LANGUAGES.find((l) => l.code === "de-DE");
    expect(german).toBeDefined();
    expect(german?.flag).toBe("🇩🇪");

    const spanish = SUPPORTED_LANGUAGES.find((l) => l.code === "es-ES");
    expect(spanish).toBeDefined();
    expect(spanish?.flag).toBe("🇪🇸");
  });
});

/**
 * A language is offered only when its messages exist.
 *
 * The list is presentational; availability is measured from the catalogues, so
 * nobody can enable a language ahead of its translations — which is exactly how
 * this selector originally shipped six languages that all rendered French.
 */
describe("language availability is measured, not declared", () => {
  it("offers exactly the locales declared shipped", () => {
    const availableCodes = SUPPORTED_LANGUAGES.filter((l) => l.isAvailable).map(
      (l) => l.code,
    );
    expect(availableCodes).toEqual([...SHIPPED_LOCALES]);
  });

  it("does not offer a language with no catalogue", () => {
    for (const code of ["de-DE", "es-ES", "nl-NL", "it-IT"]) {
      const language = SUPPORTED_LANGUAGES.find((l) => l.code === code);
      expect(language?.isAvailable, `${code} must stay unselectable`).toBe(
        false,
      );
    }
  });

  /**
   * A complete catalogue is necessary but not sufficient. English remains a
   * known, partially translated locale until both the catalogue and every page
   * surface meet the shipping gates.
   */
  it("keeps English unavailable until the complete UI is migrated", () => {
    const english = SUPPORTED_LANGUAGES.find((l) => l.code === "en-US");
    expect(english?.isAvailable).toBe(false);
  });
});
