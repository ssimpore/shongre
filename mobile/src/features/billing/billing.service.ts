import type {
  BillingOverview,
  MonetizationCatalog,
} from "@shongre/contracts/monetization";
import type { operations } from "@shongre/contracts/openapi";
import { apiRequest } from "@/api/http-client";

type CatalogResponse =
  operations["getBusinessRulesCatalog"]["responses"][200]["content"]["application/json"];
type BillingResponse =
  operations["getMonetizationBilling"]["responses"][200]["content"]["application/json"];

export interface MobileBillingService {
  getCatalog(marketCode: string): Promise<MonetizationCatalog>;
  getOverview(accountId: string, marketCode: string): Promise<BillingOverview>;
}

export class HttpMobileBillingService implements MobileBillingService {
  async getCatalog(marketCode: string): Promise<MonetizationCatalog> {
    return (await apiRequest<CatalogResponse>(
      `/business-rules/catalog?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    )) as MonetizationCatalog;
  }

  async getOverview(
    _accountId: string,
    marketCode: string,
  ): Promise<BillingOverview> {
    return (await apiRequest<BillingResponse>(
      "/monetization/billing",
      {},
      marketCode,
    )) as BillingOverview;
  }
}

export const mobileBillingService: MobileBillingService =
  new HttpMobileBillingService();
