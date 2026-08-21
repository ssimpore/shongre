import { BackendDataMode, config } from '../../../app/config/index.js';
import { IUserRepository, DemoUserRepository, PostgresUserRepository } from './user.repository.js';
import { IListingRepository, DemoListingRepository, PostgresListingRepository } from './listing.repository.js';
import { IMarketRepository, DemoMarketRepository, PostgresMarketRepository } from './market.repository.js';
import { ITaxonomyRepository, DemoTaxonomyRepository, PostgresTaxonomyRepository } from './taxonomy.repository.js';
import { IOrderRepository, DemoOrderRepository, PostgresOrderRepository } from './order.repository.js';
import { IMonetizationRepository, DemoMonetizationRepository, PostgresMonetizationRepository } from './monetization.repository.js';
import { IVerificationRepository, DemoVerificationRepository, PostgresVerificationRepository } from './verification.repository.js';
import { IMessagingRepository, DemoMessagingRepository, PostgresMessagingRepository } from './messaging.repository.js';
import { INotificationRepository, DemoNotificationRepository, PostgresNotificationRepository } from './notification.repository.js';
import { IReviewRepository, DemoReviewRepository, PostgresReviewRepository } from './review.repository.js';
import { IAdminRepository, DemoAdminRepository, PostgresAdminRepository } from './admin.repository.js';
import { IWorkspaceRepository, DemoWorkspaceRepository, PostgresWorkspaceRepository } from './workspace.repository.js';
import { ITrendingRepository, DemoTrendingRepository, PostgresTrendingRepository } from './trending.repository.js';
import { logger } from '../../logging/logger.js';

export interface RepositoryContainer {
  users: IUserRepository;
  listings: IListingRepository;
  markets: IMarketRepository;
  taxonomy: ITaxonomyRepository;
  orders: IOrderRepository;
  monetization: IMonetizationRepository;
  verification: IVerificationRepository;
  messaging: IMessagingRepository;
  notifications: INotificationRepository;
  reviews: IReviewRepository;
  admin: IAdminRepository;
  workspace: IWorkspaceRepository;
  trending: ITrendingRepository;
}

export function createRepositoryContainer(mode: BackendDataMode = config.dataMode): RepositoryContainer {
  logger.info(`Initializing Repository Container in [${mode.toUpperCase()}] mode`);

  if (mode === 'database') {
    return {
      users: new PostgresUserRepository(),
      listings: new PostgresListingRepository(),
      markets: new PostgresMarketRepository(),
      taxonomy: new PostgresTaxonomyRepository(),
      orders: new PostgresOrderRepository(),
      monetization: new PostgresMonetizationRepository(),
      verification: new PostgresVerificationRepository(),
      messaging: new PostgresMessagingRepository(),
      notifications: new PostgresNotificationRepository(),
      reviews: new PostgresReviewRepository(),
      admin: new PostgresAdminRepository(),
      workspace: new PostgresWorkspaceRepository(),
      trending: new PostgresTrendingRepository(),
    };
  }

  return {
    users: new DemoUserRepository(),
    listings: new DemoListingRepository(),
    markets: new DemoMarketRepository(),
    taxonomy: new DemoTaxonomyRepository(),
    orders: new DemoOrderRepository(),
    monetization: new DemoMonetizationRepository(),
    verification: new DemoVerificationRepository(),
    messaging: new DemoMessagingRepository(),
    notifications: new DemoNotificationRepository(),
    reviews: new DemoReviewRepository(),
    admin: new DemoAdminRepository(),
    workspace: new DemoWorkspaceRepository(),
    trending: new DemoTrendingRepository(),
  };
}

export const repositories: RepositoryContainer = createRepositoryContainer();
