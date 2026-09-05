import { describe, expect, it, vi } from "vitest";

vi.mock("@/api/http-client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/config/environment", () => ({
  mobileEnvironment: { dataMode: "demo" },
}));
import { DemoMobileDeliveryService } from "../src/features/delivery/delivery.service";

const courier = {
  userId: "mobile-courier",
  displayName: "Sam",
  verified: true,
};
const requester = {
  userId: "user_thomas",
  displayName: "Thomas",
  verified: true,
};

describe("mobile delivery boundary", () => {
  it("fails closed outside the explicit France demo market", async () => {
    const service = new DemoMobileDeliveryService();
    expect((await service.availability("FR")).enabled).toBe(true);
    expect((await service.availability("CH")).enabled).toBe(false);
    expect(await service.search({ marketCode: "CH", limit: 20 })).toEqual([]);
  });

  it("requires an active same-market courier profile before applying", async () => {
    const service = new DemoMobileDeliveryService();
    const [request] = await service.search({ marketCode: "FR", limit: 20 });
    await expect(
      service.submitApplication(courier, request.id, "FR", {
        availabilityNote: "Disponible",
        message: "Je peux assurer cette livraison.",
        idempotencyKey: "mobile-delivery-application-test",
      }),
    ).rejects.toThrow("DELIVERY_NOT_ELIGIBLE");
    await service.saveCourierProfile(courier, "FR", {
      status: "active",
      vehicleTypes: ["van"],
      maxWeightGrams: 40_000,
      serviceLocalities: [
        { city: "Paris", postalCode: "75011" },
        { city: "Boulogne-Billancourt", postalCode: "92100" },
      ],
      opportunityNotifications: true,
    });
    await expect(
      service.submitApplication(courier, request.id, "FR", {
        availabilityNote: "Disponible",
        message: "Je peux assurer cette livraison.",
        idempotencyKey: "mobile-delivery-application-test",
      }),
    ).resolves.toMatchObject({ status: "submitted" });
  });

  it("limits a selected courier to their assignment and exact stops", async () => {
    const service = new DemoMobileDeliveryService();
    const [request] = await service.search({ marketCode: "FR", limit: 20 });
    await service.saveCourierProfile(courier, "FR", {
      status: "active",
      vehicleTypes: ["van"],
      maxWeightGrams: 40_000,
      serviceLocalities: [
        { city: "Paris", postalCode: "75011" },
        { city: "Boulogne-Billancourt", postalCode: "92100" },
      ],
      opportunityNotifications: true,
    });
    const application = await service.submitApplication(
      courier,
      request.id,
      "FR",
      {
        availabilityNote: "Disponible",
        message: "Je peux assurer cette livraison.",
        idempotencyKey: "mobile-delivery-private-assignment",
      },
    );
    await service.acceptApplication(
      requester,
      request.id,
      application.id,
      "FR",
      request.version,
    );

    const assignment = await service.getPrivateRequest(
      courier,
      request.id,
      "FR",
    );
    expect(assignment).toMatchObject({
      pickup: { city: "Paris" },
      selectedApplication: { id: application.id },
    });
    expect(assignment).not.toHaveProperty("applications");
    expect(assignment).not.toHaveProperty("sourceOrderId");
  });
});
