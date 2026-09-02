import { BackendDataMode, config } from "../../../app/config/index.js";
import {
  IUserRepository,
  DemoUserRepository,
  PostgresUserRepository,
} from "./user.repository.js";
import {
  IListingRepository,
  DemoListingRepository,
  PostgresListingRepository,
} from "./listing.repository.js";
import {
  IMarketRepository,
  DemoMarketRepository,
  PostgresMarketRepository,
} from "./market.repository.js";
import {
  ITaxonomyRepository,
  DemoTaxonomyRepository,
  PostgresTaxonomyRepository,
} from "./taxonomy.repository.js";
import {
  IOrderRepository,
  DemoOrderRepository,
  PostgresOrderRepository,
} from "./order.repository.js";
import {
  IVerificationRepository,
  DemoVerificationRepository,
  PostgresVerificationRepository,
} from "./verification.repository.js";
import {
  IComplianceRepository,
  DemoComplianceRepository,
  PostgresComplianceRepository,
} from "./compliance.repository.js";
import {
  IMessagingRepository,
  DemoMessagingRepository,
  PostgresMessagingRepository,
} from "./messaging.repository.js";
import {
  INotificationRepository,
  DemoNotificationRepository,
  PostgresNotificationRepository,
} from "./notification.repository.js";
import {
  IReviewRepository,
  DemoReviewRepository,
  PostgresReviewRepository,
} from "./review.repository.js";
import {
  IAdminRepository,
  DemoAdminRepository,
  PostgresAdminRepository,
} from "./admin.repository.js";
import {
  IWorkspaceRepository,
  DemoWorkspaceRepository,
  PostgresWorkspaceRepository,
} from "./workspace.repository.js";
import {
  ITrendingRepository,
  DemoTrendingRepository,
  PostgresTrendingRepository,
} from "./trending.repository.js";
import {
  IHomepageRepository,
  DemoHomepageRepository,
  PostgresHomepageRepository,
} from "./homepage.repository.js";
import {
  ICoursesRepository,
  DemoCoursesRepository,
  PostgresCoursesRepository,
} from "./courses.repository.js";
import {
  IAutoRepository,
  DemoAutoRepository,
  PostgresAutoRepository,
} from "./auto.repository.js";
import {
  IRealEstateRepository,
  DemoRealEstateRepository,
  PostgresRealEstateRepository,
} from "./real-estate.repository.js";
import {
  EmploymentRepository,
  DemoEmploymentRepository,
  PostgresEmploymentRepository,
} from "./employment.repository.js";
import {
  IPublisherRepository,
  DemoPublisherRepository,
  PostgresPublisherRepository,
} from "./publisher.repository.js";
import {
  IDiscoveryConfigurationRepository,
  DemoDiscoveryConfigurationRepository,
  PostgresDiscoveryConfigurationRepository,
} from "./discovery-configuration.repository.js";
import { logger } from "../../logging/logger.js";
import {
  ISupportRepository,
  DemoSupportRepository,
  PostgresSupportRepository,
} from "./support.repository.js";
import {
  IFeatureFlagRepository,
  DemoFeatureFlagRepository,
  PostgresFeatureFlagRepository,
} from "./feature-flag.repository.js";
import {
  ISolutionsRepository,
  DemoSolutionsRepository,
  PostgresSolutionsRepository,
} from "./solutions.repository.js";
import {
  IModerationRepository,
  DemoModerationRepository,
  PostgresModerationRepository,
} from "./moderation.repository.js";
import {
  ICrmRepository,
  DemoCrmRepository,
  PostgresCrmRepository,
} from "./crm.repository.js";
import {
  ICrmShongreIntegrationRepository,
  DemoCrmShongreIntegrationRepository,
  PostgresCrmShongreIntegrationRepository,
} from "./crm-shongre-integration.repository.js";
import {
  IMarketingRepository,
  DemoMarketingRepository,
  PostgresMarketingRepository,
} from "./marketing.repository.js";
import {
  IProspectingRepository,
  DemoProspectingRepository,
  PostgresProspectingRepository,
} from "./prospecting.repository.js";
import {
  ICurrencyRepository,
  DemoCurrencyRepository,
  PostgresCurrencyRepository,
} from "./currency.repository.js";

