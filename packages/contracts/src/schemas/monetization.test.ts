import { describe, expect, it } from "vitest";
import {
  creditTransactionSchema,
  MONETIZATION_SCOPE_CLASSIFICATION,
  monetizationInvoiceSchema,
  monetizationSubscriptionSchema,
  subscriptionChangePreviewSchema,
} from "./monetization";

const at = "2026-08-23T10:00:00.000Z";
const later = "2026-09-23T10:00:00.000Z";
const eur = (amountMinor: number) => ({ amountMinor, currency: "EUR" });

describe("monetization lifecycle contracts", () => {
  it("classifies shared definitions separately from market-owned decisions", () => {
    expect(MONETIZATION_SCOPE_CLASSIFICATION).toMatchObject({
      providerDefinition: "PLATFORM_GLOBAL",
      productDefinition: "MULTI_MARKET_SHARED",
      catalogVersion: "MARKET_SCOPED",
      quote: "MARKET_SCOPED",
      subscription: "MARKET_SCOPED",
      webhookEvent: "MARKET_SCOPED",
      analyticsEvent: "MARKET_SCOPED",
      idempotencyKey: "MARKET_SCOPED",
    });
    expect(
      Object.values(MONETIZATION_SCOPE_CLASSIFICATION).every((scope) =>
        ["PLATFORM_GLOBAL", "MARKET_SCOPED", "MULTI_MARKET_SHARED"].includes(
          scope,
        ),
      ),
    ).toBe(true);
  });

  it("accepts a complete scheduled cancellation state", () => {
    expect(
      monetizationSubscriptionSchema.parse({
        id: "sub_1",
        accountId: "account_1",
        productId: "plan.pro.business",
        sourceOrderId: "order_1",
        status: "cancellation_pending",
        currentPeriodStart: at,
        currentPeriodEnd: later,
        cancelAtPeriodEnd: true,
        createdAt: at,
        updatedAt: at,
      }).status,
    ).toBe("cancellation_pending");
  });

  it("rejects incomplete scheduled plan changes", () => {
    const result = monetizationSubscriptionSchema.safeParse({
      id: "sub_1",
      accountId: "account_1",
      productId: "plan.pro.business",
      sourceOrderId: "order_1",
      status: "active",
      currentPeriodStart: at,
      currentPeriodEnd: later,
      cancelAtPeriodEnd: false,
      scheduledProductId: "plan.pro.enterprise",
      createdAt: at,
      updatedAt: at,
    });
    expect(result.success).toBe(false);
  });

  it("reconciles invoice totals in minor units", () => {
    const valid = {
      id: "invoice_1",
      accountId: "account_1",
      number: "FAC-2026-001",
      status: "paid" as const,
      subtotal: eur(7_900),
      discount: eur(0),
      tax: eur(1_580),
      total: eur(9_480),
      amountPaid: eur(9_480),
      amountDue: eur(0),
      issuedAt: at,
      paidAt: at,
    };
    expect(monetizationInvoiceSchema.safeParse(valid).success).toBe(true);
    expect(
      monetizationInvoiceSchema.safeParse({
        ...valid,
        total: eur(9_479),
        amountPaid: eur(9_479),
      }).success,
    ).toBe(false);
  });

  it("requires signed non-zero credit ledger entries", () => {
    expect(
      creditTransactionSchema.safeParse({
        id: "credit_1",
        accountId: "account_1",
        creditType: "search_bump",
        quantity: 0,
        reason: "Invalid adjustment",
        sourceType: "admin_adjustment",
        idempotencyKey: "adjustment_1",
        createdAt: at,
      }).success,
    ).toBe(false);
  });

  it("keeps change previews explicit about tax and effective date", () => {
    const preview = subscriptionChangePreviewSchema.parse({
      subscriptionId: "sub_1",
      targetProductId: "plan.pro.enterprise",
      targetPriceId: "price_enterprise_month",
      targetProductVersionId: "commercial-fr-v3:plan.pro.enterprise",
      targetConfigurationVersionId: "commercial-fr-v3",
      policyId: "subscription-policy-fr-v3",
      requiresProviderConfirmation: true,
      effectiveAt: "immediately",
      proration: eur(6_000),
      tax: eur(1_200),
      totalDueNow: eur(7_200),
      nextPeriodTotal: eur(23_880),
      nextBillingAt: later,
    });
    expect(preview.totalDueNow.amountMinor).toBe(7_200);
  });
});
