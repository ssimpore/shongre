import { randomUUID } from "node:crypto";
import type {
  DeliveryApplication,
  DeliveryApplicationInput,
  DeliveryCourierProfile,
  DeliveryCourierProfileInput,
  DeliveryPrivateRequest,
  DeliveryPublicRequest,
  DeliveryPublicRequestPage,
  DeliveryRequestDraftInput,
  DeliveryRequestStatus,
  DeliverySearchInput,
} from "@shongre/contracts/delivery";
import { canTransitionDeliveryRequestForParticipant } from "@shongre/contracts/delivery";
import { deterministicUuid } from "@shongre/shared/deterministic-id";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

export interface DeliveryRequestRecord extends DeliveryPrivateRequest {
  requesterId: string;
  idempotencyKey?: string;
}

export interface DeliveryApplicationRecord extends DeliveryApplication {
  courierUserId: string;
  courierProfileId: string;
}

export interface DeliveryRepository {
  getCourierProfile(
    userId: string,
    marketCode: string,
  ): Promise<DeliveryCourierProfile | null>;
  saveCourierProfile(
    userId: string,
    marketCode: string,
    input: DeliveryCourierProfileInput,
  ): Promise<DeliveryCourierProfile>;
  createDraft(
    requesterId: string,
    requesterName: string,
    requesterVerified: boolean,
    input: DeliveryRequestDraftInput,
  ): Promise<DeliveryRequestRecord>;
  publish(
    requestId: string,
    requesterId: string,
  ): Promise<DeliveryRequestRecord>;
  getRequest(requestId: string): Promise<DeliveryRequestRecord | null>;
  getFavoriteRequestIds(userId: string, marketCode: string): Promise<string[]>;
  getPublicRequestsByIds(
    requestIds: readonly string[],
    marketCode: string,
  ): Promise<DeliveryPublicRequest[]>;
  setFavoriteRequest(
    userId: string,
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean>;
  listOwnRequests(
    requesterId: string,
    marketCode: string,
  ): Promise<DeliveryRequestRecord[]>;
  searchPublic(input: DeliverySearchInput): Promise<DeliveryPublicRequestPage>;
  submitApplication(
    request: DeliveryRequestRecord,
    courierUserId: string,
    courierName: string,
    courierVerified: boolean,
    profile: DeliveryCourierProfile,
    input: DeliveryApplicationInput,
  ): Promise<DeliveryApplicationRecord>;
  listOwnApplications(
    courierUserId: string,
    marketCode: string,
  ): Promise<DeliveryApplicationRecord[]>;
  withdrawApplication(
    applicationId: string,
    courierUserId: string,
  ): Promise<DeliveryApplicationRecord>;
  acceptApplication(
    requestId: string,
    applicationId: string,
    requesterId: string,
    expectedVersion: number,
  ): Promise<DeliveryRequestRecord>;
  transition(
    requestId: string,
    actorId: string,
    expectedVersion: number,
    status: DeliveryRequestStatus,
    note?: string,
  ): Promise<DeliveryRequestRecord>;
  suspendUnsafe(
    requestId: string,
    actorId: string,
    expectedVersion: number,
    reason: string,
  ): Promise<DeliveryRequestRecord>;
  listEligibleCouriers(request: DeliveryRequestRecord): Promise<
    Array<{
      userId: string;
      profileId: string;
    }>
  >;
  reserveMatchNotification(
    requestId: string,
    profileId: string,
    requestVersion: number,
  ): Promise<boolean>;
  areUsersBlocked(firstUserId: string, secondUserId: string): Promise<boolean>;
  prepareAccountDeletion(userId: string): Promise<void>;
}

function toPublic(record: DeliveryRequestRecord): DeliveryPublicRequest {
  const {
    sourceOrderId: _sourceOrderId,
    pickup: _pickup,
    dropoff: _dropoff,
    applications: _applications,
    selectedApplicationId: _selectedApplicationId,
    requesterId: _requesterId,
    idempotencyKey: _idempotencyKey,
    ...publicRequest
  } = record;
  return publicRequest;
}

const DEMO_NOW = "2026-09-05T12:00:00.000Z";

export class DemoDeliveryRepository implements DeliveryRepository {
  private readonly profiles = new Map<string, DeliveryCourierProfile>();
  private readonly requests = new Map<string, DeliveryRequestRecord>();
  private readonly applications = new Map<string, DeliveryApplicationRecord>();
  private readonly notificationKeys = new Set<string>();
  private readonly favoriteRequestIds = new Map<string, Set<string>>();

  private profileKey(userId: string, marketCode: string) {
    return `${userId}:${marketCode}`;
  }

  async getCourierProfile(userId: string, marketCode: string) {
    return structuredClone(
      this.profiles.get(this.profileKey(userId, marketCode)) ?? null,
    );
  }

