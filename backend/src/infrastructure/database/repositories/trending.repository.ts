import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { createDefaultTrendingConfig } from "../../../modules/trending/trending.defaults.js";
import type {
  TrendingActivitySignals,
  TrendingAdminConfig,
  TrendingQuery,
  TrendingSectionResponse,
  TrendingTopicOverride,
} from "../../../modules/trending/trending.types.js";
import { databaseFailure } from "./repository-error.js";

export interface ITrendingRepository {
  getConfig(marketCode: string): Promise<TrendingAdminConfig>;
  saveConfig(
    marketCode: string,
    updates: Partial<TrendingAdminConfig>,
  ): Promise<TrendingAdminConfig>;
  upsertOverride(
    marketCode: string,
    override: TrendingTopicOverride,
  ): Promise<TrendingAdminConfig>;
  refreshActivityWindow(
    marketCode: string,
    windowStart: string,
    windowEnd: string,
  ): Promise<void>;
  getActivitySignals(
    marketCode: string,
    since: string,
  ): Promise<Map<string, TrendingActivitySignals>>;
  getCachedSection(
    query: TrendingQuery,
  ): Promise<TrendingSectionResponse | null>;
  saveCachedSection(
    marketCode: string,
    response: TrendingSectionResponse,
  ): Promise<void>;
}

export class DemoTrendingRepository implements ITrendingRepository {
  private configs = new Map<string, TrendingAdminConfig>();

  async getConfig(marketCode: string): Promise<TrendingAdminConfig> {
    return structuredClone(
      this.configs.get(marketCode) || createDefaultTrendingConfig(),
    );
  }

  async saveConfig(
    marketCode: string,
    updates: Partial<TrendingAdminConfig>,
  ): Promise<TrendingAdminConfig> {
    const current = await this.getConfig(marketCode);
    const next = {
      ...current,
      ...updates,
      weights: { ...current.weights, ...(updates.weights || {}) },
      updatedAt: new Date().toISOString(),
    };
    this.configs.set(marketCode, next);
    return structuredClone(next);
  }

  async upsertOverride(
    marketCode: string,
    override: TrendingTopicOverride,
  ): Promise<TrendingAdminConfig> {
    const current = await this.getConfig(marketCode);
    return this.saveConfig(marketCode, {
      overrides: [
        ...current.overrides.filter(
          (item) => item.topicKey !== override.topicKey,
        ),
        { ...override, marketCode },
      ],
    });
  }

  async refreshActivityWindow(
    _marketCode: string,
    _windowStart: string,
    _windowEnd: string,
  ): Promise<void> {
    return Promise.resolve();
  }

  async getActivitySignals(
    _marketCode: string,
    _since: string,
  ): Promise<Map<string, TrendingActivitySignals>> {
    return new Map();
  }

  async getCachedSection(
    _query: TrendingQuery,
  ): Promise<TrendingSectionResponse | null> {
    return null;
  }

  async saveCachedSection(
    _marketCode: string,
    _response: TrendingSectionResponse,
  ): Promise<void> {
    return Promise.resolve();
  }
}

