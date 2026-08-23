import type {
  DiscoveryConfiguration,
  DiscoveryEvent,
  DiscoveryPresentation,
  ListingPromotionState,
  PublisherType,
  PublisherVerificationStatus,
} from "@shongre/contracts";

export interface DiscoveryQualitySignals {
  requiredFieldsComplete?: boolean;
  recommendedFieldRatio?: number;
  descriptionLength?: number;
  imageCount?: number;
  mediaQuality?: number;
  taxonomyValid?: boolean;
  pricePlausibility?: number;
}

export interface DiscoveryTrustSignals {
  verificationStatus: PublisherVerificationStatus;
  accountAgeDays?: number;
  rating?: number;
  reviewCount?: number;
  responseRate?: number;
  successfulActivityCount?: number;
  confirmedReportCount?: number;
}

/**
 * Search-safe document. Subscription tier, spend and promotion are
 * deliberately absent from the organic signal sets.
 */
export interface DiscoveryDocument {
  id: string;
  publisherId: string;
  publisherType: PublisherType;
  marketCodes: string[];
  categoryId: string;
  categoryPath?: string[];
  title: string;
  description: string;
  searchableAttributes?: Array<string | number | boolean>;
  priceMinor: number;
  currency: string;
  city: string;
  status: string;
  availability?: "available" | "reserved" | "sold" | "unavailable";
  moderationStatus?: "approved" | "pending" | "rejected" | "suspended";
  publisherStatus?: "active" | "suspended" | "deleted";
  createdAt: string;
  publishedAt?: string;
  materiallyUpdatedAt?: string;
  organicFreshnessAt?: string;
  externalStockId?: string;
  duplicateGroupId?: string;
  quality: DiscoveryQualitySignals;
  trust: DiscoveryTrustSignals;
  personalizationScore?: number;
  promotion?: ListingPromotionState;
}

export interface DiscoveryRequest {
  requestId: string;
  marketCode: string;
  query?: string;
  categoryId?: string;
  city?: string;
  publisherType?: "all" | PublisherType;
  sort?: "relevance" | "recent" | "price_asc" | "price_desc";
  page?: number;
  pageSize?: number;
  now?: string;
}

export interface DiscoveryScoreExplanation {
  organicScore: number;
  signals: {
    relevance: number;
    category: number;
    location: number;
    quality: number;
    freshness: number;
    trust: number;
    price: number;
    personalization: number;
  };
}

export interface DiscoveryRankedItem {
  document: DiscoveryDocument;
  presentation: DiscoveryPresentation;
  /** Internal/admin debugging only. Do not expose fraud inputs publicly. */
  explanation: DiscoveryScoreExplanation;
}

export interface UnifiedDiscoveryResult {
  items: DiscoveryRankedItem[];
  /** Unique eligible results, including separately inserted sponsored listings. */
  totalResults: number;
  totalOrganic: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  nextCursor?: string;
  event: DiscoveryEvent;
}

export const DEFAULT_DISCOVERY_CONFIGURATION: DiscoveryConfiguration = {
  version: "unified-discovery-v1",
  marketCode: "FR",
  context: "search",
  weights: {
    relevance: 0.3,
    category: 0.12,
    location: 0.08,
    quality: 0.16,
    freshness: 0.12,
    trust: 0.12,
    price: 0.06,
    personalization: 0.04,
  },
  freshnessHalfLifeDays: 30,
  diversity: {
    maxConsecutivePerPublisher: 2,
    maxFirstPageSharePerPublisher: 0.35,
    maxSponsoredPerPublisher: 1,
    minimumRelevanceRatio: 0.72,
  },
  sponsored: {
    positions: [2, 7, 13],
    maxPerPage: 3,
    maxShare: 0.2,
    minimumRelevance: 0.25,
    minimumOrganicResults: 4,
  },
};

const ELIGIBLE_STATUSES = new Set(["active", "published"]);
const SEARCH_PLACEMENTS = new Set([
  "search_bump",
  "featured",
  "top_placement",
  "sponsored_search",
]);

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return [
    ...new Set(
      normalize(value)
        .split(" ")
        .filter((token) => token.length > 1),
    ),
  ];
}

