import type {
  CredentialAllocationMode,
  DigitalFulfillmentType,
} from "@shongre/contracts/digital-products";
import { secureStorage } from "@/services/secure-storage/secure-storage";

export interface MobileDigitalDraft {
  fulfillmentMode: "PHYSICAL" | DigitalFulfillmentType | "LINK_AND_CREDENTIALS";
  productVersion: string;
  buyerFacingDescription: string;
  compatibility: string;
  requirements: string;
  provisioningHours: string;
  privateAssetIds: string[];
  accessSecretId?: string;
  credentialAllocationMode: CredentialAllocationMode;
  credentialBatchIds: string[];
  inventoryCount: number;
  accessClass: string;
  protectedCredentialKinds: ("USERNAME" | "PASSWORD")[];
}

const key = (accountId: string, marketCode: string) =>
  `shongre.mobile.digital-draft.v1.${accountId}.${marketCode}`;

function persistableDraft(draft: MobileDigitalDraft): MobileDigitalDraft {
  return {
    fulfillmentMode: draft.fulfillmentMode,
    productVersion: draft.productVersion,
    buyerFacingDescription: draft.buyerFacingDescription,
    compatibility: draft.compatibility,
    requirements: draft.requirements,
    provisioningHours: draft.provisioningHours,
    privateAssetIds: [...draft.privateAssetIds],
    accessSecretId: draft.accessSecretId,
    credentialAllocationMode: draft.credentialAllocationMode,
    credentialBatchIds: [...draft.credentialBatchIds],
    inventoryCount: draft.inventoryCount,
    accessClass: draft.accessClass,
    protectedCredentialKinds: [...draft.protectedCredentialKinds],
  };
}

/**
 * Only public form values and opaque backend identifiers are persisted. Raw
 * links, credentials, inventory values, paid file URIs and filenames never
 * enter this store.
 */
export const mobileDigitalDraftStore = {
  async read(
    accountId: string,
    marketCode: string,
  ): Promise<MobileDigitalDraft | null> {
    const raw = await secureStorage.get(key(accountId, marketCode));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MobileDigitalDraft;
    } catch {
      await secureStorage.remove(key(accountId, marketCode));
      return null;
    }
  },
  write(accountId: string, marketCode: string, draft: MobileDigitalDraft) {
    return secureStorage.set(
      key(accountId, marketCode),
      JSON.stringify(persistableDraft(draft)),
    );
  },
  clear(accountId: string, marketCode: string) {
    return secureStorage.remove(key(accountId, marketCode));
  },
};
