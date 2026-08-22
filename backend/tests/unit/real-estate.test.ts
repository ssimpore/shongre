import { describe, expect, it } from "vitest";
import { RealEstateService } from "../../src/modules/real-estate/real-estate.service.js";
import {
  DEFAULT_REAL_ESTATE_PROPERTIES,
  DemoRealEstateRepository,
} from "../../src/infrastructure/database/repositories/real-estate.repository.js";
import { DemoBusinessRulesRepository } from "../../src/infrastructure/database/repositories/business-rules.repository.js";
import { BusinessRulesService } from "../../src/modules/business-rules/business-rules.service.js";

function setup() {
  const repository = new DemoRealEstateRepository();
  return { repository, service: new RealEstateService(repository) };
}

const completeData = {
  transactionType: "sale",
  propertyType: "house",
  title: "Maison contemporaine avec jardin",
  description:
    "Maison familiale lumineuse avec jardin, terrasse et stationnement dans un environnement calme.",
  address: {
    city: "Lyon",
    postalCode: "69005",
    countryCode: "FR",
    latitude: 45.75,
    longitude: 4.82,
    precision: "district",
    publicLabel: "Lyon 5e",
    exactAddress: "Adresse strictement privée",
  },
  characteristics: {
    livingAreaSquareMeters: 118,
    rooms: 5,
    bedrooms: 4,
    bathrooms: 2,
    condition: "good",
    amenities: ["garden"],
    accessibilityFeatures: [],
  },
  financials: {
    price: { amountMinor: 62000000, currency: "EUR" },
    period: "total",
    feesPaidBy: "seller",
    isNegotiable: false,
  },
  energy: { dpeClass: "C", gesClass: "C" },
  regulatory: {
    coOwnershipApplicable: false,
    coOwnershipProcedureStatus: "not_applicable",
    riskInformationStatus: "available",
    ownershipDeclared: true,
    legalNotices: [],
  },
  media: { photos: ["https://images.example.com/house.webp"], floorPlans: [] },
  seller: {
    type: "owner",
    id: "owner-new",
    displayName: "Camille M.",
    verificationLabels: ["Téléphone vérifié"],
  },
  documents: [],
  offerId: "immo_owner_visibility",
};

// Commercial fields retain the existing Immo contract but are sourced from
// the published business-rules version.
describe("Shongre Immo commercial projection", () => {
  it("projects Immo offer prices from the active commercial version", async () => {
    class CommercialRepository extends DemoBusinessRulesRepository {
      override async getActiveCatalog(marketCode: string) {
        const catalog = await super.getActiveCatalog(marketCode);
        const changed = structuredClone(catalog!);
        changed.products.find((product) => product.id === "immo.agency.starter")!.prices[0].amount.amountMinor = 8456;
        return changed;
      }
    }
    const service = new RealEstateService(
      new DemoRealEstateRepository(),
      new BusinessRulesService(new CommercialRepository()),
    );
    const catalog = await service.getCatalog("FR");
    expect(catalog.offers.find((offer) => offer.id === "immo_agency_starter")?.prices[0].amount.amountMinor).toBe(8456);
  });
});

