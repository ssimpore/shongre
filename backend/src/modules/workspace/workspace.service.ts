import { Listing } from "../../shared/types/index.js";
import {
  IWorkspaceRepository,
  repositories,
  UserWorkspaceSummary,
} from "../../infrastructure/database/repositories/index.js";

export type { UserWorkspaceSummary };

export class WorkspaceService {
  constructor(
    private workspaceRepo: IWorkspaceRepository = repositories.workspace,
  ) {}

  async getUserWorkspaceSummary(
    userId: string,
    marketCode: string,
  ): Promise<UserWorkspaceSummary> {
    return this.workspaceRepo.getUserWorkspaceSummary(userId, marketCode);
  }

  async getProAnalytics(sellerId: string): Promise<{
    monthlyRevenue: number;
    monthlyViews: number;
    conversionRate: number;
    topListings: Listing[];
  }> {
    return this.workspaceRepo.getProAnalytics(sellerId);
  }
}

export const workspaceService = new WorkspaceService();
