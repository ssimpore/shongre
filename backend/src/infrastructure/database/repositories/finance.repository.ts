import {
  accountFinanceDashboardSchema,
  financeTransactionPageSchema,
  financeTransactionSchema,
  platformFinanceDashboardSchema,
  reconciliationCaseSchema,
  type AccountFinanceDashboard,
  type FinanceScope,
  type FinanceTransaction,
  type FinanceTransactionPage,
  type FinanceTransactionStatus,
  type PlatformFinanceDashboard,
  type ReconciliationCase,
} from "@shongre/contracts/finance";
import {
  DEMO_FINANCE_TRANSACTIONS,
  DEMO_PLATFORM_FINANCE_DASHBOARD,
  DEMO_RECONCILIATION_CASES,
  createDemoAccountFinanceDashboard,
} from "@shongre/contracts/finance-demo";
import {
  assertBalancedTransaction,
  assertPlatformFinanceInvariants,
} from "@shongre/shared";
import { normalizeBusinessVerticalCode } from "@shongre/contracts/business-verticals";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { getCountryConfig } from "@shongre/contracts";
import { requireMarketCode } from "../../../shared/market/market-code.js";

export interface FinanceTransactionFilters extends FinanceScope {
  periodStart: string;
  periodEnd: string;
  query?: string;
  status?: FinanceTransactionStatus;
  needsReviewOnly?: boolean;
  cursor?: string;
  limit: number;
}

export interface FinanceRepository {
  getPlatformDashboard(
    scope: FinanceScope,
    periodStart: string,
    periodEnd: string,
  ): Promise<PlatformFinanceDashboard>;
  getAccountDashboard(
    accountId: string,
    marketCode: string,
  ): Promise<AccountFinanceDashboard>;
  getOrganizationDashboard(
    accountId: string,
    marketCode: string,
  ): Promise<AccountFinanceDashboard | null>;
  listTransactions(
    filters: FinanceTransactionFilters,
  ): Promise<FinanceTransactionPage>;
  getTransaction(transactionId: string): Promise<FinanceTransaction | null>;
  listReconciliationCases(): Promise<ReconciliationCase[]>;
}

const money = (amountMinor: number, currency: string) => ({
  amountMinor,
  currency,
});
const metric = (amountMinor: number, currency: string, definition: string) => ({
  amount: money(amountMinor, currency),
  definition,
});

function periodMatches(date: string, start: string, end: string) {
  const value = new Date(date).getTime();
  return value >= new Date(start).getTime() && value <= new Date(end).getTime();
}

export class DemoFinanceRepository implements FinanceRepository {
  async getPlatformDashboard(
    scope: FinanceScope,
    _periodStart: string,
    _periodEnd: string,
  ) {
    const dashboard = structuredClone(DEMO_PLATFORM_FINANCE_DASHBOARD);
    dashboard.scope = scope;
    assertPlatformFinanceInvariants(dashboard);
    return dashboard;
  }

  async getAccountDashboard(accountId: string, _marketCode: string) {
    return createDemoAccountFinanceDashboard(
      accountId,
      "Compte de démonstration",
      "individual",
    );
  }

  async getOrganizationDashboard(accountId: string, _marketCode: string) {
    return createDemoAccountFinanceDashboard(
      accountId,
      "Organisation de démonstration",
      "professional",
    );
  }

  async listTransactions(filters: FinanceTransactionFilters) {
    const normalized = filters.query?.toLocaleLowerCase("fr") ?? "";
    const items = DEMO_FINANCE_TRANSACTIONS.filter((transaction) =>
      periodMatches(
        transaction.occurredAt,
        filters.periodStart,
        filters.periodEnd,
      ),
    ).filter((transaction) => {
      if (
        filters.marketCode !== "ALL" &&
        transaction.marketCode !== filters.marketCode
      )
        return false;
      if (filters.status && transaction.status !== filters.status) return false;
      if (filters.needsReviewOnly && transaction.status !== "needs_review")
        return false;
      if (!normalized) return true;
      return `${transaction.reference} ${transaction.accountLabel} ${transaction.invoiceReference ?? ""}`
        .toLocaleLowerCase("fr")
        .includes(normalized);
    });
    items.forEach(assertBalancedTransaction);
    return financeTransactionPageSchema.parse({
      items: items.slice(0, filters.limit),
      pageInfo: { total: items.length, limit: filters.limit },
    });
  }

