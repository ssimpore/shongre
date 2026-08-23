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
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";

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
  getAccountDashboard(accountId: string): Promise<AccountFinanceDashboard>;
  getOrganizationDashboard(accountId: string): Promise<AccountFinanceDashboard | null>;
  listTransactions(filters: FinanceTransactionFilters): Promise<FinanceTransactionPage>;
  getTransaction(transactionId: string): Promise<FinanceTransaction | null>;
  listReconciliationCases(): Promise<ReconciliationCase[]>;
}

const money = (amountMinor: number, currency: string) => ({ amountMinor, currency });
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

  async getAccountDashboard(accountId: string) {
    return createDemoAccountFinanceDashboard(accountId, "Compte de démonstration", "individual");
  }

  async getOrganizationDashboard(accountId: string) {
    return createDemoAccountFinanceDashboard(accountId, "Organisation de démonstration", "professional");
  }

  async listTransactions(filters: FinanceTransactionFilters) {
    const normalized = filters.query?.toLocaleLowerCase("fr") ?? "";
    const items = DEMO_FINANCE_TRANSACTIONS.filter((transaction) =>
      periodMatches(transaction.occurredAt, filters.periodStart, filters.periodEnd),
    ).filter((transaction) => {
      if (filters.marketCode !== "ALL" && transaction.marketCode !== filters.marketCode) return false;
      if (filters.status && transaction.status !== filters.status) return false;
      if (filters.needsReviewOnly && transaction.status !== "needs_review") return false;
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
      DEMO_FINANCE_TRANSACTIONS.find((transaction) => transaction.id === transactionId) ?? null,
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
    accountLabel: row.profile?.name ?? row.organization?.trade_name ?? row.organization?.legal_name ?? "Shongre",
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

  async getPlatformDashboard(scope: FinanceScope, periodStart: string, periodEnd: string) {
    const { data, error } = await this.client.rpc("finance_platform_overview", {
      p_period_start: periodStart.slice(0, 10),
      p_period_end: periodEnd.slice(0, 10),
      p_market_code: scope.marketCode === "ALL" ? null : scope.marketCode,
      p_currency: scope.currency,
    });
    if (error) throw error;
    const raw = data as FinanceRow;
    const revenue = Number(raw.platformRevenueMinor ?? 0);
    const source = raw.revenueSources ?? {};
    const sourceItems = [
      ["subscriptions", "Abonnements Pro", Number(source.subscriptionsMinor ?? 0)],
      ["promotions", "Promotions", Number(source.promotionsMinor ?? 0)],
      ["advertising", "Publicité sponsorisée", Number(source.advertisingMinor ?? 0)],
      ["commissions", "Commissions & frais", Number(source.commissionsMinor ?? 0)],
    ] as const;
    const subscriptionHealth = raw.subscriptionHealth ?? {};
    const paidAccounts = Number(subscriptionHealth.paidAccounts ?? 0);
    const cancelled = Number(subscriptionHealth.cancelledSubscriptions ?? 0);
    const mrr = Number(raw.mrrMinor ?? 0);
    const timeByDate = new Map<string, { platformRevenue: number; netRevenue: number }>();
    (raw.timeSeries ?? []).forEach((point: FinanceRow) => {
      const date = point.report_date;
      const current = timeByDate.get(date) ?? { platformRevenue: 0, netRevenue: 0 };
      const pointRevenue = Number(point.platform_revenue_minor ?? 0);
      current.platformRevenue += pointRevenue;
      current.netRevenue += pointRevenue - Number(point.provider_fees_minor ?? 0) - Number(point.refunds_minor ?? 0);
      timeByDate.set(date, current);
    });
    const dashboard = platformFinanceDashboardSchema.parse({
      scope,
      asOf: new Date().toISOString(),
      // Current dashboard scopes are rolling windows ending "now"; values may
      // still change through late provider events and reconciliation.
      isPeriodClosed: false,
      metrics: {
        platformRevenue: metric(revenue, scope.currency, "Revenus Shongre reconnus hors TVA et fonds dus aux vendeurs."),
        netRevenue: metric(Number(raw.netRevenueMinor ?? 0), scope.currency, "Revenus plateforme diminués des frais fournisseurs et remboursements."),
        gmv: metric(Number(raw.gmvMinor ?? 0), scope.currency, "Valeur brute des transactions marketplace confirmées."),
        grossCollected: metric(Number(raw.grossCollectedMinor ?? 0), scope.currency, "Sommes brutes encaissées, incluant TVA et fonds vendeurs."),
        taxCollected: metric(Number(raw.taxCollectedMinor ?? 0), scope.currency, "TVA collectée et due aux administrations fiscales."),
        sellerPayable: metric(Number(raw.sellerPayableMinor ?? 0), scope.currency, "Montants acquis aux vendeurs mais non encore versés."),
        outstanding: metric(Number(raw.outstandingMinor ?? 0), scope.currency, "Factures et paiements attendus à la date d’arrêté."),
        deferredRevenue: metric(Number(raw.deferredRevenueMinor ?? 0), scope.currency, "Encaissements d’abonnement restant à reconnaître sur les périodes futures."),
        providerFees: metric(Number(raw.providerFeesMinor ?? 0), scope.currency, "Frais des fournisseurs de paiement."),
        refunds: metric(Number(raw.refundsMinor ?? 0), scope.currency, "Remboursements et avoirs comptabilisés sur la période."),
        mrr: metric(mrr, scope.currency, "Revenu mensuel récurrent des abonnements actifs."),
        arr: metric(mrr * 12, scope.currency, "MRR annualisé à situation constante."),
      },
      revenueSources: sourceItems.map(([key, label, amountMinor]) => ({
        key,
        label,
        amount: money(amountMinor, scope.currency),
        shareBps: revenue > 0 ? Math.round((amountMinor / revenue) * 10_000) : 0,
      })),
      timeSeries: [...timeByDate.entries()].map(([date, values]) => ({
        date,
        platformRevenue: money(values.platformRevenue, scope.currency),
        netRevenue: money(values.netRevenue, scope.currency),
      })),
      subscriptionHealth: {
        paidAccounts,
        newSubscriptions: Number(subscriptionHealth.newSubscriptions ?? 0),
        churnBps: paidAccounts + cancelled > 0 ? Math.round((cancelled / (paidAccounts + cancelled)) * 10_000) : 0,
        arppu: money(paidAccounts > 0 ? Math.round(mrr / paidAccounts) : 0, scope.currency),
      },
      exceptions: [
        { key: "failed_payments", label: "Paiements échoués", count: Number(raw.exceptions?.failedPayments ?? 0), severity: "critical" },
        { key: "reconciliation_gaps", label: "Écarts de rapprochement", count: Number(raw.exceptions?.reconciliationGaps ?? 0), severity: "warning" },
        { key: "failed_payouts", label: "Virements en échec", count: Number(raw.exceptions?.failedPayouts ?? 0), severity: "critical" },
      ],
      markets: (raw.markets ?? []).map((market: FinanceRow) => ({
        marketCode: market.marketCode,
        label: market.marketCode === "FR" ? "France" : market.marketCode === "BE" ? "Belgique" : market.marketCode,
        platformRevenue: money(Number(market.platformRevenueMinor ?? 0), scope.currency),
        netRevenue: money(Number(market.netRevenueMinor ?? 0), scope.currency),
        gmv: money(Number(market.gmvMinor ?? 0), scope.currency),
      })),
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
  }) {
    let transactionRequest = this.client.from("finance_transactions")
      .select(transactionSelect())
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(100);
    transactionRequest = input.organizationId
      ? transactionRequest.eq("organization_id", input.organizationId)
      : transactionRequest.eq("account_id", input.accountId);

    let payoutRequest = this.client.from("finance_payouts")
      .select("amount_minor,status,currency");
    payoutRequest = input.organizationId
      ? payoutRequest.eq("organization_id", input.organizationId)
      : payoutRequest.eq("seller_account_id", input.accountId);

    const [{ data: transactionRows, error: transactionError }, { data: payouts, error: payoutError }] = await Promise.all([
      transactionRequest,
      payoutRequest,
    ]);
    if (transactionError) throw transactionError;
    if (payoutError) throw payoutError;
    const transactions: FinanceTransaction[] = (transactionRows ?? []).map(
      (row: FinanceRow) => mapTransaction(row),
    );
    transactions.forEach(assertBalancedTransaction);
    const currency = transactions[0]?.grossAmount.currency ?? "EUR";
    const spending = transactions.filter((item) => ["subscription", "promotion", "advertising", "service_fee"].includes(item.type)).reduce((sum, item) => sum + Math.max(0, item.grossAmount.amountMinor), 0);
    const refunded = transactions.filter((item) => item.type === "refund").reduce((sum, item) => sum + Math.abs(item.grossAmount.amountMinor), 0);
    const sellerEarnings = transactions.flatMap((item) => item.entries).filter((item) => item.accountCode === "4670").reduce((sum, item) => sum + (item.side === "credit" ? item.amount.amountMinor : -item.amount.amountMinor), 0);
    const pendingPayout = (payouts ?? []).filter((item: FinanceRow) => ["requested", "approved", "processing"].includes(item.status)).reduce((sum: number, item: FinanceRow) => sum + Number(item.amount_minor), 0);
    return accountFinanceDashboardSchema.parse({
      accountId: input.subjectId,
      accountLabel: input.label,
      accountKind: input.kind,
      asOf: new Date().toISOString(),
      metrics: {
        spending: metric(spending, currency, "Achats et abonnements payés à Shongre."),
        sellerEarnings: metric(sellerEarnings, currency, "Produit net des ventes après commissions et remboursements."),
        availableForPayout: metric(Math.max(0, sellerEarnings - pendingPayout), currency, "Solde acquis et disponible pour virement."),
        pendingPayout: metric(pendingPayout, currency, "Virements initiés ou temporairement retenus."),
        refunded: metric(refunded, currency, "Remboursements reçus ou émis sur la période."),
      },
      transactions,
    });
  }

  async getAccountDashboard(accountId: string) {
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
      kind: profile.account_family === "professional" ? "professional" : "individual",
    });
  }

  async getOrganizationDashboard(accountId: string) {
    const { data, error } = await this.client
      .from("organization_members")
      .select("role,permissions,organization:organizations!inner(id,legal_name,trade_name)")
      .eq("user_id", accountId)
      .eq("status", "active");
    if (error) throw error;
    const authorized = (data ?? []).find((membership: FinanceRow) => {
      const permissions = Array.isArray(membership.permissions) ? membership.permissions : [];
      return ["owner", "admin"].includes(membership.role)
        || permissions.includes("finance.read")
        || permissions.includes("finance.organization.read.own");
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
    });
  }

  async listTransactions(filters: FinanceTransactionFilters) {
    let request = this.client.from("finance_transactions").select(transactionSelect(), { count: "exact" })
      .gte("occurred_at", filters.periodStart).lte("occurred_at", filters.periodEnd)
      .order("occurred_at", { ascending: false }).order("id", { ascending: false }).limit(filters.limit);
    if (filters.marketCode !== "ALL") request = request.eq("market_code", filters.marketCode);
    if (filters.status) request = request.eq("status", filters.status);
    if (filters.needsReviewOnly) request = request.eq("status", "needs_review");
    if (filters.query) request = request.or(`reference.ilike.%${filters.query}%,order_reference.ilike.%${filters.query}%,invoice_reference.ilike.%${filters.query}%`);
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
        nextCursor: items.length === filters.limit ? items.at(-1)?.occurredAt : undefined,
      },
    });
  }

  async getTransaction(transactionId: string) {
    const { data, error } = await this.client.from("finance_transactions").select(transactionSelect()).eq("id", transactionId).maybeSingle();
    if (error) throw error;
    return data ? mapTransaction(data) : null;
  }

  async listReconciliationCases() {
    const { data, error } = await this.client.from("finance_reconciliation_cases").select("*").in("status", ["open", "investigating"]).order("opened_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).filter((row: FinanceRow) => row.transaction_id).map((row: FinanceRow) => reconciliationCaseSchema.parse({
      id: row.id,
      transactionId: row.transaction_id,
      status: row.status,
      expectedAmount: money(Number(row.expected_amount_minor), row.currency),
      actualAmount: money(Number(row.actual_amount_minor), row.currency),
      difference: money(Number(row.difference_minor), row.currency),
      reason: row.reason,
      openedAt: row.opened_at,
      resolvedAt: row.resolved_at ?? undefined,
    }));
  }
}
