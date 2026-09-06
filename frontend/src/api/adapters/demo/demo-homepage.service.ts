import {
  homepageConfigurationSchema,
  resolveHomepageConfiguration,
  type HomepageConfiguration,
  type ResolvedHomepageSection,
} from "@shongre/contracts/homepage";
import type { HomepageServiceContract } from "../../contracts/homepage.contract";
import type {
  HomepageExperience,
  HomepageQuery,
  HomepageSectionView,
  PublishHomepageInput,
  SaveHomepageDraftInput,
} from "../../../domains/homepage/homepage.types";
import {
  getDraftHomepageConfiguration,
  getPublishedHomepageConfiguration,
  publishDraftHomepageConfiguration,
  saveDraftHomepageConfiguration,
} from "../../../domains/homepage/homepage.store";
import {
  sanitizeTrendingForMarket,
  selectHomepageDeals,
  selectHomepageUniverseGroups,
  toHomepageExperience,
} from "../../../domains/homepage/homepage.resolver";
import { demoListingsService } from "./demo-listings.service";
import { demoTrendingService } from "./demo-trending.service";
import { authorizationService } from "../../../security/authorization.service";
import { storageService } from "../../../services/storage.service";
import { auditService } from "../../../security/audit.service";
import type { SecurityAuditAction } from "../../../types";

function assertHomepageAdministrator(marketCode: string): void {
  authorizationService.assertCan(
    storageService.getCurrentUser(),
    "admin.configuration.manage",
    undefined,
    { country: marketCode },
  );
}

function recordHomepageAudit(
  action: SecurityAuditAction,
  configuration: HomepageConfiguration,
  details: string,
): void {
  const actor = storageService.getCurrentUser();
  if (!actor) return;
  auditService.logEvent({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.staffRole || actor.role,
    targetId: configuration.id,
    targetName: `Page d’accueil ${configuration.marketCode} (${configuration.locale})`,
    action,
    details,
    newValue: { revision: configuration.revision, state: configuration.state },
    market: configuration.marketCode,
  });
}

function sectionError(
  section: ResolvedHomepageSection,
): Partial<HomepageSectionView> {
  if (section.type === "trending") {
    return { status: "error", errorCode: "TRENDING_UNAVAILABLE" };
  }
  if (section.type === "deals") {
    return { status: "error", errorCode: "DEALS_UNAVAILABLE" };
  }
  return { status: "error", errorCode: "LISTINGS_UNAVAILABLE" };
}

async function resolveSection(
  section: ResolvedHomepageSection,
  query: HomepageQuery,
  includeSuppressed: boolean,
): Promise<Partial<HomepageSectionView>> {
  const threshold = (eligibleListingCount: number) => {
    const suppressed = eligibleListingCount < section.minimumListingCount;
    return {
      eligibleListingCount,
      suppressed,
      suppressionReason: suppressed
        ? ("BELOW_MINIMUM_LISTINGS" as const)
        : undefined,
    };
  };

  if (section.type === "trending") {
    const response = sanitizeTrendingForMarket(
      await demoTrendingService.getTrending({
        marketCode: query.marketCode,
        country: query.country,
        region: query.region,
        city: query.city,
        locale: query.locale,
        limit: section.maxItems,
        now: query.now,
      }),
      query,
      8,
    );
    const topics = response.topics.filter(
      (topic) => topic.listings.length >= section.minimumListingCount,
    );
    const metadata = threshold(
      new Set(topics.flatMap((topic) => topic.listings.map(({ id }) => id)))
        .size,
    );
    return {
      status:
        response.enabled && topics.length && !metadata.suppressed
          ? "ready"
          : "empty",
      ...metadata,
      trending: { ...response, topics },
    };
  }

  if (section.type === "deals") {
    const { listings } = await demoListingsService.getListings({
      marketCode: query.marketCode,
      limit: 1_000,
      sortBy: "date_desc",
    });
    const deals = selectHomepageDeals(
      listings,
      query.marketCode,
      section.settings,
      Math.max(section.maxItems, section.minimumListingCount),
      query.now,
    );
    const metadata = threshold(deals.length);
    return {
      status: deals.length && !metadata.suppressed ? "ready" : "empty",
      ...metadata,
      deals: metadata.suppressed ? [] : deals.slice(0, section.maxItems),
    };
  }

  if (section.type === "recent_listings") {
    const { listings } = await demoListingsService.getListings({
      marketCode: query.marketCode,
      limit: Math.max(section.maxItems, section.minimumListingCount),
      sortBy: "date_desc",
    });
    const metadata = threshold(listings.length);
    return {
      status: listings.length && !metadata.suppressed ? "ready" : "empty",
      ...metadata,
      listings: metadata.suppressed ? [] : listings.slice(0, section.maxItems),
    };
  }

  if (section.type === "universe_explorer") {
    const { listings } = await demoListingsService.getListings({
      marketCode: query.marketCode,
      limit: 1_000,
      sortBy: "date_desc",
    });
    const allGroups = selectHomepageUniverseGroups(
      listings,
      section,
      query.marketCode,
      true,
    );
    const metadata = threshold(
      allGroups.reduce((total, group) => total + group.eligibleListingCount, 0),
    );
    const hasEligibleGroup = allGroups.some((group) => !group.suppressed);
    const suppressed = metadata.suppressed || !hasEligibleGroup;
    return {
      status: hasEligibleGroup && !metadata.suppressed ? "ready" : "empty",
      ...metadata,
      suppressed,
      suppressionReason: suppressed ? "BELOW_MINIMUM_LISTINGS" : undefined,
      universeGroups: includeSuppressed
        ? allGroups
        : allGroups.filter((group) => !group.suppressed),
    };
  }

  return { status: "ready" };
}

