import type { DeliveryServiceContract } from "../../contracts/delivery.contract";
import { apiOperation } from "./generated-api-operation";
import type {
  DeliveryApplication,
  DeliveryCourierProfile,
  DeliveryFeatureAvailability,
  DeliveryPrivateRequest,
  DeliveryPublicRequest,
  DeliveryPublicRequestPage,
  DeliverySelectedCourierAssignment,
} from "@shongre/contracts/delivery";

export class HttpDeliveryService implements DeliveryServiceContract {
  getAvailability(marketCode: string) {
    return apiOperation<DeliveryFeatureAvailability, "getDeliveryAvailability">(
      "getDeliveryAvailability",
      { query: { marketCode } },
    );
  }
  search(input: Parameters<DeliveryServiceContract["search"]>[0]) {
    return apiOperation<DeliveryPublicRequestPage, "getDeliveryRequests">(
      "getDeliveryRequests",
      { query: input },
    );
  }
  getPublicRequest(requestId: string, marketCode: string) {
    return apiOperation<DeliveryPublicRequest, "getDeliveryRequest">(
      "getDeliveryRequest",
      { path: { requestId: requestId }, query: { marketCode } },
    );
  }
  async getFavoriteRequestIds(
    _actor: Parameters<DeliveryServiceContract["getFavoriteRequestIds"]>[0],
    marketCode: string,
  ) {
    const result = await apiOperation<
      { requestIds: string[] },
      "getDeliveryFavorites"
    >("getDeliveryFavorites", { headers: { "X-Shongre-Market": marketCode } });
    return result.requestIds;
  }
  async setFavoriteRequest(
    _actor: Parameters<DeliveryServiceContract["setFavoriteRequest"]>[0],
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ) {
    const result = await apiOperation<
      { isFavorite: boolean },
      "putDeliveryRequestFavorite"
    >("putDeliveryRequestFavorite", {
      path: { requestId: requestId },
      body: { isFavorite },
      headers: { "X-Shongre-Market": marketCode },
    });
    return result.isFavorite;
  }
  getCourierProfile(
    _actor: Parameters<DeliveryServiceContract["getCourierProfile"]>[0],
    marketCode: string,
  ) {
    return apiOperation<
      DeliveryCourierProfile | null,
      "getDeliveryCourierProfile"
    >("getDeliveryCourierProfile", { query: { marketCode } });
  }
  saveCourierProfile(
    _actor: Parameters<DeliveryServiceContract["saveCourierProfile"]>[0],
    marketCode: string,
    input: Parameters<DeliveryServiceContract["saveCourierProfile"]>[2],
  ) {
    return apiOperation<DeliveryCourierProfile, "putDeliveryCourierProfile">(
      "putDeliveryCourierProfile",
      {
        body: {
          marketCode,
          ...input,
        },
      },
    );
  }
  createDraft(
    _actor: Parameters<DeliveryServiceContract["createDraft"]>[0],
    input: Parameters<DeliveryServiceContract["createDraft"]>[1],
  ) {
    return apiOperation<DeliveryPrivateRequest, "postDeliveryRequest">(
      "postDeliveryRequest",
      { body: input },
    );
  }
  publishRequest(
    _actor: Parameters<DeliveryServiceContract["publishRequest"]>[0],
    requestId: string,
    marketCode: string,
  ) {
    return apiOperation<DeliveryPrivateRequest, "postDeliveryRequestPublish">(
      "postDeliveryRequestPublish",
      { path: { requestId: requestId }, body: { marketCode } },
    );
  }
  listOwnRequests(
    _actor: Parameters<DeliveryServiceContract["listOwnRequests"]>[0],
    marketCode: string,
  ) {
    return apiOperation<DeliveryPrivateRequest[], "getOwnDeliveryRequests">(
      "getOwnDeliveryRequests",
      { query: { marketCode } },
    );
  }
  getPrivateRequest(
    _actor: Parameters<DeliveryServiceContract["getPrivateRequest"]>[0],
    requestId: string,
    marketCode: string,
  ) {
    return apiOperation<
      DeliveryPrivateRequest | DeliverySelectedCourierAssignment,
      "getOwnDeliveryRequest"
    >("getOwnDeliveryRequest", {
      path: { requestId: requestId },
      query: { marketCode },
    });
  }
  submitApplication(
    _actor: Parameters<DeliveryServiceContract["submitApplication"]>[0],
    requestId: string,
    marketCode: string,
    input: Parameters<DeliveryServiceContract["submitApplication"]>[3],
  ) {
    return apiOperation<DeliveryApplication, "postDeliveryApplication">(
      "postDeliveryApplication",
      { path: { requestId: requestId }, body: { marketCode, ...input } },
    );
  }
  listOwnApplications(
    _actor: Parameters<DeliveryServiceContract["listOwnApplications"]>[0],
    marketCode: string,
  ) {
    return apiOperation<DeliveryApplication[], "getOwnDeliveryApplications">(
      "getOwnDeliveryApplications",
      { query: { marketCode } },
    );
  }
  withdrawApplication(
    _actor: Parameters<DeliveryServiceContract["withdrawApplication"]>[0],
    applicationId: string,
  ) {
    return apiOperation<DeliveryApplication, "postDeliveryApplicationWithdraw">(
      "postDeliveryApplicationWithdraw",
      { path: { applicationId: applicationId }, body: {} },
    );
  }
  acceptApplication(
    _actor: Parameters<DeliveryServiceContract["acceptApplication"]>[0],
    requestId: string,
    applicationId: string,
    marketCode: string,
    expectedVersion: number,
  ) {
    return apiOperation<
      DeliveryPrivateRequest,
      "postDeliveryApplicationAccept"
    >("postDeliveryApplicationAccept", {
      path: { requestId: requestId, applicationId: applicationId },
      body: { marketCode, expectedVersion },
    });
  }
  transition(
    _actor: Parameters<DeliveryServiceContract["transition"]>[0],
    requestId: string,
    marketCode: string,
    status: Parameters<DeliveryServiceContract["transition"]>[3],
    expectedVersion: number,
    note?: string,
  ) {
    return apiOperation<
      DeliveryPrivateRequest | DeliverySelectedCourierAssignment,
      "postDeliveryRequestTransition"
    >("postDeliveryRequestTransition", {
      path: { requestId: requestId },
      body: {
        marketCode,
        status,
        expectedVersion,
        note,
      },
    });
  }
  suspendUnsafe(
    _actor: Parameters<DeliveryServiceContract["suspendUnsafe"]>[0],
    requestId: string,
    marketCode: string,
    reason: string,
    expectedVersion?: number,
  ) {
    return apiOperation<
      DeliveryPublicRequest,
      "postAdminDeliveryRequestSuspend"
    >("postAdminDeliveryRequestSuspend", {
      path: { requestId: requestId },
      body: { marketCode, reason, expectedVersion },
    });
  }
}

export const httpDeliveryService = new HttpDeliveryService();
