import { describe, expect, it, vi } from "vitest";
import { DemoDeliveryRepository } from "../../src/infrastructure/database/repositories/delivery.repository.js";
import {
  DeliveryOutboxWorker,
  type DeliveryOutboxEvent,
  type DeliveryOutboxStore,
} from "../../src/workers/delivery/delivery-outbox-worker.js";

const input = {
  marketCode: "FR",
  origin: "standalone" as const,
  title: "Livrer un petit meuble",
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
  idempotencyKey: "delivery-worker-request-1",
};

class MemoryOutbox implements DeliveryOutboxStore {
  readonly completions: Array<{ success: boolean; errorCode?: string }> = [];
  constructor(private events: DeliveryOutboxEvent[]) {}
  async claim() {
    const events = this.events;
    this.events = [];
    return events;
  }
  async complete(
    _eventId: string,
    _workerId: string,
    success: boolean,
    errorCode?: string,
  ) {
    this.completions.push({ success, errorCode });
  }
}

async function setup() {
  const repository = new DemoDeliveryRepository();
  const draft = await repository.createDraft(
    "requester",
    "Camille",
    false,
    input,
  );
  const request = await repository.publish(draft.id, "requester");
  await repository.saveCourierProfile("courier", "FR", {
    status: "active",
    vehicleTypes: ["van"],
    maxWeightGrams: 30_000,
    serviceLocalities: [
      { city: "Paris", postalCode: "75011" },
      { city: "Boulogne", postalCode: "92100" },
    ],
    opportunityNotifications: true,
  });
  return { repository, request };
}

describe("delivery outbox worker", () => {
  it("matches asynchronously and creates one deterministic notification", async () => {
    const { repository, request } = await setup();
    const store = new MemoryOutbox([
      {
        id: "event-1",
        request_id: request.id,
        market_code: "FR",
        event_type: "delivery.request.opened",
        payload: { requestId: request.id },
        attempts: 1,
      },
    ]);
    const dispatchNotification = vi.fn().mockResolvedValue({});
    const captureAuthoritative = vi.fn().mockResolvedValue(undefined);
    const worker = new DeliveryOutboxWorker(
      store,
      repository,
      { dispatchNotification } as never,
      { evaluatePublic: vi.fn().mockResolvedValue({ enabled: true }) } as never,
      { captureAuthoritative } as never,
      "delivery-worker-test",
      () => true,
    );

    await expect(worker.run()).resolves.toEqual({
      claimed: 1,
      completed: 1,
      retried: 0,
    });
    expect(dispatchNotification).toHaveBeenCalledOnce();
    expect(dispatchNotification.mock.calls[0][6]).toBe("FR");
    expect(dispatchNotification.mock.calls[0][8]).toMatch(/^[0-9a-f-]{36}$/);
    expect(store.completions).toEqual([
      { success: true, errorCode: undefined },
    ]);
  });

  it("retries without rolling back the published request", async () => {
    const { repository, request } = await setup();
    const store = new MemoryOutbox([
      {
        id: "event-2",
        request_id: request.id,
        market_code: "FR",
        event_type: "delivery.request.opened",
        payload: { requestId: request.id },
        attempts: 1,
      },
    ]);
    const worker = new DeliveryOutboxWorker(
      store,
      repository,
      {
        dispatchNotification: vi
          .fn()
          .mockRejectedValue(new Error("NOTIFICATION_TEMPORARY_FAILURE")),
      } as never,
      { evaluatePublic: vi.fn().mockResolvedValue({ enabled: true }) } as never,
      { captureAuthoritative: vi.fn().mockResolvedValue(undefined) } as never,
      "delivery-worker-test",
      () => true,
    );

    await expect(worker.run()).resolves.toMatchObject({ retried: 1 });
    expect((await repository.getRequest(request.id))?.status).toBe("open");
    expect(store.completions[0]).toEqual({
      success: false,
      errorCode: "NOTIFICATION_TEMPORARY_FAILURE",
    });
  });
});
