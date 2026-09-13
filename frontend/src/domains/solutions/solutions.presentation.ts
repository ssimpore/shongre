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
    tone: "text-text-supporting bg-surface-muted border-border-disabled",
  },
  INTERNAL: {
    labelKey: "solutions.lifecycle.internal.label",
    descriptionKey: "solutions.lifecycle.internal.description",
    tone: "text-staff-strong bg-staff-surface border-staff-border",
  },
  COMING_SOON: {
    labelKey: "solutions.lifecycle.comingSoon.label",
    descriptionKey: "solutions.lifecycle.comingSoon.description",
    tone: "text-info bg-info-surface border-info-border",
  },
  BETA: {
    labelKey: "solutions.lifecycle.beta.label",
    descriptionKey: "solutions.lifecycle.beta.description",
    tone: "text-text-main bg-primary-light border-primary-border",
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

/**
 * How a visitor obtains the solution, in words.
 *
 * The access row used to fall back to `entitlementKey` when it was set, which
 * printed backend identifiers like `solution.prospects.access` on a public
 * marketing page. The key is an implementation detail; what a reader needs is
 * the access model, which the same record already states in booleans.
 */
export function solutionAccessLabel(
  t: Translate,
  solution: Pick<
    SolutionDefinition,
    "requiresEntitlement" | "requiresAuthentication"
  >,
): string {
  if (solution.requiresEntitlement)
    return t("solutions.detail.accessOnRequest");
  if (solution.requiresAuthentication)
    return t("solutions.detail.accessSignedIn");
  return t("solutions.detail.publicAccess");
}

/** Market codes as the names a reader recognises, in catalogue order. */
export function solutionMarketNames(
  markets: readonly string[],
  resolve: (code: string) => string | undefined,
): string[] {
  return markets.map((code) => resolve(code) || code);
}

/**
 * BCP 47 tags as language names. `Intl.DisplayNames` is given the region-less
 * tag so `fr-FR`, `fr-BE` and `fr-CH` collapse to one entry rather than
 * repeating "French" three times, which is what the raw tags did.
 */
export function solutionLanguageNames(
  languages: readonly string[],
  locale: string,
): string[] {
  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([locale], { type: "language" });
  } catch {
    display = null;
  }
  const names: string[] = [];
  for (const tag of languages) {
    const base = tag.split("-")[0];
    const name = display?.of(base) || base;
    const label = name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
    if (!names.includes(label)) names.push(label);
  }
  return names;
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
