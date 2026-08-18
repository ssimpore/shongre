import { IncomingMessage, ServerResponse } from 'http';
import {
  authService,
  usersService,
  marketsService,
  taxonomyService,
  listingsService,
  ordersService,
  paymentsService,
  monetizationService,
  verificationService,
  messagingService,
  notificationsService,
  reviewsService,
  workspaceService,
  adminService,
} from '../../modules/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { logger } from '../../infrastructure/logging/logger.js';
import { Permission } from '../../shared/auth/rbac.js';
import {
  Principal,
  GUEST_PRINCIPAL,
  requireAuthenticated,
  requirePermission,
  requireOwnership,
  resolveOwnerId,
} from '../../shared/auth/principal.js';
import { extractBearerToken } from '../../shared/auth/tokens.js';
import { verifyStripeSignature } from '../../integrations/stripe/webhook-signature.js';
import { config } from '../../app/config/index.js';

/**
 * Every route declares who may call it.
 *
 * Making this a required argument rather than an optional flag is the point: a
 * route cannot be added without its author stating an access rule, so "we
 * forgot to add auth to that endpoint" stops being a silent default. `public`
 * is spelled out so that an unauthenticated route is a visible decision in
 * review.
 */
export type RouteAccess =
  | { kind: 'public' }
  | { kind: 'authenticated' }
  | { kind: 'permission'; permission: Permission };

export const PUBLIC: RouteAccess = { kind: 'public' };
export const AUTHENTICATED: RouteAccess = { kind: 'authenticated' };
export const permission = (p: Permission): RouteAccess => ({ kind: 'permission', permission: p });

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  body: any;
  principal: Principal;
  query: URLSearchParams;
}

export type RouteHandler = (ctx: RouteContext) => Promise<any>;

interface RouteDef {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  access: RouteAccess;
  handler: RouteHandler;
}

export class ApiV1Router {
  private routes: RouteDef[] = [];

  constructor() {
    this.registerRoutes();
  }

