import { apiClientConfig, DataMode } from './api-client.config.js';
import {
  demoListingsService,
  demoSearchService,
  demoAuthService,
  demoMarketsService,
  demoTaxonomyService,
  demoMessagingService,
  demoNotificationsService,
  demoOrdersService,
  demoPaymentsService,
  demoPromotionsService,
  demoVerificationService,
  demoWorkspaceService,
  demoAdminService,
  demoReviewsService,
} from '../adapters/demo/index.js';

import {
  httpListingsService,
  httpSearchService,
  httpAuthService,
  httpMarketsService,
  httpTaxonomyService,
  httpMessagingService,
  httpNotificationsService,
  httpOrdersService,
  httpPaymentsService,
  httpPromotionsService,
  httpVerificationService,
  httpWorkspaceService,
  httpAdminService,
  httpReviewsService,
} from '../adapters/http/index.js';

import {
  ListingsServiceContract,
  SearchServiceContract,
  AuthServiceContract,
  MarketsServiceContract,
  TaxonomyServiceContract,
  MessagingServiceContract,
  NotificationsServiceContract,
  OrdersServiceContract,
  PaymentsServiceContract,
  PromotionsServiceContract,
  VerificationServiceContract,
  WorkspaceServiceContract,
  AdminServiceContract,
  ReviewsServiceContract,
} from '../contracts/index.js';

export interface ServiceRegistry {
  listings: ListingsServiceContract;
  search: SearchServiceContract;
  auth: AuthServiceContract;
  markets: MarketsServiceContract;
  taxonomy: TaxonomyServiceContract;
  messaging: MessagingServiceContract;
  notifications: NotificationsServiceContract;
  orders: OrdersServiceContract;
  payments: PaymentsServiceContract;
  promotions: PromotionsServiceContract;
  verification: VerificationServiceContract;
  workspace: WorkspaceServiceContract;
  admin: AdminServiceContract;
  reviews: ReviewsServiceContract;
}

export function createServiceRegistry(mode: DataMode = apiClientConfig.dataMode): ServiceRegistry {
  const useDemo = mode === 'demo';

  return {
    listings: useDemo ? demoListingsService : httpListingsService,
    search: useDemo ? demoSearchService : httpSearchService,
    auth: useDemo ? demoAuthService : httpAuthService,
    markets: useDemo ? demoMarketsService : httpMarketsService,
    taxonomy: useDemo ? demoTaxonomyService : httpTaxonomyService,
    messaging: useDemo ? demoMessagingService : httpMessagingService,
    notifications: useDemo ? demoNotificationsService : httpNotificationsService,
    orders: useDemo ? demoOrdersService : httpOrdersService,
    payments: useDemo ? demoPaymentsService : httpPaymentsService,
    promotions: useDemo ? demoPromotionsService : httpPromotionsService,
    verification: useDemo ? demoVerificationService : httpVerificationService,
    workspace: useDemo ? demoWorkspaceService : httpWorkspaceService,
    admin: useDemo ? demoAdminService : httpAdminService,
    reviews: useDemo ? demoReviewsService : httpReviewsService,
  };
}

export const services: ServiceRegistry = createServiceRegistry();
