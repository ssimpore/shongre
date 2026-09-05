import type { DeliveryServiceContract } from "../../contracts/delivery.contract";
import type {
  DeliveryApplication,
  DeliveryCourierProfile,
  DeliveryFeatureAvailability,
  DeliveryPrivateRequest,
  DeliveryPublicRequest,
  DeliveryPublicRequestPage,
  DeliverySelectedCourierAssignment,
} from "@shongre/contracts/delivery";
import { httpClient } from "./http-client";

export class HttpDeliveryService implements DeliveryServiceContract {
  getAvailability(marketCode: string) {
    return httpClient.get<DeliveryFeatureAvailability>(
      "/delivery/availability",
      { params: { marketCode } },
    );
  }
  search(input: Parameters<DeliveryServiceContract["search"]>[0]) {
    return httpClient.get<DeliveryPublicRequestPage>("/delivery/requests", {
      params: input,
    });
  }
  getPublicRequest(requestId: string, marketCode: string) {
    return httpClient.get<DeliveryPublicRequest>(
      `/delivery/requests/${encodeURIComponent(requestId)}`,
      { params: { marketCode } },
    );
  }
  getCourierProfile(
    _actor: Parameters<DeliveryServiceContract["getCourierProfile"]>[0],
    marketCode: string,
  ) {
    return httpClient.get<DeliveryCourierProfile | null>(
      "/delivery/courier/profile",
      { params: { marketCode } },
    );
  }
  saveCourierProfile(
    _actor: Parameters<DeliveryServiceContract["saveCourierProfile"]>[0],
    marketCode: string,
    input: Parameters<DeliveryServiceContract["saveCourierProfile"]>[2],
  ) {
    return httpClient.put<DeliveryCourierProfile>("/delivery/courier/profile", {
      marketCode,
      ...input,
    });
  }
  createDraft(
    _actor: Parameters<DeliveryServiceContract["createDraft"]>[0],
    input: Parameters<DeliveryServiceContract["createDraft"]>[1],
  ) {
    return httpClient.post<DeliveryPrivateRequest>("/delivery/requests", input);
  }
  publishRequest(
    _actor: Parameters<DeliveryServiceContract["publishRequest"]>[0],
    requestId: string,
    marketCode: string,
  ) {
    return httpClient.post<DeliveryPrivateRequest>(
      `/delivery/requests/${encodeURIComponent(requestId)}/publish`,
      { marketCode },
    );
  }
  listOwnRequests(
    _actor: Parameters<DeliveryServiceContract["listOwnRequests"]>[0],
    marketCode: string,
  ) {
    return httpClient.get<DeliveryPrivateRequest[]>("/delivery/me/requests", {
      params: { marketCode },
    });
  }
  getPrivateRequest(
    _actor: Parameters<DeliveryServiceContract["getPrivateRequest"]>[0],
    requestId: string,
    marketCode: string,
  ) {
    return httpClient.get<
      DeliveryPrivateRequest | DeliverySelectedCourierAssignment
    >(`/delivery/me/requests/${encodeURIComponent(requestId)}`, {
      params: { marketCode },
    });
  }
  submitApplication(
    _actor: Parameters<DeliveryServiceContract["submitApplication"]>[0],
    requestId: string,
    marketCode: string,
    input: Parameters<DeliveryServiceContract["submitApplication"]>[3],
  ) {
    return httpClient.post<DeliveryApplication>(
      `/delivery/requests/${encodeURIComponent(requestId)}/applications`,
      { marketCode, ...input },
    );
  }
  listOwnApplications(
    _actor: Parameters<DeliveryServiceContract["listOwnApplications"]>[0],
    marketCode: string,
  ) {
    return httpClient.get<DeliveryApplication[]>("/delivery/me/applications", {
      params: { marketCode },
    });
  }
  withdrawApplication(
    _actor: Parameters<DeliveryServiceContract["withdrawApplication"]>[0],
    applicationId: string,
  ) {
    return httpClient.post<DeliveryApplication>(
      `/delivery/applications/${encodeURIComponent(applicationId)}/withdraw`,
      {},
    );
  }
  acceptApplication(
    _actor: Parameters<DeliveryServiceContract["acceptApplication"]>[0],
    requestId: string,
    applicationId: string,
    marketCode: string,
    expectedVersion: number,
  ) {
    return httpClient.post<DeliveryPrivateRequest>(
      `/delivery/requests/${encodeURIComponent(requestId)}/applications/${encodeURIComponent(applicationId)}/accept`,
      { marketCode, expectedVersion },
    );
  }
  transition(
    _actor: Parameters<DeliveryServiceContract["transition"]>[0],
    requestId: string,
    marketCode: string,
    status: Parameters<DeliveryServiceContract["transition"]>[3],
    expectedVersion: number,
    note?: string,
  ) {
    return httpClient.post<
      DeliveryPrivateRequest | DeliverySelectedCourierAssignment
    >(`/delivery/requests/${encodeURIComponent(requestId)}/transition`, {
      marketCode,
      status,
      expectedVersion,
      note,
    });
  }
  suspendUnsafe(
    _actor: Parameters<DeliveryServiceContract["suspendUnsafe"]>[0],
    requestId: string,
    marketCode: string,
    reason: string,
    expectedVersion?: number,
  ) {
    return httpClient.post<DeliveryPublicRequest>(
      `/admin/delivery/requests/${encodeURIComponent(requestId)}/suspend`,
      { marketCode, reason, expectedVersion },
    );
  }
}

export const httpDeliveryService = new HttpDeliveryService();
