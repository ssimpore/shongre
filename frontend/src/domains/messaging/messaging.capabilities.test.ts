import { describe, it, expect } from "vitest";
import { messagingCapabilitiesService } from "./messaging.capabilities";
import { DEMO_USERS } from "../../mocks/initialDemoData";

const mockViewer = DEMO_USERS.buyer_thomas;

describe("MessagingCapabilitiesService", () => {
  it("disables messaging for guest users", () => {
    const caps = messagingCapabilitiesService.resolve({
      viewer: null,
      counterpartId: "seller_123",
    });

    expect(caps.canRead).toBe(false);
    expect(caps.canSend).toBe(false);
    expect(caps.disabledReason).toContain("connecter");
  });

  it("allows full participation for active logged-in user", () => {
    const caps = messagingCapabilitiesService.resolve({
      viewer: mockViewer,
      counterpartId: "seller_123",
      conversationStatus: "active",
    });

    expect(caps.canRead).toBe(true);
    expect(caps.canSend).toBe(true);
    expect(caps.canAttach).toBe(true);
    expect(caps.canMakeOffer).toBe(true);
    expect(caps.canBlock).toBe(true);
    expect(caps.disabledReason).toBeUndefined();
  });

  it("rejects conversations without a distinct counterpart", () => {
    const caps = messagingCapabilitiesService.resolve({
      viewer: mockViewer,
      counterpartId: mockViewer.id,
    });

    expect(caps.canRead).toBe(false);
    expect(caps.canSend).toBe(false);
    expect(caps.canReport).toBe(false);
  });

  it("keeps history usable but disables listing actions when unavailable", () => {
    const caps = messagingCapabilitiesService.resolve({
      viewer: mockViewer,
      counterpartId: "seller_123",
      isListingAvailable: false,
    });

    expect(caps.canRead).toBe(true);
    expect(caps.canSend).toBe(true);
    expect(caps.canMakeOffer).toBe(false);
    expect(caps.canSchedulePickup).toBe(false);
  });

  it("disables sending when viewer has blocked counterpart", () => {
    const caps = messagingCapabilitiesService.resolve({
      viewer: mockViewer,
      counterpartId: "seller_123",
      isBlockedByViewer: true,
    });

    expect(caps.canRead).toBe(true);
    expect(caps.canSend).toBe(false);
    expect(caps.canUnblock).toBe(true);
    expect(caps.isBlockedByViewer).toBe(true);
    expect(caps.disabledReason).toContain("bloqué");
  });

  it("disables sending when viewer is suspended", () => {
    const suspendedViewer = { ...mockViewer, status: "suspended" as const };
    const caps = messagingCapabilitiesService.resolve({
      viewer: suspendedViewer,
      counterpartId: "seller_123",
    });

    expect(caps.canRead).toBe(true);
    expect(caps.canSend).toBe(false);
    expect(caps.disabledReason).toContain("suspendu");
  });

  it("sets read-only mode for archived conversations", () => {
    const caps = messagingCapabilitiesService.resolve({
      viewer: mockViewer,
      counterpartId: "seller_123",
      conversationStatus: "archived",
    });

    expect(caps.canRead).toBe(true);
    expect(caps.canSend).toBe(false);
    expect(caps.disabledReason).toContain("archivée");
  });
});
