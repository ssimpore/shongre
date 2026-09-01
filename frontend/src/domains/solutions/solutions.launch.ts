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
    return {
      allowed: false,
      reason: "RETIRED",
    };
  }
  if (
    (solution.lifecycle === "DRAFT" || solution.lifecycle === "INTERNAL") &&
    !internal
  ) {
    return {
      allowed: false,
      reason: "ACCESS_RESTRICTED",
    };
  }
  if (solution.lifecycle === "COMING_SOON") {
    return {
      allowed: false,
      reason: "COMING_SOON",
    };
  }
  if (solution.lifecycle === "MAINTENANCE") {
    return {
      allowed: false,
      reason: "MAINTENANCE",
      message: solution.maintenanceMessage,
    };
  }
  if (!solution.markets.includes(marketCode.toUpperCase())) {
    return {
      allowed: false,
      reason: "MARKET_UNAVAILABLE",
    };
  }
  if (solution.requiresAuthentication && !user) {
    return {
      allowed: false,
      reason: "AUTHENTICATION_REQUIRED",
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
    };
  }
  if (!solution.launchApplicationId) {
    return {
      allowed: false,
      reason: "DESTINATION_UNAVAILABLE",
    };
  }
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
    };
  }

  return {
    allowed: true,
    reason: solution.lifecycle === "DEPRECATED" ? "DEPRECATED" : "READY",
    href,
    message: solution.lifecycle === "DEPRECATED" ? solution.notice : undefined,
  };
}
