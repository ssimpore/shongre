import type {
  CredentialAllocationMode,
  CredentialKind,
  DigitalAccessGrant,
  DigitalAssetProjection,
  DigitalEntitlementProjection,
  DigitalPolicyProjection,
  DigitalProvisioningTask,
  DigitalSellerProfile,
  FulfillmentType,
} from "@shongre/contracts/digital-products";
import type { operations } from "@shongre/contracts/openapi";
import { apiRequest } from "@/api/http-client";
import { uploadSelectedFile } from "@/api/signed-upload";

type PolicyResponse =
  operations["getDigitalPolicy"]["responses"][200]["content"]["application/json"];
type SellerProfileResponse =
  operations["getDigitalSellerProfile"]["responses"][200]["content"]["application/json"];
type SavedSellerProfileResponse =
  operations["putDigitalSellerProfile"]["responses"][200]["content"]["application/json"];
type SavedSellerProfileRequest =
  operations["putDigitalSellerProfile"]["requestBody"]["content"]["application/json"];
type UploadResponse =
  operations["postDigitalAssetUpload"]["responses"][200]["content"]["application/json"];
type UploadRequest =
  operations["postDigitalAssetUpload"]["requestBody"]["content"]["application/json"];
type CompletedUploadResponse =
  operations["postDigitalAssetUploadComplete"]["responses"][200]["content"]["application/json"];
type AccessSecretResponse =
  operations["postDigitalAccessSecret"]["responses"][200]["content"]["application/json"];
type AccessSecretRequest =
  operations["postDigitalAccessSecret"]["requestBody"]["content"]["application/json"];
type CredentialBatchResponse =
  operations["postDigitalCredentialBatch"]["responses"][200]["content"]["application/json"];
type CredentialBatchRequest =
  operations["postDigitalCredentialBatch"]["requestBody"]["content"]["application/json"];
type CredentialInventoryResponse =
  operations["postDigitalCredentialInventory"]["responses"][200]["content"]["application/json"];
type CredentialInventoryRequest =
  operations["postDigitalCredentialInventory"]["requestBody"]["content"]["application/json"];
type EntitlementsResponse =
  operations["getDigitalEntitlements"]["responses"][200]["content"]["application/json"];
type ProvisioningTasksResponse =
  operations["getDigitalSellerProvisioningTasks"]["responses"][200]["content"]["application/json"];
type DownloadGrantResponse =
  operations["postDigitalDownloadGrant"]["responses"][200]["content"]["application/json"];
type DownloadGrantRequest =
  operations["postDigitalDownloadGrant"]["requestBody"]["content"]["application/json"];
type RevealGrantResponse =
  operations["postDigitalRevealGrant"]["responses"][200]["content"]["application/json"];
type ConsumedGrantResponse =
  operations["postDigitalAccessGrantConsume"]["responses"][200]["content"]["application/json"];
type ProvisionedAccessRequest =
  operations["postDigitalProvisionedAccess"]["requestBody"]["content"]["application/json"];
type ProvisionedAccessResponse =
  operations["postDigitalProvisionedAccess"]["responses"][200]["content"]["application/json"];
type AccessReportRequest =
  operations["postDigitalAccessReport"]["requestBody"]["content"]["application/json"];
type AccessReportResponse =
  operations["postDigitalAccessReport"]["responses"][200]["content"]["application/json"];

export type MobileConsumedDigitalAccess = ConsumedGrantResponse;

export interface MobilePrivateFile {
  uri: string;
  name: string;
  contentType: string;
  sizeBytes: number;
}

