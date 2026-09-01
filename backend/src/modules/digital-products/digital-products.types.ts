import type {
  CredentialAllocationMode,
  CredentialKind,
  DigitalAssetProjection,
  DigitalEntitlementProjection,
  DigitalFulfillmentVersionInput,
  DigitalMarketPolicy,
  DigitalProvisioningTask,
  DigitalSellerProfile,
  RevealedDigitalAccess,
} from "@shongre/contracts/digital-products";
import type {
  DigitalSecretEnvelope,
  DigitalSecretPayload,
} from "./digital-secret-envelope.js";

export type DigitalAccessReportType =
  | "INVALID_LINK"
  | "INVALID_CREDENTIALS"
  | "UNAVAILABLE_FILE"
  | "COMPROMISED_ACCESS"
  | "RESET_REQUEST"
  | "REPLACEMENT_REQUEST"
  | "PROVISIONING_FAILURE";

export interface DigitalAssetUploadInput {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  listingId?: string;
  replacesAssetId?: string;
}

export interface DigitalAssetUploadResult {
  asset: DigitalAssetProjection;
  signedUploadUrl: string;
  expiresAt: string;
}

export interface DigitalCredentialImportItem {
  fields: Array<{ kind: CredentialKind; label: string; value: string }>;
  destinationUrl?: string;
  instructions?: string;
  expiresAt?: string;
}

export interface DigitalCredentialBatchInput {
  listingId?: string;
  allocationMode: CredentialAllocationMode;
  credentialKinds: CredentialKind[];
}

export interface DigitalInventoryCounts {
  batchId: string;
  listingId: string | null;
  availableCount: number;
  reservedCount: number;
  consumedCount: number;
  canPurchase: boolean;
}

export interface DigitalFulfillmentVersionRecord extends DigitalFulfillmentVersionInput {
  id: string;
  listingId: string;
  sellerId: string;
  marketCode: string;
  policyId: string;
  policyVersion: number;
  version: number;
  status:
    "DRAFT" | "PROCESSING" | "READY" | "PUBLISHED" | "RETIRED" | "SUSPENDED";
  moderationStatus: "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED";
  createdAt: string;
  publishedAt: string | null;
}

export interface DigitalEntitlementSecretRecord {
  entitlement: DigitalEntitlementProjection;
  secretEnvelopes: DigitalSecretEnvelope[];
}

export interface DigitalAccessGrantRecord {
  id: string;
  entitlementId: string;
  buyerId: string;
  assetId: string | null;
  action: "DOWNLOAD" | "OPEN_LINK" | "REVEAL_SECRET";
  expiresAt: string;
  consumedAt: string | null;
}

