import { apiClientConfig, type DataMode } from "./api-client.config";
import { dataModeService } from "./data-mode.service";
import { demoAdminService } from "../adapters/demo/demo-admin.service";
import { demoAnalyticsService } from "../adapters/demo/demo-analytics.service";
import { demoAiService } from "../adapters/demo/demo-ai.service";
import { demoAuthService } from "../adapters/demo/demo-auth.service";
import { demoAutoService } from "../adapters/demo/demo-auto.service";
import { demoBusinessRulesService } from "../adapters/demo/demo-business-rules.service";
import { demoCommissionService } from "../adapters/demo/demo-commission.service";
import { demoCoursesService } from "../adapters/demo/demo-courses.service";
import { demoCrmService } from "../adapters/demo/demo-crm.service";
import { demoEmploymentService } from "../adapters/demo/demo-employment.service";
import { demoFeatureFlagService } from "../adapters/demo/demo-feature-flag.service";
import { demoFinanceService } from "../adapters/demo/demo-finance.service";
import { demoListingsService } from "../adapters/demo/demo-listings.service";
import { demoMarketingService } from "../adapters/demo/demo-marketing.service";
import { demoMarketsService } from "../adapters/demo/demo-markets.service";
import { demoMessagingService } from "../adapters/demo/demo-messaging.service";
import { demoModerationService } from "../adapters/demo/demo-moderation.service";
import { demoNotificationsService } from "../adapters/demo/demo-notifications.service";
import { demoOrdersService } from "../adapters/demo/demo-orders.service";
import { demoPaymentsService } from "../adapters/demo/demo-payments.service";
import { demoPromotionsService } from "../adapters/demo/demo-promotions.service";
import { demoProviderControlPlaneService } from "../adapters/demo/demo-provider-control-plane.service";
import { demoRealEstateService } from "../adapters/demo/demo-real-estate.service";
import { demoReviewsService } from "../adapters/demo/demo-reviews.service";
import { demoSearchService } from "../adapters/demo/demo-search.service";
import { demoSupportService } from "../adapters/demo/demo-support.service";
import { demoTaxonomyService } from "../adapters/demo/demo-taxonomy.service";
import { demoTrendingService } from "../adapters/demo/demo-trending.service";
import { demoVerificationService } from "../adapters/demo/demo-verification.service";
import { demoWorkspaceService } from "../adapters/demo/demo-workspace.service";
import { httpAdminService } from "../adapters/http/http-admin.service";
import { httpAnalyticsService } from "../adapters/http/http-analytics.service";
import { httpAiService } from "../adapters/http/http-ai.service";
import { httpAuthService } from "../adapters/http/http-auth.service";
import { httpAutoService } from "../adapters/http/http-auto.service";
import { httpBusinessRulesService } from "../adapters/http/http-business-rules.service";
import { httpCommissionService } from "../adapters/http/http-commission.service";
import { httpCoursesService } from "../adapters/http/http-courses.service";
import { httpCrmProspectingService } from "../adapters/http/http-crm-prospecting.service";
import { httpCrmService } from "../adapters/http/http-crm.service";
import { httpEmploymentService } from "../adapters/http/http-employment.service";
import { httpFeatureFlagService } from "../adapters/http/http-feature-flag.service";
import { httpFinanceService } from "../adapters/http/http-finance.service";
import { httpListingsService } from "../adapters/http/http-listings.service";
import { httpMarketingService } from "../adapters/http/http-marketing.service";
import { httpMarketsService } from "../adapters/http/http-markets.service";
import { httpMessagingService } from "../adapters/http/http-messaging.service";
import { httpModerationService } from "../adapters/http/http-moderation.service";
import { httpNotificationsService } from "../adapters/http/http-notifications.service";
import { httpOrdersService } from "../adapters/http/http-orders.service";
import { httpPaymentsService } from "../adapters/http/http-payments.service";
import { httpPromotionsService } from "../adapters/http/http-promotions.service";
import { httpProviderControlPlaneService } from "../adapters/http/http-provider-control-plane.service";
import { httpRealEstateService } from "../adapters/http/http-real-estate.service";
import { httpReviewsService } from "../adapters/http/http-reviews.service";
import { httpSearchService } from "../adapters/http/http-search.service";
import { httpSupportService } from "../adapters/http/http-support.service";
import { httpTaxonomyService } from "../adapters/http/http-taxonomy.service";
import { httpTrendingService } from "../adapters/http/http-trending.service";
import { httpVerificationService } from "../adapters/http/http-verification.service";
import { httpWorkspaceService } from "../adapters/http/http-workspace.service";
import { demoCrmProspectingService } from "../../services/prospect-research.service";
import type { AdminServiceContract } from "../contracts/admin.contract";
import type { AnalyticsServiceContract } from "../contracts/analytics.contract";
import type { AiServiceContract } from "../contracts/ai.contract";
import type { AuthServiceContract } from "../contracts/auth.contract";
import type { AutoServiceContract } from "../contracts/auto.contract";
import type { BusinessRulesServiceContract } from "../contracts/business-rules.contract";
import type { CommissionServiceContract } from "../contracts/commission.contract";
import type { CoursesServiceContract } from "../contracts/courses.contract";
import type { CrmProspectingServiceContract } from "../contracts/crm-prospecting.contract";
import type { CrmServiceContract } from "../contracts/crm.contract";
import type { EmploymentServiceContract } from "../contracts/employment.contract";
import type { FeatureFlagServiceContract } from "../contracts/feature-flags.contract";
import type { FinanceServiceContract } from "../contracts/finance.contract";
import type { ListingsServiceContract } from "../contracts/listings.contract";
import type { MarketingServiceContract } from "../contracts/marketing.contract";
import type { MarketsServiceContract } from "../contracts/markets.contract";
import type { MessagingServiceContract } from "../contracts/messaging.contract";
import type { ModerationServiceContract } from "../contracts/moderation.contract";
import type { NotificationsServiceContract } from "../contracts/notifications.contract";
import type { OrdersServiceContract } from "../contracts/orders.contract";
import type { PaymentsServiceContract } from "../contracts/payments.contract";
import type { PromotionsServiceContract } from "../contracts/promotions.contract";
import type { ProviderControlPlaneServiceContract } from "../contracts/provider-control-plane.contract";
import type { RealEstateServiceContract } from "../contracts/real-estate.contract";
import type { ReviewsServiceContract } from "../contracts/reviews.contract";
import type { SearchServiceContract } from "../contracts/search.contract";
import type { SupportServiceContract } from "../contracts/support.contract";
import type { TaxonomyServiceContract } from "../contracts/taxonomy.contract";
import type { TrendingServiceContract } from "../contracts/trending.contract";
import type { VerificationServiceContract } from "../contracts/verification.contract";
import type { WorkspaceServiceContract } from "../contracts/workspace.contract";

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
  crm: CrmServiceContract;
  crmProspecting: CrmProspectingServiceContract;
  marketing: MarketingServiceContract;
  analytics: AnalyticsServiceContract;
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
    crm: useDemo ? demoCrmService : httpCrmService,
    crmProspecting: useDemo
      ? demoCrmProspectingService
      : httpCrmProspectingService,
    marketing: useDemo ? demoMarketingService : httpMarketingService,
    analytics: useDemo ? demoAnalyticsService : httpAnalyticsService,
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
