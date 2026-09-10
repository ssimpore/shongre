import type { AdminServiceContract } from "../contracts/admin.contract";
import type { AnalyticsServiceContract } from "../contracts/analytics.contract";
import type { AiServiceContract } from "../contracts/ai.contract";
import type { AuthServiceContract } from "../contracts/auth.contract";
import type { AutoServiceContract } from "../contracts/auto.contract";
import type { BusinessRulesServiceContract } from "../contracts/business-rules.contract";
import type { CommissionServiceContract } from "../contracts/commission.contract";
import type { CoursesServiceContract } from "../contracts/courses.contract";
import type { CurrenciesServiceContract } from "../contracts/currencies.contract";
import type { CrmProspectingServiceContract } from "../contracts/crm-prospecting.contract";
import type { CrmServiceContract } from "../contracts/crm.contract";
import type { EmploymentServiceContract } from "../contracts/employment.contract";
import type { DeliveryServiceContract } from "../contracts/delivery.contract";
import type { DigitalProductsServiceContract } from "../contracts/digital-products.contract";
import type { FeatureFlagServiceContract } from "../contracts/feature-flags.contract";
import type { HomepageServiceContract } from "../contracts/homepage.contract";
import type { FinanceServiceContract } from "../contracts/finance.contract";
import type { GeoServiceContract } from "../contracts/geo.contract";
import type { InvoicingServiceContract } from "../contracts/invoicing.contract";
import type { SolutionsServiceContract } from "../contracts/solutions.contract";
import type { ListingsServiceContract } from "../contracts/listings.contract";
import type { MarketingServiceContract } from "../contracts/marketing.contract";
import type { MarketsServiceContract } from "../contracts/markets.contract";
import type { MessagingServiceContract } from "../contracts/messaging.contract";
import type { ModerationServiceContract } from "../contracts/moderation.contract";
import type { NotificationsServiceContract } from "../contracts/notifications.contract";
import type { WatchSubscriptionsServiceContract } from "../contracts/watch-subscriptions.contract";
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
import type { UsersServiceContract } from "../contracts/users.contract";

export interface ServiceRegistry {
  listings: ListingsServiceContract;
  homepage: HomepageServiceContract;
  search: SearchServiceContract;
  auth: AuthServiceContract;
  markets: MarketsServiceContract;
  geo: GeoServiceContract;
  taxonomy: TaxonomyServiceContract;
  messaging: MessagingServiceContract;
  notifications: NotificationsServiceContract;
  watchSubscriptions: WatchSubscriptionsServiceContract;
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
  currencies: CurrenciesServiceContract;
  auto: AutoServiceContract;
  realEstate: RealEstateServiceContract;
  employment: EmploymentServiceContract;
  delivery: DeliveryServiceContract;
  digitalProducts: DigitalProductsServiceContract;
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
  invoicing: InvoicingServiceContract;
  solutions: SolutionsServiceContract;
  users: UsersServiceContract;
}

type ServiceLoaders = {
  [Key in keyof ServiceRegistry]: () => Promise<ServiceRegistry[Key]>;
};

