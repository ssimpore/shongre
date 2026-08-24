import { describe, expect, it } from "vitest";
import { AppError } from "../../src/shared/errors/app-error.js";
import {
  DemoKYCProvider,
  LiveKYCProvider,
} from "../../src/integrations/providers/kyc.provider.js";
import {
  DemoBusinessRegistryProvider,
  SiretBusinessRegistryProvider,
} from "../../src/integrations/providers/business-registry.provider.js";
import {
  DemoAIProvider,
  GeminiAIProvider,
} from "../../src/integrations/providers/ai.provider.js";
import {
  DemoPaymentProvider,
  StripePaymentProvider,
} from "../../src/integrations/providers/payment.provider.js";

const expectUnavailable = async (operation: Promise<unknown>) => {
  await expect(operation).rejects.toMatchObject<AppError>({
    code: "NETWORK_ERROR",
    statusCode: 503,
  });
};

describe("provider safety boundaries", () => {
  it("keeps demo KYC deterministic and rejects arbitrary six-digit codes", async () => {
    const provider = new DemoKYCProvider();
    const input = {
      userId: "user-1",
      dimension: "identity" as const,
      returnUrl: "https://shongre.example/compte/verification",
    };

    await expect(provider.createSession(input)).resolves.toEqual(
      await provider.createSession(input),
    );
    await expect(
      provider.verifyPhoneOtp("+33600000000", "654321"),
    ).resolves.toBe(false);
    await expect(
      provider.verifyPhoneOtp("+33600000000", "123456"),
    ).resolves.toBe(true);
  });

  it("fails closed when live KYC has no real adapter", async () => {
    const provider = new LiveKYCProvider();
    await expectUnavailable(
      provider.createSession({
        userId: "user-1",
        dimension: "identity",
        returnUrl: "https://shongre.example/compte/verification",
      }),
    );
    await expectUnavailable(provider.verifyPhoneOtp("+33600000000", "123456"));
  });

  it("keeps the demo registry separate from the unavailable live registry", async () => {
    const demo = new DemoBusinessRegistryProvider();
    await expect(demo.lookupBySiret("73282932000074")).resolves.not.toBeNull();
    await expectUnavailable(
      new SiretBusinessRegistryProvider().lookupBySiret("73282932000074"),
    );
  });

  it("uses deterministic demo moderation and never impersonates Gemini", async () => {
    const demo = new DemoAIProvider();
    await expect(
      demo.analyzeListingContent("Objet", "Paiement Western Union", 100),
    ).resolves.toMatchObject({
      verdict: "suspicious",
      flaggedKeywords: ["western union"],
    });
    await expectUnavailable(
      new GeminiAIProvider().analyzeListingContent("Objet", "Description", 100),
    );
  });

  it("keeps demo balances deterministic and fails closed for unsupported Stripe balances", async () => {
    await expect(
      new DemoPaymentProvider().getBalance("seller-1"),
    ).resolves.toEqual({
      available: 480,
      pending: 250,
      currency: "EUR",
    });
    await expectUnavailable(new StripePaymentProvider().getBalance("seller-1"));
  });
});
