import type { AuthUser } from "@shongre/contracts";
import { isStaffSeparatedSubject } from "@shongre/contracts/access-control";

export class StaffMobileAccessError extends Error {
  constructor() {
    super(
      "Les identités Staff utilisent exclusivement la console interne Shongre.",
    );
    this.name = "StaffMobileAccessError";
  }
}

export function requireMobileCustomer(user: AuthUser): AuthUser {
  if (isStaffSeparatedSubject(user)) throw new StaffMobileAccessError();
  return user;
}