  async getTransaction(transactionId: string) {
    return structuredClone(
      DEMO_FINANCE_TRANSACTIONS.find(
        (transaction) => transaction.id === transactionId,
      ) ?? null,
    );
  }

  async listReconciliationCases() {
    return structuredClone([...DEMO_RECONCILIATION_CASES]);
  }
}

type FinanceRow = Record<string, any>;

function mapTransaction(row: FinanceRow): FinanceTransaction {
  return financeTransactionSchema.parse({
    id: row.id,
    reference: row.reference,
    type: row.transaction_type,
    status: row.status,
    accountId: row.account_id ?? "platform",
    accountLabel:
      row.profile?.name ??
      row.organization?.trade_name ??
      row.organization?.legal_name ??
      "Shongre",
    marketCode: row.market_code,
    grossAmount: money(Number(row.gross_amount_minor), row.currency),
    netAmount: money(Number(row.net_amount_minor), row.currency),
    occurredAt: row.occurred_at,
    postedAt: row.posted_at ?? undefined,
    provider: row.provider ?? undefined,
    providerReference: row.provider_reference ?? undefined,
    orderReference: row.order_reference ?? undefined,
    invoiceReference: row.invoice_reference ?? undefined,
    reversalOfTransactionId: row.reversal_of_transaction_id ?? undefined,
    description: row.description,
    entries: (row.finance_ledger_entries ?? []).map((entry: FinanceRow) => ({
      id: String(entry.id),
      accountCode: entry.account_code,
      accountLabel: entry.finance_accounts?.label ?? entry.account_code,
      accountClass: entry.finance_accounts?.account_class ?? "asset",
      side: entry.side,
      amount: money(Number(entry.amount_minor), entry.currency),
    })),
  });
}

function transactionSelect() {
  return `*, profile:profiles!finance_transactions_account_id_fkey(name), organization:organizations!finance_transactions_organization_id_fkey(legal_name,trade_name), finance_ledger_entries(*, finance_accounts(label,account_class))`;
}

export class PostgresFinanceRepository implements FinanceRepository {
  private readonly client = getSupabaseAdminClient() as any;

