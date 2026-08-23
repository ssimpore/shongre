/**
 * Identity matching and account linking.
 *
 * Social sign-in has exactly one dangerous decision in it: given a profile
 * asserted by Google, Apple or Facebook, is this an existing Shongre account or
 * a new one? Get it wrong permissively and a stranger who controls an email
 * address inherits somebody's listings, messages and payout details. Get it
 * wrong strictly and legitimate users end up with duplicate accounts they
 * cannot merge.
 *
 * The decision is kept here as pure functions over plain data so it can be
 * exhaustively tested without a database, an HTTP client or provider
 * credentials. The service layer performs the reads, calls these, and executes
 * the returned outcome — it never re-implements the rules.
 */

import { AppError } from "../errors/app-error.js";

export type AuthProvider = "password" | "google" | "apple" | "facebook";

export const SOCIAL_PROVIDERS: readonly AuthProvider[] = [
  "google",
  "apple",
  "facebook",
] as const;

export function isSocialProvider(
  value: string,
): value is Exclude<AuthProvider, "password"> {
  return (SOCIAL_PROVIDERS as readonly string[]).includes(value);
}

/** Apple issues these when a user chooses to hide their real address. */
const APPLE_PRIVATE_RELAY_DOMAIN = "@privaterelay.appleid.com";

/**
 * What a provider told us about the person who just authenticated.
 *
 * Every field except `provider` and `subject` is optional on purpose: Facebook
 * can decline to return an email, Apple returns a name only on first
 * authorization, and Google omits `email_verified` for some workspace domains.
 */
export interface ProviderProfile {
  provider: Exclude<AuthProvider, "password">;
  /** Provider-stable subject id. Never an email address. */
  subject: string;
  email?: string | null;
  /** Only ever true when the provider explicitly asserted verification. */
  emailVerified?: boolean;
  displayName?: string | null;
  avatarUrl?: string | null;
}

/** An existing row in user_identities. */
export interface LinkedIdentity {
  userId: string;
  provider: AuthProvider;
  subject: string;
}

/** The subset of a profile the matching rules need. */
export interface AccountSnapshot {
  userId: string;
  email: string;
  status:
    | "active"
    | "suspended"
    | "pending_verification"
    | "banned"
    | "archived"
    | "deleted";
  isEmailVerified: boolean;
  /** True when public.user_credentials holds a hash for this account. */
  hasPassword: boolean;
  linkedProviders: readonly AuthProvider[];
}

export type IdentityResolution =
  /** Rule 1: the (provider, subject) pair is already linked. Sign them in. */
  | { outcome: "authenticate"; userId: string; identityMatched: true }
  /** No identity and no colliding account. Provision a fresh profile. */
  | { outcome: "create_account"; email: string | null; emailVerified: boolean }
  /**
   * Rules 2–4: a verified provider email matches an existing account, but this
   * provider was never linked to it. We will not merge on an email alone; the
   * user must prove control of the Shongre account first.
   */
  | {
      outcome: "require_account_linking";
      userId: string;
      maskedEmail: string;
      reason: LinkChallengeReason;
    }
  /** The matched account cannot sign in at all. */
  | { outcome: "blocked"; userId: string; status: AccountSnapshot["status"] };

export type LinkChallengeReason =
  | "verified_email_matches_existing_account"
  | "account_has_password_login"
  | "account_has_other_providers";

/** Normalizes an email for comparison. Returns null for anything unusable. */
export function normalizeEmail(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (
    !trimmed ||
    !trimmed.includes("@") ||
    trimmed.startsWith("@") ||
    trimmed.endsWith("@")
  ) {
    return null;
  }
  return trimmed;
}

export function isApplePrivateRelay(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  return normalized !== null && normalized.endsWith(APPLE_PRIVATE_RELAY_DOMAIN);
}

