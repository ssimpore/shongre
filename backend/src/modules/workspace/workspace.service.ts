import type { components } from "@shongre/contracts/openapi";
import { toPublicListing } from "../../shared/public-projections.js";
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

  async getProAnalytics(sellerId: string): Promise<
    Omit<components["schemas"]["WorkspaceProAnalytics"], "topListings"> & {
      topListings: ReturnType<typeof toPublicListing>[];
    }
  > {
    const snapshot = await this.workspaceRepo.getProAnalytics(sellerId);
    return {
      ...snapshot,
      topListings: snapshot.topListings.map(toPublicListing),
    };
  }
}

export const workspaceService = new WorkspaceService();
