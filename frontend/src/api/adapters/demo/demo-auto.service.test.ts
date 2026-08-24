import { describe, expect, it } from "vitest";
import type { VehicleDraft } from "@shongre/contracts/auto";
import { DemoAutoService } from "./demo-auto.service";

const draft = (id: string): VehicleDraft => ({
  id,
  ownerUserId: "user_private_seller",
  schemaVersion: 1,
  marketCode: "FR",
  currentStep: 11,
  completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  data: {
    makeLabel: "Peugeot",
    modelLabel: "3008",
    priceMinor: 1900000,
  },
  duplicateCheck: "clear",
  updatedAt: "2026-08-22T10:00:00.000Z",
});

describe("DemoAutoService", () => {
  it("filters and sorts deterministic vehicle results with minor-unit prices", async () => {
    const service = new DemoAutoService();
    const first = await service.searchVehicles({
      marketCode: "FR",
      makeIds: ["peugeot"],
      fuelTypes: ["diesel"],
      maxMileage: 90000,
      sort: "price_asc",
      limit: 20,
    });
    const second = await service.searchVehicles({
      marketCode: "FR",
      makeIds: ["peugeot"],
      fuelTypes: ["diesel"],
      maxMileage: 90000,
      sort: "price_asc",
      limit: 20,
    });
    expect(second).toEqual(first);
    expect(first.items.length).toBeGreaterThan(0);
    expect(
      first.items.every((vehicle) =>
        Number.isInteger(vehicle.price.amountMinor),
      ),
    ).toBe(true);
    expect(first.items[0]).not.toHaveProperty("vinHash");
    expect(first.items[0]).not.toHaveProperty("registrationHash");
  });

  it("paginates without returning duplicate vehicles", async () => {
    const service = new DemoAutoService();
    const first = await service.searchVehicles({
      marketCode: "FR",
      sort: "newest",
      limit: 2,
    });
    const second = await service.searchVehicles({
      marketCode: "FR",
      sort: "newest",
      cursor: first.pageInfo.nextCursor,
      limit: 2,
    });
    expect(first.pageInfo.hasNextPage).toBe(true);
    expect(second.items.map((item) => item.id)).not.toContain(
      first.items[0].id,
    );
  });

  it("keeps favorites isolated by account", async () => {
    const service = new DemoAutoService();
    await service.toggleFavoriteVehicle("account_a", "vehicle_3008_diesel");
    expect(await service.getFavoriteVehicleIds("account_a")).toContain(
      "vehicle_3008_diesel",
    );
    expect(await service.getFavoriteVehicleIds("account_b")).not.toContain(
      "vehicle_3008_diesel",
    );
  });

  it("autosaves, detects a duplicate and submits only complete drafts", async () => {
    const service = new DemoAutoService();
    const saved = await service.saveDraft(draft("draft_auto_demo"));
    expect(saved.updatedAt).toBe("2026-08-22T10:00:00.000Z");
    const duplicate = await service.checkDuplicateIdentity(
      saved.id,
      "VF3DUPLICATE00001",
    );
    expect(duplicate.status).toBe("possible_match");
    await expect(service.submitDraft(saved.id)).resolves.toMatchObject({
      lifecycle: "pending_review",
    });
    await expect(service.submitDraft("missing")).rejects.toThrow(/complétez/i);
  });

  it("validates draft media through the adapter instead of the component", async () => {
    const service = new DemoAutoService();
    await expect(
      service.uploadDraftMedia("draft_media", {
        name: "vehicle.webp",
        type: "image/webp",
        size: 2_000_000,
      }),
    ).resolves.toMatchObject({ url: expect.stringMatching(/^https:\/\//) });
    await expect(
      service.uploadDraftMedia("draft_media", {
        name: "identity.pdf",
        type: "application/pdf",
        size: 1_000,
      }),
    ).rejects.toThrow(/images/i);
    await expect(
      service.uploadDraftMedia("draft_media", {
        name: "too-large.jpg",
        type: "image/jpeg",
        size: 21 * 1024 * 1024,
      }),
    ).rejects.toThrow(/20 Mo/i);
  });

  it("blocks suspicious contact content and unsupported import formats", async () => {
    const service = new DemoAutoService();
    const lead = await service.submitLead({
      vehicleId: "vehicle_3008_petrol",
      contactName: "Acheteur Test",
      contactEmail: "buyer@example.fr",
      intention: "availability",
      message: "Paiement en gift card puis échange sur Telegram.",
      source: "vehicle_page",
      marketingConsent: false,
    });
    expect(lead.status).toBe("spam");
    await expect(
      service.requestInventoryImport(
        "dealer_auto_select_lyon",
        "api",
        undefined,
        "request-api-demo-001",
      ),
    ).rejects.toThrow(/pas activé/i);
    await expect(
      service.requestInventoryImport(
        "dealer_auto_select_lyon",
        "csv",
        "stock.csv",
        "request-csv-demo-001",
      ),
    ).rejects.toThrow(/pas activé/i);
  });

  it("keeps paid offers and boats behind explicit market gates", async () => {
    const service = new DemoAutoService();
    const catalog = await service.getCatalog("FR");
    expect(catalog.config.featureFlags.paidOffersEnabled).toBe(false);
    expect(catalog.config.featureFlags.secureSaleEnabled).toBe(false);
    expect(catalog.vehicleTypes.some((type) => type.type === "boat")).toBe(
      false,
    );
    await expect(
      service.updateMarketConfig("FR", {
        featureFlags: {
          ...catalog.config.featureFlags,
          paidOffersEnabled: true,
        },
      }),
    ).rejects.toThrow(/configuration serveur/i);
    await expect(
      service.updateVehicleType("FR", "boat", { isActive: true }),
    ).rejects.toThrow(/drapeau marché/i);
  });
});
