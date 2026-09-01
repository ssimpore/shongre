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
    expect(html).not.toContain('src="/images/categories/emploi.jpg"');
  });
});
