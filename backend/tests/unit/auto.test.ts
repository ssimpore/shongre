import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AutoService } from "../../src/modules/auto/auto.service.js";
import {
  DEFAULT_AUTO_CONFIG,
  DEMO_AUTO_VEHICLES,
  DemoAutoRepository,
  PostgresAutoRepository,
} from "../../src/infrastructure/database/repositories/auto.repository.js";
import { DemoBusinessRulesRepository } from "../../src/infrastructure/database/repositories/business-rules.repository.js";
import { BusinessRulesService } from "../../src/modules/business-rules/business-rules.service.js";

const completeDraftData = {
  vehicleType: "car",
  makeId: "peugeot",
  makeLabel: "Peugeot",
  modelId: "peugeot-3008",
  modelLabel: "3008",
  modelYear: 2021,
  firstRegistrationDate: "2021-04-02",
  mileage: 43000,
  mileageUnit: "km",
  fuelType: "petrol",
  transmission: "automatic",
  condition: "good",
  accidentStatus: "none_declared",
  maintenanceBookStatus: "complete",
  inspectionStatus: "valid",
  priceMinor: 2249000,
  locationLabel: "Paris (75)",
  title: "Peugeot 3008 PureTech 130 Allure",
  description:
    "Véhicule entretenu avec historique disponible et documents présentés dans un cadre sécurisé.",
  mediaUrls: ["https://images.example.com/vehicle.jpg"],
  equipment: ["GPS"],
  documents: [],
  sellerType: "individual",
  sellerDisplayName: "Camille Martin",
  planId: "auto_private_free",
};

function createService() {
  const repository = new DemoAutoRepository();
  return { repository, service: new AutoService(repository) };
}

async function saveCompleteDraft(
  service: AutoService,
  userId = "user_private_seller",
  draftId = "draft_auto_test",
) {
  return service.saveOwnDraft(userId, draftId, {
    marketCode: "FR",
    currentStep: 11,
    completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    duplicateCheck: "clear",
    data: completeDraftData,
  });
}