/**
 * Masks an address for display in a linking challenge.
 *
 * The challenge screen has to say *which* account was matched or the user
 * cannot tell whether to proceed, but printing the full address would turn the
 * OAuth callback into an email-enumeration oracle.
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}${"•".repeat(Math.max(1, Math.min(6, local.length - 2)))}${tail}@${domain}`;
}

const SIGN_IN_BLOCKING_STATUSES: ReadonlySet<AccountSnapshot["status"]> =
  new Set(["suspended", "banned", "deleted", "archived"]);

/**
 * The core decision.
 *
 * @param profile        what the provider asserted
 * @param linkedIdentity the row matching (provider, subject), if any
 * @param accountByEmail the account owning the provider's email, if any
 *
 * Deliberately takes the two lookups as arguments rather than performing them:
 * the caller must do them in one transaction, and a pure function cannot be
 * fooled by a stale read it performed itself.
 */
export function resolveIdentity(
  profile: ProviderProfile,
  linkedIdentity: LinkedIdentity | null,
  accountByEmail: AccountSnapshot | null,
): IdentityResolution {
  assertUsableProfile(profile);

  // ---- Rule 1: exact identity match wins, unconditionally. -----------------
  // Checked before anything email-related. A user whose Google address changed
  // must still land on their own account, and an attacker who acquires an old
  // address must not.
  if (linkedIdentity) {
    if (
      linkedIdentity.provider !== profile.provider ||
      linkedIdentity.subject !== profile.subject
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Identité fournisseur incohérente.",
      });
    }
    return {
      outcome: "authenticate",
      userId: linkedIdentity.userId,
      identityMatched: true,
    };
  }

  const email = normalizeEmail(profile.email);
  // Rule 3: an unverified address proves nothing. Providers will happily return
  // an address the user never confirmed, and Facebook in particular can return
  // one belonging to a since-recycled account.
  const emailIsTrustworthy = email !== null && profile.emailVerified === true;

  // ---- No colliding account, or a collision we are not allowed to act on. ---
  if (!accountByEmail || !emailIsTrustworthy) {
    return {
      outcome: "create_account",
      email: emailIsTrustworthy ? email : null,
      emailVerified: emailIsTrustworthy,
    };
  }

  // ---- A verified provider email matches an existing Shongre account. ------
  if (SIGN_IN_BLOCKING_STATUSES.has(accountByEmail.status)) {
    // Rule: a suspended or banned account must not become reachable again by
    // arriving through a new provider.
    return {
      outcome: "blocked",
      userId: accountByEmail.userId,
      status: accountByEmail.status,
    };
  }

  // Rule 4: never merge silently, even when both sides verified the address.
  // Controlling the mailbox is not the same as controlling the Shongre account,
  // and the account may hold payout details the mailbox owner never had.
  return {
    outcome: "require_account_linking",
    userId: accountByEmail.userId,
    maskedEmail: maskEmail(accountByEmail.email),
    reason: accountByEmail.hasPassword
      ? "account_has_password_login"
      : accountByEmail.linkedProviders.length > 0
        ? "account_has_other_providers"
        : "verified_email_matches_existing_account",
  };
}

function assertUsableProfile(profile: ProviderProfile): void {
  if (!profile || !isSocialProvider(profile.provider)) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Fournisseur non pris en charge.",
    });
  }
  // Rule 5 in its strictest form: without a subject there is nothing to match
  // on, and falling back to name or email here is exactly the bug this module
  // exists to prevent.
  if (
    typeof profile.subject !== "string" ||
    profile.subject.trim().length === 0
  ) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Réponse du fournisseur incomplète.",
    });
  }
}

// ==============================================================================
// Explicit linking, from account settings
// ==============================================================================

export interface LinkRequest {
  /** The already-authenticated Shongre account requesting the link. */
  actingUserId: string;
  profile: ProviderProfile;
  /** Identity row for (provider, subject), if the pair is known at all. */
  existingIdentity: LinkedIdentity | null;
  /** Providers already attached to the acting account. */
  actingAccountProviders: readonly AuthProvider[];
  /** Whether the caller re-authenticated recently enough for a security change. */
  hasRecentAuthentication: boolean;
}

export type LinkDecision =
  | { decision: "link" }
  | { decision: "already_linked_to_caller" }
  | { decision: "rejected"; reason: LinkRejectionReason };

