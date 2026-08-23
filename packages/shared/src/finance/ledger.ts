import type {
  FinanceLedgerEntry,
  FinanceTransaction,
  PlatformFinanceDashboard,
} from "@shongre/contracts/finance";

export interface LedgerBalance {
  currency: string;
  debitMinor: number;
  creditMinor: number;
  differenceMinor: number;
}

export function calculateLedgerBalances(
  entries: readonly FinanceLedgerEntry[],
): LedgerBalance[] {
  const balances = new Map<string, Omit<LedgerBalance, "currency" | "differenceMinor">>();
  entries.forEach((entry) => {
    const current = balances.get(entry.amount.currency) ?? {
      debitMinor: 0,
      creditMinor: 0,
    };
    if (entry.side === "debit") current.debitMinor += entry.amount.amountMinor;
    else current.creditMinor += entry.amount.amountMinor;
    balances.set(entry.amount.currency, current);
  });
  return [...balances.entries()].map(([currency, balance]) => ({
    currency,
    ...balance,
    differenceMinor: balance.debitMinor - balance.creditMinor,
  }));
}

export function assertBalancedTransaction(
  transaction: Pick<FinanceTransaction, "reference" | "entries">,
): void {
  const balances = calculateLedgerBalances(transaction.entries);
  if (balances.length === 0) {
    throw new Error(`Finance transaction ${transaction.reference} has no entries.`);
  }
  const imbalance = balances.find((balance) => balance.differenceMinor !== 0);
  if (imbalance) {
    throw new Error(
      `Finance transaction ${transaction.reference} is not balanced in ${imbalance.currency}: ${imbalance.differenceMinor} minor units.`,
    );
  }
}

export function assertPlatformFinanceInvariants(
  dashboard: PlatformFinanceDashboard,
): void {
  const currency = dashboard.scope.currency;
  const money = Object.values(dashboard.metrics).map((metric) => metric.amount);
  if (money.some((value) => value.currency !== currency)) {
    throw new Error("Platform finance metrics must use the selected reporting currency.");
  }
  const revenueSourcesMinor = dashboard.revenueSources.reduce(
    (sum, source) => sum + source.amount.amountMinor,
    0,
  );
  if (revenueSourcesMinor !== dashboard.metrics.platformRevenue.amount.amountMinor) {
    throw new Error("Revenue sources must equal platform revenue.");
  }
  const expectedNetRevenue =
    dashboard.metrics.platformRevenue.amount.amountMinor -
    dashboard.metrics.providerFees.amount.amountMinor -
    dashboard.metrics.refunds.amount.amountMinor;
  if (expectedNetRevenue !== dashboard.metrics.netRevenue.amount.amountMinor) {
    throw new Error("Net revenue must equal platform revenue minus provider fees and refunds.");
  }
  if (
    dashboard.metrics.arr.amount.amountMinor !==
    dashboard.metrics.mrr.amount.amountMinor * 12
  ) {
    throw new Error("ARR must be the annualized MRR for this reporting model.");
  }
}
