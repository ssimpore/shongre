import React, { useEffect, useState } from "react";
import type { AccountFinanceDashboard } from "@shongre/contracts/finance";
import type { BillingOverview } from "@shongre/contracts/monetization";
import { formatMoney } from "@shongre/shared";
import {
  ArrowDownToLine,
  BadgeEuro,
  CheckCircle2,
  CreditCard,
  FileText,
  LoaderCircle,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { services } from "../../api/client/service-registry";
import { Button } from "../../design-system/primitives/Button";
import { StatePanel } from "../../design-system/primitives/StatePanel";
import { ScrollableRegion } from "../../design-system/primitives/ScrollableRegion";
import { usePageMeta } from "../../hooks/usePageMeta";
import { BillingHistoryModal } from "../seller-workspace/components/BillingHistoryModal";

function AccountMetric({
  label,
  value,
  definition,
  icon: Icon,
}: {
  label: string;
  value: AccountFinanceDashboard["metrics"][keyof AccountFinanceDashboard["metrics"]]["amount"];
  definition: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <article className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
      <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary-light text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="mt-3 text-xs font-semibold text-text-secondary">{label}</p>
      <p className="mt-1 text-xl font-black tracking-tight text-text-main">
        {formatMoney(value)}
      </p>
      <p className="mt-2 text-micro leading-relaxed text-text-muted">
        {definition}
      </p>
    </article>
  );
}

export const AccountFinancePage: React.FC<{
  scope?: "account" | "organization";
}> = ({ scope = "account" }) => {
  usePageMeta({
    title: "Mes finances",
    description: "Dépenses, revenus vendeur, virements et factures Shongre.",
    canonicalPath: "/compte/finances",
    noIndex: true,
  });
  const [dashboard, setDashboard] = useState<AccountFinanceDashboard | null>(
    null,
  );
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [isInvoiceHistoryOpen, setInvoiceHistoryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const [financeResult, billingResult] = await Promise.allSettled([
      scope === "organization"
        ? services.finance.getOrganizationDashboard()
        : services.finance.getAccountDashboard(),
      services.businessRules.getBillingOverview(),
    ]);
    if (financeResult.status === "rejected") {
      setError(
        financeResult.reason instanceof Error
          ? financeResult.reason.message
          : "Chargement impossible.",
      );
      return;
    }
    setDashboard(financeResult.value);
    setBilling(
      billingResult.status === "fulfilled" ? billingResult.value : null,
    );
  };

  useEffect(() => {
    void load();
  }, [scope]);

  if (!dashboard && !error) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <LoaderCircle
          className="h-6 w-6 animate-spin text-primary"
          aria-label="Chargement de vos finances"
        />
      </div>
    );
  }
  if (error || !dashboard) {
    return (
      <StatePanel
        title="Vos finances sont indisponibles"
        description="Nous n’avons pas pu charger les écritures de votre compte."
        technicalDetail={error ?? undefined}
        action={<Button onClick={() => void load()}>Réessayer</Button>}
      />
    );
  }

  const metrics = dashboard.metrics;
  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Paiements & facturation
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-text-main">
            {dashboard.accountKind === "professional"
              ? "Finances de l’organisation"
              : "Mes finances"}
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            {dashboard.accountLabel} · montants en euros, taxes comprises
            lorsqu’indiqué.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" />
            Solde actualisé le{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(dashboard.asOf))}
          </p>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AccountMetric
          label="Dépenses Shongre"
          value={metrics.spending.amount}
          definition={metrics.spending.definition}
          icon={CreditCard}
        />
        <AccountMetric
          label="Revenus vendeur"
          value={metrics.sellerEarnings.amount}
          definition={metrics.sellerEarnings.definition}
          icon={BadgeEuro}
        />
        <AccountMetric
          label="Disponible"
          value={metrics.availableForPayout.amount}
          definition={metrics.availableForPayout.definition}
          icon={WalletCards}
        />
        <AccountMetric
          label="Virements en cours"
          value={metrics.pendingPayout.amount}
          definition={metrics.pendingPayout.definition}
          icon={ArrowDownToLine}
        />
        <AccountMetric
          label="Remboursé"
          value={metrics.refunded.amount}
          definition={metrics.refunded.definition}
          icon={ReceiptText}
        />
      </div>
      {billing?.currentSubscription && (
        <section className="grid gap-4 rounded-card border border-border-base bg-bg-surface p-4 shadow-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <p className="text-micro font-bold uppercase tracking-wide text-text-secondary">
              Abonnement actuel
            </p>
            <h2 className="mt-1 text-sm font-black text-text-main">
              Formule professionnelle ·{" "}
              {billing.currentSubscription.billingPeriod === "year"
                ? "annuelle"
                : "mensuelle"}
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Statut{" "}
              {billing.currentSubscription.status === "active"
                ? "actif"
                : billing.currentSubscription.status}{" "}
              · prochaine échéance le{" "}
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
                new Date(billing.currentSubscription.currentPeriodEnd),
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-success-border bg-success-surface px-2.5 py-1 font-bold text-success">
              {billing.invoices.length} facture
              {billing.invoices.length > 1 ? "s" : ""}
            </span>
            <span className="rounded-full border border-border-base bg-bg-subtle px-2.5 py-1 font-bold text-text-secondary">
              {
                billing.payments.filter(
                  (payment) => payment.status === "succeeded",
                ).length
              }{" "}
              paiement
              {billing.payments.filter(
                (payment) => payment.status === "succeeded",
              ).length > 1
                ? "s"
                : ""}{" "}
              confirmé
              {billing.payments.filter(
                (payment) => payment.status === "succeeded",
              ).length > 1
                ? "s"
                : ""}
            </span>
          </div>
        </section>
      )}
      <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-base px-4 py-3">
          <div>
            <h2 className="text-sm font-black text-text-main">
              Historique financier
            </h2>
            <p className="text-micro text-text-muted">
              Factures, achats, ventes et virements du compte.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInvoiceHistoryOpen(true)}
          >
            <FileText className="h-4 w-4" />
            Factures et reçus{billing ? ` (${billing.invoices.length})` : ""}
          </Button>
        </div>
        <ScrollableRegion aria-label="Historique financier du compte">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="bg-bg-subtle text-micro uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-3 py-2">Référence</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Marché</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {dashboard.transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-4 py-3">
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "medium",
                    }).format(new Date(transaction.occurredAt))}
                  </td>
                  <td className="px-3 py-3 font-mono text-micro font-bold">
                    {transaction.reference}
                  </td>
                  <td className="px-3 py-3 font-semibold">
                    {transaction.description}
                  </td>
                  <td className="px-3 py-3">{transaction.marketCode}</td>
                  <td className="px-3 py-3 text-right font-black">
                    {formatMoney(transaction.grossAmount)}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-success-border bg-success-surface px-2 py-1 text-micro font-bold text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Comptabilisé
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableRegion>
      </section>
      <aside className="flex items-start gap-3 rounded-card border border-info-border bg-info-surface p-4 text-xs text-info">
        <ReceiptText className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-bold">Définitions transparentes</p>
          <p className="mt-1 leading-relaxed">
            Les revenus vendeur excluent les commissions et remboursements. Le
            montant disponible exclut les virements en cours, les réserves et
            les litiges ouverts.
          </p>
        </div>
      </aside>
      <BillingHistoryModal
        isOpen={isInvoiceHistoryOpen}
        onClose={() => setInvoiceHistoryOpen(false)}
        userType={dashboard.accountKind}
      />
    </div>
  );
};
