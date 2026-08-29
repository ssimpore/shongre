import {
  hasEffectiveCapability,
  type AccessSubject,
  type Capability,
  type StaffRole,
} from "@shongre/contracts/access-control";

// Presentation helpers intentionally accept flattened listing/seller shapes as
// well as full profiles. Authoritative authorization uses the canonical access
// subject instead of these tolerant display classifiers.
export interface UserClassification {
  accountType?: string;
  staffStatus?: string;
  staffRole?: StaffRole;
  customPermissions?: readonly Capability[];
  revokedPermissions?: readonly Capability[];
  primaryRole?: string;
  role?: string;
  sellerType?: string;
  status?: string;
  isSuspended?: boolean;
  isDeactivated?: boolean;
  isVerified?: boolean;
  sellerIsVerified?: boolean;
  enabledProducts?: readonly string[];
}

export function hasProductAccess(
  user: UserClassification | null | undefined,
  productId: "marketplace" | "prospects" | "facturation",
): boolean {
  if (!user) return true;
  // Legacy authenticated profiles keep only their historical marketplace
  // surface. Separately sold products always require an explicit projection.
  if (user.enabledProducts === undefined) return productId === "marketplace";
  return user.enabledProducts.includes(productId);
}

export function isProductOnlyAccount(
  user: UserClassification | null | undefined,
  productId: "marketplace" | "prospects" | "facturation",
): boolean {
  return Boolean(
    user?.enabledProducts &&
    hasProductAccess(user, productId) &&
    user.enabledProducts.every(
      (enabledProduct) => enabledProduct === productId,
    ),
  );
}

export function isProspectsOnlyAccount(
  user: UserClassification | null | undefined,
): boolean {
  return isProductOnlyAccount(user, "prospects");
}

export function isFacturationOnlyAccount(
  user: UserClassification | null | undefined,
): boolean {
  return isProductOnlyAccount(user, "facturation");
}

export function isInternalAccount(
  user: UserClassification | null | undefined,
): boolean {
  return hasEffectiveCapability(
    user as AccessSubject | null | undefined,
    "staff.internal.access",
  );
}

export function isProSeller(
  user: UserClassification | null | undefined,
): boolean {
  if (!user) return false;
  return (
    user.sellerType === "pro" ||
    user.accountType === "professional" ||
    user.role === "pro_seller"
  );
}

export function isPubliclyListableProSeller(
  user: UserClassification | null | undefined,
): boolean {
  if (!user || !isProSeller(user)) return false;
  return !isAccountSuspended(user) && !isAccountDeactivated(user);
}

export function isIndividualSeller(
  user: UserClassification | null | undefined,
): boolean {
  if (!user) return false;
  return (
    !isProSeller(user) &&
    (user.sellerType === "individual" || user.accountType === "individual")
  );
}

export function isAccountSuspended(
  user: UserClassification | null | undefined,
): boolean {
  return Boolean(user && (user.isSuspended || user.status === "suspended"));
}

export function isAccountDeactivated(
  user: UserClassification | null | undefined,
): boolean {
  return Boolean(
    user &&
    (user.isDeactivated ||
      user.status === "disabled" ||
      user.status === "deleted" ||
      user.status === "closed" ||
      user.status === "banned"),
  );
}

export function isAccountLimited(
  user: UserClassification | null | undefined,
): boolean {
  return Boolean(
    user && (user.status === "limited" || user.status === "restricted"),
  );
}

export function showsVerifiedBadge(
  subject: UserClassification | null | undefined,
): boolean {
  if (!subject) return false;
  const verified = subject.isVerified ?? subject.sellerIsVerified;
  return Boolean(verified) && !isProSeller(subject);
}