describe("Shongre Auto domain service", () => {
  it("reuses the latest market draft and scopes favorites to the account", async () => {
    const { service } = createService();
    const first = await service.getOrCreateOwnDraft("seller_a", "fr");
    const second = await service.getOrCreateOwnDraft("seller_a", "FR");
    expect(second.id).toBe(first.id);
    expect(await service.getFavoriteVehicleIds("buyer_a")).toEqual([]);
    await expect(
      service.toggleFavoriteVehicle("buyer_a", "vehicle_3008_petrol"),
    ).resolves.toBe(true);
    expect(await service.getFavoriteVehicleIds("buyer_a")).toEqual([
      "vehicle_3008_petrol",
    ]);
    expect(await service.getFavoriteVehicleIds("buyer_b")).toEqual([]);
  });

  it("projects Auto prices from the active commercial version", async () => {
    class CommercialRepository extends DemoBusinessRulesRepository {
      override async getActiveCatalog(marketCode: string) {
        const catalog = await super.getActiveCatalog(marketCode);
        const changed = structuredClone(catalog!);
        changed.products.find(
          (product) => product.id === "auto.dealer.starter",
        )!.prices[0].amount.amountMinor = 8123;
        return changed;
      }
    }
    const service = new AutoService(
      new DemoAutoRepository(),
      new BusinessRulesService(new CommercialRepository()),
    );
    const catalog = await service.getCatalog("FR");
    expect(
      catalog.plans.find((plan) => plan.id === "auto_dealer_starter")
        ?.monthlyPrice?.amountMinor,
    ).toBe(8123);
  });

  it("returns only approved public vehicle fields", async () => {
    const { service } = createService();
    const vehicle = await service.getPublicVehicle("vehicle_3008_petrol");
    expect(vehicle.lifecycle).toBe("published");
    for (const privateField of [
      "ownerUserId",
      "dealerOrganizationId",
      "stockReference",
      "vinMasked",
      "vinHash",
      "registrationHash",
      "moderationStatus",
      "documents",
      "riskSignals",
    ])
      expect(vehicle).not.toHaveProperty(privateField);
  });

  it("keeps a draft private and strips raw vehicle identity fields", async () => {
    const { service } = createService();
    const draft = await service.saveOwnDraft("seller_a", "draft_private", {
      marketCode: "FR",
      data: {
        ...completeDraftData,
        vin: "VF3SECRET12345678",
        registrationNumber: "AA-123-AA",
        documentStoragePath: "private/user/document.pdf",
      },
    });
    expect(draft.data).not.toHaveProperty("vin");
    expect(draft.data).not.toHaveProperty("registrationNumber");
    expect(draft.data).not.toHaveProperty("documentStoragePath");
    await expect(service.getOwnDraft("seller_b", draft.id)).rejects.toThrow(
      /autre compte/i,
    );
  });

  it("hashes and masks identifiers, detects duplicates without persisting raw values", async () => {
    const { repository, service } = createService();
    const vin = "VF3DUPLICATE00001";
    const registration = "AA-123-AA";
    const existing = (await repository.getVehicle("vehicle_3008_petrol"))!;
    await repository.saveVehicle({
      ...existing,
      vinHash: `sha256:${createHash("sha256").update(vin).digest("hex")}`,
    });
    await saveCompleteDraft(service);
    const result = await service.checkDuplicateIdentity(
      "user_private_seller",
      "draft_auto_test",
      vin,
      registration,
    );
    expect(result.status).toBe("possible_match");
    const identity = await repository.getDraftIdentity("draft_auto_test");
    expect(identity?.vinHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(identity?.vinMasked).toBe("VF3**************");
    expect(JSON.stringify(identity)).not.toContain(vin);
    expect(JSON.stringify(identity)).not.toContain(registration);
  });

  it("submits a complete checked draft to moderation and enforces the active quota", async () => {
    const { repository, service } = createService();
    await saveCompleteDraft(service);
    await service.checkDuplicateIdentity(
      "user_private_seller",
      "draft_auto_test",
      "VF3UNIQUE00000001",
    );
    const submitted = await service.submitOwnDraft(
      "user_private_seller",
      "draft_auto_test",
    );
    expect(submitted.lifecycle).toBe("pending_review");
    const stored = await repository.getVehicle(submitted.vehicleId);
    expect(stored?.moderationStatus).toBe("pending_review");
    expect(stored?.ownerUserId).toBe("user_private_seller");
    expect(stored?.dealerOrganizationId).toBeUndefined();

    await saveCompleteDraft(service, "user_private_seller", "draft_second");
    await service.checkDuplicateIdentity(
      "user_private_seller",
      "draft_second",
      "VF3UNIQUE00000002",
    );
    await expect(
      service.submitOwnDraft("user_private_seller", "draft_second"),
    ).rejects.toThrow(/quota/i);
  });

  it("enforces dealer membership and suspends imports without a worker", async () => {
    const { service } = createService();
    await expect(
      service.getOwnDealerWorkspace(
        "user_dealer_seller",
        "dealer_auto_select_lyon",
      ),
    ).resolves.toMatchObject({
      organization: { id: "dealer_auto_select_lyon" },
    });
    await expect(
      service.getOwnDealerWorkspace(
        "unrelated_user",
        "dealer_auto_select_lyon",
      ),
    ).rejects.toThrow(/n’appartenez pas/i);
    await expect(
      service.saveOwnVehicle("unrelated_user", DEMO_AUTO_VEHICLES[0]),
    ).rejects.toThrow(/n’appartenez pas/i);
    await expect(
      service.requestInventoryImport(
        "user_dealer_owner",
        "dealer_auto_select_lyon",
        "api",
        undefined,
        "request-auto-api-001",
      ),
    ).rejects.toThrow(/pas inclus|pas activé/i);

    await expect(
      service.requestInventoryImport(
        "user_dealer_owner",
        "dealer_auto_select_lyon",
        "csv",
        "stock.csv",
        "request-auto-csv-001",
      ),
    ).rejects.toThrow(/pas inclus|pas activé/i);
  });

  it("preserves media after a downgrade while blocking only additional photos", async () => {
    const { repository, service } = createService();
    const existing = DEMO_AUTO_VEHICLES[0];
    const mediaUrls = Array.from(
      { length: 18 },
      (_value, index) => `https://images.example.com/downgraded-${index}.webp`,
    );
    await repository.saveVehicle({
      ...existing,
      ownerUserId: "user_downgraded_seller",
      dealerOrganizationId: undefined,
      dealerLocationId: undefined,
      planId: "auto_private_free",
      mediaUrls,
    });

    await expect(
      service.saveOwnVehicle("user_downgraded_seller", {
        ...existing,
        ownerUserId: "user_downgraded_seller",
        dealerOrganizationId: undefined,
        dealerLocationId: undefined,
        planId: "auto_private_free",
        title: "Titre modifié sans suppression de médias",
        mediaUrls,
      }),
    ).resolves.toMatchObject({ mediaUrls });

    await expect(
      service.saveOwnVehicle("user_downgraded_seller", {
        ...existing,
        ownerUserId: "user_downgraded_seller",
        dealerOrganizationId: undefined,
        dealerLocationId: undefined,
        planId: "auto_private_free",
        mediaUrls: [
          ...mediaUrls,
          "https://images.example.com/downgraded-extra.webp",
        ],
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      details: {
        entitlement: "maxPhotosPerVehicle",
        limit: 12,
        existing: 18,
        requested: 19,
      },
    });
  });

  it("flags duplicate identity, photos, descriptions and inconsistent mileage", async () => {
    const { repository } = createService();
    const existing = DEMO_AUTO_VEHICLES[0];
    await expect(
      repository.assessVehicleRisk({
        vinHash: existing.vinHash,
        registrationHash: existing.registrationHash,
        description: existing.description,
        mediaUrls: existing.mediaUrls,
        mileage: Math.max(0, existing.technical.mileage - 1),
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        "duplicate_vin",
        "duplicate_photo",
        "reused_description",
        "inconsistent_mileage",
      ]),
    );
  });

  it("blocks spam leads, unsafe paid activation, partner routing and premature boats", async () => {
    const { service } = createService();
    const lead = await service.submitLead(undefined, {
      vehicleId: "vehicle_3008_petrol",
      contactName: "Acheteur Test",
      contactEmail: "buyer@example.fr",
      intention: "availability",
      message: "Écrivez-moi sur Telegram, règlement en crypto.",
      source: "vehicle_page",
      marketingConsent: false,
    });
    expect(lead.status).toBe("spam");
    expect(lead.spamAssessment).toBe("blocked");

    const cleanLead = {
      vehicleId: "vehicle_3008_petrol",
      contactName: "Acheteur Doublon",
      contactEmail: "duplicate@example.fr",
      intention: "callback" as const,
      message: "Merci de me rappeler au sujet de ce véhicule.",
      source: "vehicle_page" as const,
      marketingConsent: false,
    };
    await expect(
      service.submitLead(undefined, cleanLead),
    ).resolves.toMatchObject({
      spamAssessment: "clear",
    });
    await expect(
      service.submitLead(undefined, cleanLead),
    ).resolves.toMatchObject({
      spamAssessment: "review",
    });

    await expect(
      service.updateMarketConfig("FR", {
        ...DEFAULT_AUTO_CONFIG,
        featureFlags: {
          ...DEFAULT_AUTO_CONFIG.featureFlags,
          paidOffersEnabled: true,
        },
      }),
    ).rejects.toThrow(/webhooks|remboursements/i);
    await expect(
      service.updateVehicleType("FR", "boat", { isActive: true }),
    ).rejects.toThrow(/drapeau marché/i);
    await expect(
      service.createPartnerReferral(undefined, "FR", {
        marketCode: "FR",
        vehicleId: "vehicle_3008_petrol",
        type: "financing",
        consentTextVersion: "v1",
      }),
    ).rejects.toThrow(/pas activé/i);
    await expect(
      service.createPartnerReferral(undefined, "FR", {
        marketCode: "FR",
        vehicleId: "vehicle_3008_petrol",
        type: "delivery",
        consentTextVersion: "v1",
      }),
    ).rejects.toThrow(/pas activé/i);
    await expect(
      service.updateAddOn("FR", "auto_addon_delivery_referral", {
        isActive: true,
      }),
    ).rejects.toThrow(/validation|partenaire|fournisseur/i);
  });

  it("processes signed-provider payloads idempotently at the Auto domain boundary", async () => {
    const { service } = createService();
    const event = {
      id: "evt_auto_checkout_001",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_auto_001",
          payment_intent: "pi_auto_001",
          metadata: {
            vertical: "automotive",
            autoPurchaseId: "purchase_auto_001",
          },
        },
      },
    };
    const rawBody = JSON.stringify(event);
    await expect(
      service.handleProviderWebhook("stripe", event, rawBody),
    ).resolves.toEqual({
      handled: true,
      duplicate: false,
      purchaseUpdated: true,
    });
    await expect(
      service.handleProviderWebhook("stripe", event, rawBody),
    ).resolves.toEqual({
      handled: true,
      duplicate: true,
      purchaseUpdated: false,
    });
    const expiredEvent = {
      id: "evt_auto_checkout_expired_001",
      type: "checkout.session.expired",
      data: {
        object: {
          id: "cs_auto_expired_001",
          metadata: {
            vertical: "automotive",
            autoPurchaseId: "purchase_auto_expired_001",
          },
        },
      },
    };
    await expect(
      service.handleProviderWebhook(
        "stripe",
        expiredEvent,
        JSON.stringify(expiredEvent),
      ),
    ).resolves.toMatchObject({
      handled: true,
      duplicate: false,
      purchaseUpdated: true,
    });
    await expect(
      service.handleProviderWebhook(
        "stripe",
        {
          id: "evt_unrelated_001",
          type: "checkout.session.completed",
          data: { object: { metadata: { vertical: "courses" } } },
        },
        "{}",
      ),
    ).resolves.toMatchObject({ handled: false });
  });

  it("keeps both repository adapters compatible with the complete Auto contract", () => {
    for (const repository of [
      new DemoAutoRepository(),
      new PostgresAutoRepository(),
    ])
      for (const method of [
        "getCatalog",
        "saveMarketConfig",
        "savePlan",
        "saveAddOn",
        "saveVehicleType",
        "search",
        "getVehicle",
        "saveVehicle",
        "hasDuplicateIdentity",
        "assessVehicleRisk",
        "countActiveVehicles",
        "getDraft",
        "saveDraft",
        "getDraftIdentity",
        "saveDraftIdentity",
        "createInventoryImport",
        "beginProviderEvent",
        "updateAddOnPurchaseFromProvider",
        "completeProviderEvent",
        "hasRecentDuplicateLead",
        "createLead",
        "saveLead",
        "getDealerWorkspace",
        "getAdminOverview",
      ])
        expect(
          typeof (repository as unknown as Record<string, unknown>)[method],
        ).toBe("function");
  });
});
