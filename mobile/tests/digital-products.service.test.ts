import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/http-client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/config/environment", () => ({
  mobileEnvironment: { dataMode: "demo" },
}));

import { apiRequest } from "@/api/http-client";
import {
  DemoMobileDigitalProductsService,
  HttpMobileDigitalProductsService,
} from "../src/features/digital-products/digital-products.service";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mobile digital-products demo boundary", () => {
  it.each([
    ["FR", true, "EUR"],
    ["BE", true, "EUR"],
    ["CH", true, "CHF"],
    ["SN", false, "EUR"],
    ["BF", false, "EUR"],
  ] as const)(
    "projects the %s market policy",
    async (marketCode, enabled, currency) => {
      const policy = await new DemoMobileDigitalProductsService().getPolicy(
        marketCode,
      );
      expect(policy.enabled).toBe(enabled);
      expect(policy.currency).toBe(currency);
      expect(policy.capabilities.checkout).toBe(enabled);
    },
  );

  it("exposes deterministic processing and failure scenarios without raw secrets", async () => {
    const service = new DemoMobileDigitalProductsService();
    const items = await service.listEntitlements("FR", "user_thomas");
    expect(items.map((item) => item.status)).toEqual(
      expect.arrayContaining([
        "ACCESS_AVAILABLE",
        "PAYMENT_PENDING",
        "PAYMENT_FAILED",
        "PROVISIONING",
        "QUARANTINED",
        "INVALID_ACCESS",
        "EXPIRED",
        "DISPUTED",
        "LIMIT_REACHED",
        "UNAVAILABLE",
        "REFUNDED",
      ]),
    );
    expect(
      items.some(
        (item) =>
          item.fulfillmentTypes.includes("ACCESS_LINK") &&
          item.fulfillmentTypes.includes("ACCESS_CREDENTIALS"),
      ),
    ).toBe(true);
    expect(JSON.stringify(items)).not.toContain("DEMO-LICENSE-NOT-VALID");
  });

  it("keeps grants buyer-owned, file-scoped and single-use", async () => {
    const service = new DemoMobileDigitalProductsService();
    const entitlementId = "32000000-0000-4000-8000-000000000001";
    await expect(
      service.createDownloadGrant(
        "FR",
        "wrong-buyer",
        entitlementId,
        "wrong-asset",
      ),
    ).rejects.toThrow();
    const grant = await service.createDownloadGrant(
      "FR",
      "user_thomas",
      entitlementId,
      "31000000-0000-4000-8000-000000000001",
    );
    await expect(
      service.consumeGrant("wrong-buyer", grant.id),
    ).rejects.toThrow();
    expect((await service.consumeGrant("user_thomas", grant.id)).kind).toBe(
      "DOWNLOAD",
    );
    await expect(
      service.consumeGrant("user_thomas", grant.id),
    ).rejects.toThrow();
  });

  it("keeps seller provisioning scoped to a confirmed task", async () => {
    const service = new DemoMobileDigitalProductsService();
    expect(
      await service.listSellerProvisioningTasks("FR", "user_camille"),
    ).toHaveLength(1);
    expect(
      await service.listSellerProvisioningTasks("BE", "user_camille"),
    ).toHaveLength(0);
    expect(
      await service.listSellerProvisioningTasks("FR", "user_thomas"),
    ).toHaveLength(0);
  });

  it("accepts digital and combined sellers only for an exact policy combination", async () => {
    const service = new DemoMobileDigitalProductsService();
    await expect(
      service.acceptSellerResponsibilities(
        "FR",
        "seller-digital",
        ["FILE_DOWNLOAD"],
        1,
      ),
    ).resolves.toMatchObject({ fulfillmentTypes: ["FILE_DOWNLOAD"] });
    await expect(
      service.acceptSellerResponsibilities(
        "FR",
        "seller-combined",
        ["PHYSICAL", "ACCESS_LINK", "ACCESS_CREDENTIALS"],
        1,
      ),
    ).resolves.toMatchObject({
      fulfillmentTypes: ["PHYSICAL", "ACCESS_LINK", "ACCESS_CREDENTIALS"],
    });
    await expect(
      service.acceptSellerResponsibilities(
        "FR",
        "seller-invalid",
        ["FILE_DOWNLOAD", "SELLER_PROVISIONED"],
        1,
      ),
    ).rejects.toThrow();
  });

  it("uploads only to a protected HTTPS destination and completes the canonical upload route", async () => {
    const asset = {
      id: "31000000-0000-4000-8000-000000000099",
      listingId: null,
      version: 1,
      safeFileName: "guide.pdf",
      contentType: "application/pdf",
      sizeBytes: 12,
      status: "UPLOADING",
      scanStatus: "PENDING",
      createdAt: "2026-09-01T10:00:00.000Z",
      readyAt: null,
    } as const;
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        asset,
        signedUploadUrl: "https://private-storage.example/upload-token",
        expiresAt: "2026-09-01T10:05:00.000Z",
      })
      .mockResolvedValueOnce({
        ...asset,
        status: "PROCESSING",
      });
    const fileBody = new Blob(["private file"]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ blob: async () => fileBody })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await new HttpMobileDigitalProductsService().uploadPrivateFile(
      "FR",
      "ignored-principal",
      {
        uri: "file:///private/guide.pdf",
        name: "guide.pdf",
        contentType: "application/pdf",
        sizeBytes: 12,
      },
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL("https://private-storage.example/upload-token"),
      expect.objectContaining({
        method: "PUT",
        credentials: "omit",
        redirect: "error",
      }),
    );
    expect(apiRequest).toHaveBeenLastCalledWith(
      `/digital/assets/uploads/${asset.id}/complete`,
      { method: "POST" },
      "FR",
    );
  });

  it("rejects credential-bearing or non-HTTPS signed upload destinations before reading the private file", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      asset: { id: "31000000-0000-4000-8000-000000000099" },
      signedUploadUrl: "http://user:secret@private-storage.example/upload",
      expiresAt: "2026-09-01T10:05:00.000Z",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new HttpMobileDigitalProductsService().uploadPrivateFile(
        "FR",
        "ignored-principal",
        {
          uri: "file:///private/guide.pdf",
          name: "guide.pdf",
          contentType: "application/pdf",
          sizeBytes: 12,
        },
      ),
    ).rejects.toThrow("private_upload_destination_invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