export interface MobileDigitalProductsService {
  getPolicy(marketCode: string): Promise<DigitalPolicyProjection>;
  getSellerProfile(
    marketCode: string,
    sellerId: string,
  ): Promise<DigitalSellerProfile | null>;
  acceptSellerResponsibilities(
    marketCode: string,
    sellerId: string,
    types: FulfillmentType[],
    policyVersion: number,
  ): Promise<DigitalSellerProfile>;
  uploadPrivateFile(
    marketCode: string,
    ownerId: string,
    file: MobilePrivateFile,
  ): Promise<DigitalAssetProjection>;
  protectAccess(
    marketCode: string,
    input: {
      productAccessClass: string;
      destinationUrl?: string;
      displayDomain?: string;
      fields?: { kind: CredentialKind; label: string; value: string }[];
      instructions?: string;
    },
  ): Promise<{ id: string; destinationDomain: string | null; masked: true }>;
  importUniqueCredentials(
    marketCode: string,
    productAccessClass: string,
    values: string[],
  ): Promise<{ batchId: string; availableCount: number }>;
  listSellerProvisioningTasks(
    marketCode: string,
    sellerId: string,
  ): Promise<DigitalProvisioningTask[]>;
  submitProvisionedAccess(
    marketCode: string,
    entitlementId: string,
    input: {
      productAccessClass: string;
      destinationUrl: string;
      fields: { kind: CredentialKind; label: string; value: string }[];
    },
  ): Promise<void>;
  listEntitlements(
    marketCode: string,
    buyerId: string,
  ): Promise<DigitalEntitlementProjection[]>;
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
  consumeGrant(
    buyerId: string,
    grantId: string,
  ): Promise<MobileConsumedDigitalAccess>;
  reportAccess(
    marketCode: string,
    entitlementId: string,
    description: string,
  ): Promise<void>;
}

export class HttpMobileDigitalProductsService implements MobileDigitalProductsService {
  async getPolicy(marketCode: string): Promise<DigitalPolicyProjection> {
    return (await apiRequest<PolicyResponse>(
      "/digital/policy",
      {},
      marketCode,
    )) as DigitalPolicyProjection;
  }

  async getSellerProfile(
    marketCode: string,
    _sellerId: string,
  ): Promise<DigitalSellerProfile | null> {
    return (await apiRequest<SellerProfileResponse>(
      "/digital/seller-profile",
      {},
      marketCode,
    )) as DigitalSellerProfile | null;
  }

  async acceptSellerResponsibilities(
    marketCode: string,
    _sellerId: string,
    fulfillmentTypes: FulfillmentType[],
    acceptedPolicyVersion: number,
  ): Promise<DigitalSellerProfile> {
    const payload: SavedSellerProfileRequest = {
      fulfillmentTypes,
      acceptedPolicyVersion,
    };
    return (await apiRequest<SavedSellerProfileResponse>(
      "/digital/seller-profile",
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      marketCode,
    )) as DigitalSellerProfile;
  }

  async uploadPrivateFile(
    marketCode: string,
    _ownerId: string,
    file: MobilePrivateFile,
  ): Promise<DigitalAssetProjection> {
    const payload: UploadRequest = {
      fileName: file.name,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
    };
    const initialized = await apiRequest<UploadResponse>(
      "/digital/assets/uploads",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      marketCode,
    );
    await uploadSelectedFile({
      localUri: file.uri,
      signedUploadUrl: initialized.signedUploadUrl,
      expiresAt: initialized.expiresAt,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
    });
    return (await apiRequest<CompletedUploadResponse>(
      `/digital/assets/uploads/${initialized.asset.id}/complete`,
      { method: "POST" },
      marketCode,
    )) as DigitalAssetProjection;
  }

  async protectAccess(
    marketCode: string,
    input: Parameters<MobileDigitalProductsService["protectAccess"]>[1],
  ): Promise<{ id: string; destinationDomain: string | null; masked: true }> {
    const payload: AccessSecretRequest = input;
    return (await apiRequest<AccessSecretResponse>(
      "/digital/access-secrets",
      { method: "POST", body: JSON.stringify(payload) },
      marketCode,
    )) as { id: string; destinationDomain: string | null; masked: true };
  }

