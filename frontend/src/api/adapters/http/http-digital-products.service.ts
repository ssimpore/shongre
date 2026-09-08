import type {
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
import { apiOperation } from "./generated-api-operation";
import type {
  ConsumedDigitalAccess,
  DigitalProductsServiceContract,
  DigitalSecretInput,
  DigitalAccessReportType,
} from "../../contracts/digital-products.contract";

const marketHeaders = (marketCode: string) => ({
  "X-Shongre-Market": marketCode,
});

export class HttpDigitalProductsService implements DigitalProductsServiceContract {
  getPolicy(marketCode: string) {
    return apiOperation<DigitalPolicyProjection, "getDigitalPolicy">(
      "getDigitalPolicy",
      { headers: marketHeaders(marketCode) },
    );
  }

  getSellerProfile(marketCode: string, _sellerId: string) {
    return apiOperation<DigitalSellerProfile | null, "getDigitalSellerProfile">(
      "getDigitalSellerProfile",
      { headers: marketHeaders(marketCode) },
    );
  }

  acceptSellerResponsibilities(
    marketCode: string,
    _sellerId: string,
    fulfillmentTypes: FulfillmentType[],
    acceptedPolicyVersion: number,
  ) {
    return apiOperation<DigitalSellerProfile, "putDigitalSellerProfile">(
      "putDigitalSellerProfile",
      {
        body: { fulfillmentTypes, acceptedPolicyVersion },
        headers: marketHeaders(marketCode),
      },
    );
  }

  initializePrivateUpload(
    marketCode: string,
    input: {
      fileName: string;
      contentType: string;
      sizeBytes: number;
      listingId?: string;
      replacesAssetId?: string;
    },
  ) {
    return apiOperation<
      {
        asset: DigitalAssetProjection;
        signedUploadUrl: string;
        expiresAt: string;
      },
      "postDigitalAssetUpload"
    >("postDigitalAssetUpload", {
      body: input,
      headers: marketHeaders(marketCode),
    });
  }

  async uploadPrivateFile(
    marketCode: string,
    file: File,
    input: { listingId?: string; replacesAssetId?: string } = {},
  ) {
    const initialized = await this.initializePrivateUpload(marketCode, {
      ...input,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });
    const uploadUrl = new URL(initialized.signedUploadUrl);
    if (
      uploadUrl.protocol !== "https:" ||
      uploadUrl.username ||
      uploadUrl.password
    ) {
      throw new Error("private_upload_destination_invalid");
    }
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
      credentials: "omit",
      redirect: "error",
    });
    if (!response.ok) throw new Error("private_upload_failed");
    return this.completePrivateUpload(marketCode, initialized.asset.id);
  }

  completePrivateUpload(marketCode: string, assetId: string) {
    return apiOperation<
      DigitalAssetProjection,
      "postDigitalAssetUploadComplete"
    >("postDigitalAssetUploadComplete", {
      path: { id: assetId },
      headers: marketHeaders(marketCode),
    });
  }

  getAsset(marketCode: string, assetId: string) {
    return apiOperation<DigitalAssetProjection, "getDigitalAsset">(
      "getDigitalAsset",
      { path: { id: assetId }, headers: marketHeaders(marketCode) },
    );
  }

  async removeAsset(marketCode: string, assetId: string) {
    await apiOperation("deleteDigitalAsset", {
      path: { id: assetId },
      headers: marketHeaders(marketCode),
    });
  }

  createProtectedAccess(marketCode: string, input: DigitalSecretInput) {
    return apiOperation<
      {
        id: string;
        destinationDomain: string | null;
        masked: true;
      },
      "postDigitalAccessSecret"
    >("postDigitalAccessSecret", {
      body: input,
      headers: marketHeaders(marketCode),
    });
  }

  createCredentialBatch(
    marketCode: string,
    input: Parameters<
      DigitalProductsServiceContract["createCredentialBatch"]
    >[1],
  ) {
    return apiOperation<
      { id: string; version: number },
      "postDigitalCredentialBatch"
    >("postDigitalCredentialBatch", {
      body: input,
      headers: marketHeaders(marketCode),
    });
  }

  importCredentialInventory(
    marketCode: string,
    batchId: string,
    input: Parameters<
      DigitalProductsServiceContract["importCredentialInventory"]
    >[2],
  ) {
    return apiOperation<
      Awaited<
        ReturnType<DigitalProductsServiceContract["getCredentialInventory"]>
      >,
      "postDigitalCredentialInventory"
    >("postDigitalCredentialInventory", {
      path: { id: batchId },
      body: input,
      headers: marketHeaders(marketCode),
    });
  }

  getCredentialInventory(marketCode: string, batchId: string) {
    return apiOperation<
      Awaited<
        ReturnType<DigitalProductsServiceContract["getCredentialInventory"]>
      >,
      "getDigitalCredentialInventory"
    >("getDigitalCredentialInventory", {
      path: { id: batchId },
      headers: marketHeaders(marketCode),
    });
  }

  createFulfillmentVersion(
    marketCode: string,
    listingId: string,
    input: DigitalFulfillmentVersionInput,
  ) {
    return apiOperation<
      DigitalFulfillmentVersionInput & {
        id: string;
        version: number;
        status: string;
        moderationStatus: string;
      },
      "postDigitalFulfillmentVersion"
    >("postDigitalFulfillmentVersion", {
      path: { id: listingId },
      body: input,
      headers: marketHeaders(marketCode),
    });
  }

  async listSellerProvisioningTasks(marketCode: string, _sellerId: string) {
    const result = await apiOperation<
      { items: DigitalProvisioningTask[] },
      "getDigitalSellerProvisioningTasks"
    >("getDigitalSellerProvisioningTasks", {
      headers: marketHeaders(marketCode),
    });
    return result.items;
  }

  async listEntitlements(marketCode: string, _buyerId: string) {
    const result = await apiOperation<
      {
        items: DigitalEntitlementProjection[];
      },
      "getDigitalEntitlements"
    >("getDigitalEntitlements", { headers: marketHeaders(marketCode) });
    return result.items;
  }

  getEntitlement(marketCode: string, _buyerId: string, entitlementId: string) {
    return apiOperation<DigitalEntitlementProjection, "getDigitalEntitlement">(
      "getDigitalEntitlement",
      { path: { id: entitlementId }, headers: marketHeaders(marketCode) },
    );
  }

  createDownloadGrant(
    marketCode: string,
    _buyerId: string,
    entitlementId: string,
    assetId: string,
  ) {
    return apiOperation<DigitalAccessGrant, "postDigitalDownloadGrant">(
      "postDigitalDownloadGrant",
      {
        path: { id: entitlementId },
        body: { assetId },
        headers: marketHeaders(marketCode),
      },
    );
  }

  createRevealGrant(
    marketCode: string,
    _buyerId: string,
    entitlementId: string,
  ) {
    return apiOperation<DigitalAccessGrant, "postDigitalRevealGrant">(
      "postDigitalRevealGrant",
      { path: { id: entitlementId }, headers: marketHeaders(marketCode) },
    );
  }

  consumeAccessGrant(_buyerId: string, grantId: string) {
    return apiOperation<ConsumedDigitalAccess, "postDigitalAccessGrantConsume">(
      "postDigitalAccessGrantConsume",
      { path: { id: grantId } },
    );
  }

  async submitProvisionedAccess(
    marketCode: string,
    entitlementId: string,
    input: DigitalSecretInput,
  ) {
    await apiOperation("postDigitalProvisionedAccess", {
      path: { id: entitlementId },
      body: input,
      headers: marketHeaders(marketCode),
    });
  }

  reportInvalidAccess(
    marketCode: string,
    _buyerId: string,
    entitlementId: string,
    reportType: DigitalAccessReportType,
    description: string,
  ) {
    return apiOperation<
      { id: string; status: "OPEN" },
      "postDigitalAccessReport"
    >("postDigitalAccessReport", {
      path: { id: entitlementId },
      body: { reportType, description },
      headers: marketHeaders(marketCode),
    });
  }

  getAdminOverview(marketCode: string) {
    return apiOperation<
      Awaited<ReturnType<DigitalProductsServiceContract["getAdminOverview"]>>,
      "getDigitalAdminOverview"
    >("getDigitalAdminOverview", { headers: marketHeaders(marketCode) });
  }

  getAdminPolicy(marketCode: string) {
    return apiOperation<DigitalMarketPolicy, "getDigitalAdminPolicy">(
      "getDigitalAdminPolicy",
      { headers: marketHeaders(marketCode) },
    );
  }

  createAdminPolicyDraft(
    marketCode: string,
    policy: DigitalMarketPolicy,
    reason: string,
  ) {
    return apiOperation<DigitalMarketPolicy, "postDigitalAdminPolicyDraft">(
      "postDigitalAdminPolicyDraft",
      { body: { policy, reason }, headers: marketHeaders(marketCode) },
    );
  }

  activateAdminPolicy(marketCode: string, policyId: string, reason: string) {
    return apiOperation<DigitalMarketPolicy, "postDigitalAdminPolicyActivate">(
      "postDigitalAdminPolicyActivate",
      {
        path: { id: policyId },
        body: { reason },
        headers: marketHeaders(marketCode),
      },
    );
  }

  moderateAsset(
    marketCode: string,
    assetId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    return apiOperation<DigitalAssetProjection, "postDigitalAssetModeration">(
      "postDigitalAssetModeration",
      {
        path: { id: assetId },
        body: { decision },
        headers: marketHeaders(marketCode),
      },
    );
  }

  moderateFulfillmentVersion(
    marketCode: string,
    fulfillmentVersionId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    return apiOperation<unknown, "postDigitalFulfillmentModeration">(
      "postDigitalFulfillmentModeration",
      {
        path: { id: fulfillmentVersionId },
        body: { decision },
        headers: marketHeaders(marketCode),
      },
    );
  }

  async resolveAccessReport(
    marketCode: string,
    reportId: string,
    input: {
      resolutionCode: string;
      entitlementStatus?: "ACCESS_AVAILABLE" | "REVOKED" | "UNAVAILABLE";
    },
  ) {
    await apiOperation("postDigitalAccessReportResolve", {
      path: { id: reportId },
      body: input,
      headers: marketHeaders(marketCode),
    });
  }
}

export const httpDigitalProductsService = new HttpDigitalProductsService();