function textRelevance(document: DiscoveryDocument, query?: string): number {
  if (!query?.trim()) return 0.65;
  const queryTokens = tokens(query);
  if (!queryTokens.length) return 0.65;
  const titleTokens = new Set(tokens(document.title));
  const haystackTokens = new Set(
    tokens(
      [
        document.title,
        document.description,
        ...(document.searchableAttributes || []).map(String),
      ].join(" "),
    ),
  );
  const matched = queryTokens.filter((token) => haystackTokens.has(token));
  const titleMatches = queryTokens.filter((token) => titleTokens.has(token));
  const coverage = matched.length / queryTokens.length;
  return clamp(
    coverage * 0.75 + (titleMatches.length / queryTokens.length) * 0.25,
  );
}

function categoryRelevance(
  document: DiscoveryDocument,
  categoryId?: string,
): number {
  if (!categoryId) return 1;
  if (document.categoryId === categoryId) return 1;
  return document.categoryPath?.includes(categoryId) ? 0.85 : 0;
}

function locationRelevance(document: DiscoveryDocument, city?: string): number {
  if (!city) return 1;
  const requested = normalize(city);
  const actual = normalize(document.city);
  if (actual === requested) return 1;
  return actual.includes(requested) || requested.includes(actual) ? 0.7 : 0;
}

export function calculateListingQuality(
  signals: DiscoveryQualitySignals,
): number {
  const recommended = clamp(signals.recommendedFieldRatio ?? 0.5);
  const description = clamp((signals.descriptionLength ?? 0) / 400);
  const images = clamp((signals.imageCount ?? 0) / 5);
  const media = clamp(signals.mediaQuality ?? (signals.imageCount ? 0.7 : 0));
  const price = clamp(signals.pricePlausibility ?? 0.6);
  return clamp(
    (signals.requiredFieldsComplete === false ? 0 : 0.2) +
      recommended * 0.18 +
      description * 0.14 +
      images * 0.18 +
      media * 0.12 +
      (signals.taxonomyValid === false ? 0 : 0.1) +
      price * 0.08,
  );
}

export function calculatePublisherTrust(
  signals: DiscoveryTrustSignals,
): number {
  const verification = {
    suspended: 0,
    unverified: 0.42,
    email_verified: 0.5,
    phone_verified: 0.58,
    identity_verified: 0.74,
    business_verified: 0.74,
  }[signals.verificationStatus];
  const accountAge = clamp((signals.accountAgeDays ?? 30) / 365);
  const rating = clamp(((signals.rating ?? 4) - 1) / 4);
  const ratingConfidence = clamp((signals.reviewCount ?? 0) / 20);
  const response = clamp((signals.responseRate ?? 70) / 100);
  const activity = clamp((signals.successfulActivityCount ?? 0) / 20);
  const reportsPenalty = clamp((signals.confirmedReportCount ?? 0) / 3);
  // The 0.42 floor keeps a legitimate new seller from being buried merely for
  // having no marketplace history.
  return clamp(
    verification * 0.42 +
      (0.42 + accountAge * 0.58) * 0.14 +
      (0.5 + (rating - 0.5) * ratingConfidence) * 0.16 +
      response * 0.14 +
      (0.42 + activity * 0.58) * 0.14 -
      reportsPenalty * 0.35,
  );
}

function freshnessScore(
  document: DiscoveryDocument,
  at: Date,
  halfLifeDays: number,
): number {
  const source =
    document.organicFreshnessAt ||
    document.materiallyUpdatedAt ||
    document.publishedAt ||
    document.createdAt;
  const ageDays = Math.max(
    0,
    (at.getTime() - new Date(source).getTime()) / 86_400_000,
  );
  return clamp(2 ** (-ageDays / halfLifeDays));
}

