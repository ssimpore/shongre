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
import { apiOperation } from "./generated-api-operation";
import type { AnalyticsServiceContract } from "../../contracts/analytics.contract";

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
      await apiOperation("getAnalyticsOverview", { query: params(query) }),
    );
  }
  async getAcquisition(query: AnalyticsDashboardQuery) {
    return analyticsAcquisitionSchema.parse(
      await apiOperation("getAnalyticsAcquisition", { query: params(query) }),
    );
  }
  async getSearch(query: AnalyticsDashboardQuery) {
    return analyticsSearchSchema.parse(
      await apiOperation("getAnalyticsSearch", { query: params(query) }),
    );
  }
  async getMonetization(query: AnalyticsDashboardQuery) {
    return analyticsMonetizationSchema.parse(
      await apiOperation("getAnalyticsMonetization", { query: params(query) }),
    );
  }
  async getSeo(query: AnalyticsDashboardQuery) {
    return analyticsSeoSchema.parse(
      await apiOperation("getAnalyticsSeo", { query: params(query) }),
    );
  }
  async getProviderHealth() {
    return analyticsProviderHealthSchema
      .array()
      .parse(await apiOperation("getAnalyticsProviders", {}));
  }
  async getSeller(sellerId: string, query: AnalyticsDashboardQuery) {
    return sellerAnalyticsSchema.parse(
      await apiOperation("getAnalyticsSeller", {
        path: { sellerId: sellerId },
        query: params(query),
      }),
    );
  }
}

export const httpAnalyticsService = new HttpAnalyticsService();
