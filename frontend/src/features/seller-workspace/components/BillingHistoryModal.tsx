import React, { useEffect, useState } from "react";
import type {
  BillingOverview,
  MonetizationInvoice,
} from "@shongre/contracts/monetization";
import { Download, FileText } from "lucide-react";
import { services } from "../../../api";
import { useToast } from "../../../app/providers/ToastProvider";
import { Badge } from "../../../design-system/primitives/Badge";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";

interface BillingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType?: "individual" | "professional";
}

type InvoiceFilter = "all" | "subscription" | "one_off";

const STATUS_LABELS: Record<MonetizationInvoice["status"], string> = {
  draft: "Brouillon",
  open: "À payer",
  paid: "Payée",
  void: "Annulée",
  uncollectible: "Impayée",
};

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

export const BillingHistoryModal: React.FC<BillingHistoryModalProps> = ({
  isOpen,
  onClose,
  userType = "individual",
}) => {
  const toast = useToast();
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InvoiceFilter>("all");

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError(null);
    services.businessRules
      .getBillingOverview()
      .then((result) => {
        if (active) setBilling(result);
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Factures indisponibles.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  const invoices = (billing?.invoices || []).filter((invoice) => {
    if (filter === "all") return true;
    return filter === "subscription"
      ? Boolean(invoice.subscriptionId)
      : !invoice.subscriptionId;
  });

  const downloadInvoice = async (invoice: MonetizationInvoice) => {
    setDownloadingId(invoice.id);
    try {
      const document = await services.businessRules.getInvoiceDocument(
        invoice.id,
      );
      const blob = new Blob([document.content], { type: document.mimeType });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`La facture ${invoice.number} a été téléchargée.`);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Téléchargement impossible.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Factures et reçus"
      description={
        userType === "professional"
          ? "Documents du compte professionnel, montants HT, TVA et total réglé."
          : "Documents de facturation associés à votre compte."
      }
      maxWidth="xl"
    >
      <div className="space-y-5">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filtrer les factures"
        >
          {[
            { id: "all" as const, label: "Toutes" },
            { id: "subscription" as const, label: "Abonnements" },
            { id: "one_off" as const, label: "Achats ponctuels" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
              className={`rounded-control px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                filter === option.id
                  ? "bg-primary text-white"
                  : "bg-bg-subtle text-text-secondary hover:text-text-main"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading && (
          <div
            className="rounded-card border border-border-base p-8 text-center text-sm font-semibold text-text-secondary"
            aria-live="polite"
          >
            Chargement des documents…
          </div>
        )}
        {error && (
          <div
            className="rounded-card border border-danger-border bg-danger-surface p-4 text-sm font-semibold text-danger"
            role="alert"
          >
            {error}
          </div>
        )}
        {!loading && !error && (
          <div className="divide-y divide-border-subtle overflow-hidden rounded-card border border-border-base bg-bg-surface">
            {invoices.length ? (
              invoices.map((invoice) => (
                <article
                  key={invoice.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary-light text-primary">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-mono text-sm font-black text-text-main">
                          {invoice.number}
                        </h3>
                        <Badge
                          variant={
                            invoice.status === "paid" ? "verified" : "neutral"
                          }
                          size="sm"
                        >
                          {STATUS_LABELS[invoice.status]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">
                        Émise le{" "}
                        {new Date(invoice.issuedAt).toLocaleDateString("fr-FR")}
                        {invoice.subscriptionId
                          ? " · abonnement"
                          : " · achat ponctuel"}
                      </p>
                      <p className="mt-1 text-micro text-text-muted">
                        HT{" "}
                        {formatMoney(
                          invoice.subtotal.amountMinor,
                          invoice.subtotal.currency,
                        )}{" "}
                        · TVA{" "}
                        {formatMoney(
                          invoice.tax.amountMinor,
                          invoice.tax.currency,
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-3 sm:border-0 sm:pt-0">
                    <strong className="text-sm text-text-main">
                      {formatMoney(
                        invoice.total.amountMinor,
                        invoice.total.currency,
                      )}{" "}
                      TTC
                    </strong>
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={downloadingId === invoice.id}
                      onClick={() => void downloadInvoice(invoice)}
                      leftIcon={<Download className="h-4 w-4" />}
                    >
                      Télécharger
                    </Button>
                  </div>
                </article>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-text-muted">
                Aucune facture ne correspond à ce filtre.
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border-subtle pt-4 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            Les documents proviennent du même registre que les paiements et
            remboursements.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};
