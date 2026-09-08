import { useMemo } from "react";
import { isStaffSeparatedSubject } from "@shongre/contracts/access-control";
import { useAuth } from "../app/providers/AuthProvider";
import type { UserProfile } from "../types";

export type StaffMarketplaceMode = "customer" | "read_only";

export function resolveStaffMarketplaceMode(
  user: UserProfile | null,
): StaffMarketplaceMode {
  if (!isStaffSeparatedSubject(user)) return "customer";
  return "read_only";
}

/**
 * Frontend presentation state only. Backend authorization independently
 * enforces the same boundary before any state can change.
 */
export function useStaffMarketplaceAccess() {
  const { currentUser } = useAuth();
  return useMemo(() => {
    const mode = resolveStaffMarketplaceMode(currentUser);
    return {
      mode,
      isStaff: mode !== "customer",
      isReadOnly: mode === "read_only",
    };
  }, [currentUser]);
}
