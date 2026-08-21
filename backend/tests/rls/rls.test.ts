import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { hasPermission, PlatformRole } from '../../src/shared/auth/rbac.js';

describe('RLS & Role-Based Access Control Matrix', () => {
  const mobileSafetyMigration = readFileSync(
    new URL('../../supabase/migrations/00009_mobile_safety_and_account_deletion.sql', import.meta.url),
    'utf8'
  );

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

  it('enables RLS for block, push-token, and deletion-audit tables', () => {
    for (const table of ['account_deletion_requests', 'blocked_users', 'push_device_tokens']) {
      expect(mobileSafetyMigration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it('limits user-facing block and push-token policies to the authenticated profile', () => {
    expect(mobileSafetyMigration).toContain('p.auth_user_id = auth.uid()');
    expect(mobileSafetyMigration).not.toMatch(/CREATE POLICY[^;]+account_deletion_requests/s);
  });

  it('keeps account anonymization atomic and service-role only', () => {
    expect(mobileSafetyMigration).toContain('FUNCTION public.complete_account_deletion');
    expect(mobileSafetyMigration).toContain('SECURITY DEFINER');
    expect(mobileSafetyMigration).toContain('REVOKE ALL ON FUNCTION public.complete_account_deletion');
    expect(mobileSafetyMigration).toContain('TO service_role');
  });
});
