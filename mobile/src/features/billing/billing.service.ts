import type {
  ActiveEntitlement,
  BillingOverview,
  MonetizationCatalog,
  MonetizationSubscription,
} from "@shongre/contracts/monetization";
import { getCountryConfig } from "@shongre/contracts";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { resolveAllEffectiveEntitlements } from "@shongre/shared";
import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";

export interface MobileBillingService {
  getCatalog(marketCode: string): Promise<MonetizationCatalog>;
  getOverview(accountId: string, marketCode: string): Promise<BillingOverview>;
}

const emptyOverview = (): BillingOverview => ({
  subscriptions: [],
  entitlements: [],
  usage: [],
  orders: [],
  payments: [],
  invoices: [],
  refunds: [],
  creditBalances: [],
  subscriptionEvents: [],
  effectiveEntitlements: [],
});

export class DemoMobileBillingService implements MobileBillingService {
  async getCatalog(marketCode: string): Promise<MonetizationCatalog> {
    const market = getCountryConfig(marketCode);
    if (
      !market ||
      !market.monetization.enabled ||
      market.monetization.catalogMarketCode !==
        BASELINE_MONETIZATION_CATALOG.marketCode
    ) {
      throw new Error(
        "Les offres professionnelles ne sont pas configurées pour ce marché.",
      );
    }
    return structuredClone(BASELINE_MONETIZATION_CATALOG);
  }

  async getOverview(
    accountId: string,
    marketCode: string,
  ): Promise<BillingOverview> {
    const catalog = await this.getCatalog(marketCode);
    if (!accountId.startsWith("mobile_pro_")) return emptyOverview();
    const product = catalog.products.find(
      (candidate) => candidate.id === "plan.pro.business",
    )!;
    const price = product.prices.find(
      (candidate) => candidate.billingPeriod === "month",
    )!;
    const currentPeriodStart = "2026-08-01T00:00:00.000Z";
    const currentPeriodEnd = "2026-09-01T00:00:00.000Z";
    const orderId = `mobile_demo_order_${accountId}`;
    const subscription: MonetizationSubscription = {
      id: `mobile_demo_subscription_${accountId}`,
      accountId,
      productId: product.id,
      productVersionId: product.versionId,
      configurationVersionId: catalog.configurationVersionId,
      marketCode: catalog.marketCode,
      currency: catalog.currency,
      priceId: price.id,
      sourceOrderId: orderId,
      status: "active",
      billingPeriod: price.billingPeriod,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: currentPeriodStart,
      familyId: product.commercialProfile.familyId,
      verticalId: product.commercialProfile.verticalId,
    };
    const entitlements: ActiveEntitlement[] = product.entitlements.map(
      (definition, index) => ({
        id: `mobile_demo_entitlement_${index}`,
        accountId,
        productId: product.id,
        productVersionId: product.versionId,
        configurationVersionId: catalog.configurationVersionId,
        key: definition.key,
        value: definition.value,
        sourceOrderId: orderId,
        startsAt: currentPeriodStart,
        endsAt: currentPeriodEnd,
        status: "active",
        mergePolicy: definition.mergePolicy,
        verticalId: definition.verticalId,
      }),
    );
    const effectiveEntitlements = resolveAllEffectiveEntitlements({
      catalog,
      entitlements,
    });
    const taxMinor = Math.round(
      (price.amount.amountMinor * price.taxRateBps) / 10_000,
    );
    const totalMinor = price.amount.amountMinor + taxMinor;
    return {
      currentSubscription: subscription,
      subscriptions: [subscription],
      entitlements,
      effectiveEntitlements,
      usage: effectiveEntitlements.flatMap((entry) =>
        typeof entry.value === "number"
          ? [
              {
                key: entry.key,
                label: entry.label,
                used: Math.min(12, entry.value),
                limit: entry.value,
                unit: "unités",
                resetsAt: currentPeriodEnd,
                verticalId: entry.verticalId,
              },
            ]
          : [],
      ),
      orders: [],
      payments: [],
      invoices: [
        {
          id: `mobile_demo_invoice_${accountId}`,
          accountId,
          orderId,
          subscriptionId: subscription.id,
          configurationVersionId: catalog.configurationVersionId,
          marketCode: catalog.marketCode,
          number: "FAC-DEMO-2026-08",
          status: "paid",
          subtotal: price.amount,
          discount: { amountMinor: 0, currency: catalog.currency },
          tax: { amountMinor: taxMinor, currency: catalog.currency },
          total: { amountMinor: totalMinor, currency: catalog.currency },
          amountPaid: {
            amountMinor: totalMinor,
            currency: catalog.currency,
          },
          amountDue: { amountMinor: 0, currency: catalog.currency },
          issuedAt: currentPeriodStart,
          paidAt: currentPeriodStart,
        },
      ],
      refunds: [],
      creditBalances: [],
      subscriptionEvents: [
        {
          id: `mobile_demo_event_${accountId}`,
          subscriptionId: subscription.id,
          accountId,
          type: "renewed",
          toStatus: "active",
          metadata: { simulated: true },
          idempotencyKey: `mobile-demo-renewal:${currentPeriodStart}`,
          occurredAt: currentPeriodStart,
        },
      ],
    };
  }
}

export class HttpMobileBillingService implements MobileBillingService {
  getCatalog(marketCode: string) {
    return apiRequest<MonetizationCatalog>(
      `/business-rules/catalog?marketCode=${encodeURIComponent(marketCode)}`,
      {},
      marketCode,
    );
  }

  getOverview(_accountId: string, marketCode: string) {
    return apiRequest<BillingOverview>("/monetization/billing", {}, marketCode);
  }
}

export const mobileBillingService: MobileBillingService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoMobileBillingService()
    : new HttpMobileBillingService();
