import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ListingCharacteristics } from "./ListingCharacteristics";

/**
 * Characteristics are the part of a detail page that used to look different in
 * every vertical. What is pinned here is the shape they all now share: the
 * facts a reader needs first under one heading, capabilities named rather than
 * paired with "Oui", and the long tail deferred rather than dropped.
 */
describe("listing characteristics presentation", () => {
  const fact = (code: string, label: string, value: string) => ({
    code,
    label,
    value,
    presentation: "fact" as const,
  });

  const data = {
    groups: [
      {
        id: "grp.vehicle_identity",
        label: "Identification du véhicule",
        items: [fact("model_year", "Année modèle", "2022")],
      },
    ],
  };

  const render = (
    state: "loading" | "ready" | "error",
    value: typeof data | { groups: [] } = data,
  ) =>
    renderToStaticMarkup(
      <ListingCharacteristics data={value} state={state} onRetry={vi.fn()} />,
    );

  it("presents the published facts under one heading, as a description list", () => {
    const html = render("ready");
    expect(html).toContain("Les informations clés");
    expect(html).toContain("<dl");
    expect(html).toContain("Année modèle</dt>");
    expect(html).toContain("2022</dd>");
    // A short list is the key set; there is nothing to defer and so no button.
    expect(html).not.toContain("data-detail-disclosure");
  });

  it("names capabilities instead of pairing a label with a yes", () => {
    const html = renderToStaticMarkup(
      <ListingCharacteristics
        state="ready"
        onRetry={vi.fn()}
        data={{
          groups: [
            {
              id: "grp.holiday_specs",
              label: "Séjour",
              items: [
                fact("capacity", "Capacité", "8 personnes"),
                {
                  code: "pool",
                  label: "Piscine",
                  value: "Oui",
                  presentation: "feature" as const,
                },
              ],
            },
          ],
        }}
      />,
    );
    expect(html).toContain("Équipements et services");
    expect(html).toContain("Piscine");
    expect(html).toContain('data-detail-feature="pool"');
    // The capability is named, never rendered as a value row reading "Oui".
    expect(html).not.toContain("Oui</dd>");
    expect(html).toContain("8 personnes</dd>");
  });

  it("defers the long tail behind a labelled disclosure, still grouped", () => {
    const html = renderToStaticMarkup(
      <ListingCharacteristics
        state="ready"
        onRetry={vi.fn()}
        data={{
          groups: [
            {
              id: "grp.characteristics",
              label: "Caractéristiques",
              items: Array.from({ length: 8 }, (_, index) =>
                fact(`key_${index}`, `Label ${index}`, `Valeur ${index}`),
              ),
            },
            {
              id: "grp.property_energy",
              label: "Performance énergétique",
              items: [fact("dpe", "DPE", "C"), fact("ges", "GES", "B")],
            },
          ],
        }}
      />,
    );
    expect(html).toContain("data-detail-disclosure");
    // The button says how much is behind it rather than "voir plus".
    expect(html).toContain("2 critères supplémentaires");
    // Deferred facts keep the group that published them, and are present in the
    // markup — hidden, not withheld, so they are findable and indexable.
    expect(html).toContain("Performance énergétique");
    expect(html).toContain('data-detail-fact-group="grp.property_energy"');
    expect(html).toContain("hidden");
  });

  it("has deliberate loading, empty and retry states without stale facts", () => {
    expect(render("loading")).toContain('aria-hidden="true"');
    expect(render("loading")).not.toContain("2022");
    expect(render("ready", { groups: [] })).toBe("");
    expect(render("error")).toContain("Réessayer");
    expect(render("error")).not.toContain("2022");
  });
});
