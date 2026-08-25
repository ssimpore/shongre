import type {
  FinanceScope,
  FinanceTransactionStatus,
} from "@shongre/contracts/finance";
import { financeScopeSchema } from "@shongre/contracts/finance";
import { config } from "../../app/config/index.js";
import {
  DemoFinanceRepository,
  PostgresFinanceRepository,
  type FinanceRepository,
} from "../../infrastructure/database/repositories/finance.repository.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMarketCode } from "../../shared/market/market-code.js";

function periodBounds(period: FinanceScope["period"]) {
  const end = new Date();
  const start = new Date(end);
  if (period === "7d") start.setUTCDate(start.getUTCDate() - 7);
  else if (period === "30d") start.setUTCDate(start.getUTCDate() - 30);
  else if (period === "quarter") start.setUTCMonth(start.getUTCMonth() - 3);
  else start.setUTCFullYear(start.getUTCFullYear() - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export class FinanceService {
  private readonly repository: FinanceRepository;

  constructor(repository?: FinanceRepository) {
    this.repository =
      repository ??
      (config.dataMode === "database"
        ? new PostgresFinanceRepository()
        : new DemoFinanceRepository());
  }

  getPlatformDashboard(input: Partial<FinanceScope>) {
    const scope = financeScopeSchema.parse(input);
    const period = periodBounds(scope.period);
    return this.repository.getPlatformDashboard(
      scope,
      period.start,
      period.end,
    );
  }

  getAccountDashboard(accountId: string, marketCode: string) {
    return this.repository.getAccountDashboard(
      accountId,
      requireMarketCode(marketCode),
    );
  }

  async getOrganizationDashboard(accountId: string, marketCode: string) {
    const dashboard = await this.repository.getOrganizationDashboard(
      accountId,
      requireMarketCode(marketCode),
    );
    if (!dashboard) {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Vous n’avez pas la permission de consulter les finances de cette organisation.",
      });
    }
    return dashboard;
  }

  listTransactions(
    input: Partial<FinanceScope> & {
      query?: string;
      status?: FinanceTransactionStatus;
      needsReviewOnly?: boolean;
      cursor?: string;
      limit?: number;
    },
  ) {
    const scope = financeScopeSchema.parse(input);
    const period = periodBounds(scope.period);
    return this.repository.listTransactions({
      ...scope,
      periodStart: period.start,
      periodEnd: period.end,
      query: input.query?.trim().slice(0, 120),
      status: input.status,
      needsReviewOnly: input.needsReviewOnly,
      cursor: input.cursor,
      limit: Math.min(Math.max(input.limit ?? 25, 1), 1000),
    });
  }

  async getTransaction(transactionId: string) {
    const transaction = await this.repository.getTransaction(transactionId);
    if (!transaction) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Transaction financière introuvable.",
      });
    }
    return transaction;
  }

  listReconciliationCases() {
    return this.repository.listReconciliationCases();
  }

  async exportTransactions(
    input: Parameters<FinanceService["listTransactions"]>[0],
  ) {
    const page = await this.listTransactions({ ...input, limit: 1000 });
    const rows = [
      [
        "Référence",
        "Date",
        "Type",
        "Compte",
        "Marché",
        "Brut (minor)",
        "Net (minor)",
        "Devise",
        "Statut",
      ],
      ...page.items.map((transaction) => [
        transaction.reference,
        transaction.occurredAt,
        transaction.type,
        transaction.accountLabel,
        transaction.marketCode,
        String(transaction.grossAmount.amountMinor),
        String(transaction.netAmount.amountMinor),
        transaction.netAmount.currency,
        transaction.status,
      ]),
    ];
    return {
      fileName: `shongre-finance-${input.period ?? "30d"}-${input.marketCode ?? "ALL"}.csv`,
      mimeType: "text/csv" as const,
      content: rows
        .map((row) =>
          row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
        )
        .join("\n"),
    };
  }
}

export const financeService = new FinanceService();
