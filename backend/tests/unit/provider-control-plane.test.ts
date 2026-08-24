import { describe, expect, it } from "vitest";
import { ProviderControlPlaneService } from "../../src/modules/providers/provider-control-plane.service.js";

describe("provider control plane", () => {
  it("reports code reality instead of catalogue enablement", () => {
    const snapshot = new ProviderControlPlaneService().getSnapshot();
    const mangopay = snapshot.providers.find(
      ({ definition }) => definition.id === "mangopay",
    )!;
    const stripe = snapshot.providers.find(
      ({ definition }) => definition.id === "stripe",
    )!;

    expect(mangopay.definition.adapterStatus).toBe("DEMO_ONLY");
    expect(mangopay.readiness.active).toBe(false);
    expect(stripe.definition.implementedCapabilities).toContain(
      "payout.transfer",
    );
    expect(stripe.readiness.active).toBe(false);
    expect(snapshot.summary.active).toBeLessThan(snapshot.summary.discovered);
  });

  it("marks missing critical capabilities and never fabricates a health score", () => {
    const snapshot = new ProviderControlPlaneService().getSnapshot();
    const payouts = snapshot.capabilities.find(
      ({ capability }) => capability === "payout.transfer",
    )!;

    expect(payouts.primaryState).toBe("UNCONFIGURED");
    expect(payouts.fallbackReady).toBe(false);
    expect(snapshot.summary.missingCriticalCapabilities).toBeGreaterThan(0);
    expect(snapshot.summary.verifiedHealthScore).not.toBe(100);
  });

  it("refuses to simulate a successful test for providers without adapters", async () => {
    const result = await new ProviderControlPlaneService().testProvider(
      "mondial_relay",
    );

    expect(result.supported).toBe(false);
    expect(result.success).toBe(false);
    expect(result.checks).toContainEqual(
      expect.objectContaining({ name: "production_adapter", status: "FAIL" }),
    );
  });
});
