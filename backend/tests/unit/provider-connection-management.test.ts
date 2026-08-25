import { describe, expect, it } from "vitest";
import { ProviderConnectionService } from "../../src/modules/providers/provider-connection.service.js";
import type { Principal } from "../../src/shared/auth/principal.js";

const principal: Principal = {
  userId: "10000000-0000-4000-8000-000000000004",
  email: "lea@example.test",
  role: "admin",
  accountType: "staff",
  mfaVerified: true,
};

describe("provider connection management", () => {
  it("creates and rotates a draft BYOK connection without returning the secret", async () => {
    const service = new ProviderConnectionService();
    const secret = "sk-customer-owned-A94D";
    const created = await service.createForPrincipal(principal, {
      ownerType: "USER",
      providerId: "openai",
      providerFamily: "AI",
      displayName: "OpenAI personnel",
      configuration: {},
      capabilities: ["ai.prospect_research"],
      isDefault: false,
      credential: secret,
    });

    expect(created.status).toBe("DRAFT");
    expect(created.credentialConfigured).toBe(true);
    expect(created.credentialHint).toBe("••••A94D");
    expect(JSON.stringify(created)).not.toContain(secret);

    const rotatedSecret = "sk-replacement-B77E";
    const rotated = await service.rotateCredentialForPrincipal(
      principal,
      created.id,
      { expectedVersion: created.version, credential: rotatedSecret },
    );
    expect(rotated.version).toBe(created.version + 1);
    expect(rotated.credentialHint).toBe("••••B77E");
    expect(JSON.stringify(rotated)).not.toContain(rotatedSecret);
  });

  it("rejects secrets hidden in normal provider configuration", async () => {
    const service = new ProviderConnectionService();
    await expect(
      service.createForPrincipal(principal, {
        ownerType: "TENANT",
        providerId: "openai",
        providerFamily: "AI",
        displayName: "Configuration invalide",
        configuration: { nested: { apiKey: "must-not-be-here" } },
        capabilities: ["ai.prospect_research"],
        isDefault: false,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects private provider endpoints even when nested", async () => {
    const service = new ProviderConnectionService();
    await expect(
      service.createForPrincipal(principal, {
        ownerType: "TENANT",
        providerId: "openai",
        providerFamily: "AI",
        displayName: "Endpoint invalide",
        configuration: {
          transport: { endpoint: "http://127.0.0.1:9000/internal" },
        },
        capabilities: ["ai.prospect_research"],
        isDefault: false,
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: { reason: "unsafe_provider_endpoint" },
    });
  });
});
