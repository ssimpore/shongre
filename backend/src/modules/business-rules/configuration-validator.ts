import type {
  CommercialRule,
  ConfigurationConflict,
  MonetizationCatalog,
} from '@shongre/contracts/monetization';

const canonical = (value: unknown) =>
  JSON.stringify(value, (_key, child) => {
    if (!child || typeof child !== 'object' || Array.isArray(child)) return child;
    return Object.fromEntries(
      Object.entries(child).sort(([left], [right]) => left.localeCompare(right)),
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
      key !== 'reasonCode' &&
      key in right.outcome &&
      canonical(left.outcome[key as keyof typeof left.outcome]) !==
        canonical(right.outcome[key as keyof typeof right.outcome]),
  );
}

export function validateCommercialConfiguration(
  catalog: MonetizationCatalog,
): ConfigurationConflict[] {
  const conflicts: ConfigurationConflict[] = [];
  const productIds = new Set(catalog.products.map((product) => product.id));

  for (const [field, values] of [
    ['product id', catalog.products.map((product) => product.id)],
    ['product code', catalog.products.map((product) => product.code)],
    ['rule key', catalog.rules.map((rule) => rule.key)],
    ['promotion code', catalog.promotions.map((promotion) => promotion.code)],
  ] as const) {
    const duplicates = [
      ...new Set(values.filter((value, index) => values.indexOf(value) !== index)),
    ];
    if (duplicates.length) {
      conflicts.push({
        code: 'DUPLICATE_IDENTIFIER',
        severity: 'blocking',
        entityIds: duplicates,
        message: `${field} dupliqué : ${duplicates.join(', ')}.`,
      });
    }
  }

  for (const product of catalog.products) {
    const missingDependencies = product.compatibility.requiresProductIds.filter(
      (id) => !productIds.has(id),
    );
    const missingExclusions = product.compatibility.excludesProductIds.filter(
      (id) => !productIds.has(id),
    );
    const contradictory = product.compatibility.requiresProductIds.filter((id) =>
      product.compatibility.excludesProductIds.includes(id),
    );
    if (missingDependencies.length || missingExclusions.length) {
      conflicts.push({
        code: 'UNKNOWN_PRODUCT_REFERENCE',
        severity: 'blocking',
        entityIds: [product.id, ...missingDependencies, ...missingExclusions],
        message: `${product.name} référence un produit absent du catalogue.`,
      });
    }
    if (
      contradictory.length ||
      product.compatibility.excludesProductIds.includes(product.id)
    ) {
      conflicts.push({
        code: 'CONTRADICTORY_COMPATIBILITY',
        severity: 'blocking',
        entityIds: [product.id, ...contradictory],
        message: `${product.name} contient des dépendances et exclusions incompatibles.`,
      });
    }
    for (const price of product.prices) {
      if (price.amount.currency !== catalog.currency) {
        conflicts.push({
          code: 'CATALOG_CURRENCY_MISMATCH',
          severity: 'blocking',
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
          code: 'INVALID_EFFECTIVE_PERIOD',
          severity: 'blocking',
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
        code: 'INVALID_EFFECTIVE_PERIOD',
        severity: 'blocking',
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
        code: 'AMBIGUOUS_RULE_PRECEDENCE',
        severity: 'blocking',
        entityIds: [left.id, right.id],
        message: `${left.name} et ${right.name} ont la même portée et priorité mais divergent sur ${keys.join(', ')}.`,
      });
    }
  }

  for (const promotion of catalog.promotions) {
    const unknownProducts = promotion.productIds.filter((id) => !productIds.has(id));
    if (unknownProducts.length) {
      conflicts.push({
        code: 'PROMOTION_UNKNOWN_PRODUCT',
        severity: 'blocking',
        entityIds: [promotion.id, ...unknownProducts],
        message: `${promotion.name} cible des produits absents.`,
      });
    }
    if (promotion.discountType === 'percentage' && promotion.discountValue > 10_000) {
      conflicts.push({
        code: 'INVALID_PERCENTAGE_DISCOUNT',
        severity: 'blocking',
        entityIds: [promotion.id],
        message: `${promotion.name} dépasse 100 % de remise.`,
      });
    }
    if (promotion.endsAt <= promotion.startsAt) {
      conflicts.push({
        code: 'INVALID_EFFECTIVE_PERIOD',
        severity: 'blocking',
        entityIds: [promotion.id],
        message: `La période de ${promotion.name} est invalide.`,
      });
    }
  }

  return conflicts;
}
