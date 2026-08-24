import { describe, expect, it } from "vitest";
import { DemoComplianceRepository } from "../../../src/infrastructure/database/repositories/compliance.repository.js";
import { DemoUserRepository } from "../../../src/infrastructure/database/repositories/user.repository.js";
import { DemoKYCProvider } from "../../../src/integrations/providers/kyc.provider.js";
import { DemoPaymentComplianceProvider } from "../../../src/integrations/providers/payment-compliance.provider.js";
import { ComplianceService } from "../../../src/modules/compliance/compliance.service.js";
import { CompliancePolicyEngine } from "../../../src/modules/compliance/compliance-policy.engine.js";
import { BASELINE_COMPLIANCE_RULES } from "../../../src/modules/compliance/compliance-rule.registry.js";

function service() {
  return new ComplianceService(
    new DemoComplianceRepository(),
    new DemoUserRepository(),
    new CompliancePolicyEngine(),
    new DemoKYCProvider(),
    new DemoPaymentComplianceProvider(),
  );
}

describe("ComplianceService integration", () => {
  it("uses legacy positive states as a compatibility projection", async () => {
    const decision = await service().evaluateForUser("user_camille", {
      requestedAction: "publish_listing",
      jurisdiction: "FR",
      marketCode: "FR",
      transactionContext: {
        transactionType: "classified",
        contractConclusionMode: "off_platform",
        paymentFlow: "none",
      },
      evaluatedAt: "2026-08-24T10:00:00.000Z",
    });
    expect(decision.allowed).toBe(true);
    expect(decision.required).not.toContain("identity");
  });

  it("derives risk server-side and ignores a client-supplied downgrade", async () => {
    const compliance = service();
    const decision = await compliance.evaluateForUserWithRisk(
      "user_camille",
      {
        requestedAction: "publish_listing",
        jurisdiction: "FR",
        marketCode: "FR",
        riskContext: {
          level: "NORMAL",
          reasonCodes: [],
          humanReviewAvailable: true,
        },
      },
      { duplicateAccount: true, paymentAnomaly: true },
    );
    expect(decision.reasonCodes).toContain("DUPLICATE_ACCOUNT_SIGNAL");
    expect(decision.required).toEqual(
      expect.arrayContaining(["phone", "enhanced_review"]),
    );
  });

  it("creates provider-hosted sessions without accepting document content", async () => {
    const result = await service().startIdentitySession({
      userId: "user_camille",
      dimension: "identity",
      jurisdiction: "FR",
      returnUrl: "https://shongre.example/compte/verification",
    });
    expect(result.sessionId).toMatch(/^kyc_demo_/);
    expect(result).not.toHaveProperty("documentUrl");
    expect(result.requirements.acceptedDocumentTypes).toContain("national_id");
  });

  it("processes a trusted provider event idempotently", async () => {
    const compliance = service();
    const payload = {
      eventId: "evt_identity_verified_1",
      eventType: "identity.verified",
      providerReference: "idv_opaque_1",
      userId: "user_camille",
      dimension: "identity" as const,
      state: "verified" as const,
      occurredAt: "2026-08-24T10:00:00.000Z",
    };
    await expect(
      compliance.handleProviderWebhook({
        provider: "identity",
        payload,
        rawBody: JSON.stringify(payload),
      }),
    ).resolves.toEqual({ duplicate: false });
    await expect(
      compliance.handleProviderWebhook({
        provider: "identity",
        payload,
        rawBody: JSON.stringify(payload),
      }),
    ).resolves.toEqual({ duplicate: true });
    await expect(
      compliance.handleProviderWebhook({
        provider: "identity",
        payload: { ...payload, state: "failed" },
        rawBody: JSON.stringify({ ...payload, state: "failed" }),
      }),
    ).rejects.toThrow(/ne correspond pas à son contenu initial/);
  });

  it("requires controlled legal review before activating a legal rule", async () => {
    const rule = {
      ...BASELINE_COMPLIANCE_RULES.find(
        (candidate) => candidate.id === "fr-professional-listing-v1",
      )!,
      id: "fr-professional-listing-governance-test",
      reviewedBy: undefined,
      reviewedAt: undefined,
    };
    await expect(
      service().saveRule({
        rule,
        actorId: "compliance-reviewer",
        reason: "Activation juridique sans revue complète",
      }),
    ).rejects.toThrow(/source, un relecteur et une date de revue/);
  });

  it("persists a governed business rule with its change reason", async () => {
    const compliance = service();
    const rule = {
      ...BASELINE_COMPLIANCE_RULES.find(
        (candidate) => candidate.id === "fr-private-listing-v1",
      )!,
      id: "fr-private-listing-draft-test",
      status: "DRAFT" as const,
      policyVersion: "fr-test-2026.2",
    };
    await expect(
      compliance.saveRule({
        rule,
        actorId: "policy-admin",
        reason: "Préparation contrôlée de la prochaine version",
      }),
    ).resolves.toMatchObject({ id: rule.id, status: "DRAFT" });
    await expect(compliance.listRules()).resolves.toContainEqual(rule);
  });

  it("keeps manual review structured, idempotent and auditable", async () => {
    const compliance = service();
    const first = await compliance.requestManualReviewForUser({
      userId: "user_camille",
      dimension: "enhanced_review",
    });
    const duplicate = await compliance.requestManualReviewForUser({
      userId: "user_camille",
      dimension: "enhanced_review",
    });
    expect(duplicate.id).toBe(first.id);

    await compliance.decideManualReview({
      caseId: first.id,
      state: "APPROVED",
      reviewerId: "compliance-reviewer",
      reason: "Signaux examinés et justificatifs cohérents.",
    });
    await expect(compliance.getSubject("user_camille")).resolves.toMatchObject({
      verification: { enhanced_review: { state: "verified" } },
    });
    const audit = await compliance.listAuditEvents();
    expect(
      audit.some((event) => event.eventType === "manual_review_requested"),
    ).toBe(true);
    expect(
      audit.some((event) => event.reasonCode === "MANUAL_REVIEW_APPROVED"),
    ).toBe(true);
  });

  it("executes approved retention while preserving legal-review classes", async () => {
    await expect(
      service().runApprovedRetention("compliance-reviewer"),
    ).resolves.toEqual({
      providerEventsDeleted: 0,
      skippedLegalReview: expect.arrayContaining([
        "provider_verification_metadata",
        "compliance_decisions",
        "manual_review",
        "legacy_verification_requests",
      ]),
    });
  });
});
