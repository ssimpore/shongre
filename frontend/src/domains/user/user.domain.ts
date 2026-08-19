import { UserProfile } from '../../types';

export function isProSeller(user: any): boolean {
  if (!user) return false;
  return user.sellerType === 'pro' || user.accountType === 'professional' || user.role === 'pro_seller';
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
