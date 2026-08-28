import {
  normalizePlatformRole,
  ROLE_DEFINITIONS,
} from "../../security/roles.config";
// Presentation helpers intentionally accept flattened listing/seller shapes as
// well as full profiles. Authoritative authorization uses the canonical access
// subject instead of these tolerant display classifiers.
export interface UserClassification {
  accountType?: string;
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
  if (!user) return false;
  if (user.accountType === "staff" || user.accountType === "internal") {
    return true;
  }
  const role = normalizePlatformRole(user.primaryRole ?? user.role);
  return Boolean(ROLE_DEFINITIONS[role]?.isInternalStaff);
}

export function isProSeller(
  user: UserClassification | null | undefined,
): boolean {
  if (!user || isInternalAccount(user)) return false;
  return (
    user.sellerType === "pro" ||
    user.accountType === "professional" ||
    user.role === "pro_seller"
  );
}

export function isPubliclyListableProSeller(
  user: UserClassification | null | undefined,
): boolean {
  if (!user || isInternalAccount(user) || !isProSeller(user)) return false;
  return !isAccountSuspended(user) && !isAccountDeactivated(user);
}

export function isIndividualSeller(
  user: UserClassification | null | undefined,
): boolean {
  if (!user) return false;
  return (
    !isProSeller(user) &&
    !isInternalAccount(user) &&
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
