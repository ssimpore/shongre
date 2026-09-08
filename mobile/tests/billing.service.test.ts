import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/http-client", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/api/http-client";
import { HttpMobileBillingService } from "@/features/billing/billing.service";

describe("API-backed mobile billing service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the market catalog and account overview through the API", async () => {
    const catalog = { marketCode: "FR", configurationVersionId: "catalog-v1" };
    const overview = { subscriptions: [], entitlements: [], invoices: [] };
    vi.mocked(apiRequest)
      .mockResolvedValueOnce(catalog)
      .mockResolvedValueOnce(overview);
    const service = new HttpMobileBillingService();

    await expect(service.getCatalog("FR")).resolves.toBe(catalog);
    await expect(service.getOverview("account-a", "FR")).resolves.toBe(
      overview,
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/business-rules/catalog?marketCode=FR",
      expect.objectContaining({ method: "GET", headers: expect.any(Headers) }),
      "FR",
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/monetization/billing",
      expect.objectContaining({ method: "GET", headers: expect.any(Headers) }),
      "FR",
    );
  });

  it("propagates API failures without returning an empty billing success", async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error("offline"));

    await expect(
      new HttpMobileBillingService().getOverview("account-a", "BE"),
    ).rejects.toThrow("offline");
  });
});
