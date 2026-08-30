import {
  isCustomerMarketplaceCapability,
  isStaffMarketplaceReadCapability,
  isStaffSeparatedSubject,
  type Capability,
} from "@shongre/contracts/access-control";
import {
  authorizationService,
  ForbiddenError,
} from "../../../security/authorization.service";
import { storageService } from "../../../services/storage.service";
import type { UserProfile } from "../../../types";
import { auditService } from "../../../security/audit.service";

function recordStaffDemoAction(user: UserProfile, action: string): void {
  auditService.logEvent({
    actorId: user.id,
    actorName: user.name,
    actorRole: user.staffRole || user.role,
    targetId: "isolated-marketplace-demo",
    targetName: "Bac à sable marketplace Staff",
    action: "staff_marketplace_demo_action",
    details: `Action Staff simulée dans les données Démo isolées : ${action}.`,
    newValue: {
      action,
      dataMode: "demo",
      isolated: true,
      providerActivity: false,
    },
    market: user.country,
  });
}

/**
 * Demo adapters enforce the same coarse capability boundary as HTTP routes.
 * Components are presentation only and must not be the thing preventing a
 * Staff persona from mutating customer-marketplace state.
 */
export function requireDemoCapability(
  capability: Capability,
): UserProfile | null {
  const user = storageService.getCurrentUser();
  if (
    isStaffSeparatedSubject(user) &&
    isStaffMarketplaceReadCapability(capability)
  ) {
    return user;
  }
  if (
    isStaffSeparatedSubject(user) &&
    isCustomerMarketplaceCapability(capability)
  ) {
    authorizationService.assertCan(user, "staff.marketplace.demo");
    recordStaffDemoAction(user!, capability);
    return user;
  }
  authorizationService.assertCan(user, capability);
  return user;
}

/**
 * Protects public demo mutations which have no customer capability of their
 * own (for example newsletter token flows). Public reads do not call this.
 */
export function requireDemoMarketplaceAction(
  action: string,
): UserProfile | null {
  const user = storageService.getCurrentUser();
  if (isStaffSeparatedSubject(user)) {
    authorizationService.assertCan(user, "staff.marketplace.demo");
    recordStaffDemoAction(user!, action);
  }
  return user;
}

export function requireDemoAnyCapability(
  capabilities: readonly Capability[],
): UserProfile | null {
  const user = storageService.getCurrentUser();
  const demoCustomerCapability = capabilities.find(
    isCustomerMarketplaceCapability,
  );
  if (
    isStaffSeparatedSubject(user) &&
    demoCustomerCapability &&
    authorizationService.can(user, "staff.marketplace.demo")
  ) {
    recordStaffDemoAction(user!, demoCustomerCapability);
    return user;
  }
  if (
    capabilities.some((capability) =>
      authorizationService.can(user, capability),
    )
  ) {
    return user;
  }
  if (isStaffSeparatedSubject(user)) {
    const publicRead = capabilities.find(isStaffMarketplaceReadCapability);
    if (publicRead) return user;
    if (demoCustomerCapability) {
      authorizationService.assertCan(user, "staff.marketplace.demo");
      recordStaffDemoAction(user!, demoCustomerCapability);
      return user;
    }
  }
  throw new ForbiddenError();
}
