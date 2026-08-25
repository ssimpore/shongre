import { apiClientConfig, type DataMode } from "./api-client.config";
import { dataModeService } from "./data-mode.service";
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
  demoFinanceService,
  demoCommissionService,
  demoProviderControlPlaneService,
  demoSupportService,
  demoFeatureFlagService,
  demoModerationService,
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
  httpFinanceService,
  httpCommissionService,
  httpProviderControlPlaneService,
  httpSupportService,
  httpFeatureFlagService,
  httpModerationService,
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
  FinanceServiceContract,
  CommissionServiceContract,
  ProviderControlPlaneServiceContract,
  SupportServiceContract,
  FeatureFlagServiceContract,
  ModerationServiceContract,
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
  finance: FinanceServiceContract;
  commissions: CommissionServiceContract;
  providerControlPlane: ProviderControlPlaneServiceContract;
  support: SupportServiceContract;
  featureFlags: FeatureFlagServiceContract;
  moderation: ModerationServiceContract;
}

export function createServiceRegistry(
  mode: DataMode = dataModeService.getActiveMode(),
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
    finance: useDemo ? demoFinanceService : httpFinanceService,
    commissions: useDemo ? demoCommissionService : httpCommissionService,
    providerControlPlane: useDemo
      ? demoProviderControlPlaneService
      : httpProviderControlPlaneService,
    support: useDemo ? demoSupportService : httpSupportService,
    featureFlags: useDemo ? demoFeatureFlagService : httpFeatureFlagService,
    moderation: useDemo ? demoModerationService : httpModerationService,
  };
}

// Keep module evaluation deterministic across server and browser. A persisted
// runtime override is restored by DataModeProvider after hydration.
export const services: ServiceRegistry = createServiceRegistry(
  apiClientConfig.dataMode,
);

/** Rebinds the stable registry object before the provider tree is refreshed. */
export function activateServiceRegistry(mode: DataMode): ServiceRegistry {
  Object.assign(services, createServiceRegistry(mode));
  return services;
}
