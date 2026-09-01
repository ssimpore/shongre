import type {
  CredentialAllocationMode,
  DigitalFulfillmentType,
  DigitalMarketPolicy,
} from "@shongre/contracts/digital-products";
import { AppError } from "../../shared/errors/app-error.js";

export type DigitalCapability = keyof DigitalMarketPolicy["capabilities"];

function sameCombination(
  configured: readonly DigitalFulfillmentType[],
  requested: readonly DigitalFulfillmentType[],
): boolean {
  const left = [...new Set(configured)].sort();
  const right = [...new Set(requested)].sort();
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function digitalPolicyUnavailableReasons(
  policy: DigitalMarketPolicy,
): string[] {
  const reasons: string[] = [];
  if (!policy.enabled || policy.status !== "ACTIVE")
    reasons.push("POLICY_DISABLED");
  if (!policy.legalApprovalId) reasons.push("LEGAL_APPROVAL_REQUIRED");
  if (!policy.taxPolicyVersion) reasons.push("TAX_POLICY_REQUIRED");
  if (!policy.refundPolicyVersion) reasons.push("REFUND_POLICY_REQUIRED");
  if (!policy.withdrawalPresentationVersion)
    reasons.push("WITHDRAWAL_PRESENTATION_REQUIRED");
  if (!policy.paymentProviderConfigurationId)
    reasons.push("PAYMENT_PROVIDER_REQUIRED");
  return reasons;
}

export function assertDigitalPolicy(input: {
  policy: DigitalMarketPolicy;
  capability: DigitalCapability;
  marketCode: string;
  categoryId?: string;
  accountType?: "individual" | "professional";
  sellerType?: "individual" | "professional";
  fulfillmentTypes?: readonly DigitalFulfillmentType[];
  allocationMode?: CredentialAllocationMode;
  priceMinor?: number;
  currency?: string;
}): void {
  const { policy } = input;
  if (
    policy.marketCode !== input.marketCode ||
    digitalPolicyUnavailableReasons(policy).length > 0 ||
    !policy.capabilities[input.capability]
  ) {
    throw new AppError({
      code: "FORBIDDEN",
      message:
        "Les produits numériques ne sont pas disponibles pour ce marché.",
    });
  }
  if (
    input.categoryId &&
    !policy.allowedCategoryIds.includes(input.categoryId)
  ) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Cette catégorie n’autorise pas la livraison numérique.",
    });
  }
  if (
    input.accountType &&
    !policy.allowedAccountTypes.includes(input.accountType)
  ) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Ce type de compte n’est pas éligible.",
    });
  }
  if (
    input.sellerType &&
    !policy.allowedSellerTypes.includes(input.sellerType)
  ) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Ce type de vendeur n’est pas éligible.",
    });
  }
  if (input.fulfillmentTypes) {
    if (
      input.fulfillmentTypes.some(
        (type) => !policy.allowedFulfillmentTypes.includes(type),
      ) ||
      !policy.allowedFulfillmentCombinations.some((combination) =>
        sameCombination(combination, input.fulfillmentTypes!),
      )
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cette combinaison de remise n’est pas autorisée.",
      });
    }
    if (
      input.fulfillmentTypes.includes("SELLER_PROVISIONED") &&
      !policy.credentialInventory.sellerEnteredAfterPaymentAllowed
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "La remise créée par le vendeur après paiement n’est pas autorisée.",
      });
    }
  }
  if (input.allocationMode) {
    const allowed = {
      REUSABLE: policy.credentialInventory.reusableAllowed,
      UNIQUE_INVENTORY: policy.credentialInventory.uniqueAllowed,
      APPROVED_PROVIDER: policy.credentialInventory.providerGeneratedAllowed,
      SELLER_AFTER_PAYMENT:
        policy.credentialInventory.sellerEnteredAfterPaymentAllowed,
    }[input.allocationMode];
    if (!allowed)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Ce mode d’attribution des accès n’est pas autorisé.",
      });
  }
  if (
    input.priceMinor !== undefined &&
    (input.currency !== policy.currency ||
      input.priceMinor < policy.minimumPrice.amountMinor ||
      input.priceMinor > policy.maximumPrice.amountMinor)
  ) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Le prix ne respecte pas la politique de ce marché.",
    });
  }
}
