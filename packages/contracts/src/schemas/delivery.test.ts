import { describe, expect, it } from "vitest";
import {
  DELIVERY_REQUEST_TRANSITIONS,
  canTransitionDeliveryRequest,
  canTransitionDeliveryRequestForParticipant,
  deliveryCourierProfileInputSchema,
  deliveryCourierProfileSchema,
  deliveryRequestDraftInputSchema,
  deliveryMarketActivationIssues,
} from "./delivery";
import { getCountryConfig } from "../market-country";

describe("delivery contract", () => {
  it("permits only declared lifecycle transitions", () => {
    expect(canTransitionDeliveryRequest("open", "assigned")).toBe(true);
    expect(canTransitionDeliveryRequest("open", "completed")).toBe(false);
    expect(DELIVERY_REQUEST_TRANSITIONS.completed).toEqual([]);
    expect(
      canTransitionDeliveryRequestForParticipant(
        "courier",
        "assigned",
        "picked_up",
      ),
    ).toBe(true);
    expect(
      canTransitionDeliveryRequestForParticipant(
        "requester",
        "assigned",
        "picked_up",
      ),
    ).toBe(false);
    expect(
      canTransitionDeliveryRequestForParticipant(
        "requester",
        "delivered",
        "completed",
      ),
    ).toBe(true);
  });

  it("rejects an invalid or cross-shaped draft", () => {
    expect(
      deliveryRequestDraftInputSchema.safeParse({ marketCode: "France" })
        .success,
    ).toBe(false);
  });

  it("keeps server-owned courier eligibility out of profile input", () => {
    const input = {
      status: "active",
      vehicleTypes: ["bicycle"],
      maxWeightGrams: 10_000,
      serviceLocalities: [{ city: "Paris", postalCode: "75011" }],
      opportunityNotifications: true,
    };
    expect(deliveryCourierProfileInputSchema.parse(input)).toEqual(input);
    expect(
      deliveryCourierProfileSchema.safeParse({
        ...input,
        id: "018f89f4-b57d-7cc9-8bd8-3d69a9a8e121",
        marketCode: "FR",
        updatedAt: "2026-09-05T12:00:00.000Z",
      }).success,
    ).toBe(false);
  });

  it("fails closed for coming-soon and unknown market activation", () => {
    expect(deliveryMarketActivationIssues(getCountryConfig("FR"))).toEqual([]);
    expect(deliveryMarketActivationIssues(getCountryConfig("SN"))).toContain(
      "market_not_active",
    );
    expect(deliveryMarketActivationIssues(undefined)).toEqual([
      "unknown_market",
    ]);
  });
});