  async getPlatformDashboard(
    scope: FinanceScope,
    periodStart: string,
    periodEnd: string,
  ) {
    let verticalRevenueQuery = this.client
      .from("finance_vertical_revenue_attribution")
      .select(
        "vertical_id,currency,market_code,net_revenue_minor,revenue_month",
      )
      .eq("currency", scope.currency)
      .gte("revenue_month", periodStart)
      .lte("revenue_month", periodEnd);
    if (scope.marketCode !== "ALL") {
      verticalRevenueQuery = verticalRevenueQuery.eq(
        "market_code",
        scope.marketCode,
      );
    }
    let verticalMetricsQuery = this.client
      .from("monetization_vertical_subscription_metrics")
      .select(
        "vertical_id,currency,market_code,active_trials,paying_subscriptions,cancelled_subscriptions,trials_started,converted_accounts,mrr_minor",
      )
      .eq("currency", scope.currency);
    if (scope.marketCode !== "ALL") {
      verticalMetricsQuery = verticalMetricsQuery.eq(
        "market_code",
        scope.marketCode,
      );
    }
    const [overviewResult, verticalRevenueResult, verticalMetricsResult] =
      await Promise.all([
        this.client.rpc("finance_platform_overview", {
          p_period_start: periodStart.slice(0, 10),
          p_period_end: periodEnd.slice(0, 10),
          p_market_code: scope.marketCode === "ALL" ? null : scope.marketCode,
          p_currency: scope.currency,
        }),
        verticalRevenueQuery,
        verticalMetricsQuery,
      ]);
    const { data, error } = overviewResult;
    if (error) throw error;
    if (verticalRevenueResult.error) throw verticalRevenueResult.error;
    if (verticalMetricsResult.error) throw verticalMetricsResult.error;
    const raw = data as FinanceRow;
    const revenue = Number(raw.platformRevenueMinor ?? 0);
    const source = raw.revenueSources ?? {};
    const sourceItems = [
      [
        "subscriptions",
        "Abonnements Pro",
        Number(source.subscriptionsMinor ?? 0),
      ],
      ["promotions", "Promotions", Number(source.promotionsMinor ?? 0)],
      [
        "advertising",
        "Publicité sponsorisée",
        Number(source.advertisingMinor ?? 0),
      ],
      [
        "commissions",
        "Commissions & frais",
        Number(source.commissionsMinor ?? 0),
      ],
    ] as const;
    const subscriptionHealth = raw.subscriptionHealth ?? {};
    const paidAccounts = Number(subscriptionHealth.paidAccounts ?? 0);
    const cancelled = Number(subscriptionHealth.cancelledSubscriptions ?? 0);
    const mrr = Number(raw.mrrMinor ?? 0);
    const verticalLabels: Record<string, string> = {
      general: "Shongre Pro",
      auto: "Shongre Auto",
      immo: "Shongre Immo",
      emploi: "Shongre Emploi",
      education: "Shongre Education",
      services: "Shongre Services",
    };
    const verticalOrder = [
      "general",
      "auto",
      "immo",
      "emploi",
      "education",
      "services",
    ] as const;
    const verticals = new Map<
      string,
      {
        revenue: number;
        mrr: number;
        activeTrials: number;
        payingSubscriptions: number;
        cancelledSubscriptions: number;
        trialsStarted: number;
        convertedAccounts: number;
      }
    >();
    const verticalMetric = (verticalId: string) => {
      const current = verticals.get(verticalId) ?? {
        revenue: 0,
        mrr: 0,
        activeTrials: 0,
        payingSubscriptions: 0,
        cancelledSubscriptions: 0,
        trialsStarted: 0,
        convertedAccounts: 0,
      };
      verticals.set(verticalId, current);
      return current;
    };
    (verticalRevenueResult.data ?? []).forEach((row: FinanceRow) => {
      verticalMetric(
        normalizeBusinessVerticalCode(row.vertical_id ?? "general"),
      ).revenue += Number(row.net_revenue_minor ?? 0);
    });
    (verticalMetricsResult.data ?? []).forEach((row: FinanceRow) => {
      const current = verticalMetric(
        normalizeBusinessVerticalCode(row.vertical_id ?? "general"),
      );
      current.mrr += Number(row.mrr_minor ?? 0);
      current.activeTrials += Number(row.active_trials ?? 0);
      current.payingSubscriptions += Number(row.paying_subscriptions ?? 0);
      current.cancelledSubscriptions += Number(
        row.cancelled_subscriptions ?? 0,
      );
      current.trialsStarted += Number(row.trials_started ?? 0);
      current.convertedAccounts += Number(row.converted_accounts ?? 0);
    });
    const timeByDate = new Map<
      string,
      { platformRevenue: number; netRevenue: number }
    >();
    (raw.timeSeries ?? []).forEach((point: FinanceRow) => {
      const date = point.report_date;
      const current = timeByDate.get(date) ?? {
        platformRevenue: 0,
        netRevenue: 0,
      };
      const pointRevenue = Number(point.platform_revenue_minor ?? 0);
      current.platformRevenue += pointRevenue;
      current.netRevenue +=
        pointRevenue -
        Number(point.provider_fees_minor ?? 0) -
        Number(point.refunds_minor ?? 0);
      timeByDate.set(date, current);
    });
    const dashboard = platformFinanceDashboardSchema.parse({
      scope,
      asOf: new Date().toISOString(),
      // Current dashboard scopes are rolling windows ending "now"; values may
      // still change through late provider events and reconciliation.
      isPeriodClosed: false,
      metrics: {
        platformRevenue: metric(
          revenue,
          scope.currency,
          "Revenus Shongre reconnus hors TVA et fonds dus aux vendeurs.",
        ),
        netRevenue: metric(
          Number(raw.netRevenueMinor ?? 0),
          scope.currency,
          "Revenus plateforme diminués des frais fournisseurs et remboursements.",
        ),
        gmv: metric(
          Number(raw.gmvMinor ?? 0),
          scope.currency,
          "Valeur brute des transactions marketplace confirmées.",
        ),
        grossCollected: metric(
          Number(raw.grossCollectedMinor ?? 0),
          scope.currency,
          "Sommes brutes encaissées, incluant TVA et fonds vendeurs.",
        ),
        taxCollected: metric(
          Number(raw.taxCollectedMinor ?? 0),
          scope.currency,
          "TVA collectée et due aux administrations fiscales.",
        ),
        sellerPayable: metric(
          Number(raw.sellerPayableMinor ?? 0),
          scope.currency,
          "Montants acquis aux vendeurs mais non encore versés.",
        ),
        outstanding: metric(
          Number(raw.outstandingMinor ?? 0),
          scope.currency,
          "Factures et paiements attendus à la date d’arrêté.",
        ),
        deferredRevenue: metric(
          Number(raw.deferredRevenueMinor ?? 0),
          scope.currency,
          "Encaissements d’abonnement restant à reconnaître sur les périodes futures.",
        ),
        providerFees: metric(
          Number(raw.providerFeesMinor ?? 0),
          scope.currency,
          "Frais des fournisseurs de paiement.",
        ),
        refunds: metric(
          Number(raw.refundsMinor ?? 0),
          scope.currency,
          "Remboursements et avoirs comptabilisés sur la période.",
        ),
        mrr: metric(
          mrr,
          scope.currency,
          "Revenu mensuel récurrent des abonnements actifs.",
        ),
        arr: metric(
          mrr * 12,
          scope.currency,
          "MRR annualisé à situation constante.",
        ),
      },
      revenueSources: sourceItems.map(([key, label, amountMinor]) => ({
        key,
        label,
        amount: money(amountMinor, scope.currency),
        shareBps:
          revenue > 0 ? Math.round((amountMinor / revenue) * 10_000) : 0,
      })),
      timeSeries: [...timeByDate.entries()].map(([date, values]) => ({
        date,
        platformRevenue: money(values.platformRevenue, scope.currency),
        netRevenue: money(values.netRevenue, scope.currency),
      })),
      subscriptionHealth: {
        paidAccounts,
        newSubscriptions: Number(subscriptionHealth.newSubscriptions ?? 0),
        churnBps:
          paidAccounts + cancelled > 0
            ? Math.round((cancelled / (paidAccounts + cancelled)) * 10_000)
            : 0,
        arppu: money(
          paidAccounts > 0 ? Math.round(mrr / paidAccounts) : 0,
          scope.currency,
        ),
      },
      exceptions: [
        {
          key: "failed_payments",
          label: "Paiements échoués",
          count: Number(raw.exceptions?.failedPayments ?? 0),
          severity: "critical",
        },
        {
          key: "reconciliation_gaps",
          label: "Écarts de rapprochement",
          count: Number(raw.exceptions?.reconciliationGaps ?? 0),
          severity: "warning",
        },
        {
          key: "failed_payouts",
          label: "Virements en échec",
          count: Number(raw.exceptions?.failedPayouts ?? 0),
          severity: "critical",
        },
      ],
      markets: (raw.markets ?? []).map((market: FinanceRow) => ({
        marketCode: market.marketCode,
        label:
          market.marketCode === "FR"
            ? "France"
            : market.marketCode === "BE"
              ? "Belgique"
              : market.marketCode,
        platformRevenue: money(
          Number(market.platformRevenueMinor ?? 0),
          scope.currency,
        ),
        netRevenue: money(Number(market.netRevenueMinor ?? 0), scope.currency),
        gmv: money(Number(market.gmvMinor ?? 0), scope.currency),
      })),
      verticals: verticalOrder
        .filter((verticalId) => verticals.has(verticalId))
        .map((verticalId) => {
          const values = verticals.get(verticalId)!;
          return {
            verticalId,
            label: verticalLabels[verticalId],
            revenue: money(values.revenue, scope.currency),
            mrr: money(values.mrr, scope.currency),
            activeTrials: values.activeTrials,
            payingSubscriptions: values.payingSubscriptions,
            cancelledSubscriptions: values.cancelledSubscriptions,
            trialsStarted: values.trialsStarted,
            convertedAccounts: values.convertedAccounts,
            conversionBps:
              values.trialsStarted > 0
                ? Math.min(
                    10_000,
                    Math.round(
                      (values.convertedAccounts / values.trialsStarted) *
                        10_000,
                    ),
                  )
                : 0,
          };
        }),
    });
    assertPlatformFinanceInvariants(dashboard);
    return dashboard;
  }

