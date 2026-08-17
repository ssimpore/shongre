export type PlatformRole =
  | 'guest'
  | 'individual_buyer'
  | 'individual_seller'
  | 'pro_seller'
  | 'support'
  | 'moderator'
  | 'operations'
  | 'finance'
  | 'commercial'
  | 'content_manager'
  | 'market_manager'
  | 'admin'
  | 'super_admin';

export type Permission =
  | 'profile.read'
  | 'profile.update.own'
  | 'listing.read'
  | 'listing.create'
  | 'listing.update.own'
  | 'listing.delete.own'
  | 'listing.publish'
  | 'listing.mark_reserved'
  | 'listing.mark_sold'
  | 'listing.promote'
  | 'listing.moderate'
  | 'message.read.own'
  | 'message.send'
  | 'favorite.manage.own'
  | 'order.create'
  | 'order.read.own'
  | 'order.manage.seller'
  | 'order.refund'
  | 'payment.initiate'
  | 'payment.refund'
  | 'review.create'
  | 'store.manage.own'
  | 'subscription.manage.own'
  | 'user.read'
  | 'user.manage'
  | 'user.suspend'
  | 'report.create'
  | 'report.review'
  | 'moderation.review'
  | 'market.manage'
  | 'admin.access';

const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  guest: ['listing.read', 'profile.read'],
  individual_buyer: [
    'listing.read',
    'profile.read',
    'profile.update.own',
    'favorite.manage.own',
    'message.read.own',
    'message.send',
    'order.create',
    'order.read.own',
    'payment.initiate',
    'review.create',
    'report.create',
  ],
  individual_seller: [
    'listing.read',
    'profile.read',
    'profile.update.own',
    'favorite.manage.own',
    'listing.create',
    'listing.update.own',
    'listing.delete.own',
    'listing.publish',
    'listing.mark_reserved',
    'listing.mark_sold',
    'listing.promote',
    'message.read.own',
    'message.send',
    'order.create',
    'order.read.own',
    'order.manage.seller',
    'payment.initiate',
    'review.create',
    'report.create',
  ],
  pro_seller: [
    'listing.read',
    'profile.read',
    'profile.update.own',
    'favorite.manage.own',
    'listing.create',
    'listing.update.own',
    'listing.delete.own',
    'listing.publish',
    'listing.mark_reserved',
    'listing.mark_sold',
    'listing.promote',
    'store.manage.own',
    'subscription.manage.own',
    'message.read.own',
    'message.send',
    'order.create',
    'order.read.own',
    'order.manage.seller',
    'payment.initiate',
    'review.create',
    'report.create',
  ],
  support: [
    'listing.read',
    'profile.read',
    'order.read.own',
    'user.read',
    'report.review',
    'moderation.review',
  ],
  moderator: [
    'listing.read',
    'profile.read',
    'listing.moderate',
    'user.read',
    'user.suspend',
    'report.review',
    'moderation.review',
  ],
  operations: ['listing.read', 'profile.read', 'user.read', 'order.read.own'],
  finance: ['listing.read', 'profile.read', 'order.read.own', 'payment.refund'],
  commercial: ['listing.read', 'profile.read', 'user.read'],
  content_manager: ['listing.read', 'listing.moderate'],
  market_manager: ['listing.read', 'market.manage'],
  admin: [
    'listing.read',
    'profile.read',
    'profile.update.own',
    'favorite.manage.own',
    'listing.create',
    'listing.update.own',
    'listing.delete.own',
    'listing.publish',
    'listing.mark_reserved',
    'listing.mark_sold',
    'listing.promote',
    'listing.moderate',
    'message.read.own',
    'message.send',
    'order.create',
    'order.read.own',
    'order.manage.seller',
    'order.refund',
    'payment.initiate',
    'payment.refund',
    'review.create',
    'store.manage.own',
    'subscription.manage.own',
    'user.read',
    'user.manage',
    'user.suspend',
    'report.create',
    'report.review',
    'moderation.review',
    'market.manage',
    'admin.access',
  ],
  super_admin: [
    'listing.read',
    'profile.read',
    'profile.update.own',
    'favorite.manage.own',
    'listing.create',
    'listing.update.own',
    'listing.delete.own',
    'listing.publish',
    'listing.mark_reserved',
    'listing.mark_sold',
    'listing.promote',
    'listing.moderate',
    'message.read.own',
    'message.send',
    'order.create',
    'order.read.own',
    'order.manage.seller',
    'order.refund',
    'payment.initiate',
    'payment.refund',
    'review.create',
    'store.manage.own',
    'subscription.manage.own',
    'user.read',
    'user.manage',
    'user.suspend',
    'report.create',
    'report.review',
    'moderation.review',
    'market.manage',
    'admin.access',
  ],
};

export function hasPermission(role: PlatformRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
