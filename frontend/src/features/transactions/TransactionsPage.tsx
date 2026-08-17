import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Package,
  ExternalLink,
  DollarSign,
  MapPin,
  KeyRound,
  AlertTriangle,
  Landmark,
  ArrowUpRight,
  Filter,
  Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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

type TabMode = 'purchases' | 'sales';
type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'disputed';

export const TransactionsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabMode>('purchases');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [purchasesCount, setPurchasesCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
        return <Badge variant="warning">En attente confirmation vendeur</Badge>;
      case 'seller_confirmed':
      case 'ready_for_pickup':
      case 'pickup_scheduled':
        return (
          <Badge variant="primary">
            {deliveryMethod === 'hand_delivery' ? 'Réservé - Remise en main propre' : 'Réservé - À expédier'}
          </Badge>
        );
      case 'shipped':
        return <Badge variant="primary">Colis expédié</Badge>;
      case 'delivered':
      case 'handover_confirmed':
        return <Badge variant="warning">Livré - En attente validation</Badge>;
      case 'completed':
        return <Badge variant="verified">Finalisée & Payée</Badge>;
      case 'disputed':
        return <Badge variant="urgent">Litige en cours</Badge>;
      case 'seller_rejected':
      case 'cancelled_by_buyer':
      case 'cancelled_by_seller':
      case 'refunded':
      case 'expired':
        return <Badge variant="neutral">Annulée & Remboursée</Badge>;
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
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            Transactions, Réservations & Séquestre
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Gérez vos réservations, vos remises en main propre et le déblocage des fonds sécurisés
          </p>
        </div>

        {/* Seller Earnings Card */}
        {earningsSummary.totalEarnings > 0 || earningsSummary.escrowHeldBalance > 0 ? (
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-border-base shadow-xs">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="text-micro font-bold text-stone-500 uppercase tracking-wider">
                Solde disponible
              </div>
              <div className="text-base font-black text-stone-900">
                {formatPrice(earningsSummary.availableBalance)}
              </div>
            </div>
            {earningsSummary.availableBalance > 0 && (
              <Button
                variant="primary"
                size="sm"
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
      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-950">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong>Garantie Séquestre Shongre :</strong> Vos fonds restent protégés par un tiers de confiance agréé ACPR. Les paiements ne sont débloqués qu'après validation conforme de la remise.
          </span>
        </div>
        {earningsSummary.escrowHeldBalance > 0 && (
          <span className="text-xs font-bold text-emerald-900 bg-emerald-200/60 px-2.5 py-1 rounded-xl shrink-0">
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
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
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
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
        >
          En cours & Réservées ({userTransactions.filter((t) => t.status === 'seller_confirmed' || t.status === 'ready_for_pickup' || t.status === 'pickup_scheduled' || t.status === 'shipped' || t.status === 'delivered').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === 'completed'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          Finalisées ({userTransactions.filter((t) => t.status === 'completed').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('disputed')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
            statusFilter === 'disputed'
              ? 'bg-rose-600 text-white'
              : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
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
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4 hover:border-primary/40 transition-all cursor-pointer"
                onClick={() => setSelectedTx(tx)}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-stone-900 font-mono">
                      Dossier {tx.code || `#${tx.id.toUpperCase()}`}
                    </span>
                    <span className="text-stone-300">•</span>
                    <span className="text-xs text-stone-500">{formatRelativeDate(tx.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(tx.status, tx.deliveryMethod)}
                  </div>
                </div>

                {/* Main Card Content */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                    <Image
                      src={tx.listingCoverImageUrl || tx.listingPhotoUrl}
                      alt=""
                      className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-stone-900 hover:text-primary truncate block">
                        {tx.listingTitle}
                      </h3>
                      <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                        <span>{isBuyer ? 'Vendeur' : 'Acheteur'} :</span>
                        <strong className="text-stone-800 font-semibold">{isBuyer ? tx.sellerName : tx.buyerName}</strong>
                      </div>

                      {/* Delivery badge */}
                      <div className="flex items-center gap-2 mt-1.5 text-micro">
                        {tx.deliveryMethod === 'hand_delivery' ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            <MapPin className="w-3 h-3" /> Remise en main propre
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            <Truck className="w-3 h-3" /> {tx.carrierName || 'Livraison Colis'}
                          </span>
                        )}

                        {/* Verification PIN preview for Buyer */}
                        {isBuyer && tx.verificationCode && (tx.status === 'ready_for_pickup' || tx.status === 'pickup_scheduled') && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-mono">
                            <KeyRound className="w-3 h-3" /> Code PIN : {tx.verificationCode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Total & CTA */}
                  <div className="text-right sm:self-center shrink-0 flex flex-col items-end gap-1">
                    <div className="text-lg font-black text-stone-900">
                      {formatPrice(isSeller ? (tx.sellerPayoutAmount || tx.amount) : tx.totalAmount)}
                    </div>
                    <span className="text-micro text-stone-500">
                      {isSeller ? '(Gain net vendeur)' : `(Total avec protection)`}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTx(tx);
                      }}
                    >
                      Gérer le dossier
                    </Button>
                  </div>
                </div>

                {/* Progress Mini Step Tracker. The four escrow stages plus their
                    arrows cannot fit a 320px screen, and wrapping would break the
                    left-to-right progression — so the rail scrolls instead. */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between gap-2 text-micro text-stone-600 overflow-x-auto no-scrollbar">
                  <div className="flex items-center gap-1 font-semibold text-emerald-700 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="whitespace-nowrap">Paiement sous séquestre</span>
                  </div>
                  <span className="text-stone-300 shrink-0">→</span>
                  <div className={`flex items-center gap-1 font-semibold shrink-0 whitespace-nowrap ${
                    tx.status !== 'pending_seller_confirmation' ? 'text-emerald-700' : 'text-warning'
                  }`}>
                    {tx.status !== 'pending_seller_confirmation' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                    )}
                    <span>Validation vendeur</span>
                  </div>
                  <span className="text-stone-300 shrink-0">→</span>
                  <div className={`flex items-center gap-1 font-semibold shrink-0 whitespace-nowrap ${
                    tx.status === 'completed' || tx.status === 'shipped' || tx.status === 'delivered' || tx.status === 'handover_confirmed'
                      ? 'text-emerald-700'
                      : 'text-stone-500'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Remise / Envoi</span>
                  </div>
                  <span className="text-stone-300 shrink-0">→</span>
                  <div className={`flex items-center gap-1 font-semibold shrink-0 whitespace-nowrap ${
                    tx.status === 'completed' ? 'text-emerald-700 font-bold' : 'text-stone-500'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Fonds versés</span>
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
            <Link to={activeTab === 'purchases' ? routes.search() : routes.listing.publish()}>
              <Button variant="primary">
                {activeTab === 'purchases' ? "Explorer les annonces" : "Déposer une annonce"}
              </Button>
            </Link>
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