  async saveCourierProfile(
    userId: string,
    marketCode: string,
    input: DeliveryCourierProfileInput,
  ) {
    const key = this.profileKey(userId, marketCode);
    const prior = this.profiles.get(key);
    const profile: DeliveryCourierProfile = {
      ...input,
      id:
        prior?.id ??
        deterministicUuid("delivery-courier", `${userId}:${marketCode}`),
      marketCode,
      eligibilityStatus: "eligible",
      serviceLocalities: structuredClone(input.serviceLocalities),
      vehicleTypes: [...input.vehicleTypes],
      updatedAt: DEMO_NOW,
    };
    this.profiles.set(key, profile);
    return structuredClone(profile);
  }

  async createDraft(
    requesterId: string,
    requesterName: string,
    requesterVerified: boolean,
    input: DeliveryRequestDraftInput,
  ) {
    const duplicate = [...this.requests.values()].find(
      (request) =>
        request.requesterId === requesterId &&
        request.marketCode === input.marketCode &&
        request.idempotencyKey === input.idempotencyKey,
    );
    if (duplicate) return structuredClone(duplicate);
    if (
      input.sourceOrderId &&
      [...this.requests.values()].some(
        (request) =>
          request.sourceOrderId === input.sourceOrderId &&
          !["cancelled", "expired", "completed"].includes(request.status),
      )
    ) {
      throw new Error("DELIVERY_APPLICATION_CONFLICT");
    }
    const id = deterministicUuid(
      "delivery-request",
      `${requesterId}:${input.marketCode}:${input.idempotencyKey}`,
    );
    const request: DeliveryRequestRecord = {
      id,
      slug: `${input.pickup.city}-${input.dropoff.city}-${id.slice(0, 8)}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
      marketCode: input.marketCode,
      origin: input.origin,
      sourceOrderId: input.sourceOrderId,
      requesterId,
      requester: { displayName: requesterName, verified: requesterVerified },
      status: "draft",
      title: input.title,
      description: input.description,
      pickup: structuredClone(input.pickup),
      dropoff: structuredClone(input.dropoff),
      pickupLocality: {
        city: input.pickup.city,
        postalCode: input.pickup.postalCode,
      },
      dropoffLocality: {
        city: input.dropoff.city,
        postalCode: input.dropoff.postalCode,
      },
      pickupWindow: structuredClone(input.pickupWindow),
      deliveryWindow: structuredClone(input.deliveryWindow),
      package: structuredClone(input.package),
      budget: input.budget,
      publicInstructions: input.publicInstructions,
      applicationCount: 0,
      applications: [],
      expiresAt: input.expiresAt,
      version: 1,
      idempotencyKey: input.idempotencyKey,
    } as DeliveryRequestRecord & { idempotencyKey: string };
    this.requests.set(id, request);
    return structuredClone(request);
  }

  async publish(requestId: string, requesterId: string) {
    const request = this.requireRequest(requestId);
    if (request.requesterId !== requesterId)
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    if (request.status !== "draft" && request.status !== "pending_review") {
      if (request.status === "open") return structuredClone(request);
      throw new Error("DELIVERY_REQUEST_NOT_OPEN");
    }
    request.status = "open";
    request.publishedAt = DEMO_NOW;
    request.version += 1;
    return structuredClone(request);
  }

  async getRequest(requestId: string) {
    const request = this.requests.get(requestId);
    return request ? structuredClone(request) : null;
  }

  async getFavoriteRequestIds(userId: string, marketCode: string) {
    return Array.from(
      this.favoriteRequestIds.get(this.profileKey(userId, marketCode)) ?? [],
    );
  }

  async getPublicRequestsByIds(
    requestIds: readonly string[],
    marketCode: string,
  ) {
    return requestIds.flatMap((requestId) => {
      const request = this.requests.get(requestId);
      return request &&
        request.marketCode === marketCode &&
        request.status === "open" &&
        Boolean(request.publishedAt) &&
        request.expiresAt > DEMO_NOW
        ? [structuredClone(toPublic(request))]
        : [];
    });
  }

  async setFavoriteRequest(
    userId: string,
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ) {
    const scopeKey = this.profileKey(userId, marketCode);
    const favorites =
      this.favoriteRequestIds.get(scopeKey) ?? new Set<string>();
    if (isFavorite) {
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
      favorites.add(requestId);
    } else {
      favorites.delete(requestId);
    }
    this.favoriteRequestIds.set(scopeKey, favorites);
    return favorites.has(requestId);
  }

  async listOwnRequests(requesterId: string, marketCode: string) {
    return structuredClone(
      [...this.requests.values()].filter(
        (request) =>
          request.requesterId === requesterId &&
          request.marketCode === marketCode,
      ),
    );
  }

  async searchPublic(input: DeliverySearchInput) {
    const offset = input.cursor ? Number.parseInt(input.cursor, 10) : 0;
    const matching = [...this.requests.values()].filter(
      (request) =>
        request.marketCode === input.marketCode &&
        request.status === "open" &&
        request.expiresAt > DEMO_NOW &&
        (!input.pickupPostalCode ||
          request.pickupLocality.postalCode === input.pickupPostalCode) &&
        (!input.vehicleType ||
          !request.package.requiredVehicleType ||
          request.package.requiredVehicleType === input.vehicleType),
    );
    const slice = matching.slice(offset, offset + input.limit);
    return {
      items: slice.map(toPublic),
      nextCursor:
        offset + slice.length < matching.length
          ? String(offset + slice.length)
          : undefined,
    };
  }

  async submitApplication(
    request: DeliveryRequestRecord,
    courierUserId: string,
    courierName: string,
    courierVerified: boolean,
    profile: DeliveryCourierProfile,
    input: DeliveryApplicationInput,
  ) {
    const duplicate = [...this.applications.values()].find(
      (application) =>
        application.courierUserId === courierUserId &&
        application.requestId === request.id &&
        (application.status === "submitted" ||
          application.status === "accepted"),
    );
    if (duplicate) throw new Error("DELIVERY_APPLICATION_EXISTS");
    const now = DEMO_NOW;
    const application: DeliveryApplicationRecord = {
      id: deterministicUuid(
        "delivery-application",
        `${courierUserId}:${request.id}:${input.idempotencyKey}`,
      ),
      requestId: request.id,
      courierUserId,
      courierProfileId: profile.id,
      status: "submitted",
      courier: {
        displayName: courierName,
        verified: courierVerified,
        vehicleTypes: [...profile.vehicleTypes],
      },
      availabilityNote: input.availabilityNote,
      message: input.message,
      quote: input.quote,
      createdAt: now,
      updatedAt: now,
    };
    this.applications.set(application.id, application);
    const storedRequest = this.requireRequest(request.id);
    storedRequest.applications.push(application);
    storedRequest.applicationCount += 1;
    this.requests.set(request.id, storedRequest);
    return structuredClone(application);
  }

  async listOwnApplications(courierUserId: string, marketCode: string) {
    return structuredClone(
      [...this.applications.values()].filter(
        (application) =>
          application.courierUserId === courierUserId &&
          this.requests.get(application.requestId)?.marketCode === marketCode,
      ),
    );
  }

  async withdrawApplication(applicationId: string, courierUserId: string) {
    const application = this.applications.get(applicationId);
    if (!application || application.courierUserId !== courierUserId) {
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    }
    if (application.status === "withdrawn") return structuredClone(application);
    if (application.status !== "submitted") {
      throw new Error("DELIVERY_APPLICATION_CONFLICT");
    }
    application.status = "withdrawn";
    application.updatedAt = DEMO_NOW;
    return structuredClone(application);
  }

  async acceptApplication(
    requestId: string,
    applicationId: string,
    requesterId: string,
    expectedVersion: number,
  ) {
    const request = this.requireRequest(requestId);
    const application = this.applications.get(applicationId);
    if (request.requesterId !== requesterId)
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    if (request.status !== "open") throw new Error("DELIVERY_REQUEST_NOT_OPEN");
    if (request.version !== expectedVersion)
      throw new Error("DELIVERY_ASSIGNMENT_CONFLICT");
    if (
      !application ||
      application.requestId !== requestId ||
      application.status !== "submitted"
    ) {
      throw new Error("DELIVERY_APPLICATION_CONFLICT");
    }
    for (const candidate of this.applications.values()) {
      if (
        candidate.requestId === requestId &&
        candidate.status === "submitted"
      ) {
        candidate.status =
          candidate.id === applicationId ? "accepted" : "rejected";
        candidate.updatedAt = DEMO_NOW;
      }
    }
    request.status = "assigned";
    request.selectedApplicationId = applicationId;
    request.version += 1;
    request.applications = [...this.applications.values()].filter(
      (candidate) => candidate.requestId === requestId,
    );
    return structuredClone(request);
  }

  async transition(
    requestId: string,
    actorId: string,
    expectedVersion: number,
    status: DeliveryRequestStatus,
    _note?: string,
  ) {
    const request = this.requireRequest(requestId);
    const selected = request.selectedApplicationId
      ? this.applications.get(request.selectedApplicationId)
      : undefined;
    if (
      request.requesterId !== actorId &&
      selected?.courierUserId !== actorId
    ) {
      throw new Error("DELIVERY_NOT_ELIGIBLE");
    }
    if (request.version !== expectedVersion)
      throw new Error("DELIVERY_ASSIGNMENT_CONFLICT");
    const participant =
      request.requesterId === actorId ? "requester" : "courier";
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
    return structuredClone(request);
  }

  async suspendUnsafe(
    requestId: string,
    _actorId: string,
    expectedVersion: number,
    _reason: string,
  ) {
    const request = this.requireRequest(requestId);
    if (request.version !== expectedVersion)
      throw new Error("DELIVERY_ASSIGNMENT_CONFLICT");
    if (["completed", "cancelled", "expired"].includes(request.status))
      throw new Error("DELIVERY_APPLICATION_CONFLICT");
    request.status = "suspended";
    request.version += 1;
    return structuredClone(request);
  }

  async listEligibleCouriers(request: DeliveryRequestRecord) {
    return [...this.profiles.entries()]
      .filter(
        ([, profile]) =>
          profile.marketCode === request.marketCode &&
          profile.status === "active" &&
          profile.eligibilityStatus === "eligible" &&
          profile.opportunityNotifications &&
          profile.maxWeightGrams >= request.package.approximateWeightGrams &&
          profile.serviceLocalities.some(
            (locality) =>
              locality.postalCode === request.pickupLocality.postalCode,
          ) &&
          profile.serviceLocalities.some(
            (locality) =>
              locality.postalCode === request.dropoffLocality.postalCode,
          ) &&
          (!request.package.requiredVehicleType ||
            profile.vehicleTypes.includes(request.package.requiredVehicleType)),
      )
      .map(([key, profile]) => ({
        userId: key.split(":")[0],
        profileId: profile.id,
      }));
  }

  async reserveMatchNotification(
    requestId: string,
    profileId: string,
    requestVersion: number,
  ) {
    const key = `${requestId}:${profileId}:${requestVersion}`;
    if (this.notificationKeys.has(key)) return false;
    this.notificationKeys.add(key);
    return true;
  }

  async areUsersBlocked() {
    return false;
  }

  async prepareAccountDeletion(userId: string) {
    const terminalStatuses = new Set<DeliveryRequestStatus>([
      "completed",
      "cancelled",
      "expired",
    ]);
    const participates = (request: DeliveryRequestRecord) => {
      const selected = request.selectedApplicationId
        ? this.applications.get(request.selectedApplicationId)
        : undefined;
      return (
        request.requesterId === userId || selected?.courierUserId === userId
      );
    };
    if (
      [...this.requests.values()].some(
        (request) =>
          participates(request) && !terminalStatuses.has(request.status),
      )
    ) {
      throw new Error("DELIVERY_ACTIVE_ASSIGNMENT");
    }
    for (const [profileKey, profile] of this.profiles) {
      if (!profileKey.startsWith(`${userId}:`)) continue;
      this.profiles.set(profileKey, {
        ...profile,
        status: "inactive",
        availabilityNote: undefined,
        opportunityNotifications: false,
      });
    }
    for (const favoriteKey of this.favoriteRequestIds.keys()) {
      if (favoriteKey.startsWith(`${userId}:`)) {
        this.favoriteRequestIds.delete(favoriteKey);
      }
    }
    for (const application of this.applications.values()) {
      if (application.courierUserId !== userId) continue;
      if (application.status === "submitted") application.status = "withdrawn";
      application.courier = {
        ...application.courier,
        displayName: "Membre supprimé",
        verified: false,
      };
      application.availabilityNote = "Indisponible";
      application.message = "Candidature anonymisée";
      application.updatedAt = DEMO_NOW;
    }
    for (const request of this.requests.values()) {
      if (!participates(request) || !terminalStatuses.has(request.status))
        continue;
      request.pickup = {
        ...request.pickup,
        street: "Adresse supprimée",
        complement: undefined,
        contactName: "Membre supprimé",
        contactPhone: "Supprimé",
        accessInstructions: undefined,
      };
      request.dropoff = {
        ...request.dropoff,
        street: "Adresse supprimée",
        complement: undefined,
        contactName: "Membre supprimé",
        contactPhone: "Supprimé",
        accessInstructions: undefined,
      };
      if (request.requesterId === userId) {
        request.requester = { displayName: "Membre supprimé", verified: false };
      }
    }
  }

  private requireRequest(id: string) {
    const request = this.requests.get(id);
    if (!request) throw new Error("DELIVERY_NOT_ELIGIBLE");
    return request;
  }
}

// Database mode remains behind the privileged repository boundary. Every table
// is FORCE RLS and inaccessible to browser/native roles.
export class PostgresDeliveryRepository implements DeliveryRepository {
  private client() {
    return getSupabaseAdminClient() as any;
  }

  async getCourierProfile(userId: string, marketCode: string) {
    try {
      const { data, error } = await this.client()
        .from("delivery_courier_profiles")
        .select("*, delivery_courier_areas(city,postal_code)")
        .eq("user_id", userId)
        .eq("market_code", marketCode)
        .maybeSingle();
      if (error) databaseFailure("delivery.getCourierProfile", error);
      return data ? mapCourierProfile(data) : null;
    } catch (error) {
      databaseFailure("delivery.getCourierProfile", error);
    }
  }

  async saveCourierProfile(
    userId: string,
    marketCode: string,
    input: DeliveryCourierProfileInput,
  ) {
    try {
      const client = this.client();
      const { error } = await client.rpc("save_delivery_courier_profile", {
        p_user_id: userId,
        p_market_code: marketCode,
        p_status: input.status,
        p_vehicle_types: input.vehicleTypes,
        p_max_weight_grams: input.maxWeightGrams,
        p_availability_note: input.availabilityNote ?? null,
        p_opportunity_notifications: input.opportunityNotifications,
        p_service_localities: input.serviceLocalities.map((area) => ({
          city: area.city,
          postal_code: area.postalCode,
        })),
      });
      if (error) databaseFailure("delivery.saveCourierProfile", error);
      const profile = await this.getCourierProfile(userId, marketCode);
      if (!profile) throw new Error("DELIVERY_NOT_ELIGIBLE");
      return profile;
    } catch (error) {
      databaseFailure("delivery.saveCourierProfile", error);
    }
  }

  async createDraft(
    requesterId: string,
    requesterName: string,
    requesterVerified: boolean,
    input: DeliveryRequestDraftInput,
  ) {
    try {
      const client = this.client();
      const id = randomUUID();
      const slug =
        `${input.pickup.city}-${input.dropoff.city}-${id.slice(0, 8)}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      const { data, error } = await client
        .from("delivery_requests")
        .upsert(
          {
            id,
            slug,
            requester_id: requesterId,
            market_code: input.marketCode,
            origin: input.origin,
            source_order_id: input.sourceOrderId ?? null,
            title: input.title,
            description: input.description,
            pickup_city: input.pickup.city,
            pickup_postal_code: input.pickup.postalCode,
            dropoff_city: input.dropoff.city,
            dropoff_postal_code: input.dropoff.postalCode,
            pickup_starts_at: input.pickupWindow.startsAt,
            pickup_ends_at: input.pickupWindow.endsAt,
            delivery_starts_at: input.deliveryWindow.startsAt,
            delivery_ends_at: input.deliveryWindow.endsAt,
            package_type: input.package.type,
            package_count: input.package.count,
            approximate_weight_grams: input.package.approximateWeightGrams,
            dimensions_cm: input.package.dimensionsCm ?? null,
            handling_requirements: input.package.handlingRequirements,
            required_vehicle_type: input.package.requiredVehicleType ?? null,
            loading_assistance_required:
              input.package.loadingAssistanceRequired,
            budget_amount_minor: input.budget?.amountMinor ?? null,
            budget_currency: input.budget?.currency ?? null,
            public_instructions: input.publicInstructions ?? null,
            expires_at: input.expiresAt,
            idempotency_key: input.idempotencyKey,
          },
          {
            onConflict: "requester_id,market_code,idempotency_key",
            ignoreDuplicates: false,
          },
        )
        .select("*")
        .single();
      if (error) databaseFailure("delivery.createDraft", error);
      const stops = [
        { kind: "pickup", value: input.pickup },
        { kind: "dropoff", value: input.dropoff },
      ];
      const { error: stopError } = await client
        .from("delivery_request_stops")
        .upsert(
          stops.map(({ kind, value }) => ({
            request_id: data.id,
            market_code: input.marketCode,
            kind,
            street: value.street,
            complement: value.complement ?? null,
            city: value.city,
            postal_code: value.postalCode,
            contact_name: value.contactName,
            contact_phone: value.contactPhone,
            access_instructions: value.accessInstructions ?? null,
          })),
          { onConflict: "request_id,kind" },
        );
      if (stopError) databaseFailure("delivery.createStops", stopError);
      return mapRequest(
        data,
        requesterName,
        requesterVerified,
        input.pickup,
        input.dropoff,
        [],
      );
    } catch (error) {
      databaseFailure("delivery.createDraft", error);
    }
  }

