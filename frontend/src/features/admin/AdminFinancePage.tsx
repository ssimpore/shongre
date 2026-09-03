import { PAGE_SIZES } from "../../configuration/pagination.config";
import { Select } from "../../design-system";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  FinanceMetric,
  FinanceScope,
  FinanceTransaction,
  FinanceTransactionStatus,
  PlatformFinanceDashboard,
  ReconciliationCase,
} from "@shongre/contracts/finance";
import type { CommissionAnalyticsRow } from "@shongre/contracts/monetization";
import { MONETIZATION_ADMIN_CONSTRAINTS } from "@shongre/contracts/monetization";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  FileCheck2,
  Filter,
  Landmark,
  LoaderCircle,
  ReceiptText,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
} from "lucide-react";
import { services } from "../../api/client/service-registry";
import { Button } from "../../design-system/primitives/Button";
import { ScrollableRegion } from "../../design-system/primitives/ScrollableRegion";
import { StatePanel } from "../../design-system/primitives/StatePanel";
import { ProgressBar } from "../../design-system/primitives/ProgressBar";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useAuthorization } from "../../security/useAuthorization";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { FinanceRevenueTrendChart } from "./FinanceRevenueTrendChart";
import { useTranslation } from "../../i18n/I18nProvider";

type FinanceTab =
  "overview" | "transactions" | "reconciliation" | "subscriptions";

const TABS: readonly { id: FinanceTab; label: string }[] = [
  { id: "overview", label: "Vue d’ensemble" },
  { id: "transactions", label: "Transactions" },
  { id: "reconciliation", label: "Rapprochement" },
  { id: "subscriptions", label: "Abonnements" },
];

const TYPE_LABELS: Record<FinanceTransaction["type"], string> = {
  subscription: "Abonnement Pro",
  promotion: "Promotion À la une",
  advertising: "Publicité sponsorisée",
  commission: "Commission commande",
  service_fee: "Frais de service",
  marketplace_sale: "Vente marketplace",
  refund: "Remboursement",
  credit_note: "Avoir",
  provider_fee: "Frais fournisseur",
  seller_payout: "Virement vendeur",
  chargeback: "Rétrofacturation",
  revenue_recognition: "Reconnaissance du revenu",
  adjustment: "Ajustement",
};

const STATUS_LABELS: Record<FinanceTransactionStatus, string> = {
  pending: "En attente",
  posted: "Comptabilisé",
  reconciled: "Rapproché",
  needs_review: "À rapprocher",
  refunded: "Remboursé",
  failed: "Échec",
  reversed: "Contrepassé",
};

const STATUS_STYLES: Record<FinanceTransactionStatus, string> = {
  pending: "border-info-border bg-info-surface text-info",
  posted: "border-success-border bg-success-surface text-success",
  reconciled: "border-success-border bg-success-surface text-success",
  needs_review: "border-warning-border bg-warning-surface text-warning",
  refunded: "border-danger-border bg-danger-surface text-danger",
  failed: "border-danger-border bg-danger-surface text-danger",
  reversed: "border-border-base bg-bg-subtle text-text-secondary",
};

