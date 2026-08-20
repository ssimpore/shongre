import React, { useState } from 'react';
import {
  ShieldCheck,
  CreditCard,
  Truck,
  MapPin,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  
  
  KeyRound,
  Copy,
  Check
} from 'lucide-react';
import { Listing, UserProfile, DeliveryType, Transaction } from '../../../types';
import { transactionService } from '../../../domains/transaction/transaction.service';
import { Modal } from '../../../design-system/primitives/Modal';
import { Button } from '../../../design-system/primitives/Button';
import { SelectableCard } from '../../../design-system/primitives/SelectableCard';
import { formatPrice } from '../../../utilities/formatters';
import { useAuth } from '../../../app/providers/AuthProvider';
import { DEMO_USERS } from '../../../mocks/initialDemoData';
import { Image } from '../../../design-system/primitives/Image';
import { useTranslation } from '../../../i18n/I18nProvider';

interface ReservationCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  currentUser?: UserProfile | null;
  onReservationComplete: (transaction: Transaction) => void;
}

export const ReservationCheckoutModal: React.FC<ReservationCheckoutModalProps> = ({
  isOpen,
  onClose,
  listing,
  currentUser,
  onReservationComplete,
}) => {
  const { t } = useTranslation();
  const { currentUser: authUser } = useAuth();
  const buyerUser: UserProfile = currentUser || authUser || DEMO_USERS.buyer_thomas;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryType>('hand_delivery');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');
  
  // Card details
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardHolder, setCardHolder] = useState(buyerUser.name || 'Thomas Laurent');

  // Delivery details
  const [recipientName, setRecipientName] = useState(buyerUser.name || '');
  const [street, setStreet] = useState('15 rue Saint-Ferréol');
  const [postalCode, setPostalCode] = useState(buyerUser.postalCode || '13001');
  const [city, setCity] = useState(buyerUser.city || 'Marseille');
  const [relayPoint, setRelayPoint] = useState('Tabac Presse des Halles (MR-13001)');
  const [meetingNotes, setMeetingNotes] = useState('Disponible en fin de journée ou le week-end');
  const [buyerPhone, setBuyerPhone] = useState('06 12 34 56 78');

  const [isProcessing, setIsProcessing] = useState(false);
  const [createdTx, setCreatedTx] = useState<Transaction | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Price calculations
  const breakdown = transactionService.calculateAmounts(listing.price, deliveryMethod, listing.sellerType);

  const handlePayAndReserve = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Authorisation timing belongs to the payment adapter, not to this modal:
      // a hard-coded delay here made the demo slower than the real flow will be
      // and could not be tuned or asserted on. `simulateNetworkDelay` in the
      // adapter layer is the one place latency is configured.
      const tx = await transactionService.createReservation({
        listingId: listing.id,
        buyer: buyerUser,
        deliveryMethod,
        carrierName: deliveryMethod === 'relay_point' ? 'Mondial Relay' : deliveryMethod === 'home_delivery' ? 'Colissimo' : 'Remise en main propre',
        paymentMethod,
        cardLast4: cardNumber.slice(-4).trim() || '4242',
        cardBrand: paymentMethod === 'apple_pay' ? 'Apple Pay' : paymentMethod === 'google_pay' ? 'Google Pay' : 'Visa',
        deliveryAddress: deliveryMethod !== 'hand_delivery' ? {
          fullName: recipientName || buyerUser.name,
          street,
          postalCode,
          city,
          relayPointName: deliveryMethod === 'relay_point' ? relayPoint : undefined,
        } : undefined,
        pickupDetails: deliveryMethod === 'hand_delivery' ? {
          notes: meetingNotes,
          buyerPhone,
        } : undefined,
      });

      setCreatedTx(tx);
      setStep(4);
      onReservationComplete(tx);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors du paiement.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPinToClipboard = () => {
    if (createdTx?.verificationCode) {
      navigator.clipboard.writeText(createdTx.verificationCode);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 4 ? "Réservation confirmée avec succès !" : "Réserver avec Paiement Sécurisé Shongre"}
      description={step === 4 ? "Vos fonds sont protégés sous séquestre bancaire jusqu'à la validation de la transaction." : "Vos fonds sont bloqués sous séquestre et reversés au vendeur uniquement après votre confirmation."}
    >
      <div className="space-y-4 text-xs">
        {/* Stepper Header */}
        {step < 4 && (
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-micro ${
                step >= 1 ? 'bg-primary text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                1
              </span>
              <span className={`font-semibold ${step === 1 ? 'text-stone-900 font-bold' : 'text-stone-500'}`}>
                Remise
              </span>
            </div>
            <div className="w-8 h-px bg-stone-200" />
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-micro ${
                step >= 2 ? 'bg-primary text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                2
              </span>
              <span className={`font-semibold ${step === 2 ? 'text-stone-900 font-bold' : 'text-stone-500'}`}>{t('transactions.reservationCheckoutModal.detailsCouts')}</span>
            </div>
            <div className="w-8 h-px bg-stone-200" />
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-micro ${
                step >= 3 ? 'bg-primary text-white' : 'bg-stone-200 text-stone-600'
              }`}>
                3
              </span>
              <span className={`font-semibold ${step === 3 ? 'text-stone-900 font-bold' : 'text-stone-500'}`}>{t('transactions.reservationCheckoutModal.paiementSequestre')}</span>
            </div>
          </div>
        )}

        {/* Item Preview Card */}
        {step < 4 && (
          <div className="p-4 bg-stone-50 border border-stone-200/60 rounded-2xl flex items-center gap-4 shadow-2xs">
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              sizes="64px"
              className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-sm text-stone-900 truncate mb-1">{listing.title}</h4>
              <p className="text-stone-500 text-xs font-medium flex items-center gap-2 mb-1">
                <span>{t('transactions.reservationCheckoutModal.vendeur')} <strong className="text-stone-900">{listing.sellerName}</strong></span>
                <span>•</span>
                <span>{listing.city} ({listing.postalCode})</span>
              </p>
              <p className="text-primary font-black text-base">{formatPrice(listing.price)}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-danger-surface border border-danger-border text-danger rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* STEP 1: DELIVERY CHOICE */}
        {step === 1 && (
          <div className="space-y-3">
            <h5 className="font-bold text-stone-800">{t('transactions.reservationCheckoutModal.choisissezVotreModeDObtention')}</h5>

            <div className="space-y-2">
              {/* Hand delivery */}
              <SelectableCard
                selected={deliveryMethod === 'hand_delivery'}
                onSelect={() => setDeliveryMethod('hand_delivery')}
                aria-label={t('transactions.reservationCheckoutModal.remiseEnMainPropreSecurisee')}
                className={`p-4 rounded-2xl border transition-all duration-normal shadow-2xs hover:shadow-sm ${
                  deliveryMethod === 'hand_delivery'
                    ? 'border-primary bg-primary-light ring-1 ring-primary/50'
                    : 'border-stone-200/60 bg-white hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-stone-900 text-sm">{t('transactions.reservationCheckoutModal.remiseEnMainPropreSecurisee2')}</p>
                        <span className="text-xs font-bold text-success bg-success-surface px-2 py-0.5 rounded-md">
                          Gratuit
                        </span>
                      </div>
                      <p className="text-xs font-medium text-stone-500 mt-0.5">{t('transactions.reservationCheckoutModal.rendezVousDirectAvecValidation')}</p>
                    </div>
                  </div>
                  <span className="font-black text-stone-900 shrink-0 whitespace-nowrap">0,00 €</span>
                </div>

                {deliveryMethod === 'hand_delivery' && (
                  <div className="mt-4 pt-4 border-t border-stone-200 space-y-3 text-sm">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1.5">{t('transactions.reservationCheckoutModal.votreNumeroDeTelephonePour')}</label>
                      <input
                        type="text"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="ex: 06 12 34 56 78"
                        className="w-full h-control-md px-3 bg-white border border-stone-200 rounded-control text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1.5">{t('transactions.reservationCheckoutModal.disponibilitesOuLieuSouhaite')}</label>
                      <input
                        type="text"
                        value={meetingNotes}
                        onChange={(e) => setMeetingNotes(e.target.value)}
                        placeholder={t('transactions.reservationCheckoutModal.exEnCentreVilleSamedi')}
                        className="w-full h-control-md px-3 bg-white border border-stone-200 rounded-control text-stone-900"
                      />
                    </div>
                  </div>
                )}
              </SelectableCard>

              {/* Mondial Relay */}
              <SelectableCard
                selected={deliveryMethod === 'relay_point'}
                onSelect={() => setDeliveryMethod('relay_point')}
                aria-label={t('transactions.reservationCheckoutModal.livraisonEnPointRelaisMondial')}
                className={`p-4 rounded-2xl border transition-all duration-normal shadow-2xs hover:shadow-sm ${
                  deliveryMethod === 'relay_point'
                    ? 'border-primary bg-primary-light ring-1 ring-primary/50'
                    : 'border-stone-200/60 bg-white hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 shrink-0">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 text-sm">{t('transactions.reservationCheckoutModal.livraisonEnPointRelaisMondial2')}</p>
                      <p className="text-xs font-medium text-stone-500 mt-0.5">{t('transactions.reservationCheckoutModal.retraitChezUnCommercantPartenaire')}</p>
                    </div>
                  </div>
                  <span className="font-black text-stone-900 shrink-0 whitespace-nowrap">4,90 €</span>
                </div>

                {deliveryMethod === 'relay_point' && (
                  <div className="mt-4 pt-4 border-t border-stone-200 space-y-3 text-sm">
                    <div>
                      <label className="font-bold text-stone-700 block mb-1.5">{t('transactions.reservationCheckoutModal.pointRelaisSelectionne')}</label>
                      <select
                        value={relayPoint}
                        onChange={(e) => setRelayPoint(e.target.value)}
                        className="w-full h-control-md px-3 bg-white border border-stone-200 rounded-control text-stone-900"
                      >
                        <option value="Tabac Presse des Halles (MR-13001)">{t('transactions.reservationCheckoutModal.tabacPresseDesHalles15')}</option>
                        <option value="Relais Colis City Express (MR-13002)">Relais Colis City Express (8 bd Longchamp, 13001 Marseille)</option>
                        <option value="Épicerie Bio du Vieux-Port (MR-13003)">{t('transactions.reservationCheckoutModal.epicerieBioDuVieuxPort')}</option>
                      </select>
                    </div>
                  </div>
                )}
              </SelectableCard>

              {/* Home delivery */}
              <SelectableCard
                selected={deliveryMethod === 'home_delivery'}
                onSelect={() => setDeliveryMethod('home_delivery')}
                aria-label={t('transactions.reservationCheckoutModal.livraisonADomicileColissimo6')}
                className={`p-4 rounded-2xl border transition-all duration-normal shadow-2xs hover:shadow-sm ${
                  deliveryMethod === 'home_delivery'
                    ? 'border-primary bg-primary-light ring-1 ring-primary/50'
                    : 'border-stone-200/60 bg-white hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 shrink-0">
                      <Truck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 text-sm">{t('transactions.reservationCheckoutModal.livraisonADomicileColissimo')}</p>
                      <p className="text-xs font-medium text-stone-500 mt-0.5">{t('transactions.reservationCheckoutModal.directementDansVotreBoiteAux')}</p>
                    </div>
                  </div>
                  <span className="font-black text-stone-900 shrink-0 whitespace-nowrap">6,90 €</span>
                </div>

                {deliveryMethod === 'home_delivery' && (
                  <div className="mt-4 pt-4 border-t border-stone-200 grid grid-cols-2 gap-3 text-sm">
                    <div className="col-span-2">
                      <label className="font-bold text-stone-700 block mb-1.5">{t('transactions.reservationCheckoutModal.nomDuDestinataire')}</label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder={t('transactions.reservationCheckoutModal.nomEtPrenom')}
                        className="w-full h-control-md px-3 bg-white border border-stone-200 rounded-control text-stone-900"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="font-bold text-stone-700 block mb-1.5">Adresse postale :</label>
                      <input
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder={t('transactions.reservationCheckoutModal.nEtNomDeRue')}
                        className="w-full h-control-md px-3 bg-white border border-stone-200 rounded-control text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1.5">Code postal :</label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        className="w-full h-control-md px-3 bg-white border border-stone-200 rounded-control text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-stone-700 block mb-1.5">Ville :</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full h-control-md px-3 bg-white border border-stone-200 rounded-control text-stone-900"
                      />
                    </div>
                  </div>
                )}
              </SelectableCard>
            </div>

            <Button
              type="button"
              variant="primary"
              fullWidth
              size="md"
              onClick={() => setStep(2)}
              className="mt-4"
            >{t('transactions.reservationCheckoutModal.continuerVersLeRecapitulatif')}<ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* STEP 2: SUMMARY & BREAKDOWN */}
        {step === 2 && (
          <div className="space-y-4">
            <h5 className="font-bold text-stone-800">{t('transactions.reservationCheckoutModal.detailDesCoutsEtGaranties')}</h5>

            {/* Escrow guarantee explanation */}
            <div className="p-3 bg-success-surface border border-success-border rounded-xl text-success flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{t('transactions.reservationCheckoutModal.paiement100ProtegeSousSequestre')}</p>
                <p className="text-micro text-success mt-0.5 leading-relaxed">{t('transactions.reservationCheckoutModal.lArgentNeSeraVerse')}</p>
              </div>
            </div>

            {/* Breakdown table */}
            <div className="p-5 bg-stone-50 border border-stone-200/60 rounded-2xl space-y-3 text-sm font-medium shadow-inner">
              <div className="flex justify-between text-stone-600">
                <span>{t('transactions.reservationCheckoutModal.prixDeLArticle')}</span>
                <span className="font-black text-stone-900">{formatPrice(breakdown.itemPrice)}</span>
              </div>
              <div className="flex justify-between text-stone-600 items-center">
                <span className="flex items-center gap-1.5">
                  Protection Acheteurs Shongre :
                  <Info className="w-4 h-4 text-stone-400 cursor-help" />
                </span>
                <span className="font-black text-stone-900">{formatPrice(breakdown.protectionFee)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Frais de port ({deliveryMethod === 'hand_delivery' ? 'Remise en main propre' : deliveryMethod === 'relay_point' ? 'Point Relais' : 'Colissimo'}) :</span>
                <span className="font-black text-stone-900">{formatPrice(breakdown.shippingFee)}</span>
              </div>
              <div className="border-t border-stone-200 pt-3 flex justify-between font-black text-stone-900 text-base">
                <span>{t('transactions.reservationCheckoutModal.totalARegler')}</span>
                <span className="text-primary text-lg">{formatPrice(breakdown.totalAmount)}</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button type="button" variant="outline" fullWidth onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button type="button" variant="primary" fullWidth onClick={() => setStep(3)}>{t('transactions.reservationCheckoutModal.passerAuPaiementSecurise')}<ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: PAYMENT INTERFACE */}
        {step === 3 && (
          <div className="space-y-4">
            <h5 className="font-bold text-stone-800">{t('transactions.reservationCheckoutModal.choisissezVotreMoyenDePaiement')}</h5>

            {/* Payment method tabs */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-2 transition-all duration-normal shadow-2xs hover:shadow-sm ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/50'
                    : 'border-stone-200/60 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                <CreditCard className="w-6 h-6" />
                <span>Carte bancaire</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('apple_pay')}
                className={`p-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-2 transition-all duration-normal shadow-2xs hover:shadow-sm ${
                  paymentMethod === 'apple_pay'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/50'
                    : 'border-stone-200/60 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                <span className="text-xl font-black">Pay</span>
                <span>Apple Pay</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('google_pay')}
                className={`p-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-2 transition-all duration-normal shadow-2xs hover:shadow-sm ${
                  paymentMethod === 'google_pay'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary/50'
                    : 'border-stone-200/60 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                }`}
              >
                <span className="text-xl font-black text-info">GPay</span>
                <span>Google Pay</span>
              </button>
            </div>

            {/* Credit Card Form */}
            {paymentMethod === 'card' && (
              <div className="space-y-4 p-5 bg-stone-50 border border-stone-200/60 rounded-2xl shadow-inner text-sm">
                <div>
                  <label className="font-bold text-stone-700 block mb-1.5">{t('transactions.reservationCheckoutModal.titulaireDeLaCarte')}</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full h-control-touch px-3 bg-white border border-stone-200 rounded-control text-stone-900 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-700 block mb-1.5">{t('transactions.reservationCheckoutModal.numeroDeCarte')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                      className="w-full h-control-touch px-3 pr-10 bg-white border border-stone-200 rounded-control text-stone-900 font-mono"
                    />
                    <Lock className="w-5 h-5 text-success absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1.5">Date d'expiration</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/AA"
                      className="w-full h-control-touch px-3 bg-white border border-stone-200 rounded-control text-stone-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-700 block mb-1.5">Cryptogramme (CVC)</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="123"
                      className="w-full h-control-touch px-3 bg-white border border-stone-200 rounded-control text-stone-900 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-micro text-stone-500">
              <Lock className="w-3.5 h-3.5 text-success shrink-0" />
              <span>{t('transactions.reservationCheckoutModal.chiffrementSsl256BitsEt')}</span>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button type="button" variant="outline" fullWidth onClick={() => setStep(2)}>
                Retour
              </Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={isProcessing}
                onClick={handlePayAndReserve}
              >
                {isProcessing ? 'Sécurisation des fonds...' : `Payer et Réserver (${formatPrice(breakdown.totalAmount)})`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION & SECRET PIN */}
        {step === 4 && createdTx && (
          <div className="space-y-4 text-center pt-2">
            <div className="w-12 h-12 rounded-full bg-success-surface text-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-lg font-black text-stone-900">
                Paiement sécurisé de {formatPrice(createdTx.totalAmount)} validé !
              </h4>
              <p className="text-stone-500 text-xs mt-1">{t('transactions.reservationCheckoutModal.referenceDossier')}<strong className="text-stone-800 font-mono">{createdTx.code}</strong>
              </p>
            </div>

            {/* Hand delivery PIN code box */}
            {createdTx.deliveryMethod === 'hand_delivery' && createdTx.verificationCode && (
              <div className="p-4 bg-warning-surface border border-warning-border rounded-2xl text-left space-y-2">
                <div className="flex items-center gap-2 text-warning font-bold">
                  <KeyRound className="w-4 h-4 text-warning" />
                  <span>{t('transactions.reservationCheckoutModal.votreCodeSecretDeConfirmation')}</span>
                </div>
                <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-warning-border">
                  <span className="text-2xl font-black font-mono tracking-widest text-warning">
                    {createdTx.verificationCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyPinToClipboard}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 bg-primary-light px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    {copiedPin ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPin ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <p className="text-micro text-warning leading-relaxed">
                  ⚠️ <strong>{t('transactions.reservationCheckoutModal.regleDeSecurite')}</strong> Ne transmettez ce code à 6 chiffres au vendeur qu'une fois sur place après avoir inspecté et validé la conformité de l'article.
                </p>
              </div>
            )}

            {/* Shipping instructions */}
            {createdTx.deliveryMethod !== 'hand_delivery' && (
              <div className="p-3.5 bg-info-surface border border-info-border rounded-xl text-left text-info space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-info" /> Préparation de votre colis
                </p>
                <p className="text-micro text-info leading-relaxed">
                  Le vendeur a été notifié et dispose de 48h pour valider la réservation et déposer le colis avec l'étiquette {createdTx.carrierName}. Vous recevrez un numéro de suivi dès l'expédition.
                </p>
              </div>
            )}

            <div className="pt-2">
              <Button type="button" variant="primary" fullWidth onClick={onClose}>{t('transactions.reservationCheckoutModal.accederAuSuiviDeMa')}</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
