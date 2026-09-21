import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Container, Grid, Surface } from "./Layout";
import { Heading, Text } from "./Typography";

describe("layout and typography primitives", () => {
  it("maps semantic container and surface variants to owned tokens", () => {
    const html = renderToStaticMarkup(
      <Container width="workspace">
        <Surface tone="subtle" radius="card" elevation="dropdown">
          content
        </Surface>
      </Container>,
    );
    expect(html).toContain("max-w-workspace");
    expect(html).toContain("bg-bg-subtle");
    expect(html).toContain("rounded-card");
    expect(html).toContain("shadow-dropdown");
  });

  it("maps listing results to complete-card responsive container tokens", () => {
    const html = renderToStaticMarkup(
      <Container width="listingResults">results</Container>,
    );

    expect(html).toContain("listing-2:max-w-listing-results-sm");
    expect(html).toContain("listing-2:px-6");
    expect(html).toContain("listing-3:max-w-listing-results-md");
    expect(html).toContain("listing-4:max-w-listing-results-lg");
    expect(html).toContain("listing-4:px-8");
    expect(html).toContain("listing-5:max-w-listing-results-xl");
    expect(html).toContain("listing-6:max-w-listing-results-2xl");
  });

  it("provides responsive grids and semantic type roles", () => {
    const html = renderToStaticMarkup(
      <Grid columns={3}>
        <Heading as="h1" size="display-sm">
          Titre
        </Heading>
        <Text size="caption" tone="muted">
          Détail
        </Text>
      </Grid>,
    );
    expect(html).toContain("lg:grid-cols-3");
    expect(html).toContain("text-display-sm");
    expect(html).toContain("text-caption");
  });
});
