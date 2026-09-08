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
import { apiOperation } from "@/api/generated-api-operation";
import type { operations } from "@shongre/contracts/openapi";
type FavoriteRequest =
  operations["putDeliveryRequestFavorite"]["requestBody"]["content"]["application/json"];
type SavedCourierProfileRequest =
  operations["putDeliveryCourierProfile"]["requestBody"]["content"]["application/json"];
type CreatedRequestRequest =
  operations["postDeliveryRequest"]["requestBody"]["content"]["application/json"];
type PublishedRequestRequest =
  operations["postDeliveryRequestPublish"]["requestBody"]["content"]["application/json"];
type ApplicationRequest =
  operations["postDeliveryApplication"]["requestBody"]["content"]["application/json"];
type AcceptedApplicationRequest =
  operations["postDeliveryApplicationAccept"]["requestBody"]["content"]["application/json"];
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
    return (await apiOperation(
      "getDeliveryAvailability",
      {},
      marketCode,
    )) as DeliveryFeatureAvailability;
  }

  async search(input: DeliverySearchInput): Promise<DeliveryPublicRequest[]> {
    const result = await apiOperation(
      "getDeliveryRequests",
      {
        query: {
          limit: String(input.limit),
          ...(input.pickupPostalCode
            ? { pickupPostalCode: input.pickupPostalCode }
            : {}),
          ...(input.vehicleType ? { vehicleType: input.vehicleType } : {}),
        },
      },
      input.marketCode,
    );
    return [...result.items] as DeliveryPublicRequest[];
  }

  async getPublicRequest(
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPublicRequest> {
    return (await apiOperation(
      "getDeliveryRequest",
      { path: { requestId } },
      marketCode,
    )) as DeliveryPublicRequest;
  }

  async getFavoriteRequestIds(
    _userId: string,
    marketCode: string,
  ): Promise<string[]> {
    const result = await apiOperation("getDeliveryFavorites", {}, marketCode);
    return [...result.requestIds];
  }

  async setFavoriteRequest(
    _userId: string,
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean> {
    const payload: FavoriteRequest = { isFavorite };
    const result = await apiOperation(
      "putDeliveryRequestFavorite",
      { path: { requestId: requestId }, body: payload },
      marketCode,
    );
    return result.isFavorite;
  }

  async getCourierProfile(
    _actor: MobileDeliveryActor,
    marketCode: string,
  ): Promise<DeliveryCourierProfile | null> {
    return (await apiOperation(
      "getDeliveryCourierProfile",
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
    return (await apiOperation(
      "putDeliveryCourierProfile",
      { body: payload },
      marketCode,
    )) as DeliveryCourierProfile;
  }

  async createAndPublish(
    _actor: MobileDeliveryActor,
    input: DeliveryRequestDraftInput,
  ): Promise<DeliveryPrivateRequest> {
    const createPayload: CreatedRequestRequest = input;
    const draft = await apiOperation(
      "postDeliveryRequest",
      { body: createPayload },
      input.marketCode,
    );
    const publishPayload: PublishedRequestRequest = {
      marketCode: input.marketCode,
    };
    return (await apiOperation(
      "postDeliveryRequestPublish",
      { path: { requestId: draft.id }, body: publishPayload },
      input.marketCode,
    )) as DeliveryPrivateRequest;
  }

  async listOwnRequests(
    _actor: MobileDeliveryActor,
    marketCode: string,
  ): Promise<DeliveryPrivateRequest[]> {
    return (await apiOperation(
      "getOwnDeliveryRequests",
      {},
      marketCode,
    )) as DeliveryPrivateRequest[];
  }

  async listOwnApplications(
    _actor: MobileDeliveryActor,
    marketCode: string,
  ): Promise<DeliveryApplication[]> {
    return (await apiOperation(
      "getOwnDeliveryApplications",
      {},
      marketCode,
    )) as DeliveryApplication[];
  }

  async getPrivateRequest(
    _actor: MobileDeliveryActor,
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPrivateRequest | DeliverySelectedCourierAssignment> {
    return (await apiOperation(
      "getOwnDeliveryRequest",
      { path: { requestId } },
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
    return (await apiOperation(
      "postDeliveryApplication",
      { path: { requestId: requestId }, body: payload },
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
    return (await apiOperation(
      "postDeliveryApplicationAccept",
      {
        path: { requestId: requestId, applicationId: applicationId },
        body: payload,
      },
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
    return (await apiOperation(
      "postDeliveryRequestTransition",
      { path: { requestId: requestId }, body: payload },
      marketCode,
    )) as DeliveryPrivateRequest | DeliverySelectedCourierAssignment;
  }
}

export const deliveryService: MobileDeliveryService =
  new HttpMobileDeliveryService();