  private async buildSubjectDashboard(input: {
    subjectId: string;
    label: string;
    kind: "individual" | "professional";
    accountId?: string;
    organizationId?: string;
    marketCode: string;
  }) {
    const marketCode = requireMarketCode(input.marketCode);
    const currency = getCountryConfig(marketCode)!.currency;
    let transactionRequest = this.client
      .from("finance_transactions")
      .select(transactionSelect())
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .eq("market_code", marketCode)
      .limit(100);
    transactionRequest = input.organizationId
      ? transactionRequest.eq("organization_id", input.organizationId)
      : transactionRequest.eq("account_id", input.accountId);

    let payoutRequest = this.client
      .from("finance_payouts")
      .select("amount_minor,status,currency")
      .eq("market_code", marketCode);
    payoutRequest = input.organizationId
      ? payoutRequest.eq("organization_id", input.organizationId)
      : payoutRequest.eq("seller_account_id", input.accountId);

    const [
      { data: transactionRows, error: transactionError },
      { data: payouts, error: payoutError },
    ] = await Promise.all([transactionRequest, payoutRequest]);
    if (transactionError) throw transactionError;
    if (payoutError) throw payoutError;
    const transactions: FinanceTransaction[] = (transactionRows ?? []).map(
      (row: FinanceRow) => mapTransaction(row),
    );
    transactions.forEach(assertBalancedTransaction);
    if (
      transactions.some(
        (transaction) => transaction.grossAmount.currency !== currency,
      )
    )
      throw new Error("Finance transaction currency does not match its market");
    const spending = transactions
      .filter((item) =>
        ["subscription", "promotion", "advertising", "service_fee"].includes(
          item.type,
        ),
      )
      .reduce(
        (sum, item) => sum + Math.max(0, item.grossAmount.amountMinor),
        0,
      );
    const refunded = transactions
      .filter((item) => item.type === "refund")
      .reduce((sum, item) => sum + Math.abs(item.grossAmount.amountMinor), 0);
    const sellerEarnings = transactions
      .flatMap((item) => item.entries)
      .filter((item) => item.accountCode === "4670")
      .reduce(
        (sum, item) =>
          sum +
          (item.side === "credit"
            ? item.amount.amountMinor
            : -item.amount.amountMinor),
        0,
      );
    const pendingPayout = (payouts ?? [])
      .filter((item: FinanceRow) =>
        ["requested", "approved", "processing"].includes(item.status),
      )
      .reduce(
        (sum: number, item: FinanceRow) => sum + Number(item.amount_minor),
        0,
      );
    return accountFinanceDashboardSchema.parse({
      accountId: input.subjectId,
      accountLabel: input.label,
      accountKind: input.kind,
      asOf: new Date().toISOString(),
      metrics: {
        spending: metric(
          spending,
          currency,
          "Achats et abonnements payés à Shongre.",
        ),
        sellerEarnings: metric(
          sellerEarnings,
          currency,
          "Produit net des ventes après commissions et remboursements.",
        ),
        availableForPayout: metric(
          Math.max(0, sellerEarnings - pendingPayout),
          currency,
          "Solde acquis et disponible pour virement.",
        ),
        pendingPayout: metric(
          pendingPayout,
          currency,
          "Virements initiés ou temporairement retenus.",
        ),
        refunded: metric(
          refunded,
          currency,
          "Remboursements reçus ou émis sur la période.",
        ),
      },
      transactions,
    });
  }

