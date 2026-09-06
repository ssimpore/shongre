import { describe, expect, it, vi } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import type { DeliveryCourierProfile } from "@shongre/contracts/delivery";
import { DemoDeliveryRepository } from "../../src/infrastructure/database/repositories/delivery.repository.js";
import { DeliveryService } from "../../src/modules/delivery/delivery.service.js";
import type { Principal } from "../../src/shared/auth/principal.js";

const context = resolveMarketContext({
  hostname: "shongre.fr",
  pathname: "/livraison",
  infrastructure: {
    globalDomain: "shongre.com",
    franceDomain: "shongre.fr",
    canonicalProtocol: "https",
  },
});
const swissContext = resolveMarketContext({
  hostname: "shongre.com",
  pathname: "/ch/livraison",
  infrastructure: {
    globalDomain: "shongre.com",
    franceDomain: "shongre.fr",
    canonicalProtocol: "https",
  },
});

const requester: Principal = {
  userId: "requester",
  email: "requester@example.test",
  role: "individual_buyer",
  accountType: "individual",
  status: "active",
  staffStatus: "none",
  capabilities: [
    "delivery.request.manage.own",
    "delivery.read",
    "favorite.manage.own",
  ],
};

const courier: Principal = {
  userId: "courier",
  email: "courier@example.test",
  role: "individual_seller",
  accountType: "individual",
  status: "active",
  staffStatus: "none",
  capabilities: ["delivery.application.manage.own", "delivery.read"],
};

const moderator: Principal = {
  userId: "moderator",
  email: "moderator@example.test",
  role: "moderator",
  accountType: "individual",
  status: "active",
  staffStatus: "active",
  staffRole: "moderator",
  mfaVerified: true,
  capabilities: ["delivery.moderate"],
};

const draftInput = {
  marketCode: "FR",
  origin: "order" as const,
  sourceOrderId: "7d3e760f-4ad7-47e5-8ca5-2a4ea59a3151",
  title: "Livrer la commande locale",
  description: "Transport local du bien physique commandé sur Shongre.",
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
  idempotencyKey: "delivery-service-order-1",
};

function serviceWith(
  repository: DemoDeliveryRepository,
  orderOverrides: Record<string, unknown> = {},
) {
  return new DeliveryService(
    repository,
    { evaluatePublic: vi.fn().mockResolvedValue({ enabled: true }) } as never,
    { resolve: vi.fn().mockReturnValue({}) } as never,
    {
      getOrderById: vi.fn().mockResolvedValue({
        id: draftInput.sourceOrderId,
        buyerId: requester.userId,
        sellerId: "seller",
        status: "escrow_funded",
        fulfillmentModel: "PHYSICAL",
        listing: { marketCode: "FR" },
        ...orderOverrides,
      }),
    } as never,
    { captureAuthoritative: vi.fn().mockResolvedValue(undefined) } as never,
  );
}

