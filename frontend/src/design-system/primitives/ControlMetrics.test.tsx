import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Input, Select, Textarea } from "./FormField";

/** Whole `class` tokens matching `name`, so `h-x` never matches `min-h-x`. */
const classTokens = (html: string, name: string): string[] =>
  Array.from(html.matchAll(/class="([^"]*)"/g))
    .flatMap((m) => m[1].split(/\s+/))
    .filter((token) => token === name);

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

    // Count whole class tokens, not substrings: `min-h-control-touch` contains
    // `h-control-touch`, so a substring match cannot tell the height apart from
    // the floor the fields also pin.
    expect(classTokens(html, "h-control-touch")).toHaveLength(3);
    expect(classTokens(html, "rounded-control")).toHaveLength(3);
  });

  /**
   * Every field pins its `min-height` next to its `height`.
   *
   * `src/index.css` floors bare `<input>`/`<select>` at `control-md`, and
   * `min-height` beats a smaller `height` — so without this, `size="sm"` asked
   * for 32px and rendered 40px.
   */
  it("pins a matching min-height on every field size", () => {
    for (const [size, token] of [
      ["sm", "control-sm"],
      ["compact", "control-md"],
      ["md", "control-touch"],
      ["lg", "control-lg"],
    ] as const) {
      const html = renderToStaticMarkup(
        <Select aria-label="Tri" size={size} options={[]} />,
      );
      expect(classTokens(html, `h-${token}`), size).toHaveLength(1);
      expect(classTokens(html, `min-h-${token}`), size).toHaveLength(1);
    }
  });

  /**
   * `cn` concatenates, it does not resolve Tailwind conflicts, and Tailwind
   * picks the winner by stylesheet order — where `.w-full` is emitted last. So
   * a field that emitted its own `w-full` beat every caller-supplied width: the
   * vehicle-search "Trier par" control stretched across the toolbar and pushed
   * its own label onto a second line. Same shape as `Button`'s `display` guard
   * and `FavoriteButton`'s `position` guard.
   */
  it("drops its default width when the caller supplies one", () => {
    for (const width of ["w-auto", "w-fit", "w-64", "sm:w-48"]) {
      for (const el of [
        <Select aria-label="Tri" className={width} options={[]} />,
        <Input aria-label="Recherche" className={width} />,
        <Textarea aria-label="Description" className={width} />,
      ]) {
        const html = renderToStaticMarkup(el);
        expect(classTokens(html, width), `${width} on ${el.type}`).toHaveLength(
          1,
        );
        // `Input` wraps its control, and the inner field fills that wrapper —
        // what must not survive is a `w-full` on the same element as the
        // caller's width.
        const onSameElement = Array.from(
          html.matchAll(/class="([^"]*)"/g),
        ).some((m) => {
          const tokens = m[1].split(/\s+/);
          return tokens.includes(width) && tokens.includes("w-full");
        });
        expect(onSameElement, `${width} left a conflicting w-full`).toBe(false);
      }
    }
  });

  it("still fills its container when the caller says nothing", () => {
    for (const el of [
      <Select aria-label="Tri" options={[]} />,
      <Input aria-label="Recherche" />,
      <Textarea aria-label="Description" />,
    ]) {
      expect(
        classTokens(renderToStaticMarkup(el), "w-full").length,
      ).toBeGreaterThanOrEqual(1);
    }
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
