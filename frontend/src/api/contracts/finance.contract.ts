import type {
  AccountFinanceDashboard,
  FinanceScope,
  FinanceTransaction,
  FinanceTransactionPage,
  FinanceTransactionStatus,
  PlatformFinanceDashboard,
  ReconciliationCase,
} from "@shongre/contracts/finance";

export interface FinanceTransactionQuery extends FinanceScope {
  query?: string;
  status?: FinanceTransactionStatus;
  needsReviewOnly?: boolean;
  cursor?: string;
  limit?: number;
}

export interface FinanceExport {
  fileName: string;
  mimeType: "text/csv";
  content: string;
}

export interface FinanceServiceContract {
  getPlatformDashboard(scope: FinanceScope): Promise<PlatformFinanceDashboard>;
  getAccountDashboard(): Promise<AccountFinanceDashboard>;
  getOrganizationDashboard(): Promise<AccountFinanceDashboard>;
  listTransactions(
    query: FinanceTransactionQuery,
  ): Promise<FinanceTransactionPage>;
  getTransaction(transactionId: string): Promise<FinanceTransaction>;
  listReconciliationCases(): Promise<ReconciliationCase[]>;
  exportTransactions(query: FinanceTransactionQuery): Promise<FinanceExport>;
}
