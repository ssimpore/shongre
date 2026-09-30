import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Image } from "./Image";

describe("Image", () => {
  it("renders an owned fallback asset when the primary source is missing", () => {
    const html = renderToStaticMarkup(
      <Image
        src={undefined}
        fallbackSrc="/images/categories/emploi.jpg"
        alt=""
      />,
    );

    expect(html).toContain('<img src="/images/categories/emploi.jpg"');
    expect(html).not.toContain('aria-label="Image indisponible"');
  });

  it("keeps the primary source when one is available", () => {
    const html = renderToStaticMarkup(
      <Image
        src="https://images.example.test/employer.png"
        fallbackSrc="/images/categories/emploi.jpg"
        alt="Logo employeur"
      />,
    );

    expect(html).toContain('src="https://images.example.test/employer.png"');
    // The image must paint from the server document, including when JS is delayed.
    expect(html).not.toContain("opacity-0");
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain('src="/images/categories/emploi.jpg"');
  });

  it("announces a localized neutral fallback without giving the photo duplicate alt text", () => {
    const html = renderToStaticMarkup(
      <Image src={undefined} alt="" fallbackLabel="Visuel indisponible" />,
    );

    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Visuel indisponible"');
  });
});
