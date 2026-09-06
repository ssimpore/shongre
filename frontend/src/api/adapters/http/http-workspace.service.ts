import {
  ProAnalyticsSnapshot,
  WorkspaceServiceContract,
  UserWorkspaceSummary,
} from "../../contracts/workspace.contract";
import { httpClient } from "./http-client";
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
    const summary = await httpClient.get<BackendWorkspaceSummary>(
      `/workspace/summary/${userId}`,
      {
        headers: { "X-Shongre-Market": marketCode },
      },
    );
    return {
      ...summary,
      recentListings: summary.recentListings.map(mapBackendListing),
    };
  }

  async getProAnalytics(sellerId: string): Promise<ProAnalyticsSnapshot> {
    return httpClient.get<ProAnalyticsSnapshot>(
      `/workspace/pro-analytics/${sellerId}`,
    );
  }
}

export const httpWorkspaceService = new HttpWorkspaceService();
