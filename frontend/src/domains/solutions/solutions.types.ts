import type { ShongreApplicationId } from "../../platform/applications/application-registry";

export const SOLUTION_LIFECYCLES = [
  "DRAFT",
  "INTERNAL",
  "COMING_SOON",
  "BETA",
  "AVAILABLE",
  "MAINTENANCE",
  "DEPRECATED",
  "RETIRED",
] as const;

export const MIN_SOLUTION_SORT_ORDER = 0;

export type SolutionLifecycle = (typeof SOLUTION_LIFECYCLES)[number];
export type SolutionIconId =
  | "prospects"
  | "facturation"
  | "marketplace"
  | "pilotage"
  | "apps";

export interface SolutionReleaseNote {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}

export interface SolutionDefinition {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  icon: SolutionIconId;
  category: string;
  lifecycle: SolutionLifecycle;
  availableFrom?: string;
  availableUntil?: string;
  markets: string[];
  languages: string[];
  audiences: string[];
  capabilities: string[];
  launchApplicationId?: ShongreApplicationId;
  launchPath?: string;
  documentationUrl?: string;
  entitlementKey?: string;
  requiresAuthentication: boolean;
  requiresEntitlement: boolean;
  releaseNotes: SolutionReleaseNote[];
  notice?: string;
  maintenanceMessage?: string;
  replacementSlug?: string;
  sortOrder: number;
  catalogVisible: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SolutionLifecycleHistoryEntry {
  id: string;
  solutionId: string;
  from: SolutionLifecycle | null;
  to: SolutionLifecycle;
  explanation: string;
  actorId: string;
  actorName: string;
  occurredAt: string;
}

export interface SolutionsAdminActor {
  id: string;
  name: string;
  canManage: boolean;
}

export interface SolutionListOptions {
  marketCode?: string;
  language?: string;
}

export type CreateSolutionInput = Omit<
  SolutionDefinition,
  "id" | "createdAt" | "updatedAt" | "releaseNotes"
> & { releaseNotes?: SolutionReleaseNote[] };

export type UpdateSolutionInput = Partial<
  Omit<SolutionDefinition, "id" | "createdAt" | "updatedAt" | "lifecycle">
>;

export type SolutionLaunchReason =
  | "READY"
  | "AUTHENTICATION_REQUIRED"
  | "MARKET_UNAVAILABLE"
  | "ENTITLEMENT_REQUIRED"
  | "ACCESS_RESTRICTED"
  | "MAINTENANCE"
  | "COMING_SOON"
  | "DEPRECATED"
  | "RETIRED"
  | "DESTINATION_UNAVAILABLE";

export interface SolutionLaunchDecision {
  allowed: boolean;
  reason: SolutionLaunchReason;
  href?: string;
  actionLabel: string;
  message?: string;
}

export type SolutionsDemoScenario =
  | "default"
  | "empty"
  | "error"
  | "maintenance"
  | "coming_soon"
  | "beta_restricted"
  | "entitlement_required"
  | "market_unavailable"
  | "retired"
  | "admin_draft"
  | "transition_error";
