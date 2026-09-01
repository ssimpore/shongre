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
import type {
  ConsumedDigitalAccess,
  DigitalProductsServiceContract,
  DigitalSecretInput,
  DigitalAccessReportType,
} from "../../contracts/digital-products.contract";
import { httpClient } from "./http-client";

const marketHeaders = (marketCode: string) => ({
  "X-Shongre-Market": marketCode,
});

export class HttpDigitalProductsService implements DigitalProductsServiceContract {
  getPolicy(marketCode: string) {
    return httpClient.get<DigitalPolicyProjection>("/digital/policy", {
      headers: marketHeaders(marketCode),
    });
  }

  getSellerProfile(marketCode: string, _sellerId: string) {
    return httpClient.get<DigitalSellerProfile | null>(
      "/digital/seller-profile",
      { headers: marketHeaders(marketCode) },
    );
  }

  acceptSellerResponsibilities(
    marketCode: string,
    _sellerId: string,
    fulfillmentTypes: FulfillmentType[],
    acceptedPolicyVersion: number,
  ) {
    return httpClient.put<DigitalSellerProfile>(
      "/digital/seller-profile",
      { fulfillmentTypes, acceptedPolicyVersion },
      { headers: marketHeaders(marketCode) },
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
    return httpClient.post<{
      asset: DigitalAssetProjection;
      signedUploadUrl: string;
      expiresAt: string;
    }>("/digital/assets/uploads", input, {
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
    return httpClient.post<DigitalAssetProjection>(
      `/digital/assets/uploads/${assetId}/complete`,
      undefined,
      { headers: marketHeaders(marketCode) },
    );
  }

  getAsset(marketCode: string, assetId: string) {
    return httpClient.get<DigitalAssetProjection>(
      `/digital/assets/${assetId}`,
      { headers: marketHeaders(marketCode) },
    );
  }

  async removeAsset(marketCode: string, assetId: string) {
    await httpClient.delete(`/digital/assets/${assetId}`, {
      headers: marketHeaders(marketCode),
    });
  }

  createProtectedAccess(marketCode: string, input: DigitalSecretInput) {
    return httpClient.post<{
      id: string;
      destinationDomain: string | null;
      masked: true;
    }>("/digital/access-secrets", input, {
      headers: marketHeaders(marketCode),
    });
  }

  createCredentialBatch(
    marketCode: string,
    input: Parameters<
      DigitalProductsServiceContract["createCredentialBatch"]
    >[1],
  ) {
    return httpClient.post<{ id: string; version: number }>(
      "/digital/credential-batches",
      input,
      { headers: marketHeaders(marketCode) },
    );
  }

  importCredentialInventory(
    marketCode: string,
    batchId: string,
    input: Parameters<
      DigitalProductsServiceContract["importCredentialInventory"]
    >[2],
  ) {
    return httpClient.post<
      Awaited<
        ReturnType<DigitalProductsServiceContract["getCredentialInventory"]>
      >
    >(`/digital/credential-batches/${batchId}/credentials`, input, {
      headers: marketHeaders(marketCode),
    });
  }

  getCredentialInventory(marketCode: string, batchId: string) {
    return httpClient.get<
      Awaited<
        ReturnType<DigitalProductsServiceContract["getCredentialInventory"]>
      >
    >(`/digital/credential-batches/${batchId}/inventory`, {
      headers: marketHeaders(marketCode),
    });
  }

  createFulfillmentVersion(
    marketCode: string,
    listingId: string,
    input: DigitalFulfillmentVersionInput,
  ) {
    return httpClient.post<
      DigitalFulfillmentVersionInput & {
        id: string;
        version: number;
        status: string;
        moderationStatus: string;
      }
    >(`/digital/listings/${listingId}/fulfillment-versions`, input, {
      headers: marketHeaders(marketCode),
    });
  }

  async listSellerProvisioningTasks(marketCode: string, _sellerId: string) {
    const result = await httpClient.get<{ items: DigitalProvisioningTask[] }>(
      "/digital/seller/provisioning-tasks",
      { headers: marketHeaders(marketCode) },
    );
    return result.items;
  }

  async listEntitlements(marketCode: string, _buyerId: string) {
    const result = await httpClient.get<{
      items: DigitalEntitlementProjection[];
    }>("/digital/entitlements", { headers: marketHeaders(marketCode) });
    return result.items;
  }

  getEntitlement(marketCode: string, _buyerId: string, entitlementId: string) {
    return httpClient.get<DigitalEntitlementProjection>(
      `/digital/entitlements/${entitlementId}`,
      { headers: marketHeaders(marketCode) },
    );
  }

  createDownloadGrant(
    marketCode: string,
    _buyerId: string,
    entitlementId: string,
    assetId: string,
  ) {
    return httpClient.post<DigitalAccessGrant>(
      `/digital/entitlements/${entitlementId}/download-grants`,
      { assetId },
      { headers: marketHeaders(marketCode) },
    );
  }

  createRevealGrant(
    marketCode: string,
    _buyerId: string,
    entitlementId: string,
  ) {
    return httpClient.post<DigitalAccessGrant>(
      `/digital/entitlements/${entitlementId}/reveal-grants`,
      undefined,
      { headers: marketHeaders(marketCode) },
    );
  }

  consumeAccessGrant(_buyerId: string, grantId: string) {
    return httpClient.post<ConsumedDigitalAccess>(
      `/digital/access-grants/${grantId}/consume`,
    );
  }

  async submitProvisionedAccess(
    marketCode: string,
    entitlementId: string,
    input: DigitalSecretInput,
  ) {
    await httpClient.post(
      `/digital/entitlements/${entitlementId}/provision`,
      input,
      { headers: marketHeaders(marketCode) },
    );
  }

  reportInvalidAccess(
    marketCode: string,
    _buyerId: string,
    entitlementId: string,
    reportType: DigitalAccessReportType,
    description: string,
  ) {
    return httpClient.post<{ id: string; status: "OPEN" }>(
      `/digital/entitlements/${entitlementId}/reports`,
      { reportType, description },
      { headers: marketHeaders(marketCode) },
    );
  }

  getAdminOverview(marketCode: string) {
    return httpClient.get<
      Awaited<ReturnType<DigitalProductsServiceContract["getAdminOverview"]>>
    >("/digital/admin/overview", { headers: marketHeaders(marketCode) });
  }

  getAdminPolicy(marketCode: string) {
    return httpClient.get<DigitalMarketPolicy>("/digital/admin/policy", {
      headers: marketHeaders(marketCode),
    });
  }

  createAdminPolicyDraft(
    marketCode: string,
    policy: DigitalMarketPolicy,
    reason: string,
  ) {
    return httpClient.post<DigitalMarketPolicy>(
      "/digital/admin/policy",
      { policy, reason },
      { headers: marketHeaders(marketCode) },
    );
  }

  activateAdminPolicy(marketCode: string, policyId: string, reason: string) {
    return httpClient.post<DigitalMarketPolicy>(
      `/digital/admin/policies/${policyId}/activate`,
      { reason },
      { headers: marketHeaders(marketCode) },
    );
  }

  moderateAsset(
    marketCode: string,
    assetId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    return httpClient.post<DigitalAssetProjection>(
      `/digital/admin/assets/${assetId}/moderation`,
      { decision },
      { headers: marketHeaders(marketCode) },
    );
  }

  moderateFulfillmentVersion(
    marketCode: string,
    fulfillmentVersionId: string,
    decision: "APPROVED" | "REJECTED",
  ) {
    return httpClient.post<unknown>(
      `/digital/admin/fulfillment-versions/${fulfillmentVersionId}/moderation`,
      { decision },
      { headers: marketHeaders(marketCode) },
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
    await httpClient.post(`/digital/admin/reports/${reportId}/resolve`, input, {
      headers: marketHeaders(marketCode),
    });
  }
}

export const httpDigitalProductsService = new HttpDigitalProductsService();
