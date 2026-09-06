import {
  DELIVERY_FEATURE_FLAG_KEY,
  canTransitionDeliveryRequestForParticipant,
  type DeliveryApplication,
  type DeliveryCourierProfile,
  type DeliveryPrivateRequest,
  type DeliverySelectedCourierAssignment,
} from "@shongre/contracts/delivery";
import type {
  DeliveryActor,
  DeliveryServiceContract,
} from "../../contracts/delivery.contract";
import { deterministicUuid } from "@shongre/shared/deterministic-id";
import { demoFeatureFlagService } from "./demo-feature-flag.service";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { demoVerticalDiscoveryStore } from "../../../domains/discovery/demo-vertical-discovery.store";
import { requireDemoCapability } from "./demo-authorization";
import {
  DemoDeliveryFavoritesStore,
  demoDeliveryFavoritesStore,
} from "./demo-delivery-favorites.store";

const REQUEST_ID = "418711cb-aee0-4fa3-a102-8ec6ea2a2cb8";
const REQUESTER_ID = "user_thomas";
const SEEDED_REQUESTS = new Map<string, DeliveryPrivateRequest>([
  [
    REQUEST_ID,
    {
      id: REQUEST_ID,
      slug: "petit-meuble-paris-boulogne",
      marketCode: "FR",
      origin: "standalone",
      status: "open",
      title: "Livrer un petit meuble",
      description:
        "Je cherche un coursier pour transporter une commode protégée.",
      pickupLocality: { city: "Paris", postalCode: "75011" },
      dropoffLocality: { city: "Boulogne-Billancourt", postalCode: "92100" },
      pickup: {
        street: "12 rue Oberkampf",
        city: "Paris",
        postalCode: "75011",
        contactName: "Camille",
        contactPhone: "+33600000000",
      },
      dropoff: {
        street: "8 avenue Victor-Hugo",
        city: "Boulogne-Billancourt",
        postalCode: "92100",
        contactName: "Alex",
        contactPhone: "+33600000001",
      },
      pickupWindow: {
        startsAt: "2027-01-15T09:00:00.000Z",
        endsAt: "2027-01-15T11:00:00.000Z",
      },
      deliveryWindow: {
        startsAt: "2027-01-15T11:00:00.000Z",
        endsAt: "2027-01-15T15:00:00.000Z",
      },
      package: {
        type: "Petit meuble",
        count: 1,
        approximateWeightGrams: 18000,
        handlingRequirements: ["Fragile"],
        requiredVehicleType: "van",
        loadingAssistanceRequired: true,
      },
      budget: { amountMinor: 4500, currency: "EUR" },
      publicInstructions: "Le meuble est protégé et prêt à partir.",
      requester: { displayName: "Camille", verified: true },
      applicationCount: 0,
      applications: [],
      expiresAt: "2027-01-14T20:00:00.000Z",
      publishedAt: "2026-09-05T10:00:00.000Z",
      version: 1,
    },
  ],
]);
const clone = <T>(value: T): T => structuredClone(value);
const key = (userId: string, marketCode: string) => `${userId}:${marketCode}`;
const publicRequest = (request: DeliveryPrivateRequest) => {
  const {
    sourceOrderId: _sourceOrderId,
    pickup: _pickup,
    dropoff: _dropoff,
    applications: _applications,
    selectedApplicationId: _selected,
    ...value
  } = request;
  return value;
};

const selectedCourierAssignment = (
  request: DeliveryPrivateRequest,
  selectedApplication: DeliveryApplication,
): DeliverySelectedCourierAssignment => ({
  ...publicRequest(request),
  pickup: request.pickup,
  dropoff: request.dropoff,
  selectedApplicationId: selectedApplication.id,
  selectedApplication,
});

export class DemoDeliveryService implements DeliveryServiceContract {
  private readonly requests = clone(SEEDED_REQUESTS);
  private readonly owners = new Map([[REQUEST_ID, REQUESTER_ID]]);
  private readonly profiles = new Map<string, DeliveryCourierProfile>();
  private readonly applicationOwners = new Map<string, string>();

