import { Principal, requirePermission } from "./principal.js";
import { Permission } from "./rbac.js";

export function hasStaffOverride(
  principal: Principal,
  override: Permission,
): boolean {
  try {
    requirePermission(principal, override);
    return true;
  } catch {
    return false;
  }
}
