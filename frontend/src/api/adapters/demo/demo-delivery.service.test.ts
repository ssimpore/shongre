import { beforeEach, describe, expect, it, vi } from "vitest";

const featureFlagState = vi.hoisted(() => ({ enabled: true }));

vi.mock("../../client/api-client.config", () => ({
  simulateNetworkDelay: () => Promise.resolve(),
}));
vi.mock("./demo-feature-flag.service", () => ({
  demoFeatureFlagService: {
    evaluate: (_key: string, context: { marketCode?: string }) =>
      Promise.resolve({
        enabled: featureFlagState.enabled && context.marketCode === "FR",
      }),
  },
}));
import { DemoDeliveryService } from "./demo-delivery.service";
import { DemoSearchService } from "./demo-search.service";

const requester = {
  userId: "web-requester",
  displayName: "Camille",
  verified: true,
};
const courier = { userId: "web-courier", displayName: "Sam", verified: true };
const outsider = { userId: "web-outsider", displayName: "Lou", verified: true };

const draftInput = {
  marketCode: "FR",
  origin: "standalone" as const,
  title: "Livrer un colis fragile",
  description: "Le colis est prêt et doit rester à la verticale.",
  pickup: {
    street: "12 rue A",
    city: "Paris",
    postalCode: "75011",
    contactName: "Camille",
    contactPhone: "+33600000000",
  },
  dropoff: {
    street: "8 rue B",
    city: "Boulogne",
    postalCode: "92100",
    contactName: "Alex",
    contactPhone: "+33600000001",
  },
  pickupWindow: {
    startsAt: "2027-01-15T09:00:00.000Z",
    endsAt: "2027-01-15T11:00:00.000Z",
  },
  deliveryWindow: {
    startsAt: "2027-01-15T12:00:00.000Z",
    endsAt: "2027-01-15T16:00:00.000Z",
  },
  package: {
    type: "Colis",
    count: 1,
    approximateWeightGrams: 5_000,
    handlingRequirements: ["Fragile"],
    requiredVehicleType: "bicycle" as const,
    loadingAssistanceRequired: false,
  },
  expiresAt: "2027-01-14T20:00:00.000Z",
  idempotencyKey: "web-delivery-request-test",
};

describe("delivery demo service", () => {
  beforeEach(() => {
    featureFlagState.enabled = true;
  });

  it("uses an explicit France-only demo gate", async () => {
    const service = new DemoDeliveryService();
    expect((await service.getAvailability("FR")).enabled).toBe(true);
    expect((await service.getAvailability("BE")).enabled).toBe(false);
  });

  it("keeps private data participant-only and assignment owner-authorized", async () => {
    const service = new DemoDeliveryService();
    const draft = await service.createDraft(requester, draftInput);
    await expect(
      service.publishRequest(outsider, draft.id, "FR"),
    ).rejects.toThrow("DELIVERY_NOT_ELIGIBLE");
    const published = await service.publishRequest(requester, draft.id, "FR");
    const publicPage = await service.search({ marketCode: "FR", limit: 20 });
    const publicValue = publicPage.items.find(
      (item) => item.id === published.id,
    );
    expect(publicValue).not.toHaveProperty("pickup");
    await expect(
      service.getPrivateRequest(outsider, published.id, "FR"),
    ).rejects.toThrow("DELIVERY_NOT_ELIGIBLE");
    await service.saveCourierProfile(courier, "FR", {
      status: "active",
      vehicleTypes: ["bicycle"],
      maxWeightGrams: 20_000,
      serviceLocalities: [
        { city: "Paris", postalCode: "75011" },
        { city: "Boulogne", postalCode: "92100" },
      ],
      opportunityNotifications: true,
    });
    const application = await service.submitApplication(
      courier,
      published.id,
      "FR",
      {
        availabilityNote: "Disponible",
        message: "Je peux livrer ce colis.",
        idempotencyKey: "web-delivery-application-test",
      },
    );
    await expect(
      service.acceptApplication(
        outsider,
        published.id,
        application.id,
        "FR",
        published.version,
      ),
    ).rejects.toThrow("DELIVERY_NOT_ELIGIBLE");
    const assigned = await service.acceptApplication(
      requester,
      published.id,
      application.id,
      "FR",
      published.version,
    );
    expect(assigned.status).toBe("assigned");
    const courierAssignment = await service.getPrivateRequest(
      courier,
      published.id,
      "FR",
    );
    expect(courierAssignment).toMatchObject({
      selectedApplicationId: application.id,
      selectedApplication: { id: application.id },
    });
    expect(courierAssignment).not.toHaveProperty("applications");
    expect(courierAssignment).not.toHaveProperty("sourceOrderId");

    const transitioned = await service.transition(
      courier,
      published.id,
      "FR",
      "picked_up",
      assigned.version,
    );
    expect(transitioned).not.toHaveProperty("applications");
    expect(transitioned).not.toHaveProperty("sourceOrderId");
  });

  it("isolates instances and derives request identifiers from the account and idempotency key", async () => {
    const first = new DemoDeliveryService();
    const second = new DemoDeliveryService();
    const firstDraft = await first.createDraft(requester, draftInput);
    const repeatedDraft = await first.createDraft(requester, draftInput);
    const otherUserDraft = await first.createDraft(outsider, draftInput);

    expect(repeatedDraft.id).toBe(firstDraft.id);
    expect(otherUserDraft.id).not.toBe(firstDraft.id);
    expect(await second.listOwnRequests(requester, "FR")).toEqual([]);
  });

  it("projects open requests into unified discovery only while the market gate is enabled", async () => {
    new DemoDeliveryService();
    const enabled = await new DemoSearchService().search({
      marketCode: "FR",
      query: "petit meuble",
      limit: 100,
    });
    const delivery = enabled.items.find(
      (listing) => listing.attributes.verticalType === "delivery",
    );
    expect(delivery?.attributes.canonicalPath).toBe(
      "/livraison/demande/418711cb-aee0-4fa3-a102-8ec6ea2a2cb8",
    );
    expect(delivery?.attributes).not.toHaveProperty("pickup");
    expect(delivery?.attributes).not.toHaveProperty("dropoff");

    featureFlagState.enabled = false;
    const disabled = await new DemoSearchService().search({
      marketCode: "FR",
      query: "petit meuble",
      limit: 100,
    });
    expect(
      disabled.items.some(
        (listing) => listing.attributes.verticalType === "delivery",
      ),
    ).toBe(false);
  });
});
