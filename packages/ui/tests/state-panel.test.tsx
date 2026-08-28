import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StatePanel } from "../src/feedback/StatePanel.web";

describe("StatePanel", () => {
  it("announces error and offline states without making expected empty states alerts", () => {
    const error = renderToStaticMarkup(
      <StatePanel title="Indisponible" description="Réessayez." />,
    );
    const notFound = renderToStaticMarkup(
      <StatePanel
        variant="notFound"
        title="Introuvable"
        description="Modifiez votre recherche."
      />,
    );

    expect(error).toContain('role="alert"');
    expect(notFound).not.toContain('role="alert"');
  });

  it("keeps technical information collapsed behind a localized label", () => {
    const markup = renderToStaticMarkup(
      <StatePanel
        title="Indisponible"
        description="Réessayez."
        technicalDetail="request_id: demo"
        technicalDetailLabel="Détails techniques"
      />,
    );

    expect(markup).toContain("<details");
    expect(markup).toContain("Détails techniques");
    expect(markup).toContain("request_id: demo");
  });

  it("can provide the page heading when it replaces a routed view", () => {
    const markup = renderToStaticMarkup(
      <StatePanel
        variant="notFound"
        headingLevel={1}
        title="Collection introuvable"
        description="Revenez aux collections."
      />,
    );

    expect(markup).toContain("<h1");
    expect(markup).not.toContain("<h2");
  });
});
