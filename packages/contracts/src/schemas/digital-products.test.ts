import { describe, expect, it } from "vitest";
import {
  digitalFulfillmentVersionInputSchema,
  digitalMarketPolicySchema,
  digitalPolicyProjectionSchema,
  fulfillmentTypeSchema,
} from "./digital-products";

describe("digital product contracts", () => {
  it("keeps physical fulfillment explicit and independent from taxonomy", () => {
    expect(fulfillmentTypeSchema.parse("PHYSICAL")).toBe("PHYSICAL");
    expect(fulfillmentTypeSchema.parse("FILE_DOWNLOAD")).toBe("FILE_DOWNLOAD");
  });

  it("requires versioned private references instead of raw secrets", () => {
    const result = digitalFulfillmentVersionInputSchema.safeParse({
      fulfillmentTypes: ["ACCESS_CREDENTIALS"],
      primaryFulfillmentType: "ACCESS_CREDENTIALS",
      productVersion: "2026.09",
      buyerFacingDescription: "Un accès individuel à la ressource achetée.",
      productAccessClass: "SOFTWARE_LICENSE",
      accessSecretVersionId: "52d2dd65-aa06-45d4-b7ce-67d90ae0f8cf",
      credentialAllocationMode: "UNIQUE_INVENTORY",
      credentialKinds: ["LICENSE_KEY"],
      credentialBatchIds: ["733ebf58-1e52-4ec1-b6dc-a9d8ca9c42d5"],
    });
    expect(result.success).toBe(true);
    expect(JSON.stringify(result.data)).not.toContain("password");
    expect(
      digitalFulfillmentVersionInputSchema.safeParse({
        fulfillmentTypes: ["FILE_DOWNLOAD"],
        primaryFulfillmentType: "FILE_DOWNLOAD",
        productVersion: "1",
        buyerFacingDescription: "Fichier privé disponible après le paiement.",
      }).success,
    ).toBe(false);
  });

  it("represents production market readiness without inventing approvals", () => {
    const policy = digitalMarketPolicySchema.parse({
      marketCode: "FR",
      version: 1,
      status: "DISABLED",
      enabled: false,
      allowedAccountTypes: ["professional"],
      allowedSellerTypes: ["professional"],
      allowedCategoryIds: ["digital_products.templates.documents"],
      allowedFulfillmentTypes: ["FILE_DOWNLOAD"],
      allowedFulfillmentCombinations: [["FILE_DOWNLOAD"]],
      requiredVerificationDimensions: ["identity", "payment", "payout"],
      moderationRequired: true,
      allowedMimeTypes: ["application/pdf"],
      allowedFileExtensions: [".pdf"],
      maxFileCount: 5,
      maxFileSizeBytes: 25_000_000,
      maxTotalFileSizeBytes: 100_000_000,
      credentialInventory: {
        reusableAllowed: false,
        uniqueAllowed: false,
        providerGeneratedAllowed: false,
        sellerEnteredAfterPaymentAllowed: false,
        minimumAvailableBeforePurchase: 1,
        allowedKinds: [],
        allowedClasses: [],
        prohibitedClasses: [
          "PERSONAL_ACCOUNT",
          "SHARED_THIRD_PARTY_ACCOUNT",
          "PAYMENT_CREDENTIAL",
          "IDENTITY_CREDENTIAL",
        ],
      },
      externalLinks: {
        allowedSchemes: ["https"],
        acceptedDomains: [],
        allowSubdomains: false,
        allowQuery: false,
        allowFragment: false,
      },
      provisioningDeadlineHours: 72,
      defaultEntitlementDurationDays: 365,
      defaultDownloadLimit: 5,
      defaultRevealLimit: 2,
      currency: "EUR",
      minimumPrice: { amountMinor: 100, currency: "EUR" },
      maximumPrice: { amountMinor: 100_000, currency: "EUR" },
      taxPolicyVersion: null,
      refundPolicyVersion: null,
      withdrawalPresentationVersion: null,
      paymentProviderConfigurationId: null,
      legalApprovalId: null,
      capabilities: {
        onboarding: true,
        listingDrafts: true,
        publication: false,
        checkout: false,
        fulfillment: false,
        nativeCheckout: false,
      },
      refundAccessBehavior: "REVOKE_ON_REFUND",
      disputeAccessBehavior: "SUSPEND",
      listingRemovalAccessBehavior: "SUSPEND",
      sellerRestrictionAccessBehavior: "SUSPEND",
      requirements: [
        {
          id: "approval_pending",
          label: { "fr-FR": "Activation en attente" },
          description: {
            "fr-FR":
              "La publication reste désactivée jusqu’à validation des règles applicables.",
          },
        },
      ],
      effectiveAt: null,
      approvedAt: null,
    });
    expect(policy.capabilities.checkout).toBe(false);
    expect(
      digitalPolicyProjectionSchema.parse({
        ...policy,
        purchaseUnavailableReasons: ["LEGAL_APPROVAL_REQUIRED"],
      }).purchaseUnavailableReasons,
    ).toEqual(["LEGAL_APPROVAL_REQUIRED"]);
  });
});
