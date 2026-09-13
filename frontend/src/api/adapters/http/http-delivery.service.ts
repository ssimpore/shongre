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
  async getFavoriteRequestIds(marketCode: string) {
    const result = await apiOperation<
      { requestIds: string[] },
      "getDeliveryFavorites"
    >("getDeliveryFavorites", { headers: { "X-Shongre-Market": marketCode } });
    return result.requestIds;
  }
  async setFavoriteRequest(
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
  getCourierProfile(marketCode: string) {
    return apiOperation<
      DeliveryCourierProfile | null,
      "getDeliveryCourierProfile"
    >("getDeliveryCourierProfile", { query: { marketCode } });
  }
  saveCourierProfile(
    marketCode: string,
    input: Parameters<DeliveryServiceContract["saveCourierProfile"]>[1],
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
  createDraft(input: Parameters<DeliveryServiceContract["createDraft"]>[0]) {
    return apiOperation<DeliveryPrivateRequest, "postDeliveryRequest">(
      "postDeliveryRequest",
      { body: input },
    );
  }
  publishRequest(requestId: string, marketCode: string) {
    return apiOperation<DeliveryPrivateRequest, "postDeliveryRequestPublish">(
      "postDeliveryRequestPublish",
      { path: { requestId: requestId }, body: { marketCode } },
    );
  }
  listOwnRequests(marketCode: string) {
    return apiOperation<DeliveryPrivateRequest[], "getOwnDeliveryRequests">(
      "getOwnDeliveryRequests",
      { query: { marketCode } },
    );
  }
  getPrivateRequest(requestId: string, marketCode: string) {
    return apiOperation<
      DeliveryPrivateRequest | DeliverySelectedCourierAssignment,
      "getOwnDeliveryRequest"
    >("getOwnDeliveryRequest", {
      path: { requestId: requestId },
      query: { marketCode },
    });
  }
  submitApplication(
    requestId: string,
    marketCode: string,
    input: Parameters<DeliveryServiceContract["submitApplication"]>[2],
  ) {
    return apiOperation<DeliveryApplication, "postDeliveryApplication">(
      "postDeliveryApplication",
      { path: { requestId: requestId }, body: { marketCode, ...input } },
    );
  }
  listOwnApplications(marketCode: string) {
    return apiOperation<DeliveryApplication[], "getOwnDeliveryApplications">(
      "getOwnDeliveryApplications",
      { query: { marketCode } },
    );
  }
  withdrawApplication(applicationId: string) {
    return apiOperation<DeliveryApplication, "postDeliveryApplicationWithdraw">(
      "postDeliveryApplicationWithdraw",
      { path: { applicationId: applicationId }, body: {} },
    );
  }
  acceptApplication(
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
    requestId: string,
    marketCode: string,
    status: Parameters<DeliveryServiceContract["transition"]>[2],
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
