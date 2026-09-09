import type { IconName } from "@shongre/ui";

/**
 * The published characteristics, described structurally rather than imported
 * from either client's own contract file: this projection is what makes the Web
 * and native detail pages agree about what a listing says, so it cannot depend
 * on one of them.
 */
export interface ListingCharacteristicItem {
  code: string;
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

/**
 * Groups whose facts identify the thing being sold rather than describe it.
 *
 * Ordering here is the ordering a reader gets: what it is, then which one, then
 * how much of it. Every other group keeps its published order behind them, so a
 * category with no entry in this table still renders correctly — it simply has
 * no promoted facts and fills the key set from its own first group.
 */
const PRIMARY_GROUP_ORDER: readonly string[] = [
  "grp.characteristics",
  "grp.classification",
  "grp.general",
  "grp.vehicle_identity",
  "grp.vehicle_technical",
  "grp.property_classification",
  "grp.property_specs",
  "grp.holiday_specs",
  "grp.job_role",
  "grp.job_contract",
  "grp.education_offer",
  "grp.pet_identity",
  "grp.equipment",
  "grp.electronics_specs",
  "grp.home_specs",
  "grp.baby_specs",
  "grp.culture_specs",
  "grp.service",
  "grp.event",
  "grp.ticket",
  "grp.dimensions",
];

/**
 * Icons are chosen by what the fact means, not by which vertical published it,
 * so a capacity reads the same on a holiday rental and on a van. Codes are
 * matched before groups because a code is the more specific signal; anything
 * unmatched falls back to the group's own icon and finally to a neutral tag.
 */
const ICON_BY_CODE: ReadonlyArray<readonly [RegExp, IconName]> = [
  // Ordered most specific first: a row of identical icons is no more useful
  // than no icons at all, so codes that would otherwise collapse onto their
  // group's mark are separated before the broader patterns run.
  [/(industry|sector|segment|domain)/, "layers"],
  [/(working_arrangement|remote|onsite|hybrid|telework)/, "home"],
  [/(working_time|schedule|part_time|full_time|availability)/, "calendar"],
  [/(contract|agreement|licence|license)/, "file"],
  [/^(brand|make|model|manufacturer|reference)/, "tag"],
  [/(year|date|_at$|duration|period|stay|check_in|check_out)/, "calendar"],
  [/(mileage|usage_hours|hours|odometer|consumption|rating|power)/, "gauge"],
  [/(fuel|energy_class|energy_efficiency|power_source|electric)/, "fuel"],
  [/(transmission|gearbox|maintenance|assembly|setting)/, "settings"],
  [/(capacity|seats|persons|beds|guests|rooms|bedrooms|occupan)/, "user"],
  [/(area|surface|size|length|width|height|weight|dimension|volume)/, "ruler"],
  [/(price|salary|compensation|deposit|charge|fee|payment)/, "payment"],
  [/(delivery|shipping|transport|pickup)/, "truck"],
  [
    /(warranty|insurance|certification|compliance|regulatory|critair)/,
    "shield",
  ],
  [/(contract|employment|job|experience|profession)/, "briefcase"],
  [/(course|education|level|diploma|subject|lesson)/, "book-open"],
  [/(location|city|address|zone|region|area_served)/, "map-pin"],
  [/(star|score|grade|condition|quality)/, "star"],
  [/(computer|device|screen|storage|memory|processor|laptop)/, "laptop"],
  [/(clothing|size_label|apparel|shoe)/, "shirt"],
  [/(type|category|nature|kind|family|segment)/, "layers"],
];

const ICON_BY_GROUP: Readonly<Record<string, IconName>> = {
  "grp.vehicle_identity": "tag",
  "grp.vehicle_technical": "settings",
  "grp.vehicle_regulatory": "shield",
  "grp.vehicle_history": "file",
  "grp.property_specs": "home",
  "grp.property_energy": "zap",
  "grp.property_classification": "home",
  "grp.property_regulatory": "shield",
  "grp.property_financial": "payment",
  "grp.holiday_specs": "home",
  "grp.job_role": "briefcase",
  "grp.job_contract": "file",
  "grp.job_compensation": "payment",
  "grp.job_conditions": "settings",
  "grp.job_employer": "briefcase",
  "grp.job_requirements": "check",
  "grp.candidate_profile": "user",
  "grp.education_offer": "book-open",
  "grp.education_tutor": "user",
  "grp.education_price": "payment",
  "grp.electronics_specs": "laptop",
  "grp.equipment": "settings",
  "grp.equipment_service": "truck",
  "grp.dimensions": "ruler",
  "grp.delivery": "truck",
  "grp.location": "map-pin",
  "grp.service_location": "map-pin",
  "grp.price": "payment",
  "grp.service_price": "payment",
  "grp.regulatory": "shield",
  "grp.pet_health": "shield",
  "grp.pet_identity": "tag",
  "grp.seller": "user",
  "grp.professional": "briefcase",
  "grp.media": "camera",
  "grp.event": "calendar",
  "grp.ticket": "file",
};

export function iconForFact(groupId: string, code: string): IconName {
  const normalized = code.toLowerCase();
  for (const [pattern, icon] of ICON_BY_CODE) {
    if (pattern.test(normalized)) return icon;
  }
  return ICON_BY_GROUP[groupId] ?? "tag";
}

function toFact(group: Group, item: Item): ListingFact {
  return {
    code: item.code,
    label: item.label,
    value: item.value,
    icon: iconForFact(group.id, item.code),
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
  const orderedGroups = [...groups].sort((left, right) => {
    const leftRank = PRIMARY_GROUP_ORDER.indexOf(left.id);
    const rightRank = PRIMARY_GROUP_ORDER.indexOf(right.id);
    if (leftRank === rightRank) return 0;
    if (leftRank === -1) return 1;
    if (rightRank === -1) return -1;
    return leftRank - rightRank;
  });

  const factGroups: ListingFactGroup[] = [];
  for (const group of orderedGroups) {
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
