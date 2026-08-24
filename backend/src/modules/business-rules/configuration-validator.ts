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
