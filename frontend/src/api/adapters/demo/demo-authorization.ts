import {
  isStaffSeparatedSubject,
  type Capability,
} from "@shongre/contracts/access-control";
import {
  authorizationService,
  ForbiddenError,
} from "../../../security/authorization.service";
import { storageService } from "../../../services/storage.service";
import type { UserProfile } from "../../../types";

/**
 * Demo adapters enforce the same coarse capability boundary as HTTP routes.
 * Components are presentation only and must not be the thing preventing a
 * Staff persona from mutating customer-marketplace state.
 */
export function requireDemoCapability(
  capability: Capability,
): UserProfile | null {
  const user = storageService.getCurrentUser();
  authorizationService.assertCan(user, capability);
  return user;
}

export function forbidDemoStaffMarketplaceAccess(): UserProfile | null {
  const user = storageService.getCurrentUser();
  if (isStaffSeparatedSubject(user)) {
    throw new ForbiddenError(
      "Les identités Staff ne peuvent pas utiliser la marketplace client.",
    );
  }
  return user;
}

export function requireDemoAnyCapability(
  capabilities: readonly Capability[],
): UserProfile | null {
  const user = storageService.getCurrentUser();
  if (
    !capabilities.some((capability) =>
      authorizationService.can(user, capability),
    )
  ) {
    throw new ForbiddenError();
  }
  return user;
}
