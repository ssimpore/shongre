import type {
  AccountFinanceDashboard,
  FinanceTransaction,
  FinanceTransactionPage,
  PlatformFinanceDashboard,
  ReconciliationCase,
} from "@shongre/contracts/finance";
import type {
  FinanceExport,
  FinanceServiceContract,
  FinanceTransactionQuery,
} from "../../contracts/finance.contract";
import { httpClient } from "./http-client";

const queryParams = (query: FinanceTransactionQuery) => ({
  period: query.period,
  marketCode: query.marketCode,
  currency: query.currency,
  query: query.query,
  status: query.status,
  needsReviewOnly: query.needsReviewOnly,
  cursor: query.cursor,
  limit: query.limit,
});

export class HttpFinanceService implements FinanceServiceContract {
  getPlatformDashboard(scope: FinanceTransactionQuery) {
    return httpClient.get<PlatformFinanceDashboard>("/finance/platform/overview", {
      params: queryParams(scope),
    });
  }

  getAccountDashboard() {
    return httpClient.get<AccountFinanceDashboard>("/finance/account/overview");
  }

  getOrganizationDashboard() {
    return httpClient.get<AccountFinanceDashboard>("/finance/organization/overview");
  }

  listTransactions(query: FinanceTransactionQuery) {
    return httpClient.get<FinanceTransactionPage>("/finance/platform/transactions", {
      params: queryParams(query),
    });
  }

  getTransaction(transactionId: string) {
    return httpClient.get<FinanceTransaction>(
      `/finance/platform/transactions/${encodeURIComponent(transactionId)}`,
    );
  }

  listReconciliationCases() {
    return httpClient.get<ReconciliationCase[]>("/finance/platform/reconciliation");
  }

  exportTransactions(query: FinanceTransactionQuery) {
    return httpClient.get<FinanceExport>("/finance/platform/exports/transactions", {
      params: queryParams(query),
    });
  }
}

export const httpFinanceService = new HttpFinanceService();
