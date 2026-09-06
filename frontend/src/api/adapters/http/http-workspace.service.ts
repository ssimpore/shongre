import {
  ProAnalyticsSnapshot,
  WorkspaceServiceContract,
  UserWorkspaceSummary,
} from "../../contracts/workspace.contract";
import { httpClient } from "./http-client";

export class HttpWorkspaceService implements WorkspaceServiceContract {
  async getUserWorkspaceSummary(
    userId: string,
    marketCode: string,
  ): Promise<UserWorkspaceSummary> {
    return httpClient.get<UserWorkspaceSummary>(
      `/workspace/summary/${userId}`,
      {
        headers: { "X-Shongre-Market": marketCode },
      },
    );
  }

  async getProAnalytics(sellerId: string): Promise<ProAnalyticsSnapshot> {
    return httpClient.get<ProAnalyticsSnapshot>(
      `/workspace/pro-analytics/${sellerId}`,
    );
  }
}

export const httpWorkspaceService = new HttpWorkspaceService();
