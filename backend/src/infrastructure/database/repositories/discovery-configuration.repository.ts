import type {
  DiscoveryConfiguration,
  DiscoveryEvent,
  DiscoveryMetrics,
} from "@shongre/contracts";
import { DEFAULT_DISCOVERY_CONFIGURATION } from "@shongre/shared";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";

export interface IDiscoveryConfigurationRepository {
  getActive(
    marketCode: string,
    categoryId?: string,
    context?: DiscoveryConfiguration["context"],
  ): Promise<DiscoveryConfiguration | null>;
  recordEvent(
    event: DiscoveryEvent,
    input: {
      categoryId?: string;
      appliedFilterKeys: string[];
      latencyMs: number;
    },
  ): Promise<void>;
  saveVersion(
    configuration: DiscoveryConfiguration,
    input: { actorUserId: string; changeReason: string; activate: boolean },
  ): Promise<DiscoveryConfiguration>;
  getMetrics(marketCode: string, since?: string): Promise<DiscoveryMetrics>;
}

export class DemoDiscoveryConfigurationRepository implements IDiscoveryConfigurationRepository {
  private readonly active = new Map<string, DiscoveryConfiguration>();

  async getActive(
    marketCode: string,
    categoryId?: string,
    context: DiscoveryConfiguration["context"] = "search",
  ): Promise<DiscoveryConfiguration> {
    const key = `${marketCode.toUpperCase()}:${categoryId || "*"}:${context}`;
    return structuredClone(
      this.active.get(key) || {
        ...structuredClone(DEFAULT_DISCOVERY_CONFIGURATION),
        marketCode: marketCode.toUpperCase(),
        categoryId,
        context,
      },
    );
  }

  async recordEvent(): Promise<void> {}

  async saveVersion(
    configuration: DiscoveryConfiguration,
    input: { actorUserId: string; changeReason: string; activate: boolean },
  ): Promise<DiscoveryConfiguration> {
    const version = {
      ...structuredClone(configuration),
      version: `${configuration.version}:${input.actorUserId}:${Date.now()}`,
    };
    if (input.activate) {
      this.active.set(
        `${version.marketCode}:${version.categoryId || "*"}:${version.context}`,
        version,
      );
    }
    return structuredClone(version);
  }

  async getMetrics(marketCode: string): Promise<DiscoveryMetrics> {
    return {
      marketCode: marketCode.toUpperCase(),
      searchRequests: 0,
      noResultRequests: 0,
      organicCandidates: 0,
      sponsoredCandidates: 0,
      organicResults: 0,
      sponsoredResults: 0,
      duplicateSuppressions: 0,
      diversityReranks: 0,
      privateResultCount: 0,
      professionalResultCount: 0,
      averageLatencyMs: 0,
    };
  }
}

export class PostgresDiscoveryConfigurationRepository implements IDiscoveryConfigurationRepository {
  async getActive(
    marketCode: string,
    categoryId?: string,
    context: DiscoveryConfiguration["context"] = "search",
  ): Promise<DiscoveryConfiguration | null> {
    const client = getSupabaseAdminClient();
    let query = client
      .from("discovery_configuration_versions")
      .select("*")
      .eq("market_code", marketCode.toUpperCase())
      .eq("context", context)
      .eq("status", "active")
      .lte("effective_from", new Date().toISOString())
      .or(
        `effective_until.is.null,effective_until.gt.${new Date().toISOString()}`,
      );
    query = categoryId
      ? query.or(`category_id.eq.${categoryId},category_id.is.null`)
      : query.is("category_id", null);
    const { data, error } = await query
      .order("category_id", { ascending: false, nullsFirst: false })
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      version: data.id,
      marketCode: data.market_code,
      categoryId: data.category_id || undefined,
      context: data.context,
      weights: data.weights as DiscoveryConfiguration["weights"],
      freshnessHalfLifeDays: Number(data.freshness_half_life_days),
      diversity: data.diversity_policy as DiscoveryConfiguration["diversity"],
      sponsored: data.sponsored_policy as DiscoveryConfiguration["sponsored"],
    };
  }

  async recordEvent(
    event: DiscoveryEvent,
    input: {
      categoryId?: string;
      appliedFilterKeys: string[];
      latencyMs: number;
    },
  ): Promise<void> {
    const { error } = await getSupabaseAdminClient()
      .from("discovery_search_events")
      .insert({
        request_id: event.requestId,
        market_code: event.marketCode,
        category_id: input.categoryId || null,
        ranking_version: event.rankingVersion,
        applied_filter_keys: input.appliedFilterKeys,
        organic_candidate_count: event.organicCandidateCount,
        sponsored_candidate_count: event.sponsoredCandidateCount,
        duplicate_suppression_count: event.duplicateSuppressionCount,
        diversity_rerank_count: event.diversityRerankCount,
        final_organic_count: event.finalOrganicCount,
        final_sponsored_count: event.finalSponsoredCount,
        publisher_distribution: event.publisherDistribution,
        latency_ms: input.latencyMs,
      });
    if (error) throw error;
  }

  async saveVersion(
    configuration: DiscoveryConfiguration,
    input: { actorUserId: string; changeReason: string; activate: boolean },
  ): Promise<DiscoveryConfiguration> {
    const { data, error } = await getSupabaseAdminClient().rpc(
      "publish_discovery_configuration_version",
      {
        p_actor_id: input.actorUserId,
        p_market_code: configuration.marketCode,
        p_category_id: configuration.categoryId || null,
        p_context: configuration.context,
        p_weights: configuration.weights,
        p_freshness_half_life_days: configuration.freshnessHalfLifeDays,
        p_diversity_policy: configuration.diversity,
        p_sponsored_policy: configuration.sponsored,
        p_change_reason: input.changeReason,
        p_activate: input.activate,
      },
    );
    if (error) throw error;
    return { ...configuration, version: String(data) };
  }

  async getMetrics(
    marketCode: string,
    since?: string,
  ): Promise<DiscoveryMetrics> {
    const { data, error } = await getSupabaseAdminClient().rpc(
      "get_discovery_metrics",
      {
        p_market_code: marketCode.toUpperCase(),
        p_since: since || new Date(Date.now() - 30 * 86_400_000).toISOString(),
      },
    );
    if (error) throw error;
    return data as unknown as DiscoveryMetrics;
  }
}
