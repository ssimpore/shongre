import type {
  ActiveEntitlement,
  BillingOverview,
  BusinessVerticalCode,
  EntitlementMergePolicy,
  MonetizationCatalog,
} from "@shongre/contracts";

type EffectiveEntitlement = BillingOverview["effectiveEntitlements"][number];

type Candidate = {
  entry: ActiveEntitlement;
  label: string;
  mergePolicy: EntitlementMergePolicy;
  verticalId?: BusinessVerticalCode;
};

function catalogCandidate(
  catalog: MonetizationCatalog,
  entry: ActiveEntitlement,
): Candidate {
  const product = catalog.products.find((candidate) => candidate.id === entry.productId);
  const definition = product?.entitlements.find((candidate) => candidate.key === entry.key);
  const verticalId =
    entry.verticalId || definition?.verticalId || product?.commercialProfile.verticalId;

  return {
    entry,
    label: definition?.label || entry.key,
    mergePolicy: entry.mergePolicy || definition?.mergePolicy || "override",
    ...(verticalId && verticalId !== "general" ? { verticalId } : {}),
  };
}

function mergeValues(
  candidates: Candidate[],
  policy: EntitlementMergePolicy,
): ActiveEntitlement["value"] {
  const values = candidates.map(({ entry }) => entry.value);

  if (policy === "boolean_or") {
    return values.some((value) => value === true);
  }
  if (policy === "max") {
    const numbers = values.filter((value): value is number => typeof value === "number");
    return numbers.length > 0 ? Math.max(...numbers) : values.at(-1) ?? false;
  }
  if (policy === "additive") {
    const numbers = values.filter((value): value is number => typeof value === "number");
    return numbers.length > 0
      ? numbers.reduce((total, value) => total + value, 0)
      : values.at(-1) ?? false;
  }
  return values.at(-1) ?? false;
}

/**
 * Resolves generic and vertical-scoped grants for one product surface.
 * Grants from another vertical are deliberately excluded.
 */
export function resolveEffectiveEntitlementsForVertical(input: {
  catalog: MonetizationCatalog;
  entitlements: ActiveEntitlement[];
  verticalId?: BusinessVerticalCode;
  at?: Date;
}): EffectiveEntitlement[] {
  const now = (input.at || new Date()).getTime();
  const candidates = input.entitlements
    .filter(
      (entry) =>
        entry.status === "active" &&
        new Date(entry.startsAt).getTime() <= now &&
        (!entry.endsAt || new Date(entry.endsAt).getTime() > now),
    )
    .map((entry) => catalogCandidate(input.catalog, entry))
    .filter(
      (candidate) =>
        !candidate.verticalId || candidate.verticalId === input.verticalId,
    )
    .sort(
      (left, right) =>
        left.entry.startsAt.localeCompare(right.entry.startsAt) ||
        left.entry.id.localeCompare(right.entry.id),
    );

  const byKey = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const grouped = byKey.get(candidate.entry.key) || [];
    grouped.push(candidate);
    byKey.set(candidate.entry.key, grouped);
  }

  return [...byKey.entries()]
    .map(([key, grouped]): EffectiveEntitlement => {
      const scoped = [...grouped].reverse().find((candidate) => candidate.verticalId);
      const policy = scoped?.mergePolicy || grouped.at(-1)?.mergePolicy || "override";
      return {
        key,
        label: scoped?.label || grouped.at(-1)?.label || key,
        value: mergeValues(grouped, policy),
        ...(input.verticalId && input.verticalId !== "general"
          ? { verticalId: input.verticalId }
          : {}),
        mergePolicy: policy,
        sourceProductIds: [...new Set(grouped.map(({ entry }) => entry.productId))],
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, "fr"));
}

/** Returns the generic view and one composed view for every purchased vertical. */
export function resolveAllEffectiveEntitlements(input: {
  catalog: MonetizationCatalog;
  entitlements: ActiveEntitlement[];
  at?: Date;
}): EffectiveEntitlement[] {
  const candidates = input.entitlements.map((entry) =>
    catalogCandidate(input.catalog, entry),
  );
  const verticalIds = [
    ...new Set(
      candidates
        .map((candidate) => candidate.verticalId)
        .filter((verticalId): verticalId is BusinessVerticalCode => Boolean(verticalId)),
    ),
  ];

  return [
    ...resolveEffectiveEntitlementsForVertical(input),
    ...verticalIds.flatMap((verticalId) =>
      resolveEffectiveEntitlementsForVertical({ ...input, verticalId }),
    ),
  ];
}