  async publish(requestId: string, requesterId: string) {
    try {
      const { data, error } = await this.client().rpc(
        "publish_delivery_request",
        {
          p_request_id: requestId,
          p_requester_id: requesterId,
        },
      );
      if (error) databaseFailure("delivery.publish", error);
      return this.requireMappedRequest(data[0]);
    } catch (error) {
      databaseFailure("delivery.publish", error);
    }
  }

  async getRequest(requestId: string) {
    try {
      const { data, error } = await this.client()
        .from("delivery_requests")
        .select(
          "*, profiles!delivery_requests_requester_id_fkey(name,is_verified), delivery_request_stops(*), delivery_applications(*, delivery_courier_profiles(vehicle_types), profiles!delivery_applications_courier_user_id_fkey(name,is_verified))",
        )
        .eq("id", requestId)
        .maybeSingle();
      if (error) databaseFailure("delivery.getRequest", error);
      return data ? mapJoinedRequest(data) : null;
    } catch (error) {
      databaseFailure("delivery.getRequest", error);
    }
  }

  async getFavoriteRequestIds(userId: string, marketCode: string) {
    try {
      const { data, error } = await this.client().rpc(
        "list_favorite_delivery_request_ids",
        {
          p_user_id: userId,
          p_market_code: marketCode,
        },
      );
      if (error) databaseFailure("delivery.getFavoriteRequestIds", error);
      return (data ?? []).map((row: { request_id: string }) =>
        String(row.request_id),
      );
    } catch (error) {
      databaseFailure("delivery.getFavoriteRequestIds", error);
    }
  }