  async getAccountDashboard(accountId: string, marketCode: string) {
    const { data: profile, error: profileError } = await this.client
      .from("profiles")
      .select("name,account_family")
      .eq("id", accountId)
      .single();
    if (profileError) throw profileError;
    return this.buildSubjectDashboard({
      subjectId: accountId,
      accountId,
      label: profile.name,
      kind:
        profile.account_family === "professional"
          ? "professional"
          : "individual",
      marketCode,
    });
  }

  async getOrganizationDashboard(accountId: string, marketCode: string) {
    const { data, error } = await this.client
      .from("organization_members")
      .select(
        "role,permissions,organization:organizations!inner(id,legal_name,trade_name)",
      )
      .eq("user_id", accountId)
      .eq("status", "active");
    if (error) throw error;
    const authorized = (data ?? []).find((membership: FinanceRow) => {
      const permissions = Array.isArray(membership.permissions)
        ? membership.permissions
        : [];
      return (
        ["owner", "admin"].includes(membership.role) ||
        permissions.includes("finance.read") ||
        permissions.includes("finance.organization.read.own")
      );
    }) as FinanceRow | undefined;
    if (!authorized) return null;
    const organization = Array.isArray(authorized.organization)
      ? authorized.organization[0]
      : authorized.organization;
    if (!organization?.id) return null;
    return this.buildSubjectDashboard({
      subjectId: organization.id,
      organizationId: organization.id,
      label: organization.trade_name ?? organization.legal_name,
      kind: "professional",
      marketCode,
    });
  }

