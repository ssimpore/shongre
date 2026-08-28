import type { CrmTaskPriority } from "../../../domains/crm/crm.labels";

/**
 * Shared tone classes for CRM enums.
 *
 * The task list and the opportunity detail panel drew the same four priorities
 * two different ways: the list mapped all four to semantic surfaces, while the
 * detail panel used an inline ternary that recognised `urgent` and `high` and
 * folded `medium` and `low` into the same neutral chip — beside a label that
 * was the raw enum value. Same data, two visual languages, one of them wrong.
 *
 * Tones live here rather than in `domains/` because they are presentation; the
 * copy lives in the message catalogue via `taskPriorityMessageKey`.
 */
export const TASK_PRIORITY_TONE_CLASS: Record<CrmTaskPriority, string> = {
  low: "bg-stone-100 text-stone-600",
  medium: "bg-info-surface text-info",
  high: "bg-warning-surface text-warning",
  urgent: "bg-danger-surface text-danger",
};

/** Falls back to the neutral chip for an enum member this build does not know. */
export function taskPriorityToneClass(priority: string): string {
  return (
    TASK_PRIORITY_TONE_CLASS[priority as CrmTaskPriority] ??
    TASK_PRIORITY_TONE_CLASS.low
  );
}
