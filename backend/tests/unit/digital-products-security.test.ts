import { describe, expect, it } from "vitest";
import type { DigitalMarketPolicy } from "@shongre/contracts/digital-products";
import {
  decryptDigitalSecret,
  encryptDigitalSecret,
  maskDigitalSecret,
} from "../../src/modules/digital-products/digital-secret-envelope.js";
import {
  assertSafeResolvedAddress,
  validateExternalDestination,
} from "../../src/modules/digital-products/external-link-policy.js";
import {
  assertDigitalPolicy,
  digitalPolicyUnavailableReasons,
} from "../../src/modules/digital-products/digital-policy.js";

const policy: DigitalMarketPolicy = {
  marketCode: "FR",
  version: 3,
  status: "ACTIVE",
  enabled: true,
  allowedAccountTypes: ["professional"],
  allowedSellerTypes: ["professional"],
  allowedCategoryIds: ["digital_products.templates.documents"],
  allowedFulfillmentTypes: ["FILE_DOWNLOAD", "ACCESS_CREDENTIALS"],
  allowedFulfillmentCombinations: [["FILE_DOWNLOAD"], ["ACCESS_CREDENTIALS"]],
  requiredVerificationDimensions: ["identity", "payment", "payout"],
  moderationRequired: true,
  allowedMimeTypes: ["application/pdf"],
  allowedFileExtensions: [".pdf"],
  maxFileCount: 5,
  maxFileSizeBytes: 25_000_000,
  maxTotalFileSizeBytes: 100_000_000,
  credentialInventory: {
    reusableAllowed: false,
    uniqueAllowed: true,
    providerGeneratedAllowed: false,
    sellerEnteredAfterPaymentAllowed: false,
    minimumAvailableBeforePurchase: 1,
    allowedKinds: ["LICENSE_KEY"],
    allowedClasses: ["SOFTWARE_LICENSE"],
    prohibitedClasses: ["PERSONAL_ACCOUNT", "PAYMENT_CREDENTIAL"],
  },
  externalLinks: {
    allowedSchemes: ["https"],
    acceptedDomains: ["access.example.test"],
    allowSubdomains: false,
    allowQuery: true,
    allowFragment: false,
  },
  provisioningDeadlineHours: 72,
  defaultEntitlementDurationDays: 365,
  defaultDownloadLimit: 5,
  defaultRevealLimit: 2,
  currency: "EUR",
  minimumPrice: { amountMinor: 100, currency: "EUR" },
  maximumPrice: { amountMinor: 100_000, currency: "EUR" },
  taxPolicyVersion: "tax-approved-v1",
  refundPolicyVersion: "refund-approved-v1",
  withdrawalPresentationVersion: "withdrawal-approved-v1",
  paymentProviderConfigurationId: "stripe-fr-digital-v1",
  legalApprovalId: "legal-fr-digital-v1",
  capabilities: {
    onboarding: true,
    listingDrafts: true,
    publication: true,
    checkout: true,
    fulfillment: true,
    nativeCheckout: false,
  },
  refundAccessBehavior: "REVOKE_ON_REFUND",
  disputeAccessBehavior: "SUSPEND",
  listingRemovalAccessBehavior: "SUSPEND",
  sellerRestrictionAccessBehavior: "SUSPEND",
  requirements: [],
  effectiveAt: "2026-09-01T00:00:00.000Z",
  approvedAt: "2026-08-31T00:00:00.000Z",
};

describe("digital product secret security", () => {
  it("encrypts authenticated structured access and masks every field", () => {
    const key = Buffer.alloc(32, 7);
    const payload = {
      destinationUrl: "https://access.example.test/redeem?code=secret",
      fields: [
        { kind: "LICENSE_KEY" as const, label: "Clé", value: "ABCD-SECRET" },
      ],
      instructions: "Utiliser une seule fois.",
    };
    const encrypted = encryptDigitalSecret(payload, key, "test-v1");
    expect(encrypted.encryptedPayload.toString("utf8")).not.toContain("SECRET");
    expect(encrypted.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(decryptDigitalSecret(encrypted, key)).toEqual(payload);
    expect(maskDigitalSecret(payload)).toEqual([
      {
        kind: "LICENSE_KEY",
        label: "Clé",
        maskedValue: "••••••••",
        revealed: false,
      },
    ]);
  });

  it("authenticates ciphertext and rejects a modified envelope", () => {
    const key = Buffer.alloc(32, 8);
    const encrypted = encryptDigitalSecret(
      { fields: [{ kind: "PIN", label: "PIN", value: "1234" }] },
      key,
      "test-v1",
    );
    encrypted.encryptedPayload[0] ^= 1;
    expect(() => decryptDigitalSecret(encrypted, key)).toThrow();
  });
});

describe("digital external link policy", () => {
  it("accepts only an allowlisted secure destination and returns no public path", () => {
    expect(
      validateExternalDestination(
        "https://access.example.test/redeem?token=secret",
        policy.externalLinks,
        "access.example.test",
      ),
    ).toEqual({
      secretUrl: "https://access.example.test/redeem?token=secret",
      destinationDomain: "access.example.test",
    });
  });

  it.each([
    "javascript:alert(1)",
    "http://access.example.test/product",
    "https://user:password@access.example.test/product",
    "https://127.0.0.1/product",
    "https://169.254.169.254/latest/meta-data",
    "https://10.0.0.4/product",
    "https://localhost/product",
    "https://evil.example.test/product",
  ])("rejects dangerous or unapproved destination %s", (destination) => {
    expect(() =>
      validateExternalDestination(destination, policy.externalLinks),
    ).toThrow();
  });

  it.each(["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fd00::1"])(
    "rejects unsafe resolved address %s before any backend fetch",
    (address) => expect(() => assertSafeResolvedAddress(address)).toThrow(),
  );
});

describe("digital market policy", () => {
  it("allows only exact approved fulfillment combinations", () => {
    expect(() =>
      assertDigitalPolicy({
        policy,
        capability: "publication",
        marketCode: "FR",
        categoryId: "digital_products.templates.documents",
        accountType: "professional",
        sellerType: "professional",
        fulfillmentTypes: ["FILE_DOWNLOAD"],
        priceMinor: 2_000,
        currency: "EUR",
      }),
    ).not.toThrow();
    expect(() =>
      assertDigitalPolicy({
        policy,
        capability: "publication",
        marketCode: "FR",
        fulfillmentTypes: ["FILE_DOWNLOAD", "ACCESS_CREDENTIALS"],
      }),
    ).toThrow();
  });

  it("fails closed when legal, tax, refund, withdrawal or provider evidence is absent", () => {
    const disabled = {
      ...policy,
      status: "DISABLED" as const,
      enabled: false,
      legalApprovalId: null,
      taxPolicyVersion: null,
      refundPolicyVersion: null,
      withdrawalPresentationVersion: null,
      paymentProviderConfigurationId: null,
    };
    expect(digitalPolicyUnavailableReasons(disabled)).toEqual([
      "POLICY_DISABLED",
      "LEGAL_APPROVAL_REQUIRED",
      "TAX_POLICY_REQUIRED",
      "REFUND_POLICY_REQUIRED",
      "WITHDRAWAL_PRESENTATION_REQUIRED",
      "PAYMENT_PROVIDER_REQUIRED",
    ]);
    expect(() =>
      assertDigitalPolicy({
        policy: disabled,
        capability: "checkout",
        marketCode: "FR",
      }),
    ).toThrow();
  });
});