  async listTransactions(filters: FinanceTransactionFilters) {
    let request = this.client
      .from("finance_transactions")
      .select(transactionSelect(), { count: "exact" })
      .gte("occurred_at", filters.periodStart)
      .lte("occurred_at", filters.periodEnd)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(filters.limit);
    if (filters.marketCode !== "ALL")
      request = request.eq("market_code", filters.marketCode);
    if (filters.status) request = request.eq("status", filters.status);
    if (filters.needsReviewOnly) request = request.eq("status", "needs_review");
    if (filters.query)
      request = request.or(
        `reference.ilike.%${filters.query}%,order_reference.ilike.%${filters.query}%,invoice_reference.ilike.%${filters.query}%`,
      );
    if (filters.cursor) request = request.lt("occurred_at", filters.cursor);
    const { data, error, count } = await request;
    if (error) throw error;
    const items = (data ?? []).map(mapTransaction);
    items.forEach(assertBalancedTransaction);
    return financeTransactionPageSchema.parse({
      items,
      pageInfo: {
        total: count ?? items.length,
        limit: filters.limit,
        nextCursor:
          items.length === filters.limit ? items.at(-1)?.occurredAt : undefined,
      },
    });
  }

  async getTransaction(transactionId: string) {
    const { data, error } = await this.client
      .from("finance_transactions")
      .select(transactionSelect())
      .eq("id", transactionId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapTransaction(data) : null;
  }

  async listReconciliationCases() {
    const { data, error } = await this.client
      .from("finance_reconciliation_cases")
      .select("*")
      .in("status", ["open", "investigating"])
      .order("opened_at", { ascending: true });
    if (error) throw error;
    return (data ?? [])
      .filter((row: FinanceRow) => row.transaction_id)
      .map((row: FinanceRow) =>
        reconciliationCaseSchema.parse({
          id: row.id,
          transactionId: row.transaction_id,
          status: row.status,
          expectedAmount: money(
            Number(row.expected_amount_minor),
            row.currency,
          ),
          actualAmount: money(Number(row.actual_amount_minor), row.currency),
          difference: money(Number(row.difference_minor), row.currency),
          reason: row.reason,
          openedAt: row.opened_at,
          resolvedAt: row.resolved_at ?? undefined,
        }),
      );
  }
}
