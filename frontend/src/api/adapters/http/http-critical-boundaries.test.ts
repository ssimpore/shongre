import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveMarketContext } from "@shongre/contracts";
import { apiOperation } from "./generated-api-operation";
import { HttpAuthService } from "./http-auth.service";
import { HttpPaymentsService } from "./http-payments.service";
import { HttpModerationService } from "./http-moderation.service";
import { HttpMessagingService } from "./http-messaging.service";
import { uploadPrivateDocument, uploadPublicImage } from "./http-upload";
import { HttpWatchSubscriptionsService } from "./http-watch-subscriptions.service";

vi.mock("./generated-api-operation", () => ({
  apiOperation: vi.fn(),
}));

const france = resolveMarketContext({
  hostname: "shongre.fr",
  pathname: "/",
  infrastructure: {
    franceDomain: "shongre.fr",
    globalDomain: "shongre.com",
    canonicalProtocol: "https",
  },
});

describe("critical HTTP adapter boundaries", () => {
  beforeEach(() => {
    vi.mocked(apiOperation).mockReset();
    vi.unstubAllGlobals();
  });

  it("preserves the MFA challenge without treating it as an authenticated session", async () => {
    vi.mocked(apiOperation).mockResolvedValue({
      requiresMfa: true,
      tempMfaToken: "one-time-handle",
    });
    await expect(
      new HttpAuthService().login({
        email: "staff@example.fr",
        password: "correct-horse",
      }),
    ).resolves.toEqual({
      success: false,
      requiresMfa: true,
      tempMfaToken: "one-time-handle",
    });
  });

  it("sends payment integers, idempotency evidence, and the authoritative market header", async () => {
    vi.mocked(apiOperation).mockResolvedValue({
      payoutId: "payout-1",
      status: "processing",
    });
    const input = {
      amountMinor: 12_345,
      currency: "EUR",
      idempotencyKey: "payout-attempt-1",
    };
    await new HttpPaymentsService().requestSellerPayout(france, input);
    expect(apiOperation).toHaveBeenCalledWith("postPaymentsPayout", {
      body: input,
      headers: { "X-Shongre-Market": "FR" },
    });
  });

  it("encodes caller-selected identifiers at moderation and messaging path boundaries", async () => {
    vi.mocked(apiOperation).mockResolvedValue({
      id: "message-1",
      conversationId: "thread/other",
      senderId: "user-1",
      text: "Bonjour",
      createdAt: "2026-09-03T08:00:00.000Z",
    });
    await new HttpModerationService().submitAppeal(
      "case/with space",
      "ignored",
      "Décision contestée",
    );
    expect(apiOperation).toHaveBeenCalledWith("postModerationCaseAppeal", {
      path: { caseId: "case/with space" },
      body: { reason: "Décision contestée" },
    });
    await new HttpMessagingService().sendMessage({
      conversationId: "thread/other",
      senderId: "user-1",
      text: "Bonjour",
    });
    expect(apiOperation).toHaveBeenCalledWith(
      "postMessagingConversationsByIdMessages",
      {
        path: { id: "thread/other" },
        body: {
          text: "Bonjour",
          attachments: undefined,
          offerPrice: undefined,
        },
      },
    );
  });

  it("requires upload bytes and completes only after signed storage accepts them", async () => {
    await expect(
      uploadPublicImage({ name: "photo.jpg", type: "image/jpeg", size: 12 }),
    ).rejects.toThrow("contenu");
    vi.mocked(apiOperation)
      .mockResolvedValueOnce({
        assetId: "asset-1",
        signedUrl: "https://uploads.invalid/asset-1",
        contentType: "application/pdf",
      })
      .mockResolvedValueOnce({
        assetId: "asset-1",
        privateStorageKey: "opaque",
      });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    await uploadPrivateDocument({
      name: "dpe.pdf",
      type: "application/pdf",
      size: 4,
      body: new Blob(["test"]),
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://uploads.invalid/asset-1",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
      }),
    );
    expect(apiOperation).toHaveBeenLastCalledWith(
      "postMediaPrivateDocumentsUploadsByIdComplete",
      { path: { id: "asset-1" } },
    );
  });

  it("keeps watch mutations typed, encoded, and scoped to their endpoint", async () => {
    vi.mocked(apiOperation).mockResolvedValue({ id: "watch/1" });
    await new HttpWatchSubscriptionsService().update(
      "account",
      "FR",
      "watch/1",
      { status: "paused" },
    );
    expect(apiOperation).toHaveBeenCalledWith("patchWatchSubscription", {
      path: { id: "watch/1" },
      body: { status: "paused" },
    });
  });
});
