import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => new Map<string, string>());

vi.mock("@/services/secure-storage/secure-storage", () => ({
  secureStorage: {
    get: async (key: string) => memory.get(key) ?? null,
    set: async (key: string, value: string) => {
      memory.set(key, value);
    },
    remove: async (key: string) => {
      memory.delete(key);
    },
  },
}));

import {
  mobileDigitalDraftStore,
  type MobileDigitalDraft,
} from "../src/features/digital-products/digital-draft.store";

describe("mobile digital draft persistence", () => {
  beforeEach(() => memory.clear());

  it("partitions drafts by account and market and allowlists persisted fields", async () => {
    const draft = {
      fulfillmentMode: "ACCESS_CREDENTIALS",
      productVersion: "1.2",
      buyerFacingDescription: "Accès individuel.",
      compatibility: "Web",
      requirements: "Navigateur récent",
      provisioningHours: "24",
      privateAssetIds: [],
      accessSecretId: "opaque-secret-version-id",
      credentialAllocationMode: "UNIQUE_INVENTORY",
      credentialBatchIds: ["opaque-batch-id"],
      inventoryCount: 4,
      accessClass: "SOFTWARE_LICENSE",
      protectedCredentialKinds: ["USERNAME", "PASSWORD"],
      rawDestinationUrl: "https://secret.example.test/?token=never-persist",
      password: "never-persist",
      localFileUri: "file:///private/paid-file.zip",
      fileName: "customer-name-paid-file.zip",
    } as MobileDigitalDraft & Record<string, unknown>;

    await mobileDigitalDraftStore.write("account-a", "FR", draft);
    const serialized = [...memory.values()][0] ?? "";
    expect(serialized).not.toContain("never-persist");
    expect(serialized).not.toContain("paid-file");
    expect(await mobileDigitalDraftStore.read("account-a", "FR")).toMatchObject(
      {
        productVersion: "1.2",
        accessSecretId: "opaque-secret-version-id",
      },
    );
    expect(await mobileDigitalDraftStore.read("account-b", "FR")).toBeNull();
    expect(await mobileDigitalDraftStore.read("account-a", "BE")).toBeNull();
  });
});
