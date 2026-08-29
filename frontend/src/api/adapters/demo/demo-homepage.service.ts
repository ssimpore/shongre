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
): Promise<Partial<HomepageSectionView>> {
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
    return {
      status: response.enabled && response.topics.length ? "ready" : "empty",
      trending: response,
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
      section.maxItems,
      query.now,
    );
    return { status: deals.length ? "ready" : "empty", deals };
  }

  if (section.type === "recent_listings") {
    const { listings } = await demoListingsService.getListings({
      marketCode: query.marketCode,
      limit: section.maxItems,
      sortBy: "date_desc",
    });
    return {
      status: listings.length ? "ready" : "empty",
      listings,
    };
  }

  return { status: "ready" };
}

async function buildHomepage(
  configuration: HomepageConfiguration,
  query: HomepageQuery,
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
    resolved.sections.map(async (section) => [
      section.key,
      await resolveSection(section, query),
    ] as const),
  );
  const content = new Map<string, Partial<HomepageSectionView>>();
  results.forEach((result, index) => {
    const section = resolved.sections[index];
    if (!section) return;
    if (result.status === "fulfilled") content.set(...result.value);
    else content.set(section.key, sectionError(section));
  });
  return toHomepageExperience(resolved, content);
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
    return buildHomepage(configuration, query);
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
