import { afterEach, describe, expect, it, vi } from "vitest";
import { apiOperation } from "./generated-api-operation";
import { HttpSupportService } from "./http-support.service";

vi.mock("./generated-api-operation", () => ({ apiOperation: vi.fn() }));

afterEach(() => vi.mocked(apiOperation).mockReset());

describe("HttpSupportService", () => {
  it("loads help articles through the market-scoped generated operation", async () => {
    vi.mocked(apiOperation).mockResolvedValue({
      items: [
        {
          id: "faq-fr-payment",
          locale: "fr-FR",
          marketCode: null,
          category: "transactions",
          question: "Comment fonctionne le paiement en ligne ?",
          answer:
            "Le statut du paiement est fourni par la commande enregistrée par le backend.",
          sortOrder: 10,
          updatedAt: "2026-09-13T20:00:00.000000+00:00",
        },
      ],
    });

    const articles = await new HttpSupportService().listHelpArticles(
      "FR",
      "fr-FR",
    );

    expect(articles).toHaveLength(1);
    expect(apiOperation).toHaveBeenCalledWith("getSupportHelpArticles", {
      query: { locale: "fr-FR" },
      headers: { "X-Shongre-Market": "FR" },
    });
  });
});
