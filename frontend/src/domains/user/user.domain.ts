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
