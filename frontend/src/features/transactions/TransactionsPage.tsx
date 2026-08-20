import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  
  
  
  MapPin,
  KeyRound,
  
  Landmark,
  
  Filter
  
} from 'lucide-react';

import { useAuth } from '../../app/providers/AuthProvider';
import { transactionRepository } from '../../repositories/transaction.repository';
import { transactionService } from '../../domains/transaction/transaction.service';
import { Transaction, TransactionStatus } from '../../types';
import { formatPrice, formatRelativeDate } from '../../utilities/formatters';
import { routes } from '../../configuration/routes';
import { Badge } from '../../design-system/primitives/Badge';
import { Image } from '../../design-system/primitives/Image';
import { Button } from '../../design-system/primitives/Button';
import { EmptyState } from '../../design-system/primitives/UIComponents';
import { TransactionDetailModal } from './components/TransactionDetailModal';
import { SellerPayoutModal } from './components/SellerPayoutModal';
import { useTranslation } from '../../i18n/I18nProvider';

type TabMode = 'purchases' | 'sales';
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'disputed';

export const TransactionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabMode>('purchases');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [purchasesCount, setPurchasesCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [, setLoading] = useState(true);

  const fetchTransactions = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const [purchases, sales] = await Promise.all([
        transactionRepository.getPurchases(currentUser.id),
        transactionRepository.getSales(currentUser.id),
      ]);
      setPurchasesCount(purchases.length);
      setSalesCount(sales.length);
      setUserTransactions(activeTab === 'purchases' ? purchases : sales);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeTab, currentUser?.id]);

  // Sub-filter by status
  const filteredTransactions = userTransactions.filter((tx) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return tx.status === 'pending_seller_confirmation';
    if (statusFilter === 'in_progress') {
      return (
        tx.status === 'seller_confirmed' ||
        tx.status === 'ready_for_pickup' ||
        tx.status === 'pickup_scheduled' ||
        tx.status === 'shipped' ||
        tx.status === 'delivered' ||
        tx.status === 'escrow_secured' ||
        tx.status === 'payment_escrowed'
      );
    }
    if (statusFilter === 'completed') return tx.status === 'completed';
    if (statusFilter === 'disputed') return tx.status === 'disputed';
    return true;
  });

  // Financial summary for current seller
  const earningsSummary = transactionService.getSellerEarningsSummary(currentUser.id);

  const getStatusBadge = (status: TransactionStatus, deliveryMethod?: string) => {
    switch (status) {
      case 'pending_seller_confirmation':
        return <Badge variant="warning">{t('transactions.transactionsPage.enAttenteConfirmationVendeur')}</Badge>;
      case 'seller_confirmed':
      case 'ready_for_pickup':
      case 'pickup_scheduled':
        return (
          <Badge variant="primary">
            {deliveryMethod === 'hand_delivery' ? 'Réservé - Remise en main propre' : 'Réservé - À expédier'}
          </Badge>
        );
      case 'shipped':
        return <Badge variant="primary">{t('transactions.transactionsPage.colisExpedie')}</Badge>;
      case 'delivered':
      case 'handover_confirmed':
        return <Badge variant="warning">{t('transactions.transactionsPage.livreEnAttenteValidation')}</Badge>;
      case 'completed':
        return <Badge variant="verified">{t('transactions.transactionsPage.finaliseePayee')}</Badge>;
      case 'disputed':
        return <Badge variant="urgent">Litige en cours</Badge>;
      case 'seller_rejected':
      case 'cancelled_by_buyer':
      case 'cancelled_by_seller':
      case 'refunded':
      case 'expired':
        return <Badge variant="neutral">{t('transactions.transactionsPage.annuleeRemboursee')}</Badge>;
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
      {/* Header with Title and Wallet Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">{t('transactions.transactionsPage.transactionsReservationsSequestre')}</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">{t('transactions.transactionsPage.gerezVosReservationsVosRemises')}</p>
        </div>

        {/* Seller Earnings Card */}
        {earningsSummary.totalEarnings > 0 || earningsSummary.escrowHeldBalance > 0 ? (
          <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-stone-200/60 shadow-sm">
            <div className="p-3 bg-success-surface text-success rounded-xl">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-0.5">
                Solde disponible
              </div>
              <div className="text-lg font-black text-stone-900">
                {formatPrice(earningsSummary.availableBalance)}
              </div>
            </div>
            {earningsSummary.availableBalance > 0 && (
              <Button
                variant="primary"
                size="md"
                className="ml-2 font-bold"
                onClick={() => setIsPayoutModalOpen(true)}
              >
                Virer vers ma banque
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* Escrow Banner info */}
      <div className="p-4 bg-success-surface border border-success-border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-success">
        <div className="flex items-start sm:items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-success shrink-0" />
          <span className="leading-relaxed">
            <strong>{t('transactions.transactionsPage.garantieSequestreShongre')}</strong> Vos fonds restent protégés par un tiers de confiance agréé ACPR. Les paiements ne sont débloqués qu'après validation conforme de la remise.
          </span>
        </div>
        {earningsSummary.escrowHeldBalance > 0 && (
          <span className="text-sm font-bold text-success bg-bg-surface px-3 py-1.5 rounded-xl shrink-0 border border-success-border shadow-2xs">
            {formatPrice(earningsSummary.escrowHeldBalance)} sous séquestre
          </span>
        )}
      </div>

      {/* Main Tabs (Mes Achats vs Mes Ventes) */}
      <div className="flex border-b border-border-base gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'purchases'
              ? 'text-primary border-b-2 border-primary'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Mes Achats & Réservations ({purchasesCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`pb-3 text-sm font-bold transition-all relative ${
            activeTab === 'sales'
              ? 'text-primary border-b-2 border-primary'
              : 'text-stone-500 hover:text-stone-800'
          }`}
        >
          Mes Ventes & Réservations Reçues ({salesCount})
        </button>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-stone-500 font-bold mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filtrer :
        </span>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === 'all'
              ? 'bg-stone-900 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          Toutes ({userTransactions.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === 'pending'
              ? 'bg-amber-600 text-white'
              : 'bg-warning-surface text-warning hover:bg-warning-surface'
          }`}
        >
          En attente confirmation ({userTransactions.filter((t) => t.status === 'pending_seller_confirmation').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('in_progress')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === 'in_progress'
              ? 'bg-primary text-white'
              : 'bg-primary-light text-primary hover:bg-primary-light/70'
          }`}
        >
          En cours & Réservées ({userTransactions.filter((t) => t.status === 'seller_confirmed' || t.status === 'ready_for_pickup' || t.status === 'pickup_scheduled' || t.status === 'shipped' || t.status === 'delivered').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === 'completed'
              ? 'bg-success text-white'
              : 'bg-success-surface text-success hover:bg-success-surface'
          }`}
        >
          Finalisées ({userTransactions.filter((t) => t.status === 'completed').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('disputed')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === 'disputed'
              ? 'bg-danger text-white'
              : 'bg-danger-surface text-danger hover:bg-danger-surface'
          }`}
        >
          Litiges ({userTransactions.filter((t) => t.status === 'disputed').length})
        </button>
      </div>

      {/* Transaction List */}
      {filteredTransactions.length > 0 ? (
        <section aria-labelledby="transactions-list-heading" className="space-y-4">
          <h2 id="transactions-list-heading" className="sr-only">
            {activeTab === 'purchases' ? 'Mes achats' : 'Mes ventes'}
          </h2>
          {filteredTransactions.map((tx) => {
            const isBuyer = tx.buyerId === currentUser.id;
            const isSeller = tx.sellerId === currentUser.id;

            return (
              <div
                key={tx.id}
                className="bg-white rounded-3xl border border-stone-200/60 p-6 shadow-sm space-y-5 hover:border-primary/40 transition-all cursor-pointer"
                onClick={() => setSelectedTx(tx)}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-stone-900 font-mono tracking-wider uppercase">
                      Dossier {tx.code || `#${tx.id.slice(0, 8)}`}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="text-xs font-medium text-stone-500">{formatRelativeDate(tx.createdAt)}</span>
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
                      <h3 className="font-black text-base text-stone-900 hover:text-primary transition-colors truncate block mb-1">
                        {tx.listingTitle}
                      </h3>
                      <div className="text-sm text-stone-500 font-medium flex items-center gap-1.5 mb-2">
                        <span>{isBuyer ? 'Vendeur' : 'Acheteur'} :</span>
                        <strong className="text-stone-900">{isBuyer ? tx.sellerName : tx.buyerName}</strong>
                      </div>

                      {/* Delivery badge */}
                      <div className="flex items-center gap-2 mt-1.5 text-micro">
                        {tx.deliveryMethod === 'hand_delivery' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-success bg-success-surface px-2 py-0.5 rounded">
                            <MapPin className="w-3 h-3" /> Remise en main propre
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-info bg-info-surface px-2 py-0.5 rounded">
                            <Truck className="w-3 h-3" /> {tx.carrierName || 'Livraison Colis'}
                          </span>
                        )}

                        {/* Verification PIN preview for Buyer */}
                        {isBuyer && tx.verificationCode && (tx.status === 'ready_for_pickup' || tx.status === 'pickup_scheduled') && (
                          <span className="inline-flex items-center gap-1 font-bold text-warning bg-warning-surface px-2 py-0.5 rounded font-mono">
                            <KeyRound className="w-3 h-3" /> Code PIN : {tx.verificationCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Total & CTA */}
                  <div className="text-right sm:self-center shrink-0 flex flex-col items-end gap-1.5 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-stone-100 mt-2 sm:mt-0">
                    <div className="text-xl font-black text-stone-900">
                      {formatPrice(isSeller ? (tx.sellerPayoutAmount || tx.amount) : tx.totalAmount)}
                    </div>
                    <span className="text-xs font-medium text-stone-500 mb-1">
                      {isSeller ? '(Gain net vendeur)' : `(Total avec protection)`}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      className="w-full sm:w-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTx(tx);
                      }}
                    >{t('transactions.transactionsPage.gererLeDossier')}</Button>
                  </div>
                </div>

                {/* Progress Mini Step Tracker. */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/60 flex items-center justify-between gap-3 text-xs font-medium text-stone-600 overflow-x-auto no-scrollbar shadow-inner">
                  <div className="flex items-center gap-1 font-semibold text-success shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="whitespace-nowrap">{t('transactions.transactionsPage.paiementSousSequestre')}</span>
                  </div>
                  <span className="text-stone-300 shrink-0">→</span>
                  <div className={`flex items-center gap-1 font-semibold shrink-0 whitespace-nowrap ${
                    tx.status !== 'pending_seller_confirmation' ? 'text-success' : 'text-warning'
                  }`}>
                    {tx.status !== 'pending_seller_confirmation' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-warning shrink-0 animate-pulse" />
                    )}
                    <span>{t('transactions.transactionsPage.validationVendeur')}</span>
                  </div>
                  <span className="text-stone-300 shrink-0">→</span>
                  <div className={`flex items-center gap-1 font-semibold shrink-0 whitespace-nowrap ${
                    tx.status === 'completed' || tx.status === 'shipped' || tx.status === 'delivered' || tx.status === 'handover_confirmed'
                      ? 'text-success'
                      : 'text-stone-500'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Remise / Envoi</span>
                  </div>
                  <span className="text-stone-300 shrink-0">→</span>
                  <div className={`flex items-center gap-1 font-semibold shrink-0 whitespace-nowrap ${
                    tx.status === 'completed' ? 'text-success font-bold' : 'text-stone-500'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('transactions.transactionsPage.fondsVerses')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <EmptyState
          icon={<ShoppingBag className="w-10 h-10 text-stone-400" />}
          title={activeTab === 'purchases' ? "Aucun achat ou réservation en cours" : "Aucune vente ou réservation reçue"}
          description={
            activeTab === 'purchases'
              ? "Découvrez des milliers d'annonces vérifiées et réservez en toute sécurité avec notre garantie séquestre."
              : "Activez l'option de réservation sur vos annonces pour recevoir des paiements sécurisés immédiats."
          }
          action={
            <Button
              to={activeTab === 'purchases' ? routes.search() : routes.listing.publish()}
              variant="primary"
            >
              {activeTab === 'purchases' ? "Explorer les annonces" : "Déposer une annonce"}
            </Button>
          }
        />
      )}

      {/* Transaction Detail & Actions Modal */}
      {selectedTx && (
        <TransactionDetailModal
          isOpen={!!selectedTx}
          onClose={() => setSelectedTx(null)}
          transaction={selectedTx}
          currentUser={currentUser}
          onUpdate={handleTransactionUpdated}
        />
      )}

      {/* Seller Payout Withdrawal Modal */}
      {isPayoutModalOpen && (
        <SellerPayoutModal
          isOpen={isPayoutModalOpen}
          onClose={() => setIsPayoutModalOpen(false)}
          currentUser={currentUser}
          availableBalance={earningsSummary.availableBalance}
          onPayoutSuccess={(payout) => {
            fetchTransactions();
          }}
        />
      )}
    </div>
  );
};