  constructor(private readonly favorites = new DemoDeliveryFavoritesStore()) {
    this.requests.forEach((request) =>
      demoVerticalDiscoveryStore.syncDeliveryRequest(publicRequest(request)),
    );
  }

  async getAvailability(marketCode: string) {
    await simulateNetworkDelay();
    const flag = await demoFeatureFlagService.evaluate(
      DELIVERY_FEATURE_FLAG_KEY,
      { marketCode },
    );
    const enabled = marketCode === "FR" && flag.enabled;
    return {
      marketCode,
      enabled,
      readOnlyAssigned: !enabled,
      reasons: enabled ? [] : ["feature_flag_disabled" as const],
    };
  }
  async search(input: Parameters<DeliveryServiceContract["search"]>[0]) {
    await simulateNetworkDelay();
    const availability = await this.getAvailability(input.marketCode);
    return {
      items: availability.enabled
        ? [...this.requests.values()]
            .filter(
              (request) =>
                request.marketCode === input.marketCode &&
                request.status === "open" &&
                (!input.pickupPostalCode ||
                  request.pickupLocality.postalCode ===
                    input.pickupPostalCode) &&
                (!input.vehicleType ||
                  request.package.requiredVehicleType === input.vehicleType),
            )
            .slice(0, input.limit)
            .map(publicRequest)
        : [],
    };
  }
  async getPublicRequest(requestId: string, marketCode: string) {
    await simulateNetworkDelay();
    const request = this.requests.get(requestId);
    if (
      !request ||
      request.marketCode !== marketCode ||
      request.status !== "open"
    )
      throw new Error("DELIVERY_REQUEST_NOT_OPEN");
    return clone(publicRequest(request));
  }
  async getFavoriteRequestIds(accountId: string, marketCode: string) {
    await simulateNetworkDelay();
    requireDemoCapability("favorite.manage.own");
    return this.favorites.list(accountId, marketCode);
  }
  async setFavoriteRequest(
    accountId: string,
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ) {
    await simulateNetworkDelay();
    requireDemoCapability("favorite.manage.own");
    if (isFavorite) {
      const request = this.requests.get(requestId);
      if (
        !request ||
        request.marketCode !== marketCode ||
        request.status !== "open" ||
        !request.publishedAt ||
        request.expiresAt <= "2026-09-05T12:00:00.000Z"
      ) {
        throw new Error("DELIVERY_REQUEST_NOT_OPEN");
      }
    }
    return this.favorites.set(accountId, requestId, marketCode, isFavorite);
  }
  async getCourierProfile(actor: DeliveryActor, marketCode: string) {
    await simulateNetworkDelay();
    return clone(this.profiles.get(key(actor.userId, marketCode)) ?? null);
  }
  async saveCourierProfile(
    actor: DeliveryActor,
    marketCode: string,
    input: Parameters<DeliveryServiceContract["saveCourierProfile"]>[2],
  ) {
    await simulateNetworkDelay();
    const value: DeliveryCourierProfile = {
      ...input,
      id:
        this.profiles.get(key(actor.userId, marketCode))?.id ??
        deterministicUuid("delivery-courier", key(actor.userId, marketCode)),
      marketCode,
      eligibilityStatus: "eligible",
      updatedAt: "2026-09-05T12:00:00.000Z",
    };
    this.profiles.set(key(actor.userId, marketCode), value);
    return clone(value);
  }
  async createDraft(
    actor: DeliveryActor,
    input: Parameters<DeliveryServiceContract["createDraft"]>[1],
  ) {
    await simulateNetworkDelay();
    const id = deterministicUuid(
      "delivery-request",
      `${actor.userId}:${input.marketCode}:${input.idempotencyKey}`,
    );
    const value: DeliveryPrivateRequest = {
      id,
      slug: `demande-${id.slice(0, 8)}`,
      marketCode: input.marketCode,
      origin: input.origin,
      sourceOrderId: input.sourceOrderId,
      status: "draft",
      title: input.title,
      description: input.description,
      pickupLocality: {
        city: input.pickup.city,
        postalCode: input.pickup.postalCode,
      },
      dropoffLocality: {
        city: input.dropoff.city,
        postalCode: input.dropoff.postalCode,
      },
      pickup: input.pickup,
      dropoff: input.dropoff,
      pickupWindow: input.pickupWindow,
      deliveryWindow: input.deliveryWindow,
      package: input.package,
      budget: input.budget,
      publicInstructions: input.publicInstructions,
      requester: { displayName: actor.displayName, verified: actor.verified },
      applicationCount: 0,
      applications: [],
      expiresAt: input.expiresAt,
      version: 1,
    };
    this.requests.set(id, value);
    this.owners.set(id, actor.userId);
    return clone(value);
  }
  async publishRequest(
    actor: DeliveryActor,
    requestId: string,
    marketCode: string,
  ) {
    await simulateNetworkDelay();
    const request = this.requireRequest(requestId, marketCode);
    if (this.owners.get(requestId) !== actor.userId)
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    request.status = "open";
    request.publishedAt = "2026-09-05T12:00:00.000Z";
    request.version += 1;
    demoVerticalDiscoveryStore.syncDeliveryRequest(publicRequest(request));
    return clone(request);
  }
  async listOwnRequests(actor: DeliveryActor, marketCode: string) {
    await simulateNetworkDelay();
    return clone(
      [...this.requests.values()].filter(
        (request) =>
          request.marketCode === marketCode &&
          this.owners.get(request.id) === actor.userId,
      ),
    );
  }
  async getPrivateRequest(
    actor: DeliveryActor,
    requestId: string,
    marketCode: string,
  ) {
    await simulateNetworkDelay();
    const request = this.requireRequest(requestId, marketCode);
    const selected = request.applications.find(
      (application) => application.id === request.selectedApplicationId,
    );
    if (this.owners.get(requestId) === actor.userId) return clone(request);
    if (!selected || this.applicationOwners.get(selected.id) !== actor.userId) {
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    }
    return clone(selectedCourierAssignment(request, selected));
  }
  async submitApplication(
    actor: DeliveryActor,
    requestId: string,
    marketCode: string,
    input: Parameters<DeliveryServiceContract["submitApplication"]>[3],
  ) {
    await simulateNetworkDelay();
    const request = this.requireRequest(requestId, marketCode);
    const profile = this.profiles.get(key(actor.userId, marketCode));
    if (
      !profile ||
      profile.status !== "active" ||
      profile.eligibilityStatus !== "eligible" ||
      profile.maxWeightGrams < request.package.approximateWeightGrams ||
      !profile.serviceLocalities.some(
        (locality) => locality.postalCode === request.pickupLocality.postalCode,
      ) ||
      !profile.serviceLocalities.some(
        (locality) =>
          locality.postalCode === request.dropoffLocality.postalCode,
      ) ||
      (request.package.requiredVehicleType &&
        !profile.vehicleTypes.includes(request.package.requiredVehicleType))
    )
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    if (this.owners.get(requestId) === actor.userId)
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    if (
      request.applications.some(
        (entry) =>
          this.applicationOwners.get(entry.id) === actor.userId &&
          entry.status === "submitted",
      )
    )
      throw new Error("DELIVERY_APPLICATION_EXISTS");
    const application: DeliveryApplication = {
      id: deterministicUuid(
        "delivery-application",
        `${actor.userId}:${requestId}:${input.idempotencyKey}`,
      ),
      requestId,
      status: "submitted",
      courier: {
        displayName: actor.displayName,
        verified: actor.verified,
        vehicleTypes: profile.vehicleTypes,
      },
      availabilityNote: input.availabilityNote,
      message: input.message,
      quote: input.quote,
      createdAt: "2026-09-05T12:00:00.000Z",
      updatedAt: "2026-09-05T12:00:00.000Z",
    };
    request.applications.push(application);
    request.applicationCount = request.applications.length;
    this.applicationOwners.set(application.id, actor.userId);
    demoVerticalDiscoveryStore.syncDeliveryRequest(publicRequest(request));
    return clone(application);
  }
  async listOwnApplications(actor: DeliveryActor, marketCode: string) {
    await simulateNetworkDelay();
    return clone(
      [...this.requests.values()]
        .filter((request) => request.marketCode === marketCode)
        .flatMap((request) => request.applications)
        .filter(
          (application) =>
            this.applicationOwners.get(application.id) === actor.userId,
        ),
    );
  }
  async withdrawApplication(actor: DeliveryActor, applicationId: string) {
    await simulateNetworkDelay();
    const app = this.findApplication(applicationId);
    if (this.applicationOwners.get(applicationId) !== actor.userId)
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    if (app.status !== "submitted")
      throw new Error("DELIVERY_APPLICATION_CONFLICT");
    app.status = "withdrawn";
    return clone(app);
  }
  async acceptApplication(
    actor: DeliveryActor,
    requestId: string,
    applicationId: string,
    marketCode: string,
    expectedVersion: number,
  ) {
    await simulateNetworkDelay();
    const request = this.requireRequest(requestId, marketCode);
    if (this.owners.get(requestId) !== actor.userId)
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    if (request.version !== expectedVersion || request.status !== "open")
      throw new Error("DELIVERY_ASSIGNMENT_CONFLICT");
    const app = this.findApplication(applicationId);
    request.applications.forEach((entry) => {
      if (entry.status === "submitted")
        entry.status = entry.id === applicationId ? "accepted" : "rejected";
    });
    request.status = "assigned";
    request.selectedApplicationId = app.id;
    request.version += 1;
    demoVerticalDiscoveryStore.syncDeliveryRequest(publicRequest(request));
    return clone(request);
  }
  async transition(
    actor: DeliveryActor,
    requestId: string,
    marketCode: string,
    status: Parameters<DeliveryServiceContract["transition"]>[3],
    expectedVersion: number,
  ) {
    await simulateNetworkDelay();
    const request = this.requireRequest(requestId, marketCode);
    const selected = request.applications.find(
      (application) => application.id === request.selectedApplicationId,
    );
    if (
      this.owners.get(requestId) !== actor.userId &&
      (!selected || this.applicationOwners.get(selected.id) !== actor.userId)
    ) {
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    }
    if (request.version !== expectedVersion)
      throw new Error("DELIVERY_ASSIGNMENT_CONFLICT");
    const participant =
      this.owners.get(requestId) === actor.userId ? "requester" : "courier";
    if (
      !canTransitionDeliveryRequestForParticipant(
        participant,
        request.status,
        status,
      )
    )
      throw new Error("DELIVERY_APPLICATION_CONFLICT");
    request.status = status;
    request.version += 1;
    demoVerticalDiscoveryStore.syncDeliveryRequest(publicRequest(request));
    if (participant === "requester") return clone(request);
    if (!selected) throw new Error("DELIVERY_ASSIGNMENT_CONFLICT");
    return clone(selectedCourierAssignment(request, selected));
  }
  async suspendUnsafe(
    _actor: DeliveryActor,
    requestId: string,
    marketCode: string,
    reason: string,
    expectedVersion?: number,
  ) {
    await simulateNetworkDelay();
    requireDemoCapability("delivery.moderate");
    if (reason.trim().length < 10) throw new Error("VALIDATION_ERROR");
    const request = this.requireRequest(requestId, marketCode);
    if (expectedVersion !== undefined && request.version !== expectedVersion)
      throw new Error("DELIVERY_ASSIGNMENT_CONFLICT");
    if (["completed", "cancelled", "expired"].includes(request.status))
      throw new Error("DELIVERY_APPLICATION_CONFLICT");
    request.status = "suspended";
    request.version += 1;
    demoVerticalDiscoveryStore.syncDeliveryRequest(publicRequest(request));
    return clone(publicRequest(request));
  }
  private requireRequest(id: string, marketCode: string) {
    const value = this.requests.get(id);
    if (!value || value.marketCode !== marketCode)
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    return value;
  }
  private findApplication(id: string) {
    for (const request of this.requests.values()) {
      const value = request.applications.find((entry) => entry.id === id);
      if (value) return value;
    }
    throw new Error("DELIVERY_NOT_ELIGIBLE");
  }
}

export const demoDeliveryService = new DemoDeliveryService(
  demoDeliveryFavoritesStore,
);
