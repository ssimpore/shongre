import {
  type AnalyticsAcquisition,
  type AnalyticsDashboardQuery,
  type AnalyticsEventEnvelope,
  type AnalyticsMonetization,
  type AnalyticsOverview,
  type AnalyticsProviderHealth,
  type AnalyticsSearch,
  type AnalyticsSeo,
  type SellerAnalytics,
} from "@shongre/contracts/analytics";
import { getCountryConfig } from "@shongre/contracts";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";

export interface AnalyticsRepository {
  append(events: readonly AnalyticsEventEnvelope[]): Promise<void>;
  enqueueDeliveries(
    eventId: string,
    providers: ReadonlyArray<"posthog" | "ga4" | "matomo">,
  ): Promise<void>;
  recordDelivery(
    eventId: string,
    provider: "posthog" | "ga4" | "matomo",
    status: "delivered" | "failed" | "discarded",
    errorCode?: string,
  ): Promise<void>;
  claimPendingDeliveries(limit: number): Promise<
    ReadonlyArray<{
      provider: "posthog" | "ga4" | "matomo";
      event: AnalyticsEventEnvelope;
    }>
  >;
  overview(query: AnalyticsDashboardQuery): Promise<AnalyticsOverview>;
  acquisition(query: AnalyticsDashboardQuery): Promise<AnalyticsAcquisition>;
  search(query: AnalyticsDashboardQuery): Promise<AnalyticsSearch>;
  monetization(query: AnalyticsDashboardQuery): Promise<AnalyticsMonetization>;
  seo(query: AnalyticsDashboardQuery): Promise<AnalyticsSeo>;
  providerHealth(): Promise<AnalyticsProviderHealth[]>;
  seller(
    sellerId: string,
    query: AnalyticsDashboardQuery,
  ): Promise<SellerAnalytics>;
  refresh(): Promise<void>;
  applyRetention(): Promise<void>;
  anonymizeUser(userId: string): Promise<void>;
}

interface DateWindow {
  from: string;
  to: string;
}

export function resolveAnalyticsWindow(
  query: AnalyticsDashboardQuery,
): DateWindow {
  const end = query.to ? new Date(`${query.to}T23:59:59.999Z`) : new Date();
  const start = query.from
    ? new Date(`${query.from}T00:00:00.000Z`)
    : new Date(end);
  if (!query.from) {
    const days =
      query.range === "today"
        ? 0
        : query.range === "yesterday"
          ? 1
          : query.range === "7d"
            ? 6
            : query.range === "90d"
              ? 89
              : query.range === "quarter"
                ? 89
                : query.range === "year"
                  ? 364
                  : query.range === "month"
                    ? 29
                    : 29;
    start.setUTCDate(start.getUTCDate() - days);
    start.setUTCHours(0, 0, 0, 0);
    if (query.range === "yesterday") end.setUTCDate(end.getUTCDate() - 1);
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const scopeMarket = (query: AnalyticsDashboardQuery) =>
  query.marketCode === "ALL" ? "FR" : query.marketCode;

function requireMonetizationMarket(query: AnalyticsDashboardQuery) {
  if (query.marketCode === "ALL") {
    throw new Error(
      "Monetization analytics require one market; currencies are not interchangeable.",
    );
  }
  const market = getCountryConfig(query.marketCode);
  if (!market?.enabled) {
    throw new Error("Unknown market for monetization analytics.");
  }
  return market;
}

function demoDates(days = 7) {
  const result: { date: string; primary: number; secondary?: number }[] = [];
  const today = new Date();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - index);
    result.push({
      date: dateOnly(date),
      primary: 840 + (days - index) * 37,
      secondary: 190 + (days - index) * 11,
    });
  }
  return result;
}