  async getPublicRequestsByIds(
    requestIds: readonly string[],
    marketCode: string,
  ): Promise<DeliveryPublicRequest[]> {
    if (requestIds.length === 0) return [];
    try {
      const { data, error } = await this.client()
        .from("delivery_requests")
        .select(
          "*, profiles!delivery_requests_requester_id_fkey(name,is_verified)",
        )
        .in("id", [...new Set(requestIds)])
        .eq("market_code", marketCode)
        .eq("status", "open")
        .not("published_at", "is", null)
        .gt("expires_at", new Date().toISOString());
      if (error) databaseFailure("delivery.getPublicRequestsByIds", error);
      const byId = new Map<string, DeliveryPublicRequest>(
        (data ?? []).map((row: unknown) => {
          const request = toPublic(mapRowWithoutPrivate(row));
          return [request.id, request] as const;
        }),
      );
      return requestIds.flatMap((requestId) => {
        const request = byId.get(requestId);
        return request ? [request] : [];
      });
    } catch (error) {
      databaseFailure("delivery.getPublicRequestsByIds", error);
    }
  }

  async setFavoriteRequest(
    userId: string,
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ) {
    try {
      const { data, error } = await this.client().rpc(
        "set_delivery_request_favorite",
        {
          p_user_id: userId,
          p_request_id: requestId,
          p_market_code: marketCode,
          p_is_favorite: isFavorite,
        },
      );
      if (error?.code === "P0002") {
        throw new Error("DELIVERY_REQUEST_NOT_OPEN");
      }
      if (error) databaseFailure("delivery.setFavoriteRequest", error);
      return Boolean(data);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "DELIVERY_REQUEST_NOT_OPEN"
      ) {
        throw error;
      }
      databaseFailure("delivery.setFavoriteRequest", error);
    }
  }

