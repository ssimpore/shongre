import type { MessageKey } from "../../i18n/messages.fr";

/**
 * Human labels for CRM enum values.
 *
 * `forecastCategory` reaches the client as an API enum
 * (`pipeline | best_case | commit | closed | omitted`). Three surfaces rendered
 * it three different ways: the opportunity header printed the raw key with its
 * underscore swapped for a space, the summary table did the same, and the
 * pipeline board mapped only `commit` and labelled the other four "Pipeline" —
 * so `best_case`, `closed` and `omitted` were all displayed as the wrong state.
 *
 * Keeping the mapping here, keyed off the catalogue, means a new enum member is
 * a compile error at this file rather than a raw token on three screens.
 */
export type CrmForecastCategory =
  "pipeline" | "best_case" | "commit" | "closed" | "omitted";

const FORECAST_CATEGORY_KEYS: Record<CrmForecastCategory, MessageKey> = {
  pipeline: "crm.forecast.pipeline",
  best_case: "crm.forecast.bestCase",
  commit: "crm.forecast.commit",
  closed: "crm.forecast.closed",
  omitted: "crm.forecast.omitted",
};

/**
 * The catalogue key for a forecast category, or `null` when the API sends a
 * member this build does not know. Callers render their own fallback rather
 * than this module inventing copy for an unknown state.
 */
export function forecastCategoryMessageKey(
  category: string | null | undefined,
): MessageKey | null {
  if (!category) return null;
  return FORECAST_CATEGORY_KEYS[category as CrmForecastCategory] ?? null;
}

export type CrmSource =
  | "manual"
  | "import"
  | "inbound"
  | "referral"
  | "event"
  | "ai_research"
  | "shongre_adapter"
  | "external_api";

const SOURCE_KEYS: Record<CrmSource, MessageKey> = {
  manual: "crm.source.manual",
  import: "crm.source.import",
  inbound: "crm.source.inbound",
  referral: "crm.source.referral",
  event: "crm.source.event",
  ai_research: "crm.source.aiResearch",
  shongre_adapter: "crm.source.shongreAdapter",
  external_api: "crm.source.externalApi",
};

/** The catalogue key for a record source, or `null` for an unknown member. */
export function sourceMessageKey(
  source: string | null | undefined,
): MessageKey | null {
  if (!source) return null;
  return SOURCE_KEYS[source as CrmSource] ?? null;
}

/** Declaration order is the order the priority picker offers them. */
export const CRM_TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type CrmTaskPriority = (typeof CRM_TASK_PRIORITIES)[number];

const TASK_PRIORITY_KEYS: Record<CrmTaskPriority, MessageKey> = {
  low: "crm.taskPriority.low",
  medium: "crm.taskPriority.medium",
  high: "crm.taskPriority.high",
  urgent: "crm.taskPriority.urgent",
};

/** The catalogue key for a task priority, or `null` for an unknown member. */
export function taskPriorityMessageKey(
  priority: string | null | undefined,
): MessageKey | null {
  if (!priority) return null;
  return TASK_PRIORITY_KEYS[priority as CrmTaskPriority] ?? null;
}
