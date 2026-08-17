import { describe, it, expect } from 'vitest';
import { hasPermission, PlatformRole } from '../../src/shared/auth/rbac.js';

describe('RLS & Role-Based Access Control Matrix', () => {
  it('allows buyers to read listings and create orders', () => {
    expect(hasPermission('individual_buyer', 'listing.read')).toBe(true);
    expect(hasPermission('individual_buyer', 'order.create')).toBe(true);
    expect(hasPermission('individual_buyer', 'listing.create')).toBe(false);
    expect(hasPermission('individual_buyer', 'admin.access')).toBe(false);
  });

  it('allows sellers to publish listings and manage own orders', () => {
    expect(hasPermission('individual_seller', 'listing.create')).toBe(true);
    expect(hasPermission('individual_seller', 'listing.publish')).toBe(true);
    expect(hasPermission('individual_seller', 'order.manage.seller')).toBe(true);
    expect(hasPermission('individual_seller', 'admin.access')).toBe(false);
  });

  it('allows moderators to review and moderate listings', () => {
    expect(hasPermission('moderator', 'listing.moderate')).toBe(true);
    expect(hasPermission('moderator', 'report.review')).toBe(true);
    expect(hasPermission('moderator', 'user.suspend')).toBe(true);
  });

  it('grants full administrative permissions to admin and super_admin', () => {
    const roles: PlatformRole[] = ['admin', 'super_admin'];
    for (const role of roles) {
      expect(hasPermission(role, 'admin.access')).toBe(true);
      expect(hasPermission(role, 'market.manage')).toBe(true);
      expect(hasPermission(role, 'order.refund')).toBe(true);
      expect(hasPermission(role, 'user.manage')).toBe(true);
    }
  });
});