  async listOwnRequests(requesterId: string, marketCode: string) {
    try {
      const { data, error } = await this.client()
        .from("delivery_requests")
        .select("id")
        .eq("requester_id", requesterId)
        .eq("market_code", marketCode)
        .order("updated_at", { ascending: false });
      if (error) databaseFailure("delivery.listOwnRequests", error);
      const records = await Promise.all(
        (data ?? []).map((row: any) => this.getRequest(row.id)),
      );
      return records.filter(Boolean) as DeliveryRequestRecord[];
    } catch (error) {
      databaseFailure("delivery.listOwnRequests", error);
    }
  }

  async searchPublic(input: DeliverySearchInput) {
    try {
      let query = this.client()
        .from("delivery_requests")
        .select(
          "*, profiles!delivery_requests_requester_id_fkey(name,is_verified)",
        )
        .eq("market_code", input.marketCode)
        .eq("status", "open")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(input.limit + 1);
      if (input.pickupPostalCode)
        query = query.eq("pickup_postal_code", input.pickupPostalCode);
      if (input.vehicleType)
        query = query.or(
          `required_vehicle_type.is.null,required_vehicle_type.eq.${input.vehicleType}`,
        );
      if (input.cursor) query = query.lt("created_at", input.cursor);
      const { data, error } = await query;
      if (error) databaseFailure("delivery.searchPublic", error);
      const rows = data ?? [];
      return {
        items: rows
          .slice(0, input.limit)
          .map((row: any) => toPublic(mapRowWithoutPrivate(row))),
        nextCursor:
          rows.length > input.limit
            ? rows[input.limit - 1].created_at
            : undefined,
      };
    } catch (error) {
      databaseFailure("delivery.searchPublic", error);
    }
  }

