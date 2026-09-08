import {
  ProAnalyticsSnapshot,
  WorkspaceServiceContract,
  UserWorkspaceSummary,
} from "../../contracts/workspace.contract";
import { apiOperation } from "./generated-api-operation";
import {
  mapBackendListing,
  type BackendListing,
} from "./http-listings.service";

type BackendWorkspaceSummary = Omit<UserWorkspaceSummary, "recentListings"> & {
  recentListings: BackendListing[];
};

export class HttpWorkspaceService implements WorkspaceServiceContract {
  async getUserWorkspaceSummary(
    userId: string,
    marketCode: string,
  ): Promise<UserWorkspaceSummary> {
    const summary = await apiOperation<
      BackendWorkspaceSummary,
      "getWorkspaceSummaryByUserId"
    >("getWorkspaceSummaryByUserId", {
      path: { userId: userId },
      headers: { "X-Shongre-Market": marketCode },
    });
    return {
      ...summary,
      recentListings: summary.recentListings.map(mapBackendListing),
    };
  }

  async getProAnalytics(sellerId: string): Promise<ProAnalyticsSnapshot> {
    return apiOperation<
      ProAnalyticsSnapshot,
      "getWorkspaceProAnalyticsBySellerId"
    >("getWorkspaceProAnalyticsBySellerId", { path: { sellerId: sellerId } });
  }
}

export const httpWorkspaceService = new HttpWorkspaceService();
