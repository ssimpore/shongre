import React from "react";
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
