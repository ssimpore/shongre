import type { IconName } from "@shongre/ui";
import type { ListingCharacteristicIcon } from "@shongre/contracts/listings";
import type { components } from "@shongre/contracts/openapi";
import { localizeTaxonomyLabels } from "@shongre/contracts/taxonomy-labels";

/**
 * The published characteristics, described structurally rather than imported
 * from either client's own contract file: this projection is what makes the Web
 * and native detail pages agree about what a listing says, so it cannot depend
 * on one of them.
 */
export interface ListingCharacteristicItem {
  code: string;
  icon?: ListingCharacteristicIcon;
  label: string;
  value: string;
  /** `feature` marks a capability the listing has — an affirmative boolean. */
  presentation?: "fact" | "feature";
}
export interface ListingCharacteristicGroup {
  id: string;
  label: string;
  items: readonly ListingCharacteristicItem[];
}
export interface ListingCharacteristicsData {
  /** Readonly because the generated contract types are, and this only reads. */
  groups: readonly ListingCharacteristicGroup[];
}

type Group = ListingCharacteristicGroup;
type Item = ListingCharacteristicItem;

export interface ListingFact {
  code: string;
  label: string;
  value: string;
  icon: IconName;
  /** The group it came from, so a disclosure can still show its origin. */
  groupId: string;
  groupLabel: string;
}

export interface ListingFactGroup {
  id: string;
  label: string;
  facts: ListingFact[];
}

export interface ListingFactPresentation {
  /** The first facts a reader needs, shown before any disclosure. */
  keyFacts: ListingFact[];
  /** Capabilities the listing has, shown as named amenities. */
  features: ListingFact[];
  /** Everything else, kept behind a disclosure and grouped as published. */
  additionalGroups: ListingFactGroup[];
  additionalCount: number;
}

/**
 * How many facts a detail page shows before the disclosure.
 *
 * Eight fills the two-column grid evenly at every width in the responsive
 * matrix and matches what a reader can take in without scrolling past the
 * media. The rest is not hidden, only deferred.
 */
export const KEY_FACT_LIMIT = 8;

function toFact(group: Group, item: Item): ListingFact {
  return {
    code: item.code,
    label: item.label,
    value: item.value,
    icon: item.icon ?? "tag",
    groupId: group.id,
    groupLabel: group.label,
  };
}

function isFeature(item: Item): boolean {
  return item.presentation === "feature";
}

/**
 * Turns a published characteristics projection into the three things a detail
 * page shows: the facts that identify the listing, the capabilities it has, and
 * everything else behind a disclosure.
 *
 * The split is driven entirely by the projection — the group's published order
 * and the backend's `presentation` flag — so a category nobody anticipated here
 * still renders in the same shape rather than needing its own branch in a page.
 */
export function buildListingFactPresentation(
  data: ListingCharacteristicsData | null | undefined,
  options: { keyFactLimit?: number } = {},
): ListingFactPresentation {
  const limit = options.keyFactLimit ?? KEY_FACT_LIMIT;
  const groups = data?.groups ?? [];

  const features: ListingFact[] = [];
  const factGroups: ListingFactGroup[] = [];
  for (const group of groups) {
    const groupFacts: ListingFact[] = [];
    for (const item of group.items) {
      const fact = toFact(group, item);
      if (isFeature(item)) features.push(fact);
      else groupFacts.push(fact);
    }
    if (groupFacts.length) {
      factGroups.push({ id: group.id, label: group.label, facts: groupFacts });
    }
  }

  const flattened = factGroups.flatMap((group) => group.facts);
  const keyFacts = flattened.slice(0, limit);
  const promoted = new Set(
    keyFacts.map((fact) => `${fact.groupId}:${fact.code}`),
  );

  const additionalGroups = factGroups
    .map((group) => ({
      ...group,
      facts: group.facts.filter(
        (fact) => !promoted.has(`${fact.groupId}:${fact.code}`),
      ),
    }))
    .filter((group) => group.facts.length > 0);

  return {
    keyFacts,
    features,
    additionalGroups,
    additionalCount: additionalGroups.reduce(
      (total, group) => total + group.facts.length,
      0,
    ),
  };
}

/** Adapt the API's localized fields without inventing a category, group or icon. */
export function localizeListingCharacteristics(
  fields:
    | readonly components["schemas"]["TaxonomyLocalizedCharacteristic"][]
    | undefined,
  locale: string,
): ListingCharacteristicsData {
  const groups = new Map<
    string,
    { id: string; label: string; items: ListingCharacteristicItem[] }
  >();
  for (const field of fields ?? []) {
    const id = field.groupId ?? "characteristics";
    const group: NonNullable<ReturnType<typeof groups.get>> = groups.get(
      id,
    ) ?? {
      id,
      label: field.groupLabels
        ? localizeTaxonomyLabels(field.groupLabels, locale)
        : "",
      items: [],
    };
    group.items.push({
      code: field.code,
      label: localizeTaxonomyLabels(field.labels, locale),
      value: localizeTaxonomyLabels(field.values, locale),
      icon: field.icon,
      presentation: field.presentation,
    });
    groups.set(id, group);
  }
  return { groups: [...groups.values()] };
}
