import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  Truck,
  KeyRound,
  Copy,
  Check,
  Send,
  Calendar,
  Phone,
  FileText,
  HelpCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  ArrowDownCircle,
  Sparkles,
  Star,
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
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'support';

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
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          desc: 'Le vendeur dispose de 48h pour valider la réservation. Les fonds sont sécurisés sous séquestre.',
        };
      case 'seller_confirmed':
      case 'ready_for_pickup':
      case 'pickup_scheduled':
        return {
          label: tx.deliveryMethod === 'hand_delivery' ? 'Réservé - Remise en main propre' : 'Réservé - En préparation d\'envoi',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          desc: 'Réservation confirmée par le vendeur. Procédez à la remise physique ou à l\'expédition.',
        };
      case 'shipped':
        return {
          label: 'Colis expédié',
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
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
          bg: 'bg-emerald-600 text-white border-emerald-700',
          desc: 'Transaction terminée avec succès. Les fonds ont été reversés sur le solde vendeur.',
        };
      case 'disputed':
        return {
          label: 'Litige ouvert - Arbitrage en cours',
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
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
      description="Paiement garanti par le service de séquestre sécurisé Shongre"
      className="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Feedback alert */}
        {feedbackMsg && (
          <div
            className={`p-3 rounded-xl font-semibold flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Top Status Banner */}
        <div className={`p-4 rounded-2xl border ${statusInfo.bg} shadow-xs`}>
          <div className="flex items-center justify-between">
            <span className="font-black text-sm uppercase tracking-wide">{statusInfo.label}</span>
            <span className="text-micro font-bold opacity-80 font-mono">{tx.code || tx.id}</span>
          </div>
          <p className="text-xs mt-1 opacity-90 leading-relaxed">{statusInfo.desc}</p>
        </div>

        {/* Item & Counterpart summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Item details */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center gap-3">
            <Image
              src={tx.listingPhotoUrl || tx.listingCoverImageUrl}
              alt={tx.listingTitle}
              className="w-14 h-14 rounded-lg object-cover border border-stone-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="text-micro font-bold uppercase tracking-wider text-stone-500 block">
                Article réservé
              </span>
              <h4 className="font-bold text-stone-900 truncate">{tx.listingTitle}</h4>
              <p className="text-primary font-black text-sm mt-0.5">{formatPrice(tx.amount)}</p>
            </div>
          </div>

          {/* Counterpart profile */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-micro font-bold uppercase tracking-wider text-stone-500 block">
                {isBuyer ? 'Vendeur' : 'Acheteur'}
              </span>
              <p className="font-bold text-stone-900 mt-0.5">{isBuyer ? tx.sellerName : tx.buyerName}</p>
              <p className="text-micro text-stone-500">
                Mode : {tx.deliveryMethod === 'hand_delivery' ? 'Remise en main propre' : tx.carrierName || 'Livraison'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-sm">
              {(isBuyer ? tx.sellerName : tx.buyerName).charAt(0)}
            </div>
          </div>
        </div>

        {/* SELLER ACTION: ACCEPT OR REJECT PENDING RESERVATION */}
        {isSeller && tx.status === 'pending_seller_confirmation' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-amber-950 font-bold">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Action requise : Accepter ou Refuser la réservation</span>
            </div>
            <p className="text-micro text-amber-900 leading-relaxed">
              L'acheteur a payé {formatPrice(tx.totalAmount)} qui sont actuellement garantis sous séquestre. En acceptant, vous vous engagez à remettre ou expédier l'article.
            </p>
            <div className="flex gap-2.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="border-rose-300 text-rose-700 hover:bg-rose-50"
                disabled={actionLoading}
                onClick={() => setIsRejectConfirmOpen(true)}
              >
                Refuser et rembourser
              </Button>
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
                <span className="font-bold text-stone-100">Code secret de confirmation</span>
              </div>
              <span className="text-micro bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                Sécurité main propre
              </span>
            </div>

            {/* If user is Buyer: display the code to give to seller */}
            {isBuyer && (
              <div className="space-y-2">
                <p className="text-micro text-stone-300">
                  Donnez ce code secret à 6 chiffres au vendeur lors du rendez-vous, <strong>uniquement après avoir vérifié la conformité de l'article</strong> :
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
                <p className="text-micro text-stone-300">
                  Demandez à l'acheteur son code de confirmation à 6 chiffres lors de la remise pour débloquer immédiatement vos fonds :
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="ex: 849201"
                    value={sellerInputPin}
                    onChange={(e) => setSellerInputPin(e.target.value)}
                    className="flex-1 h-11 px-3.5 bg-stone-800 text-white font-mono text-lg font-bold tracking-widest rounded-xl border border-stone-700 focus:outline-none focus:border-primary"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={actionLoading || sellerInputPin.length < 6}
                    onClick={handleVerifyPin}
                  >
                    Valider la remise
                  </Button>
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
                <span className="text-micro font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-mono">
                  {tx.trackingNumber}
                </span>
              )}
            </div>

            {/* Seller inputs tracking number */}
            {isSeller && (tx.status === 'seller_confirmed' || tx.status === 'pending_seller_confirmation') && (
              <div className="space-y-2 pt-1">
                <label className="font-semibold text-stone-700 block">
                  Renseigner le numéro de suivi du colis :
                </label>
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
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <p className="font-bold text-emerald-950">Avez-vous bien reçu l'article ?</p>
                <p className="text-micro text-emerald-800 leading-relaxed">
                  Si le colis est arrivé et que l'objet est conforme à la description, validez la réception pour débloquer les fonds au vendeur.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  fullWidth
                  disabled={actionLoading}
                  onClick={() => setIsReceiptConfirmOpen(true)}
                >
                  J'ai bien reçu l'article conforme
                </Button>
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
                <span>Rendez-vous de remise convenu</span>
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
                  <span className="text-stone-500">Date prévue : </span>
                  <span className="font-semibold">{tx.pickupDetails?.scheduledDate || 'À définir'}</span>
                </div>
                <div>
                  <span className="text-stone-500">Lieu : </span>
                  <span className="font-semibold">{tx.pickupDetails?.meetingPlace || 'À convenir avec le vendeur'}</span>
                </div>
                {(tx.pickupDetails?.sellerPhone || tx.pickupDetails?.buyerPhone) && (
                  <div>
                    <span className="text-stone-500">Téléphone de contact : </span>
                    <span className="font-semibold">{tx.pickupDetails?.sellerPhone || tx.pickupDetails?.buyerPhone}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-2 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Date et heure :</label>
                  <input
                    type="text"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    placeholder="ex: Samedi 22 août à 14h30"
                    className="w-full h-8 px-2.5 bg-white border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Lieu de rencontre :</label>
                  <input
                    type="text"
                    value={meetingPlace}
                    onChange={(e) => setMeetingPlace(e.target.value)}
                    placeholder="ex: 12 rue des Remparts, Bordeaux"
                    className="w-full h-8 px-2.5 bg-white border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Numéro de téléphone direct :</label>
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
                >
                  Enregistrer le rendez-vous
                </Button>
              </div>
            )}
          </div>
        )}

        {/* FINANCIAL SUMMARY & ESCROW STATUS */}
        <div className="p-3.5 bg-white border border-stone-200 rounded-xl space-y-1.5">
          <span className="font-bold text-stone-800 block mb-2">Récapitulatif financier :</span>
          <div className="flex justify-between text-stone-600">
            <span>Prix article :</span>
            <span className="font-semibold text-stone-900">{formatPrice(tx.amount)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Protection Acheteurs Shongre :</span>
            <span className="font-semibold text-stone-900">{formatPrice(tx.protectionFee)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Frais de port :</span>
            <span className="font-semibold text-stone-900">{formatPrice(tx.shippingFee)}</span>
          </div>
          <div className="border-t border-stone-100 pt-1.5 flex justify-between font-black text-stone-900">
            <span>Total réglé par l'acheteur :</span>
            <span className="text-primary">{formatPrice(tx.totalAmount)}</span>
          </div>
          {isSeller && (
            <div className="bg-emerald-50 p-2 rounded-lg mt-2 flex justify-between font-bold text-emerald-900">
              <span>Montant net versé au vendeur :</span>
              <span>{formatPrice(tx.sellerPayoutAmount || tx.amount)}</span>
            </div>
          )}
        </div>

        {/* TIMELINE / AUDIT LOG */}
        {tx.statusHistory && tx.statusHistory.length > 0 && (
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <span className="font-bold text-stone-800 block">Historique du dossier :</span>
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
              className="text-micro font-bold text-stone-500 hover:text-rose-600 transition-colors"
            >
              Annuler ma réservation
            </button>
          )}

          {/* Leave Review Button on Completed Transaction */}
          {tx.status === 'completed' && !tx.reviewId && isBuyer && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsReviewModalOpen(true)}
              leftIcon={<Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />}
            >
              Laisser une évaluation
            </Button>
          )}

          {/* Open Dispute Button */}
          {tx.status !== 'completed' && tx.status !== 'disputed' && tx.status !== 'refunded' && (
            <button
              type="button"
              onClick={() => setIsDisputeModalOpen(true)}
              className="text-micro font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Signaler un problème / Litige</span>
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
        title="Refuser la réservation ?"
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
        title="Confirmer la réception conforme ?"
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
        title="Annuler votre réservation ?"
        message="Souhaitez-vous annuler votre réservation ? Le montant total payé vous sera intégralement recrédité sous 24 à 48h."
        confirmText="Annuler ma réservation"
        variant="warning"
        isLoading={actionLoading}
      />
    </Modal>
  );
};
