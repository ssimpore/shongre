import {
  PUBLIC_SOLUTION_LIFECYCLES,
  type SolutionLifecycle,
} from "@shongre/contracts/solutions";
import type { MessageKey } from "../../i18n/messages.fr";
import type { TranslateOptions } from "../../i18n/i18n.service";
import type {
  SolutionDefinition,
  SolutionLaunchDecision,
} from "./solutions.types";

type Translate = (key: MessageKey, options?: TranslateOptions) => string;

export const SOLUTION_LIFECYCLE_PRESENTATION: Record<
  SolutionLifecycle,
  { labelKey: MessageKey; descriptionKey: MessageKey; tone: string }
> = {
  DRAFT: {
    labelKey: "solutions.lifecycle.draft.label",
    descriptionKey: "solutions.lifecycle.draft.description",
    tone: "text-stone-600 bg-stone-100 border-stone-200",
  },
  INTERNAL: {
    labelKey: "solutions.lifecycle.internal.label",
    descriptionKey: "solutions.lifecycle.internal.description",
    tone: "text-violet-700 bg-violet-50 border-violet-200",
  },
  COMING_SOON: {
    labelKey: "solutions.lifecycle.comingSoon.label",
    descriptionKey: "solutions.lifecycle.comingSoon.description",
    tone: "text-info bg-info-surface border-info-border",
  },
  BETA: {
    labelKey: "solutions.lifecycle.beta.label",
    descriptionKey: "solutions.lifecycle.beta.description",
    tone: "text-primary bg-primary-light border-primary-border",
  },
  AVAILABLE: {
    labelKey: "solutions.lifecycle.available.label",
    descriptionKey: "solutions.lifecycle.available.description",
    tone: "text-success bg-success-surface border-success-border",
  },
  MAINTENANCE: {
    labelKey: "solutions.lifecycle.maintenance.label",
    descriptionKey: "solutions.lifecycle.maintenance.description",
    tone: "text-warning bg-warning-surface border-warning-border",
  },
  DEPRECATED: {
    labelKey: "solutions.lifecycle.deprecated.label",
    descriptionKey: "solutions.lifecycle.deprecated.description",
    tone: "text-warning bg-warning-surface border-warning-border",
  },
  RETIRED: {
    labelKey: "solutions.lifecycle.retired.label",
    descriptionKey: "solutions.lifecycle.retired.description",
    tone: "text-danger bg-danger-surface border-danger-border",
  },
};

export function solutionLifecycleLabel(
  t: Translate,
  lifecycle: SolutionLifecycle,
): string {
  return t(SOLUTION_LIFECYCLE_PRESENTATION[lifecycle].labelKey);
}

const LAUNCH_ACTION_KEYS = {
  RETIRED: "solutions.launch.retired",
  ACCESS_RESTRICTED: "solutions.launch.restricted",
  COMING_SOON: "solutions.launch.notify",
  MAINTENANCE: "solutions.launch.maintenance",
  MARKET_UNAVAILABLE: "solutions.launch.marketUnavailable",
  AUTHENTICATION_REQUIRED: "solutions.launch.signIn",
  ENTITLEMENT_REQUIRED: "solutions.launch.activate",
  DESTINATION_UNAVAILABLE: "solutions.launch.destinationUnavailable",
} as const satisfies Partial<
  Record<SolutionLaunchDecision["reason"], MessageKey>
>;

export function presentSolutionLaunch(
  t: Translate,
  solution: SolutionDefinition,
  decision: SolutionLaunchDecision,
): { actionLabel: string; message?: string } {
  const fixedActionKey =
    LAUNCH_ACTION_KEYS[decision.reason as keyof typeof LAUNCH_ACTION_KEYS];
  const actionKey =
    fixedActionKey ??
    (solution.slug === "prospects"
      ? "solutions.launch.openProspects"
      : solution.slug === "facturation"
        ? "solutions.launch.openFacturation"
        : solution.slug === "marketplace"
          ? "solutions.launch.openMarketplace"
          : "solutions.launch.openSolution");

  const fallbackMessageKey =
    decision.reason === "COMING_SOON"
      ? "solutions.launch.comingSoonMessage"
      : decision.reason === "MAINTENANCE"
        ? "solutions.launch.maintenanceMessage"
        : decision.reason === "DEPRECATED"
          ? "solutions.launch.deprecatedMessage"
          : undefined;

  return {
    actionLabel: t(actionKey),
    message:
      decision.message ||
      (fallbackMessageKey ? t(fallbackMessageKey) : undefined),
  };
}

export { PUBLIC_SOLUTION_LIFECYCLES };