  async submitApplication(
    request: DeliveryRequestRecord,
    courierUserId: string,
    courierName: string,
    courierVerified: boolean,
    profile: DeliveryCourierProfile,
    input: DeliveryApplicationInput,
  ) {
    try {
      const { data, error } = await this.client().rpc(
        "submit_delivery_application",
        {
          p_request_id: request.id,
          p_courier_profile_id: profile.id,
          p_courier_user_id: courierUserId,
          p_market_code: request.marketCode,
          p_availability_note: input.availabilityNote,
          p_message: input.message,
          p_quote_amount_minor: input.quote?.amountMinor ?? null,
          p_quote_currency: input.quote?.currency ?? null,
          p_idempotency_key: input.idempotencyKey,
        },
      );
      if (error) databaseFailure("delivery.submitApplication", error);
      return mapApplication(
        data[0],
        courierName,
        courierVerified,
        profile.vehicleTypes,
      );
    } catch (error) {
      databaseFailure("delivery.submitApplication", error);
    }
  }

  async listOwnApplications(courierUserId: string, marketCode: string) {
    try {
      const { data, error } = await this.client()
        .from("delivery_applications")
        .select(
          "*, delivery_courier_profiles(vehicle_types), profiles!delivery_applications_courier_user_id_fkey(name,is_verified)",
        )
        .eq("courier_user_id", courierUserId)
        .eq("market_code", marketCode)
        .order("updated_at", { ascending: false });
      if (error) databaseFailure("delivery.listOwnApplications", error);
      return (data ?? []).map((row: any) =>
        mapApplication(
          row,
          row.profiles.name,
          row.profiles.is_verified,
          row.delivery_courier_profiles.vehicle_types,
        ),
      );
    } catch (error) {
      databaseFailure("delivery.listOwnApplications", error);
    }
  }

  async withdrawApplication(applicationId: string, courierUserId: string) {
    try {
      const { data, error } = await this.client().rpc(
        "withdraw_delivery_application",
        {
          p_application_id: applicationId,
          p_courier_user_id: courierUserId,
        },
      );
      if (error) databaseFailure("delivery.withdrawApplication", error);
      const request = await this.getRequest(data[0].request_id);
      const application = request?.applications.find(
        (candidate) => candidate.id === applicationId,
      ) as DeliveryApplicationRecord | undefined;
      if (application) return application;
      return mapApplication(data[0], "Membre Shongre", false, []);
    } catch (error) {
      databaseFailure("delivery.withdrawApplication", error);
    }
  }

