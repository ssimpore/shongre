import {
  ProAnalyticsSnapshot,
  WorkspaceServiceContract,
  UserWorkspaceSummary,
} from "../../contracts/workspace.contract";
import { httpClient } from "./http-client";

export class HttpWorkspaceService implements WorkspaceServiceContract {
  async getUserWorkspaceSummary(userId: string): Promise<UserWorkspaceSummary> {
    return httpClient.get<UserWorkspaceSummary>(`/workspace/summary/${userId}`);
  }

  async getProAnalytics(sellerId: string): Promise<ProAnalyticsSnapshot> {
    return httpClient.get<ProAnalyticsSnapshot>(
      `/workspace/pro-analytics/${sellerId}`,
    );
  }
}

export const httpWorkspaceService = new HttpWorkspaceService();
