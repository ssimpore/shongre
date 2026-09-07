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
import type { operations } from "@shongre/contracts/openapi";
import { apiRequest } from "@/api/http-client";

type AvailabilityResponse =
  operations["getDeliveryAvailability"]["responses"][200]["content"]["application/json"];
type SearchResponse =
  operations["getDeliveryRequests"]["responses"][200]["content"]["application/json"];
type PublicRequestResponse =
  operations["getDeliveryRequest"]["responses"][200]["content"]["application/json"];
type FavoriteCollectionResponse =
  operations["getDeliveryFavorites"]["responses"][200]["content"]["application/json"];
type FavoriteResponse =
  operations["putDeliveryRequestFavorite"]["responses"][200]["content"]["application/json"];
type FavoriteRequest =
  operations["putDeliveryRequestFavorite"]["requestBody"]["content"]["application/json"];
type CourierProfileResponse =
  operations["getDeliveryCourierProfile"]["responses"][200]["content"]["application/json"];
type SavedCourierProfileResponse =
  operations["putDeliveryCourierProfile"]["responses"][200]["content"]["application/json"];
type SavedCourierProfileRequest =
  operations["putDeliveryCourierProfile"]["requestBody"]["content"]["application/json"];
type CreatedRequestResponse =
  operations["postDeliveryRequest"]["responses"][201]["content"]["application/json"];
type CreatedRequestRequest =
  operations["postDeliveryRequest"]["requestBody"]["content"]["application/json"];
type PublishedRequestResponse =
  operations["postDeliveryRequestPublish"]["responses"][200]["content"]["application/json"];
type PublishedRequestRequest =
  operations["postDeliveryRequestPublish"]["requestBody"]["content"]["application/json"];
type OwnRequestsResponse =
  operations["getOwnDeliveryRequests"]["responses"][200]["content"]["application/json"];
type OwnApplicationsResponse =
  operations["getOwnDeliveryApplications"]["responses"][200]["content"]["application/json"];
type OwnRequestResponse =
  operations["getOwnDeliveryRequest"]["responses"][200]["content"]["application/json"];
type ApplicationResponse =
  operations["postDeliveryApplication"]["responses"][201]["content"]["application/json"];
type ApplicationRequest =
  operations["postDeliveryApplication"]["requestBody"]["content"]["application/json"];
type AcceptedApplicationResponse =
  operations["postDeliveryApplicationAccept"]["responses"][200]["content"]["application/json"];
type AcceptedApplicationRequest =
  operations["postDeliveryApplicationAccept"]["requestBody"]["content"]["application/json"];
type TransitionResponse =
  operations["postDeliveryRequestTransition"]["responses"][200]["content"]["application/json"];
type TransitionRequest =
  operations["postDeliveryRequestTransition"]["requestBody"]["content"]["application/json"];

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

export class HttpMobileDeliveryService implements MobileDeliveryService {
  async availability(marketCode: string): Promise<DeliveryFeatureAvailability> {
    return (await apiRequest<AvailabilityResponse>(
      `/delivery/availability?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    )) as DeliveryFeatureAvailability;
  }

  async search(input: DeliverySearchInput): Promise<DeliveryPublicRequest[]> {
    const query = new URLSearchParams({
      marketCode: input.marketCode,
      limit: String(input.limit),
    });
    if (input.pickupPostalCode)
      query.set("pickupPostalCode", input.pickupPostalCode);
    if (input.vehicleType) query.set("vehicleType", input.vehicleType);
    const result = await apiRequest<SearchResponse>(
      `/delivery/requests?${query.toString()}`,
      {},
      input.marketCode,
    );
    return [...result.items] as DeliveryPublicRequest[];
  }

  async getPublicRequest(
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPublicRequest> {
    return (await apiRequest<PublicRequestResponse>(
      `/delivery/requests/${encodeURIComponent(requestId)}?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    )) as DeliveryPublicRequest;
  }

  async getFavoriteRequestIds(
    _userId: string,
    marketCode: string,
  ): Promise<string[]> {
    const result = await apiRequest<FavoriteCollectionResponse>(
      "/delivery/favorites",
      {},
      marketCode,
    );
    return [...result.requestIds];
  }

