import { describe, expect, it } from "vitest";
import {
  AiService,
  MESSAGE_SAFETY_WARNINGS,
} from "../../src/modules/ai/ai.service.js";
import { DemoAIProvider } from "../../src/integrations/providers/ai.provider.js";
import {
  CANONICAL_DEMO_LISTINGS,
  DemoListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";
import { requireApiMarketContext } from "../../src/modules/markets/request-market-context.js";
import type { Listing } from "../../src/shared/types/index.js";

const france = requireApiMarketContext("FR");

describe("listing draft from photos", () => {
  const service = new AiService(
    new DemoAIProvider(),
    new DemoListingRepository({}),
  );

  it("proposes a published category of the market with a title and description", async () => {
    const proposal = await service.suggestListingFromPhotos({
      marketContext: france,
      locale: "fr-FR",
      imageUrls: ["https://media.example/uploads/velo-gravel-face.jpg"],
    });
    expect(proposal.category).toBeTruthy();
    expect(proposal.category?.label.toLowerCase()).toContain("vélo");
    expect(proposal.title.length).toBeGreaterThan(0);
    expect(proposal.description.length).toBeGreaterThan(0);
    expect(proposal.confidence).toBeGreaterThan(0);
  });

  it("answers no category, not an invented one, when the photos say nothing", async () => {
    const proposal = await service.suggestListingFromPhotos({
      marketContext: france,
      locale: "fr-FR",
      imageUrls: ["https://media.example/uploads/img_0042.jpg"],
    });
    expect(proposal.category).toBeNull();
    expect(proposal.confidence).toBeLessThan(50);
  });

  it("refuses anything but one to five HTTPS photos", async () => {
    for (const imageUrls of [
      [],
      ["http://insecure.example/a.jpg"],
      new Array(6).fill("https://m.example/a.jpg"),
      "not-a-list",
    ]) {
      await expect(
        service.suggestListingFromPhotos({
          marketContext: france,
          locale: "fr-FR",
          imageUrls,
        }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
});

describe("price estimate from comparable sales", () => {
  const base = CANONICAL_DEMO_LISTINGS.list_1;
  const CATEGORY = "vehicles.cycles.bicycles";
  const sold = (
    id: string,
    priceMinor: number,
    patch: Partial<Listing> = {},
  ): Listing => ({
    ...base,
    id,
    categoryId: CATEGORY,
    status: "sold",
    price: priceMinor / 100,
    marketPublications: base.marketPublications?.map((publication) => ({
      ...publication,
      priceMinor,
    })),
    ...patch,
  });

  it("reports sale percentiles over the category subtree, narrowed while the sample holds", async () => {
    const repository = new DemoListingRepository({
      a: sold("a", 20_000, { brand: "Canyon" }),
      b: sold("b", 25_000, { brand: "Canyon" }),
      c: sold("c", 30_000, { brand: "Canyon" }),
      d: sold("d", 35_000, { brand: "Canyon" }),
      e: sold("e", 40_000, { brand: "Canyon" }),
      f: sold("f", 90_000, { brand: "Specialized" }),
    });
    const service = new AiService(new DemoAIProvider(), repository);
    const estimate = await service.estimateListingPrice({
      marketCode: "FR",
      // The parent node answers with its published subtree.
      categoryId: "vehicles.cycles",
      brand: "canyon",
    });
    expect(estimate).toMatchObject({
      basis: "sold",
      sampleSize: 5,
      currency: "EUR",
      medianMinor: 30_000,
      narrowedBy: ["brand"],
    });
    // Too few Specialized sales: the brand is relaxed rather than answered on one row.
    const relaxed = await service.estimateListingPrice({
      marketCode: "FR",
      categoryId: CATEGORY,
      brand: "specialized",
    });
    expect(relaxed).toMatchObject({
      basis: "sold",
      sampleSize: 6,
      narrowedBy: [],
    });
  });

  it("falls back to asking prices, then to nothing", async () => {
    const service = new AiService(
      new DemoAIProvider(),
      new DemoListingRepository(),
    );
    const asking = await service.estimateListingPrice({
      marketCode: "FR",
      categoryId: CATEGORY,
    });
    expect(["asking", "none"]).toContain(asking.basis);
    await expect(
      service.estimateListingPrice({
        marketCode: "FR",
        categoryId: "no.such.category",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("message safety assessment", () => {
  const service = new AiService(
    new DemoAIProvider(),
    new DemoListingRepository({}),
  );

  it.each([
    ["Je vous paie par Western Union dès ce soir", ["off_platform_payment"]],
    ["Contactez-moi sur WhatsApp au 06 12 34 56 78", ["off_platform_contact"]],
    ["Payez ici : http://paiement-securise.example/pay", ["external_link"]],
    [
      "Les frais de livraison sont à payer d'abord au transporteur agréé",
      ["shipping_fee_upfront"],
    ],
    ["Réponds vite, dernière chance !", ["pressure"]],
  ] as const)("flags %s", (text, flags) => {
    expect(service.assessMessageSafety(text)).toEqual([...flags]);
  });

  it("leaves an ordinary message and a Shongre link alone", () => {
    expect(
      service.assessMessageSafety(
        "Bonjour, le vélo est-il toujours disponible ? Voir https://shongre.fr/annonce/123",
      ),
    ).toEqual([]);
  });

  it("has a recipient-facing warning for every flag it can raise", () => {
    for (const flag of [
      "off_platform_payment",
      "off_platform_contact",
      "external_link",
      "shipping_fee_upfront",
      "pressure",
    ]) {
      expect(MESSAGE_SAFETY_WARNINGS[flag]).toBeTruthy();
    }
  });
});