  async acceptApplication(
    requestId: string,
    applicationId: string,
    requesterId: string,
    expectedVersion: number,
  ) {
    try {
      const { data, error } = await this.client().rpc(
        "accept_delivery_application",
        {
          p_request_id: requestId,
          p_application_id: applicationId,
          p_requester_id: requesterId,
          p_expected_version: expectedVersion,
        },
      );
      if (error) databaseFailure("delivery.acceptApplication", error);
      return this.requireMappedRequest(data[0]);
    } catch (error) {
      databaseFailure("delivery.acceptApplication", error);
    }
  }

  async transition(
    requestId: string,
    actorId: string,
    expectedVersion: number,
    status: DeliveryRequestStatus,
    note?: string,
  ) {
    try {
      const { data, error } = await this.client().rpc(
        "transition_delivery_request",
        {
          p_request_id: requestId,
          p_actor_id: actorId,
          p_expected_version: expectedVersion,
          p_status: status,
          p_note: note ?? null,
        },
      );
      if (error) databaseFailure("delivery.transition", error);
      return this.requireMappedRequest(data[0]);
    } catch (error) {
      databaseFailure("delivery.transition", error);
    }
  }

  async suspendUnsafe(
    requestId: string,
    actorId: string,
    expectedVersion: number,
    reason: string,
  ) {
    try {
      const { data, error } = await this.client().rpc(
        "suspend_unsafe_delivery_request",
        {
          p_request_id: requestId,
          p_actor_id: actorId,
          p_expected_version: expectedVersion,
          p_reason: reason,
        },
      );
      if (error) databaseFailure("delivery.suspendUnsafe", error);
      return this.requireMappedRequest(data[0]);
    } catch (error) {
      databaseFailure("delivery.suspendUnsafe", error);
    }
  }

  async listEligibleCouriers(request: DeliveryRequestRecord) {
    try {
      let query = this.client()
        .from("delivery_courier_profiles")
        .select("id,user_id,vehicle_types,delivery_courier_areas(postal_code)")
        .eq("market_code", request.marketCode)
        .eq("status", "active")
        .eq("compliance_status", "eligible")
        .eq("opportunity_notifications", true)
        .gte("max_weight_grams", request.package.approximateWeightGrams)
        .limit(500);
      if (request.package.requiredVehicleType)
        query = query.contains("vehicle_types", [
          request.package.requiredVehicleType,
        ]);
      const { data, error } = await query;
      if (error) databaseFailure("delivery.listEligibleCouriers", error);
      return (data ?? [])
        .filter((row: any) => {
          const postalCodes = new Set(
            (row.delivery_courier_areas ?? []).map(
              (area: any) => area.postal_code,
            ),
          );
          return (
            postalCodes.has(request.pickupLocality.postalCode) &&
            postalCodes.has(request.dropoffLocality.postalCode)
          );
        })
        .map((row: any) => ({
          userId: row.user_id,
          profileId: row.id,
        }));
    } catch (error) {
      databaseFailure("delivery.listEligibleCouriers", error);
    }
  }

  async reserveMatchNotification(
    requestId: string,
    profileId: string,
    requestVersion: number,
  ) {
    const { error } = await this.client()
      .from("delivery_match_notifications")
      .insert({
        request_id: requestId,
        courier_profile_id: profileId,
        request_version: requestVersion,
      });
    if (!error) return true;
    if (error.code === "23505") return false;
    databaseFailure("delivery.reserveMatchNotification", error);
  }

  async areUsersBlocked(firstUserId: string, secondUserId: string) {
    const { count, error } = await this.client()
      .from("blocked_users")
      .select("id", { count: "exact", head: true })
      .or(
        `and(blocker_id.eq.${firstUserId},blocked_id.eq.${secondUserId}),and(blocker_id.eq.${secondUserId},blocked_id.eq.${firstUserId})`,
      );
    if (error) databaseFailure("delivery.areUsersBlocked", error);
    return (count ?? 0) > 0;
  }

  async prepareAccountDeletion(userId: string) {
    try {
      const { error } = await this.client().rpc(
        "prepare_delivery_account_deletion",
        { p_user_id: userId },
      );
      if (error?.message?.includes("DELIVERY_ACTIVE_ASSIGNMENT"))
        throw new Error("DELIVERY_ACTIVE_ASSIGNMENT");
      if (error) databaseFailure("delivery.prepareAccountDeletion", error);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "DELIVERY_ACTIVE_ASSIGNMENT"
      )
        throw error;
      databaseFailure("delivery.prepareAccountDeletion", error);
    }
  }

  private async requireMappedRequest(row: any) {
    const request = await this.getRequest(row.id);
    if (!request) throw new Error("DELIVERY_NOT_ELIGIBLE");
    return request;
  }
}

function mapCourierProfile(row: any): DeliveryCourierProfile {
  return {
    id: row.id,
    marketCode: row.market_code,
    status: row.status,
    eligibilityStatus: row.compliance_status,
    vehicleTypes: row.vehicle_types,
    maxWeightGrams: Number(row.max_weight_grams),
    serviceLocalities: (row.delivery_courier_areas ?? []).map((area: any) => ({
      city: area.city,
      postalCode: area.postal_code,
    })),
    availabilityNote: row.availability_note ?? undefined,
    opportunityNotifications: Boolean(row.opportunity_notifications),
    updatedAt: row.updated_at,
  };
}

