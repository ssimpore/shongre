import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEMO_USERS } from "../../../mocks/initialDemoData";
import { storageService } from "../../../services/storage.service";
import { DemoVerificationService } from "./demo-verification.service";

const TEST_USER_ID = "progressive-compliance-demo-user";

describe("DemoVerificationService progressive compliance", () => {
  beforeEach(() => {
    storageService.setCurrentUserKey("buyer_thomas");
    storageService.saveUser({
      ...DEMO_USERS.seller_camille,
      id: TEST_USER_ID,
      email: "progressive@example.test",
      isIdentityVerified: false,
      identityVerification: undefined,
      bankPayoutVerification: undefined,
    });
  });
  afterEach(() => storageService.setCurrentUserKey("guest"));

  it("does not require identity for an ordinary private listing", async () => {
    const service = new DemoVerificationService();
    const decision = await service.getVerificationRequirements(TEST_USER_ID, {
      requestedAction: "publish_listing",
      jurisdiction: "FR",
      marketCode: "FR",
      transactionContext: {
        transactionType: "classified",
        contractConclusionMode: "off_platform",
        paymentFlow: "none",
      },
    });
    expect(decision.allowed).toBe(true);
    expect(decision.required).not.toContain("identity");
  });

  it("blocks only payout capability until provider requirements are satisfied", async () => {
    const service = new DemoVerificationService();
    const decision = await service.getVerificationRequirements(TEST_USER_ID, {
      requestedAction: "receive_payout",
      jurisdiction: "FR",
      marketCode: "FR",
      transactionContext: { paymentFlow: "psp_marketplace" },
    });
    expect(decision.capability).toBe("receivePayout");
    expect(decision.allowed).toBe(false);
    expect(decision.missing).toEqual(
      expect.arrayContaining(["identity", "bank_account", "payout"]),
    );
  });

  it("stores a provider reference instead of submitted identity data", async () => {
    const service = new DemoVerificationService();
    await service.startIdentitySession({
      userId: TEST_USER_ID,
      dimension: "identity",
      jurisdiction: "FR",
      returnTo: "/compte/verification",
    });
    const stored = storageService.getUser(TEST_USER_ID)?.identityVerification;
    expect(stored?.providerReference).toBeTruthy();
    expect(stored).not.toHaveProperty("birthDate");
    expect(stored).not.toHaveProperty("documentNumber");
  });

  it("loads tax policy as legal-review-required from the adapter registry", async () => {
    storageService.setCurrentUserKey("compliance_samia");
    const rules = await new DemoVerificationService().listComplianceRules();
    expect(
      rules.find(
        (rule) => rule.ruleCode === "FACILITATED_ACTIVITY_DUE_DILIGENCE",
      )?.status,
    ).toBe("LEGAL_REVIEW_REQUIRED");
  });
});
