import {
  createDefaultHomepageConfiguration,
  homepageConfigurationSchema,
  type HomepageConfiguration,
  type HomepageOfferOverride,
  type HomepageSectionConfiguration,
} from "@shongre/contracts/homepage";
import { AppError } from "../../../shared/errors/app-error.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

export interface SaveHomepageRevisionInput {
  configuration: HomepageConfiguration;
  actorId: string;
  changeReason: string;
}

export interface IHomepageRepository {
  getDraft(marketCode: string, locale: string): Promise<HomepageConfiguration>;
  getPublished(
    marketCode: string,
    locale: string,
  ): Promise<HomepageConfiguration>;
  saveDraft(input: SaveHomepageRevisionInput): Promise<HomepageConfiguration>;
  publish(input: {
    marketCode: string;
    locale: string;
    actorId: string;
    changeReason: string;
  }): Promise<HomepageConfiguration>;
}

const scopeKey = (marketCode: string, locale: string) =>
  `${marketCode.toUpperCase()}:${locale}`;

function draftFromPublished(
  published: HomepageConfiguration,
): HomepageConfiguration {
  return homepageConfigurationSchema.parse({
    ...structuredClone(published),
    id: `homepage:${published.marketCode}:${published.locale}:${published.revision + 1}`,
    revision: published.revision + 1,
    state: "draft",
    publishedAt: undefined,
  });
}

export class DemoHomepageRepository implements IHomepageRepository {
  private drafts = new Map<string, HomepageConfiguration>();
  private published = new Map<string, HomepageConfiguration>();

  async getDraft(
    marketCode: string,
    locale: string,
  ): Promise<HomepageConfiguration> {
    const key = scopeKey(marketCode, locale);
    const existing = this.drafts.get(key);
    if (existing) return structuredClone(existing);
    const published = await this.getPublished(marketCode, locale);
    const draft = draftFromPublished(published);
    this.drafts.set(key, draft);
    return structuredClone(draft);
  }

  async getPublished(
    marketCode: string,
    locale: string,
  ): Promise<HomepageConfiguration> {
    const key = scopeKey(marketCode, locale);
    const existing = this.published.get(key);
    if (existing) return structuredClone(existing);
    const created = createDefaultHomepageConfiguration({
      marketCode: marketCode.toUpperCase(),
      locale,
      state: "published",
    });
    this.published.set(key, created);
    return structuredClone(created);
  }

  async saveDraft({
    configuration,
    changeReason,
  }: SaveHomepageRevisionInput): Promise<HomepageConfiguration> {
    const current = await this.getDraft(
      configuration.marketCode,
      configuration.locale,
    );
    const now = new Date().toISOString();
    const saved = homepageConfigurationSchema.parse({
      ...structuredClone(configuration),
      id: `homepage:${configuration.marketCode}:${configuration.locale}:${current.revision + 1}`,
      revision: current.revision + 1,
      state: "draft",
      updatedAt: now,
      publishedAt: undefined,
      changeReason,
    });
    this.drafts.set(
      scopeKey(configuration.marketCode, configuration.locale),
      saved,
    );
    return structuredClone(saved);
  }

  async publish(input: {
    marketCode: string;
    locale: string;
    actorId: string;
    changeReason: string;
  }): Promise<HomepageConfiguration> {
    const draft = await this.getDraft(input.marketCode, input.locale);
    const now = new Date().toISOString();
    const published = homepageConfigurationSchema.parse({
      ...structuredClone(draft),
      state: "published",
      updatedAt: now,
      publishedAt: now,
      changeReason: input.changeReason,
    });
    const key = scopeKey(input.marketCode, input.locale);
    this.published.set(key, published);
    this.drafts.set(key, draftFromPublished(published));
    return structuredClone(published);
  }
}

interface HomepageRevisionRow {
  id: string;
  market_code: string;
  locale: string;
  revision: number;
  state: HomepageConfiguration["state"];
  updated_at: string;
  published_at?: string | null;
  change_reason?: string | null;
}

interface HomepageSectionRow {
  id: string;
  section_key: HomepageSectionConfiguration["key"];
  section_type: HomepageSectionConfiguration["type"];
  enabled: boolean;
  sort_order: number;
  title_by_locale: Record<string, string>;
  subtitle_by_locale: Record<string, string>;
  max_items: number;
  minimum_listing_count: number;
  mobile_visible: boolean;
  desktop_visible: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  settings: HomepageSectionConfiguration["settings"];
}

