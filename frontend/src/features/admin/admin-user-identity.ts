import type { UserProfile } from "../../types";

export type AdminPrimaryIdentity = "staff" | "professional" | "individual";

/**
 * Internal identity surfaces present employment first, then the canonical
 * customer account family. Legacy activity-role labels never outrank Staff.
 */
export function adminPrimaryIdentity(user: UserProfile): AdminPrimaryIdentity {
  if (user.staffStatus === "active" && user.staffRole) return "staff";
  if (user.accountType === "professional") return "professional";
  return "individual";
}