  private addRoute(method: string, path: string, access: RouteAccess, handler: RouteHandler) {
    const paramNames: string[] = [];
    const regexPath = path.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });
    const pattern = new RegExp(`^${regexPath}$`);
    this.routes.push({ method: method.toUpperCase(), pattern, paramNames, access, handler });
  }

  private registerRoutes() {
    // --------------------------------------------------------------------------
    // AUTH ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/auth/me', PUBLIC, async ({ principal }) => authService.getCurrentUser(principal));
    this.addRoute('POST', '/auth/login', PUBLIC, async ({ body }) => authService.login(body));
    this.addRoute('POST', '/auth/register', PUBLIC, async ({ body }) => authService.register(body));
    this.addRoute('POST', '/auth/logout', PUBLIC, async ({ principal }) => {
      await authService.logout(principal);
      return { success: true };
    });
    this.addRoute('POST', '/auth/switch-role', AUTHENTICATED, async ({ principal, body }) =>
      authService.switchRole(principal, body?.role)
    );
    this.addRoute('POST', '/auth/verify-phone', AUTHENTICATED, async ({ principal, body }) => {
      const verified = await authService.verifyPhone(principal, body?.phone, body?.code);
      return { verified };
    });
    // Email confirmation arrives from a mail link, so the caller is not yet
    // signed in; the signed token in the body is the credential.
    this.addRoute('POST', '/auth/verify-email', PUBLIC, async ({ body }) => {
      const verified = await authService.verifyEmail(body?.token);
      return { verified };
    });

    // --------------------------------------------------------------------------
    // USERS ROUTES
    // --------------------------------------------------------------------------
    // Public seller profiles are part of the marketplace surface.
    this.addRoute('GET', '/users/:id', PUBLIC, async ({ params }) => usersService.getUserById(params.id));
    this.addRoute('PUT', '/users/:id', permission('profile.update.own'), async ({ principal, params, body }) => {
      const ownerId = resolveOwnerId(principal, params.id, 'user.manage');
      return usersService.updateUserProfile(ownerId, sanitizeProfileUpdate(body, principal));
    });

    // --------------------------------------------------------------------------
    // LISTINGS & SEARCH ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/listings', PUBLIC, async ({ query }) => {
      const params = Object.fromEntries(query.entries());
      return listingsService.getListings(params as any);
    });
    this.addRoute('GET', '/listings/:id', PUBLIC, async ({ params }) => listingsService.getListingById(params.id));
    this.addRoute('POST', '/listings/search', PUBLIC, async ({ body }) => listingsService.searchListings(body || {}));
    this.addRoute('POST', '/listings/drafts', permission('listing.create'), async ({ principal }) =>
      listingsService.createListingDraft(principal.userId)
    );
    this.addRoute('PUT', '/listings/drafts/:userId', permission('listing.create'), async ({ principal, params, body }) => {
      const ownerId = resolveOwnerId(principal, params.userId);
      await listingsService.saveListingDraft(body, ownerId);
      return { success: true };
    });
    this.addRoute('POST', '/listings/publish', permission('listing.publish'), async ({ principal, body }) => {
      // The seller is the caller. Taking sellerId from the body would let anyone
      // publish listings under another account's name.
      return listingsService.publishListing(body?.draft, principal.userId);
    });
    this.addRoute('PUT', '/listings/:id', permission('listing.update.own'), async ({ principal, params, body }) => {
      await this.assertListingOwnership(principal, params.id);
      return listingsService.updateListing(params.id, body);
    });
    this.addRoute('DELETE', '/listings/:id', permission('listing.delete.own'), async ({ principal, params }) => {
      await this.assertListingOwnership(principal, params.id);
      const success = await listingsService.deleteListing(params.id);
      return { success };
    });
    this.addRoute('POST', '/listings/:id/favorite', permission('favorite.manage.own'), async ({ principal, params }) => {
      const isFavorite = await listingsService.toggleFavorite(params.id, principal.userId);
      return { isFavorite };
    });
    this.addRoute('GET', '/favorites', permission('favorite.manage.own'), async ({ principal }) => {
      const listingIds = await listingsService.getFavorites(principal.userId);
      return { listingIds };
    });

    // --------------------------------------------------------------------------
    // TAXONOMY ROUTES (public catalogue metadata)
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/taxonomy/root', PUBLIC, async () => taxonomyService.getRootCategories());
    this.addRoute('GET', '/taxonomy/nodes/:id', PUBLIC, async ({ params }) => taxonomyService.getNodeById(params.id));
    this.addRoute('GET', '/taxonomy/slug/:slug', PUBLIC, async ({ params }) => taxonomyService.getNodeBySlug(params.slug));
    this.addRoute('GET', '/taxonomy/:id/children', PUBLIC, async ({ params }) => taxonomyService.getChildren(params.id));
    this.addRoute('GET', '/taxonomy/:id/attributes', PUBLIC, async ({ params }) =>
      taxonomyService.getAttributesForCategory(params.id)
    );
    this.addRoute('GET', '/taxonomy/search-filters', PUBLIC, async ({ query }) =>
      taxonomyService.resolveSearchFilters(query.get('nodeId') || undefined)
    );

    // --------------------------------------------------------------------------
    // MARKETS ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/markets', PUBLIC, async () => marketsService.getAllMarkets());
    this.addRoute('GET', '/markets/active', PUBLIC, async () => marketsService.getActiveMarket());
    // Enabling or switching a market is an operator action, not a visitor
    // preference: it changes what the platform serves.
    this.addRoute('POST', '/markets/active', permission('market.manage'), async ({ body }) =>
      marketsService.setActiveMarket(body?.code)
    );
    this.addRoute('GET', '/markets/:code', PUBLIC, async ({ params }) => marketsService.getMarketByCode(params.code));
    this.addRoute('GET', '/markets/effective/:code', PUBLIC, async ({ params }) =>
      marketsService.getEffectiveMarketConfig(params.code)
    );

    // --------------------------------------------------------------------------
    // ORDERS & ESCROW ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/orders/:id', permission('order.read.own'), async ({ principal, params }) => {
      const order = await ordersService.getOrderById(params.id);
      return this.assertOrderParticipant(principal, order);
    });
    this.addRoute('GET', '/orders/purchases/:userId', permission('order.read.own'), async ({ principal, params }) =>
      ordersService.getPurchases(resolveOwnerId(principal, params.userId))
    );
    this.addRoute('GET', '/orders/sales/:userId', permission('order.manage.seller'), async ({ principal, params }) =>
      ordersService.getSales(resolveOwnerId(principal, params.userId))
    );
    this.addRoute('POST', '/orders/direct-purchase', permission('order.create'), async ({ principal, body }) =>
      ordersService.createDirectPurchase({ ...body, buyerId: principal.userId })
    );
    this.addRoute('POST', '/orders/reservation', permission('order.create'), async ({ principal, body }) =>
      ordersService.createReservation({ ...body, buyerId: principal.userId })
    );
    this.addRoute('POST', '/orders/:id/confirm-pin', AUTHENTICATED, async ({ principal, params, body }) => {
      const order = await ordersService.getOrderById(params.id);
      this.assertOrderParticipant(principal, order);
      return ordersService.confirmHandoverPIN(params.id, body?.pin);
    });
    this.addRoute('POST', '/orders/:id/confirm-delivery', AUTHENTICATED, async ({ principal, params }) => {
      const order = await ordersService.getOrderById(params.id);
      this.assertOrderParticipant(principal, order);
      return ordersService.confirmDeliveryReceived(params.id);
    });
    this.addRoute('POST', '/orders/:id/dispute', AUTHENTICATED, async ({ principal, params, body }) => {
      const order = await ordersService.getOrderById(params.id);
      this.assertOrderParticipant(principal, order);
      return ordersService.openDispute(params.id, body?.reason, body?.details);
    });

    // --------------------------------------------------------------------------
    // PAYMENTS ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('POST', '/payments/intent', permission('payment.initiate'), async ({ body }) =>
      paymentsService.createPaymentIntent(body?.amount, body?.currency, body?.metadata)
    );
    // Payouts move money to a bank account. The destination is the caller's own
    // seller account, never an id supplied in the request body.
    this.addRoute('POST', '/payments/payout', permission('order.manage.seller'), async ({ principal, body }) =>
      paymentsService.requestSellerPayout(principal.userId, body?.amount, body?.iban)
    );
    this.addRoute('GET', '/payments/balance/:sellerId', permission('order.manage.seller'), async ({ principal, params }) =>
      paymentsService.getSellerBalance(resolveOwnerId(principal, params.sellerId, 'payment.refund'))
    );

    // --------------------------------------------------------------------------
    // PROMOTIONS & MONETIZATION ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/promotions/boosts', PUBLIC, async ({ query }) =>
      monetizationService.getAvailableBoosts(query.get('listingId') || undefined)
    );
    this.addRoute('GET', '/promotions/pro-plans', PUBLIC, async () => monetizationService.getProSubscriptionPlans());
    this.addRoute('POST', '/promotions/apply-boost', permission('listing.promote'), async ({ principal, body }) => {
      await this.assertListingOwnership(principal, body?.listingId);
      return monetizationService.applyBoost(body?.listingId, body?.boostId, body?.paymentMethod);
    });
    this.addRoute('POST', '/promotions/subscribe-pro', permission('subscription.manage.own'), async ({ principal, body }) =>
      monetizationService.subscribeToProPlan(principal.userId, body?.planId)
    );

    // --------------------------------------------------------------------------
    // VERIFICATION & KYC/KYB ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/verification/status/:userId', AUTHENTICATED, async ({ principal, params }) =>
      verificationService.getUserVerificationStatus(resolveOwnerId(principal, params.userId, 'user.read'))
    );
    this.addRoute('POST', '/verification/identity', AUTHENTICATED, async ({ principal, body }) =>
      verificationService.submitIdentityDocument(principal.userId, body?.docType, body?.fileUrl)
    );
    this.addRoute('GET', '/verification/siret-lookup/:siret', AUTHENTICATED, async ({ params }) =>
      verificationService.lookupCompanyBySiret(params.siret)
    );
    this.addRoute('POST', '/verification/business-registration', AUTHENTICATED, async ({ principal, body }) =>
      verificationService.submitBusinessRegistration(principal.userId, body?.siret, body?.representativeName)
    );
    // Bank coordinates decide where escrow funds land: binding them to the
    // authenticated caller is what stops an attacker redirecting a payout.
    this.addRoute('POST', '/verification/bank-coordinates', AUTHENTICATED, async ({ principal, body }) =>
      verificationService.submitBankPayoutCoordinates(principal.userId, body?.iban, body?.bic, body?.holderName)
    );

    // --------------------------------------------------------------------------
    // MESSAGING ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/messaging/conversations/:userId', permission('message.read.own'), async ({ principal, params }) =>
      messagingService.getUserConversations(resolveOwnerId(principal, params.userId))
    );
    this.addRoute('GET', '/messaging/conversations/detail/:id', permission('message.read.own'), async ({ principal, params }) => {
      const conversation = await messagingService.getConversationById(params.id);
      return this.assertConversationParticipant(principal, conversation);
    });
    this.addRoute('POST', '/messaging/send', permission('message.send'), async ({ principal, body }) => {
      await this.assertConversationAccess(principal, body?.conversationId);
      return messagingService.sendMessage({ ...body, senderId: principal.userId });
    });
    this.addRoute('POST', '/messaging/offer', permission('message.send'), async ({ principal, body }) => {
      await this.assertConversationAccess(principal, body?.conversationId);
      return messagingService.makeOffer(body?.conversationId, principal.userId, body?.senderName, body?.amount);
    });
    this.addRoute('POST', '/messaging/offer-response', permission('message.send'), async ({ principal, body }) => {
      await this.assertConversationAccess(principal, body?.conversationId);
      return messagingService.respondToOffer(body?.conversationId, principal.userId, body?.userName, body?.accept);
    });
    this.addRoute('POST', '/messaging/schedule-pickup', permission('message.send'), async ({ principal, body }) => {
      await this.assertConversationAccess(principal, body?.conversationId);
      return messagingService.schedulePickup(body?.conversationId, body?.date, body?.timeSlot, body?.address);
    });
    this.addRoute('POST', '/messaging/read', permission('message.read.own'), async ({ principal, body }) => {
      await this.assertConversationAccess(principal, body?.conversationId);
      await messagingService.markAsRead(body?.conversationId, principal.userId);
      return { success: true };
    });
    this.addRoute('POST', '/messaging/block', AUTHENTICATED, async ({ principal, body }) => {
      await messagingService.blockUser(principal.userId, body?.targetUserId);
      return { success: true };
    });

    // --------------------------------------------------------------------------
    // NOTIFICATIONS ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/notifications/:userId', AUTHENTICATED, async ({ principal, params }) =>
      notificationsService.getUserNotifications(resolveOwnerId(principal, params.userId))
    );
    this.addRoute('GET', '/notifications/unread-count/:userId', AUTHENTICATED, async ({ principal, params }) => {
      const count = await notificationsService.getUnreadCount(resolveOwnerId(principal, params.userId));
      return { count };
    });
    this.addRoute('POST', '/notifications/:id/read', AUTHENTICATED, async ({ principal, params }) => {
      await this.assertNotificationOwnership(principal, params.id);
      await notificationsService.markAsRead(params.id);
      return { success: true };
    });
    this.addRoute('POST', '/notifications/:userId/read-all', AUTHENTICATED, async ({ principal, params }) => {
      await notificationsService.markAllAsRead(resolveOwnerId(principal, params.userId));
      return { success: true };
    });
    this.addRoute('DELETE', '/notifications/:id', AUTHENTICATED, async ({ principal, params }) => {
      await this.assertNotificationOwnership(principal, params.id);
      await notificationsService.deleteNotification(params.id);
      return { success: true };
    });

    // --------------------------------------------------------------------------
    // REVIEWS ROUTES
    // --------------------------------------------------------------------------
    // Ratings are shown on public seller pages, so reading them is public.
    this.addRoute('GET', '/reviews/user/:userId', PUBLIC, async ({ params }) => reviewsService.getUserReviews(params.userId));
    this.addRoute('POST', '/reviews/submit', permission('review.create'), async ({ principal, body }) =>
      reviewsService.submitReview({ ...body, authorId: principal.userId })
    );

    // --------------------------------------------------------------------------
    // WORKSPACE & SELLER DASHBOARD ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/workspace/summary/:userId', AUTHENTICATED, async ({ principal, params }) =>
      workspaceService.getUserWorkspaceSummary(resolveOwnerId(principal, params.userId))
    );
    this.addRoute('GET', '/workspace/pro-analytics/:sellerId', permission('store.manage.own'), async ({ principal, params }) =>
      workspaceService.getProAnalytics(resolveOwnerId(principal, params.sellerId, 'user.read'))
    );

    // --------------------------------------------------------------------------
    // ADMIN ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/admin/stats', permission('admin.access'), async () => adminService.getPlatformStats());
    this.addRoute('GET', '/admin/users', permission('user.read'), async () => adminService.getAllUsers());
    this.addRoute('PUT', '/admin/users/:userId/status', permission('user.suspend'), async ({ principal, params, body }) => {
      if (params.userId === principal.userId) {
        throw new AppError({
          code: 'BAD_REQUEST',
          message: 'Vous ne pouvez pas modifier le statut de votre propre compte.',
        });
      }
      return adminService.updateUserStatus(params.userId, body?.status);
    });
    this.addRoute('GET', '/admin/reports', permission('report.review'), async () => adminService.getPendingReports());
    this.addRoute('POST', '/admin/reports/:reportId/resolve', permission('report.review'), async ({ params, body }) => {
      await adminService.resolveReport(params.reportId, body?.action);
      return { success: true };
    });
    this.addRoute('GET', '/admin/audit-logs', permission('admin.access'), async () => adminService.getAuditLogs());

    // --------------------------------------------------------------------------
    // WEBHOOKS
    // --------------------------------------------------------------------------
    // Public by necessity — Stripe cannot present a session token. Authenticity
    // comes from the signature over the raw body instead, verified below.
    this.addRoute('POST', '/webhooks/stripe', PUBLIC, async ({ req, body }) => {
      const signature = req.headers['stripe-signature'];
      const rawBody = (req as any).rawBody as string | undefined;

      if (!config.stripeWebhookSecret) {
        // Refuse rather than accept unverifiable events: a webhook that is
        // trusted without verification is an unauthenticated write endpoint
        // into payment state.
        logger.error('Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured');
        throw new AppError({ code: 'FORBIDDEN', message: 'Webhook non configuré.' });
      }

      const verified = verifyStripeSignature({
        payload: rawBody ?? '',
        signatureHeader: Array.isArray(signature) ? signature[0] : signature,
        secret: config.stripeWebhookSecret,
      });

      if (!verified.ok) {
        logger.warn(`Stripe webhook rejected: ${verified.reason}`);
        throw new AppError({ code: 'FORBIDDEN', message: 'Signature de webhook invalide.' });
      }

      logger.info(`Stripe webhook accepted: ${body?.type || 'unknown event'}`);
      return { received: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Ownership helpers
  //
  // These live on the router rather than inside each service because the
  // services are also used by workers and jobs that legitimately act without a
  // principal. The HTTP edge is where a caller exists to be checked.
  // ---------------------------------------------------------------------------

  private async assertListingOwnership(principal: Principal, listingId: string | undefined): Promise<void> {
    if (!listingId) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Identifiant d’annonce manquant.' });
    }
    const listing = await listingsService.getListingById(listingId);
    if (!listing) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Annonce introuvable.' });
    }
    requireOwnership(principal, listing.sellerId, 'listing.moderate');
  }

  private assertOrderParticipant<T extends { buyerId: string; sellerId: string } | null>(
    principal: Principal,
    order: T
  ): T {
    if (!order) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Commande introuvable.' });
    }
    if (
      order.buyerId !== principal.userId &&
      order.sellerId !== principal.userId &&
      !hasStaffOverride(principal, 'order.refund')
    ) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Commande introuvable.' });
    }
    return order;
  }

  private assertConversationParticipant<T extends { buyerId: string; sellerId: string } | null>(
    principal: Principal,
    conversation: T
  ): T {
    if (!conversation) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Conversation introuvable.' });
    }
    // No staff override: private correspondence is not a moderation surface by
    // default. Reading a reported thread should go through a moderation case
    // that records who looked and why.
    if (conversation.buyerId !== principal.userId && conversation.sellerId !== principal.userId) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Conversation introuvable.' });
    }
    return conversation;
  }

  private async assertConversationAccess(principal: Principal, conversationId: string | undefined): Promise<void> {
    if (!conversationId) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Identifiant de conversation manquant.' });
    }
    const conversation = await messagingService.getConversationById(conversationId);
    this.assertConversationParticipant(principal, conversation);
  }

  private async assertNotificationOwnership(principal: Principal, notificationId: string): Promise<void> {
    const notification = await notificationsService.getNotificationById(notificationId);
    if (!notification) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Notification introuvable.' });
    }
    requireOwnership(principal, notification.userId);
  }

  // ---------------------------------------------------------------------------
  // Dispatch
  // ---------------------------------------------------------------------------

  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const rawUrl = req.url || '/';
    const parsedUrl = new URL(rawUrl, 'http://localhost');
    let pathname = parsedUrl.pathname;

    if (pathname.startsWith('/api/v1')) {
      pathname = pathname.substring(7) || '/';
    }

    const method = (req.method || 'GET').toUpperCase();

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = pathname.match(route.pattern);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, idx) => {
        params[name] = decodeURIComponent(match[idx + 1]);
      });

      let body: any = null;
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        body = await this.readRequestBody(req);
      }

      try {
        // Identity is resolved once per request, before the guard runs, so the
        // guard and the handler always agree on who the caller is.
        const principal = await this.resolvePrincipal(req);
        this.enforceAccess(route.access, principal);

        const result = await route.handler({
          req,
          res,
          params,
          body,
          principal,
          query: parsedUrl.searchParams,
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result ?? null));
      } catch (err: any) {
        this.writeError(res, err, method, pathname);
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: { code: 'NOT_FOUND', message: `Route ${method} ${pathname} not found`, statusCode: 404 },
      })
    );
  }

  private async resolvePrincipal(req: IncomingMessage): Promise<Principal> {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) return GUEST_PRINCIPAL;
    return authService.resolvePrincipal(token);
  }

  private enforceAccess(access: RouteAccess, principal: Principal): void {
    switch (access.kind) {
      case 'public':
        return;
      case 'authenticated':
        requireAuthenticated(principal);
        return;
      case 'permission':
        requirePermission(principal, access.permission);
        return;
    }
  }

  private writeError(res: ServerResponse, err: any, method: string, pathname: string): void {
    const isAppError = err instanceof AppError;
    const statusCode = isAppError ? err.statusCode : 500;

    if (!isAppError) {
      // Unexpected failures are logged in full but never returned: provider
      // errors and stack traces routinely carry connection strings and ids.
      logger.error(`Unhandled error on ${method} ${pathname}: ${err?.stack || err?.message || err}`);
    }

    const payload = isAppError
      ? err.toJSON()
      : { error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.', statusCode: 500 } };

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  private readRequestBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        // The exact bytes are retained for signature verification: Stripe signs
        // the raw payload, and re-serializing parsed JSON does not reproduce it.
        (req as any).rawBody = data;
        if (!data.trim()) return resolve(null);
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
  }
}

/**
 * Fields a user may change about themselves.
 *
 * An allowlist rather than a blocklist: `updateUserProfile` writes what it is
 * given, so a passthrough body would let a caller PUT their own
 * `primaryRole: 'admin'`, `status: 'active'` past a suspension, or
 * `isIdentityVerified: true`. Those transitions belong to admin and
 * verification flows.
 */
function sanitizeProfileUpdate(body: any, _principal: Principal): Record<string, unknown> {
  if (!body || typeof body !== 'object') return {};
  const allowed = ['name', 'avatarUrl', 'phone', 'city', 'postalCode', 'department', 'region', 'country', 'bio'];
  const clean: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) clean[key] = body[key];
  }
  return clean;
}

function hasStaffOverride(principal: Principal, override: Permission): boolean {
  try {
    requirePermission(principal, override);
    return true;
  } catch {
    return false;
  }
}

export const apiV1Router = new ApiV1Router();