interface HomepageUniverseSubsectionRow {
  id: string;
  section_id: string;
  category_id: string;
  enabled: boolean;
  sort_order: number;
  max_items: number;
  minimum_listing_count: number;
  mobile_visible: boolean;
  desktop_visible: boolean;
}

interface HomepageUniverseSubsectionMarketRow {
  subsection_id: string;
  market_code: string;
}

function normalizeDatabaseTimestamp(value?: string | null) {
  return value ? new Date(value).toISOString() : undefined;
}

async function hydrateConfiguration(
  revision: HomepageRevisionRow,
): Promise<HomepageConfiguration> {
  const supabase = getSupabaseAdminClient() as any;
  const { data: sectionRows, error: sectionError } = await supabase
    .from("homepage_sections")
    .select("*")
    .eq("revision_id", revision.id)
    .order("sort_order", { ascending: true });
  if (sectionError) databaseFailure("homepage.getSections", sectionError);

  const sectionIds = (sectionRows || []).map(
    (row: HomepageSectionRow) => row.id,
  );
  const [offerResult, ruleResult, universeResult] = sectionIds.length
    ? await Promise.all([
        supabase
          .from("homepage_offer_overrides")
          .select("*")
          .in("section_id", sectionIds),
        supabase
          .from("homepage_offer_rules")
          .select("*")
          .in("section_id", sectionIds),
        supabase
          .from("homepage_universe_subsections")
          .select("*")
          .in("section_id", sectionIds)
          .order("sort_order", { ascending: true }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];
  const { data: offerRows, error: offerError } = offerResult;
  if (offerError) databaseFailure("homepage.getOfferOverrides", offerError);
  const { data: ruleRows, error: ruleError } = ruleResult;
  if (ruleError) databaseFailure("homepage.getOfferRules", ruleError);
  const { data: universeRows, error: universeError } = universeResult;
  if (universeError)
    databaseFailure("homepage.getUniverseSubsections", universeError);

  const universeSubsectionIds = (universeRows || []).map(
    (row: HomepageUniverseSubsectionRow) => row.id,
  );
  const { data: universeMarketRows, error: universeMarketError } =
    universeSubsectionIds.length
      ? await supabase
          .from("homepage_universe_subsection_markets")
          .select("subsection_id, market_code")
          .in("subsection_id", universeSubsectionIds)
      : { data: [], error: null };
  if (universeMarketError)
    databaseFailure(
      "homepage.getUniverseSubsectionMarkets",
      universeMarketError,
    );
  const rulesBySection = new Map<string, any>(
    (ruleRows || []).map((row: any) => [row.section_id, row]),
  );
  const offersBySection = new Map<string, HomepageOfferOverride[]>();
  const marketsByUniverseSubsection = new Map<string, string[]>();
  for (const row of universeMarketRows || []) {
    const typed = row as HomepageUniverseSubsectionMarketRow;
    const marketCodes =
      marketsByUniverseSubsection.get(typed.subsection_id) || [];
    marketCodes.push(typed.market_code);
    marketsByUniverseSubsection.set(typed.subsection_id, marketCodes);
  }
  const universeSubsectionsBySection = new Map<
    string,
    NonNullable<HomepageSectionConfiguration["settings"]["universeSubsections"]>
  >();
  for (const row of universeRows || []) {
    const typed = row as HomepageUniverseSubsectionRow;
    const subsections =
      universeSubsectionsBySection.get(typed.section_id) || [];
    subsections.push({
      categoryId: typed.category_id,
      enabled: typed.enabled,
      order: Number(typed.sort_order),
      maxItems: Number(typed.max_items),
      minimumListingCount: Number(typed.minimum_listing_count),
      mobileVisible: typed.mobile_visible,
      desktopVisible: typed.desktop_visible,
      marketCodes: marketsByUniverseSubsection.get(typed.id) || [],
    });
    universeSubsectionsBySection.set(typed.section_id, subsections);
  }
  for (const row of offerRows || []) {
    const offers = offersBySection.get(row.section_id) || [];
    offers.push({
      listingId: row.listing_id,
      isPinned: Boolean(row.is_pinned),
      isHidden: Boolean(row.is_hidden),
      startsAt: normalizeDatabaseTimestamp(row.starts_at),
      endsAt: normalizeDatabaseTimestamp(row.ends_at),
      sortOrder: row.sort_order ?? undefined,
    });
    offersBySection.set(row.section_id, offers);
  }

  return homepageConfigurationSchema.parse({
    id: revision.id,
    marketCode: revision.market_code,
    locale: revision.locale,
    revision: Number(revision.revision),
    state: revision.state,
    sections: (sectionRows || []).map((row: HomepageSectionRow) => ({
      key: row.section_key,
      type: row.section_type,
      enabled: row.enabled,
      order: Number(row.sort_order),
      titleByLocale: row.title_by_locale || {},
      subtitleByLocale: row.subtitle_by_locale || {},
      maxItems: Number(row.max_items),
      minimumListingCount: Number(row.minimum_listing_count),
      mobileVisible: row.mobile_visible,
      desktopVisible: row.desktop_visible,
      startsAt: normalizeDatabaseTimestamp(row.starts_at),
      endsAt: normalizeDatabaseTimestamp(row.ends_at),
      settings: (() => {
        const rule = rulesBySection.get(row.id);
        return {
          ...(row.settings || {}),
          ...(row.section_type === "universe_explorer"
            ? {
                universeSubsections:
                  universeSubsectionsBySection.get(row.id) || [],
              }
            : row.section_type === "deals" && rule
              ? {
                  selectionMode: rule.selection_mode,
                  eligibleOfferTypes: rule.eligible_offer_types || [],
                  allowedMarkets: rule.allowed_markets || [],
                  taxonomyBranches: rule.taxonomy_branches || [],
                  minimumDiscountBps: Number(rule.minimum_discount_bps),
                  includeProfessionalSellers: rule.include_professional_sellers,
                  previewEmptyState: rule.preview_empty_state,
                  offerOverrides: offersBySection.get(row.id) || [],
                }
              : row.section_type === "deals"
                ? { offerOverrides: offersBySection.get(row.id) || [] }
                : {}),
        };
      })(),
    })),
    updatedAt: normalizeDatabaseTimestamp(revision.updated_at),
    publishedAt: normalizeDatabaseTimestamp(revision.published_at),
    changeReason: revision.change_reason || undefined,
  });
}

export class PostgresHomepageRepository implements IHomepageRepository {
  private async getLatest(
    marketCode: string,
    locale: string,
    state: "draft" | "published",
  ): Promise<HomepageConfiguration | null> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("homepage_configuration_revisions")
        .select("*")
        .eq("market_code", marketCode.toUpperCase())
        .eq("locale", locale)
        .eq("state", state)
        .order("revision", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) databaseFailure("homepage.getLatest", error);
      return data ? hydrateConfiguration(data as HomepageRevisionRow) : null;
    } catch (error) {
      databaseFailure("homepage.getLatest", error);
    }
  }

  async getDraft(
    marketCode: string,
    locale: string,
  ): Promise<HomepageConfiguration> {
    const draft = await this.getLatest(marketCode, locale, "draft");
    if (draft) return draft;
    const published = await this.getLatest(marketCode, locale, "published");
    return published
      ? draftFromPublished(published)
      : createDefaultHomepageConfiguration({
          marketCode: marketCode.toUpperCase(),
          locale,
          state: "draft",
        });
  }

  async getPublished(
    marketCode: string,
    locale: string,
  ): Promise<HomepageConfiguration> {
    const published = await this.getLatest(marketCode, locale, "published");
    if (published) return published;
    throw new AppError({
      code: "NOT_FOUND",
      message: "Aucune configuration de page d’accueil n’est publiée.",
    });
  }

  async saveDraft(
    input: SaveHomepageRevisionInput,
  ): Promise<HomepageConfiguration> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { error } = await supabase.rpc(
        "save_homepage_configuration_revision",
        {
          p_configuration: input.configuration,
          p_actor_id: input.actorId,
          p_change_reason: input.changeReason,
          p_publish: false,
        },
      );
      if (error) databaseFailure("homepage.saveDraft", error);
      return this.getDraft(
        input.configuration.marketCode,
        input.configuration.locale,
      );
    } catch (error) {
      databaseFailure("homepage.saveDraft", error);
    }
  }

  async publish(input: {
    marketCode: string;
    locale: string;
    actorId: string;
    changeReason: string;
  }): Promise<HomepageConfiguration> {
    const draft = await this.getDraft(input.marketCode, input.locale);
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { error } = await supabase.rpc(
        "save_homepage_configuration_revision",
        {
          p_configuration: draft,
          p_actor_id: input.actorId,
          p_change_reason: input.changeReason,
          p_publish: true,
        },
      );
      if (error) databaseFailure("homepage.publish", error);
      return this.getPublished(input.marketCode, input.locale);
    } catch (error) {
      databaseFailure("homepage.publish", error);
    }
  }
}
