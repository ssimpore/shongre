import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MapPin,
  Filter,
  FileKey2,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../../app/providers/AuthProvider";
import { services } from "../../api/client/service-registry";
import { Transaction, TransactionStatus } from "../../types";
import { formatRelativeDate } from "../../utilities/formatters";
import { routes } from "../../configuration/routes";
import { Badge } from "../../design-system/primitives/Badge";
import { Image } from "../../design-system/primitives/Image";
import { Button } from "../../design-system/primitives/Button";
import { EmptyState } from "../../design-system";
import { TransactionDetailModal } from "./components/TransactionDetailModal";
import { useTranslation } from "../../i18n/I18nProvider";
import { digitalMessagesFr } from "../../i18n/digital.catalogue.fr";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

type TabMode = "purchases" | "sales";
type StatusFilter =
  "all" | "pending" | "in_progress" | "completed" | "disputed";

export const TransactionsPage: React.FC = () => {
  const { t } = useTranslation(digitalMessagesFr);
  const { formatPrice } = useMarketLocation();
  usePageMeta({
    title: t("meta.transactions.title"),
    description: t("meta.transactions.description"),
    canonicalPath: "/compte/achats",
    noIndex: true,
  });

  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTransactionId = searchParams.get("transactionId");
  const checkoutReturn = searchParams.get("checkout");
  const currentUserId = currentUser?.id ?? "";
  const [activeTab, setActiveTab] = useState<TabMode>("purchases");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [purchasesCount, setPurchasesCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [, setLoading] = useState(true);
  const [paymentReturnStatus] = useState<"processing" | "cancelled" | null>(
    checkoutReturn === "success"
      ? "processing"
      : checkoutReturn === "cancelled"
        ? "cancelled"
        : null,
  );

  const fetchTransactions = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [purchases, sales] = await Promise.all([
        services.orders.getPurchases(currentUser.id),
        services.orders.getSales(currentUser.id),
      ]);
      setPurchasesCount(purchases.length);
      setSalesCount(sales.length);
      const requestedTransaction = requestedTransactionId
        ? [...purchases, ...sales].find(
            (transaction) => transaction.id === requestedTransactionId,
          )
        : undefined;
      const requestedTab = requestedTransaction
        ? requestedTransaction.buyerId === currentUser.id
          ? "purchases"
          : "sales"
        : activeTab;
      if (requestedTab !== activeTab) setActiveTab(requestedTab);
      setUserTransactions(requestedTab === "purchases" ? purchases : sales);
      if (requestedTransaction) setSelectedTx(requestedTransaction);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeTab, currentUser?.id, requestedTransactionId]);

  useEffect(() => {
    if (!checkoutReturn) return;
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("session_id");
    setSearchParams(next, { replace: true });
  }, [checkoutReturn, searchParams, setSearchParams]);

  const openTransaction = (transaction: Transaction) => {
    setSelectedTx(transaction);
    const next = new URLSearchParams(searchParams);
    next.set("transactionId", transaction.id);
    setSearchParams(next, { replace: true });
  };

  const closeTransaction = () => {
    setSelectedTx(null);
    const next = new URLSearchParams(searchParams);
    next.delete("transactionId");
    setSearchParams(next, { replace: true });
  };

  // Sub-filter by status
  const filteredTransactions = userTransactions.filter((tx) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending")
      return (
        tx.status === "initiated" ||
        tx.status === "payment_pending" ||
        tx.status === "pending_seller_confirmation"
      );
    if (statusFilter === "in_progress") {
      return (
        tx.status === "seller_confirmed" ||
        tx.status === "ready_for_pickup" ||
        tx.status === "pickup_scheduled" ||
        tx.status === "shipped" ||
        tx.status === "delivered" ||
        tx.status === "escrow_secured" ||
        tx.status === "payment_escrowed" ||
        tx.status === "escrow_funded" ||
        tx.status === "pin_pending"
      );
    }
    if (statusFilter === "completed") return tx.status === "completed";
    if (statusFilter === "disputed") return tx.status === "disputed";
    return true;
  });

  const getStatusBadge = (
    status: TransactionStatus,
    deliveryMethod?: string,
  ) => {
    switch (status) {
      case "initiated":
      case "payment_pending":
      case "pending_seller_confirmation":
        return <Badge variant="warning">Paiement en attente</Badge>;
      case "seller_confirmed":
      case "ready_for_pickup":
      case "pickup_scheduled":
      case "escrow_funded":
      case "pin_pending":
        return (
          <Badge variant="primary">
            {deliveryMethod === "hand_delivery"
              ? "Réservé - Remise en main propre"
              : "Réservé - À expédier"}
          </Badge>
        );
      case "shipped":
        return (
          <Badge variant="primary">
            {t("transactions.transactionsPage.colisExpedie")}
          </Badge>
        );
      case "delivered":
      case "handover_confirmed":
        return (
          <Badge variant="warning">
            {t("transactions.transactionsPage.livreEnAttenteValidation")}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="verified">
            {t("transactions.transactionsPage.finaliseePayee")}
          </Badge>
        );
      case "disputed":
        return <Badge variant="urgent">Litige en cours</Badge>;
      case "refund_pending":
        return <Badge variant="warning">Remboursement en cours</Badge>;
      case "seller_rejected":
      case "cancelled_by_buyer":
      case "cancelled_by_seller":
      case "refunded":
      case "expired":
        return (
          <Badge variant="neutral">
            {t("transactions.transactionsPage.annuleeRemboursee")}
          </Badge>
        );
      default:
        return <Badge variant="neutral">En cours</Badge>;
    }
  };

  const handleTransactionUpdated = (updated: Transaction) => {
    setSelectedTx(updated);
    fetchTransactions();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900">
            {t(
              "transactions.transactionsPage.transactionsReservationsSequestre",
            )}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            {t("transactions.transactionsPage.gerezVosReservationsVosRemises")}
          </p>
        </div>
      </div>

      {/* Payment state information */}
      {paymentReturnStatus ? (
        <div
          role="status"
          className={`rounded-2xl border p-4 ${
            paymentReturnStatus === "processing"
              ? "border-warning-border bg-warning-surface text-warning"
              : "border-border-base bg-bg-base text-text-secondary"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {paymentReturnStatus === "processing" ? (
                <Clock className="h-icon-md w-icon-md" aria-hidden="true" />
              ) : (
                <ShoppingBag
                  className="h-icon-md w-icon-md"
                  aria-hidden="true"
                />
              )}
              <span className="text-sm font-bold">
                {paymentReturnStatus === "processing"
                  ? t("digital.checkout.processing")
                  : t("digital.checkout.cancelled")}
              </span>
            </div>
            {paymentReturnStatus === "processing" ? (
              <Button
                variant="secondary"
                leftIcon={
                  <RefreshCw
                    className="h-icon-sm w-icon-sm"
                    aria-hidden="true"
                  />
                }
                onClick={() => void fetchTransactions()}
              >
                {t("digital.checkout.refresh")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="p-4 bg-success-surface border border-success-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-success">
        <div className="flex items-start sm:items-center gap-3">
          <ShieldCheck className="w-icon-xl h-icon-xl text-success shrink-0" />
          <span className="leading-relaxed">
            <strong>Paiement suivi par Shongre.</strong> L’état affiché provient
            du serveur et des confirmations du prestataire de paiement. Un
            retour de navigateur ne confirme jamais à lui seul une transaction.
          </span>
        </div>
      </div>

      {/* Main Tabs (Mes Achats vs Mes Ventes) */}
      <div className="flex border-b border-border-base gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("purchases")}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === "purchases"
              ? "text-primary border-b-2 border-primary"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Mes Achats & Réservations ({purchasesCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("sales")}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === "sales"
              ? "text-primary border-b-2 border-primary"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          Mes Ventes & Réservations Reçues ({salesCount})
        </button>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-stone-500 font-bold mr-1 flex items-center gap-1">
          <Filter className="w-icon-sm h-icon-sm" /> Filtrer :
        </span>
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            statusFilter === "all"
              ? "bg-stone-900 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          Toutes ({userTransactions.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            statusFilter === "pending"
              ? "bg-amber-600 text-white"
              : "bg-warning-surface text-warning hover:bg-warning-surface"
          }`}
        >
          En attente confirmation (
          {
            userTransactions.filter(
              (t) =>
                t.status === "initiated" ||
                t.status === "payment_pending" ||
                t.status === "pending_seller_confirmation",
            ).length
          }
          )
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("in_progress")}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            statusFilter === "in_progress"
              ? "bg-primary text-white"
              : "bg-primary-light text-primary hover:bg-primary-light/70"
          }`}
        >
          En cours & Réservées (
          {
            userTransactions.filter(
              (t) =>
                t.status === "seller_confirmed" ||
                t.status === "ready_for_pickup" ||
                t.status === "pickup_scheduled" ||
                t.status === "shipped" ||
                t.status === "delivered" ||
                t.status === "escrow_funded" ||
                t.status === "pin_pending",
            ).length
          }
          )
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("completed")}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            statusFilter === "completed"
              ? "bg-success text-white"
              : "bg-success-surface text-success hover:bg-success-surface"
          }`}
        >
          Finalisées (
          {userTransactions.filter((t) => t.status === "completed").length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("disputed")}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
            statusFilter === "disputed"
              ? "bg-danger text-white"
              : "bg-danger-surface text-danger hover:bg-danger-surface"
          }`}
        >
          Litiges (
          {userTransactions.filter((t) => t.status === "disputed").length})
        </button>
      </div>

      {/* Transaction List */}
      {filteredTransactions.length > 0 ? (
        <section
          aria-labelledby="transactions-list-heading"
          className="space-y-4"
        >
          <h2 id="transactions-list-heading" className="sr-only">
            {activeTab === "purchases" ? "Mes achats" : "Mes ventes"}
          </h2>
          {filteredTransactions.map((tx) => {
            const isBuyer = tx.buyerId === currentUserId;
            const isSeller = tx.sellerId === currentUserId;
            const paymentConfirmed = [
              "escrow_funded",
              "pin_pending",
              "shipped",
              "delivered",
              "handover_confirmed",
              "completed",
              "disputed",
              "refund_pending",
              "refunded",
            ].includes(tx.status);

            return (
              <article
                key={tx.id}
                className="bg-white rounded-3xl border border-stone-200/60 p-6 shadow-sm space-y-5 hover:border-primary/40 transition-all"
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-stone-900 font-mono tracking-wider uppercase">
                      Dossier {tx.code || `#${tx.id.slice(0, 8)}`}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="text-xs font-medium text-stone-500">
                      {formatRelativeDate(tx.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(tx.status, tx.deliveryMethod)}
                  </div>
                </div>

                {/* Main Card Content */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                    <Image
                      src={tx.listingCoverImageUrl || tx.listingPhotoUrl}
                      alt=""
                      sizes="80px"
                      className="w-20 h-20 rounded-xl object-cover border border-stone-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-stone-900 hover:text-primary transition-colors truncate block mb-1">
                        {tx.listingTitle}
                      </h3>
                      <div className="text-sm text-stone-500 font-medium flex items-center gap-1.5 mb-2">
                        <span>{isBuyer ? "Vendeur" : "Acheteur"} :</span>
                        <strong className="text-stone-900">
                          {isBuyer ? tx.sellerName : tx.buyerName}
                        </strong>
                      </div>

                      {/* Delivery badge */}
                      <div className="flex items-center gap-2 mt-1.5 text-micro">
                        {tx.deliveryMethod === "digital" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-primary-light px-2 py-0.5 font-semibold text-primary">
                            <FileKey2 className="h-icon-xs w-icon-xs" />
                            {t("digital.common.noShipping")}
                          </span>
                        ) : tx.deliveryMethod === "hand_delivery" ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-success bg-success-surface px-2 py-0.5 rounded">
                            <MapPin className="w-icon-xs h-icon-xs" /> Remise en
                            main propre
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-info bg-info-surface px-2 py-0.5 rounded">
                            <Truck className="w-icon-xs h-icon-xs" />{" "}
                            {tx.carrierName || "Livraison Colis"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Total & CTA */}
                  <div className="text-right sm:self-center shrink-0 flex flex-col items-end gap-1.5 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-stone-100 mt-2 sm:mt-0">
                    <div className="text-xl font-bold text-stone-900">
                      {formatPrice(
                        isSeller
                          ? tx.sellerPayoutAmount || tx.amount
                          : tx.totalAmount,
                        { sourceCurrency: tx.currency },
                      )}
                    </div>
                    <span className="text-xs font-medium text-stone-500 mb-1">
                      {isSeller ? "Montant de l’article" : "Total réglé"}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      className="w-full sm:w-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTransaction(tx);
                      }}
                    >
                      {t("transactions.transactionsPage.gererLeDossier")}
                    </Button>
                  </div>
                </div>

                {/* Progress Mini Step Tracker. */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/60 flex items-center justify-between gap-3 text-xs font-medium text-stone-600 overflow-x-auto no-scrollbar shadow-inner">
                  <div
                    className={`flex items-center gap-1 font-semibold shrink-0 ${
                      paymentConfirmed ? "text-success" : "text-warning"
                    }`}
                  >
                    {paymentConfirmed ? (
                      <CheckCircle2 className="w-icon-sm h-icon-sm shrink-0" />
                    ) : (
                      <Clock className="w-icon-sm h-icon-sm shrink-0" />
                    )}
                    <span className="whitespace-nowrap">
                      {paymentConfirmed
                        ? "Paiement confirmé"
                        : "Paiement en attente"}
                    </span>
                  </div>
                  <span className="text-stone-300 shrink-0">→</span>
                  <div
                    className={`flex items-center gap-1 font-semibold shrink-0 whitespace-nowrap ${
                      tx.status === "shipped" || tx.status === "completed"
                        ? "text-success"
                        : "text-stone-500"
                    }`}
                  >
                    <CheckCircle2 className="w-icon-sm h-icon-sm shrink-0" />
                    <span>
                      {tx.deliveryMethod === "digital"
                        ? t("digital.purchases.processing")
                        : "Remise / Envoi"}
                    </span>
                  </div>
                  <span className="text-stone-300 shrink-0">→</span>
                  <div
                    className={`flex items-center gap-1 font-semibold shrink-0 whitespace-nowrap ${
                      tx.status === "completed"
                        ? "text-success font-bold"
                        : "text-stone-500"
                    }`}
                  >
                    <CheckCircle2 className="w-icon-sm h-icon-sm shrink-0" />
                    <span>Commande terminée</span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          icon={<ShoppingBag className="w-10 h-10 text-stone-400" />}
          title={
            activeTab === "purchases"
              ? "Aucun achat ou réservation en cours"
              : "Aucune vente ou réservation reçue"
          }
          description={
            activeTab === "purchases"
              ? "Découvrez les annonces disponibles et payez sur la page sécurisée du prestataire."
              : "Activez les options d’achat sur vos annonces pour recevoir des commandes."
          }
          action={
            <Button
              to={
                activeTab === "purchases"
                  ? routes.search()
                  : routes.listing.publish()
              }
              variant="primary"
            >
              {activeTab === "purchases"
                ? "Explorer les annonces"
                : "Déposer une annonce"}
            </Button>
          }
        />
      )}

      {/* Transaction Detail & Actions Modal */}
      {selectedTx && currentUser && (
        <TransactionDetailModal
          isOpen={!!selectedTx}
          onClose={closeTransaction}
          transaction={selectedTx}
          currentUser={currentUser}
          onUpdate={handleTransactionUpdated}
        />
      )}
    </div>
  );
};
