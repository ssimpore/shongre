import type {
  TaxonomyV1ListingIntent,
  TaxonomyV1ListingType,
  TaxonomyV1Node,
  TaxonomyV1ResolvedSchema,
  TaxonomyV1TreeResponse,
} from "@shongre/contracts";

export type ListingOnboardingSellerType = "individual" | "professional";

interface ListingOnboardingIntentOption {
  intent: TaxonomyV1ListingIntent;
  labels: TaxonomyV1ListingType["intentLabel"];
}

interface ListingOnboardingCategoryLevel {
  depth: number;
  parentId?: string;
  items: TaxonomyV1Node[];
}

export interface ListingOnboardingModel {
  intents: ListingOnboardingIntentOption[];
  path: TaxonomyV1Node[];
  levels: ListingOnboardingCategoryLevel[];
  eligibleListingTypes: TaxonomyV1ListingType[];
  selectedListingType?: TaxonomyV1ListingType;
  isComplete: boolean;
}

const sellerAllowed = (
  eligibility: TaxonomyV1Node["sellerEligibility"],
  sellerType: ListingOnboardingSellerType,
) =>
  sellerType === "individual"
    ? eligibility.individualAllowed
    : eligibility.professionalAllowed;

const sorted = <
  T extends { sortOrder?: number; labels?: Record<string, string | undefined> },
>(
  rows: readonly T[],
  locale = "fr-FR",
) =>
  [...rows].sort(
    (left, right) =>
      (left.sortOrder ?? 0) - (right.sortOrder ?? 0) ||
      String(
        left.labels?.[locale] ?? left.labels?.["fr-FR"] ?? "",
      ).localeCompare(
        String(right.labels?.[locale] ?? right.labels?.["fr-FR"] ?? ""),
        locale,
      ),
  );

export function localizedTaxonomyLabel(
  labels: Readonly<Record<string, string | undefined>>,
  locale: string,
): string {
  return (
    labels[locale] ??
    labels["fr-FR"] ??
    Object.values(labels).find(Boolean) ??
    ""
  );
}

export function restoreTaxonomyPath(
  items: readonly TaxonomyV1Node[],
  categoryId: string | undefined,
): string[] {
  if (!categoryId) return [];
  const byId = new Map(items.map((item) => [item.id, item]));
  const path: string[] = [];
  const seen = new Set<string>();
  let cursor = byId.get(categoryId);
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    path.unshift(cursor.id);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return path;
}

function normalizePath(
  items: readonly TaxonomyV1Node[],
  path: readonly string[],
): TaxonomyV1Node[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const normalized: TaxonomyV1Node[] = [];
  for (const id of path) {
    const node = byId.get(id);
    const expectedParent = normalized.at(-1)?.id;
    if (!node || node.parentId !== expectedParent) break;
    normalized.push(node);
  }
  return normalized;
}

