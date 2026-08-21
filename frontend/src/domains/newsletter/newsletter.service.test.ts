import { describe, it, expect } from "vitest";
import { newsletterService } from "./newsletter.service";

describe("NewsletterService", () => {
  it("normalizes email addresses safely", () => {
    expect(
      newsletterService.normalizeEmail("  THOMAS.Laurent@Example.FR  "),
    ).toBe("thomas.laurent@example.fr");
  });

  it("validates emails correctly", () => {
    expect(newsletterService.validateEmail("").isValid).toBe(false);
    expect(newsletterService.validateEmail("invalid-email").isValid).toBe(
      false,
    );
    expect(newsletterService.validateEmail("thomas@example.fr").isValid).toBe(
      true,
    );
  });

  it("returns appropriate status copy and badges", () => {
    const subscribed = newsletterService.getStatusInfo("subscribed");
    expect(subscribed.label).toBe("Abonné");
    expect(subscribed.variant).toBe("success");

    const pending = newsletterService.getStatusInfo("pending_confirmation");
    expect(pending.label).toContain("Confirmation");
    expect(pending.variant).toBe("warning");

    const unsubscribed = newsletterService.getStatusInfo("unsubscribed");
    expect(unsubscribed.label).toBe("Désabonné");
    expect(unsubscribed.variant).toBe("neutral");
  });
});
