import {
  DEMO_FINANCE_TRANSACTIONS,
  DEMO_PLATFORM_FINANCE_DASHBOARD,
  DEMO_RECONCILIATION_CASES,
  createDemoAccountFinanceDashboard,
} from "@shongre/contracts/finance-demo";
import type {
  FinanceScope,
  FinanceTransaction,
  FinanceTransactionPage,
  PlatformFinanceDashboard,
} from "@shongre/contracts/finance";
import {
  assertBalancedTransaction,
  assertPlatformFinanceInvariants,
} from "@shongre/shared";
import type {
  FinanceExport,
  FinanceServiceContract,
  FinanceTransactionQuery,
} from "../../contracts/finance.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { storageService } from "../../../services/storage.service";

function scaledDashboard(scope: FinanceScope): PlatformFinanceDashboard {
  const dashboard = structuredClone(DEMO_PLATFORM_FINANCE_DASHBOARD);
  dashboard.scope = scope;
  if (scope.marketCode === "ALL") return dashboard;
  const market = dashboard.markets.find(
    (item) => item.marketCode === scope.marketCode,
  );
  if (!market) return { ...dashboard, revenueSources: [], markets: [] };
  const ratio =
    market.platformRevenue.amountMinor /
    dashboard.metrics.platformRevenue.amount.amountMinor;
  const scale = (amountMinor: number) => Math.round(amountMinor * ratio);
  dashboard.metrics.platformRevenue.amount = market.platformRevenue;
  dashboard.metrics.netRevenue.amount = market.netRevenue;
  dashboard.metrics.gmv.amount = market.gmv;
  dashboard.metrics.grossCollected.amount.amountMinor = scale(
    dashboard.metrics.grossCollected.amount.amountMinor,
  );
  dashboard.metrics.taxCollected.amount.amountMinor = scale(
    dashboard.metrics.taxCollected.amount.amountMinor,
  );
  dashboard.metrics.sellerPayable.amount.amountMinor = scale(
    dashboard.metrics.sellerPayable.amount.amountMinor,
  );
  dashboard.metrics.outstanding.amount.amountMinor = scale(
    dashboard.metrics.outstanding.amount.amountMinor,
  );
  dashboard.metrics.deferredRevenue.amount.amountMinor = scale(
    dashboard.metrics.deferredRevenue.amount.amountMinor,
  );
  dashboard.metrics.refunds.amount.amountMinor = scale(
    dashboard.metrics.refunds.amount.amountMinor,
  );
  dashboard.metrics.providerFees.amount.amountMinor =
    market.platformRevenue.amountMinor -
    market.netRevenue.amountMinor -
    dashboard.metrics.refunds.amount.amountMinor;
  dashboard.metrics.mrr.amount.amountMinor = scale(
    dashboard.metrics.mrr.amount.amountMinor,
  );
  dashboard.metrics.arr.amount.amountMinor =
    dashboard.metrics.mrr.amount.amountMinor * 12;
  dashboard.revenueSources = dashboard.revenueSources.map((source) => ({
    ...source,
    amount: { ...source.amount, amountMinor: scale(source.amount.amountMinor) },
  }));
  dashboard.verticals = dashboard.verticals.map((vertical) => ({
    ...vertical,
    revenue: {
      ...vertical.revenue,
      amountMinor: scale(vertical.revenue.amountMinor),
    },
    mrr: { ...vertical.mrr, amountMinor: scale(vertical.mrr.amountMinor) },
  }));
  const sourceDifference =
    market.platformRevenue.amountMinor -
    dashboard.revenueSources.reduce(
      (sum, source) => sum + source.amount.amountMinor,
      0,
    );
  if (dashboard.revenueSources[0]) {
    dashboard.revenueSources[0].amount.amountMinor += sourceDifference;
  }
  dashboard.timeSeries = dashboard.timeSeries.map((point) => ({
    ...point,
    platformRevenue: {
      ...point.platformRevenue,
      amountMinor: scale(point.platformRevenue.amountMinor),
    },
    netRevenue: {
      ...point.netRevenue,
      amountMinor: scale(point.netRevenue.amountMinor),
    },
  }));
  dashboard.markets = [market];
  return dashboard;
}

function matchingTransactions(
  query: FinanceTransactionQuery,
): FinanceTransaction[] {
  const normalized = query.query?.trim().toLocaleLowerCase("fr") ?? "";
  return DEMO_FINANCE_TRANSACTIONS.filter((transaction) => {
    if (
      query.marketCode !== "ALL" &&
      transaction.marketCode !== query.marketCode
    )
      return false;
    if (query.status && transaction.status !== query.status) return false;
    if (query.needsReviewOnly && transaction.status !== "needs_review")
      return false;
    if (!normalized) return true;
    return [
      transaction.reference,
      transaction.accountLabel,
      transaction.invoiceReference,
      transaction.orderReference,
      transaction.providerReference,
    ].some((value) => value?.toLocaleLowerCase("fr").includes(normalized));
  });
}

export class DemoFinanceService implements FinanceServiceContract {
  async getPlatformDashboard(scope: FinanceScope) {
    await simulateNetworkDelay(90);
    const dashboard = scaledDashboard(scope);
    assertPlatformFinanceInvariants(dashboard);
    return dashboard;
  }

  async getAccountDashboard() {
    await simulateNetworkDelay(80);
    const user = storageService.getCurrentUser();
    if (!user)
      throw new Error("Une session est requise pour consulter les finances.");
    return createDemoAccountFinanceDashboard(
      user.id,
      user.companyName || user.name,
      user.accountType === "professional" ? "professional" : "individual",
      user.accountType === "professional" ||
        ["seller", "individual_seller"].includes(String(user.role)),
    );
  }

  async getOrganizationDashboard() {
    await simulateNetworkDelay(80);
    const user = storageService.getCurrentUser();
    if (!user || user.accountType !== "professional") {
      throw new Error("Une adhésion professionnelle autorisée est requise.");
    }
    return createDemoAccountFinanceDashboard(
      user.id,
      user.companyName || user.name,
      "professional",
    );
  }

  async listTransactions(
    query: FinanceTransactionQuery,
  ): Promise<FinanceTransactionPage> {
    await simulateNetworkDelay(90);
    const items = matchingTransactions(query);
    items.forEach(assertBalancedTransaction);
    const limit = query.limit ?? 25;
    return { items: items.slice(0, limit), pageInfo: { total: 1248, limit } };
  }

  async getTransaction(transactionId: string) {
    await simulateNetworkDelay(40);
    const transaction = DEMO_FINANCE_TRANSACTIONS.find(
      (item) => item.id === transactionId,
    );
    if (!transaction) throw new Error("Transaction financière introuvable.");
    assertBalancedTransaction(transaction);
    return structuredClone(transaction);
  }

  async listReconciliationCases() {
    await simulateNetworkDelay(60);
    return structuredClone([...DEMO_RECONCILIATION_CASES]);
  }

  async exportTransactions(
    query: FinanceTransactionQuery,
  ): Promise<FinanceExport> {
    const transactions = matchingTransactions(query);
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
      ...transactions.map((transaction) => [
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
      fileName: `shongre-finance-${query.period}-${query.marketCode}.csv`,
      mimeType: "text/csv",
      content: rows
        .map((row) =>
          row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
        )
        .join("\n"),
    };
  }
}

export const demoFinanceService = new DemoFinanceService();