export class DemoAnalyticsRepository implements AnalyticsRepository {
  private events: AnalyticsEventEnvelope[] = [];
  async append(events: readonly AnalyticsEventEnvelope[]): Promise<void> {
    const known = new Set(this.events.map((event) => event.context.eventId));
    this.events.push(
      ...events.filter((event) => !known.has(event.context.eventId)),
    );
  }
  async recordDelivery(): Promise<void> {}
  async enqueueDeliveries(): Promise<void> {}
  async claimPendingDeliveries(): Promise<readonly []> {
    return [];
  }
  async overview(query: AnalyticsDashboardQuery): Promise<AnalyticsOverview> {
    return {
      generatedAt: new Date().toISOString(),
      scope: query,
      metrics: [
        {
          id: "visitors",
          label: "Visiteurs",
          value: 18420,
          previousValue: 17110,
          unit: "count",
        },
        {
          id: "registrations",
          label: "Inscriptions",
          value: 1342,
          previousValue: 1198,
          unit: "count",
        },
        {
          id: "published",
          label: "Annonces publiées",
          value: 2881,
          previousValue: 2632,
          unit: "count",
        },
        {
          id: "listing_views",
          label: "Vues d’annonces",
          value: 8940,
          unit: "count",
        },
        {
          id: "favorites",
          label: "Ajouts aux favoris",
          value: 2451,
          unit: "count",
        },
        {
          id: "contacts",
          label: "Contacts vendeurs",
          value: 1842,
          unit: "count",
        },
        {
          id: "conversations",
          label: "Conversations",
          value: 1198,
          unit: "count",
        },
        {
          id: "transactions",
          label: "Transactions",
          value: 714,
          previousValue: 651,
          unit: "count",
        },
        {
          id: "contact_conversion",
          label: "Conversion vue → contact",
          value: 20.6,
          unit: "percent",
        },
      ],
      activity: demoDates(14),
      funnel: [
        { step: "visit", label: "Visite", count: 18420 },
        {
          step: "search",
          label: "Recherche",
          count: 12630,
          conversionFromPrevious: 68.6,
        },
        {
          step: "listing",
          label: "Annonce consultée",
          count: 8940,
          conversionFromPrevious: 70.8,
        },
        {
          step: "contact",
          label: "Contact vendeur",
          count: 1842,
          conversionFromPrevious: 20.6,
        },
      ],
    };
  }
  async acquisition(
    query: AnalyticsDashboardQuery,
  ): Promise<AnalyticsAcquisition> {
    return {
      generatedAt: new Date().toISOString(),
      scope: query,
      channels: [
        {
          source: "google",
          medium: "organic",
          visitors: 8210,
          registrations: 732,
          payingUsers: 201,
          conversionRate: 2.45,
        },
        {
          source: "direct",
          medium: "none",
          visitors: 5940,
          registrations: 381,
          payingUsers: 154,
          conversionRate: 2.59,
        },
        {
          source: "newsletter",
          medium: "email",
          visitors: 2160,
          registrations: 148,
          payingUsers: 62,
          conversionRate: 2.87,
        },
        {
          source: "instagram",
          medium: "social",
          visitors: 2110,
          registrations: 81,
          payingUsers: 24,
          conversionRate: 1.14,
        },
      ],
    };
  }
  async search(query: AnalyticsDashboardQuery): Promise<AnalyticsSearch> {
    const marketCode = scopeMarket(query);
    return {
      generatedAt: new Date().toISOString(),
      scope: query,
      metrics: [
        { id: "searches", label: "Recherches", value: 28540, unit: "count" },
        {
          id: "zero_results",
          label: "Sans résultat",
          value: 7.8,
          unit: "percent",
        },
        { id: "ctr", label: "Taux de clic", value: 42.6, unit: "percent" },
      ],
      opportunities: [
        {
          query: "vélo cargo électrique",
          marketCode,
          searches: 842,
          resultSupply: 19,
          zeroResultRate: 22.4,
          clickThroughRate: 38.1,
        },
        {
          query: "studio centre",
          marketCode,
          searches: 711,
          resultSupply: 28,
          zeroResultRate: 16.7,
          clickThroughRate: 45.8,
        },
        {
          query: "alternance data",
          marketCode,
          searches: 516,
          resultSupply: 11,
          zeroResultRate: 31.2,
          clickThroughRate: 34.5,
        },
      ],
    };
  }
  async monetization(
    query: AnalyticsDashboardQuery,
  ): Promise<AnalyticsMonetization> {
    const market = requireMonetizationMarket(query);
    const currency = market.currency;
    return {
      generatedAt: new Date().toISOString(),
      scope: query,
      currency,
      metrics: [
        {
          id: "revenue",
          label: "Revenu reconnu",
          value: 8249300,
          previousValue: 7512800,
          unit: "currency_minor",
          currency,
        },
        {
          id: "mrr",
          label: "MRR",
          value: 4860000,
          unit: "currency_minor",
          currency,
        },
        {
          id: "arr",
          label: "ARR",
          value: 58320000,
          unit: "currency_minor",
          currency,
        },
        {
          id: "churn",
          label: "Attrition abonnements",
          value: 2.4,
          unit: "percent",
        },
        {
          id: "arpu",
          label: "Revenu moyen",
          value: 1870,
          unit: "currency_minor",
          currency,
        },
        {
          id: "refund_rate",
          label: "Taux de remboursement",
          value: 1.7,
          unit: "percent",
        },
      ],
      revenue: demoDates(14).map((point) => ({
        ...point,
        primary: point.primary * 970,
      })),
      reconciliationStatus: "reconciled",
    };
  }
  async seo(query: AnalyticsDashboardQuery): Promise<AnalyticsSeo> {
    return {
      generatedAt: new Date().toISOString(),
      scope: query,
      lastSuccessfulSyncAt: new Date(Date.now() - 3_600_000).toISOString(),
      metrics: [
        {
          id: "clicks",
          label: "Clics organiques",
          value: 42180,
          unit: "count",
        },
        {
          id: "impressions",
          label: "Impressions",
          value: 893400,
          unit: "count",
        },
        { id: "ctr", label: "CTR", value: 4.72, unit: "percent" },
      ],
      trend: demoDates(14),
      queries: [
        {
          query: "annonces occasion",
          clicks: 2410,
          impressions: 39200,
          ctr: 6.15,
          position: 4.2,
          page: "/annonces",
          country: scopeMarket(query).toLowerCase(),
          device: "MOBILE",
        },
        {
          query: "voiture occasion",
          clicks: 1832,
          impressions: 48100,
          ctr: 3.81,
          position: 6.8,
          page: "/auto",
          country: scopeMarket(query).toLowerCase(),
          device: "MOBILE",
        },
      ],
    };
  }
  async providerHealth(): Promise<AnalyticsProviderHealth[]> {
    return [];
  }
  async seller(
    sellerId: string,
    query: AnalyticsDashboardQuery,
  ): Promise<SellerAnalytics> {
    return {
      generatedAt: new Date().toISOString(),
      sellerId,
      marketCode: scopeMarket(query),
      metrics: [
        { id: "views", label: "Vues", value: 9840, unit: "count" },
        { id: "favorites", label: "Favoris", value: 714, unit: "count" },
        { id: "contacts", label: "Contacts", value: 263, unit: "count" },
      ],
      listingPerformance: [
        {
          listingId: "demo-listing-1",
          title: "Annonce principale",
          views: 2431,
          favorites: 188,
          contacts: 72,
          conversionRate: 2.96,
        },
        {
          listingId: "demo-listing-2",
          title: "Annonce récente",
          views: 1844,
          favorites: 121,
          contacts: 49,
          conversionRate: 2.66,
        },
      ],
    };
  }
  async refresh(): Promise<void> {}
  async applyRetention(): Promise<void> {}
  async anonymizeUser(): Promise<void> {}
}