  async importUniqueCredentials(
    marketCode: string,
    productAccessClass: string,
    values: string[],
  ): Promise<{ batchId: string; availableCount: number }> {
    const credentialKinds: CredentialKind[] = ["LICENSE_KEY"];
    const allocationMode: CredentialAllocationMode = "UNIQUE_INVENTORY";
    const batchPayload: CredentialBatchRequest = {
      productAccessClass,
      allocationMode,
      credentialKinds,
    };
    const batch = await apiRequest<CredentialBatchResponse>(
      "/digital/credential-batches",
      {
        method: "POST",
        body: JSON.stringify(batchPayload),
      },
      marketCode,
    );
    const inventoryPayload: CredentialInventoryRequest = {
      productAccessClass,
      credentials: values.map((value) => ({
        fields: [{ kind: "LICENSE_KEY", label: "Clé de licence", value }],
      })),
    };
    const inventory = await apiRequest<CredentialInventoryResponse>(
      `/digital/credential-batches/${batch.id}/credentials`,
      {
        method: "POST",
        body: JSON.stringify(inventoryPayload),
      },
      marketCode,
    );
    return { batchId: batch.id, availableCount: inventory.availableCount };
  }

  async listEntitlements(
    marketCode: string,
    _buyerId: string,
  ): Promise<DigitalEntitlementProjection[]> {
    const result = await apiRequest<EntitlementsResponse>(
      "/digital/entitlements",
      {},
      marketCode,
    );
    return [...result.items] as DigitalEntitlementProjection[];
  }

  async listSellerProvisioningTasks(
    marketCode: string,
    _sellerId: string,
  ): Promise<DigitalProvisioningTask[]> {
    const result = await apiRequest<ProvisioningTasksResponse>(
      "/digital/seller/provisioning-tasks",
      {},
      marketCode,
    );
    return [...result.items] as DigitalProvisioningTask[];
  }

  async submitProvisionedAccess(
    marketCode: string,
    entitlementId: string,
    input: Parameters<
      MobileDigitalProductsService["submitProvisionedAccess"]
    >[2],
  ): Promise<void> {
    const payload: ProvisionedAccessRequest = input;
    await apiRequest<ProvisionedAccessResponse>(
      `/digital/entitlements/${encodeURIComponent(entitlementId)}/provision`,
      { method: "POST", body: JSON.stringify(payload) },
      marketCode,
    );
  }

  async createDownloadGrant(
    marketCode: string,
    _buyerId: string,
    entitlementId: string,
    assetId: string,
  ): Promise<DigitalAccessGrant> {
    const payload: DownloadGrantRequest = { assetId };
    return (await apiRequest<DownloadGrantResponse>(
      `/digital/entitlements/${encodeURIComponent(entitlementId)}/download-grants`,
      { method: "POST", body: JSON.stringify(payload) },
      marketCode,
    )) as DigitalAccessGrant;
  }

  async createRevealGrant(
    marketCode: string,
    _buyerId: string,
    entitlementId: string,
  ): Promise<DigitalAccessGrant> {
    return (await apiRequest<RevealGrantResponse>(
      `/digital/entitlements/${encodeURIComponent(entitlementId)}/reveal-grants`,
      { method: "POST" },
      marketCode,
    )) as DigitalAccessGrant;
  }

  async consumeGrant(
    _buyerId: string,
    grantId: string,
  ): Promise<MobileConsumedDigitalAccess> {
    return apiRequest<ConsumedGrantResponse>(
      `/digital/access-grants/${encodeURIComponent(grantId)}/consume`,
      { method: "POST" },
    );
  }

  async reportAccess(
    marketCode: string,
    entitlementId: string,
    description: string,
  ): Promise<void> {
    const payload: AccessReportRequest = {
      reportType: "INVALID_CREDENTIALS",
      description,
    };
    await apiRequest<AccessReportResponse>(
      `/digital/entitlements/${encodeURIComponent(entitlementId)}/reports`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      marketCode,
    );
  }
}

export const mobileDigitalProductsService: MobileDigitalProductsService =
  new HttpMobileDigitalProductsService();
