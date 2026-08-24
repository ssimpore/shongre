import { describe, expect, it } from "vitest";
import { DemoProviderControlPlaneService } from "./demo-provider-control-plane.service";

describe("demo provider control plane", () => {
  const service = new DemoProviderControlPlaneService();

  it("reports demo state without active or production-ready providers", async () => {
    const snapshot = await service.getSnapshot();
    expect(snapshot.environment).toBe("demo");
    expect(snapshot.summary.active).toBe(0);
    expect(snapshot.summary.productionReady).toBe(0);
    expect(snapshot.summary.verifiedHealthScore).not.toBe(100);
  });

  it("never contacts or simulates a successful external diagnostic", async () => {
    const result = await service.testProvider("stripe");
    expect(result.supported).toBe(false);
    expect(result.success).toBe(false);
    expect(result.evidence).toBe("NONE");
    expect(result.checks).toContainEqual(
      expect.objectContaining({ name: "live_probe", status: "SKIP" }),
    );
  });
});
