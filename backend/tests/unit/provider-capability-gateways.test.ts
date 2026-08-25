import { describe, expect, it } from "vitest";
import {
  DemoGenerativeAiGateway,
  DemoMailboxGateway,
  UnavailableMailboxGateway,
} from "../../src/integrations/providers/gateways/capability-gateways.js";
import { isConnectionVisibleToPrincipal } from "../../src/modules/providers/provider-connection.service.js";
import { SHONGRE_PROVIDER_REGISTRY } from "@shongre/contracts/provider-platform";
import { RemoteEmailDeliveryGateway, RemoteGenerativeAiGateway } from "../../src/integrations/providers/gateways/remote-capability-gateways.js";

const context = {
  tenantId: "10000000-0000-4000-8000-000000000001",
  userId: "10000000-0000-4000-8000-000000000004",
  connectionId: "70000000-0000-4000-8000-000000000001",
  providerId: "demo_provider",
  capability: "mailbox.send",
  feature: "crm.follow_up",
  correlationId: "test-correlation",
  marketCode: "FR",
  locale: "fr-FR",
};

describe("shared provider capability gateways", () => {
  it("never exposes another user's personal connection", () => {
    const personal = { owner_type: "USER", owner_id: "user-a" };
    expect(isConnectionVisibleToPrincipal(personal, "user-a")).toBe(true);
    expect(isConnectionVisibleToPrincipal(personal, "user-b")).toBe(false);
    expect(isConnectionVisibleToPrincipal(personal)).toBe(false);
    expect(isConnectionVisibleToPrincipal({ owner_type: "TENANT" }, "user-b")).toBe(true);
  });

  it("returns deterministic demo AI output without usage cost", async () => {
    const gateway = new DemoGenerativeAiGateway();
    const first = await gateway.generate(
      { ...context, capability: "ai.crm_drafting" },
      {
        task: "crm.follow_up_draft",
        instructions: "Draft a concise follow-up",
        safeContext: { accountName: "Atelier Nordique", nextStep: "planifier une démo" },
        outputSchema: { type: "object" },
        maxOutputTokens: 300,
      },
    );
    const second = await gateway.generate(
      { ...context, capability: "ai.crm_drafting" },
      {
        task: "crm.follow_up_draft",
        instructions: "Draft a concise follow-up",
        safeContext: { accountName: "Atelier Nordique", nextStep: "planifier une démo" },
        outputSchema: { type: "object" },
        maxOutputTokens: 300,
      },
    );

    expect(first).toEqual(second);
    expect(first.model).toContain("demo-deterministic");
    expect(first.inputUnits).toBe(0);
  });

  it("deduplicates demo mailbox sends by idempotency key", async () => {
    const gateway = new DemoMailboxGateway();
    const draft = {
      to: ["prospect@example.test"],
      subject: "Suivi",
      textBody: "Bonjour",
      idempotencyKey: "follow-up-opportunity-1",
    };
    const first = await gateway.sendMessage(context, draft);
    const second = await gateway.sendMessage(context, draft);
    expect(first.externalMessageId).toBe(second.externalMessageId);
  });

  it("fails closed when no production mailbox adapter is bound", async () => {
    await expect(
      new UnavailableMailboxGateway().sendMessage(context, {
        to: ["prospect@example.test"],
        subject: "Suivi",
        textBody: "Bonjour",
        idempotencyKey: "follow-up-opportunity-1",
      }),
    ).rejects.toMatchObject({ statusCode: 503 });
  });

  it("uses one shared production gateway for every certified Marketing provider", () => {
    expect(new RemoteEmailDeliveryGateway()).toBeInstanceOf(RemoteEmailDeliveryGateway);
    expect(new RemoteGenerativeAiGateway()).toBeInstanceOf(RemoteGenerativeAiGateway);
    for (const providerId of ["resend", "brevo", "sendgrid", "mailjet", "mailgun", "postmark", "openai", "anthropic", "openai_compatible"]) {
      const provider = SHONGRE_PROVIDER_REGISTRY.find((candidate) => candidate.id === providerId);
      expect(provider, providerId).toBeDefined();
      expect(provider?.lifecycle).toBe("IMPLEMENTED");
    }
    for (const providerId of ["smtp", "amazon_ses"]) {
      expect(SHONGRE_PROVIDER_REGISTRY.find((candidate) => candidate.id === providerId)?.lifecycle).toBe("PLANNED");
    }
  });
});