export function scoreOrganicListing(
  document: DiscoveryDocument,
  request: DiscoveryRequest,
  configuration: DiscoveryConfiguration = DEFAULT_DISCOVERY_CONFIGURATION,
): DiscoveryScoreExplanation {
  const now = new Date(request.now || Date.now());
  const signals = {
    relevance: textRelevance(document, request.query),
    category: categoryRelevance(document, request.categoryId),
    location: locationRelevance(document, request.city),
    quality: calculateListingQuality(document.quality),
    freshness: freshnessScore(
      document,
      now,
      configuration.freshnessHalfLifeDays,
    ),
    trust: calculatePublisherTrust(document.trust),
    price: clamp(
      document.quality.pricePlausibility ??
        (document.priceMinor >= 0 ? 0.7 : 0),
    ),
    personalization: clamp(document.personalizationScore ?? 0.5),
  };
  const organicScore = Object.entries(configuration.weights).reduce(
    (score, [key, weight]) =>
      score + signals[key as keyof typeof signals] * weight,
    0,
  );
  return { organicScore: clamp(organicScore), signals };
}

function isEligible(
  document: DiscoveryDocument,
  request: DiscoveryRequest,
): boolean {
  if (!ELIGIBLE_STATUSES.has(document.status)) return false;
  if (document.availability && document.availability !== "available")
    return false;
  if (document.moderationStatus && document.moderationStatus !== "approved")
    return false;
  if (document.publisherStatus && document.publisherStatus !== "active")
    return false;
  if (
    !document.marketCodes
      .map((code) => code.toUpperCase())
      .includes(request.marketCode.toUpperCase())
  ) {
    return false;
  }
  if (
    request.categoryId &&
    categoryRelevance(document, request.categoryId) === 0
  )
    return false;
  if (
    request.publisherType &&
    request.publisherType !== "all" &&
    document.publisherType !== request.publisherType
  ) {
    return false;
  }
  return true;
}

function duplicateKey(document: DiscoveryDocument): string {
  if (document.duplicateGroupId) return `group:${document.duplicateGroupId}`;
  if (document.externalStockId)
    return `stock:${document.publisherId}:${document.externalStockId}`;
  return [
    document.publisherId,
    document.categoryId,
    normalize(document.title),
    document.priceMinor,
    normalize(document.city),
    (document.searchableAttributes || [])
      .map((value) => normalize(String(value)))
      .filter(Boolean)
      .sort()
      .slice(0, 8)
      .join(","),
  ].join("|");
}

function compareRanked(
  left: DiscoveryRankedItem,
  right: DiscoveryRankedItem,
): number {
  return (
    right.explanation.organicScore - left.explanation.organicScore ||
    new Date(
      right.document.organicFreshnessAt ||
        right.document.publishedAt ||
        right.document.createdAt,
    ).getTime() -
      new Date(
        left.document.organicFreshnessAt ||
          left.document.publishedAt ||
          left.document.createdAt,
      ).getTime() ||
    left.document.id.localeCompare(right.document.id)
  );
}

function deduplicate(items: DiscoveryRankedItem[]): {
  items: DiscoveryRankedItem[];
  suppressed: number;
} {
  const best = new Map<string, DiscoveryRankedItem>();
  for (const item of items) {
    const key = duplicateKey(item.document);
    const existing = best.get(key);
    if (!existing || compareRanked(item, existing) < 0) best.set(key, item);
  }
  const result = [...best.values()].sort(compareRanked);
  return { items: result, suppressed: items.length - result.length };
}

function publisherShareAllowed(
  output: DiscoveryRankedItem[],
  candidate: DiscoveryRankedItem,
  pageSize: number,
  configuration: DiscoveryConfiguration,
): boolean {
  const { maxConsecutivePerPublisher, maxFirstPageSharePerPublisher } =
    configuration.diversity;
  const tail = output.slice(-maxConsecutivePerPublisher);
  if (
    tail.length === maxConsecutivePerPublisher &&
    tail.every(
      (item) => item.document.publisherId === candidate.document.publisherId,
    )
  ) {
    return false;
  }
  if (output.length < pageSize) {
    const cap = Math.max(
      1,
      Math.floor(pageSize * maxFirstPageSharePerPublisher),
    );
    const current = output.filter(
      (item) => item.document.publisherId === candidate.document.publisherId,
    ).length;
    if (current >= cap) return false;
  }
  return true;
}

