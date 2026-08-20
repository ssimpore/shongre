import { describe, it, expect } from 'vitest';
import {
  showsVerifiedBadge,
  isProSeller,
  isInternalAccount,
  isPubliclyListableProSeller,
} from './user.domain';
import { DEMO_USERS } from '../../mocks/initialDemoData';

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

describe('isInternalAccount', () => {
  it('recognises staff by account type', () => {
    expect(isInternalAccount({ accountType: 'internal' })).toBe(true);
  });

  it('recognises staff by platform role even when the account type disagrees', () => {
    // A profile whose role was changed without its stored accountType being
    // updated must still be treated as internal.
    expect(isInternalAccount({ accountType: 'professional', primaryRole: 'moderator' })).toBe(true);
    expect(isInternalAccount({ accountType: 'professional', role: 'finance' })).toBe(true);
  });

  it('does not flag marketplace members', () => {
    expect(isInternalAccount({ accountType: 'professional', primaryRole: 'pro_seller' })).toBe(false);
    expect(isInternalAccount({ accountType: 'individual', primaryRole: 'seller' })).toBe(false);
    expect(isInternalAccount(null)).toBe(false);
    expect(isInternalAccount(undefined)).toBe(false);
  });
});

describe('isPubliclyListableProSeller', () => {
  const shop = {
    accountType: 'professional',
    sellerType: 'pro',
    primaryRole: 'pro_seller',
    status: 'active',
  };

  it('lists an active professional shop', () => {
    expect(isPubliclyListableProSeller(shop)).toBe(true);
  });

  it('never lists a Shongre staff account, whatever its seller type', () => {
    // Internal personas carry `sellerType: 'pro'` so staff can exercise the
    // professional surfaces. That made `isProSeller()` true for them and put
    // them in the public directory at /professionnels, internal role and all.
    const staff = { ...shop, accountType: 'internal', primaryRole: 'commercial' };
    expect(isProSeller(staff)).toBe(true);
    expect(isPubliclyListableProSeller(staff)).toBe(false);
  });

  it('never lists a suspended or deactivated shop', () => {
    expect(isPubliclyListableProSeller({ ...shop, status: 'suspended' })).toBe(false);
    expect(isPubliclyListableProSeller({ ...shop, isSuspended: true })).toBe(false);
    expect(isPubliclyListableProSeller({ ...shop, status: 'disabled' })).toBe(false);
    expect(isPubliclyListableProSeller({ ...shop, status: 'deleted' })).toBe(false);
  });

  it('does not list individual sellers', () => {
    expect(
      isPubliclyListableProSeller({
        accountType: 'individual',
        sellerType: 'individual',
        primaryRole: 'seller',
        status: 'active',
      }),
    ).toBe(false);
  });

  it('excludes every internal persona shipped in the demo fixtures', () => {
    const leaked = Object.values(DEMO_USERS)
      .filter((u: any) => isPubliclyListableProSeller(u))
      .filter((u: any) => u.accountType === 'internal');

    expect(leaked.map((u: any) => u.email)).toEqual([]);
  });

  it('still lists the demo professional shops', () => {
    const listed = Object.values(DEMO_USERS)
      .filter((u: any) => isPubliclyListableProSeller(u))
      .map((u: any) => u.slug);

    expect(listed).toContain('atelier-nordique');
    expect(listed).toContain('optique-des-arts');
  });
});
