import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProviderCapabilityLabel } from "./ProviderCapabilityLabel";

describe("ProviderCapabilityLabel", () => {
  it("pairs the canonical human label with an explicitly captioned code", () => {
    const html = renderToStaticMarkup(
      <ProviderCapabilityLabel capability="payment.card" />,
    );

    expect(html).toContain("Paiement par Carte Bancaire");
    expect(html).toContain("Code capacité :");
    expect(html).toContain("payment.card");
  });

  it("can include the canonical provider domain", () => {
    const html = renderToStaticMarkup(
      <ProviderCapabilityLabel capability="payment.card" showCategory />,
    );

    expect(html).toContain("Paiements");
  });
});
