import type {
  AnalyticsAcquisition,
  AnalyticsDashboardQuery,
  AnalyticsMonetization,
  AnalyticsOverview,
  AnalyticsProviderHealth,
  AnalyticsSearch,
  AnalyticsSeo,
  SellerAnalytics,
} from "@shongre/contracts/analytics";

export interface AnalyticsServiceContract {
  getOverview(query: AnalyticsDashboardQuery): Promise<AnalyticsOverview>;
  getAcquisition(query: AnalyticsDashboardQuery): Promise<AnalyticsAcquisition>;
  getSearch(query: AnalyticsDashboardQuery): Promise<AnalyticsSearch>;
  getMonetization(
    query: AnalyticsDashboardQuery,
  ): Promise<AnalyticsMonetization>;
  getSeo(query: AnalyticsDashboardQuery): Promise<AnalyticsSeo>;
  getProviderHealth(): Promise<AnalyticsProviderHealth[]>;
  getSeller(
    sellerId: string,
    query: AnalyticsDashboardQuery,
  ): Promise<SellerAnalytics>;
}