const httpServiceLoaders: ServiceLoaders = {
  listings: () =>
    import("../adapters/http/http-listings.service").then(
      ({ httpListingsService }) => httpListingsService,
    ),
  homepage: () =>
    import("../adapters/http/http-homepage.service").then(
      ({ httpHomepageService }) => httpHomepageService,
    ),
  search: () =>
    import("../adapters/http/http-search.service").then(
      ({ httpSearchService }) => httpSearchService,
    ),
  auth: () =>
    import("../adapters/http/http-auth.service").then(
      ({ httpAuthService }) => httpAuthService,
    ),
  markets: () =>
    import("../adapters/http/http-markets.service").then(
      ({ httpMarketsService }) => httpMarketsService,
    ),
  geo: () =>
    import("../adapters/http/http-geo.service").then(
      (module) => new module.HttpGeoService(),
    ),
  taxonomy: () =>
    import("../adapters/http/http-taxonomy.service").then(
      ({ httpTaxonomyService }) => httpTaxonomyService,
    ),
  messaging: () =>
    import("../adapters/http/http-messaging.service").then(
      ({ httpMessagingService }) => httpMessagingService,
    ),
  notifications: () =>
    import("../adapters/http/http-notifications.service").then(
      ({ httpNotificationsService }) => httpNotificationsService,
    ),
  watchSubscriptions: () =>
    import("../adapters/http/http-watch-subscriptions.service").then(
      ({ httpWatchSubscriptionsService }) => httpWatchSubscriptionsService,
    ),
  orders: () =>
    import("../adapters/http/http-orders.service").then(
      ({ httpOrdersService }) => httpOrdersService,
    ),
  payments: () =>
    import("../adapters/http/http-payments.service").then(
      ({ httpPaymentsService }) => httpPaymentsService,
    ),
  promotions: () =>
    import("../adapters/http/http-promotions.service").then(
      ({ httpPromotionsService }) => httpPromotionsService,
    ),
  verification: () =>
    import("../adapters/http/http-verification.service").then(
      ({ httpVerificationService }) => httpVerificationService,
    ),
  workspace: () =>
    import("../adapters/http/http-workspace.service").then(
      ({ httpWorkspaceService }) => httpWorkspaceService,
    ),
  admin: () =>
    import("../adapters/http/http-admin.service").then(
      ({ httpAdminService }) => httpAdminService,
    ),
  reviews: () =>
    import("../adapters/http/http-reviews.service").then(
      ({ httpReviewsService }) => httpReviewsService,
    ),
  ai: () =>
    import("../adapters/http/http-ai.service").then(
      ({ httpAiService }) => httpAiService,
    ),
  trending: () =>
    import("../adapters/http/http-trending.service").then(
      ({ httpTrendingService }) => httpTrendingService,
    ),
  courses: () =>
    import("../adapters/http/http-courses.service").then(
      ({ httpCoursesService }) => httpCoursesService,
    ),
  currencies: () =>
    import("../adapters/http/http-currencies.service").then(
      ({ httpCurrenciesService }) => httpCurrenciesService,
    ),
  auto: () =>
    import("../adapters/http/http-auto.service").then(
      ({ httpAutoService }) => httpAutoService,
    ),
  realEstate: () =>
    import("../adapters/http/http-real-estate.service").then(
      ({ httpRealEstateService }) => httpRealEstateService,
    ),
  employment: () =>
    import("../adapters/http/http-employment.service").then(
      ({ httpEmploymentService }) => httpEmploymentService,
    ),
  delivery: () =>
    import("../adapters/http/http-delivery.service").then(
      ({ httpDeliveryService }) => httpDeliveryService,
    ),
  digitalProducts: () =>
    import("../adapters/http/http-digital-products.service").then(
      ({ httpDigitalProductsService }) => httpDigitalProductsService,
    ),
  businessRules: () =>
    import("../adapters/http/http-business-rules.service").then(
      ({ httpBusinessRulesService }) => httpBusinessRulesService,
    ),
  finance: () =>
    import("../adapters/http/http-finance.service").then(
      ({ httpFinanceService }) => httpFinanceService,
    ),
  commissions: () =>
    import("../adapters/http/http-commission.service").then(
      ({ httpCommissionService }) => httpCommissionService,
    ),
  providerControlPlane: () =>
    import("../adapters/http/http-provider-control-plane.service").then(
      ({ httpProviderControlPlaneService }) => httpProviderControlPlaneService,
    ),
  support: () =>
    import("../adapters/http/http-support.service").then(
      ({ httpSupportService }) => httpSupportService,
    ),
  featureFlags: () =>
    import("../adapters/http/http-feature-flag.service").then(
      ({ httpFeatureFlagService }) => httpFeatureFlagService,
    ),
  moderation: () =>
    import("../adapters/http/http-moderation.service").then(
      ({ httpModerationService }) => httpModerationService,
    ),
  crm: () =>
    import("../adapters/http/http-crm.service").then(
      ({ httpCrmService }) => httpCrmService,
    ),
  crmProspecting: () =>
    import("../adapters/http/http-crm-prospecting.service").then(
      ({ httpCrmProspectingService }) => httpCrmProspectingService,
    ),
  marketing: () =>
    import("../adapters/http/http-marketing.service").then(
      ({ httpMarketingService }) => httpMarketingService,
    ),
  analytics: () =>
    import("../adapters/http/http-analytics.service").then(
      ({ httpAnalyticsService }) => httpAnalyticsService,
    ),
  invoicing: () =>
    import("../adapters/http/http-invoicing.service").then(
      ({ httpInvoicingService }) => httpInvoicingService,
    ),
  solutions: () =>
    import("../adapters/http/http-solutions.service").then(
      ({ httpSolutionsService }) => httpSolutionsService,
    ),
  users: () =>
    import("../adapters/http/http-users.service").then(
      ({ httpUsersService }) => httpUsersService,
    ),
};

/**
 * Defers adapter code until a domain is actually used.
 *
 * Every service contract is Promise-based, so the proxy can preserve the
 * public method signatures while keeping unrelated domain adapters out of the
 * initial route bundle. The resolved singleton is cached
 * per domain, and methods retain their original receiver for class state.
 */
function createLazyService<Service extends object>(
  load: () => Promise<Service>,
  absentMethods: ReadonlySet<PropertyKey> = new Set(),
): Service {
  let servicePromise: Promise<Service> | undefined;
  const methodCache = new Map<
    PropertyKey,
    (...args: unknown[]) => Promise<unknown>
  >();

  const resolveService = () => (servicePromise ??= load());

  return new Proxy({} as Service, {
    get(_target, property) {
      // A `then` property would make the proxy itself Promise-like.
      if (property === "then" || absentMethods.has(property)) return undefined;

      const cached = methodCache.get(property);
      if (cached) return cached;

      const method = async (...args: unknown[]) => {
        const service = await resolveService();
        const implementation = Reflect.get(service, property);
        if (typeof implementation !== "function") {
          throw new TypeError(`Unknown service method: ${String(property)}`);
        }
        return Reflect.apply(implementation, service, args);
      };
      methodCache.set(property, method);
      return method;
    },
    has(_target, property) {
      return !absentMethods.has(property);
    },
  });
}

export function createServiceRegistry(): ServiceRegistry {
  return Object.fromEntries(
    (Object.keys(httpServiceLoaders) as Array<keyof ServiceRegistry>).map(
      (key) => [
        key,
        createLazyService(
          () =>
            httpServiceLoaders[key]() as Promise<
              ServiceRegistry[keyof ServiceRegistry]
            >,
        ),
      ],
    ),
  ) as unknown as ServiceRegistry;
}

export const services: ServiceRegistry = createServiceRegistry();