describe("delivery service authorization", () => {
  it("keeps favorite state account-and-market scoped", async () => {
    const repository = new DemoDeliveryRepository();
    const service = serviceWith(repository);
    const publicBatch = vi.spyOn(repository, "getPublicRequestsByIds");
    const request = await repository.createDraft(
      "favorite-request-owner",
      "Request owner",
      false,
      { ...draftInput, origin: "standalone", sourceOrderId: undefined },
    );
    await repository.publish(request.id, "favorite-request-owner");

    expect(
      await service.setFavoriteRequest(requester, context, request.id, true),
    ).toBe(true);
    expect(await service.getFavoriteRequestIds(requester, context)).toEqual([
      request.id,
    ]);
    await expect(
      service.getFavoritePublicRequests(requester, context),
    ).resolves.toMatchObject([{ id: request.id, marketCode: "FR" }]);
    expect(publicBatch).toHaveBeenCalledOnce();
    expect(publicBatch).toHaveBeenCalledWith([request.id], "FR");
    expect(
      await repository.getFavoriteRequestIds(requester.userId, "BE"),
    ).toEqual([]);
    await expect(
      service.getFavoriteRequestIds(courier, context),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(
      await service.setFavoriteRequest(requester, context, request.id, false),
    ).toBe(false);
    expect(
      await service.setFavoriteRequest(requester, context, request.id, true),
    ).toBe(true);

    await repository.prepareAccountDeletion(requester.userId);
    expect(await service.getFavoriteRequestIds(requester, context)).toEqual([]);
  });

  it("links only an owned, same-market, eligible physical order", async () => {
    const repository = new DemoDeliveryRepository();
    const service = serviceWith(repository);
    const request = await service.createDraft(requester, context, draftInput);
    expect(request.origin).toBe("order");
    expect(request.sourceOrderId).toBe(draftInput.sourceOrderId);

    await expect(
      serviceWith(new DemoDeliveryRepository(), {
        buyerId: "someone-else",
        sellerId: "another-user",
      }).createDraft(requester, context, {
        ...draftInput,
        idempotencyKey: "delivery-service-order-2",
      }),
    ).rejects.toMatchObject({ code: "DELIVERY_NOT_ELIGIBLE" });
  });

  it("denies applications while courier eligibility is pending", async () => {
    class PendingCourierRepository extends DemoDeliveryRepository {
      override async getCourierProfile(userId: string, marketCode: string) {
        const profile = await super.getCourierProfile(userId, marketCode);
        return profile
          ? ({
              ...profile,
              eligibilityStatus: "pending",
            } satisfies DeliveryCourierProfile)
          : null;
      }
    }
    const repository = new PendingCourierRepository();
    const request = await repository.createDraft(
      requester.userId,
      "Requester",
      false,
      { ...draftInput, origin: "standalone", sourceOrderId: undefined },
    );
    await repository.publish(request.id, requester.userId);
    await repository.saveCourierProfile(courier.userId, "FR", {
      status: "active",
      vehicleTypes: ["van"],
      maxWeightGrams: 30_000,
      serviceLocalities: [{ city: "Paris", postalCode: "75011" }],
      opportunityNotifications: true,
    });

    await expect(
      serviceWith(repository).submitApplication(courier, context, request.id, {
        availabilityNote: "Disponible le matin",
        message: "Je peux transporter ce bien avec mon utilitaire.",
        idempotencyKey: "delivery-service-application-1",
      }),
    ).rejects.toMatchObject({ code: "DELIVERY_NOT_ELIGIBLE" });
  });

  it("rejects cross-market publication, withdrawal and assignment selection", async () => {
    const repository = new DemoDeliveryRepository();
    const service = serviceWith(repository);
    const draft = await repository.createDraft(
      requester.userId,
      "Requester",
      false,
      { ...draftInput, origin: "standalone", sourceOrderId: undefined },
    );

    await expect(
      service.publish(requester, swissContext, draft.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const open = await repository.publish(draft.id, requester.userId);
    const profile = await repository.saveCourierProfile(courier.userId, "FR", {
      status: "active",
      vehicleTypes: ["van"],
      maxWeightGrams: 30_000,
      serviceLocalities: [
        { city: "Paris", postalCode: "75011" },
        { city: "Boulogne", postalCode: "92100" },
      ],
      opportunityNotifications: true,
    });
    const application = await repository.submitApplication(
      open,
      courier.userId,
      "Courier",
      false,
      profile,
      {
        availabilityNote: "Disponible le matin",
        message: "Je peux transporter ce bien avec mon utilitaire.",
        idempotencyKey: "delivery-service-cross-market-application",
      },
    );

    await expect(
      service.withdrawApplication(courier, swissContext, application.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.acceptApplication(
        requester,
        swissContext,
        open.id,
        application.id,
        { expectedVersion: open.version },
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("shows a selected courier only their private assignment projection", async () => {
    const repository = new DemoDeliveryRepository();
    const service = serviceWith(repository);
    const draft = await repository.createDraft(
      requester.userId,
      "Requester",
      false,
      draftInput,
    );
    const open = await repository.publish(draft.id, requester.userId);
    const profile = await repository.saveCourierProfile(courier.userId, "FR", {
      status: "active",
      vehicleTypes: ["van"],
      maxWeightGrams: 30_000,
      serviceLocalities: [
        { city: "Paris", postalCode: "75011" },
        { city: "Boulogne", postalCode: "92100" },
      ],
      opportunityNotifications: true,
    });
    const application = await repository.submitApplication(
      open,
      courier.userId,
      "Courier",
      false,
      profile,
      {
        availabilityNote: "Disponible le matin",
        message: "Je peux transporter ce bien avec mon utilitaire.",
        idempotencyKey: "delivery-service-private-projection",
      },
    );
    const assigned = await service.acceptApplication(
      requester,
      context,
      open.id,
      application.id,
      { expectedVersion: open.version },
    );

    const courierView = await service.getPrivateRequest(
      courier,
      context,
      open.id,
    );
    expect(courierView).toMatchObject({
      selectedApplicationId: application.id,
      selectedApplication: { id: application.id },
    });
    expect(courierView).not.toHaveProperty("applications");
    expect(courierView).not.toHaveProperty("sourceOrderId");

    const transitioned = await service.transition(courier, context, open.id, {
      status: "picked_up",
      expectedVersion: assigned.version,
    });
    expect(transitioned).not.toHaveProperty("applications");
    expect(transitioned).not.toHaveProperty("sourceOrderId");
  });

  it("lets only market-scoped moderation suspend unsafe requests", async () => {
    const repository = new DemoDeliveryRepository();
    const service = serviceWith(repository);
    const draft = await repository.createDraft(
      requester.userId,
      "Requester",
      false,
      { ...draftInput, origin: "standalone", sourceOrderId: undefined },
    );
    const open = await repository.publish(draft.id, requester.userId);

    await expect(
      service.suspendUnsafe(requester, context, open.id, {
        expectedVersion: open.version,
        reason: "Contenu dangereux signalé pour examen.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      service.suspendUnsafe(moderator, swissContext, open.id, {
        expectedVersion: open.version,
        reason: "Contenu dangereux signalé pour examen.",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      service.suspendUnsafe(moderator, context, open.id, {
        expectedVersion: open.version,
        reason: "Contenu dangereux signalé pour examen.",
      }),
    ).resolves.toMatchObject({
      status: "suspended",
      version: open.version + 1,
    });
    await expect(
      repository.searchPublic({ marketCode: "FR", limit: 20 }),
    ).resolves.toMatchObject({ items: [] });
  });
});
