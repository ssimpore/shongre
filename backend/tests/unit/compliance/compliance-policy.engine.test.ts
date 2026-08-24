import { describe, expect, it } from "vitest";
import type {
  ComplianceEvaluationInput,
  ComplianceSubject,
  VerificationDimension,
} from "@shongre/contracts/compliance";
import { CompliancePolicyEngine } from "../../../src/modules/compliance/compliance-policy.engine.js";
import { BASELINE_COMPLIANCE_RULES } from "../../../src/modules/compliance/compliance-rule.registry.js";
import { RiskEngine } from "../../../src/modules/compliance/risk.engine.js";

const verified = (
  ...dimensions: VerificationDimension[]
): ComplianceSubject["verification"] =>
  Object.fromEntries(
    dimensions.map((dimension) => [
      dimension,
      { dimension, state: "verified", visibility: "ACCOUNT_OWNER_ONLY" },
    ]),
  );

const evaluate = (
  subject: ComplianceSubject,
  input: ComplianceEvaluationInput,
) =>
  new CompliancePolicyEngine().getVerificationRequirements(
    subject,
    { evaluatedAt: "2026-08-24T10:00:00.000Z", ...input },
    BASELINE_COMPLIANCE_RULES,
  );

describe("CompliancePolicyEngine", () => {
  it("allows a visitor to browse without any KYC interruption", () => {
    const result = evaluate(
      { accountType: "guest", country: "FR", verification: {} },
      { requestedAction: "browse", jurisdiction: "FR", marketCode: "FR" },
    );
    expect(result.allowed).toBe(true);
    expect(result.required).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it("keeps ordinary private publication to email and seller classification", () => {
    const result = evaluate(
      {
        userId: "private-1",
        accountType: "individual",
        sellerType: "individual",
        country: "FR",
        verification: verified("email", "professional_status"),
      },
      {
        requestedAction: "publish_listing",
        jurisdiction: "FR",
        marketCode: "FR",
        transactionContext: {
          transactionType: "classified",
          contractConclusionMode: "off_platform",
          paymentFlow: "none",
        },
      },
    );
    expect(result.allowed).toBe(true);
    expect(result.required).not.toContain("identity");
    expect(result.recommended).toContain("phone");
  });

  it("keeps favorite saving at lightweight confirmed-account verification", () => {
    const result = evaluate(
      {
        userId: "buyer-1",
        accountType: "individual",
        sellerType: "individual",
        country: "FR",
        verification: verified("email"),
      },
      {
        requestedAction: "save_favorite",
        jurisdiction: "FR",
        marketCode: "FR",
      },
    );
    expect(result.allowed).toBe(true);
    expect(result.required).toEqual(["email"]);
  });

  it("separates business and representative checks for a professional", () => {
    const result = evaluate(
      {
        userId: "pro-1",
        accountType: "professional",
        sellerType: "professional",
        country: "FR",
        verification: verified("email", "business", "professional_status"),
      },
      {
        requestedAction: "publish_professional_listing",
        jurisdiction: "FR",
        marketCode: "FR",
      },
    );
    expect(result.allowed).toBe(false);
    expect(result.missing).toEqual(["business_representative"]);
  });

  it("blocks only payout on PSP dimensions and not unrelated capabilities", () => {
    const result = evaluate(
      {
        userId: "private-2",
        accountType: "individual",
        sellerType: "individual",
        country: "FR",
        verification: verified("email", "identity"),
      },
      {
        requestedAction: "receive_payout",
        jurisdiction: "FR",
        marketCode: "FR",
        transactionContext: {
          transactionType: "direct_purchase",
          contractConclusionMode: "platform",
          paymentFlow: "psp_marketplace",
          amountMinor: 100,
          currency: "EUR",
        },
      },
    );
    expect(result.capability).toBe("receivePayout");
    expect(result.missing).toEqual(["bank_account", "payout"]);
    expect(result.required).not.toContain("business");
  });

  it("distinguishes a pending provider check from a failed blocking check", () => {
    const base: ComplianceSubject = {
      userId: "private-pending",
      accountType: "individual",
      sellerType: "individual",
      country: "FR",
      verification: {
        ...verified("email", "identity", "bank_account"),
        payout: {
          dimension: "payout",
          state: "processing",
          visibility: "PROVIDER_ONLY",
        },
      },
    };
    const input: ComplianceEvaluationInput = {
      requestedAction: "receive_payout",
      jurisdiction: "FR",
      marketCode: "FR",
      transactionContext: { paymentFlow: "psp_marketplace" },
    };
    const pending = evaluate(base, input);
    expect(pending.pending).toEqual(["payout"]);
    expect(pending.blocking).toEqual([]);

    const failed = evaluate(
      {
        ...base,
        verification: {
          ...base.verification,
          payout: { ...base.verification.payout!, state: "failed" },
        },
      },
      input,
    );
    expect(failed.blocking).toEqual(["payout"]);
  });

  it("treats an expired record as missing without resetting other dimensions", () => {
    const result = evaluate(
      {
        userId: "private-3",
        accountType: "individual",
        sellerType: "individual",
        country: "FR",
        verification: {
          ...verified("email", "bank_account", "payout"),
          identity: {
            dimension: "identity",
            state: "verified",
            expiresAt: "2026-08-23T00:00:00.000Z",
            visibility: "ACCOUNT_OWNER_ONLY",
          },
        },
      },
      {
        requestedAction: "receive_payout",
        jurisdiction: "FR",
        marketCode: "FR",
        transactionContext: { paymentFlow: "psp_marketplace" },
      },
    );
    expect(result.missing).toEqual(["identity"]);
  });

  it("flags DAC7 applicability for legal review instead of inventing a blocking answer", () => {
    const result = evaluate(
      {
        userId: "seller-tax",
        accountType: "individual",
        sellerType: "individual",
        country: "FR",
        verification: verified("email"),
      },
      {
        requestedAction: "complete_tax_due_diligence",
        jurisdiction: "FR",
        marketCode: "FR",
        transactionContext: {
          transactionType: "direct_purchase",
          contractConclusionMode: "unknown",
          considerationKnown: true,
        },
      },
    );
    expect(result.legalReviewRequired).toBe(true);
    expect(result.allowed).toBe(true);
    expect(result.recommended).toEqual(["tax", "address"]);
  });

  it("fails closed when a country has no governed publication policy", () => {
    const result = evaluate(
      {
        userId: "seller-unknown-market",
        accountType: "individual",
        sellerType: "individual",
        country: "DE",
        verification: verified("email", "professional_status"),
      },
      {
        requestedAction: "publish_listing",
        jurisdiction: "DE",
        marketCode: "DE",
      },
    );
    expect(result.allowed).toBe(false);
    expect(result.legalReviewRequired).toBe(true);
    expect(result.reasonCodes).toContain("COMPLIANCE_POLICY_NOT_CONFIGURED");
  });
});

describe("RiskEngine", () => {
  it("keeps legal policy separate while recommending a reviewable step-up", () => {
    const risk = new RiskEngine().evaluate({
      duplicateAccount: true,
      paymentAnomaly: true,
    });
    expect(risk.level).toBe("HIGH");
    expect(risk.recommendedChecks).toContain("enhanced_review");
    expect(risk.requiresHumanReview).toBe(true);
  });
});