function downloadTextFile(fileName: string, mimeType: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function StatusPill({ status }: { status: FinanceTransactionStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-2 py-1 text-micro font-bold ${STATUS_STYLES[status]}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-pill bg-current"
        aria-hidden="true"
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

function MetricCard({
  label,
  metric,
  icon: Icon,
}: {
  label: string;
  metric: FinanceMetric;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const { formatMoney, formatPercentFromBps } = useRegionalFormatters();
  const change = metric.changeBps;
  const positive = (change ?? 0) >= 0;
  return (
    <article className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-secondary">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-text-main sm:text-2xl">
            {formatMoney(metric.amount)}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-light text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      {change !== undefined && (
        <p
          className={`mt-2 flex items-center gap-1 text-xs font-bold ${positive ? "text-success" : "text-danger"}`}
        >
          {positive ? (
            <ArrowUpRight className="h-icon-sm w-icon-sm" />
          ) : (
            <ArrowDownRight className="h-icon-sm w-icon-sm" />
          )}
          {formatPercentFromBps(Math.abs(change), 1)}
          <span className="font-normal text-text-muted">
            vs période précédente
          </span>
        </p>
      )}
      <p className="mt-2 text-micro leading-relaxed text-text-muted">
        {metric.definition}
      </p>
    </article>
  );
}

function RevenueSources({
  dashboard,
}: {
  dashboard: PlatformFinanceDashboard;
}) {
  const { formatMoney, formatPercentFromBps } = useRegionalFormatters();
  return (
    <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
      <h2 className="text-sm font-bold text-text-main">Sources de revenus</h2>
      <div className="mt-4 space-y-3">
        {dashboard.revenueSources.map((source) => (
          <div key={source.key}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-text-main">
                {source.label}
              </span>
              <span className="shrink-0 font-bold text-text-main">
                {formatMoney(source.amount)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <ProgressBar
                className="flex-1"
                value={source.shareBps}
                max={MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max}
                label={`Part de ${source.label}`}
              />
              <span className="w-10 text-right text-micro text-text-muted">
                {formatPercentFromBps(source.shareBps, 1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommissionAnalytics({
  rows,
  currency,
}: {
  rows: CommissionAnalyticsRow[];
  currency: string;
}) {
  const { formatMoneyMinor, formatNumber, formatPercentFromBps } =
    useRegionalFormatters();
  const totals = rows.reduce(
    (sum, row) => ({
      transactions: sum.transactions + row.transactionCount,
      gmvMinor: sum.gmvMinor + row.gmvMinor,
      grossMinor: sum.grossMinor + row.grossCommissionMinor,
      discountsMinor: sum.discountsMinor + row.commissionDiscountMinor,
      revenueMinor: sum.revenueMinor + row.commissionRevenueMinor,
      refundsMinor: sum.refundsMinor + row.commissionRefundMinor,
    }),
    {
      transactions: 0,
      gmvMinor: 0,
      grossMinor: 0,
      discountsMinor: 0,
      revenueMinor: 0,
      refundsMinor: 0,
    },
  );
  const netMinor = totals.revenueMinor - totals.refundsMinor;
  const takeRateBps =
    totals.gmvMinor > 0 ? Math.round((netMinor * 10_000) / totals.gmvMinor) : 0;
  const amount = (amountMinor: number) =>
    formatMoneyMinor(amountMinor, currency);

  return (
    <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
      <div>
        <h2 className="text-sm font-bold text-text-main">
          Économie des commissions
        </h2>
        <p className="mt-1 text-micro text-text-muted">
          GMV éligible et revenu de commission restent séparés. Les montants
          proviennent des snapshots comptabilisés et de leurs contrepassations.
        </p>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["GMV éligible", amount(totals.gmvMinor)],
          ["Commission brute", amount(totals.grossMinor)],
          ["Remises / exonérations", amount(totals.discountsMinor)],
          ["Remboursements", amount(totals.refundsMinor)],
          ["Revenu net commission", amount(netMinor)],
          ["Take rate effectif", formatPercentFromBps(takeRateBps, 1)],
          [
            "Moyenne / transaction",
            amount(
              totals.transactions > 0
                ? Math.round(netMinor / totals.transactions)
                : 0,
            ),
          ],
          ["Transactions", formatNumber(totals.transactions)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-control bg-bg-subtle p-3">
            <dt className="text-micro font-semibold uppercase tracking-wide text-text-secondary">
              {label}
            </dt>
            <dd className="mt-1 text-base font-bold text-text-main">{value}</dd>
          </div>
        ))}
      </dl>
      {rows.length > 0 && (
        <ScrollableRegion
          aria-label="Commissions par verticale, catégorie et forfait"
          className="mt-4 rounded-control border border-border-base"
        >
          <table className="w-full min-w-180 text-left text-xs">
            <thead className="bg-bg-subtle text-micro uppercase text-text-secondary">
              <tr>
                <th className="px-3 py-2">Verticale / catégorie</th>
                <th className="px-3 py-2">Forfait</th>
                <th className="px-3 py-2 text-right">GMV</th>
                <th className="px-3 py-2 text-right">Revenu net</th>
                <th className="px-3 py-2 text-right">Take rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((row) => {
                const rowNet =
                  row.commissionRevenueMinor - row.commissionRefundMinor;
                const rowTakeRate =
                  row.gmvMinor > 0
                    ? Math.round((rowNet * 10_000) / row.gmvMinor)
                    : 0;
                return (
                  <tr
                    key={`${row.date}:${row.marketCode}:${row.verticalId || "all"}:${row.categoryId || "all"}:${row.planId || "all"}`}
                  >
                    <th className="px-3 py-3 font-bold text-text-main">
                      {row.verticalId || "Toutes"} ·{" "}
                      {row.categoryId || "Toutes"}
                    </th>
                    <td className="px-3 py-3">{row.planId || "Tous"}</td>
                    <td className="px-3 py-3 text-right">
                      {amount(row.gmvMinor)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">
                      {amount(rowNet)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-success">
                      {formatPercentFromBps(rowTakeRate, 1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollableRegion>
      )}
    </section>
  );
}

function OverviewTab({
  dashboard,
  commissionAnalytics,
}: {
  dashboard: PlatformFinanceDashboard;
  commissionAnalytics: CommissionAnalyticsRow[];
}) {
  const { formatMoney, formatPercentFromBps } = useRegionalFormatters();
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revenus plateforme"
          metric={dashboard.metrics.platformRevenue}
          icon={BarChart3}
        />
        <MetricCard
          label="Revenus nets"
          metric={dashboard.metrics.netRevenue}
          icon={WalletCards}
        />
        <MetricCard
          label="MRR"
          metric={dashboard.metrics.mrr}
          icon={RefreshCw}
        />
        <MetricCard
          label="GMV"
          metric={dashboard.metrics.gmv}
          icon={CircleDollarSign}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
        {[
          ["Encaissements bruts", dashboard.metrics.grossCollected],
          ["TVA collectée", dashboard.metrics.taxCollected],
          ["Dette vendeurs", dashboard.metrics.sellerPayable],
          ["Encours", dashboard.metrics.outstanding],
          ["Revenus différés", dashboard.metrics.deferredRevenue],
          ["Frais fournisseurs", dashboard.metrics.providerFees],
          ["Remboursements", dashboard.metrics.refunds],
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="rounded-card border border-border-base bg-bg-surface px-4 py-3 shadow-xs"
          >
            <p className="text-micro font-semibold uppercase tracking-wide text-text-muted">
              {label as string}
            </p>
            <p className="mt-1 text-base font-bold text-text-main">
              {formatMoney((value as FinanceMetric).amount)}
            </p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <FinanceRevenueTrendChart
          currency={dashboard.scope.currency}
          timeSeries={dashboard.timeSeries}
        />
        <RevenueSources dashboard={dashboard} />
      </div>
      <CommissionAnalytics
        rows={commissionAnalytics}
        currency={dashboard.scope.currency}
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
          <h2 className="text-sm font-bold text-text-main">
            Santé des abonnements
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-micro text-text-muted">Comptes payants</dt>
              <dd className="text-lg font-bold">
                {dashboard.subscriptionHealth.paidAccounts}
              </dd>
            </div>
            <div>
              <dt className="text-micro text-text-muted">Nouveaux</dt>
              <dd className="text-lg font-bold text-success">
                +{dashboard.subscriptionHealth.newSubscriptions}
              </dd>
            </div>
            <div>
              <dt className="text-micro text-text-muted">Attrition</dt>
              <dd className="text-lg font-bold">
                {formatPercentFromBps(dashboard.subscriptionHealth.churnBps, 1)}
              </dd>
            </div>
            <div>
              <dt className="text-micro text-text-muted">ARPPU</dt>
              <dd className="text-lg font-bold">
                {formatMoney(dashboard.subscriptionHealth.arppu)}
              </dd>
            </div>
          </dl>
        </section>
        <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-text-main">
              Exceptions opérationnelles
            </h2>
            <span className="rounded-pill bg-danger-surface px-2 py-0.5 text-micro font-bold text-danger">
              {dashboard.exceptions.reduce((sum, item) => sum + item.count, 0)}
            </span>
          </div>
          <ul className="mt-3 divide-y divide-border-subtle">
            {dashboard.exceptions.map((item) => (
              <li
                key={item.key}
                className="flex items-center justify-between gap-3 py-2 text-xs"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <AlertTriangle
                    className={`h-icon-md w-icon-md ${item.severity === "warning" ? "text-warning" : "text-danger"}`}
                  />
                  {item.count} {item.label.toLocaleLowerCase("fr")}
                </span>
                <ChevronRight className="h-icon-md w-icon-md text-text-muted" />
              </li>
            ))}
          </ul>
        </section>
        <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
          <h2 className="px-4 pt-4 text-sm font-bold text-text-main">
            Par marché
          </h2>
          <ScrollableRegion
            aria-label="Résultats financiers par marché"
            className="mt-2"
          >
            <table className="w-full min-w-105 text-left text-xs">
              <thead className="bg-bg-subtle text-micro uppercase text-text-secondary">
                <tr>
                  <th className="px-4 py-2">Marché</th>
                  <th className="px-3 py-2">Revenus</th>
                  <th className="px-3 py-2">Nets</th>
                  <th className="px-3 py-2">GMV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {dashboard.markets.map((market) => (
                  <tr key={market.marketCode}>
                    <th className="px-4 py-3 font-bold">
                      {market.marketCode} · {market.label}
                    </th>
                    <td className="px-3 py-3">
                      {formatMoney(market.platformRevenue)}
                    </td>
                    <td className="px-3 py-3">
                      {formatMoney(market.netRevenue)}
                    </td>
                    <td className="px-3 py-3">{formatMoney(market.gmv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableRegion>
        </section>
      </div>
    </div>
  );
}

function TransactionDetail({
  transaction,
  reconciliation,
}: {
  transaction: FinanceTransaction;
  reconciliation?: ReconciliationCase;
}) {
  const { formatDate, formatMoney } = useRegionalFormatters();
  const debitMinor = transaction.entries
    .filter((item) => item.side === "debit")
    .reduce((sum, item) => sum + item.amount.amountMinor, 0);
  const creditMinor = transaction.entries
    .filter((item) => item.side === "credit")
    .reduce((sum, item) => sum + item.amount.amountMinor, 0);
  return (
    <aside
      className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
      aria-label={`Détail ${transaction.reference}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-text-main">{transaction.reference}</h2>
          <p className="mt-1 text-micro text-text-muted">
            {transaction.description}
          </p>
        </div>
        <StatusPill status={transaction.status} />
      </div>
      <dl className="mt-4 grid grid-cols-label-value gap-x-3 gap-y-2 border-b border-border-subtle pb-4 text-xs">
        <dt className="text-text-muted">Type</dt>
        <dd className="font-semibold">{TYPE_LABELS[transaction.type]}</dd>
        <dt className="text-text-muted">Marché</dt>
        <dd>
          {transaction.marketCode} · {transaction.netAmount.currency}
        </dd>
        <dt className="text-text-muted">Acteur</dt>
        <dd>{transaction.accountLabel}</dd>
        <dt className="text-text-muted">Commande</dt>
        <dd>{transaction.orderReference || "—"}</dd>
        <dt className="text-text-muted">Fournisseur</dt>
        <dd>
          {transaction.provider || "Interne"} ·{" "}
          {transaction.providerReference || "—"}
        </dd>
        <dt className="text-text-muted">Horodatage</dt>
        <dd>
          {formatDate(transaction.occurredAt, {
            dateStyle: "medium",
            timeStyle: "medium",
          })}
        </dd>
      </dl>
      <h3 className="mt-4 text-xs font-bold text-text-main">
        Écriture comptable
      </h3>
      <ScrollableRegion
        aria-label="Écriture comptable en partie double"
        className="mt-2 rounded-control border border-border-base"
      >
        <table className="w-full min-w-90 text-left text-micro">
          <thead className="bg-bg-subtle text-text-secondary">
            <tr>
              <th className="px-2 py-2">Compte</th>
              <th className="px-2 py-2 text-right">Débit</th>
              <th className="px-2 py-2 text-right">Crédit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {transaction.entries.map((item) => (
              <tr key={item.id}>
                <td className="px-2 py-2">{item.accountLabel}</td>
                <td className="px-2 py-2 text-right">
                  {item.side === "debit" ? formatMoney(item.amount) : "—"}
                </td>
                <td className="px-2 py-2 text-right">
                  {item.side === "credit" ? formatMoney(item.amount) : "—"}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="px-2 py-2">Total</td>
              <td className="px-2 py-2 text-right">
                {formatMoney({
                  amountMinor: debitMinor,
                  currency: transaction.netAmount.currency,
                })}
              </td>
              <td className="px-2 py-2 text-right">
                {formatMoney({
                  amountMinor: creditMinor,
                  currency: transaction.netAmount.currency,
                })}
              </td>
            </tr>
          </tbody>
        </table>
      </ScrollableRegion>
      <p className="mt-2 flex items-center gap-1 text-micro font-bold text-success">
        <CheckCircle2 className="h-icon-sm w-icon-sm" />
        Écriture équilibrée
      </p>
      {reconciliation && (
        <div className="mt-4 border-t border-border-subtle pt-4">
          <h3 className="text-xs font-bold">Écart de rapprochement</h3>
          <div className="mt-2 rounded-control border border-warning-border bg-warning-surface p-3 text-xs text-warning">
            <p>{reconciliation.reason}</p>
            <div className="mt-2 flex justify-between font-bold">
              <span>
                Attendu {formatMoney(reconciliation.expectedAmount)} · reçu{" "}
                {formatMoney(reconciliation.actualAmount)}
              </span>
              <span>Écart {formatMoney(reconciliation.difference)}</span>
            </div>
          </div>
          <p className="mt-3 flex gap-1.5 text-micro text-text-muted">
            <ShieldCheck className="h-icon-sm w-icon-sm shrink-0" />
            Toute correction crée une nouvelle écriture. L’original reste
            immuable. Les ajustements nécessitent une double approbation et sont
            traités hors de cette vue.
          </p>
        </div>
      )}
    </aside>
  );
}

function TransactionsTab({
  transactions,
  selected,
  onSelect,
  reconciliation,
}: {
  transactions: FinanceTransaction[];
  selected: FinanceTransaction | null;
  onSelect: (item: FinanceTransaction) => void;
  reconciliation?: ReconciliationCase;
}) {
  const { formatDateTime, formatMoney } = useRegionalFormatters();
  return (
    <div className="grid gap-4 xl:grid-cols-finance-content-aside">
      <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
        <div className="flex items-center justify-between border-b border-border-base px-4 py-3">
          <h2 className="text-sm font-bold">1 248 transactions</h2>
          <span className="text-micro text-text-muted">
            1–{transactions.length} affichées
          </span>
        </div>
        <ScrollableRegion
          aria-label="Transactions de la plateforme"
          className="hidden md:block"
        >
          <table className="w-full min-w-205 text-left text-xs">
            <thead className="bg-bg-subtle text-micro uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Référence</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Compte</th>
                <th className="px-3 py-2">Marché</th>
                <th className="px-3 py-2 text-right">Brut</th>
                <th className="px-3 py-2 text-right">Net</th>
                <th className="px-3 py-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {transactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className={
                    selected?.id === transaction.id
                      ? "bg-warning-surface/60"
                      : "hover:bg-bg-subtle"
                  }
                >
                  <td className="px-3 py-3">
                    {formatDateTime(transaction.occurredAt)}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      className="font-mono text-micro font-semibold text-text-main hover:text-primary"
                      onClick={() => onSelect(transaction)}
                    >
                      {transaction.reference}
                    </button>
                  </td>
                  <td className="px-3 py-3 font-semibold">
                    {TYPE_LABELS[transaction.type]}
                  </td>
                  <td className="px-3 py-3">{transaction.accountLabel}</td>
                  <td className="px-3 py-3">{transaction.marketCode}</td>
                  <td className="px-3 py-3 text-right">
                    {formatMoney(transaction.grossAmount)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {formatMoney(transaction.netAmount)}
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill status={transaction.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableRegion>
        <div className="divide-y divide-border-subtle md:hidden">
          {transactions.map((transaction) => (
            <button
              key={transaction.id}
              onClick={() => onSelect(transaction)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-bg-subtle"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold">
                  {TYPE_LABELS[transaction.type]} · {transaction.accountLabel}
                </span>
                <span className="mt-1 block font-mono text-micro text-text-muted">
                  {transaction.reference} · {transaction.marketCode}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xs font-bold">
                  {formatMoney(transaction.netAmount)}
                </span>
                <span className="mt-1 block">
                  <StatusPill status={transaction.status} />
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
      {selected && (
        <TransactionDetail
          transaction={selected}
          reconciliation={reconciliation}
        />
      )}
    </div>
  );
}

function ReconciliationTab({
  cases,
  transactions,
  onOpen,
}: {
  cases: ReconciliationCase[];
  transactions: FinanceTransaction[];
  onOpen: (transaction: FinanceTransaction) => void;
}) {
  const { currentCurrency, formatDateTime, formatMoney } =
    useRegionalFormatters();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs lg:col-span-2">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-icon-lg w-icon-lg text-warning" />
          <h2 className="text-sm font-bold">Écarts ouverts</h2>
        </div>
        <div className="mt-4 space-y-3">
          {cases.map((item) => {
            const transaction = transactions.find(
              (candidate) => candidate.id === item.transactionId,
            );
            return (
              <article
                key={item.id}
                className="flex flex-col gap-3 rounded-control border border-warning-border bg-warning-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-text-main">
                    {transaction?.reference ?? item.transactionId}
                  </p>
                  <p className="mt-1 text-xs text-warning">{item.reason}</p>
                  <p className="mt-1 text-micro text-text-muted">
                    Ouvert le {formatDateTime(item.openedAt)} · écart{" "}
                    {formatMoney(item.difference)}
                  </p>
                </div>
                {transaction && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpen(transaction)}
                  >
                    Examiner
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
        <Landmark className="h-icon-lg w-icon-lg text-success" />
        <h2 className="mt-3 text-sm font-bold">Contrôle fournisseur</h2>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary">
          Chaque événement fournisseur est rapproché de son paiement, de sa
          facture et de l’écriture comptable attendue.
        </p>
        <dl className="mt-4 space-y-3 text-xs">
          <div className="flex justify-between">
            <dt>Écarts ouverts</dt>
            <dd className="font-bold">
              {cases.filter((item) => item.status === "open").length}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>Impact net</dt>
            <dd className="font-bold">
              {formatMoney({
                amountMinor: cases.reduce(
                  (sum, item) => sum + item.difference.amountMinor,
                  0,
                ),
                currency: cases[0]?.difference.currency || currentCurrency,
              })}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function SubscriptionsTab({
  dashboard,
}: {
  dashboard: PlatformFinanceDashboard;
}) {
  const { currentCurrency, formatMoney, formatPercentFromBps } =
    useRegionalFormatters();
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="MRR"
          metric={dashboard.metrics.mrr}
          icon={RefreshCw}
        />
        <MetricCard
          label="ARR"
          metric={dashboard.metrics.arr}
          icon={BarChart3}
        />
        <MetricCard
          label="Revenus d’abonnement"
          metric={{
            amount: dashboard.revenueSources[0]?.amount ?? {
              amountMinor: 0,
              currency: currentCurrency,
            },
            definition: "Abonnements reconnus sur la période.",
          }}
          icon={CreditCard}
        />
        <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
          <ReceiptText className="h-icon-lg w-icon-lg text-primary" />
          <h2 className="mt-3 text-sm font-bold">Portefeuille actif</h2>
          <p className="mt-1 text-2xl font-bold">
            {dashboard.subscriptionHealth.paidAccounts}
          </p>
          <p className="mt-2 text-xs text-text-secondary">
            {dashboard.subscriptionHealth.newSubscriptions} nouveaux · attrition{" "}
            {formatPercentFromBps(dashboard.subscriptionHealth.churnBps, 1)}
          </p>
        </section>
      </div>
      <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
        <div className="border-b border-border-subtle px-4 py-3">
          <h2 className="text-sm font-bold text-text-main">
            Performance par verticale
          </h2>
          <p className="mt-1 text-micro text-text-muted">
            Revenus attribués, MRR et conversion après essai par famille
            commerciale.
          </p>
        </div>
        <ScrollableRegion aria-label="Performance financière des abonnements par verticale">
          <table className="w-full min-w-190 text-left text-xs">
            <thead className="bg-bg-subtle text-micro uppercase text-text-secondary">
              <tr>
                <th className="px-4 py-2">Verticale</th>
                <th className="px-3 py-2 text-right">Revenus</th>
                <th className="px-3 py-2 text-right">MRR</th>
                <th className="px-3 py-2 text-right">Payants</th>
                <th className="px-3 py-2 text-right">Essais actifs</th>
                <th className="px-3 py-2 text-right">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {dashboard.verticals.map((vertical) => (
                <tr key={vertical.verticalId}>
                  <th className="px-4 py-3 font-bold text-text-main">
                    <span className="mr-2 rounded-pill bg-primary-light px-2 py-1 text-micro uppercase text-primary">
                      {vertical.verticalId}
                    </span>
                    {vertical.label}
                  </th>
                  <td className="px-3 py-3 text-right font-semibold">
                    {formatMoney(vertical.revenue)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {formatMoney(vertical.mrr)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {vertical.payingSubscriptions}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {vertical.activeTrials}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-success">
                    {formatPercentFromBps(vertical.conversionBps, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableRegion>
      </section>
    </div>
  );
}

export const AdminFinancePage: React.FC = () => {
  const { t } = useTranslation();
  const { availableMarkets, currentCurrency } = useMarketLocation();
  const { formatDate } = useRegionalFormatters();
  usePageMeta({
    title: t("admin.adminFinancePage.financeDeLaPlateforme"),
    description: t(
      "admin.adminFinancePage.revenusTransactionsEtRapprochementFinancierShongre",
    ),
    canonicalPath: "/admin/finance",
    noIndex: true,
  });
  const { can } = useAuthorization();
  const canManageReconciliation = can("finance.reconciliation.manage");
  const canReadCommissionAnalytics = can("commissions.analytics.read");
  const [tab, setTab] = useState<FinanceTab>("overview");
  const [scope, setScope] = useState<FinanceScope>({
    period: "30d",
    marketCode: "ALL",
    currency: currentCurrency,
  });
  const [dashboard, setDashboard] = useState<PlatformFinanceDashboard | null>(
    null,
  );
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [cases, setCases] = useState<ReconciliationCase[]>([]);
  const [commissionAnalytics, setCommissionAnalytics] = useState<
    CommissionAnalyticsRow[]
  >([]);
  const [selected, setSelected] = useState<FinanceTransaction | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FinanceTransactionStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const days =
        scope.period === "7d"
          ? 7
          : scope.period === "30d"
            ? 30
            : scope.period === "quarter"
              ? 90
              : 365;
      const from = new Date(today);
      from.setUTCDate(from.getUTCDate() - days + 1);
      const [overview, page, reconciliation, commissions] = await Promise.all([
        services.finance.getPlatformDashboard(scope),
        services.finance.listTransactions({
          ...scope,
          query,
          status: status === "all" ? undefined : status,
          limit: PAGE_SIZES.adminFinanceRows,
        }),
        canManageReconciliation
          ? services.finance.listReconciliationCases()
          : Promise.resolve([]),
        canReadCommissionAnalytics
          ? services.commissions.getAnalytics({
              marketCode: scope.marketCode,
              currency: scope.currency,
              from: from.toISOString().slice(0, 10),
              to: today.toISOString().slice(0, 10),
            })
          : Promise.resolve([]),
      ]);
      setDashboard(overview);
      setTransactions(page.items);
      setCases(reconciliation);
      setCommissionAnalytics(commissions);
      setSelected(
        (current) =>
          page.items.find((item) => item.id === current?.id) ??
          page.items.find((item) => item.status === "needs_review") ??
          page.items[0] ??
          null,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Chargement des données financières impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    canManageReconciliation,
    canReadCommissionAnalytics,
    query,
    scope,
    status,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedCase = useMemo(
    () => cases.find((item) => item.transactionId === selected?.id),
    [cases, selected],
  );
  const handleExport = async () => {
    const file = await services.finance.exportTransactions({
      ...scope,
      query,
      status: status === "all" ? undefined : status,
      limit: PAGE_SIZES.adminFinanceExportRows,
    });
    downloadTextFile(file.fileName, file.mimeType, file.content);
  };
  const openFromReconciliation = (transaction: FinanceTransaction) => {
    setSelected(transaction);
    setTab("transactions");
  };
  const availableTabs = useMemo(
    () =>
      TABS.filter(
        (item) => item.id !== "reconciliation" || canManageReconciliation,
      ),
    [canManageReconciliation],
  );

  if (loading && !dashboard)
    return (
      <div className="flex min-h-105 items-center justify-center">
        <LoaderCircle
          className="h-icon-xl w-icon-xl animate-spin text-primary"
          aria-label={t("admin.adminFinancePage.chargementDesFinances")}
        />
      </div>
    );
  if (error || !dashboard)
    return (
      <StatePanel
        title="Finance indisponible"
        description={t(
          "admin.adminFinancePage.lesAgregatsFinanciersNOntPasPuEtreCharges",
        )}
        technicalDetail={error ?? undefined}
        action={
          <Button onClick={() => void load()}>{t("common.retry")}</Button>
        }
      />
    );

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Finance & revenus
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text-main">
            {t("admin.adminFinancePage.financeDeLaPlateforme")}
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            {t(
              "admin.adminFinancePage.registreFinancierImmuableRevenusReconnusEtControleDesEcartsFournisseurs",
            )}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success">
            <CheckCircle2 className="h-icon-md w-icon-md" />
            {dashboard.isPeriodClosed ? "Finalisé" : "Provisoire"} au{" "}
            {formatDate(dashboard.asOf, {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExport()}
          >
            <Download className="h-icon-md w-icon-md" />
            Exporter
          </Button>
          {canManageReconciliation && (
            <Button size="sm" onClick={() => setTab("reconciliation")}>
              <FileCheck2 className="h-icon-md w-icon-md" />
              Rapprochement
            </Button>
          )}
        </div>
      </header>
      <div className="grid gap-2 rounded-card border border-border-base bg-bg-surface p-3 shadow-xs sm:grid-cols-3">
        <label className="text-micro font-semibold text-text-muted">
          <span className="sr-only">
            {t("admin.adminAnalyticsPage.periode")}
          </span>
          <Select
            className="w-full"
            labelledByAncestor
            value={scope.period}
            onChange={(event) =>
              setScope((current) => ({
                ...current,
                period: event.target.value as FinanceScope["period"],
              }))
            }
          >
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
            <option value="quarter">Trimestre</option>
            <option value="year">
              {t("admin.adminCommissionPolicyEditor.annee")}
            </option>
          </Select>
        </label>
        <label>
          <span className="sr-only">
            {t("invoicing.product.previewMarket")}
          </span>
          <Select
            className="w-full"
            labelledByAncestor
            value={scope.marketCode}
            onChange={(event) =>
              setScope((current) => ({
                ...current,
                marketCode: event.target.value as FinanceScope["marketCode"],
              }))
            }
          >
            <option value="ALL">
              {t("publishing.publishWizard.tousLesMarches")}
            </option>
            {availableMarkets.map((market) => (
              <option key={market.code} value={market.code}>
                {market.name}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="sr-only">Devise</span>
          <Select
            className="w-full"
            labelledByAncestor
            value={scope.currency}
            onChange={(event) =>
              setScope((current) => ({
                ...current,
                currency: event.target.value,
              }))
            }
          >
            {Array.from(
              new Set(availableMarkets.map((market) => market.currency)),
            ).map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="overflow-x-auto border-b border-border-base">
        <div className="flex min-w-max gap-6">
          {availableTabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`border-b-2 px-1 pb-3 text-xs font-semibold ${tab === item.id ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-main"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {(tab === "transactions" || tab === "reconciliation") && (
        <div className="flex flex-col gap-2 rounded-card border border-border-base bg-bg-surface p-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-icon-md w-icon-md -translate-y-1/2 text-text-muted" />
            <span className="sr-only">
              {t("admin.adminFinancePage.rechercherUneTransaction")}
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ID, utilisateur, facture…"
              className="w-full rounded-control border border-border-base pl-9 pr-3 text-xs h-control-touch"
            />
          </label>
          <label className="sm:w-48">
            <span className="sr-only">Statut</span>
            <Select
              className="w-full"
              labelledByAncestor
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as FinanceTransactionStatus | "all",
                )
              }
            >
              <option value="all">
                {t("admin.providerCatalogTable.tousLesStatuts")}
              </option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <Filter className="h-icon-md w-icon-md" />
            Filtrer
          </Button>
        </div>
      )}
      {tab === "overview" && (
        <OverviewTab
          dashboard={dashboard}
          commissionAnalytics={commissionAnalytics}
        />
      )}
      {tab === "transactions" && (
        <TransactionsTab
          transactions={transactions}
          selected={selected}
          onSelect={setSelected}
          reconciliation={selectedCase}
        />
      )}
      {tab === "reconciliation" && canManageReconciliation && (
        <ReconciliationTab
          cases={cases}
          transactions={transactions}
          onOpen={openFromReconciliation}
        />
      )}
      {tab === "subscriptions" && <SubscriptionsTab dashboard={dashboard} />}
    </div>
  );
};