function diversify(
  input: DiscoveryRankedItem[],
  pageSize: number,
  configuration: DiscoveryConfiguration,
): { items: DiscoveryRankedItem[]; moves: number } {
  const remaining = [...input];
  const output: DiscoveryRankedItem[] = [];
  let moves = 0;
  while (remaining.length) {
    const bestScore = remaining[0].explanation.organicScore;
    const alternateIndex = remaining.findIndex(
      (candidate) =>
        candidate.explanation.organicScore >=
          bestScore * configuration.diversity.minimumRelevanceRatio &&
        publisherShareAllowed(output, candidate, pageSize, configuration),
    );
    const selectedIndex = alternateIndex >= 0 ? alternateIndex : 0;
    if (selectedIndex > 0) moves += 1;
    output.push(remaining.splice(selectedIndex, 1)[0]);
  }
  return { items: output, moves };
}

function promotionIsActive(document: DiscoveryDocument, now: Date): boolean {
  const promotion = document.promotion;
  if (!promotion?.type || promotion.state !== "active") return false;
  if (!SEARCH_PLACEMENTS.has(promotion.type)) return false;
  if (promotion.startsAt && new Date(promotion.startsAt) > now) return false;
  if (promotion.endsAt && new Date(promotion.endsAt) <= now) return false;
  return Boolean(promotion.sourceId && promotion.source);
}

