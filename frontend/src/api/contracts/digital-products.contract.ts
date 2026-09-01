import type {
  CredentialAllocationMode,
  CredentialKind,
  DigitalAccessGrant,
  DigitalAssetProjection,
  DigitalEntitlementProjection,
  DigitalFulfillmentVersionInput,
  DigitalMarketPolicy,
  DigitalPolicyProjection,
  DigitalProvisioningTask,
  DigitalSellerProfile,
  FulfillmentType,
} from "@shongre/contracts/digital-products";

export type DigitalAccessReportType =
  | "INVALID_LINK"
  | "INVALID_CREDENTIALS"
  | "UNAVAILABLE_FILE"
  | "COMPROMISED_ACCESS"
  | "RESET_REQUEST"
  | "REPLACEMENT_REQUEST"
  | "PROVISIONING_FAILURE";

export interface DigitalSecretInput {
  listingId?: string;
  productAccessClass: string;
  destinationUrl?: string;
  displayDomain?: string;
  fields?: Array<{ kind: CredentialKind; label: string; value: string }>;
  instructions?: string;
}

export type ConsumedDigitalAccess =
  | {
      kind: "DOWNLOAD";
      url: string;
      fileName: string;
      expiresAt: string;
      simulated: boolean;
    }
  | {
      kind: "EXTERNAL_LINK" | "CREDENTIALS";
      entitlementId: string;
      destinationUrl: string | null;
      destinationDomain: string | null;
      fields: Array<{ kind: CredentialKind; label: string; value: string }>;
      instructions: string[];
      revealedAt: string;
      remainingReveals: number | null;
      simulated: boolean;
    };

export interface DigitalAdminOverview {
  assets: DigitalAssetProjection[];
  inventory: Array<{
    batchId: string;
    listingId: string | null;
    availableCount: number;
    reservedCount: number;
    consumedCount: number;
    canPurchase: boolean;
  }>;
  entitlements: DigitalEntitlementProjection[];
  openReportCount: number;
}

export interface DigitalProductsServiceContract {
  getPolicy(marketCode: string): Promise<DigitalPolicyProjection>;
  getSellerProfile(
    marketCode: string,
    sellerId: string,
  ): Promise<DigitalSellerProfile | null>;
  acceptSellerResponsibilities(
    marketCode: string,
    sellerId: string,
    fulfillmentTypes: FulfillmentType[],
    acceptedPolicyVersion: number,
  ): Promise<DigitalSellerProfile>;
  initializePrivateUpload(
    marketCode: string,
    input: {
      fileName: string;
      contentType: string;
      sizeBytes: number;
      listingId?: string;
      replacesAssetId?: string;
    },
  ): Promise<{
    asset: DigitalAssetProjection;
    signedUploadUrl: string;
    expiresAt: string;
  }>;
  uploadPrivateFile(
    marketCode: string,
    file: File,
    input?: { listingId?: string; replacesAssetId?: string },
  ): Promise<DigitalAssetProjection>;
  completePrivateUpload(
    marketCode: string,
    assetId: string,
  ): Promise<DigitalAssetProjection>;
  getAsset(
    marketCode: string,
    assetId: string,
  ): Promise<DigitalAssetProjection>;
  removeAsset(marketCode: string, assetId: string): Promise<void>;
  createProtectedAccess(
    marketCode: string,
    input: DigitalSecretInput,
  ): Promise<{ id: string; destinationDomain: string | null; masked: true }>;
  createCredentialBatch(
    marketCode: string,
    input: {
      listingId?: string;
      productAccessClass: string;
      allocationMode: CredentialAllocationMode;
      credentialKinds: CredentialKind[];
    },
  ): Promise<{ id: string; version: number }>;
  importCredentialInventory(
    marketCode: string,
    batchId: string,
    input: {
      productAccessClass: string;
      credentials: Array<
        Omit<DigitalSecretInput, "listingId" | "productAccessClass"> & {
          expiresAt?: string;
        }
      >;
    },
  ): Promise<{
    batchId: string;
    listingId: string | null;
    availableCount: number;
    reservedCount: number;
    consumedCount: number;
    canPurchase: boolean;
  }>;
  getCredentialInventory(
    marketCode: string,
    batchId: string,
  ): Promise<{
    batchId: string;
    listingId: string | null;
    availableCount: number;
    reservedCount: number;
    consumedCount: number;
    canPurchase: boolean;
  }>;
  createFulfillmentVersion(
    marketCode: string,
    listingId: string,
    input: DigitalFulfillmentVersionInput,
  ): Promise<
    DigitalFulfillmentVersionInput & {
      id: string;
      version: number;
      status: string;
      moderationStatus: string;
    }
  >;
  listSellerProvisioningTasks(
    marketCode: string,
    sellerId: string,
  ): Promise<DigitalProvisioningTask[]>;
  listEntitlements(
    marketCode: string,
    buyerId: string,
  ): Promise<DigitalEntitlementProjection[]>;
  getEntitlement(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
  ): Promise<DigitalEntitlementProjection>;
  createDownloadGrant(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
    assetId: string,
  ): Promise<DigitalAccessGrant>;
  createRevealGrant(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
  ): Promise<DigitalAccessGrant>;
  consumeAccessGrant(
    buyerId: string,
    grantId: string,
  ): Promise<ConsumedDigitalAccess>;
  submitProvisionedAccess(
    marketCode: string,
    entitlementId: string,
    input: DigitalSecretInput,
  ): Promise<void>;
  reportInvalidAccess(
    marketCode: string,
    buyerId: string,
    entitlementId: string,
    reportType: DigitalAccessReportType,
    description: string,
  ): Promise<{ id: string; status: "OPEN" }>;
  getAdminOverview(marketCode: string): Promise<DigitalAdminOverview>;
  getAdminPolicy(marketCode: string): Promise<DigitalMarketPolicy>;
  createAdminPolicyDraft(
    marketCode: string,
    policy: DigitalMarketPolicy,
    reason: string,
  ): Promise<DigitalMarketPolicy>;
  activateAdminPolicy(
    marketCode: string,
    policyId: string,
    reason: string,
  ): Promise<DigitalMarketPolicy>;
  moderateAsset(
    marketCode: string,
    assetId: string,
    decision: "APPROVED" | "REJECTED",
  ): Promise<DigitalAssetProjection>;
  moderateFulfillmentVersion(
    marketCode: string,
    fulfillmentVersionId: string,
    decision: "APPROVED" | "REJECTED",
  ): Promise<unknown>;
  resolveAccessReport(
    marketCode: string,
    reportId: string,
    input: {
      resolutionCode: string;
      entitlementStatus?: "ACCESS_AVAILABLE" | "REVOKED" | "UNAVAILABLE";
    },
  ): Promise<void>;
}
