import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/http-client", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/api/http-client";
import { HttpMobileDigitalProductsService } from "@/features/digital-products/digital-products.service";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("API-backed mobile digital-products service", () => {
  it("loads policy and entitlements only through the selected market API", async () => {
    const policy = { marketCode: "CH", enabled: true, currency: "CHF" };
    const entitlements = { items: [{ id: "entitlement-1", marketCode: "CH" }] };
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(policy)
      .mockResolvedValueOnce(entitlements);
    const service = new HttpMobileDigitalProductsService();

    await expect(service.getPolicy("CH")).resolves.toBe(policy);
    await expect(service.listEntitlements("CH", "account-a")).resolves.toEqual(
      entitlements.items,
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/digital/policy",
      expect.objectContaining({ method: "GET", headers: expect.any(Headers) }),
      "CH",
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/digital/entitlements",
      expect.objectContaining({ method: "GET", headers: expect.any(Headers) }),
      "CH",
    );
  });

  it("uploads only to a current HTTPS destination and completes through the API", async () => {
    const asset = {
      id: "asset-1",
      listingId: null,
      version: 1,
      safeFileName: "guide.pdf",
      contentType: "application/pdf",
      sizeBytes: 12,
      status: "UPLOADING",
      scanStatus: "PENDING",
      createdAt: "2099-09-01T10:00:00.000Z",
      readyAt: null,
    } as const;
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        asset,
        signedUploadUrl: "https://private-storage.example/upload-token",
        expiresAt: "2099-09-01T10:05:00.000Z",
      })
      .mockResolvedValueOnce({ ...asset, status: "PROCESSING" });
    const fileBody = new Blob(["private file"], { type: "application/pdf" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, blob: async () => fileBody })
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

    expect(fetchMock).toHaveBeenNthCalledWith(1, "file:///private/guide.pdf", {
      credentials: "omit",
      redirect: "error",
    });
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
      "/digital/assets/uploads/asset-1/complete",
      expect.objectContaining({
        method: "POST",
        headers: expect.any(Headers),
      }),
      "FR",
    );
  });

  it("rejects unsafe signed destinations before reading the private file", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      asset: { id: "asset-1" },
      signedUploadUrl: "http://user:secret@private-storage.example/upload",
      expiresAt: "2099-09-01T10:05:00.000Z",
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

  it("rejects remote source URLs before reading or uploading private bytes", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      asset: { id: "asset-1" },
      signedUploadUrl: "https://private-storage.example/upload-token",
      expiresAt: "2099-09-01T10:05:00.000Z",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new HttpMobileDigitalProductsService().uploadPrivateFile(
        "FR",
        "ignored-principal",
        {
          uri: "https://untrusted.example/private.pdf",
          name: "guide.pdf",
          contentType: "application/pdf",
          sizeBytes: 12,
        },
      ),
    ).rejects.toThrow("private_upload_source_invalid");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not synthesize access when the API denies a reveal grant", async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error("forbidden"));

    await expect(
      new HttpMobileDigitalProductsService().createRevealGrant(
        "FR",
        "account-a",
        "entitlement-1",
      ),
    ).rejects.toThrow("forbidden");
  });
});
