import { taxonomyV1Service } from "../taxonomy/taxonomy.runtime.js";
import type { components } from "@shongre/contracts/openapi";
import { toPublicListing } from "../../shared/public-projections.js";
import { listingLocationPolicy } from "../geo/geo.runtime.js";
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
    const taxonomy = await taxonomyV1Service.snapshot();
    return {
      ...snapshot,
      topListings: snapshot.topListings.map((listing) =>
        toPublicListing(listing, taxonomy, listingLocationPolicy),
      ),
    };
  }
}

export const workspaceService = new WorkspaceService();