type DbRow = Record<string, any>;

export class PostgresAnalyticsRepository implements AnalyticsRepository {
  private client(): any {
    return getSupabaseAdminClient() as any;
  }
  async append(events: readonly AnalyticsEventEnvelope[]): Promise<void> {
    const rows = events.map((event) => ({
      event_id: event.context.eventId,
      event_name: event.name,
      schema_version: event.context.schemaVersion,
      occurred_at: event.context.timestamp,
      environment: event.context.environment,
      platform: event.context.platform,
      country_code: event.context.countryCode,
      market_code: event.context.marketCode,
      locale: event.context.locale,
      currency: event.context.currency,
      timezone: event.context.timezone ?? null,
      canonical_domain: event.context.canonicalDomain ?? null,
      anonymous_id: event.context.anonymousId ?? null,
      session_id: event.context.sessionId ?? null,
      user_id: event.context.userId ?? null,
      user_type: event.context.userType ?? null,
      request_id: event.context.requestId ?? null,
      source: event.context.source ?? null,
      medium: event.context.medium ?? null,
      campaign: event.context.campaign ?? null,
      term: event.context.term ?? null,
      content: event.context.content ?? null,
      first_source: event.context.firstSource ?? null,
      first_medium: event.context.firstMedium ?? null,
      first_campaign: event.context.firstCampaign ?? null,
      device_type: event.context.deviceType ?? null,
      release: event.context.release ?? null,
      is_test_traffic: event.context.isTestTraffic === true,
      is_bot: event.context.deviceType === "bot",
      properties: event.properties,
      context: {},
    }));
    const { error } = await this.client()
      .from("analytics_events")
      .upsert(rows, { onConflict: "event_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  async enqueueDeliveries(
    eventId: string,
    providers: ReadonlyArray<"posthog" | "ga4" | "matomo">,
  ): Promise<void> {
    if (!providers.length) return;
    const rows = providers.map((provider) => ({
      event_id: eventId,
      provider,
      status: "pending",
      attempt_count: 0,
      next_attempt_at: new Date().toISOString(),
    }));
    const { error } = await this.client()
      .from("analytics_provider_deliveries")
      .upsert(rows, {
        onConflict: "event_id,provider",
        ignoreDuplicates: true,
      });
    if (error) throw error;
  }
  async recordDelivery(
    eventId: string,
    provider: "posthog" | "ga4" | "matomo",
    status: "delivered" | "failed" | "discarded",
    errorCode?: string,
  ): Promise<void> {
    const { error } = await this.client().rpc(
      "record_analytics_provider_delivery",
      {
        p_event_id: eventId,
        p_provider: provider,
        p_status: status,
        p_error_code: errorCode?.slice(0, 80) ?? null,
      },
    );
    if (error) throw error;
  }
  async claimPendingDeliveries(limit: number): Promise<
    ReadonlyArray<{
      provider: "posthog" | "ga4" | "matomo";
      event: AnalyticsEventEnvelope;
    }>
  > {
    const { data: claimed, error: claimError } = await this.client().rpc(
      "claim_analytics_provider_deliveries",
      { p_limit: limit },
    );
    if (claimError) throw claimError;
    const rows = (claimed ?? []) as Array<{
      claimed_event_id: string;
      claimed_provider: "posthog" | "ga4" | "matomo";
    }>;
    if (!rows.length) return [];
    const { data: events, error: eventError } = await this.client()
      .from("analytics_events")
      .select("*")
      .in("event_id", [...new Set(rows.map((row) => row.claimed_event_id))]);
    if (eventError) throw eventError;
    const byId = new Map<string, AnalyticsEventEnvelope>();
    for (const row of (events ?? []) as DbRow[]) {
      const context = {
        eventId: row.event_id,
        timestamp: row.occurred_at,
        schemaVersion: row.schema_version,
        environment: row.environment,
        platform: row.platform,
        countryCode: row.country_code,
        marketCode: row.market_code,
        locale: row.locale,
        currency: row.currency,
        ...(row.timezone ? { timezone: row.timezone } : {}),
        ...(row.canonical_domain
          ? { canonicalDomain: row.canonical_domain }
          : {}),
        ...(row.anonymous_id ? { anonymousId: row.anonymous_id } : {}),
        ...(row.session_id ? { sessionId: row.session_id } : {}),
        ...(row.user_id ? { userId: row.user_id } : {}),
        ...(row.user_type ? { userType: row.user_type } : {}),
        ...(row.request_id ? { requestId: row.request_id } : {}),
        ...(row.source ? { source: row.source } : {}),
        ...(row.medium ? { medium: row.medium } : {}),
        ...(row.campaign ? { campaign: row.campaign } : {}),
        ...(row.term ? { term: row.term } : {}),
        ...(row.content ? { content: row.content } : {}),
        ...(row.first_source ? { firstSource: row.first_source } : {}),
        ...(row.first_medium ? { firstMedium: row.first_medium } : {}),
        ...(row.first_campaign ? { firstCampaign: row.first_campaign } : {}),
        ...(row.device_type ? { deviceType: row.device_type } : {}),
        ...(row.release ? { release: row.release } : {}),
        isTestTraffic: row.is_test_traffic === true,
      };
      byId.set(row.event_id, {
        name: row.event_name,
        context,
        properties: row.properties ?? {},
      } as AnalyticsEventEnvelope);
    }
    return rows.flatMap((row) => {
      const event = byId.get(row.claimed_event_id);
      return event ? [{ provider: row.claimed_provider, event }] : [];
    });
  }
  private async metrics(query: AnalyticsDashboardQuery): Promise<DbRow[]> {
    const window = resolveAnalyticsWindow(query);
    let request = this.client()
      .from("analytics_daily_metrics")
      .select("*")
      .gte("metric_date", window.from.slice(0, 10))
      .lte("metric_date", window.to.slice(0, 10));
    if (query.marketCode !== "ALL")
      request = request.eq("market_code", query.marketCode);
    const { data, error } = await request;
    if (error) throw error;
    return data ?? [];
  }
  async overview(query: AnalyticsDashboardQuery): Promise<AnalyticsOverview> {
    const rows = await this.metrics(query);
    const total = (name: string) =>
      rows
        .filter((row) => row.metric_name === name)
        .reduce((sum, row) => sum + Number(row.count_value), 0);
    const byDate = new Map<string, number>();
    for (const row of rows.filter((item) => item.metric_name === "page_viewed"))
      byDate.set(
        row.metric_date,
        (byDate.get(row.metric_date) ?? 0) + Number(row.count_value),
      );
    const visits = total("page_viewed");
    const searches = total("search_performed");
    const views = total("listing_viewed");
    const contacts = total("seller_contacted") + total("conversation_started");
    return {
      generatedAt: new Date().toISOString(),
      scope: query,
      metrics: [
        {
          id: "visitors",
          label: "Visiteurs",
          value: rows
            .filter((row) => row.metric_name === "page_viewed")
            .reduce((sum, row) => sum + Number(row.unique_users), 0),
          unit: "count",
        },
        {
          id: "registrations",
          label: "Inscriptions",
          value: total("signup_completed"),
          unit: "count",
        },
        {
          id: "published",
          label: "Annonces publiées",
          value: total("listing_published") + total("publication_completed"),
          unit: "count",
        },
        {
          id: "listing_views",
          label: "Vues d’annonces",
          value: views,
          unit: "count",
        },
        {
          id: "favorites",
          label: "Ajouts aux favoris",
          value: total("listing_favorited"),
          unit: "count",
        },
        {
          id: "contacts",
          label: "Contacts vendeurs",
          value: contacts,
          unit: "count",
        },
        {
          id: "conversations",
          label: "Conversations",
          value: total("conversation_started"),
          unit: "count",
        },
        {
          id: "transactions",
          label: "Transactions",
          value: total("transaction_completed"),
          unit: "count",
        },
        {
          id: "contact_conversion",
          label: "Conversion vue → contact",
          value: views ? (contacts / views) * 100 : 0,
          unit: "percent",
        },
      ],
      activity: [...byDate]
        .sort()
        .map(([date, primary]) => ({ date, primary })),
      funnel: [
        { step: "visit", label: "Visite", count: visits },
        {
          step: "search",
          label: "Recherche",
          count: searches,
          conversionFromPrevious: visits ? (searches / visits) * 100 : 0,
        },
        {
          step: "listing",
          label: "Annonce consultée",
          count: views,
          conversionFromPrevious: searches ? (views / searches) * 100 : 0,
        },
        {
          step: "contact",
          label: "Contact vendeur",
          count: contacts,
          conversionFromPrevious: views ? (contacts / views) * 100 : 0,
        },
      ],
    };
  }
  async acquisition(
    query: AnalyticsDashboardQuery,
  ): Promise<AnalyticsAcquisition> {
    const window = resolveAnalyticsWindow(query);
    let request = this.client()
      .from("analytics_events")
      .select("source,medium,event_name,user_id,anonymous_id")
      .gte("occurred_at", window.from)
      .lte("occurred_at", window.to)
      .eq("is_test_traffic", false)
      .eq("is_bot", false)
      .limit(50000);
    if (query.marketCode !== "ALL")
      request = request.eq("market_code", query.marketCode);
    if (query.source) request = request.eq("source", query.source);
    if (query.campaign) request = request.eq("campaign", query.campaign);
    const { data, error } = await request;
    if (error) throw error;
    const channels = new Map<
      string,
      {
        source: string;
        medium: string;
        visitors: Set<string>;
        registrations: number;
        payingUsers: Set<string>;
      }
    >();
    for (const row of data ?? []) {
      const source = row.source || "direct";
      const medium = row.medium || "none";
      const key = `${source}:${medium}`;
      const value = channels.get(key) ?? {
        source,
        medium,
        visitors: new Set(),
        registrations: 0,
        payingUsers: new Set(),
      };
      const subject = row.user_id || row.anonymous_id;
      if (subject) value.visitors.add(subject);
      if (row.event_name === "signup_completed") value.registrations += 1;
      if (row.event_name === "transaction_completed" && subject)
        value.payingUsers.add(subject);
      channels.set(key, value);
    }
    return {
      generatedAt: new Date().toISOString(),
      scope: query,
      channels: [...channels.values()]
        .map((value) => ({
          source: value.source,
          medium: value.medium,
          visitors: value.visitors.size,
          registrations: value.registrations,
          payingUsers: value.payingUsers.size,
          conversionRate: value.visitors.size
            ? (value.payingUsers.size / value.visitors.size) * 100
            : 0,
        }))
        .sort((a, b) => b.visitors - a.visitors),
    };
  }
  async search(query: AnalyticsDashboardQuery): Promise<AnalyticsSearch> {
    const window = resolveAnalyticsWindow(query);
    let request = this.client()
      .from("analytics_search_daily")
      .select("*")
      .gte("search_date", window.from.slice(0, 10))
      .lte("search_date", window.to.slice(0, 10));
    if (query.marketCode !== "ALL")
      request = request.eq("market_code", query.marketCode);
    if (query.categoryId) request = request.eq("category_id", query.categoryId);
    const { data, error } = await request;
    if (error) throw error;
    const rows = data ?? [];
    const searches = rows.reduce(
      (sum: number, row: DbRow) => sum + Number(row.searches),
      0,
    );
    const clicks = rows.reduce(
      (sum: number, row: DbRow) => sum + Number(row.clicks),
      0,
    );
    const zero = rows.reduce(
      (sum: number, row: DbRow) => sum + Number(row.zero_results),
      0,
    );
    return {
      generatedAt: new Date().toISOString(),
      scope: query,
      metrics: [
        { id: "searches", label: "Recherches", value: searches, unit: "count" },
        {
          id: "zero_results",
          label: "Sans résultat",
          value: searches ? (zero / searches) * 100 : 0,
          unit: "percent",
        },
        {
          id: "ctr",
          label: "Taux de clic",
          value: searches ? (clicks / searches) * 100 : 0,
          unit: "percent",
        },
      ],
      opportunities: rows
        .sort((a: DbRow, b: DbRow) => Number(b.searches) - Number(a.searches))
        .slice(0, 50)
        .map((row: DbRow) => ({
          query: row.normalized_query,
          marketCode: row.market_code,
          searches: Number(row.searches),
          resultSupply: Number(row.result_supply),
          zeroResultRate: Number(row.searches)
            ? (Number(row.zero_results) / Number(row.searches)) * 100
            : 0,
          clickThroughRate: Number(row.searches)
            ? (Number(row.clicks) / Number(row.searches)) * 100
            : 0,
        })),
    };
  }
  async monetization(
    query: AnalyticsDashboardQuery,
  ): Promise<AnalyticsMonetization> {
    const window = resolveAnalyticsWindow(query);
    const currency = requireMonetizationMarket(query).currency;
    const [rows, financeResult] = await Promise.all([
      this.metrics(query),
      this.client().rpc("finance_platform_overview", {
        p_period_start: window.from.slice(0, 10),
        p_period_end: window.to.slice(0, 10),
        p_market_code: query.marketCode === "ALL" ? null : query.marketCode,
        p_currency: currency,
      }),
    ]);
    if (financeResult.error) throw financeResult.error;
    const finance = (financeResult.data ?? {}) as DbRow;
    const subscriptionHealth = (finance.subscriptionHealth ?? {}) as DbRow;
    const mrr = Number(finance.mrrMinor ?? 0);
    const paidAccounts = Number(subscriptionHealth.paidAccounts ?? 0);
    const cancelledSubscriptions = Number(
      subscriptionHealth.cancelledSubscriptions ?? 0,
    );
    const subscriptionPopulation = paidAccounts + cancelledSubscriptions;
    const relevant = rows.filter(
      (row) =>
        row.currency === currency && row.metric_name === "recognized_revenue",
    );
    const refunds = rows.filter(
      (row) => row.currency === currency && row.metric_name === "refunds",
    );
    const revenue = new Map<string, number>();
    for (const row of relevant)
      revenue.set(
        row.metric_date,
        (revenue.get(row.metric_date) ?? 0) + Number(row.amount_minor),
      );
    const amount = relevant.reduce(
      (sum, row) => sum + Number(row.amount_minor),
      0,
    );
    const count = relevant.reduce(
      (sum, row) => sum + Number(row.count_value),
      0,
    );
    const amountFor = (...types: string[]) =>
      relevant
        .filter((row) => types.includes(row.dimension_value))
        .reduce((sum, row) => sum + Number(row.amount_minor), 0);
    const refundAmount = refunds.reduce(
      (sum, row) => sum + Number(row.amount_minor),
      0,
    );
    return {
      generatedAt: new Date().toISOString(),
      scope: query,
      currency,
      metrics: [
        {
          id: "revenue",
          label: "Revenu reconnu",
          value: amount,
          unit: "currency_minor",
          currency,
        },
        {
          id: "mrr",
          label: "MRR",
          value: mrr,
          unit: "currency_minor",
          currency,
        },
        {
          id: "arr",
          label: "ARR",
          value: mrr * 12,
          unit: "currency_minor",
          currency,
        },
        {
          id: "churn",
          label: "Attrition abonnements",
          value: subscriptionPopulation
            ? (cancelledSubscriptions / subscriptionPopulation) * 100
            : 0,
          unit: "percent",
        },
        {
          id: "subscriptions",
          label: "Abonnements",
          value: amountFor("subscription"),
          unit: "currency_minor",
          currency,
        },
        {
          id: "promotions",
          label: "Promotions",
          value: amountFor("promotion", "advertising"),
          unit: "currency_minor",
          currency,
        },
        {
          id: "commissions",
          label: "Commissions",
          value: amountFor("commission", "service_fee"),
          unit: "currency_minor",
          currency,
        },
        {
          id: "refunds",
          label: "Remboursements",
          value: refundAmount,
          unit: "currency_minor",
          currency,
        },
        {
          id: "refund_rate",
          label: "Taux de remboursement",
          value: amount ? (refundAmount / amount) * 100 : 0,
          unit: "percent",
        },
        {
          id: "arpu",
          label: "Revenu moyen",
          value: count ? Math.round(amount / count) : 0,
          unit: "currency_minor",
          currency,
        },
      ],
      revenue: [...revenue]
        .sort()
        .map(([date, primary]) => ({ date, primary })),
      reconciliationStatus:
        query.marketCode === "ALL" ? "partial" : "reconciled",
    };
  }
  async seo(query: AnalyticsDashboardQuery): Promise<AnalyticsSeo> {
    const window = resolveAnalyticsWindow(query);
    let request = this.client()
      .from("analytics_seo_daily")
      .select("*")
      .gte("metric_date", window.from.slice(0, 10))
      .lte("metric_date", window.to.slice(0, 10));
    if (query.marketCode !== "ALL")
      request = request.eq("market_code", query.marketCode);
    const { data, error } = await request;
    if (error) throw error;
    const rows = data ?? [];
    const clicks = rows.reduce(
      (sum: number, row: DbRow) => sum + Number(row.clicks),
      0,
    );
    const impressions = rows.reduce(
      (sum: number, row: DbRow) => sum + Number(row.impressions),
      0,
    );
    const daily = new Map<string, { clicks: number; impressions: number }>();
    for (const row of rows) {
      const value = daily.get(row.metric_date) ?? { clicks: 0, impressions: 0 };
      value.clicks += Number(row.clicks);
      value.impressions += Number(row.impressions);
      daily.set(row.metric_date, value);
    }
    const { data: state } = await this.client()
      .from("analytics_sync_state")
      .select("last_successful_at")
      .eq("provider", "search_console")
      .order("last_successful_at", { ascending: false })
      .limit(1);
    return {
      generatedAt: new Date().toISOString(),
      scope: query,
      lastSuccessfulSyncAt: state?.[0]?.last_successful_at ?? undefined,
      metrics: [
        {
          id: "clicks",
          label: "Clics organiques",
          value: clicks,
          unit: "count",
        },
        {
          id: "impressions",
          label: "Impressions",
          value: impressions,
          unit: "count",
        },
        {
          id: "ctr",
          label: "CTR",
          value: impressions ? (clicks / impressions) * 100 : 0,
          unit: "percent",
        },
      ],
      trend: [...daily].sort().map(([date, value]) => ({
        date,
        primary: value.clicks,
        secondary: value.impressions,
      })),
      queries: rows
        .sort(
          (a: DbRow, b: DbRow) => Number(b.impressions) - Number(a.impressions),
        )
        .slice(0, 100)
        .map((row: DbRow) => ({
          query: row.query,
          clicks: Number(row.clicks),
          impressions: Number(row.impressions),
          ctr: Number(row.ctr) * 100,
          position: Number(row.position),
          page: row.page,
          country: row.country,
          device: row.device,
        })),
    };
  }
  async providerHealth(): Promise<AnalyticsProviderHealth[]> {
    const [deliveriesResult, syncResult] = await Promise.all([
      this.client()
        .from("analytics_provider_deliveries")
        .select("provider,status,last_attempt_at,delivered_at")
        .order("last_attempt_at", { ascending: false })
        .limit(5000),
      this.client()
        .from("analytics_sync_state")
        .select("provider,last_successful_at,last_failure_at,last_error_code")
        .eq("provider", "search_console"),
    ]);
    if (deliveriesResult.error) throw deliveriesResult.error;
    if (syncResult.error) throw syncResult.error;
    const groups = new Map<string, DbRow[]>();
    for (const row of deliveriesResult.data ?? [])
      groups.set(row.provider, [...(groups.get(row.provider) ?? []), row]);
    const health: AnalyticsProviderHealth[] = [...groups].map(
      ([provider, rows]) => ({
        provider: provider as AnalyticsProviderHealth["provider"],
        enabled: true,
        status: rows.some((row) => row.status === "failed")
          ? "degraded"
          : "connected",
        lastSuccessfulAt:
          rows.find((row) => row.delivered_at)?.delivered_at ?? undefined,
        lastFailureAt:
          rows.find((row) => row.status === "failed")?.last_attempt_at ??
          undefined,
        failedEvents: rows.filter((row) => row.status === "failed").length,
        queueBacklog: rows.filter((row) => row.status === "pending").length,
        message: rows.some((row) => row.status === "failed")
          ? "Des livraisons doivent être relancées."
          : "Livraisons opérationnelles.",
      }),
    );
    const syncRows = (syncResult.data ?? []) as DbRow[];
    if (syncRows.length) {
      const lastSuccessfulAt = syncRows
        .map((row) => row.last_successful_at)
        .filter(Boolean)
        .sort()
        .at(-1);
      const lastFailureAt = syncRows
        .map((row) => row.last_failure_at)
        .filter(Boolean)
        .sort()
        .at(-1);
      const degraded = Boolean(
        lastFailureAt &&
        (!lastSuccessfulAt || lastFailureAt > lastSuccessfulAt),
      );
      health.push({
        provider: "search_console",
        enabled: true,
        status: degraded ? "degraded" : "connected",
        lastSuccessfulAt,
        lastFailureAt,
        failedEvents: degraded ? 1 : 0,
        queueBacklog: 0,
        message: degraded
          ? "La dernière synchronisation SEO a échoué."
          : "Synchronisation SEO finalisée.",
      });
    }
    return health;
  }
  async seller(
    sellerId: string,
    query: AnalyticsDashboardQuery,
  ): Promise<SellerAnalytics> {
    const window = resolveAnalyticsWindow(query);
    let request = this.client()
      .from("analytics_events")
      .select("event_name,properties")
      .contains("properties", { sellerId })
      .gte("occurred_at", window.from)
      .lte("occurred_at", window.to)
      .eq("is_test_traffic", false)
      .limit(50000);
    if (query.marketCode !== "ALL")
      request = request.eq("market_code", query.marketCode);
    const { data, error } = await request;
    if (error) throw error;
    const rows = data ?? [];
    const listings = new Map<
      string,
      {
        listingId: string;
        title: string;
        views: number;
        favorites: number;
        contacts: number;
      }
    >();
    for (const row of rows) {
      const id = row.properties?.listingId;
      if (!id) continue;
      const value = listings.get(id) ?? {
        listingId: id,
        title: "Annonce",
        views: 0,
        favorites: 0,
        contacts: 0,
      };
      if (row.event_name === "listing_viewed") value.views += 1;
      if (row.event_name === "listing_favorited") value.favorites += 1;
      if (["seller_contacted", "conversation_started"].includes(row.event_name))
        value.contacts += 1;
      listings.set(id, value);
    }
    const sum = (key: "views" | "favorites" | "contacts") =>
      [...listings.values()].reduce((total, row) => total + row[key], 0);
    return {
      generatedAt: new Date().toISOString(),
      sellerId,
      marketCode: scopeMarket(query),
      metrics: [
        { id: "views", label: "Vues", value: sum("views"), unit: "count" },
        {
          id: "favorites",
          label: "Favoris",
          value: sum("favorites"),
          unit: "count",
        },
        {
          id: "contacts",
          label: "Contacts",
          value: sum("contacts"),
          unit: "count",
        },
      ],
      listingPerformance: [...listings.values()].map((row) => ({
        ...row,
        conversionRate: row.views ? (row.contacts / row.views) * 100 : 0,
      })),
    };
  }
  async refresh(): Promise<void> {
    const { error } = await this.client().rpc("refresh_analytics_daily");
    if (error) throw error;
  }
  async applyRetention(): Promise<void> {
    const { error } = await this.client().rpc("apply_analytics_retention");
    if (error) throw error;
  }
  async anonymizeUser(userId: string): Promise<void> {
    const { data, error } = await this.client()
      .from("analytics_privacy_requests")
      .insert({
        subject_user_id: userId,
        request_type: "anonymize",
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !data?.id)
      throw error || new Error("analytics_privacy_request_missing");
    const { error: anonymizeError } = await this.client().rpc(
      "anonymize_analytics_subject",
      { p_request_id: data.id },
    );
    if (anonymizeError) throw anonymizeError;
  }
}