function sponsoredRelevance(item: DiscoveryRankedItem): number {
  const { relevance, category, location } = item.explanation.signals;
  return relevance * 0.6 + category * 0.25 + location * 0.15;
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function organicPresentation(
  configuration: DiscoveryConfiguration,
  request: DiscoveryRequest,
): DiscoveryPresentation {
  return {
    isSponsored: false,
    placementReason:
      request.sort === "recent"
        ? "organic_freshness"
        : request.sort?.startsWith("price")
          ? "organic_price"
          : "organic_relevance",
    rankingVersion: configuration.version,
  };
}

function sortOrganics(items: DiscoveryRankedItem[], request: DiscoveryRequest) {
  if (request.sort === "recent") {
    items.sort(
      (left, right) =>
        new Date(
          right.document.organicFreshnessAt ||
            right.document.publishedAt ||
            right.document.createdAt,
        ).getTime() -
          new Date(
            left.document.organicFreshnessAt ||
              left.document.publishedAt ||
              left.document.createdAt,
          ).getTime() || left.document.id.localeCompare(right.document.id),
    );
  } else if (request.sort === "price_asc" || request.sort === "price_desc") {
    const direction = request.sort === "price_asc" ? 1 : -1;
    items.sort(
      (left, right) =>
        (left.document.priceMinor - right.document.priceMinor) * direction ||
        compareRanked(left, right),
    );
  } else {
    items.sort(compareRanked);
  }
}

export function runUnifiedDiscovery(
  documents: DiscoveryDocument[],
  request: DiscoveryRequest,
  configuration: DiscoveryConfiguration = DEFAULT_DISCOVERY_CONFIGURATION,
): UnifiedDiscoveryResult {
  const page = Math.max(1, request.page || 1);
  const pageSize = Math.max(1, Math.min(100, request.pageSize || 24));
  const now = new Date(request.now || Date.now());
  const organicPresentationValue = organicPresentation(configuration, request);
  const candidates = documents
    .filter((document) => isEligible(document, request))
    .map<DiscoveryRankedItem>((document) => ({
      document,
      explanation: scoreOrganicListing(document, request, configuration),
      presentation: organicPresentationValue,
    }))
    .filter(
      (item) =>
        !request.query?.trim() || item.explanation.signals.relevance > 0,
    );
  sortOrganics(candidates, request);
  const deduplicated = deduplicate(candidates);
  sortOrganics(deduplicated.items, request);
  const diversified = diversify(deduplicated.items, pageSize, configuration);

  const maxSponsoredPerPage = Math.min(
    configuration.sponsored.maxPerPage,
    Math.floor(pageSize * configuration.sponsored.maxShare),
  );
  const allSponsored: DiscoveryRankedItem[] = [];
  const sponsoredPublisherCounts = new Map<string, number>();
  for (const item of [...deduplicated.items].sort(
    (left, right) =>
      sponsoredRelevance(right) - sponsoredRelevance(left) ||
      compareRanked(left, right),
  )) {
    if (!promotionIsActive(item.document, now)) continue;
    if (
      request.query?.trim() &&
      item.explanation.signals.relevance <
        configuration.sponsored.minimumRelevance
    ) {
      continue;
    }
    if (sponsoredRelevance(item) < configuration.sponsored.minimumRelevance)
      continue;
    const count = sponsoredPublisherCounts.get(item.document.publisherId) || 0;
    if (count >= configuration.diversity.maxSponsoredPerPublisher) continue;
    sponsoredPublisherCounts.set(item.document.publisherId, count + 1);
    allSponsored.push(item);
  }

  const sponsoredEnabled =
    maxSponsoredPerPage > 0 &&
    diversified.items.length >= configuration.sponsored.minimumOrganicResults;
  const sponsoredStart = (page - 1) * maxSponsoredPerPage;
  const pageSponsored = sponsoredEnabled
    ? allSponsored.slice(sponsoredStart, sponsoredStart + maxSponsoredPerPage)
    : [];
  const globallySponsoredIds = new Set(
    sponsoredEnabled ? allSponsored.map((item) => item.document.id) : [],
  );
  const organicOnly = diversified.items.filter(
    (item) => !globallySponsoredIds.has(item.document.id),
  );
  const organicOffset = (page - 1) * pageSize;
  const pageOrganic = organicOnly.slice(
    organicOffset,
    organicOffset + pageSize,
  );
  const finalItems = [...pageOrganic];
  pageSponsored.forEach((item, sponsoredIndex) => {
    const configuredPosition =
      configuration.sponsored.positions[sponsoredIndex];
    if (!configuredPosition) return;
    const insertionIndex = Math.min(configuredPosition - 1, finalItems.length);
    const promotion = item.document.promotion!;
    finalItems.splice(insertionIndex, 0, {
      ...item,
      presentation: {
        isSponsored: true,
        promotionType: promotion.type,
        promotionLabel: promotion.label || "Sponsorisé",
        promotionImpressionId: `spi_${stableId(`${request.requestId}:${item.document.id}:${page}:${configuredPosition}`)}`,
        organicPositionContext: organicOffset + insertionIndex,
        placementReason: "sponsored_relevant",
        rankingVersion: configuration.version,
      },
    });
  });

  const publisherDistribution = finalItems.reduce<Record<string, number>>(
    (distribution, item) => {
      distribution[item.document.publisherType] =
        (distribution[item.document.publisherType] || 0) + 1;
      return distribution;
    },
    {},
  );
  const organicPages = Math.ceil(organicOnly.length / pageSize);
  const sponsoredPages = sponsoredEnabled
    ? Math.ceil(allSponsored.length / maxSponsoredPerPage)
    : 0;
  const totalPages = Math.max(1, organicPages, sponsoredPages);
  const hasNextPage = page < totalPages;
  return {
    items: finalItems,
    totalResults: deduplicated.items.length,
    totalOrganic: organicOnly.length,
    page,
    pageSize,
    totalPages,
    hasNextPage,
    nextCursor: hasNextPage
      ? `ud1.${configuration.version}.${page + 1}.${stableId(request.requestId)}`
      : undefined,
    event: {
      requestId: request.requestId,
      marketCode: request.marketCode.toUpperCase(),
      rankingVersion: configuration.version,
      organicCandidateCount: candidates.length,
      sponsoredCandidateCount: allSponsored.length,
      duplicateSuppressionCount: deduplicated.suppressed,
      diversityRerankCount: diversified.moves,
      finalOrganicCount: pageOrganic.length,
      finalSponsoredCount: pageSponsored.length,
      publisherDistribution,
    },
  };
}
