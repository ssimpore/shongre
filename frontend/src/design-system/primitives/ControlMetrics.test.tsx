import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Input, Select, Textarea } from "./FormField";

describe("shared control metrics", () => {
  it("keeps default buttons, inputs and selects on the touch height and control radius", () => {
    const html = renderToStaticMarkup(
      <>
        <Button>Continuer</Button>
        <Input aria-label="Recherche" />
        <Select
          aria-label="Tri"
          options={[{ value: "recent", label: "Récentes" }]}
        />
      </>,
    );

    expect(html.match(/h-control-touch/g)).toHaveLength(3);
    expect(html.match(/rounded-control/g)).toHaveLength(3);
  });

  it("uses the same radius at every button density", () => {
    const html = renderToStaticMarkup(
      <>
        <Button size="sm">Petit</Button>
        <Button size="compact">Compact</Button>
        <Button size="lg">Grand</Button>
        <IconButton size="md" ariaLabel="Fermer">
          ×
        </IconButton>
      </>,
    );

    expect(html.match(/rounded-control/g)).toHaveLength(4);
    expect(html).toContain("h-control-sm");
    expect(html).toContain("h-control-md");
    expect(html).toContain("h-control-lg");
  });

  it("keeps multiline fields on the same radius and touch floor", () => {
    const html = renderToStaticMarkup(<Textarea aria-label="Description" />);

    expect(html).toContain("rounded-control");
    expect(html).toContain("min-h-control-touch");
  });
});
