import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DemoProviderControlPlaneService } from "./demo-provider-control-plane.service";
import { storageService } from "../../../services/storage.service";

describe("DemoProviderControlPlaneService", () => {
  beforeEach(() => storageService.setCurrentUserKey("super_admin_alex"));
  afterEach(() => storageService.setCurrentUserKey("guest"));

  it("keeps credentials transient while simulating create and rotation", async () => {
    const service = new DemoProviderControlPlaneService();
    const credential = "customer-owned-A94D";
    const created = await service.createConnection({
      ownerType: "TENANT",
      providerId: "openai",
      providerFamily: "AI",
      displayName: "OpenAI tenant",
      configuration: {},
      capabilities: ["ai.prospect_research"],
      isDefault: false,
      credential,
    });

    expect(created.status).toBe("DRAFT");
    expect(created.credentialHint).toBe("••••A94D");
    expect(JSON.stringify(created)).not.toContain(credential);

    const rotated = await service.rotateCredential(created.id, {
      expectedVersion: created.version,
      credential: "replacement-B77E",
    });
    expect(rotated.version).toBe(2);
    expect(rotated.credentialHint).toBe("••••B77E");
  });
});
