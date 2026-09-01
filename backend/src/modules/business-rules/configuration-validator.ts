import type {
  CommissionRule,
  CommercialRule,
  ConfigurationConflict,
  MonetizationCatalog,
} from "@shongre/contracts/monetization";
import {
  hasCommercialEntitlementValue,
  isCommercialEntitlementOperational,
} from "@shongre/contracts/monetization";
import { getCountryConfig } from "@shongre/contracts";

const canonical = (value: unknown) =>
  JSON.stringify(value, (_key, child) => {
    if (!child || typeof child !== "object" || Array.isArray(child))
      return child;
    return Object.fromEntries(
      Object.entries(child).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
  });

function ruleSignature(rule: CommercialRule) {
  return canonical({
    mandatory: rule.mandatory,
    priority: rule.priority,
    scope: rule.scope,
    conditions: rule.conditions,
    effectiveFrom: rule.effectiveFrom,
    effectiveUntil: rule.effectiveUntil,
  });
}

function conflictingOutcomeKeys(left: CommercialRule, right: CommercialRule) {
  return Object.keys(left.outcome).filter(
    (key) =>
      key !== "reasonCode" &&
      key in right.outcome &&
      canonical(left.outcome[key as keyof typeof left.outcome]) !==
        canonical(right.outcome[key as keyof typeof right.outcome]),
  );
}

function commissionRuleSignature(rule: CommissionRule) {
  return canonical({
    priority: rule.priority,
    scope: rule.scope,
    effectiveFrom: rule.effectiveFrom,
    effectiveUntil: rule.effectiveUntil,
  });
}

export function validateCommercialConfiguration(
  catalog: MonetizationCatalog,
): ConfigurationConflict[] {
  const conflicts: ConfigurationConflict[] = [];
  const productIds = new Set(catalog.products.map((product) => product.id));
  const country = getCountryConfig(catalog.marketCode);
  if (!country) {
    conflicts.push({
      code: "COMMERCIAL_MARKET_UNKNOWN",
      severity: "blocking",
      entityIds: [catalog.marketCode],
      message: `Le marché ${catalog.marketCode} est absent du registre canonique.`,
    });
  } else {
    const readinessIssues = [
      ...Object.entries(country.readiness)
        .filter(([, ready]) => !ready)
        .map(([key]) => `readiness.${key}`),
      ...(!country.monetization.enabled ? ["monetization.enabled"] : []),
      ...(!country.capabilities.subscriptions
        ? ["capabilities.subscriptions"]
        : []),
      ...(!country.capabilities.payments ? ["capabilities.payments"] : []),
      ...(country.taxes.mode !== "configured" ? ["taxes.mode"] : []),
    ];
    if (country.currency !== catalog.currency) {
      readinessIssues.push("currency");
    }
    if (readinessIssues.length > 0) {
      conflicts.push({
        code: "COMMERCIAL_MARKET_NOT_READY",
        severity: "blocking",
        entityIds: [catalog.marketCode, ...readinessIssues],
        message: `Le marché ${catalog.marketCode} ne satisfait pas la readiness commerciale : ${readinessIssues.join(", ")}.`,
      });
    }
  }

  if (
    catalog.subscriptionPolicy.immediateUpgrade === "not_configured" ||
    catalog.subscriptionPolicy.upgradeProration === "not_configured" ||
    catalog.subscriptionPolicy.downgradeTiming === "not_configured" ||
    catalog.subscriptionPolicy.samePlanRenewalTiming === "not_configured" ||
    catalog.subscriptionPolicy.billingIntervalChangeTiming ===
      "not_configured" ||
    catalog.subscriptionPolicy.cancellationTiming === "not_configured" ||
    catalog.subscriptionPolicy.paymentFailureAccess === "not_configured" ||
    catalog.subscriptionPolicy.providerPlanChange === "not_configured"
  ) {
    conflicts.push({
      code: "SUBSCRIPTION_TRANSITION_POLICY_INCOMPLETE",
      severity: "blocking",
      entityIds: [catalog.subscriptionPolicy.id],
      message:
        "La politique de transition d’abonnement doit être complète avant une nouvelle publication.",
    });
  }

  for (const [field, values] of [
    ["product id", catalog.products.map((product) => product.id)],
    ["product code", catalog.products.map((product) => product.code)],
    ["rule key", catalog.rules.map((rule) => rule.key)],
    [
      "commission policy id",
      catalog.commissionPolicies.map((policy) => policy.id),
    ],
    [
      "commission policy code",
      catalog.commissionPolicies.map((policy) => policy.code),
    ],
    [
      "commission rule id",
      catalog.commissionPolicies.flatMap((policy) =>
        policy.rules.map((rule) => rule.id),
      ),
    ],
    ["promotion code", catalog.promotions.map((promotion) => promotion.code)],
    [
      "plan migration mapping id",
      catalog.migrationMappings.map((mapping) => mapping.id),
    ],
    [
      "price protection policy id",
      catalog.priceProtectionPolicies.map((policy) => policy.id),
    ],
    ["campaign id", catalog.campaigns.map((campaign) => campaign.id)],
    [
      "commercial economics id",
      catalog.commercialEconomics.map((economics) => economics.id),
    ],
    [
      "provider mapping id",
      catalog.providerMappings.map((mapping) => mapping.id),
    ],
    [
      "paid placement policy id",
      catalog.paidPlacementPolicies.map((policy) => policy.id),
    ],
    [
      "unpriced offer definition id",
      catalog.offerDefinitions.map((offer) => offer.id),
    ],
  ] as const) {
    const duplicates = [
      ...new Set(
        values.filter((value, index) => values.indexOf(value) !== index),
      ),
    ];
    if (duplicates.length) {
      conflicts.push({
        code: "DUPLICATE_IDENTIFIER",
        severity: "blocking",
        entityIds: duplicates,
        message: `${field} dupliqué : ${duplicates.join(", ")}.`,
      });
    }
  }

  for (const mapping of catalog.migrationMappings) {
    if (!productIds.has(mapping.fromProductId)) {
      conflicts.push({
        code: "MIGRATION_SOURCE_PRODUCT_UNKNOWN",
        severity: "blocking",
        entityIds: [mapping.id, mapping.fromProductId],
        message: `${mapping.id} référence une offre source absente du catalogue.`,
      });
    }
    if (!productIds.has(mapping.toProductId)) {
      conflicts.push({
        code: "MIGRATION_TARGET_PRODUCT_UNKNOWN",
        severity: "blocking",
        entityIds: [mapping.id, mapping.toProductId],
        message: `${mapping.id} référence une offre cible absente du catalogue.`,
      });
    }
    if (
      !mapping.preserveHistoricalPrice ||
      !mapping.preserveHistoricalEntitlements
    ) {
      conflicts.push({
        code: "MIGRATION_HISTORY_NOT_PRESERVED",
        severity: "blocking",
        entityIds: [mapping.id],
        message: `${mapping.id} doit préserver le prix et les droits historiques.`,
      });
    }
    if (
      !["matched", "intentional_difference"].includes(mapping.shadowQuoteStatus)
    ) {
      conflicts.push({
        code: "MIGRATION_SHADOW_QUOTE_INCOMPLETE",
        severity: "blocking",
        entityIds: [mapping.id],
        message: `${mapping.id} ne peut pas être publié avant comparaison des devis fantômes.`,
      });
    }
    const sourceProduct = catalog.products.find(
      (product) => product.id === mapping.fromProductId,
    );
    const targetProduct = catalog.products.find(
      (product) => product.id === mapping.toProductId,
    );
    if (
      mapping.treatment !== "no_replacement" &&
      targetProduct?.status !== "active"
    ) {
      conflicts.push({
        code: "MIGRATION_TARGET_NOT_SELECTABLE",
        severity: "blocking",
        entityIds: [mapping.id, mapping.toProductId],
        message: `${mapping.id} ne peut pas être publié tant que l’offre de remplacement n’est pas active.`,
      });
    }
    if (
      mapping.treatment !== "no_replacement" &&
      sourceProduct?.status === "active" &&
      targetProduct?.status === "active"
    ) {
      conflicts.push({
        code: "MIGRATION_SOURCE_STILL_SELECTABLE",
        severity: "blocking",
        entityIds: [mapping.id, mapping.fromProductId, mapping.toProductId],
        message: `${mapping.id} ne peut pas publier simultanément l’ancien tarif et son offre de remplacement.`,
      });
    }
  }

  const campaignIds = new Set(catalog.campaigns.map((campaign) => campaign.id));
  const protectionPolicyIds = new Set(
    catalog.priceProtectionPolicies.map((policy) => policy.id),
  );
  for (const policy of catalog.priceProtectionPolicies) {
    const unknownProducts = policy.productIds.filter(
      (productId) => !productIds.has(productId),
    );
    if (unknownProducts.length) {
      conflicts.push({
        code: "PRICE_PROTECTION_PRODUCT_UNKNOWN",
        severity: "blocking",
        entityIds: [policy.id, ...unknownProducts],
        message: `${policy.name} référence des offres absentes du catalogue.`,
      });
    }
    if (policy.campaignId && !campaignIds.has(policy.campaignId)) {
      conflicts.push({
        code: "PRICE_PROTECTION_CAMPAIGN_UNKNOWN",
        severity: "blocking",
        entityIds: [policy.id, policy.campaignId],
        message: `${policy.name} référence une campagne absente.`,
      });
    }
  }

  for (const campaign of catalog.campaigns) {
    const unknownProducts = campaign.productIds.filter(
      (productId) => !productIds.has(productId),
    );
    if (unknownProducts.length) {
      conflicts.push({
        code: "CAMPAIGN_PRODUCT_UNKNOWN",
        severity: "blocking",
        entityIds: [campaign.id, ...unknownProducts],
        message: `${campaign.name} référence des offres absentes du catalogue.`,
      });
    }
    if (
      campaign.priceProtectionPolicyId &&
      !protectionPolicyIds.has(campaign.priceProtectionPolicyId)
    ) {
      conflicts.push({
        code: "CAMPAIGN_PRICE_PROTECTION_UNKNOWN",
        severity: "blocking",
        entityIds: [campaign.id, campaign.priceProtectionPolicyId],
        message: `${campaign.name} référence une politique de protection de prix absente.`,
      });
    }
    if (
      campaign.status !== "disabled" &&
      (!campaign.enrollmentStartsAt || !campaign.enrollmentEndsAt)
    ) {
      conflicts.push({
        code: "CAMPAIGN_ENROLLMENT_WINDOW_MISSING",
        severity: "blocking",
        entityIds: [campaign.id],
        message: `${campaign.name} doit définir sa fenêtre d’inscription avant approbation.`,
      });
    }
  }

  const priceIds = new Set(
    catalog.products.flatMap((product) =>
      product.prices.map((price) => price.id),
    ),
  );
  const paidRecurringPriceIds = catalog.products
    .filter(
      (product) =>
        !["disabled", "archived"].includes(product.status) &&
        product.kind === "subscription",
    )
    .flatMap((product) =>
      product.prices
        .filter(
          (price) =>
            ["month", "year"].includes(price.billingPeriod) &&
            price.amount.amountMinor > 0,
        )
        .map((price) => price.id),
    );
  const unmappedRecurringPrices = paidRecurringPriceIds.filter(
    (priceId) =>
      !catalog.providerMappings.some(
        (mapping) =>
          mapping.internalReferenceType === "price" &&
          mapping.internalReferenceId === priceId &&
          mapping.marketCode === catalog.marketCode &&
          mapping.status === "active" &&
          mapping.synchronizationStatus === "synchronized" &&
          Boolean(mapping.externalReferenceId),
      ),
  );
  if (unmappedRecurringPrices.length > 0) {
    conflicts.push({
      code: "SUBSCRIPTION_PROVIDER_PRICE_MAPPING_MISSING",
      severity: "blocking",
      entityIds: unmappedRecurringPrices,
      message:
        "Chaque prix récurrent actif doit avoir un mapping prestataire synchronisé.",
    });
  }
  for (const economics of catalog.commercialEconomics) {
    if (!productIds.has(economics.productId)) {
      conflicts.push({
        code: "ECONOMICS_PRODUCT_UNKNOWN",
        severity: "blocking",
        entityIds: [economics.id, economics.productId],
        message: `${economics.id} référence une offre absente.`,
      });
    }
    if (economics.priceId && !priceIds.has(economics.priceId)) {
      conflicts.push({
        code: "ECONOMICS_PRICE_UNKNOWN",
        severity: "blocking",
        entityIds: [economics.id, economics.priceId],
        message: `${economics.id} référence un prix absent.`,
      });
    }
    if (
      economics.status !== "disabled" &&
      economics.approvalStatus !== "approved"
    ) {
      conflicts.push({
        code: "ECONOMICS_APPROVAL_REQUIRED",
        severity: "blocking",
        entityIds: [economics.id],
        message: `${economics.id} doit être complété et approuvé avant publication.`,
      });
    }
  }

  for (const mapping of catalog.providerMappings) {
    const referenceExists =
      mapping.internalReferenceType === "price"
        ? priceIds.has(mapping.internalReferenceId)
        : mapping.internalReferenceType === "product"
          ? productIds.has(mapping.internalReferenceId)
          : mapping.internalReferenceType === "campaign"
            ? campaignIds.has(mapping.internalReferenceId)
            : true;
    if (!referenceExists) {
      conflicts.push({
        code: "PROVIDER_MAPPING_REFERENCE_UNKNOWN",
        severity: "blocking",
        entityIds: [mapping.id, mapping.internalReferenceId],
        message: `${mapping.id} référence un objet commercial absent.`,
      });
    }
    if (
      mapping.status !== "disabled" &&
      mapping.synchronizationStatus !== "synchronized"
    ) {
      conflicts.push({
        code: "PROVIDER_MAPPING_NOT_SYNCHRONIZED",
        severity: "blocking",
        entityIds: [mapping.id],
        message: `${mapping.id} n’est pas synchronisé et bloque la publication.`,
      });
    }
  }

  for (const policy of catalog.paidPlacementPolicies) {
    const product = catalog.products.find(
      (candidate) => candidate.id === policy.productId,
    );
    if (!product || product.kind !== "sponsored_placement") {
      conflicts.push({
        code: "PAID_PLACEMENT_PRODUCT_INVALID",
        severity: "blocking",
        entityIds: [policy.id, policy.productId],
        message: `${policy.id} doit référencer un produit de placement sponsorisé.`,
      });
    }
  }

  for (const offer of catalog.offerDefinitions) {
    if (
      ["active", "approved", "scheduled"].includes(offer.status) &&
      offer.readiness !== "ready"
    ) {
      conflicts.push({
        code: "UNPRICED_OFFER_NOT_READY",
        severity: "blocking",
        entityIds: [offer.id],
        message: `${offer.name} ne peut pas être activé sans readiness complète.`,
      });
    }
  }

  const commissionRules = catalog.commissionPolicies.flatMap((policy) =>
    policy.rules.map((rule) => ({ policy, rule })),
  );
  for (let leftIndex = 0; leftIndex < commissionRules.length; leftIndex += 1) {
    const left = commissionRules[leftIndex];
    if (
      left.rule.scope.currencies.length > 0 &&
      !left.rule.scope.currencies.includes(catalog.currency)
    ) {
      conflicts.push({
        code: "COMMISSION_CURRENCY_MISMATCH",
        severity: "blocking",
        entityIds: [left.policy.id, left.rule.id],
        message: `${left.rule.name} ne s’applique pas à la devise ${catalog.currency} du catalogue.`,
      });
    }
    if (
      left.policy.status === "active" &&
      left.rule.effect.kind === "commission" &&
      (("rateBps" in left.rule.effect.model &&
        left.rule.effect.model.rateBps >= 5_000) ||
        (left.rule.effect.model.type === "tiered" &&
          left.rule.effect.model.tiers.some((tier) => tier.rateBps >= 5_000)))
    ) {
      conflicts.push({
        code: "HIGH_COMMISSION_RATE_REQUIRES_REVIEW",
        severity: "warning",
        entityIds: [left.policy.id, left.rule.id],
        message: `${left.rule.name} applique un taux d’au moins 50 % et nécessite une revue financière explicite.`,
      });
    }
    const adjustmentEffect =
      left.rule.effect.kind === "adjustment" ? left.rule.effect : undefined;
    if (
      adjustmentEffect?.promotionId &&
      !catalog.promotions.some(
        (promotion) => promotion.id === adjustmentEffect.promotionId,
      )
    ) {
      conflicts.push({
        code: "COMMISSION_PROMOTION_UNKNOWN",
        severity: "blocking",
        entityIds: [left.policy.id, left.rule.id, adjustmentEffect.promotionId],
        message: `${left.rule.name} référence une promotion absente du catalogue canonique.`,
      });
    }
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < commissionRules.length;
      rightIndex += 1
    ) {
      const right = commissionRules[rightIndex];
      if (left.rule.effect.kind !== right.rule.effect.kind) continue;
      if (
        commissionRuleSignature(left.rule) !==
        commissionRuleSignature(right.rule)
      )
        continue;
      if (canonical(left.rule.effect) === canonical(right.rule.effect))
        continue;
      conflicts.push({
        code: "AMBIGUOUS_COMMISSION_PRECEDENCE",
        severity: "blocking",
        entityIds: [left.rule.id, right.rule.id],
        message: `${left.rule.name} et ${right.rule.name} ont la même portée, priorité et période mais des calculs divergents.`,
      });
    }
  }

  for (const product of catalog.products) {
    const entitlementKeys = product.entitlements.map((entry) => entry.key);
    const duplicateEntitlements = [
      ...new Set(
        entitlementKeys.filter(
          (key, index) => entitlementKeys.indexOf(key) !== index,
        ),
      ),
    ];
    if (duplicateEntitlements.length) {
      conflicts.push({
        code: "DUPLICATE_ENTITLEMENT",
        severity: "blocking",
        entityIds: [product.id, ...duplicateEntitlements],
        message: `${product.name} contient des fonctionnalités dupliquées : ${duplicateEntitlements.join(", ")}.`,
      });
    }
    for (const entitlement of product.entitlements) {
      const carriesValue = hasCommercialEntitlementValue(entitlement.value);
      const commerciallyAvailable =
        entitlement.availability === "enabled" ||
        entitlement.availability === "beta";
      if (
        carriesValue &&
        commerciallyAvailable &&
        entitlement.implementationStatus !== "ready"
      ) {
        conflicts.push({
          code: "FEATURE_NOT_IMPLEMENTED",
          severity: "blocking",
          entityIds: [product.id, entitlement.key],
          message: `${product.name} ne peut pas activer ${entitlement.label} : son parcours de production est ${entitlement.implementationStatus === "external_dependency" ? "bloqué par une dépendance externe" : "incomplet"}.`,
        });
      } else if (carriesValue && entitlement.implementationStatus !== "ready") {
        conflicts.push({
          code: "FEATURE_COMMERCIAL_PROMISE_SUSPENDED",
          severity: "warning",
          entityIds: [product.id, entitlement.key],
          message: `${entitlement.label} reste configuré dans ${product.name}, mais est exclu des droits et des surfaces commerciales.`,
        });
      }
      if (!carriesValue || !isCommercialEntitlementOperational(entitlement))
        continue;
      const missingDependencies = entitlement.dependencies.filter(
        (dependencyKey) => {
          const dependency = product.entitlements.find(
            (candidate) => candidate.key === dependencyKey,
          );
          return (
            !dependency ||
            !hasCommercialEntitlementValue(dependency.value) ||
            !isCommercialEntitlementOperational(dependency)
          );
        },
      );
      if (missingDependencies.length) {
        conflicts.push({
          code: "FEATURE_DEPENDENCY_MISSING",
          severity: "blocking",
          entityIds: [product.id, entitlement.key, ...missingDependencies],
          message: `${entitlement.label} requiert ${missingDependencies.join(", ")} dans ${product.name}.`,
        });
      }
    }
    const missingDependencies = product.compatibility.requiresProductIds.filter(
      (id) => !productIds.has(id),
    );
    const missingExclusions = product.compatibility.excludesProductIds.filter(
      (id) => !productIds.has(id),
    );
    const contradictory = product.compatibility.requiresProductIds.filter(
      (id) => product.compatibility.excludesProductIds.includes(id),
    );
    if (missingDependencies.length || missingExclusions.length) {
      conflicts.push({
        code: "UNKNOWN_PRODUCT_REFERENCE",
        severity: "blocking",
        entityIds: [product.id, ...missingDependencies, ...missingExclusions],
        message: `${product.name} référence un produit absent du catalogue.`,
      });
    }
    if (
      contradictory.length ||
      product.compatibility.excludesProductIds.includes(product.id)
    ) {
      conflicts.push({
        code: "CONTRADICTORY_COMPATIBILITY",
        severity: "blocking",
        entityIds: [product.id, ...contradictory],
        message: `${product.name} contient des dépendances et exclusions incompatibles.`,
      });
    }
    for (const price of product.prices) {
      if (price.amount.currency !== catalog.currency) {
        conflicts.push({
          code: "CATALOG_CURRENCY_MISMATCH",
          severity: "blocking",
          entityIds: [product.id, price.id],
          message: `${product.name} utilise ${price.amount.currency} dans un catalogue ${catalog.currency}.`,
        });
      }
      if (
        price.effectiveFrom &&
        price.effectiveUntil &&
        price.effectiveUntil <= price.effectiveFrom
      ) {
        conflicts.push({
          code: "INVALID_EFFECTIVE_PERIOD",
          severity: "blocking",
          entityIds: [product.id, price.id],
          message: `La période du prix ${price.id} est invalide.`,
        });
      }
    }
  }

  for (let leftIndex = 0; leftIndex < catalog.rules.length; leftIndex += 1) {
    const left = catalog.rules[leftIndex];
    if (
      left.effectiveFrom &&
      left.effectiveUntil &&
      left.effectiveUntil <= left.effectiveFrom
    ) {
      conflicts.push({
        code: "INVALID_EFFECTIVE_PERIOD",
        severity: "blocking",
        entityIds: [left.id],
        message: `La période de la règle ${left.name} est invalide.`,
      });
    }
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < catalog.rules.length;
      rightIndex += 1
    ) {
      const right = catalog.rules[rightIndex];
      if (ruleSignature(left) !== ruleSignature(right)) continue;
      const keys = conflictingOutcomeKeys(left, right);
      if (!keys.length) continue;
      conflicts.push({
        code: "AMBIGUOUS_RULE_PRECEDENCE",
        severity: "blocking",
        entityIds: [left.id, right.id],
        message: `${left.name} et ${right.name} ont la même portée et priorité mais divergent sur ${keys.join(", ")}.`,
      });
    }
  }

  for (const promotion of catalog.promotions) {
    const unknownProducts = promotion.productIds.filter(
      (id) => !productIds.has(id),
    );
    if (unknownProducts.length) {
      conflicts.push({
        code: "PROMOTION_UNKNOWN_PRODUCT",
        severity: "blocking",
        entityIds: [promotion.id, ...unknownProducts],
        message: `${promotion.name} cible des produits absents.`,
      });
    }
    if (
      promotion.discountType === "percentage" &&
      promotion.discountValue > 10_000
    ) {
      conflicts.push({
        code: "INVALID_PERCENTAGE_DISCOUNT",
        severity: "blocking",
        entityIds: [promotion.id],
        message: `${promotion.name} dépasse 100 % de remise.`,
      });
    }
    if (promotion.endsAt <= promotion.startsAt) {
      conflicts.push({
        code: "INVALID_EFFECTIVE_PERIOD",
        severity: "blocking",
        entityIds: [promotion.id],
        message: `La période de ${promotion.name} est invalide.`,
      });
    }
  }

  return conflicts;
}
