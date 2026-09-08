import type {
  BillingOverview,
  MonetizationCatalog,
} from "@shongre/contracts/monetization";
import { apiOperation } from "@/api/generated-api-operation";

export interface MobileBillingService {
  getCatalog(marketCode: string): Promise<MonetizationCatalog>;
  getOverview(accountId: string, marketCode: string): Promise<BillingOverview>;
}

export class HttpMobileBillingService implements MobileBillingService {
  async getCatalog(marketCode: string): Promise<MonetizationCatalog> {
    return (await apiOperation(
      "getBusinessRulesCatalog",
      { query: { marketCode } },
      marketCode,
    )) as MonetizationCatalog;
  }

  async getOverview(
    _accountId: string,
    marketCode: string,
  ): Promise<BillingOverview> {
    return (await apiOperation(
      "getMonetizationBilling",
      {},
      marketCode,
    )) as BillingOverview;
  }
}

export const mobileBillingService: MobileBillingService =
  new HttpMobileBillingService();
