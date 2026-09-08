import type {
  AccountFinanceDashboard,
  FinanceTransaction,
  FinanceTransactionPage,
  PlatformFinanceDashboard,
  ReconciliationCase,
} from "@shongre/contracts/finance";
import { apiOperation } from "./generated-api-operation";
import type {
  FinanceExport,
  FinanceServiceContract,
  FinanceTransactionQuery,
} from "../../contracts/finance.contract";

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
    return apiOperation<PlatformFinanceDashboard, "getFinancePlatformOverview">(
      "getFinancePlatformOverview",
      { query: queryParams(scope) },
    );
  }

  getAccountDashboard() {
    return apiOperation<AccountFinanceDashboard, "getFinanceAccountOverview">(
      "getFinanceAccountOverview",
      {},
    );
  }

  getOrganizationDashboard() {
    return apiOperation<
      AccountFinanceDashboard,
      "getFinanceOrganizationOverview"
    >("getFinanceOrganizationOverview", {});
  }

  listTransactions(query: FinanceTransactionQuery) {
    return apiOperation<
      FinanceTransactionPage,
      "getFinancePlatformTransactions"
    >("getFinancePlatformTransactions", { query: queryParams(query) });
  }

  getTransaction(transactionId: string) {
    return apiOperation<
      FinanceTransaction,
      "getFinancePlatformTransactionsById"
    >("getFinancePlatformTransactionsById", { path: { id: transactionId } });
  }

  listReconciliationCases() {
    return apiOperation<
      ReconciliationCase[],
      "getFinancePlatformReconciliation"
    >("getFinancePlatformReconciliation", {});
  }

  exportTransactions(query: FinanceTransactionQuery) {
    return apiOperation<FinanceExport, "getFinancePlatformExportsTransactions">(
      "getFinancePlatformExportsTransactions",
      { query: queryParams(query) },
    );
  }
}

export const httpFinanceService = new HttpFinanceService();
