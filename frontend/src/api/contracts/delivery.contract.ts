import type {
  DeliveryApplication,
  DeliveryApplicationInput,
  DeliveryCourierProfile,
  DeliveryCourierProfileInput,
  DeliveryFeatureAvailability,
  DeliveryPrivateRequest,
  DeliveryPublicRequest,
  DeliveryPublicRequestPage,
  DeliverySelectedCourierAssignment,
  DeliveryRequestDraftInput,
  DeliveryRequestStatus,
  DeliverySearchInput,
} from "@shongre/contracts/delivery";

export interface DeliveryServiceContract {
  getAvailability(marketCode: string): Promise<DeliveryFeatureAvailability>;
  search(input: DeliverySearchInput): Promise<DeliveryPublicRequestPage>;
  getPublicRequest(
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPublicRequest>;
  getFavoriteRequestIds(marketCode: string): Promise<string[]>;
  setFavoriteRequest(
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean>;
  getCourierProfile(marketCode: string): Promise<DeliveryCourierProfile | null>;
  saveCourierProfile(
    marketCode: string,
    input: DeliveryCourierProfileInput,
  ): Promise<DeliveryCourierProfile>;
  createDraft(
    input: DeliveryRequestDraftInput,
  ): Promise<DeliveryPrivateRequest>;
  publishRequest(
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPrivateRequest>;
  listOwnRequests(marketCode: string): Promise<DeliveryPrivateRequest[]>;
  getPrivateRequest(
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPrivateRequest | DeliverySelectedCourierAssignment>;
  submitApplication(
    requestId: string,
    marketCode: string,
    input: DeliveryApplicationInput,
  ): Promise<DeliveryApplication>;
  listOwnApplications(marketCode: string): Promise<DeliveryApplication[]>;
  withdrawApplication(applicationId: string): Promise<DeliveryApplication>;
  acceptApplication(
    requestId: string,
    applicationId: string,
    marketCode: string,
    expectedVersion: number,
  ): Promise<DeliveryPrivateRequest>;
  transition(
    requestId: string,
    marketCode: string,
    status: DeliveryRequestStatus,
    expectedVersion: number,
    note?: string,
  ): Promise<DeliveryPrivateRequest | DeliverySelectedCourierAssignment>;
  suspendUnsafe(
    requestId: string,
    marketCode: string,
    reason: string,
    expectedVersion?: number,
  ): Promise<DeliveryPublicRequest>;
}
