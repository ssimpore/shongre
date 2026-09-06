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

export interface DeliveryActor {
  userId: string;
  displayName: string;
  verified: boolean;
}

export interface DeliveryServiceContract {
  getAvailability(marketCode: string): Promise<DeliveryFeatureAvailability>;
  search(input: DeliverySearchInput): Promise<DeliveryPublicRequestPage>;
  getPublicRequest(
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPublicRequest>;
  getFavoriteRequestIds(
    accountId: string,
    marketCode: string,
  ): Promise<string[]>;
  setFavoriteRequest(
    accountId: string,
    requestId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean>;
  getCourierProfile(
    actor: DeliveryActor,
    marketCode: string,
  ): Promise<DeliveryCourierProfile | null>;
  saveCourierProfile(
    actor: DeliveryActor,
    marketCode: string,
    input: DeliveryCourierProfileInput,
  ): Promise<DeliveryCourierProfile>;
  createDraft(
    actor: DeliveryActor,
    input: DeliveryRequestDraftInput,
  ): Promise<DeliveryPrivateRequest>;
  publishRequest(
    actor: DeliveryActor,
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPrivateRequest>;
  listOwnRequests(
    actor: DeliveryActor,
    marketCode: string,
  ): Promise<DeliveryPrivateRequest[]>;
  getPrivateRequest(
    actor: DeliveryActor,
    requestId: string,
    marketCode: string,
  ): Promise<DeliveryPrivateRequest | DeliverySelectedCourierAssignment>;
  submitApplication(
    actor: DeliveryActor,
    requestId: string,
    marketCode: string,
    input: DeliveryApplicationInput,
  ): Promise<DeliveryApplication>;
  listOwnApplications(
    actor: DeliveryActor,
    marketCode: string,
  ): Promise<DeliveryApplication[]>;
  withdrawApplication(
    actor: DeliveryActor,
    applicationId: string,
  ): Promise<DeliveryApplication>;
  acceptApplication(
    actor: DeliveryActor,
    requestId: string,
    applicationId: string,
    marketCode: string,
    expectedVersion: number,
  ): Promise<DeliveryPrivateRequest>;
  transition(
    actor: DeliveryActor,
    requestId: string,
    marketCode: string,
    status: DeliveryRequestStatus,
    expectedVersion: number,
    note?: string,
  ): Promise<DeliveryPrivateRequest | DeliverySelectedCourierAssignment>;
  suspendUnsafe(
    actor: DeliveryActor,
    requestId: string,
    marketCode: string,
    reason: string,
    expectedVersion?: number,
  ): Promise<DeliveryPublicRequest>;
}
