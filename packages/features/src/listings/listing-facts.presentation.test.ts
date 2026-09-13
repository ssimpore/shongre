import { describe, expect, it } from "vitest";
import type { ListingCharacteristicsData } from "./listing-facts.presentation";
import {
  buildListingFactPresentation,
  localizeListingCharacteristics,
  KEY_FACT_LIMIT,
} from "./listing-facts.presentation";

/**
 * Every category renders its detail page through this one projection, so the
 * rules it encodes are the rules a vertical nobody anticipated will get: what
 * gets promoted, what reads as a capability rather than a value, and what stays
 * available behind a disclosure instead of being dropped.
 */

const fact = (code: string, label = code, value = "valeur") => ({
  code,
  label,
  value,
  presentation: "fact" as const,
});
const feature = (code: string, label = code) => ({
  code,
  label,
  value: "Oui",
  presentation: "feature" as const,
});

const characteristics = (
  groups: ListingCharacteristicsData["groups"],
): ListingCharacteristicsData => ({ groups });

describe("listing fact presentation", () => {
  it("preserves the order published by the API", () => {
    const result = buildListingFactPresentation(
      characteristics([
        { id: "grp.regulatory", label: "Conformité", items: [fact("critair")] },
        {
          id: "grp.characteristics",
          label: "Caractéristiques",
          items: [fact("brand"), fact("model")],
        },
        {
          id: "grp.vehicle_technical",
          label: "Technique",
          items: [fact("mileage")],
        },
      ]),
    );
    expect(result.keyFacts.map((entry) => entry.code)).toEqual([
      "critair",
      "brand",
      "model",
      "mileage",
    ]);
  });

  it("keeps a category it has never seen, in its published order", () => {
    const result = buildListingFactPresentation(
      characteristics([
        { id: "grp.invented_a", label: "A", items: [fact("one")] },
        { id: "grp.invented_b", label: "B", items: [fact("two")] },
      ]),
    );
    expect(result.keyFacts.map((entry) => entry.code)).toEqual(["one", "two"]);
    expect(result.additionalCount).toBe(0);
  });

  it("shows capabilities as names instead of pairing a label with 'Oui'", () => {
    const result = buildListingFactPresentation(
      characteristics([
        {
          id: "grp.holiday_specs",
          label: "Séjour",
          items: [
            fact("capacity", "Capacité", "8 personnes"),
            feature("air_conditioning", "Climatisation"),
            feature("pool", "Piscine"),
          ],
        },
      ]),
    );
    expect(result.features.map((entry) => entry.label)).toEqual([
      "Climatisation",
      "Piscine",
    ]);
    // A capability never also appears as a value row.
    expect(result.keyFacts.map((entry) => entry.code)).toEqual(["capacity"]);
  });

  it("defers the long tail rather than dropping it", () => {
    const items = Array.from({ length: KEY_FACT_LIMIT + 5 }, (_, index) =>
      fact(`code_${index}`),
    );
    const result = buildListingFactPresentation(
      characteristics([{ id: "grp.general", label: "Général", items }]),
    );
    expect(result.keyFacts).toHaveLength(KEY_FACT_LIMIT);
    expect(result.additionalCount).toBe(5);
    // Nothing is lost between the two.
    const shown = [
      ...result.keyFacts,
      ...result.additionalGroups.flatMap((group) => group.facts),
    ].map((entry) => entry.code);
    expect(new Set(shown).size).toBe(items.length);
  });

  it("keeps the deferred facts under the group that published them", () => {
    const result = buildListingFactPresentation(
      characteristics([
        {
          id: "grp.characteristics",
          label: "Caractéristiques",
          items: Array.from({ length: KEY_FACT_LIMIT }, (_, index) =>
            fact(`key_${index}`),
          ),
        },
        {
          id: "grp.property_energy",
          label: "Performance énergétique",
          items: [fact("dpe"), fact("ges")],
        },
      ]),
      { keyFactLimit: KEY_FACT_LIMIT },
    );
    expect(result.additionalGroups).toHaveLength(1);
    expect(result.additionalGroups[0]).toMatchObject({
      id: "grp.property_energy",
      label: "Performance énergétique",
    });
    expect(result.additionalGroups[0].facts.map((entry) => entry.code)).toEqual(
      ["dpe", "ges"],
    );
  });

  it("answers empty for a listing with no published characteristics", () => {
    for (const input of [null, undefined, characteristics([])]) {
      const result = buildListingFactPresentation(input);
      expect(result.keyFacts).toEqual([]);
      expect(result.features).toEqual([]);
      expect(result.additionalGroups).toEqual([]);
      expect(result.additionalCount).toBe(0);
    }
  });

  it("uses the API icon even when a field code suggests a different meaning", () => {
    const result = buildListingFactPresentation({
      groups: [
        {
          id: "unfamiliar",
          label: "Custom",
          items: [{ ...fact("model_year"), icon: "leaf" }],
        },
      ],
    });
    expect(result.keyFacts[0].icon).toBe("leaf");
    expect(
      buildListingFactPresentation({
        groups: [
          { id: "unfamiliar", label: "Custom", items: [fact("model_year")] },
        ],
      }).keyFacts[0].icon,
    ).toBe("tag");
  });
  it("retains localized grouping, capabilities and icons from vertical APIs", () => {
    const data = localizeListingCharacteristics(
      [
        {
          code: "one",
          labels: { "fr-FR": "Un", "en-US": "One" },
          values: { "fr-FR": "Oui", "en-US": "Yes" },
          icon: "wifi",
          groupId: "custom",
          groupLabels: { "fr-FR": "Groupe", "en-US": "Group" },
          presentation: "feature",
        },
      ],
      "en-US",
    );
    expect(data.groups[0].label).toBe("Group");
    expect(buildListingFactPresentation(data).features[0]).toMatchObject({
      label: "One",
      value: "Yes",
      icon: "wifi",
    });
  });
});