export interface DigitalProductStore {
  getPolicy(marketCode: string): Promise<DigitalMarketPolicy | null>;
  getAdminPolicy(marketCode: string): Promise<DigitalMarketPolicy | null>;
  getPolicyById(policyId: string): Promise<DigitalMarketPolicy | null>;
  createPolicyDraft(
    staffId: string,
    policy: DigitalMarketPolicy,
    reason: string,
  ): Promise<DigitalMarketPolicy>;
  activatePolicy(
    staffId: string,
    policyId: string,
    reason: string,
  ): Promise<DigitalMarketPolicy>;
  getSellerProfile(
    sellerId: string,
    marketCode: string,
  ): Promise<DigitalSellerProfile | null>;
  saveSellerProfile(
    profile: DigitalSellerProfile,
  ): Promise<DigitalSellerProfile>;
  createAssetUpload(
    ownerUserId: string,
    input: DigitalAssetUploadInput,
    policy: DigitalMarketPolicy,
  ): Promise<DigitalAssetUploadResult>;
  completeAssetUpload(
    ownerUserId: string,
    assetId: string,
    policy: DigitalMarketPolicy,
  ): Promise<DigitalAssetProjection>;
  getAsset(
    ownerUserId: string,
    marketCode: string,
    assetId: string,
  ): Promise<DigitalAssetProjection | null>;
  removeAsset(
    ownerUserId: string,
    marketCode: string,
    assetId: string,
  ): Promise<void>;
  createAccessSecret(
    ownerUserId: string,
    marketCode: string,
    listingId: string | undefined,
    targetDomain: string | undefined,
    envelope: DigitalSecretEnvelope,
  ): Promise<string>;
  createCredentialBatch(
    ownerUserId: string,
    marketCode: string,
    input: DigitalCredentialBatchInput,
  ): Promise<{ id: string; version: number }>;
  importCredentialInventory(
    ownerUserId: string,
    marketCode: string,
    batchId: string,
    items: Array<{ envelope: DigitalSecretEnvelope; expiresAt?: string }>,
  ): Promise<DigitalInventoryCounts>;
  getInventory(
    ownerUserId: string,
    marketCode: string,
    batchId: string,
  ): Promise<DigitalInventoryCounts | null>;
  createFulfillmentVersion(
    ownerUserId: string,
    listingId: string,
    input: DigitalFulfillmentVersionInput,
    policy: DigitalMarketPolicy,
  ): Promise<DigitalFulfillmentVersionRecord>;
  assertPurchasableListing(
    listingId: string,
    marketCode: string,
  ): Promise<{
    fulfillmentVersionId: string;
    fulfillmentModel: import("@shongre/contracts/digital-products").DigitalFulfillmentType;
    productVersion: string;
  }>;
  confirmPaidOrder(
    orderId: string,
    paymentIntentId: string,
    requestId: string,
  ): Promise<string>;
  applyOrderAccessState(
    orderId: string,
    state: "DISPUTED" | "REFUND_REQUESTED" | "REFUNDED" | "REVERSED",
  ): Promise<void>;
  listBuyerEntitlements(
    buyerId: string,
    marketCode: string,
  ): Promise<DigitalEntitlementProjection[]>;
  getBuyerEntitlement(
    buyerId: string,
    marketCode: string,
    entitlementId: string,
  ): Promise<DigitalEntitlementProjection | null>;
  listSellerProvisioningTasks(
    sellerId: string,
    marketCode: string,
  ): Promise<DigitalProvisioningTask[]>;
  getSellerEntitlementPolicy(
    sellerId: string,
    marketCode: string,
    entitlementId: string,
  ): Promise<DigitalMarketPolicy | null>;
  issueAccessGrant(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    assetId?: string;
    action: "DOWNLOAD" | "OPEN_LINK" | "REVEAL_SECRET";
    requestId: string;
  }): Promise<DigitalAccessGrantRecord>;
  consumeAccessGrant(
    buyerId: string,
    grantId: string,
  ): Promise<DigitalAccessGrantRecord | null>;
  getAssetDownload(
    assetId: string,
  ): Promise<{ privatePath: string; safeFileName: string } | null>;
  revealBuyerSecret(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    requestId: string;
  }): Promise<DigitalEntitlementSecretRecord | null>;
  getSecretForConsumedGrant(input: {
    buyerId: string;
    grantId: string;
    entitlementId: string;
  }): Promise<DigitalEntitlementSecretRecord | null>;
  submitProvisionedAccess(input: {
    sellerId: string;
    entitlementId: string;
    targetDomain?: string;
    envelope: DigitalSecretEnvelope;
    requestId: string;
  }): Promise<void>;
  createAccessReport(input: {
    buyerId: string;
    marketCode: string;
    entitlementId: string;
    reportType: DigitalAccessReportType;
    safeDescription: string;
  }): Promise<{ id: string; status: "OPEN" }>;
  resolveAccessReport(input: {
    staffId: string;
    marketCode: string;
    reportId: string;
    resolutionCode: string;
    entitlementStatus?: "ACCESS_AVAILABLE" | "REVOKED" | "UNAVAILABLE";
  }): Promise<void>;
  moderateAsset(input: {
    staffId: string;
    marketCode: string;
    assetId: string;
    decision: "APPROVED" | "REJECTED";
  }): Promise<DigitalAssetProjection>;
  moderateFulfillmentVersion(input: {
    staffId: string;
    marketCode: string;
    fulfillmentVersionId: string;
    decision: "APPROVED" | "REJECTED";
  }): Promise<DigitalFulfillmentVersionRecord>;
  getAdminOverview(marketCode: string): Promise<{
    assets: DigitalAssetProjection[];
    inventory: DigitalInventoryCounts[];
    entitlements: DigitalEntitlementProjection[];
    openReportCount: number;
  }>;
}

export type { DigitalSecretPayload, RevealedDigitalAccess };
