import { describe, expect, it } from "vitest";
import { DemoDeliveryRepository } from "../../src/infrastructure/database/repositories/delivery.repository.js";

const requestInput = {
  marketCode: "FR",
  origin: "standalone" as const,
  title: "Transporter un petit meuble",
  description: "Une commode protégée doit être transportée avec soin.",
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
    type: "Petit meuble",
    count: 1,
    approximateWeightGrams: 18_000,
    handlingRequirements: ["Fragile"],
    requiredVehicleType: "van" as const,
    loadingAssistanceRequired: true,
  },
  expiresAt: "2027-01-14T20:00:00.000Z",
  idempotencyKey: "delivery-test-request-1",
};

const courierProfile = {
  status: "active" as const,
  vehicleTypes: ["van" as const],
  maxWeightGrams: 40_000,
  serviceLocalities: [{ city: "Paris", postalCode: "75011" }],
  opportunityNotifications: true,
};

describe("delivery marketplace repository boundary", () => {
  it("keeps private stops out of the public projection and partitions by market", async () => {
    const repository = new DemoDeliveryRepository();
    const draft = await repository.createDraft(
      "requester",
      "Camille",
      true,
      requestInput,
    );
    const published = await repository.publish(draft.id, "requester");
    expect(published.version).toBe(2);
    const page = await repository.searchPublic({ marketCode: "FR", limit: 20 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).not.toHaveProperty("pickup");
    expect(page.items[0]).not.toHaveProperty("dropoff");
    expect(page.items[0]).not.toHaveProperty("sourceOrderId");
    expect(
      await repository.searchPublic({ marketCode: "BE", limit: 20 }),
    ).toMatchObject({ items: [] });
  });

  it("enforces ownership, eligibility, duplicate applications and one atomic winner", async () => {
    const repository = new DemoDeliveryRepository();
    const draft = await repository.createDraft(
      "requester",
      "Camille",
      true,
      requestInput,
    );
    await expect(repository.publish(draft.id, "other-user")).rejects.toThrow(
      "DELIVERY_NOT_ELIGIBLE",
    );
    const request = await repository.publish(draft.id, "requester");
    await expect(repository.publish(draft.id, "requester")).resolves.toEqual(
      request,
    );
    const firstProfile = await repository.saveCourierProfile(
      "courier-1",
      "FR",
      courierProfile,
    );
    const secondProfile = await repository.saveCourierProfile(
      "courier-2",
      "FR",
      courierProfile,
    );
    const applicationInput = {
      availabilityNote: "Disponible le matin",
      message: "Je peux prendre en charge la livraison.",
      idempotencyKey: "delivery-application-1",
    };
    const first = await repository.submitApplication(
      request,
      "courier-1",
      "Sam",
      true,
      firstProfile,
      applicationInput,
    );
    const second = await repository.submitApplication(
      request,
      "courier-2",
      "Lou",
      true,
      secondProfile,
      { ...applicationInput, idempotencyKey: "delivery-application-2" },
    );
    await expect(
      repository.submitApplication(
        request,
        "courier-1",
        "Sam",
        true,
        firstProfile,
        applicationInput,
      ),
    ).rejects.toThrow("DELIVERY_APPLICATION_EXISTS");
    const assigned = await repository.acceptApplication(
      request.id,
      first.id,
      "requester",
      request.version,
    );
    expect(assigned.status).toBe("assigned");
    expect(
      assigned.applications.find((item) => item.id === first.id)?.status,
    ).toBe("accepted");
    expect(
      assigned.applications.find((item) => item.id === second.id)?.status,
    ).toBe("rejected");
    await expect(
      repository.acceptApplication(
        request.id,
        second.id,
        "requester",
        request.version,
      ),
    ).rejects.toThrow("DELIVERY_REQUEST_NOT_OPEN");
  });

  it("deduplicates matching notifications by request, courier and version", async () => {
    const repository = new DemoDeliveryRepository();
    expect(
      await repository.reserveMatchNotification("request", "profile", 2),
    ).toBe(true);
    expect(
      await repository.reserveMatchNotification("request", "profile", 2),
    ).toBe(false);
    expect(
      await repository.reserveMatchNotification("request", "profile", 3),
    ).toBe(true);
  });

  it("blocks account deletion during active work and redacts precise terminal stops", async () => {
    const repository = new DemoDeliveryRepository();
    const draft = await repository.createDraft("requester", "Camille", true, {
      ...requestInput,
      idempotencyKey: "delivery-account-deletion",
    });
    await expect(
      repository.prepareAccountDeletion("requester"),
    ).rejects.toThrow("DELIVERY_ACTIVE_ASSIGNMENT");
    const cancelled = await repository.transition(
      draft.id,
      "requester",
      draft.version,
      "cancelled",
    );
    expect(cancelled.status).toBe("cancelled");

    await repository.prepareAccountDeletion("requester");
    await expect(repository.getRequest(draft.id)).resolves.toMatchObject({
      requester: { displayName: "Membre supprimé", verified: false },
      pickup: { street: "Adresse supprimée", contactPhone: "Supprimé" },
      dropoff: { street: "Adresse supprimée", contactPhone: "Supprimé" },
    });
  });

  it("allows only one active request for a linked physical order", async () => {
    const repository = new DemoDeliveryRepository();
    const linked = {
      ...requestInput,
      origin: "order" as const,
      sourceOrderId: "7d3e760f-4ad7-47e5-8ca5-2a4ea59a3151",
      idempotencyKey: "delivery-order-request-1",
    };
    await repository.createDraft("requester", "Camille", true, linked);
    await expect(
      repository.createDraft("requester", "Camille", true, {
        ...linked,
        idempotencyKey: "delivery-order-request-2",
      }),
    ).rejects.toThrow("DELIVERY_APPLICATION_CONFLICT");
  });

  it("separates requester and selected-courier lifecycle authority", async () => {
    const repository = new DemoDeliveryRepository();
    const draft = await repository.createDraft("requester", "Camille", true, {
      ...requestInput,
      idempotencyKey: "delivery-transition-request",
    });
    const request = await repository.publish(draft.id, "requester");
    const profile = await repository.saveCourierProfile(
      "courier",
      "FR",
      courierProfile,
    );
    const application = await repository.submitApplication(
      request,
      "courier",
      "Sam",
      true,
      profile,
      {
        availabilityNote: "Disponible le matin",
        message: "Je peux prendre en charge la livraison.",
        idempotencyKey: "delivery-transition-application",
      },
    );
    const assigned = await repository.acceptApplication(
      request.id,
      application.id,
      "requester",
      request.version,
    );
    await expect(
      repository.transition(
        request.id,
        "requester",
        assigned.version,
        "picked_up",
      ),
    ).rejects.toThrow("DELIVERY_APPLICATION_CONFLICT");
    const pickedUp = await repository.transition(
      request.id,
      "courier",
      assigned.version,
      "picked_up",
    );
    await expect(
      repository.transition(
        request.id,
        "requester",
        pickedUp.version,
        "in_transit",
      ),
    ).rejects.toThrow("DELIVERY_APPLICATION_CONFLICT");
  });
});