function mapApplication(
  row: any,
  displayName: string,
  verified: boolean,
  vehicleTypes: DeliveryCourierProfile["vehicleTypes"],
): DeliveryApplicationRecord {
  return {
    id: row.id,
    requestId: row.request_id,
    courierUserId: row.courier_user_id,
    courierProfileId: row.courier_profile_id,
    status: row.status,
    courier: { displayName, verified: Boolean(verified), vehicleTypes },
    availabilityNote: row.availability_note,
    message: row.message,
    quote:
      row.quote_amount_minor == null
        ? undefined
        : {
            amountMinor: Number(row.quote_amount_minor),
            currency: row.quote_currency,
          },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowWithoutPrivate(row: any): DeliveryRequestRecord {
  return mapRequest(
    row,
    row.profiles?.name ?? "Membre Shongre",
    Boolean(row.profiles?.is_verified),
    {
      street: "private",
      city: row.pickup_city,
      postalCode: row.pickup_postal_code,
      contactName: "private",
      contactPhone: "private",
    },
    {
      street: "private",
      city: row.dropoff_city,
      postalCode: row.dropoff_postal_code,
      contactName: "private",
      contactPhone: "private",
    },
    [],
  );
}

function mapJoinedRequest(row: any): DeliveryRequestRecord {
  const stops = row.delivery_request_stops ?? [];
  const stop = (kind: string) => {
    const value = stops.find((candidate: any) => candidate.kind === kind);
    if (!value) {
      const isPickup = kind === "pickup";
      return {
        street: "Adresse supprimée",
        city: isPickup ? row.pickup_city : row.dropoff_city,
        postalCode: isPickup ? row.pickup_postal_code : row.dropoff_postal_code,
        contactName: "Membre supprimé",
        contactPhone: "Supprimé",
      };
    }
    return {
      street: value.street,
      complement: value.complement ?? undefined,
      city: value.city,
      postalCode: value.postal_code,
      contactName: value.contact_name,
      contactPhone: value.contact_phone,
      accessInstructions: value.access_instructions ?? undefined,
    };
  };
  return mapRequest(
    row,
    row.profiles.name,
    Boolean(row.profiles.is_verified),
    stop("pickup"),
    stop("dropoff"),
    (row.delivery_applications ?? []).map((application: any) =>
      mapApplication(
        application,
        application.profiles.name,
        application.profiles.is_verified,
        application.delivery_courier_profiles.vehicle_types,
      ),
    ),
  );
}

function mapRequest(
  row: any,
  requesterName: string,
  requesterVerified: boolean,
  pickup: DeliveryPrivateRequest["pickup"],
  dropoff: DeliveryPrivateRequest["dropoff"],
  applications: DeliveryApplicationRecord[],
): DeliveryRequestRecord {
  return {
    id: row.id,
    slug: row.slug,
    marketCode: row.market_code ?? row.marketCode,
    origin: row.origin,
    sourceOrderId: row.source_order_id ?? row.sourceOrderId ?? undefined,
    requesterId: row.requester_id ?? row.requesterId,
    requester: { displayName: requesterName, verified: requesterVerified },
    status: row.status,
    title: row.title,
    description: row.description,
    pickup,
    dropoff,
    pickupLocality: {
      city: row.pickup_city ?? pickup.city,
      postalCode: row.pickup_postal_code ?? pickup.postalCode,
    },
    dropoffLocality: {
      city: row.dropoff_city ?? dropoff.city,
      postalCode: row.dropoff_postal_code ?? dropoff.postalCode,
    },
    pickupWindow: {
      startsAt: row.pickup_starts_at ?? row.pickupWindow.startsAt,
      endsAt: row.pickup_ends_at ?? row.pickupWindow.endsAt,
    },
    deliveryWindow: {
      startsAt: row.delivery_starts_at ?? row.deliveryWindow.startsAt,
      endsAt: row.delivery_ends_at ?? row.deliveryWindow.endsAt,
    },
    package: row.package ?? {
      type: row.package_type,
      count: Number(row.package_count),
      approximateWeightGrams: Number(row.approximate_weight_grams),
      dimensionsCm: row.dimensions_cm ?? undefined,
      handlingRequirements: row.handling_requirements ?? [],
      requiredVehicleType: row.required_vehicle_type ?? undefined,
      loadingAssistanceRequired: Boolean(row.loading_assistance_required),
    },
    budget:
      row.budget ??
      (row.budget_amount_minor == null
        ? undefined
        : {
            amountMinor: Number(row.budget_amount_minor),
            currency: row.budget_currency,
          }),
    publicInstructions:
      row.public_instructions ?? row.publicInstructions ?? undefined,
    applicationCount: Number(row.application_count ?? applications.length),
    applications,
    selectedApplicationId:
      row.selected_application_id ?? row.selectedApplicationId ?? undefined,
    expiresAt: row.expires_at ?? row.expiresAt,
    publishedAt: row.published_at ?? row.publishedAt ?? undefined,
    version: Number(row.version),
  };
}
