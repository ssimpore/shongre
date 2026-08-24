import { describe, expect, it } from "vitest";
import {
  DEMO_FINANCE_TRANSACTIONS,
  DEMO_PLATFORM_FINANCE_DASHBOARD,
} from "@shongre/contracts/finance-demo";
import {
  assertBalancedTransaction,
  assertPlatformFinanceInvariants,
  calculateLedgerBalances,
} from "../src/finance/ledger";

describe("finance ledger", () => {
  it("keeps every deterministic demo transaction balanced by currency", () => {
    DEMO_FINANCE_TRANSACTIONS.forEach((transaction) => {
      expect(() => assertBalancedTransaction(transaction)).not.toThrow();
      expect(
        calculateLedgerBalances(transaction.entries)[0]?.differenceMinor,
      ).toBe(0);
    });
  });

  it("keeps dashboard definitions reconcilable", () => {
    expect(() =>
      assertPlatformFinanceInvariants(DEMO_PLATFORM_FINANCE_DASHBOARD),
    ).not.toThrow();
  });

  it("rejects an unbalanced transaction", () => {
    const transaction = structuredClone(DEMO_FINANCE_TRANSACTIONS[0]);
    transaction.entries[0].amount.amountMinor += 1;
    expect(() => assertBalancedTransaction(transaction)).toThrow(
      "is not balanced",
    );
  });
});