export interface RepositoryContainer {
  users: IUserRepository;
  listings: IListingRepository;
  markets: IMarketRepository;
  currencies: ICurrencyRepository;
  taxonomy: ITaxonomyRepository;
  orders: IOrderRepository;
  verification: IVerificationRepository;
  compliance: IComplianceRepository;
  messaging: IMessagingRepository;
  notifications: INotificationRepository;
  reviews: IReviewRepository;
  admin: IAdminRepository;
  workspace: IWorkspaceRepository;
  trending: ITrendingRepository;
  homepage: IHomepageRepository;
  courses: ICoursesRepository;
  auto: IAutoRepository;
  realEstate: IRealEstateRepository;
  employment: EmploymentRepository;
  publishers: IPublisherRepository;
  discoveryConfiguration: IDiscoveryConfigurationRepository;
  support: ISupportRepository;
  featureFlags: IFeatureFlagRepository;
  solutions: ISolutionsRepository;
  moderation: IModerationRepository;
  crm: ICrmRepository;
  crmShongre: ICrmShongreIntegrationRepository;
  marketing: IMarketingRepository;
  prospecting: IProspectingRepository;
}

export function createRepositoryContainer(
  mode: BackendDataMode = config.dataMode,
): RepositoryContainer {
  logger.info(
    `Initializing Repository Container in [${mode.toUpperCase()}] mode`,
  );

  if (mode === "database") {
    const users = new PostgresUserRepository();
    return {
      users,
      listings: new PostgresListingRepository(),
      markets: new PostgresMarketRepository(),
      currencies: new PostgresCurrencyRepository(),
      taxonomy: new PostgresTaxonomyRepository(),
      orders: new PostgresOrderRepository(),
      verification: new PostgresVerificationRepository(),
      compliance: new PostgresComplianceRepository(),
      messaging: new PostgresMessagingRepository(),
      notifications: new PostgresNotificationRepository(),
      reviews: new PostgresReviewRepository(),
      admin: new PostgresAdminRepository(),
      workspace: new PostgresWorkspaceRepository(),
      trending: new PostgresTrendingRepository(),
      homepage: new PostgresHomepageRepository(),
      courses: new PostgresCoursesRepository(),
      auto: new PostgresAutoRepository(),
      realEstate: new PostgresRealEstateRepository(),
      employment: new PostgresEmploymentRepository(),
      publishers: new PostgresPublisherRepository(),
      discoveryConfiguration: new PostgresDiscoveryConfigurationRepository(),
      support: new PostgresSupportRepository(),
      featureFlags: new PostgresFeatureFlagRepository(),
      solutions: new PostgresSolutionsRepository(),
      moderation: new PostgresModerationRepository(),
      crm: new PostgresCrmRepository(),
      crmShongre: new PostgresCrmShongreIntegrationRepository(),
      marketing: new PostgresMarketingRepository(),
      prospecting: new PostgresProspectingRepository(),
    };
  }

  const users = new DemoUserRepository();
  return {
    users,
    listings: new DemoListingRepository(),
    markets: new DemoMarketRepository(),
    currencies: new DemoCurrencyRepository(),
    taxonomy: new DemoTaxonomyRepository(),
    orders: new DemoOrderRepository(),
    verification: new DemoVerificationRepository(),
    compliance: new DemoComplianceRepository(),
    messaging: new DemoMessagingRepository(),
    notifications: new DemoNotificationRepository(),
    reviews: new DemoReviewRepository(),
    admin: new DemoAdminRepository(),
    workspace: new DemoWorkspaceRepository(),
    trending: new DemoTrendingRepository(),
    homepage: new DemoHomepageRepository(),
    courses: new DemoCoursesRepository(),
    auto: new DemoAutoRepository(),
    realEstate: new DemoRealEstateRepository(),
    employment: new DemoEmploymentRepository(),
    publishers: new DemoPublisherRepository(users),
    discoveryConfiguration: new DemoDiscoveryConfigurationRepository(),
    support: new DemoSupportRepository(),
    featureFlags: new DemoFeatureFlagRepository(),
    solutions: new DemoSolutionsRepository(),
    moderation: new DemoModerationRepository(),
    crm: new DemoCrmRepository(),
    crmShongre: new DemoCrmShongreIntegrationRepository(),
    marketing: new DemoMarketingRepository(),
    prospecting: new DemoProspectingRepository(),
  };
}

export const repositories: RepositoryContainer = createRepositoryContainer();
