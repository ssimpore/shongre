import {
  analyticsAcquisitionSchema,
  analyticsMonetizationSchema,
  analyticsOverviewSchema,
  analyticsProviderHealthSchema,
  analyticsSearchSchema,
  analyticsSeoSchema,
  sellerAnalyticsSchema,
  type AnalyticsDashboardQuery,
} from "@shongre/contracts/analytics";
import type { AnalyticsServiceContract } from "../../contracts/analytics.contract";
import { httpClient } from "./http-client";

const params = (query: AnalyticsDashboardQuery) => ({
  range: query.range,
  from: query.from,
  to: query.to,
  marketCode: query.marketCode,
  categoryId: query.categoryId,
  sellerType: query.sellerType,
  source: query.source,
  campaign: query.campaign,
});

export class HttpAnalyticsService implements AnalyticsServiceContract {
  async getOverview(query: AnalyticsDashboardQuery) {
    return analyticsOverviewSchema.parse(
      await httpClient.get("/analytics/overview", { params: params(query) }),
    );
  }
  async getAcquisition(query: AnalyticsDashboardQuery) {
    return analyticsAcquisitionSchema.parse(
      await httpClient.get("/analytics/acquisition", { params: params(query) }),
    );
  }
  async getSearch(query: AnalyticsDashboardQuery) {
    return analyticsSearchSchema.parse(
      await httpClient.get("/analytics/search", { params: params(query) }),
    );
  }
  async getMonetization(query: AnalyticsDashboardQuery) {
    return analyticsMonetizationSchema.parse(
      await httpClient.get("/analytics/monetization", {
        params: params(query),
      }),
    );
  }
  async getSeo(query: AnalyticsDashboardQuery) {
    return analyticsSeoSchema.parse(
      await httpClient.get("/analytics/seo", { params: params(query) }),
    );
  }
  async getProviderHealth() {
    return analyticsProviderHealthSchema
      .array()
      .parse(await httpClient.get("/analytics/providers"));
  }
  async getSeller(sellerId: string, query: AnalyticsDashboardQuery) {
    return sellerAnalyticsSchema.parse(
      await httpClient.get(
        `/analytics/sellers/${encodeURIComponent(sellerId)}` as "/analytics/sellers/{sellerId}",
        { params: params(query) },
      ),
    );
  }
}

export const httpAnalyticsService = new HttpAnalyticsService();
