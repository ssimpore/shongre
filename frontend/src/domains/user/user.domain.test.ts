import { describe, it, expect } from 'vitest';
import { showsVerifiedBadge } from './user.domain';

describe('showsVerifiedBadge', () => {
  it('shows the badge for a verified individual', () => {
    expect(showsVerifiedBadge({ isVerified: true, sellerType: 'individual' })).toBe(true);
  });

  it('hides it for an unverified individual', () => {
    expect(showsVerifiedBadge({ isVerified: false, sellerType: 'individual' })).toBe(false);
  });

  // A professional account cannot exist without passing SIRET/KBIS checks, so the
  // "Pro" badge already carries that meaning — showing both said it twice.
  it.each([
    ['sellerType', { isVerified: true, sellerType: 'pro' }],
    ['accountType', { isVerified: true, accountType: 'professional' }],
    ['role', { isVerified: true, role: 'pro_seller' }],
  ])('hides it for a pro identified by %s', (_label, subject) => {
    expect(showsVerifiedBadge(subject)).toBe(false);
  });

  // Listings carry the seller's state flattened, so both shapes must agree.
  it('accepts the flattened listing shape', () => {
    expect(showsVerifiedBadge({ sellerIsVerified: true, sellerType: 'individual' })).toBe(true);
    expect(showsVerifiedBadge({ sellerIsVerified: true, sellerType: 'pro' })).toBe(false);
  });

  it('handles a missing subject', () => {
    expect(showsVerifiedBadge(null)).toBe(false);
    expect(showsVerifiedBadge(undefined)).toBe(false);
  });
});
