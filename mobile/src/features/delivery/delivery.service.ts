import type {
  DeliveryApplication,
  DeliveryApplicationInput,
  DeliveryCourierProfile,
  DeliveryCourierProfileInput,
  DeliveryFeatureAvailability,
  DeliveryPrivateRequest,
  DeliveryPublicRequest,
  DeliveryRequestDraftInput,
  DeliveryRequestStatus,
  DeliverySearchInput,
  DeliverySelectedCourierAssignment,
} from "@shongre/contracts/delivery";
import { canTransitionDeliveryRequestForParticipant } from "@shongre/contracts/delivery";
import { deterministicUuid } from "@shongre/shared/deterministic-id";
import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";

export interface MobileDeliveryActor {
  userId: string;
  displayName: string;
  verified: boolean;
}

export interface MobileDeliveryService {
  availability(marketCode: string): Promise<DeliveryFeatureAvailability>;
  search(input: DeliverySearchInput): Promise<DeliveryPublicRequest[]>;
  getPublicRequest(
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPublicRequest>;
  getFavoriteRequestIds(userId: string, marketCode: string): Promise<string[]>;
  setFavoriteRequest(
    userId: string,
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean>;
  getCourierProfile(
    actor: MobileDeliveryActor,
    marketCode: string,
  ): Promise<DeliveryCourierProfile | null>;
  saveCourierProfile(
    actor: MobileDeliveryActor,
    marketCode: string,
    input: DeliveryCourierProfileInput,
  ): Promise<DeliveryCourierProfile>;
  createAndPublish(
    actor: MobileDeliveryActor,
    input: DeliveryRequestDraftInput,
  ): Promise<DeliveryPrivateRequest>;
  listOwnRequests(
    actor: MobileDeliveryActor,
    marketCode: string,
  ): Promise<DeliveryPrivateRequest[]>;
  listOwnApplications(
    actor: MobileDeliveryActor,
    marketCode: string,
  ): Promise<DeliveryApplication[]>;
  getPrivateRequest(
    actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPrivateRequest | DeliverySelectedCourierAssignment>;
  submitApplication(
    actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
    input: DeliveryApplicationInput,
  ): Promise<DeliveryApplication>;
  acceptApplication(
    actor: MobileDeliveryActor,
    requestId: string,
    applicationId: string,
    marketCode: string,
    expectedVersion: number,
  ): Promise<DeliveryPrivateRequest>;
  transition(
    actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
    status: DeliveryRequestStatus,
    expectedVersion: number,
  ): Promise<DeliveryPrivateRequest | DeliverySelectedCourierAssignment>;
}

const DEMO_REQUEST_ID = "418711cb-aee0-4fa3-a102-8ec6ea2a2cb8";
const DEMO_REQUESTER_ID = "user_thomas";
const DEMO_NOW = "2026-09-05T12:00:00.000Z";

const demoRequest: DeliveryPrivateRequest = {
  id: DEMO_REQUEST_ID,
  slug: "petit-meuble-paris-boulogne",
  marketCode: "FR",
  origin: "standalone",
  status: "open",
  title: "Livrer un petit meuble",
  description: "Une commode protégée à transporter avec soin.",
  pickupLocality: { city: "Paris", postalCode: "75011" },
  dropoffLocality: { city: "Boulogne-Billancourt", postalCode: "92100" },
  pickup: {
    street: "Adresse privée",
    city: "Paris",
    postalCode: "75011",
    contactName: "Camille",
    contactPhone: "Privé",
  },
  dropoff: {
    street: "Adresse privée",
    city: "Boulogne-Billancourt",
    postalCode: "92100",
    contactName: "Alex",
    contactPhone: "Privé",
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
    approximateWeightGrams: 18_000,
    handlingRequirements: ["Fragile"],
    requiredVehicleType: "van",
    loadingAssistanceRequired: true,
  },
  budget: { amountMinor: 4_500, currency: "EUR" },
  requester: { displayName: "Camille", verified: true },
  applicationCount: 0,
  applications: [],
  expiresAt: "2027-01-14T20:00:00.000Z",
  publishedAt: DEMO_NOW,
  version: 1,
};

const publicRequest = (
  request: DeliveryPrivateRequest,
): DeliveryPublicRequest => {
  const {
    sourceOrderId: _sourceOrderId,
    pickup: _pickup,
    dropoff: _dropoff,
    applications: _applications,
    selectedApplicationId: _selectedApplicationId,
    ...projection
  } = request;
  return projection;
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

export class DemoMobileDeliveryService implements MobileDeliveryService {
  private readonly requests = new Map([
    [DEMO_REQUEST_ID, structuredClone(demoRequest)],
  ]);
  private readonly owners = new Map([[DEMO_REQUEST_ID, DEMO_REQUESTER_ID]]);
  private readonly profiles = new Map<string, DeliveryCourierProfile>();
  private readonly applicationOwners = new Map<string, string>();
  private readonly favoriteRequestIds = new Map<string, Set<string>>();

  async availability(marketCode: string) {
    const enabled = marketCode === "FR";
    return {
      marketCode,
      enabled,
      readOnlyAssigned: !enabled,
      reasons: enabled ? [] : ["feature_flag_disabled" as const],
    };
  }

  async search(input: DeliverySearchInput) {
    if (!(await this.availability(input.marketCode)).enabled) return [];
    return [...this.requests.values()]
      .filter(
        (request) =>
          request.marketCode === input.marketCode &&
          request.status === "open" &&
          (!input.pickupPostalCode ||
            request.pickupLocality.postalCode === input.pickupPostalCode) &&
          (!input.vehicleType ||
            request.package.requiredVehicleType === input.vehicleType),
      )
      .slice(0, input.limit)
      .map((request) => structuredClone(publicRequest(request)));
  }

  async getPublicRequest(requestId: string, marketCode: string) {
    const request = this.requests.get(requestId);
    if (
      !request ||
      request.marketCode !== marketCode ||
      request.status !== "open" ||
      !request.publishedAt ||
      request.expiresAt <= DEMO_NOW
    ) {
      throw new Error("DELIVERY_REQUEST_NOT_OPEN");
    }
    return structuredClone(publicRequest(request));
  }

  async getFavoriteRequestIds(userId: string, marketCode: string) {
    return [
      ...(this.favoriteRequestIds.get(
        `${userId}:${marketCode.toUpperCase()}`,
      ) ?? []),
    ];
  }

  async setFavoriteRequest(
    userId: string,
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ) {
    const scopeKey = `${userId}:${marketCode.toUpperCase()}`;
    const requestIds =
      this.favoriteRequestIds.get(scopeKey) ?? new Set<string>();
    if (isFavorite) {
      await this.getPublicRequest(requestId, marketCode);
      requestIds.add(requestId);
    } else {
      requestIds.delete(requestId);
    }
    this.favoriteRequestIds.set(scopeKey, requestIds);
    return requestIds.has(requestId);
  }

  async getCourierProfile(actor: MobileDeliveryActor, marketCode: string) {
    return structuredClone(
      this.profiles.get(`${actor.userId}:${marketCode}`) ?? null,
    );
  }

  async saveCourierProfile(
    actor: MobileDeliveryActor,
    marketCode: string,
    input: DeliveryCourierProfileInput,
  ) {
    const key = `${actor.userId}:${marketCode}`;
    const profile: DeliveryCourierProfile = {
      ...input,
      id:
        this.profiles.get(key)?.id ??
        deterministicUuid("delivery-courier", key),
      marketCode,
      eligibilityStatus: "eligible",
      updatedAt: DEMO_NOW,
    };
    this.profiles.set(key, profile);
    return structuredClone(profile);
  }

  async createAndPublish(
    actor: MobileDeliveryActor,
    input: DeliveryRequestDraftInput,
  ) {
    const id = deterministicUuid(
      "delivery-request",
      `${actor.userId}:${input.marketCode}:${input.idempotencyKey}`,
    );
    const request: DeliveryPrivateRequest = {
      id,
      slug: `demande-${id}`,
      marketCode: input.marketCode,
      origin: input.origin,
      sourceOrderId: input.sourceOrderId,
      status: "open",
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
      publishedAt: DEMO_NOW,
      version: 2,
    };
    this.requests.set(id, request);
    this.owners.set(id, actor.userId);
    return structuredClone(request);
  }

  async listOwnRequests(actor: MobileDeliveryActor, marketCode: string) {
    return structuredClone(
      [...this.requests.values()].filter(
        (request) =>
          request.marketCode === marketCode &&
          this.owners.get(request.id) === actor.userId,
      ),
    );
  }

  async listOwnApplications(actor: MobileDeliveryActor, marketCode: string) {
    return structuredClone(
      [...this.requests.values()]
        .filter((request) => request.marketCode === marketCode)
        .flatMap((request) => request.applications)
        .filter(
          (application) =>
            this.applicationOwners.get(application.id) === actor.userId,
        ),
    );
  }

  async getPrivateRequest(
    actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
  ) {
    const request = this.requests.get(requestId);
    const selected = request?.applications.find(
      (application) => application.id === request.selectedApplicationId,
    );
    if (!request || request.marketCode !== marketCode) {
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    }
    if (this.owners.get(requestId) === actor.userId)
      return structuredClone(request);
    if (!selected || this.applicationOwners.get(selected.id) !== actor.userId)
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    return structuredClone(selectedCourierAssignment(request, selected));
  }

  async submitApplication(
    actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
    input: DeliveryApplicationInput,
  ) {
    const request = this.requests.get(requestId);
    const profile = this.profiles.get(`${actor.userId}:${marketCode}`);
    if (
      !request ||
      request.marketCode !== marketCode ||
      request.status !== "open" ||
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
        !profile.vehicleTypes.includes(request.package.requiredVehicleType)) ||
      this.owners.get(requestId) === actor.userId
    )
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    if (
      request.applications.some(
        (item) =>
          this.applicationOwners.get(item.id) === actor.userId &&
          item.status === "submitted",
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
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    request.applications.push(application);
    request.applicationCount = request.applications.length;
    this.applicationOwners.set(application.id, actor.userId);
    return structuredClone(application);
  }

  async acceptApplication(
    actor: MobileDeliveryActor,
    requestId: string,
    applicationId: string,
    marketCode: string,
    expectedVersion: number,
  ) {
    const request = this.requests.get(requestId);
    if (
      !request ||
      this.owners.get(requestId) !== actor.userId ||
      request.marketCode !== marketCode ||
      request.status !== "open" ||
      request.version !== expectedVersion
    )
      throw new Error("DELIVERY_ASSIGNMENT_CONFLICT");
    const selected = request.applications.find(
      (item) => item.id === applicationId && item.status === "submitted",
    );
    if (!selected) throw new Error("DELIVERY_APPLICATION_CONFLICT");
    request.applications = request.applications.map((item) =>
      item.status === "submitted"
        ? {
            ...item,
            status: item.id === applicationId ? "accepted" : "rejected",
          }
        : item,
    );
    request.status = "assigned";
    request.selectedApplicationId = applicationId;
    request.version += 1;
    return structuredClone(request);
  }

  async transition(
    actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
    status: DeliveryRequestStatus,
    expectedVersion: number,
  ) {
    await this.getPrivateRequest(actor, requestId, marketCode);
    const request = this.requests.get(requestId);
    if (!request || request.version !== expectedVersion)
      throw new Error("DELIVERY_ASSIGNMENT_CONFLICT");
    const participant =
      this.owners.get(requestId) === actor.userId ? "requester" : "courier";
    if (
      !canTransitionDeliveryRequestForParticipant(
        participant,
        request.status,
        status,
      )
    ) {
      throw new Error("DELIVERY_APPLICATION_CONFLICT");
    }
    request.status = status;
    request.version += 1;
    if (participant === "requester") return structuredClone(request);
    const selected = request.applications.find(
      (application) => application.id === request.selectedApplicationId,
    );
    if (!selected) throw new Error("DELIVERY_ASSIGNMENT_CONFLICT");
    return structuredClone(selectedCourierAssignment(request, selected));
  }
}

class HttpMobileDeliveryService implements MobileDeliveryService {
  availability(marketCode: string) {
    return apiRequest<DeliveryFeatureAvailability>(
      `/delivery/availability?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    );
  }
  async search(input: DeliverySearchInput) {
    const query = new URLSearchParams({
      marketCode: input.marketCode,
      limit: String(input.limit),
    });
    if (input.pickupPostalCode)
      query.set("pickupPostalCode", input.pickupPostalCode);
    if (input.vehicleType) query.set("vehicleType", input.vehicleType);
    const result = await apiRequest<{ items: DeliveryPublicRequest[] }>(
      `/delivery/requests?${query.toString()}`,
      {},
      input.marketCode,
    );
    return result.items;
  }
  getPublicRequest(requestId: string, marketCode: string) {
    return apiRequest<DeliveryPublicRequest>(
      `/delivery/requests/${encodeURIComponent(requestId)}?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    );
  }
  async getFavoriteRequestIds(_userId: string, marketCode: string) {
    const result = await apiRequest<{ requestIds: string[] }>(
      "/delivery/favorites",
      {},
      marketCode,
    );
    return result.requestIds;
  }
  async setFavoriteRequest(
    _userId: string,
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ) {
    const result = await apiRequest<{ isFavorite: boolean }>(
      `/delivery/requests/${encodeURIComponent(requestId)}/favorite`,
      { method: "PUT", body: JSON.stringify({ isFavorite }) },
      marketCode,
    );
    return result.isFavorite;
  }
  getCourierProfile(_actor: MobileDeliveryActor, marketCode: string) {
    return apiRequest<DeliveryCourierProfile | null>(
      `/delivery/courier/profile?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    );
  }
  saveCourierProfile(
    _actor: MobileDeliveryActor,
    marketCode: string,
    input: DeliveryCourierProfileInput,
  ) {
    return apiRequest<DeliveryCourierProfile>(
      "/delivery/courier/profile",
      { method: "PUT", body: JSON.stringify({ marketCode, ...input }) },
      marketCode,
    );
  }
  async createAndPublish(
    _actor: MobileDeliveryActor,
    input: DeliveryRequestDraftInput,
  ) {
    const draft = await apiRequest<DeliveryPrivateRequest>(
      "/delivery/requests",
      { method: "POST", body: JSON.stringify(input) },
      input.marketCode,
    );
    return apiRequest<DeliveryPrivateRequest>(
      `/delivery/requests/${encodeURIComponent(draft.id)}/publish`,
      {
        method: "POST",
        body: JSON.stringify({ marketCode: input.marketCode }),
      },
      input.marketCode,
    );
  }
  listOwnRequests(_actor: MobileDeliveryActor, marketCode: string) {
    return apiRequest<DeliveryPrivateRequest[]>(
      `/delivery/me/requests?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    );
  }
  listOwnApplications(_actor: MobileDeliveryActor, marketCode: string) {
    return apiRequest<DeliveryApplication[]>(
      `/delivery/me/applications?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    );
  }
  getPrivateRequest(
    _actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
  ) {
    return apiRequest<DeliveryPrivateRequest>(
      `/delivery/me/requests/${encodeURIComponent(requestId)}?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    );
  }
  submitApplication(
    _actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
    input: DeliveryApplicationInput,
  ) {
    return apiRequest<DeliveryApplication>(
      `/delivery/requests/${encodeURIComponent(requestId)}/applications`,
      { method: "POST", body: JSON.stringify({ marketCode, ...input }) },
      marketCode,
    );
  }
  acceptApplication(
    _actor: MobileDeliveryActor,
    requestId: string,
    applicationId: string,
    marketCode: string,
    expectedVersion: number,
  ) {
    return apiRequest<DeliveryPrivateRequest>(
      `/delivery/requests/${encodeURIComponent(requestId)}/applications/${encodeURIComponent(applicationId)}/accept`,
      { method: "POST", body: JSON.stringify({ marketCode, expectedVersion }) },
      marketCode,
    );
  }
  transition(
    _actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
    status: DeliveryRequestStatus,
    expectedVersion: number,
  ) {
    return apiRequest<
      DeliveryPrivateRequest | DeliverySelectedCourierAssignment
    >(
      `/delivery/requests/${encodeURIComponent(requestId)}/transition`,
      {
        method: "POST",
        body: JSON.stringify({ marketCode, status, expectedVersion }),
      },
      marketCode,
    );
  }
}

export const deliveryService: MobileDeliveryService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoMobileDeliveryService()
    : new HttpMobileDeliveryService();
