import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";
import { businessVerticalCodeSchema } from "./monetization";

export const financePeriodSchema = z.enum(["7d", "30d", "quarter", "year"]);
export type FinancePeriod = z.infer<typeof financePeriodSchema>;

export const financeScopeSchema = z.object({
  period: financePeriodSchema.default("30d"),
  marketCode: z.union([marketCodeSchema, z.literal("ALL")]).default("ALL"),
  currency: z.string().length(3).default("EUR"),
});
export type FinanceScope = z.infer<typeof financeScopeSchema>;

export const financeTransactionTypeSchema = z.enum([
  "subscription",
  "promotion",
  "advertising",
  "commission",
  "service_fee",
  "marketplace_sale",
  "refund",
  "credit_note",
  "provider_fee",
  "seller_payout",
  "chargeback",
  "revenue_recognition",
  "adjustment",
]);
export type FinanceTransactionType = z.infer<typeof financeTransactionTypeSchema>;

export const financeTransactionStatusSchema = z.enum([
  "pending",
  "posted",
  "reconciled",
  "needs_review",
  "refunded",
  "failed",
  "reversed",
]);
export type FinanceTransactionStatus = z.infer<typeof financeTransactionStatusSchema>;

export const financeAccountClassSchema = z.enum([
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
  "contra_revenue",
]);
export type FinanceAccountClass = z.infer<typeof financeAccountClassSchema>;

export const financeLedgerEntrySchema = z.object({
  id: z.string().min(1),
  accountCode: z.string().min(1),
  accountLabel: z.string().min(1),
  accountClass: financeAccountClassSchema,
  side: z.enum(["debit", "credit"]),
  amount: moneySchema.refine((value) => value.amountMinor > 0, {
    message: "A ledger entry amount must be positive.",
  }),
});
export type FinanceLedgerEntry = z.infer<typeof financeLedgerEntrySchema>;

export const financeTransactionSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  type: financeTransactionTypeSchema,
  status: financeTransactionStatusSchema,
  accountId: z.string().min(1),
  accountLabel: z.string().min(1),
  marketCode: marketCodeSchema,
  grossAmount: moneySchema,
  netAmount: moneySchema,
  occurredAt: z.string().datetime(),
  postedAt: z.string().datetime().optional(),
  provider: z.string().optional(),
  providerReference: z.string().optional(),
  orderReference: z.string().optional(),
  invoiceReference: z.string().optional(),
  reversalOfTransactionId: z.string().optional(),
  description: z.string().min(1),
  entries: z.array(financeLedgerEntrySchema).min(2),
});
export type FinanceTransaction = z.infer<typeof financeTransactionSchema>;

export const financeMetricSchema = z.object({
  amount: moneySchema,
  changeBps: z.number().int().optional(),
  definition: z.string().min(1),
});
export type FinanceMetric = z.infer<typeof financeMetricSchema>;

export const revenueSourceSchema = z.object({
  key: z.enum(["subscriptions", "promotions", "advertising", "commissions"]),
  label: z.string().min(1),
  amount: moneySchema,
  shareBps: z.number().int().min(0).max(10_000),
});

export const financeTimePointSchema = z.object({
  date: z.string().date(),
  platformRevenue: moneySchema,
  netRevenue: moneySchema,
});

export const financeExceptionSchema = z.object({
  key: z.enum(["failed_payments", "reconciliation_gaps", "failed_payouts", "chargebacks"]),
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
  severity: z.enum(["info", "warning", "critical"]),
  amountImpact: moneySchema.optional(),
});

export const financeMarketSummarySchema = z.object({
  marketCode: marketCodeSchema,
  label: z.string().min(1),
  platformRevenue: moneySchema,
  netRevenue: moneySchema,
  gmv: moneySchema,
});

export const financeVerticalSummarySchema = z.object({
  verticalId: businessVerticalCodeSchema,
  label: z.string().min(1),
  revenue: moneySchema,
  mrr: moneySchema,
  activeTrials: z.number().int().nonnegative(),
  payingSubscriptions: z.number().int().nonnegative(),
  cancelledSubscriptions: z.number().int().nonnegative(),
  trialsStarted: z.number().int().nonnegative(),
  convertedAccounts: z.number().int().nonnegative(),
  conversionBps: z.number().int().min(0).max(10_000),
});
export type FinanceVerticalSummary = z.infer<typeof financeVerticalSummarySchema>;

export const platformFinanceDashboardSchema = z.object({
  scope: financeScopeSchema,
  asOf: z.string().datetime(),
  isPeriodClosed: z.boolean(),
  metrics: z.object({
    platformRevenue: financeMetricSchema,
    netRevenue: financeMetricSchema,
    gmv: financeMetricSchema,
    grossCollected: financeMetricSchema,
    taxCollected: financeMetricSchema,
    sellerPayable: financeMetricSchema,
    outstanding: financeMetricSchema,
    deferredRevenue: financeMetricSchema,
    providerFees: financeMetricSchema,
    refunds: financeMetricSchema,
    mrr: financeMetricSchema,
    arr: financeMetricSchema,
  }),
  revenueSources: z.array(revenueSourceSchema),
  timeSeries: z.array(financeTimePointSchema),
  subscriptionHealth: z.object({
    paidAccounts: z.number().int().nonnegative(),
    newSubscriptions: z.number().int().nonnegative(),
    churnBps: z.number().int().nonnegative(),
    arppu: moneySchema,
  }),
  exceptions: z.array(financeExceptionSchema),
  markets: z.array(financeMarketSummarySchema),
  verticals: z.array(financeVerticalSummarySchema),
});
export type PlatformFinanceDashboard = z.infer<typeof platformFinanceDashboardSchema>;

export const financeTransactionPageSchema = z.object({
  items: z.array(financeTransactionSchema),
  pageInfo: z.object({
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    nextCursor: z.string().optional(),
  }),
});
export type FinanceTransactionPage = z.infer<typeof financeTransactionPageSchema>;

export const reconciliationCaseSchema = z.object({
  id: z.string().min(1),
  transactionId: z.string().min(1),
  status: z.enum(["open", "investigating", "resolved", "ignored"]),
  expectedAmount: moneySchema,
  actualAmount: moneySchema,
  difference: moneySchema,
  reason: z.string().min(1),
  openedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
});
export type ReconciliationCase = z.infer<typeof reconciliationCaseSchema>;

export const accountFinanceDashboardSchema = z.object({
  accountId: z.string().min(1),
  accountLabel: z.string().min(1),
  accountKind: z.enum(["individual", "professional"]),
  asOf: z.string().datetime(),
  metrics: z.object({
    spending: financeMetricSchema,
    sellerEarnings: financeMetricSchema,
    availableForPayout: financeMetricSchema,
    pendingPayout: financeMetricSchema,
    refunded: financeMetricSchema,
  }),
  transactions: z.array(financeTransactionSchema),
});
export type AccountFinanceDashboard = z.infer<typeof accountFinanceDashboardSchema>;
