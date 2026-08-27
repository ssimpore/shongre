import type { AnalyticsServiceContract } from "../../contracts/analytics.contract";
import type {
  AnalyticsDashboardQuery,
  AnalyticsMetric,
  AnalyticsTimeSeriesPoint,
} from "@shongre/contracts/analytics";
import { getCountryConfig } from "@shongre/contracts";

const GENERATED_AT = "2026-08-27T12:00:00.000Z";
const market = (query: AnalyticsDashboardQuery) =>
  query.marketCode === "ALL" ? "FR" : query.marketCode;
const series = (factor = 1): AnalyticsTimeSeriesPoint[] =>
  [21, 22, 23, 24, 25, 26, 27].map((day, index) => ({
    date: `2026-08-${day}`,
    primary: (820 + index * 47) * factor,
    secondary: 180 + index * 13,
  }));
const metric = (
  id: string,
  label: string,
  value: number,
  unit: AnalyticsMetric["unit"] = "count",
  currency?: string,
): AnalyticsMetric => ({ id, label, value, unit, currency });

export class DemoAnalyticsService implements AnalyticsServiceContract {
  async getOverview(scope: AnalyticsDashboardQuery) {
    return {
      generatedAt: GENERATED_AT,
      scope,
      metrics: [
        metric("visitors", "Visiteurs", 18420),
        metric("registrations", "Inscriptions", 1342),
        metric("published", "Annonces publiées", 2881),
        metric("listing_views", "Vues d’annonces", 8940),
        metric("favorites", "Ajouts aux favoris", 2451),
        metric("contacts", "Contacts vendeurs", 1842),
        metric("conversations", "Conversations", 1198),
        metric("transactions", "Transactions", 714),
        metric(
          "contact_conversion",
          "Conversion vue → contact",
          20.6,
          "percent",
        ),
      ],
      activity: series(),
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
  async getAcquisition(scope: AnalyticsDashboardQuery) {
    return {
      generatedAt: GENERATED_AT,
      scope,
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
  async getSearch(scope: AnalyticsDashboardQuery) {
    const marketCode = market(scope);
    return {
      generatedAt: GENERATED_AT,
      scope,
      metrics: [
        metric("searches", "Recherches", 28540),
        metric("zero_results", "Sans résultat", 7.8, "percent"),
        metric("ctr", "Taux de clic", 42.6, "percent"),
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
  async getMonetization(scope: AnalyticsDashboardQuery) {
    const currency = getCountryConfig(market(scope))?.currency ?? "EUR";
    return {
      generatedAt: GENERATED_AT,
      scope,
      currency,
      metrics: [
        metric(
          "revenue",
          "Revenu reconnu",
          8249300,
          "currency_minor",
          currency,
        ),
        metric("mrr", "MRR", 4860000, "currency_minor", currency),
        metric("arr", "ARR", 58320000, "currency_minor", currency),
        metric("churn", "Attrition abonnements", 2.4, "percent"),
        metric("arpu", "Revenu moyen", 1870, "currency_minor", currency),
        metric("refund_rate", "Remboursements", 1.7, "percent"),
      ],
      revenue: series(970),
      reconciliationStatus: "reconciled" as const,
    };
  }
  async getSeo(scope: AnalyticsDashboardQuery) {
    return {
      generatedAt: GENERATED_AT,
      scope,
      lastSuccessfulSyncAt: "2026-08-27T09:00:00.000Z",
      metrics: [
        metric("clicks", "Clics organiques", 42180),
        metric("impressions", "Impressions", 893400),
        metric("ctr", "CTR", 4.72, "percent"),
      ],
      trend: series(),
      queries: [
        {
          query: "annonces occasion",
          clicks: 2410,
          impressions: 39200,
          ctr: 6.15,
          position: 4.2,
          page: "/annonces",
          country: market(scope).toLowerCase(),
          device: "MOBILE",
        },
        {
          query: "voiture occasion",
          clicks: 1832,
          impressions: 48100,
          ctr: 3.81,
          position: 6.8,
          page: "/auto",
          country: market(scope).toLowerCase(),
          device: "MOBILE",
        },
      ],
    };
  }
  async getProviderHealth() {
    return [
      {
        provider: "internal" as const,
        enabled: true,
        status: "connected" as const,
        failedEvents: 0,
        queueBacklog: 0,
        message: "Entrepôt interne opérationnel.",
      },
      {
        provider: "posthog" as const,
        enabled: false,
        status: "disabled" as const,
        failedEvents: 0,
        queueBacklog: 0,
        message: "Désactivé en mode démo.",
      },
      {
        provider: "ga4" as const,
        enabled: false,
        status: "disabled" as const,
        failedEvents: 0,
        queueBacklog: 0,
        message: "Désactivé en mode démo.",
      },
      {
        provider: "matomo" as const,
        enabled: false,
        status: "disabled" as const,
        failedEvents: 0,
        queueBacklog: 0,
        message: "Désactivé en mode démo.",
      },
      {
        provider: "cloudflare" as const,
        enabled: false,
        status: "disabled" as const,
        failedEvents: 0,
        queueBacklog: 0,
        message: "Désactivé en mode démo.",
      },
      {
        provider: "search_console" as const,
        enabled: false,
        status: "disabled" as const,
        failedEvents: 0,
        queueBacklog: 0,
        message: "Désactivé en mode démo.",
      },
      {
        provider: "sentry" as const,
        enabled: false,
        status: "disabled" as const,
        failedEvents: 0,
        queueBacklog: 0,
        message: "Désactivé en mode démo.",
      },
    ];
  }
  async getSeller(sellerId: string, scope: AnalyticsDashboardQuery) {
    return {
      generatedAt: GENERATED_AT,
      sellerId,
      marketCode: market(scope),
      metrics: [
        metric("views", "Vues", 9840),
        metric("favorites", "Favoris", 714),
        metric("contacts", "Contacts", 263),
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
}

export const demoAnalyticsService = new DemoAnalyticsService();
