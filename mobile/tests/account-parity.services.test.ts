import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/http-client", () => ({ apiRequest: vi.fn() }));

import { apiRequest } from "@/api/http-client";
import { HttpReviewsService } from "@/features/reviews/reviews.service";
import { HttpVerificationService } from "@/features/verification/verification.service";
import { HttpWorkspaceService } from "@/features/workspace/workspace.service";

describe("mobile transaction reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads eligibility and submits through the transaction contract", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({
        eligible: false,
        reason: "ALREADY_REVIEWED",
        review: { rating: 4 },
      })
      .mockResolvedValueOnce({ id: "review-1" });
    const service = new HttpReviewsService();

    await expect(service.eligibility("order-1")).resolves.toEqual({
      eligible: false,
      reason: "ALREADY_REVIEWED",
      submittedRating: 4,
    });
    await service.submit({
      orderId: "order-1",
      rating: 5,
      comment: "  Remise ponctuelle, objet conforme.  ",
    });

    expect(apiRequest).toHaveBeenNthCalledWith(
      1,
      "/orders/order-1/review",
      expect.objectContaining({ method: "GET" }),
      undefined,
    );
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/reviews/submit",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          transactionId: "order-1",
          rating: 5,
          comment: "Remise ponctuelle, objet conforme.",
        }),
      }),
      undefined,
    );
  });
});

describe("mobile verification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalises the status projection and starts the identity session", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ state: "partial", isPhoneVerified: true })
      .mockResolvedValueOnce({
        sessionId: "session-1",
        redirectUrl: "https://verify.example/session-1",
        expiresAt: "2026-09-17T00:00:00.000Z",
      });
    const service = new HttpVerificationService();

    await expect(service.status("user-1")).resolves.toEqual({
      state: "partial",
      isPhoneVerified: true,
      isIdentityVerified: false,
      isBusinessVerified: false,
      isBankPayoutConfigured: false,
    });
    await expect(service.startIdentitySession("FR")).resolves.toMatchObject({
      redirectUrl: "https://verify.example/session-1",
    });
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      "/compliance/identity/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          dimension: "identity",
          jurisdiction: "FR",
          returnTo: "/compte/verification",
        }),
      }),
      undefined,
    );
  });

  it("refuses a session without a hosted flow instead of opening nothing", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ sessionId: "session-2" });

    await expect(
      new HttpVerificationService().startIdentitySession("FR"),
    ).rejects.toThrow("La vérification n’a pas pu être lancée.");
  });
});

describe("mobile Pro workspace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the headline figures in the active market", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      monthlyRevenue: 12,
      monthlyViews: 340,
      conversionRate: 2.5,
      revenueByCurrency: [{ amountMinor: 1200, currency: "EUR" }],
      topListings: [],
    });

    await expect(
      new HttpWorkspaceService().proAnalytics("seller-1", "FR"),
    ).resolves.toEqual({
      revenueByCurrency: [{ amountMinor: 1200, currency: "EUR" }],
      monthlyViews: 340,
      conversionRate: 2.5,
      topListings: [],
    });
    expect(apiRequest).toHaveBeenCalledWith(
      "/workspace/pro-analytics/seller-1",
      expect.objectContaining({ method: "GET" }),
      "FR",
    );
  });
});