export type LinkRejectionReason =
  | "identity_belongs_to_another_account"
  | "provider_already_linked"
  | "recent_authentication_required";

export function evaluateLinkRequest(request: LinkRequest): LinkDecision {
  assertUsableProfile(request.profile);

  // Rule 7: linking is a security-sensitive change to how an account can be
  // accessed, so it requires proof the session is fresh — not merely valid.
  if (!request.hasRecentAuthentication) {
    return { decision: "rejected", reason: "recent_authentication_required" };
  }

  if (request.existingIdentity) {
    if (request.existingIdentity.userId === request.actingUserId) {
      return { decision: "already_linked_to_caller" };
    }
    // Rule 6: never move an identity between accounts. Doing so would let
    // whoever currently controls the provider account silently detach it from
    // its original owner.
    return {
      decision: "rejected",
      reason: "identity_belongs_to_another_account",
    };
  }

  if (request.actingAccountProviders.includes(request.profile.provider)) {
    return { decision: "rejected", reason: "provider_already_linked" };
  }

  return { decision: "link" };
}

// ==============================================================================
// Unlinking
// ==============================================================================

export interface UnlinkRequest {
  provider: AuthProvider;
  linkedProviders: readonly AuthProvider[];
  hasPassword: boolean;
  hasRecentAuthentication: boolean;
}

export type UnlinkDecision =
  | { decision: "unlink" }
  | { decision: "rejected"; reason: UnlinkRejectionReason };

export type UnlinkRejectionReason =
  | "not_linked"
  | "would_remove_last_login_method"
  | "recent_authentication_required";

/**
 * Mirrors the database trigger in 00012. Both exist deliberately: this one
 * produces a helpful, localized message before the user confirms, while the
 * trigger is the guarantee that survives a concurrent request or a future
 * caller that forgets to ask.
 */
export function evaluateUnlinkRequest(request: UnlinkRequest): UnlinkDecision {
  if (!request.linkedProviders.includes(request.provider)) {
    return { decision: "rejected", reason: "not_linked" };
  }
  if (!request.hasRecentAuthentication) {
    return { decision: "rejected", reason: "recent_authentication_required" };
  }

  const remaining = request.linkedProviders.filter(
    (p) => p !== request.provider,
  );
  const remainingUsable = request.hasPassword
    ? remaining.length + 1
    : remaining.length;
  if (remainingUsable === 0) {
    return { decision: "rejected", reason: "would_remove_last_login_method" };
  }

  return { decision: "unlink" };
}

// ==============================================================================
// Profile field reconciliation
// ==============================================================================

export interface ProfileFieldUpdate {
  name?: string;
  avatarUrl?: string;
  isEmailVerified?: boolean;
}

/**
 * Decides which provider-supplied fields may touch an existing profile.
 *
 * The rule is that the provider never overwrites something the user chose.
 * Apple compounds this: it returns a name only on the first authorization, so
 * a naive "sync on every login" would replace a good name with nothing on the
 * second sign-in.
 */
export function reconcileProfileFields(
  current: {
    name: string | null;
    avatarUrl: string | null;
    isEmailVerified: boolean;
    hasUserEditedProfile: boolean;
  },
  profile: ProviderProfile,
): ProfileFieldUpdate {
  const update: ProfileFieldUpdate = {};

  const providerName = profile.displayName?.trim();
  if (providerName && !current.name?.trim()) {
    // Only ever fills a gap. Never replaces an existing name, and never clears
    // one because the provider went quiet.
    update.name = providerName;
  }

  const providerAvatar = profile.avatarUrl?.trim();
  if (providerAvatar && !current.avatarUrl && !current.hasUserEditedProfile) {
    update.avatarUrl = providerAvatar;
  }

  // Verification is one-way: a provider asserting a verified address can
  // confirm an unverified profile, but a provider that omits the claim must
  // not un-verify an address the user already confirmed by email.
  if (profile.emailVerified === true && !current.isEmailVerified) {
    update.isEmailVerified = true;
  }

  return update;
}
