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
  | 'course.read'
  | 'course.request.create'
  | 'course.profile.manage.own'
  | 'course.offer.manage.own'
  | 'course.lead.read.own'
  | 'course.lead.respond.own'
  | 'course.organization.manage.own'
  | 'course.booking.create'
  | 'course.admin.manage'
  | 'auto.read'
  | 'auto.vehicle.manage.own'
  | 'auto.dealer.manage.own'
  | 'auto.lead.manage.own'
  | 'auto.inventory.import.own'
  | 'auto.admin.manage'
  | 'immo.read'
  | 'immo.property.manage.own'
  | 'immo.agency.manage.own'
  | 'immo.lead.manage.own'
  | 'immo.inventory.import.own'
  | 'immo.admin.manage'
  | 'store.manage.own'
  | 'subscription.manage.own'
  | 'user.read'
  | 'user.manage'
  | 'user.suspend'
  | 'report.create'
  | 'report.review'
  | 'moderation.review'
  | 'market.manage'
  | 'commercial_rules.read'
  | 'commercial_rules.edit'
  | 'commercial_rules.approve'
  | 'commercial_rules.publish'
  | 'monetization.orders.read'
  | 'admin.access';

const ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  guest: ['listing.read', 'profile.read', 'course.read', 'auto.read', 'immo.read'],
  individual_buyer: [
    'auto.read',
    'immo.read',
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
    'course.read',
    'course.request.create',
    'course.booking.create',
    'course.profile.manage.own',
    'course.offer.manage.own',
    'course.lead.read.own',
    'course.lead.respond.own',
  ],
  individual_seller: [
    'auto.read',
    'auto.vehicle.manage.own',
    'immo.read',
    'immo.property.manage.own',
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
    'course.read',
    'course.request.create',
    'course.profile.manage.own',
    'course.offer.manage.own',
    'course.lead.read.own',
    'course.lead.respond.own',
    'course.booking.create',
  ],
  pro_seller: [
    'auto.read',
    'auto.vehicle.manage.own',
    'auto.dealer.manage.own',
    'auto.lead.manage.own',
    'auto.inventory.import.own',
    'immo.read',
    'immo.property.manage.own',
    'immo.agency.manage.own',
    'immo.lead.manage.own',
    'immo.inventory.import.own',
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
    'course.read',
    'course.request.create',
    'course.profile.manage.own',
    'course.offer.manage.own',
    'course.lead.read.own',
    'course.lead.respond.own',
    'course.organization.manage.own',
    'course.booking.create',
  ],
  support: [
    'listing.read',
    'profile.read',
    'order.read.own',
    'user.read',
    'report.review',
    'moderation.review',
    'course.read',
  ],
  moderator: [
    'listing.read',
    'profile.read',
    'listing.moderate',
    'user.read',
    'user.suspend',
    'report.review',
    'moderation.review',
    'course.read',
  ],
  operations: ['listing.read', 'profile.read', 'user.read', 'order.read.own', 'course.read'],
  finance: ['listing.read', 'profile.read', 'order.read.own', 'payment.refund', 'course.read', 'commercial_rules.read', 'commercial_rules.approve', 'monetization.orders.read'],
  commercial: ['listing.read', 'profile.read', 'user.read', 'course.read', 'commercial_rules.read', 'commercial_rules.edit'],
  content_manager: ['listing.read', 'listing.moderate', 'course.read'],
  market_manager: ['listing.read', 'market.manage', 'course.read', 'course.admin.manage', 'auto.read', 'auto.admin.manage', 'immo.read', 'immo.admin.manage'],
  admin: [
    'auto.read',
    'auto.vehicle.manage.own',
    'auto.dealer.manage.own',
    'auto.lead.manage.own',
    'auto.inventory.import.own',
    'auto.admin.manage',
    'immo.read',
    'immo.property.manage.own',
    'immo.agency.manage.own',
    'immo.lead.manage.own',
    'immo.inventory.import.own',
    'immo.admin.manage',
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
    'commercial_rules.read',
    'commercial_rules.edit',
    'commercial_rules.approve',
    'commercial_rules.publish',
    'monetization.orders.read',
    'course.read',
    'course.request.create',
    'course.profile.manage.own',
    'course.offer.manage.own',
    'course.lead.read.own',
    'course.lead.respond.own',
    'course.organization.manage.own',
    'course.booking.create',
    'course.admin.manage',
  ],
  super_admin: [
    'auto.read',
    'auto.vehicle.manage.own',
    'auto.dealer.manage.own',
    'auto.lead.manage.own',
    'auto.inventory.import.own',
    'auto.admin.manage',
    'immo.read',
    'immo.property.manage.own',
    'immo.agency.manage.own',
    'immo.lead.manage.own',
    'immo.inventory.import.own',
    'immo.admin.manage',
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
    'commercial_rules.read',
    'commercial_rules.edit',
    'commercial_rules.approve',
    'commercial_rules.publish',
    'monetization.orders.read',
    'course.read',
    'course.request.create',
    'course.profile.manage.own',
    'course.offer.manage.own',
    'course.lead.read.own',
    'course.lead.respond.own',
    'course.organization.manage.own',
    'course.booking.create',
    'course.admin.manage',
  ],
};

export function hasPermission(role: PlatformRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
