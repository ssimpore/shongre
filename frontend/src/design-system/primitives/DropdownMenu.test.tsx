import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DropdownMenu } from "./DropdownMenu";

describe("DropdownMenu", () => {
  it("owns the shared trigger geometry without call-site overrides", () => {
    const markup = renderToStaticMarkup(
      <DropdownMenu
        ariaLabel="Type de véhicule"
        fullWidth
        headerTitle="Type de véhicule"
        options={[
          { value: "car", label: "Voitures" },
          { value: "motorcycle", label: "Motos & scooters" },
        ]}
        value="car"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('aria-haspopup="listbox"');
    expect(markup).toContain("rounded-control");
    expect(markup).toContain("border-border-base");
    expect(markup).toContain("w-full");
  });

  it("exposes a real disabled trigger for unavailable choices", () => {
    const markup = renderToStaticMarkup(
      <DropdownMenu
        ariaLabel="Rayon autour du lieu"
        disabled
        fullWidth
        options={[{ value: "", label: "Zone exacte" }]}
        value=""
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain("disabled:cursor-not-allowed");
  });
});
