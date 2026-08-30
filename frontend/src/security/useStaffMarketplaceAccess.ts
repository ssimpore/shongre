import { useMemo } from "react";
import {
  hasEffectiveCapability,
  isStaffSeparatedSubject,
} from "@shongre/contracts/access-control";
import { useAuth } from "../app/providers/AuthProvider";
import { useDataMode } from "../app/providers/DataModeProvider";
import type { UserProfile } from "../types";

export type StaffMarketplaceMode = "customer" | "read_only" | "demo";

export function resolveStaffMarketplaceMode(
  user: UserProfile | null,
  dataMode: "demo" | "api",
): StaffMarketplaceMode {
  if (!isStaffSeparatedSubject(user)) return "customer";
  if (
    dataMode === "demo" &&
    user?.staffStatus === "active" &&
    hasEffectiveCapability(user, "staff.marketplace.demo")
  ) {
    return "demo";
  }
  return "read_only";
}

/**
 * Frontend presentation state only. Demo adapters and backend authorization
 * independently enforce the same boundary before any state can change.
 */
export function useStaffMarketplaceAccess() {
  const { currentUser } = useAuth();
  const { mode: dataMode } = useDataMode();
  return useMemo(() => {
    const mode = resolveStaffMarketplaceMode(currentUser, dataMode);
    return {
      mode,
      isStaff: mode !== "customer",
      isReadOnly: mode === "read_only",
      canUseDemoMarketplace: mode === "demo",
    };
  }, [currentUser, dataMode]);
}
