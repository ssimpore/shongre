export {
  MIN_SOLUTION_SORT_ORDER,
  SOLUTION_LIFECYCLES,
} from "@shongre/contracts/solutions";
export type {
  CreateSolutionInput,
  SolutionDefinition,
  SolutionIconId,
  SolutionLifecycle,
  SolutionLifecycleHistoryEntry,
  SolutionReleaseNote,
  UpdateSolutionInput,
} from "@shongre/contracts/solutions";

export interface SolutionsAdminActor {
  id: string;
  name: string;
  canManage: boolean;
}

export interface SolutionListOptions {
  marketCode?: string;
  language?: string;
}

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
  /** Backend-authored, locale-specific catalog content; UI fallbacks stay in i18n. */
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
