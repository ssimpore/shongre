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
import { apiOperation } from "@/api/generated-api-operation";
import type { operations } from "@shongre/contracts/openapi";
import { uploadSelectedFile } from "@/api/signed-upload";

type SavedSellerProfileRequest =
  operations["putDigitalSellerProfile"]["requestBody"]["content"]["application/json"];
type UploadRequest =
  operations["postDigitalAssetUpload"]["requestBody"]["content"]["application/json"];
type AccessSecretRequest =
  operations["postDigitalAccessSecret"]["requestBody"]["content"]["application/json"];
type CredentialBatchRequest =
  operations["postDigitalCredentialBatch"]["requestBody"]["content"]["application/json"];
type CredentialInventoryRequest =
  operations["postDigitalCredentialInventory"]["requestBody"]["content"]["application/json"];
type DownloadGrantRequest =
  operations["postDigitalDownloadGrant"]["requestBody"]["content"]["application/json"];
type ConsumedGrantResponse =
  operations["postDigitalAccessGrantConsume"]["responses"][200]["content"]["application/json"];
type ProvisionedAccessRequest =
  operations["postDigitalProvisionedAccess"]["requestBody"]["content"]["application/json"];
type AccessReportRequest =
  operations["postDigitalAccessReport"]["requestBody"]["content"]["application/json"];

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
    return (await apiOperation(
      "getDigitalPolicy",
      {},
      marketCode,
    )) as DigitalPolicyProjection;
  }

  async getSellerProfile(
    marketCode: string,
    _sellerId: string,
  ): Promise<DigitalSellerProfile | null> {
    return (await apiOperation(
      "getDigitalSellerProfile",
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
    return (await apiOperation(
      "putDigitalSellerProfile",
      { body: payload },
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
    const initialized = await apiOperation(
      "postDigitalAssetUpload",
      { body: payload },
      marketCode,
    );
    await uploadSelectedFile({
      localUri: file.uri,
      signedUploadUrl: initialized.signedUploadUrl,
      expiresAt: initialized.expiresAt,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
    });
    return (await apiOperation(
      "postDigitalAssetUploadComplete",
      { path: { id: initialized.asset.id } },
      marketCode,
    )) as DigitalAssetProjection;
  }

  async protectAccess(
    marketCode: string,
    input: Parameters<MobileDigitalProductsService["protectAccess"]>[1],
  ): Promise<{ id: string; destinationDomain: string | null; masked: true }> {
    const payload: AccessSecretRequest = input;
    return (await apiOperation(
      "postDigitalAccessSecret",
      { body: payload },
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
    const batch = await apiOperation(
      "postDigitalCredentialBatch",
      { body: batchPayload },
      marketCode,
    );
    const inventoryPayload: CredentialInventoryRequest = {
      productAccessClass,
      credentials: values.map((value) => ({
        fields: [{ kind: "LICENSE_KEY", label: "Clé de licence", value }],
      })),
    };
    const inventory = await apiOperation(
      "postDigitalCredentialInventory",
      { path: { id: batch.id }, body: inventoryPayload },
      marketCode,
    );
    return { batchId: batch.id, availableCount: inventory.availableCount };
  }

  async listEntitlements(
    marketCode: string,
    _buyerId: string,
  ): Promise<DigitalEntitlementProjection[]> {
    const result = await apiOperation("getDigitalEntitlements", {}, marketCode);
    return [...result.items] as DigitalEntitlementProjection[];
  }

  async listSellerProvisioningTasks(
    marketCode: string,
    _sellerId: string,
  ): Promise<DigitalProvisioningTask[]> {
    const result = await apiOperation(
      "getDigitalSellerProvisioningTasks",
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
    await apiOperation(
      "postDigitalProvisionedAccess",
      { path: { id: entitlementId }, body: payload },
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
    return (await apiOperation(
      "postDigitalDownloadGrant",
      { path: { id: entitlementId }, body: payload },
      marketCode,
    )) as DigitalAccessGrant;
  }

  async createRevealGrant(
    marketCode: string,
    _buyerId: string,
    entitlementId: string,
  ): Promise<DigitalAccessGrant> {
    return (await apiOperation(
      "postDigitalRevealGrant",
      { path: { id: entitlementId } },
      marketCode,
    )) as DigitalAccessGrant;
  }

  async consumeGrant(
    _buyerId: string,
    grantId: string,
  ): Promise<MobileConsumedDigitalAccess> {
    return apiOperation("postDigitalAccessGrantConsume", {
      path: { id: grantId },
    });
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
    await apiOperation(
      "postDigitalAccessReport",
      { path: { id: entitlementId }, body: payload },
      marketCode,
    );
  }
}

export const mobileDigitalProductsService: MobileDigitalProductsService =
  new HttpMobileDigitalProductsService();