async function buildHomepage(
  configuration: HomepageConfiguration,
  query: HomepageQuery,
  includeSuppressed = false,
): Promise<HomepageExperience> {
  if (
    configuration.marketCode !== query.marketCode.toUpperCase() ||
    configuration.locale !== query.locale
  ) {
    throw new Error("Homepage configuration scope does not match the request.");
  }
  const resolved = resolveHomepageConfiguration(
    homepageConfigurationSchema.parse(configuration),
    query.now,
  );
  const results = await Promise.allSettled(
    resolved.sections.map(
      async (section) =>
        [
          section.key,
          await resolveSection(section, query, includeSuppressed),
        ] as const,
    ),
  );
  const content = new Map<string, Partial<HomepageSectionView>>();
  results.forEach((result, index) => {
    const section = resolved.sections[index];
    if (!section) return;
    if (result.status === "fulfilled") content.set(...result.value);
    else content.set(section.key, sectionError(section));
  });
  const experience = toHomepageExperience(resolved, content);
  return includeSuppressed
    ? experience
    : {
        ...experience,
        sections: experience.sections.filter((section) => !section.suppressed),
      };
}

export class DemoHomepageService implements HomepageServiceContract {
  getHomepage(query: HomepageQuery): Promise<HomepageExperience> {
    return buildHomepage(
      getPublishedHomepageConfiguration(query.marketCode, query.locale),
      query,
    );
  }

  async getHomepageDraft(query: HomepageQuery): Promise<HomepageConfiguration> {
    assertHomepageAdministrator(query.marketCode);
    return getDraftHomepageConfiguration(query.marketCode, query.locale);
  }

  async saveHomepageDraft(
    input: SaveHomepageDraftInput,
  ): Promise<HomepageConfiguration> {
    assertHomepageAdministrator(input.configuration.marketCode);
    const saved = saveDraftHomepageConfiguration(
      input.configuration,
      input.changeReason,
    );
    recordHomepageAudit(
      "HOMEPAGE_CONFIGURATION_DRAFT_UPDATED",
      saved,
      input.changeReason,
    );
    return saved;
  }

  previewHomepage(
    configuration: HomepageConfiguration,
    query: HomepageQuery,
  ): Promise<HomepageExperience> {
    assertHomepageAdministrator(query.marketCode);
    return buildHomepage(configuration, query, true);
  }

  async publishHomepage(
    input: PublishHomepageInput,
  ): Promise<HomepageConfiguration> {
    assertHomepageAdministrator(input.marketCode);
    const published = publishDraftHomepageConfiguration(
      input.marketCode,
      input.locale,
      input.changeReason,
    );
    recordHomepageAudit(
      "HOMEPAGE_CONFIGURATION_PUBLISHED",
      published,
      input.changeReason,
    );
    return published;
  }
}

export const demoHomepageService = new DemoHomepageService();
