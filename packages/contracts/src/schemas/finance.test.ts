import { describe, expect, it } from "vitest";
import {
  DEMO_FINANCE_TRANSACTIONS,
  DEMO_PLATFORM_FINANCE_DASHBOARD,
} from "../fixtures/finance-demo";
import {
  financeTransactionSchema,
  platformFinanceDashboardSchema,
} from "./finance";

describe("finance contracts", () => {
  it("validates canonical platform and transaction fixtures", () => {
    expect(
      platformFinanceDashboardSchema.safeParse(DEMO_PLATFORM_FINANCE_DASHBOARD)
        .success,
    ).toBe(true);
    DEMO_FINANCE_TRANSACTIONS.forEach((transaction) => {
      expect(financeTransactionSchema.safeParse(transaction).success).toBe(
        true,
      );
    });
  });

  it("rejects negative or zero ledger entry amounts", () => {
    const transaction = structuredClone(DEMO_FINANCE_TRANSACTIONS[0]);
    transaction.entries[0].amount.amountMinor = 0;
    expect(financeTransactionSchema.safeParse(transaction).success).toBe(false);
  });

  it("keeps raw money in integer minor units", () => {
    const transaction = structuredClone(DEMO_FINANCE_TRANSACTIONS[0]) as any;
    transaction.grossAmount.amountMinor = 118.8;
    expect(financeTransactionSchema.safeParse(transaction).success).toBe(false);
  });
});
