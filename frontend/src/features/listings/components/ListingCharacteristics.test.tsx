import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ListingCharacteristics } from "./ListingCharacteristics";

describe("listing characteristics presentation", () => {
  const data = {
    groups: [
      {
        id: "grp.vehicle_identity",
        label: "Identification du véhicule",
        items: [{ code: "model_year", label: "Année modèle", value: "2022" }],
      },
    ],
  };
  const render = (state: "loading" | "ready" | "error", value = data) =>
    renderToStaticMarkup(
      <ListingCharacteristics data={value} state={state} onRetry={vi.fn()} />,
    );
  it("renders the backend projection as accessible description lists", () => {
    const html = render("ready");
    expect(html).toContain("Identification du véhicule");
    expect(html).toContain("<dl");
    expect(html).toContain("Année modèle</dt>");
    expect(html).toContain("2022</dd>");
  });
  it("has deliberate loading, empty and retry states without stale facts", () => {
    expect(render("loading")).toContain('aria-hidden="true"');
    expect(render("loading")).not.toContain("2022");
    expect(render("ready", { groups: [] })).toBe("");
    expect(render("error")).toContain("Réessayer");
    expect(render("error")).not.toContain("2022");
  });
});
