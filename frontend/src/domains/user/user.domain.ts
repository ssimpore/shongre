import { normalizePlatformRole, ROLE_DEFINITIONS } from '../../security/roles.config';

export function isProSeller(user: any): boolean {
  if (!user) return false;
  return user.sellerType === 'pro' || user.accountType === 'professional' || user.role === 'pro_seller';
}

/**
 * Is this a Shongre staff account rather than a marketplace member?
 *
 * Internal personas carry `sellerType: 'pro'` so that staff can exercise the
 * professional surfaces while testing. That made `isProSeller()` true for them,
 * and the public professional directory — which filtered on nothing else —
 * listed `Léa Bertin (Commercial & Partenariats)` and `Antoine Fabre
 * (Administrateur)` beside real shops, internal role and all. The seller-type
 * flag is therefore not sufficient on its own; publicity needs its own gate.
 *
 * Both signals are checked because they can disagree: `accountType` comes from
 * the stored profile, `isInternalStaff` from the role definition, and a profile
 * whose role was changed without its account type being updated must still be
 * treated as internal.
 */
export function isInternalAccount(user: any): boolean {
  if (!user) return false;
  if (user.accountType === 'internal') return true;
  const role = normalizePlatformRole(user.primaryRole ?? user.role);
  return Boolean(ROLE_DEFINITIONS[role]?.isInternalStaff);
}

/**
 * May this account appear in public professional listings — the directory at
 * `/professionnels` and the homepage shop rail?
 *
 * Deliberately stricter than `isProSeller()`. Being of professional *type* says
 * what an account is; appearing in a public directory is a publication
 * decision, and staff and closed accounts do not qualify for it.
 *
 * TODO(product): the directory's hero states that every listed business is
 * verified, yet an account with `status: 'pending'` and `isVerified: false`
 * still passes this gate. Adding `isVerified` here would make the copy true but
 * would also delist shops awaiting KBIS validation, which is a commercial call
 * rather than a security one — left out of the security fix on purpose.
 */
export function isPubliclyListableProSeller(user: any): boolean {
  if (!user) return false;
  if (isInternalAccount(user)) return false;
  if (!isProSeller(user)) return false;
  return !isAccountSuspended(user) && !isAccountDeactivated(user);
}

export function isIndividualSeller(user: any): boolean {
  if (!user) return false;
  return !isProSeller(user) && (user.sellerType === 'individual' || user.accountType === 'individual');
}

export function isAccountSuspended(user: any): boolean {
  if (!user) return false;
  return Boolean(user.isSuspended || user.status === 'suspended');
}

export function isAccountDeactivated(user: any): boolean {
  if (!user) return false;
  return Boolean(user.isDeactivated || user.status === 'disabled' || user.status === 'deleted');
}

export function isAccountLimited(user: any): boolean {
  if (!user) return false;
  return user.status === 'limited';
}

/**
 * Should the standalone "Vérifié" badge be shown for this account?
 *
 * Only for individuals. A professional account cannot exist without passing
 * SIRET/KBIS verification, so the "Pro" badge already carries that meaning —
 * rendering both put two trust badges side by side that said the same thing,
 * and made the seller identity row noisier than the information in it.
 *
 * The rule lives here rather than at each call site because it appears on the
 * seller card, the profile header, the listing trust section and the map popup;
 * inlined, those drift apart the first time one of them is touched.
 *
 * Accepts a user profile or a listing: listings carry the seller's state
 * flattened as `sellerIsVerified` / `sellerType`, and both shapes need the same
 * answer.
 */
export function showsVerifiedBadge(subject: any): boolean {
  if (!subject) return false;
  const verified = subject.isVerified ?? subject.sellerIsVerified;
  return Boolean(verified) && !isProSeller(subject);
}
