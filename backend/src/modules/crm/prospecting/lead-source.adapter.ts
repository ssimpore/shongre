import type {
  LeadSourceDefinition,
  ProspectCandidate,
  ProspectDiscoveryFilters,
  ProspectingContext,
} from "@shongre/contracts/prospecting";
import { AppError } from "../../../shared/errors/app-error.js";

export interface LeadSourceSearchContext {
  tenantId: string;
  userId: string;
  operatingContext: ProspectingContext;
  marketCode: string;
  locale: string;
  correlationId: string;
}

export interface LeadSourceAdapter {
  readonly definition: LeadSourceDefinition;
  search(
    context: LeadSourceSearchContext,
    filters: ProspectDiscoveryFilters,
  ): Promise<ProspectCandidate[]>;
}

export class InactiveLeadSourceAdapter implements LeadSourceAdapter {
  constructor(readonly definition: LeadSourceDefinition) {}

  async search(): Promise<ProspectCandidate[]> {
    throw new AppError({
      code: "FORBIDDEN",
      statusCode: 503,
      message:
        "Cette source nécessite encore une validation juridique, commerciale et opérationnelle.",
      details: {
        sourceId: this.definition.id,
        reason: "source_inactive_review_required",
      },
    });
  }
}

export class LeadSourceRegistry {
  private readonly adapters = new Map<string, LeadSourceAdapter>();

  constructor(adapters: LeadSourceAdapter[] = []) {
    adapters.forEach((adapter) => this.register(adapter));
  }

  register(adapter: LeadSourceAdapter): void {
    if (this.adapters.has(adapter.definition.id)) {
      throw new Error(
        `Duplicate lead source adapter: ${adapter.definition.id}`,
      );
    }
    this.adapters.set(adapter.definition.id, adapter);
  }

  get(sourceId: string): LeadSourceAdapter | undefined {
    return this.adapters.get(sourceId);
  }

  list(): LeadSourceAdapter[] {
    return [...this.adapters.values()];
  }
}
