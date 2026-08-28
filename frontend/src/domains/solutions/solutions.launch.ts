import type { UserProfile } from "../../types";
import { hasProductAccess, isInternalAccount } from "../user/user.domain";
import {
  resolveApplicationHref,
  type ShongreApplicationRegistry,
} from "../../platform/applications/application-registry";
import type {
  SolutionDefinition,
  SolutionLaunchDecision,
} from "./solutions.types";

function productForEntitlement(solution: SolutionDefinition) {
  return solution.launchApplicationId === "marketplace" ||
    solution.launchApplicationId === "prospects" ||
    solution.launchApplicationId === "facturation"
    ? solution.launchApplicationId
    : null;
}

export function resolveSolutionLaunch(input: {
  solution: SolutionDefinition;
  marketCode: string;
  user: UserProfile | null;
  applications: ShongreApplicationRegistry;
}): SolutionLaunchDecision {
  const { solution, marketCode, user, applications } = input;
  const internal = isInternalAccount(user);

  if (solution.lifecycle === "RETIRED") {
    return { allowed: false, reason: "RETIRED", actionLabel: "Solution retirée" };
  }
  if (
    (solution.lifecycle === "DRAFT" || solution.lifecycle === "INTERNAL") &&
    !internal
  ) {
    return {
      allowed: false,
      reason: "ACCESS_RESTRICTED",
      actionLabel: "Accès restreint",
    };
  }
  if (solution.lifecycle === "COMING_SOON") {
    return {
      allowed: false,
      reason: "COMING_SOON",
      actionLabel: "Être informé",
      message: "Cette solution sera disponible prochainement.",
    };
  }
  if (solution.lifecycle === "MAINTENANCE") {
    return {
      allowed: false,
      reason: "MAINTENANCE",
      actionLabel: "Maintenance en cours",
      message:
        solution.maintenanceMessage ||
        "Cette solution est momentanément indisponible.",
    };
  }
  if (!solution.markets.includes(marketCode.toUpperCase())) {
    return {
      allowed: false,
      reason: "MARKET_UNAVAILABLE",
      actionLabel: "Indisponible dans ce marché",
    };
  }
  if (solution.requiresAuthentication && !user) {
    return {
      allowed: false,
      reason: "AUTHENTICATION_REQUIRED",
      actionLabel: "Se connecter pour continuer",
    };
  }
  const productId = productForEntitlement(solution);
  if (
    solution.requiresEntitlement &&
    productId &&
    !hasProductAccess(user, productId)
  ) {
    return {
      allowed: false,
      reason: "ENTITLEMENT_REQUIRED",
      actionLabel: "Activer cette solution",
    };
  }
  if (!solution.launchApplicationId) {
    return {
      allowed: false,
      reason: "DESTINATION_UNAVAILABLE",
      actionLabel: "Destination indisponible",
    };
  }

  const actionLabel =
    solution.slug === "prospects"
      ? "Ouvrir Prospects"
      : solution.slug === "facturation"
        ? "Découvrir Facturation"
        : solution.slug === "marketplace"
          ? "Ouvrir la Marketplace"
          : "Ouvrir la solution";
  let href: string;
  try {
    href = resolveApplicationHref(
      applications,
      solution.launchApplicationId,
      solution.launchPath || "/",
    );
  } catch {
    return {
      allowed: false,
      reason: "DESTINATION_UNAVAILABLE",
      actionLabel: "Destination indisponible",
    };
  }

  return {
    allowed: true,
    reason: solution.lifecycle === "DEPRECATED" ? "DEPRECATED" : "READY",
    actionLabel,
    href,
    message:
      solution.lifecycle === "DEPRECATED"
        ? solution.notice || "Une solution de remplacement est recommandée."
        : undefined,
  };
}
