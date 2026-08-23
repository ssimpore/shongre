import { apiClientConfig, DataMode } from "./api-client.config";
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
  demoAiService,
  demoTrendingService,
  demoCoursesService,
  demoAutoService,
  demoRealEstateService,
  demoEmploymentService,
  demoBusinessRulesService,
} from "../adapters/demo";

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
  httpAiService,
  httpTrendingService,
  httpCoursesService,
  httpAutoService,
  httpRealEstateService,
  httpEmploymentService,
  httpBusinessRulesService,
} from "../adapters/http";

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
  AiServiceContract,
  TrendingServiceContract,
  CoursesServiceContract,
  AutoServiceContract,
  RealEstateServiceContract,
  EmploymentServiceContract,
  BusinessRulesServiceContract,
} from "../contracts";

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
  ai: AiServiceContract;
  trending: TrendingServiceContract;
  courses: CoursesServiceContract;
  auto: AutoServiceContract;
  realEstate: RealEstateServiceContract;
  employment: EmploymentServiceContract;
  businessRules: BusinessRulesServiceContract;
}

export function createServiceRegistry(
  mode: DataMode = apiClientConfig.dataMode,
): ServiceRegistry {
  const useDemo = mode === "demo";

  return {
    listings: useDemo ? demoListingsService : httpListingsService,
    search: useDemo ? demoSearchService : httpSearchService,
    auth: useDemo ? demoAuthService : httpAuthService,
    markets: useDemo ? demoMarketsService : httpMarketsService,
    taxonomy: useDemo ? demoTaxonomyService : httpTaxonomyService,
    messaging: useDemo ? demoMessagingService : httpMessagingService,
    notifications: useDemo
      ? demoNotificationsService
      : httpNotificationsService,
    orders: useDemo ? demoOrdersService : httpOrdersService,
    payments: useDemo ? demoPaymentsService : httpPaymentsService,
    promotions: useDemo ? demoPromotionsService : httpPromotionsService,
    verification: useDemo ? demoVerificationService : httpVerificationService,
    workspace: useDemo ? demoWorkspaceService : httpWorkspaceService,
    admin: useDemo ? demoAdminService : httpAdminService,
    reviews: useDemo ? demoReviewsService : httpReviewsService,
    ai: useDemo ? demoAiService : httpAiService,
    trending: useDemo ? demoTrendingService : httpTrendingService,
    courses: useDemo ? demoCoursesService : httpCoursesService,
    auto: useDemo ? demoAutoService : httpAutoService,
    realEstate: useDemo ? demoRealEstateService : httpRealEstateService,
    employment: useDemo ? demoEmploymentService : httpEmploymentService,
    businessRules: useDemo
      ? demoBusinessRulesService
      : httpBusinessRulesService,
  };
}

export const services: ServiceRegistry = createServiceRegistry();
