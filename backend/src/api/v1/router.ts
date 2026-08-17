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

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>,
  body: any
) => Promise<any>;

interface RouteDef {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class ApiV1Router {
  private routes: RouteDef[] = [];

  constructor() {
    this.registerRoutes();
  }

  private addRoute(method: string, path: string, handler: RouteHandler) {
    const paramNames: string[] = [];
    const regexPath = path.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });
    const pattern = new RegExp(`^${regexPath}$`);
    this.routes.push({ method: method.toUpperCase(), pattern, paramNames, handler });
  }

  private registerRoutes() {
    // --------------------------------------------------------------------------
    // AUTH ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/auth/me', async () => authService.getCurrentUser());
    this.addRoute('POST', '/auth/login', async (_req, _res, _params, body) => authService.login(body));
    this.addRoute('POST', '/auth/register', async (_req, _res, _params, body) => authService.register(body));
    this.addRoute('POST', '/auth/logout', async () => {
      await authService.logout();
      return { success: true };
    });
    this.addRoute('POST', '/auth/switch-role', async (_req, _res, _params, body) => authService.switchRole(body?.role));
    this.addRoute('POST', '/auth/verify-phone', async (_req, _res, _params, body) => {
      const verified = await authService.verifyPhone(body?.phone, body?.code);
      return { verified };
    });
    this.addRoute('POST', '/auth/verify-email', async (_req, _res, _params, body) => {
      const verified = await authService.verifyEmail(body?.token);
      return { verified };
    });

    // --------------------------------------------------------------------------
    // USERS ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/users/:id', async (_req, _res, params) => usersService.getUserById(params.id));
    this.addRoute('PUT', '/users/:id', async (_req, _res, params, body) => usersService.updateUserProfile(params.id, body));

    // --------------------------------------------------------------------------
    // LISTINGS & SEARCH ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/listings', async (req) => {
      const url = new URL(req.url || '/', 'http://localhost');
      const params = Object.fromEntries(url.searchParams.entries());
      return listingsService.getListings(params as any);
    });
    this.addRoute('GET', '/listings/:id', async (_req, _res, params) => listingsService.getListingById(params.id));
    this.addRoute('POST', '/listings/search', async (_req, _res, _params, body) => listingsService.searchListings(body || {}));
    this.addRoute('POST', '/listings/drafts', async (_req, _res, _params, body) => listingsService.createListingDraft(body?.userId));
    this.addRoute('PUT', '/listings/drafts/:userId', async (_req, _res, params, body) => {
      await listingsService.saveListingDraft(body, params.userId);
      return { success: true };
    });
    this.addRoute('POST', '/listings/publish', async (_req, _res, _params, body) => {
      return listingsService.publishListing(body.draft, body.sellerId);
    });
    this.addRoute('PUT', '/listings/:id', async (_req, _res, params, body) => listingsService.updateListing(params.id, body));
    this.addRoute('DELETE', '/listings/:id', async (_req, _res, params) => {
      const success = await listingsService.deleteListing(params.id);
      return { success };
    });
    this.addRoute('POST', '/listings/:id/favorite', async (_req, _res, params) => {
      const isFavorite = await listingsService.toggleFavorite(params.id);
      return { isFavorite };
    });
    this.addRoute('GET', '/favorites', async () => {
      const listingIds = await listingsService.getFavorites();
      return { listingIds };
    });

    // --------------------------------------------------------------------------
    // TAXONOMY ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/taxonomy/root', async () => taxonomyService.getRootCategories());
    this.addRoute('GET', '/taxonomy/nodes/:id', async (_req, _res, params) => taxonomyService.getNodeById(params.id));
    this.addRoute('GET', '/taxonomy/slug/:slug', async (_req, _res, params) => taxonomyService.getNodeBySlug(params.slug));
    this.addRoute('GET', '/taxonomy/:id/children', async (_req, _res, params) => taxonomyService.getChildren(params.id));
    this.addRoute('GET', '/taxonomy/:id/attributes', async (_req, _res, params) => taxonomyService.getAttributesForCategory(params.id));
    this.addRoute('GET', '/taxonomy/search-filters', async (req) => {
      const url = new URL(req.url || '/', 'http://localhost');
      const nodeId = url.searchParams.get('nodeId') || undefined;
      return taxonomyService.resolveSearchFilters(nodeId);
    });

    // --------------------------------------------------------------------------
    // MARKETS ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/markets', async () => marketsService.getAllMarkets());
    this.addRoute('GET', '/markets/active', async () => marketsService.getActiveMarket());
    this.addRoute('POST', '/markets/active', async (_req, _res, _params, body) => marketsService.setActiveMarket(body?.code));
    this.addRoute('GET', '/markets/:code', async (_req, _res, params) => marketsService.getMarketByCode(params.code));
    this.addRoute('GET', '/markets/effective/:code', async (_req, _res, params) => marketsService.getEffectiveMarketConfig(params.code));

    // --------------------------------------------------------------------------
    // ORDERS & ESCROW ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/orders/:id', async (_req, _res, params) => ordersService.getOrderById(params.id));
    this.addRoute('GET', '/orders/purchases/:userId', async (_req, _res, params) => ordersService.getPurchases(params.userId));
    this.addRoute('GET', '/orders/sales/:userId', async (_req, _res, params) => ordersService.getSales(params.userId));
    this.addRoute('POST', '/orders/direct-purchase', async (_req, _res, _params, body) => ordersService.createDirectPurchase(body));
    this.addRoute('POST', '/orders/reservation', async (_req, _res, _params, body) => ordersService.createReservation(body));
    this.addRoute('POST', '/orders/:id/confirm-pin', async (_req, _res, params, body) => ordersService.confirmHandoverPIN(params.id, body?.pin));
    this.addRoute('POST', '/orders/:id/confirm-delivery', async (_req, _res, params) => ordersService.confirmDeliveryReceived(params.id));
    this.addRoute('POST', '/orders/:id/dispute', async (_req, _res, params, body) => ordersService.openDispute(params.id, body?.reason, body?.details));

    // --------------------------------------------------------------------------
    // PAYMENTS ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('POST', '/payments/intent', async (_req, _res, _params, body) => paymentsService.createPaymentIntent(body?.amount, body?.currency, body?.metadata));
    this.addRoute('POST', '/payments/payout', async (_req, _res, _params, body) => paymentsService.requestSellerPayout(body?.sellerId, body?.amount, body?.iban));
    this.addRoute('GET', '/payments/balance/:sellerId', async (_req, _res, params) => paymentsService.getSellerBalance(params.sellerId));

    // --------------------------------------------------------------------------
    // PROMOTIONS & MONETIZATION ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/promotions/boosts', async (req) => {
      const url = new URL(req.url || '/', 'http://localhost');
      const listingId = url.searchParams.get('listingId') || undefined;
      return monetizationService.getAvailableBoosts(listingId);
    });
    this.addRoute('GET', '/promotions/pro-plans', async () => monetizationService.getProSubscriptionPlans());
    this.addRoute('POST', '/promotions/apply-boost', async (_req, _res, _params, body) => monetizationService.applyBoost(body?.listingId, body?.boostId, body?.paymentMethod));
    this.addRoute('POST', '/promotions/subscribe-pro', async (_req, _res, _params, body) => monetizationService.subscribeToProPlan(body?.sellerId, body?.planId));

    // --------------------------------------------------------------------------
    // VERIFICATION & KYC/KYB ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/verification/status/:userId', async (_req, _res, params) => verificationService.getUserVerificationStatus(params.userId));
    this.addRoute('POST', '/verification/identity', async (_req, _res, _params, body) => verificationService.submitIdentityDocument(body?.userId, body?.docType, body?.fileUrl));
    this.addRoute('GET', '/verification/siret-lookup/:siret', async (_req, _res, params) => verificationService.lookupCompanyBySiret(params.siret));
    this.addRoute('POST', '/verification/business-registration', async (_req, _res, _params, body) => verificationService.submitBusinessRegistration(body?.userId, body?.siret, body?.representativeName));
    this.addRoute('POST', '/verification/bank-coordinates', async (_req, _res, _params, body) => verificationService.submitBankPayoutCoordinates(body?.userId, body?.iban, body?.bic, body?.holderName));

    // --------------------------------------------------------------------------
    // MESSAGING ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/messaging/conversations/:userId', async (_req, _res, params) => messagingService.getUserConversations(params.userId));
    this.addRoute('GET', '/messaging/conversations/detail/:id', async (_req, _res, params) => messagingService.getConversationById(params.id));
    this.addRoute('POST', '/messaging/send', async (_req, _res, _params, body) => messagingService.sendMessage(body));
    this.addRoute('POST', '/messaging/offer', async (_req, _res, _params, body) => messagingService.makeOffer(body?.conversationId, body?.senderId, body?.senderName, body?.amount));
    this.addRoute('POST', '/messaging/offer-response', async (_req, _res, _params, body) => messagingService.respondToOffer(body?.conversationId, body?.userId, body?.userName, body?.accept));
    this.addRoute('POST', '/messaging/schedule-pickup', async (_req, _res, _params, body) => messagingService.schedulePickup(body?.conversationId, body?.date, body?.timeSlot, body?.address));
    this.addRoute('POST', '/messaging/read', async (_req, _res, _params, body) => {
      await messagingService.markAsRead(body?.conversationId, body?.userId);
      return { success: true };
    });
    this.addRoute('POST', '/messaging/block', async (_req, _res, _params, body) => {
      await messagingService.blockUser(body?.userId, body?.targetUserId);
      return { success: true };
    });

    // --------------------------------------------------------------------------
    // NOTIFICATIONS ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/notifications/:userId', async (_req, _res, params) => notificationsService.getUserNotifications(params.userId));
    this.addRoute('GET', '/notifications/unread-count/:userId', async (_req, _res, params) => {
      const count = await notificationsService.getUnreadCount(params.userId);
      return { count };
    });
    this.addRoute('POST', '/notifications/:id/read', async (_req, _res, params) => {
      await notificationsService.markAsRead(params.id);
      return { success: true };
    });
    this.addRoute('POST', '/notifications/:userId/read-all', async (_req, _res, params) => {
      await notificationsService.markAllAsRead(params.userId);
      return { success: true };
    });
    this.addRoute('DELETE', '/notifications/:id', async (_req, _res, params) => {
      await notificationsService.deleteNotification(params.id);
      return { success: true };
    });

    // --------------------------------------------------------------------------
    // REVIEWS ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/reviews/user/:userId', async (_req, _res, params) => reviewsService.getUserReviews(params.userId));
    this.addRoute('POST', '/reviews/submit', async (_req, _res, _params, body) => reviewsService.submitReview(body));

    // --------------------------------------------------------------------------
    // WORKSPACE & SELLER DASHBOARD ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/workspace/summary/:userId', async (_req, _res, params) => workspaceService.getUserWorkspaceSummary(params.userId));
    this.addRoute('GET', '/workspace/pro-analytics/:sellerId', async (_req, _res, params) => workspaceService.getProAnalytics(params.sellerId));

    // --------------------------------------------------------------------------
    // ADMIN ROUTES
    // --------------------------------------------------------------------------
    this.addRoute('GET', '/admin/stats', async () => adminService.getPlatformStats());
    this.addRoute('GET', '/admin/users', async () => adminService.getAllUsers());
    this.addRoute('PUT', '/admin/users/:userId/status', async (_req, _res, params, body) => adminService.updateUserStatus(params.userId, body?.status));
    this.addRoute('GET', '/admin/reports', async () => adminService.getPendingReports());
    this.addRoute('POST', '/admin/reports/:reportId/resolve', async (_req, _res, params, body) => {
      await adminService.resolveReport(params.reportId, body?.action);
      return { success: true };
    });
    this.addRoute('GET', '/admin/audit-logs', async () => adminService.getAuditLogs());

    // --------------------------------------------------------------------------
    // WEBHOOKS
    // --------------------------------------------------------------------------
    this.addRoute('POST', '/webhooks/stripe', async (_req, _res, _params, body) => {
      logger.info('Stripe webhook received on backend endpoint');
      return { received: true };
    });
  }

  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const rawUrl = req.url || '/';
    const parsedUrl = new URL(rawUrl, 'http://localhost');
    let pathname = parsedUrl.pathname;

    // Strip prefix like /api/v1
    if (pathname.startsWith('/api/v1')) {
      pathname = pathname.substring(7) || '/';
    }

    const method = (req.method || 'GET').toUpperCase();

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, idx) => {
          params[name] = decodeURIComponent(match[idx + 1]);
        });

        let body: any = null;
        if (['POST', 'PUT', 'PATCH'].includes(method)) {
          body = await this.readRequestBody(req);
        }

        try {
          const result = await route.handler(req, res, params, body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result ?? null));
        } catch (err: any) {
          const statusCode = err instanceof AppError ? err.statusCode : 500;
          const json = err instanceof AppError ? err.toJSON() : { error: { code: 'INTERNAL_ERROR', message: err.message, statusCode: 500 } };
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(json));
        }
        return;
      }
    }

    // Route not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: `Route ${method} ${pathname} not found`, statusCode: 404 } }));
  }

  private readRequestBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
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

export const apiV1Router = new ApiV1Router();
