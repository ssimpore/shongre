import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeliveryRequestDraftInput } from "@shongre/contracts/delivery";

vi.mock("@/api/http-client", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/api/http-client";
import { HttpMobileDeliveryService } from "@/features/delivery/delivery.service";

const actor = { userId: "account-a", displayName: "Alex", verified: true };

describe("API-backed mobile delivery service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("propagates the exact market on public delivery reads", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      marketCode: "CH",
      enabled: false,
      readOnlyAssigned: true,
      reasons: ["feature_flag_disabled"],
    });

    await expect(
      new HttpMobileDeliveryService().availability("CH"),
    ).resolves.toMatchObject({ marketCode: "CH", enabled: false });
    expect(apiRequest).toHaveBeenCalledWith(
      "/delivery/availability?marketCode=CH",
      {},
      "CH",
    );
  });

  it("creates then publishes through two confirmed API mutations", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ id: "request-1" })
      .mockResolvedValueOnce({ id: "request-1", status: "open" });
    const input = {
      marketCode: "FR",
      idempotencyKey: "create-request-1",
    } as DeliveryRequestDraftInput;

    await expect(
      new HttpMobileDeliveryService().createAndPublish(actor, input),
    ).resolves.toMatchObject({ id: "request-1", status: "open" });
    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/delivery/requests",
      { method: "POST", body: JSON.stringify(input) },
      "FR",
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/delivery/requests/request-1/publish",
      { method: "POST", body: JSON.stringify({ marketCode: "FR" }) },
      "FR",
    );
  });

  it("does not simulate publication when request creation fails", async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error("forbidden"));
    const input = {
      marketCode: "FR",
      idempotencyKey: "create-request-2",
    } as DeliveryRequestDraftInput;

    await expect(
      new HttpMobileDeliveryService().createAndPublish(actor, input),
    ).rejects.toThrow("forbidden");
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});