export function buildListingOnboardingModel(input: {
  tree: TaxonomyV1TreeResponse;
  intent?: TaxonomyV1ListingIntent;
  sellerType: ListingOnboardingSellerType;
  selectedPath?: readonly string[];
  selectedCategoryId?: string;
  locale?: string;
}): ListingOnboardingModel {
  const locale = input.locale ?? input.tree.locale;
  const categoryById = new Map(input.tree.items.map((item) => [item.id, item]));
  const sellerListingTypes = input.tree.listingTypes.filter(
    (listingType) =>
      sellerAllowed(listingType.sellerEligibility, input.sellerType) &&
      sellerAllowed(
        categoryById.get(listingType.categoryId)?.sellerEligibility ?? {
          individualAllowed: false,
          professionalAllowed: false,
        },
        input.sellerType,
      ),
  );
  const intentById = new Map<
    TaxonomyV1ListingIntent,
    ListingOnboardingIntentOption
  >();
  for (const listingType of sellerListingTypes) {
    if (!intentById.has(listingType.intent)) {
      intentById.set(listingType.intent, {
        intent: listingType.intent,
        labels: listingType.intentLabel,
      });
    }
  }
  const intents = [...intentById.values()].sort((left, right) =>
    localizedTaxonomyLabel(left.labels, locale).localeCompare(
      localizedTaxonomyLabel(right.labels, locale),
      locale,
    ),
  );
  const eligibleListingTypes = sellerListingTypes.filter(
    (listingType) => !input.intent || listingType.intent === input.intent,
  );
  const eligibleCategoryIds = new Set<string>();
  for (const listingType of eligibleListingTypes) {
    let node = categoryById.get(listingType.categoryId);
    while (node) {
      eligibleCategoryIds.add(node.id);
      node = node.parentId ? categoryById.get(node.parentId) : undefined;
    }
  }
  const canonicalIdentity = (identity: string | undefined) =>
    identity &&
    (categoryById.has(identity)
      ? identity
      : (input.tree.aliases?.find((alias) => alias.alias === identity)
          ?.canonicalCategoryId ?? identity));
  const selectedPath = input.selectedPath?.map((id) => canonicalIdentity(id)!);
  const requestedPath =
    input.selectedPath && input.selectedPath.length > 0
      ? restoreTaxonomyPath(input.tree.items, selectedPath?.at(-1))
      : restoreTaxonomyPath(
          input.tree.items,
          canonicalIdentity(input.selectedCategoryId),
        );
  const path = normalizePath(input.tree.items, requestedPath).filter((node) =>
    eligibleCategoryIds.has(node.id),
  );
  const childrenByParent = new Map<string | undefined, TaxonomyV1Node[]>();
  for (const item of input.tree.items) {
    if (
      !eligibleCategoryIds.has(item.id) ||
      !sellerAllowed(item.sellerEligibility, input.sellerType)
    ) {
      continue;
    }
    const siblings = childrenByParent.get(item.parentId) ?? [];
    siblings.push(item);
    childrenByParent.set(item.parentId, siblings);
  }
  const levels: ListingOnboardingCategoryLevel[] = [];
  let parentId: string | undefined;
  for (let depth = 0; depth <= path.length; depth += 1) {
    const items = sorted(childrenByParent.get(parentId) ?? [], locale);
    if (items.length === 0) break;
    levels.push({ depth, parentId, items });
    const selected = path[depth];
    if (!selected || selected.parentId !== parentId) break;
    parentId = selected.id;
  }
  const selectedNode = path.at(-1);
  const matchingTypes = selectedNode
    ? eligibleListingTypes.filter(
        (listingType) => listingType.categoryId === selectedNode.id,
      )
    : [];
  const selectedListingType =
    matchingTypes.length === 1 ? matchingTypes[0] : undefined;
  return {
    intents,
    path,
    levels,
    eligibleListingTypes,
    selectedListingType,
    isComplete: Boolean(selectedNode?.publishable && selectedListingType),
  };
}

export function selectTaxonomyPathNode(input: {
  model: ListingOnboardingModel;
  depth: number;
  nodeId: string;
}): string[] {
  const level = input.model.levels.find(
    (candidate) => candidate.depth === input.depth,
  );
  if (!level?.items.some((item) => item.id === input.nodeId))
    return input.model.path.map((item) => item.id);
  return [
    ...input.model.path.slice(0, input.depth).map((item) => item.id),
    input.nodeId,
  ];
}

export function searchListingOnboardingCategories(input: {
  model: ListingOnboardingModel;
  tree: TaxonomyV1TreeResponse;
  query: string;
  locale: string;
  limit?: number;
}): TaxonomyV1Node[] {
  const query = input.query.trim().toLocaleLowerCase(input.locale);
  if (!query) return [];
  const eligible = new Set(
    input.model.eligibleListingTypes.map((type) => type.categoryId),
  );
  return input.tree.items
    .filter(
      (item) =>
        eligible.has(item.id) &&
        `${localizedTaxonomyLabel(item.labels, input.locale)} ${item.sourceKey}`
          .toLocaleLowerCase(input.locale)
          .includes(query),
    )
    .slice(0, input.limit ?? 8);
}

export interface TaxonomyPublicationFieldGroup {
  id: string;
  label: string;
  fields: TaxonomyV1ResolvedSchema["attributes"];
}

export function groupTaxonomyPublicationFields(input: {
  schema: TaxonomyV1ResolvedSchema;
  locale: string;
  excludedAttributeIds?: ReadonlySet<string>;
}): TaxonomyPublicationFieldGroup[] {
  const stepBySection = new Map(
    input.schema.projections.publicationFlow.flatMap((step) =>
      step.sections.map((section) => [section, step] as const),
    ),
  );
  const groups = new Map<string, TaxonomyPublicationFieldGroup>();
  for (const field of input.schema.attributes) {
    if (input.excludedAttributeIds?.has(field.definition.id)) continue;
    const groupId = field.binding.groupId;
    const step = stepBySection.get(groupId);
    const existing = groups.get(groupId);
    const group = existing ?? {
      id: groupId,
      label: step
        ? localizedTaxonomyLabel(step.labels, input.locale)
        : localizedTaxonomyLabel(field.definition.labels, input.locale),
      fields: [],
    };
    group.fields.push(field);
    groups.set(groupId, group);
  }
  return [...groups.values()];
}