describe("RealEstateService", () => {
  it("never exposes exact address, documents, risk or moderation fields", async () => {
    const { service, repository } = setup();
    const privateProperty = await repository.getProperty(
      "property_apartment_lyon",
    );
    const property = await service.getPublicProperty("property_apartment_lyon");
    expect(property.address).not.toHaveProperty("exactAddress");
    for (const field of [
      "documents",
      "riskSignals",
      "moderationStatus",
      "createdByUserId",
      "ownerUserId",
    ])
      expect(property).not.toHaveProperty(field);
    expect(property.address.latitude).not.toBe(
      privateProperty?.address.latitude,
    );
  });

  it("keeps drafts account-private and removes internal fields", async () => {
    const { service } = setup();
    const draft = await service.saveOwnDraft("owner_a", "draft-private", {
      data: {
        ...completeData,
        riskScore: 99,
        riskSignals: ["secret"],
        paymentSecret: "secret",
      },
    });
    expect(draft.data).not.toHaveProperty("riskScore");
    expect(draft.data).not.toHaveProperty("riskSignals");
    expect(draft.data).not.toHaveProperty("paymentSecret");
    await expect(service.getOwnDraft("owner_b", draft.id)).rejects.toThrow(
      /introuvable/i,
    );
  });

  it("enforces France energy requirements and publishes complete drafts to moderation", async () => {
    const { repository, service } = setup();
    await service.saveOwnDraft("owner_new", "draft-invalid-energy", {
      currentStep: 10,
      completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      data: { ...completeData, energy: {} },
    });
    await expect(
      service.submitOwnDraft("owner_new", "draft-invalid-energy"),
    ).rejects.toThrow(/DPE|GES/i);
    await service.saveOwnDraft("owner_new", "draft-valid", {
      currentStep: 10,
      completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      data: completeData,
    });
    const result = await service.submitOwnDraft("owner_new", "draft-valid");
    expect(result.lifecycle).toBe("pending_review");
    expect(
      (await repository.getProperty(result.propertyId))?.moderationStatus,
    ).toBe("pending");
  });

  it("requires consent and deduplicates structured leads", async () => {
    const { service } = setup();
    const input = {
      propertyId: "property_rental_lyon",
      type: "visit",
      requesterName: "Acheteur Test",
      requesterEmail: "buyer@example.fr",
      message: "Je souhaite organiser une visite.",
      preferredContactChannel: "email",
      consentGiven: true,
      qualificationAnswers: {},
    };
    const first = await service.submitLead("buyer_user", input);
    const duplicate = await service.submitLead("buyer_user", input);
    expect(duplicate.id).toBe(first.id);
    await expect(
      service.submitLead("buyer_user", { ...input, consentGiven: false }),
    ).rejects.toThrow(/accord/i);
  });

  it("enforces agency membership and import entitlements with idempotency", async () => {
    const { service } = setup();
    await expect(
      service.getOwnAgencyWorkspace("member_clara", "agency_canopee"),
    ).resolves.toMatchObject({ organization: { id: "agency_canopee" } });
    await expect(
      service.getOwnAgencyWorkspace("outsider", "agency_canopee"),
    ).rejects.toThrow(/introuvable/i);
    const first = await service.requestImport(
      "member_clara",
      "agency_canopee",
      "csv",
      "stock.csv",
      "immo-import-test-001",
    );
    const retry = await service.requestImport(
      "member_clara",
      "agency_canopee",
      "csv",
      "stock.csv",
      "immo-import-test-001",
    );
    expect(retry.id).toBe(first.id);
    await expect(
      service.requestImport(
        "member_clara",
        "agency_canopee",
        "api",
        undefined,
        "immo-api-test-001",
      ),
    ).rejects.toThrow(/formule/i);
  });

  it("shares organization drafts only with agency members and exposes billing capabilities", async () => {
    const { service } = setup();
    const draft = await service.saveOwnDraft(
      "member_clara",
      "draft-agency-shared",
      {
        organizationId: "agency_canopee",
        currentStep: 4,
        completedSteps: [1, 2, 3],
        data: { title: "Brouillon partagé" },
      },
    );
    expect(draft.organizationId).toBe("agency_canopee");
    await expect(
      service.getOwnDraft("member_thomas", draft.id),
    ).resolves.toMatchObject({ organizationId: "agency_canopee" });
    await expect(service.getOwnDraft("outsider", draft.id)).rejects.toThrow(
      /introuvable/i,
    );
    await expect(
      service.getOwnAgencyWorkspace("member_clara", "agency_canopee"),
    ).resolves.toMatchObject({
      subscription: {
        offerId: "immo_agency_growth",
        offerName: "Agency Growth",
        status: "active",
      },
      integrationSettings: {
        csvImportEnabled: true,
        automaticSyncEnabled: true,
      },
    });
  });

  it("detects reused media, reused descriptions and anomalous prices without exposing signals", async () => {
    const { repository } = setup();
    const existing = DEFAULT_REAL_ESTATE_PROPERTIES[0];
    await expect(
      repository.assessRisk({
        title: existing.title,
        description: existing.description,
        priceMinor: 100,
        city: existing.address.city,
        mediaUrls: existing.media.photos,
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        "duplicate_photo",
        "reused_description",
        "suspicious_price",
      ]),
    );
  });

  it("refunds a paid demo checkout and refuses amounts above the original total", async () => {
    const { repository, service } = setup();
    await repository.saveCheckout({
      id: "checkout-immo-paid",
      verticalType: "real_estate",
      marketCode: "FR",
      accountId: "owner_new",
      offerId: "immo_owner_visibility",
      addOnIds: [],
      total: { amountMinor: 2990, currency: "EUR" },
      tax: { amountMinor: 498, currency: "EUR" },
      status: "paid",
      provider: "demo",
      invoiceId: "invoice-immo-demo",
      idempotencyKey: "checkout-immo-paid-001",
      createdAt: "2026-08-22T10:00:00.000Z",
      updatedAt: "2026-08-22T10:00:00.000Z",
    });
    await expect(
      service.refundCheckout("checkout-immo-paid", {
        idempotencyKey: "refund-immo-paid-001",
      }),
    ).resolves.toMatchObject({ status: "refunded" });

    await repository.saveCheckout({
      id: "checkout-immo-over-refund",
      verticalType: "real_estate",
      marketCode: "FR",
      accountId: "owner_new",
      addOnIds: [],
      total: { amountMinor: 490, currency: "EUR" },
      tax: { amountMinor: 82, currency: "EUR" },
      status: "paid",
      provider: "demo",
      idempotencyKey: "checkout-immo-over-refund-001",
      createdAt: "2026-08-22T10:00:00.000Z",
      updatedAt: "2026-08-22T10:00:00.000Z",
    });
    await expect(
      service.refundCheckout("checkout-immo-over-refund", {
        amountMinor: 491,
        idempotencyKey: "refund-immo-over-refund-001",
      }),
    ).rejects.toThrow(/montant/i);
  });

  it("processes real-estate payment webhooks idempotently", async () => {
    const { repository, service } = setup();
    await repository.saveCheckout({
      id: "checkout-immo-webhook",
      verticalType: "real_estate",
      marketCode: "FR",
      accountId: "owner_new",
      offerId: "immo_owner_visibility",
      addOnIds: [],
      total: { amountMinor: 2990, currency: "EUR" },
      tax: { amountMinor: 498, currency: "EUR" },
      status: "pending",
      provider: "stripe",
      providerCheckoutId: "cs_immo_test",
      idempotencyKey: "checkout-immo-webhook-001",
      createdAt: "2026-08-22T10:00:00.000Z",
      updatedAt: "2026-08-22T10:00:00.000Z",
    });
    const event = {
      id: "evt_immo_checkout_001",
      type: "checkout.session.completed",
      data: {
        object: {
          payment_intent: "pi_immo_001",
          invoice: "in_immo_001",
          metadata: {
            vertical_type: "real_estate",
            account_id: "owner_new",
            idempotency_key: "checkout-immo-webhook-001",
          },
        },
      },
    };
    await expect(
      service.handleProviderWebhook("stripe", event, JSON.stringify(event)),
    ).resolves.toMatchObject({ processed: true, duplicate: false });
    await expect(
      service.handleProviderWebhook("stripe", event, JSON.stringify(event)),
    ).resolves.toMatchObject({ duplicate: true });
    await expect(
      repository.getCheckout("checkout-immo-webhook"),
    ).resolves.toMatchObject({
      status: "paid",
      providerPaymentId: "pi_immo_001",
      invoiceId: "in_immo_001",
    });
  });
});
