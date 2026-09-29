import { afterEach, expect, it, vi } from "vitest";
import { HttpMessagingService } from "./http-messaging.service";
import { httpClient } from "./http-client";

afterEach(() => vi.restoreAllMocks());

it.each([
  ["EUR", 49.5, 4_950],
  ["XOF", 25_000, 25_000],
])(
  "sends a %s offer in that currency's own minor unit",
  async (currency, amount, amountMinor) => {
    const request = vi.spyOn(httpClient, "request").mockResolvedValue({
      id: "offer-1",
      conversationId: "conversation-1",
      senderId: "buyer-1",
      text: "",
      isOffer: true,
      offerAmountMinor: amountMinor,
      offerCurrency: currency,
      createdAt: "2026-09-24T00:00:00.000Z",
    });

    const offer = await new HttpMessagingService().makeOffer(
      "conversation-1",
      amount,
      currency,
    );

    expect(
      JSON.parse(String(request.mock.calls[0]?.[1]?.body)).amountMinor,
    ).toBe(amountMinor);
    expect(offer.offerAmountMinor).toBe(amountMinor);
  },
);
