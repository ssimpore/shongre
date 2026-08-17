import { WorkspaceServiceContract, UserWorkspaceSummary } from '../../contracts/workspace.contract';
import { httpClient } from './http-client';
import { Listing } from '../../../types';

export class HttpWorkspaceService implements WorkspaceServiceContract {
  async getUserWorkspaceSummary(userId: string): Promise<UserWorkspaceSummary> {
    return httpClient.get<UserWorkspaceSummary>(`/workspace/summary/${userId}`);
  }

  async getProAnalytics(sellerId: string): Promise<{
    monthlyRevenue: number;
    monthlyViews: number;
    conversionRate: number;
    topListings: Listing[];
  }> {
    return httpClient.get<{
      monthlyRevenue: number;
      monthlyViews: number;
      conversionRate: number;
      topListings: Listing[];
    }>(`/workspace/pro-analytics/${sellerId}`);
  }
}

export const httpWorkspaceService = new HttpWorkspaceService();
