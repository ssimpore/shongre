import React, { useState } from 'react';
import {
  
  CheckCircle2,
  Clock,
  AlertTriangle,
  
  Truck,
  KeyRound,
  Copy,
  Check,
  
  Calendar,
  
  
  
  
  
  
  
  
  Star
} from 'lucide-react';
import { Transaction, UserProfile } from '../../../types';
import { transactionService } from '../../../domains/transaction/transaction.service';
import { Modal } from '../../../design-system/primitives/Modal';
import { ConfirmModal } from '../../../design-system/primitives/ConfirmModal';
import { Button } from '../../../design-system/primitives/Button';
import { formatPrice, formatRelativeDate } from '../../../utilities/formatters';
import { DisputeModal } from './DisputeModal';
import { LeaveReviewModal } from './LeaveReviewModal';
import { Image } from '../../../design-system/primitives/Image';
import { useTranslation } from '../../../i18n/I18nProvider';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  currentUser: UserProfile;
  onUpdate: (updatedTx: Transaction) => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction: initialTx,
  currentUser,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [tx, setTx] = useState<Transaction>(initialTx);
  const [sellerInputPin, setSellerInputPin] = useState('');
  const [trackingInput, setTrackingInput] = useState('');
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [isReceiptConfirmOpen, setIsReceiptConfirmOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  // Rendezvous editing
  const [isEditingMeeting, setIsEditingMeeting] = useState(false);
  const [meetingDate, setMeetingDate] = useState(tx.pickupDetails?.scheduledDate || '');
  const [meetingPlace, setMeetingPlace] = useState(tx.pickupDetails?.meetingPlace || '');
  const [meetingPhone, setMeetingPhone] = useState(tx.pickupDetails?.sellerPhone || tx.pickupDetails?.buyerPhone || '');

  const isBuyer = currentUser.id === tx.buyerId;
  const isSeller = currentUser.id === tx.sellerId;

  const copyPin = () => {
    if (tx.verificationCode) {
      navigator.clipboard.writeText(tx.verificationCode);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleSellerAccept = async () => {
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const updated = await transactionService.sellerAcceptReservation(tx.id, currentUser);
      setTx(updated);
      onUpdate(updated);
      setFeedbackMsg({ type: 'success', text: 'Réservation acceptée avec succès !' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erreur lors de l\'acceptation.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSellerReject = async () => {
    setIsRejectConfirmOpen(false);
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const updated = await transactionService.sellerRejectReservation(tx.id, currentUser);
      setTx(updated);
      onUpdate(updated);
      setFeedbackMsg({ type: 'success', text: 'Réservation refusée. Remboursement automatique exécuté.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erreur lors du refus.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    if (!sellerInputPin.trim()) return;
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const updated = await transactionService.confirmHandoverWithPin(tx.id, currentUser, sellerInputPin);
      setTx(updated);
      onUpdate(updated);
      setSellerInputPin('');
      setFeedbackMsg({ type: 'success', text: 'Code validé ! Vente clôturée et fonds débloqués.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Code secret incorrect.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBuyerReceipt = async () => {
    setIsReceiptConfirmOpen(false);
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const updated = await transactionService.confirmBuyerReceipt(tx.id, currentUser);
      setTx(updated);
      onUpdate(updated);
      setFeedbackMsg({ type: 'success', text: 'Réception confirmée ! Les fonds ont été débloqués au vendeur.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erreur de confirmation.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleShipOrder = async () => {
    if (!trackingInput.trim()) return;
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const updated = await transactionService.shipOrder(tx.id, currentUser, trackingInput, tx.carrierName);
      setTx(updated);
      onUpdate(updated);
      setTrackingInput('');
      setFeedbackMsg({ type: 'success', text: 'Expédition enregistrée et acheteur notifié !' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erreur d\'expédition.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveMeeting = async () => {
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const updated = await transactionService.updatePickupSchedule(tx.id, currentUser, {
        scheduledDate: meetingDate,
        meetingPlace,
        phone: meetingPhone,
      });
      setTx(updated);
      onUpdate(updated);
      setIsEditingMeeting(false);
      setFeedbackMsg({ type: 'success', text: 'Rendez-vous de remise enregistré !' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erreur lors de la mise à jour.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancelByBuyer = async () => {
    setIsCancelConfirmOpen(false);
    setActionLoading(true);
    setFeedbackMsg(null);
    try {
      const updated = await transactionService.cancelReservationByBuyer(tx.id, currentUser);
      setTx(updated);
      onUpdate(updated);
      setFeedbackMsg({ type: 'success', text: 'Réservation annulée. Remboursement automatique sous 24-48h.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Impossible d\'annuler la réservation.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Status mapping
  const getStatusBadge = () => {
    switch (tx.status) {
      case 'pending_seller_confirmation':
        return {
          label: 'En attente d\'acceptation du vendeur',
          bg: 'bg-warning-surface text-warning border-warning-border',
          desc: 'Le vendeur dispose de 48h pour valider la réservation. Les fonds sont sécurisés sous séquestre.',
        };
      case 'seller_confirmed':
      case 'ready_for_pickup':
      case 'pickup_scheduled':
        return {
          label: tx.deliveryMethod === 'hand_delivery' ? 'Réservé - Remise en main propre' : 'Réservé - En préparation d\'envoi',
          bg: 'bg-success-surface text-success border-success-border',
          desc: 'Réservation confirmée par le vendeur. Procédez à la remise physique ou à l\'expédition.',
        };
      case 'shipped':
        return {
          label: 'Colis expédié',
          bg: 'bg-info-surface text-info border-info-border',
          desc: `Colis en cours de livraison (${tx.carrierName || 'Mondial Relay'}).`,
        };
      case 'delivered':
        return {
          label: 'Colis livré - En attente de validation acheteur',
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          desc: 'L\'acheteur a 48h pour inspecter l\'article et confirmer la conformité.',
        };
      case 'completed':
        return {
          label: 'Vente finalisée & Fonds débloqués',
          bg: 'bg-success text-white border-emerald-700',
          desc: 'Transaction terminée avec succès. Les fonds ont été reversés sur le solde vendeur.',
        };
      case 'disputed':
        return {
          label: 'Litige ouvert - Arbitrage en cours',
          bg: 'bg-danger-surface text-danger border-danger-border',
          desc: 'Un problème a été signalé. Les fonds sous séquestre sont temporairement gelés.',
        };
      case 'seller_rejected':
      case 'cancelled_by_buyer':
      case 'cancelled_by_seller':
      case 'refunded':
        return {
          label: 'Réservation annulée - Remboursée',
          bg: 'bg-stone-200 text-stone-800 border-stone-300',
          desc: 'Les fonds ont été intégralement recrédités sur le compte de l\'acheteur.',
        };
      default:
        return {
          label: 'Séquestre actif',
          bg: 'bg-stone-100 text-stone-800 border-stone-200',
          desc: 'Transaction en cours.',
        };
    }
  };

  const statusInfo = getStatusBadge();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dossier de Réservation ${tx.code || tx.id}`}
      description={t('transactions.transactionDetailModal.paiementGarantiParLeService')}
      className="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Feedback alert */}
        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl font-semibold flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-success-surface border border-success-border text-success'
                : 'bg-danger-surface border border-danger-border text-danger'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Top Status Banner */}
        <div className={`p-5 rounded-3xl border ${statusInfo.bg} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="font-black text-sm uppercase tracking-wide">{statusInfo.label}</span>
            <span className="text-xs font-bold opacity-80 font-mono">{tx.code || tx.id}</span>
          </div>
          <p className="text-sm mt-1 opacity-90 leading-relaxed font-medium">{statusInfo.desc}</p>
        </div>

        {/* Item & Counterpart summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Item details */}
          <div className="p-4 bg-stone-50 border border-stone-200/60 rounded-2xl flex items-center gap-4 shadow-2xs">
            <Image
              src={tx.listingPhotoUrl || tx.listingCoverImageUrl}
              alt={tx.listingTitle}
              sizes="64px"
              className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-0.5">{t('transactions.transactionDetailModal.articleReserve')}</span>
              <h4 className="font-black text-stone-900 truncate">{tx.listingTitle}</h4>
              <p className="text-primary font-black text-base mt-0.5">{formatPrice(tx.amount)}</p>
            </div>
          </div>

          {/* Counterpart profile */}
          <div className="p-4 bg-stone-50 border border-stone-200/60 rounded-2xl flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-0.5">
                {isBuyer ? 'Vendeur' : 'Acheteur'}
              </span>
              <p className="font-black text-stone-900">{isBuyer ? tx.sellerName : tx.buyerName}</p>
              <p className="text-xs font-medium text-stone-500 mt-0.5">
                Mode : {tx.deliveryMethod === 'hand_delivery' ? 'Remise en main propre' : tx.carrierName || 'Livraison'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-lg shadow-inner">
              {(isBuyer ? tx.sellerName : tx.buyerName).charAt(0)}
            </div>
          </div>
        </div>

        {/* SELLER ACTION: ACCEPT OR REJECT PENDING RESERVATION */}
        {isSeller && tx.status === 'pending_seller_confirmation' && (
          <div className="p-4 bg-warning-surface border border-warning-border rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-warning font-bold">
              <Clock className="w-4 h-4 text-warning" />
              <span>{t('transactions.transactionDetailModal.actionRequiseAccepterOuRefuser')}</span>
            </div>
            <p className="text-micro text-warning leading-relaxed">
              L'acheteur a payé {formatPrice(tx.totalAmount)} qui sont actuellement garantis sous séquestre. En acceptant, vous vous engagez à remettre ou expédier l'article.
            </p>
            <div className="flex gap-2.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="border-danger-border text-danger hover:bg-danger-surface"
                disabled={actionLoading}
                onClick={() => setIsRejectConfirmOpen(true)}
              >{t('transactions.transactionDetailModal.refuserEtRembourser')}</Button>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                disabled={actionLoading}
                onClick={handleSellerAccept}
              >
                Accepter la réservation ({formatPrice(tx.sellerPayoutAmount || tx.amount)} à percevoir)
              </Button>
            </div>
          </div>
        )}

        {/* HAND DELIVERY OTP PIN SECTION */}
        {tx.deliveryMethod === 'hand_delivery' && (tx.status === 'ready_for_pickup' || tx.status === 'pickup_scheduled') && (
          <div className="p-4 bg-stone-900 text-white rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                <span className="font-bold text-stone-100">{t('transactions.transactionDetailModal.codeSecretDeConfirmation')}</span>
              </div>
              <span className="text-micro bg-success/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">{t('transactions.transactionDetailModal.securiteMainPropre')}</span>
            </div>

            {/* If user is Buyer: display the code to give to seller */}
            {isBuyer && (
              <div className="space-y-2">
                <p className="text-micro text-stone-300">{t('transactions.transactionDetailModal.donnezCeCodeSecretA')}<strong>{t('transactions.transactionDetailModal.uniquementApresAvoirVerifieLa')}</strong> :
                </p>
                <div className="flex items-center justify-between bg-stone-800 p-3 rounded-xl border border-stone-700">
                  {/* The 6-digit handover code sits on a stone-800 panel, where the
                      light-surface primary drops to ~2.6:1. This is safety-critical
                      content, so it uses the inverse-surface brand variant. */}
                  <span className="text-3xl font-black font-mono tracking-widest text-primary-on-dark">
                    {tx.verificationCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyPin}
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-200 hover:text-white bg-stone-700 hover:bg-stone-600 px-3 py-2 rounded-lg transition-colors"
                  >
                    {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPin ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* If user is Seller: input code given by buyer */}
            {isSeller && (
              <div className="space-y-2.5">
                <p className="text-micro text-stone-300">{t('transactions.transactionDetailModal.demandezALAcheteurSon')}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="ex: 849201"
                    value={sellerInputPin}
                    onChange={(e) => setSellerInputPin(e.target.value)}
                    className="flex-1 h-control-touch px-3.5 bg-stone-800 text-white font-mono text-lg font-bold tracking-widest rounded-xl border border-stone-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={actionLoading || sellerInputPin.length < 6}
                    onClick={handleVerifyPin}
                  >{t('transactions.transactionDetailModal.validerLaRemise')}</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SHIPPING & TRACKING SECTION */}
        {tx.deliveryMethod !== 'hand_delivery' && (
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <span className="font-bold text-stone-900">Suivi d'expédition ({tx.carrierName})</span>
              </div>
              {tx.trackingNumber && (
                <span className="text-micro font-bold text-info bg-info-surface px-2 py-0.5 rounded font-mono">
                  {tx.trackingNumber}
                </span>
              )}
            </div>

            {/* Seller inputs tracking number */}
            {isSeller && (tx.status === 'seller_confirmed' || tx.status === 'pending_seller_confirmation') && (
              <div className="space-y-2 pt-1">
                <label className="font-semibold text-stone-700 block">{t('transactions.transactionDetailModal.renseignerLeNumeroDeSuivi')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ex: MR-984021984FR"
                    value={trackingInput}
                    onChange={(e) => setTrackingInput(e.target.value)}
                    className="flex-1 h-10 px-3 bg-white text-stone-900 rounded-xl border border-stone-200 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={actionLoading || !trackingInput.trim()}
                    onClick={handleShipOrder}
                  >
                    Confirmer l'envoi
                  </Button>
                </div>
              </div>
            )}

            {/* Buyer confirms receipt */}
            {isBuyer && (tx.status === 'shipped' || tx.status === 'delivered') && (
              <div className="p-3 bg-success-surface border border-success-border rounded-xl space-y-2">
                <p className="font-bold text-success">{t('transactions.transactionDetailModal.avezVousBienRecuL')}</p>
                <p className="text-micro text-success leading-relaxed">{t('transactions.transactionDetailModal.siLeColisEstArrive')}</p>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  fullWidth
                  disabled={actionLoading}
                  onClick={() => setIsReceiptConfirmOpen(true)}
                >{t('transactions.transactionDetailModal.jAiBienRecuL')}</Button>
              </div>
            )}
          </div>
        )}

        {/* RENDEZVOUS & MEETING COORDINATOR (FOR PICKUP) */}
        {tx.deliveryMethod === 'hand_delivery' && (
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-stone-800">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{t('transactions.transactionDetailModal.rendezVousDeRemiseConvenu')}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingMeeting(!isEditingMeeting)}
                className="text-xs text-primary font-bold hover:underline"
              >
                {isEditingMeeting ? 'Annuler' : 'Modifier'}
              </button>
            </div>

            {!isEditingMeeting ? (
              <div className="text-xs text-stone-700 space-y-1">
                <div>
                  <span className="text-stone-500">{t('transactions.transactionDetailModal.datePrevue')} </span>
                  <span className="font-semibold">{tx.pickupDetails?.scheduledDate || 'À définir'}</span>
                </div>
                <div>
                  <span className="text-stone-500">Lieu : </span>
                  <span className="font-semibold">{tx.pickupDetails?.meetingPlace || 'À convenir avec le vendeur'}</span>
                </div>
                {(tx.pickupDetails?.sellerPhone || tx.pickupDetails?.buyerPhone) && (
                  <div>
                    <span className="text-stone-500">{t('transactions.transactionDetailModal.telephoneDeContact')} </span>
                    <span className="font-semibold">{tx.pickupDetails?.sellerPhone || tx.pickupDetails?.buyerPhone}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-2 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">{t('transactions.transactionDetailModal.dateEtHeure')}</label>
                  <input
                    type="text"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    placeholder={t('transactions.transactionDetailModal.exSamedi22AoutA')}
                    className="w-full h-8 px-2.5 bg-white border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">{t('transactions.transactionDetailModal.lieuDeRencontre')}</label>
                  <input
                    type="text"
                    value={meetingPlace}
                    onChange={(e) => setMeetingPlace(e.target.value)}
                    placeholder={t('transactions.transactionDetailModal.ex12RueDesRemparts')}
                    className="w-full h-8 px-2.5 bg-white border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">{t('transactions.transactionDetailModal.numeroDeTelephoneDirect')}</label>
                  <input
                    type="text"
                    value={meetingPhone}
                    onChange={(e) => setMeetingPhone(e.target.value)}
                    placeholder="ex: 06 12 34 56 78"
                    className="w-full h-8 px-2.5 bg-white border border-stone-200 rounded-lg"
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  fullWidth
                  disabled={actionLoading}
                  onClick={handleSaveMeeting}
                >{t('transactions.transactionDetailModal.enregistrerLeRendezVous')}</Button>
              </div>
            )}
          </div>
        )}

        {/* FINANCIAL SUMMARY & ESCROW STATUS */}
        <div className="p-5 bg-white border border-stone-200/60 rounded-2xl space-y-2 shadow-2xs font-medium text-sm">
          <span className="font-black text-stone-800 block mb-3">{t('transactions.transactionDetailModal.recapitulatifFinancier')}</span>
          <div className="flex justify-between text-stone-600">
            <span>Prix article :</span>
            <span className="font-black text-stone-900">{formatPrice(tx.amount)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Protection Acheteurs Shongre :</span>
            <span className="font-black text-stone-900">{formatPrice(tx.protectionFee)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>{t('transactions.transactionDetailModal.fraisDePort')}</span>
            <span className="font-black text-stone-900">{formatPrice(tx.shippingFee)}</span>
          </div>
          <div className="border-t border-stone-100 pt-3 flex justify-between font-black text-stone-900 text-base">
            <span>{t('transactions.transactionDetailModal.totalRegleParLAcheteur')}</span>
            <span className="text-primary text-lg">{formatPrice(tx.totalAmount)}</span>
          </div>
          {isSeller && (
            <div className="bg-success-surface p-3 rounded-xl mt-3 flex justify-between font-bold text-success border border-success-border">
              <span>{t('transactions.transactionDetailModal.montantNetVerseAuVendeur')}</span>
              <span>{formatPrice(tx.sellerPayoutAmount || tx.amount)}</span>
            </div>
          )}
        </div>

        {/* TIMELINE / AUDIT LOG */}
        {tx.statusHistory && tx.statusHistory.length > 0 && (
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <span className="font-bold text-stone-800 block">{t('transactions.transactionDetailModal.historiqueDuDossier')}</span>
            <div className="space-y-2">
              {tx.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-micro">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-stone-800 font-medium">{h.note || h.status}</p>
                    <span className="text-stone-500 text-micro">
                      {formatRelativeDate(h.timestamp)} • par {h.actorName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DISPUTE & CANCELLATION FOOTER */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100">
          {/* Buyer Cancel Button if pending */}
          {isBuyer && (tx.status === 'pending_seller_confirmation' || tx.status === 'ready_for_pickup') && (
            <button
              type="button"
              onClick={() => setIsCancelConfirmOpen(true)}
              disabled={actionLoading}
              className="text-micro font-bold text-stone-500 hover:text-danger transition-colors"
            >{t('transactions.transactionDetailModal.annulerMaReservation')}</button>
          )}

          {/* Leave Review Button on Completed Transaction */}
          {tx.status === 'completed' && !tx.reviewId && isBuyer && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsReviewModalOpen(true)}
              leftIcon={<Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />}
            >{t('transactions.transactionDetailModal.laisserUneEvaluation')}</Button>
          )}

          {/* Open Dispute Button */}
          {tx.status !== 'completed' && tx.status !== 'disputed' && tx.status !== 'refunded' && (
            <button
              type="button"
              onClick={() => setIsDisputeModalOpen(true)}
              className="text-micro font-bold text-warning hover:text-warning flex items-center gap-1"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t('transactions.transactionDetailModal.signalerUnProblemeLitige')}</span>
            </button>
          )}

          <Button type="button" variant="outline" size="sm" onClick={onClose} className="ml-auto">
            Fermer
          </Button>
        </div>
      </div>

      {/* Leave Review Modal */}
      {isReviewModalOpen && (
        <LeaveReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          transaction={tx}
          currentUser={currentUser}
          onReviewSubmitted={(reviewId) => {
            const updated: Transaction = {
              ...tx,
              reviewId,
            };
            setTx(updated);
            onUpdate(updated);
            setFeedbackMsg({ type: 'success', text: 'Évaluation publiée avec succès !' });
          }}
        />
      )}

      {/* Dispute Modal */}
      {isDisputeModalOpen && (
        <DisputeModal
          isOpen={isDisputeModalOpen}
          onClose={() => setIsDisputeModalOpen(false)}
          transaction={tx}
          currentUser={currentUser}
          onSuccess={(updated) => {
            setTx(updated);
            onUpdate(updated);
            setFeedbackMsg({ type: 'success', text: 'Litige ouvert. Les fonds sous séquestre sont protégés.' });
          }}
        />
      )}

      {/* Seller Reject Confirmation Modal */}
      <ConfirmModal
        isOpen={isRejectConfirmOpen}
        onClose={() => setIsRejectConfirmOpen(false)}
        onConfirm={handleConfirmSellerReject}
        title={t('transactions.transactionDetailModal.refuserLaReservation')}
        message="Êtes-vous sûr de vouloir refuser cette réservation ? L'acheteur sera automatiquement et intégralement remboursé sur son moyen de paiement."
        confirmText="Refuser & Rembourser"
        variant="danger"
        isLoading={actionLoading}
      />

      {/* Buyer Receipt Confirmation Modal */}
      <ConfirmModal
        isOpen={isReceiptConfirmOpen}
        onClose={() => setIsReceiptConfirmOpen(false)}
        onConfirm={handleConfirmBuyerReceipt}
        title={t('transactions.transactionDetailModal.confirmerLaReceptionConforme')}
        message="Confirmez-vous avoir bien reçu l'article en bon état et conforme à l'annonce ? Les fonds garantis sous séquestre seront immédiatement débloqués au vendeur."
        confirmText="Confirmer & Débloquer les fonds"
        variant="success"
        isLoading={actionLoading}
      />

      {/* Buyer Cancellation Modal */}
      <ConfirmModal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleConfirmCancelByBuyer}
        title={t('transactions.transactionDetailModal.annulerVotreReservation')}
        message="Souhaitez-vous annuler votre réservation ? Le montant total payé vous sera intégralement recrédité sous 24 à 48h."
        confirmText="Annuler ma réservation"
        variant="warning"
        isLoading={actionLoading}
      />
    </Modal>
  );
};