export class PostgresTrendingRepository implements ITrendingRepository {
  async getConfig(marketCode: string): Promise<TrendingAdminConfig> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("trending_section_configs")
        .select("*")
        .eq("market_code", marketCode)
        .maybeSingle();
      if (error) databaseFailure("trending.getConfig", error);
      if (!data) return createDefaultTrendingConfig();
      const defaults = createDefaultTrendingConfig();
      const { data: overrideRows, error: overridesError } = await supabase
        .from("trending_topic_overrides")
        .select("*")
        .eq("market_code", marketCode)
        .order("sort_order", { ascending: true, nullsFirst: false });
      if (overridesError)
        databaseFailure("trending.getOverrides", overridesError);
      return {
        ...defaults,
        ...data,
        selectionMode: data.selection_mode || defaults.selectionMode,
        maxTopics: Number(data.max_topics ?? defaults.maxTopics),
        listingsPerTopic: Number(
          data.listings_per_topic ?? defaults.listingsPerTopic,
        ),
        minTopics: Number(data.min_topics ?? defaults.minTopics),
        maxTopicsPerParentCategory: Number(
          data.max_topics_per_parent_category ??
            defaults.maxTopicsPerParentCategory,
        ),
        minimumActivity: Number(
          data.minimum_activity ?? defaults.minimumActivity,
        ),
        displayPeriodDays: Number(
          data.display_period_days ?? defaults.displayPeriodDays,
        ),
        cacheTtlMinutes: Number(
          data.cache_ttl_minutes ?? defaults.cacheTtlMinutes,
        ),
        personalizationWeight: Number(
          data.personalization_weight ?? defaults.personalizationWeight,
        ),
        excludedCategories: data.excluded_categories || [],
        excludedTopics: data.excluded_topics || [],
        weights: { ...defaults.weights, ...(data.weights || {}) },
        overrides: (overrideRows || []).map((row: any) => ({
          topicKey: row.topic_key,
          topicType: row.topic_type,
          isPinned: Boolean(row.is_pinned),
          isHidden: Boolean(row.is_hidden),
          boostScore: Number(row.boost_score || 0),
          customTitle: row.custom_title || undefined,
          customSubtitle: row.custom_subtitle || undefined,
          customImage: row.custom_image || undefined,
          startsAt: row.starts_at || undefined,
          endsAt: row.ends_at || undefined,
          sortOrder: row.sort_order ?? undefined,
          marketCode,
          region: row.region || undefined,
          city: row.city || undefined,
        })),
        updatedAt: data.updated_at || defaults.updatedAt,
      };
    } catch (error) {
      databaseFailure("trending.getConfig", error);
    }
  }

  async saveConfig(
    marketCode: string,
    updates: Partial<TrendingAdminConfig>,
  ): Promise<TrendingAdminConfig> {
    const current = await this.getConfig(marketCode);
    const next = {
      ...current,
      ...updates,
      weights: { ...current.weights, ...(updates.weights || {}) },
      updatedAt: new Date().toISOString(),
    };
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { error } = await supabase.from("trending_section_configs").upsert({
        market_code: marketCode,
        enabled: next.enabled,
        selection_mode: next.selectionMode,
        max_topics: next.maxTopics,
        listings_per_topic: next.listingsPerTopic,
        min_topics: next.minTopics,
        max_topics_per_parent_category: next.maxTopicsPerParentCategory,
        minimum_activity: next.minimumActivity,
        display_period_days: next.displayPeriodDays,
        cache_ttl_minutes: next.cacheTtlMinutes,
        personalization_weight: next.personalizationWeight,
        title: next.title,
        subtitle: next.subtitle,
        mobile_visible: next.mobileVisible,
        desktop_visible: next.desktopVisible,
        excluded_categories: next.excludedCategories,
        excluded_topics: next.excludedTopics,
        weights: next.weights,
        updated_at: next.updatedAt,
      });
      if (error) databaseFailure("trending.saveConfig", error);
    } catch (error) {
      databaseFailure("trending.saveConfig", error);
    }
    return next;
  }

  async upsertOverride(
    marketCode: string,
    override: TrendingTopicOverride,
  ): Promise<TrendingAdminConfig> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { error } = await supabase.from("trending_topic_overrides").upsert(
        {
          market_code: marketCode,
          topic_type: override.topicType || "category",
          topic_key: override.topicKey,
          is_pinned: override.isPinned || false,
          is_hidden: override.isHidden || false,
          boost_score: override.boostScore || 0,
          custom_title: override.customTitle,
          custom_subtitle: override.customSubtitle,
          custom_image: override.customImage,
          starts_at: override.startsAt,
          ends_at: override.endsAt,
          sort_order: override.sortOrder,
          region: override.region,
          city: override.city,
        },
        { onConflict: "market_code,topic_type,topic_key" },
      );
      if (error) databaseFailure("trending.upsertOverride", error);
    } catch (error) {
      databaseFailure("trending.upsertOverride", error);
    }
    return this.getConfig(marketCode);
  }

  async refreshActivityWindow(
    marketCode: string,
    windowStart: string,
    windowEnd: string,
  ): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("marketplace_activity_events")
        .select("topic_type, topic_key, event_type")
        .eq("market_code", marketCode)
        .eq("is_qualified", true)
        .gte("occurred_at", windowStart)
        .lt("occurred_at", windowEnd);
      if (error) throw error;

      const grouped = new Map<string, Record<string, number>>();
      for (const event of data || []) {
        const key = `${event.topic_type || "category"}:${event.topic_key}`;
        const signals = grouped.get(key) || {};
        signals[event.event_type] = (signals[event.event_type] || 0) + 1;
        grouped.set(key, signals);
      }

      const rows = Array.from(grouped.entries()).map(([key, signals]) => {
        const separator = key.indexOf(":");
        const topicType = key.slice(0, separator);
        const topicKey = key.slice(separator + 1);
        return {
          market_code: marketCode,
          topic_type: topicType,
          topic_key: topicKey,
          window_start: windowStart,
          window_end: windowEnd,
          view_count: signals.listing_view || 0,
          unique_view_count: signals.listing_unique_view || 0,
          search_count: signals.search || 0,
          search_click_count: signals.search_click || 0,
          favorite_count: signals.favorite || 0,
          share_count: signals.share || 0,
          contact_count: signals.contact || 0,
          offer_count: signals.offer || 0,
          reservation_count: signals.reservation || 0,
          transaction_count: signals.transaction || 0,
        };
      });
      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from("trending_activity_windows")
          .upsert(rows, {
            onConflict:
              "market_code,topic_type,topic_key,window_start,window_end",
          });
        if (upsertError) throw upsertError;
      }
    } catch (error) {
      databaseFailure("trending.refreshActivityWindow", error);
    }
  }

  async getActivitySignals(
    marketCode: string,
    since: string,
  ): Promise<Map<string, TrendingActivitySignals>> {
    const result = new Map<string, TrendingActivitySignals>();
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { data, error } = await supabase
        .from("trending_activity_windows")
        .select("*")
        .eq("market_code", marketCode)
        .gte("window_end", since);
      if (error) throw error;

      for (const row of data || []) {
        const current = result.get(row.topic_key) || {
          views: 0,
          uniqueViews: 0,
          searches: 0,
          searchClicks: 0,
          favorites: 0,
          shares: 0,
          contacts: 0,
          offers: 0,
          reservations: 0,
          transactions: 0,
        };
        current.views += Number(row.view_count || 0);
        current.uniqueViews += Number(row.unique_view_count || 0);
        current.searches += Number(row.search_count || 0);
        current.searchClicks += Number(row.search_click_count || 0);
        current.favorites += Number(row.favorite_count || 0);
        current.shares += Number(row.share_count || 0);
        current.contacts += Number(row.contact_count || 0);
        current.offers += Number(row.offer_count || 0);
        current.reservations += Number(row.reservation_count || 0);
        current.transactions += Number(row.transaction_count || 0);
        result.set(row.topic_key, current);
      }
    } catch (error) {
      databaseFailure("trending.getActivitySignals", error);
    }
    return result;
  }

  async getCachedSection(
    query: TrendingQuery,
  ): Promise<TrendingSectionResponse | null> {
    // City and region sections are intentionally calculated per request until
    // the cache key includes the geographic scope. Serving the global cache to
    // a local visitor would be worse than a cache miss: it would erase the
    // locality signal while looking deceptively fresh.
    if (query.city || query.region) return null;
    try {
      const supabase = getSupabaseAdminClient() as any;
      const [{ data, error }, { data: config, error: configError }] =
        await Promise.all([
          supabase
            .from("trending_topics")
            .select("topic_payload, calculated_at, expires_at")
            .eq("market_code", query.marketCode)
            .eq("is_enabled", true)
            .gt("expires_at", new Date().toISOString())
            .order("sort_order", { ascending: true })
            .limit(query.limit || 4),
          supabase
            .from("trending_section_configs")
            .select("enabled, title, subtitle")
            .eq("market_code", query.marketCode)
            .maybeSingle(),
        ]);
      if (configError)
        databaseFailure("trending.getCachedSectionConfig", configError);
      if (error) databaseFailure("trending.getCachedSection", error);
      if (!data || data.length === 0) return null;
      return {
        enabled: config?.enabled ?? true,
        generatedAt: data[0].calculated_at,
        expiresAt: data[0].expires_at,
        title: config?.title || "En ce moment sur Shongre",
        subtitle:
          config?.subtitle ||
          "Découvrez ce qui attire le plus les acheteurs en ce moment.",
        topics: data.map(
          (row: { topic_payload: TrendingSectionResponse["topics"][number] }) =>
            row.topic_payload,
        ),
      };
    } catch (error) {
      databaseFailure("trending.getCachedSection", error);
    }
  }

  async saveCachedSection(
    marketCode: string,
    response: TrendingSectionResponse,
  ): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient() as any;
      const { error: deleteError } = await supabase
        .from("trending_topics")
        .delete()
        .eq("market_code", marketCode);
      if (deleteError)
        databaseFailure("trending.clearCachedSection", deleteError);
      const expiresAt =
        response.expiresAt ||
        new Date(Date.now() + 20 * 60 * 1000).toISOString();
      const { error: insertError } = await supabase
        .from("trending_topics")
        .insert(
          response.topics.map((topic, sortOrder) => ({
            market_code: marketCode,
            topic_type: topic.type,
            topic_key: topic.categorySlug || topic.id,
            title: topic.title,
            subtitle: topic.subtitle,
            trend_score: topic.trend.score ?? 0,
            activity_score: topic.trend.score ?? 0,
            growth_score: topic.trend.direction === "up" ? 1 : 0.5,
            editorial_score: 0,
            topic_payload: topic,
            calculated_at: response.generatedAt,
            expires_at: expiresAt,
            is_enabled: true,
            sort_order: sortOrder,
          })),
        );
      if (insertError)
        databaseFailure("trending.saveCachedSection", insertError);
    } catch (error) {
      databaseFailure("trending.saveCachedSection", error);
    }
  }
}