  async setFavoriteRequest(
    _userId: string,
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const payload: FavoriteRequest = { isFavorite };
    const result = await apiRequest<FavoriteResponse>(
      `/delivery/requests/${encodeURIComponent(requestId)}/favorite`,
      { method: "PUT", body: JSON.stringify(payload) },
      marketCode,
    );
    return result.isFavorite;
  }

  async getCourierProfile(
    _actor: MobileDeliveryActor,
    marketCode: string,
  ): Promise<DeliveryCourierProfile | null> {
    return (await apiRequest<CourierProfileResponse>(
      `/delivery/courier/profile?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    )) as DeliveryCourierProfile | null;
  }

  async saveCourierProfile(
    _actor: MobileDeliveryActor,
    marketCode: string,
    input: DeliveryCourierProfileInput,
  ): Promise<DeliveryCourierProfile> {
    const payload: SavedCourierProfileRequest = { marketCode, ...input };
    return (await apiRequest<SavedCourierProfileResponse>(
      "/delivery/courier/profile",
      { method: "PUT", body: JSON.stringify(payload) },
      marketCode,
    )) as DeliveryCourierProfile;
  }

  async createAndPublish(
    _actor: MobileDeliveryActor,
    input: DeliveryRequestDraftInput,
  ): Promise<DeliveryPrivateRequest> {
    const createPayload: CreatedRequestRequest = input;
    const draft = await apiRequest<CreatedRequestResponse>(
      "/delivery/requests",
      { method: "POST", body: JSON.stringify(createPayload) },
      input.marketCode,
    );
    const publishPayload: PublishedRequestRequest = {
      marketCode: input.marketCode,
    };
    return (await apiRequest<PublishedRequestResponse>(
      `/delivery/requests/${encodeURIComponent(draft.id)}/publish`,
      {
        method: "POST",
        body: JSON.stringify(publishPayload),
      },
      input.marketCode,
    )) as DeliveryPrivateRequest;
  }

  async listOwnRequests(
    _actor: MobileDeliveryActor,
    marketCode: string,
  ): Promise<DeliveryPrivateRequest[]> {
    return (await apiRequest<OwnRequestsResponse>(
      `/delivery/me/requests?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    )) as DeliveryPrivateRequest[];
  }

  async listOwnApplications(
    _actor: MobileDeliveryActor,
    marketCode: string,
  ): Promise<DeliveryApplication[]> {
    return (await apiRequest<OwnApplicationsResponse>(
      `/delivery/me/applications?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    )) as DeliveryApplication[];
  }

  async getPrivateRequest(
    _actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPrivateRequest | DeliverySelectedCourierAssignment> {
    return (await apiRequest<OwnRequestResponse>(
      `/delivery/me/requests/${encodeURIComponent(requestId)}?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    )) as DeliveryPrivateRequest | DeliverySelectedCourierAssignment;
  }

  async submitApplication(
    _actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
    input: DeliveryApplicationInput,
  ): Promise<DeliveryApplication> {
    const payload: ApplicationRequest = { marketCode, ...input };
    return (await apiRequest<ApplicationResponse>(
      `/delivery/requests/${encodeURIComponent(requestId)}/applications`,
      { method: "POST", body: JSON.stringify(payload) },
      marketCode,
    )) as DeliveryApplication;
  }

  async acceptApplication(
    _actor: MobileDeliveryActor,
    requestId: string,
    applicationId: string,
    marketCode: string,
    expectedVersion: number,
  ): Promise<DeliveryPrivateRequest> {
    const payload: AcceptedApplicationRequest = {
      marketCode,
      expectedVersion,
    };
    return (await apiRequest<AcceptedApplicationResponse>(
      `/delivery/requests/${encodeURIComponent(requestId)}/applications/${encodeURIComponent(applicationId)}/accept`,
      { method: "POST", body: JSON.stringify(payload) },
      marketCode,
    )) as DeliveryPrivateRequest;
  }

  async transition(
    _actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
    status: DeliveryRequestStatus,
    expectedVersion: number,
  ): Promise<DeliveryPrivateRequest | DeliverySelectedCourierAssignment> {
    const payload: TransitionRequest = {
      marketCode,
      status,
      expectedVersion,
    };
    return (await apiRequest<TransitionResponse>(
      `/delivery/requests/${encodeURIComponent(requestId)}/transition`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      marketCode,
    )) as DeliveryPrivateRequest | DeliverySelectedCourierAssignment;
  }
}

export const deliveryService: MobileDeliveryService =
  new HttpMobileDeliveryService();
