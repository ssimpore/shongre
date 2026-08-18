/**
 * SHONGRE DIRECT PURCHASE CHECKOUT MODAL
 * Dedicated direct purchase flow allowing immediate online purchase & payment
 * with 0 reservation requirement.
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Truck,
  MapPin,
  CreditCard,
  CheckCircle2,
  Lock,
  ChevronRight,
  AlertCircle,
  Package,
  Store,
  QrCode,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Listing } from '../../types';
import { DeliveryQuote } from '../../domains/publication/publication.types';
import { fulfillmentResolver } from '../../domains/fulfillment/fulfillment.resolver';
import { listingRepository } from '../../repositories/listing.repository';
import { transactionService } from '../../domains/transaction/transaction.service';
import { Modal } from '../../design-system/primitives/Modal';
import { Button } from '../../design-system/primitives/Button';
import { Input, FormField } from '../../design-system/primitives/FormField';
import { Badge } from '../../design-system/primitives/Badge';
import { storageService } from '../../services/storage.service';
import { providerService } from '../../domains/providers/provider.service';
import { formatPrice } from '../../utilities/formatters';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import confetti from 'canvas-confetti';
import { Image } from '../../design-system/primitives/Image';

export interface DirectPurchaseCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  onSuccess?: (orderId: string) => void;
}

export const DirectPurchaseCheckoutModal: React.FC<DirectPurchaseCheckoutModalProps> = ({
  isOpen,
  onClose,
  listing,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<'delivery' | 'payment' | 'success'>('delivery');
  const [quantity, setQuantity] = useState(1);
  const maxStock = listing.stock ?? 1;

  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('quote-hand-delivery');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');
  
  const [shippingAddress, setShippingAddress] = useState({
    fullName: currentUser?.name || 'Thomas Laurent',
    addressLine: '14 rue de la République',
    postalCode: '75011',
    city: 'Paris',
    phone: '+33 6 12 34 56 78',
  });
  
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string>('');
  const [pinCode, setPinCode] = useState<string>('');

  // 1. Resolve Available Delivery Quotes
  const quotes = useMemo(() => {
    return fulfillmentResolver.resolveAvailableQuotes({
      listing,
      marketCode: listing.marketCode || 'FR',
      destinationPostalCode: shippingAddress.postalCode,
      quantity,
    });
  }, [listing, shippingAddress.postalCode, quantity]);

  // Set default quote if selected is not found
  const selectedQuote = useMemo(() => {
    return quotes.find((q) => q.id === selectedQuoteId) || quotes[0];
  }, [quotes, selectedQuoteId]);

  // 2. Authoritative Price Breakdown
  const pricing = useMemo(() => {
    return fulfillmentResolver.calculateOrderPricing({
      listing,
      quantity,
      selectedQuote,
      marketCode: listing.marketCode || 'FR',
    });
  }, [listing, quantity, selectedQuote]);

  // 3. Provider Payment Capabilities Availability
  const isCardAvailable = useMemo(() => {
    return providerService.isCapabilityAvailable('payment.card', listing.marketCode || 'FR');
  }, [listing.marketCode]);

  const isWalletAvailable = useMemo(() => {
    return providerService.isCapabilityAvailable('payment.wallet', listing.marketCode || 'FR');
  }, [listing.marketCode]);

  const isOnlinePaymentAvailable = isCardAvailable || isWalletAvailable;

  const handleProceedToPayment = () => {
    if (selectedQuote?.deliveryType !== 'hand_delivery' && selectedQuote?.deliveryType !== 'store_pickup') {
      if (!shippingAddress.addressLine.trim() || !shippingAddress.postalCode.trim()) {
        toast.error('Veuillez renseigner votre adresse de livraison complète.');
        return;
      }
    }
    setPaymentError(null);
    setStep('payment');
  };

  const handleExecutePayment = async () => {
    setIsProcessing(true);
    setPaymentError(null);
    try {
      const cardLast4 = selectedPaymentMethod === 'card' ? cardNumber.replace(/\s+/g, '').slice(-4) || '4242' : 'Wallet';

      const buyerUser = currentUser || {
        id: 'buyer_thomas',
        name: 'Thomas Laurent',
        email: 'thomas@example.com',
        role: 'individual_buyer' as any,
        type: 'individual' as any,
        status: 'active' as any,
        isVerified: true,
      };

      // The transaction is the single source of truth for the handover PIN and
      // the order reference. This screen used to mint its own pair here, so the
      // code the buyer was told to give the seller never matched the one stored
      // on the transaction they were about to hand over against.
      const transaction = await transactionService.createDirectPurchase({
        listingId: listing.id,
        buyer: buyerUser as any,
        deliveryMethod: selectedQuote?.deliveryType === 'hand_delivery' ? 'hand_delivery' : 'home_delivery',
        carrierName: selectedQuote?.title,
        paymentMethod: selectedPaymentMethod,
        cardLast4,
        deliveryAddress: {
          fullName: shippingAddress.fullName,
          street: shippingAddress.addressLine,
          postalCode: shippingAddress.postalCode,
          city: shippingAddress.city,
        },
      });

      // Atomically decrement stock / mark sold
      await listingRepository.decrementStock(listing.id, quantity);

      setPinCode(transaction.verificationCode || '');
      setCompletedOrderId(transaction.code);
      setStep('success');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      toast.success('Paiement sécurisé validé avec succès !', 'Commande confirmée');

      if (onSuccess) {
        onSuccess(transaction.id);
      }
    } catch (err: any) {
      setPaymentError('Échec de l\'autorisation bancaire. Veuillez vérifier vos informations ou réessayer.');
      toast.error('Échec du paiement. Veuillez vérifier vos coordonnées bancaires.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    onClose();
    setStep('delivery');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 'success' ? handleFinish : onClose}
      title={
        step === 'success'
          ? 'Commande Confirmée !'
          : step === 'payment'
          ? 'Paiement Sécurisé'
          : 'Finaliser votre achat'
      }
      description={
        step === 'success'
          ? 'Votre achat direct a été enregistré et vos fonds sont sécurisés jusqu\'à la remise du bien.'
          : 'Choisissez votre mode de réception et réglez en toute sécurité.'
      }
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Item Summary Card */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/60 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-4 min-w-0">
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-200"
            />
            <div className="min-w-0">
              <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-0.5">
                {listing.categoryLabel} › {listing.subCategoryLabel}
              </span>
              <h4 className="text-sm font-black text-stone-900 truncate mb-1">{listing.title}</h4>
              <div className="text-xs font-medium text-stone-500 flex items-center gap-2">
                <span>Vendeur : {listing.sellerName}</span>
                <span>•</span>
                <span className="font-bold text-stone-900">{formatPrice(listing.price)}</span>
              </div>
            </div>
          </div>

          {/* Quantity Selector (when stock > 1) */}
          {maxStock > 1 && (
            <div className="shrink-0 space-y-1 text-right">
              <span className="text-micro font-bold text-stone-500 block">Quantité :</span>
              <div className="inline-flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1 shadow-xs">
                <button
                  type="button"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1 rounded-lg hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5 text-stone-700" />
                </button>
                <span className="font-bold text-xs px-2 text-stone-900 min-w-[20px] text-center">{quantity}</span>
                <button
                  type="button"
                  disabled={quantity >= maxStock}
                  onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                  className="p-1 rounded-lg hover:bg-stone-100 disabled:opacity-30 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-stone-700" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* STEP 1: Delivery Mode Selection */}
        {step === 'delivery' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <span>1. Choisissez votre mode de réception</span>
              </h3>
              <p className="text-xs text-stone-500">
                Sélectionnez parmi les options réellement disponibles pour cet article.
              </p>
            </div>

            <div className="space-y-3">
              {quotes.map((quote) => {
                const isSelected = selectedQuote?.id === quote.id;
                return (
                  <div
                    key={quote.id}
                    onClick={() => setSelectedQuoteId(quote.id)}
                    className={`p-4 rounded-2xl border transition-all duration-normal cursor-pointer flex items-center justify-between shadow-2xs hover:shadow-sm ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/50'
                        : 'border-stone-200/60 bg-white hover:bg-stone-50 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-primary bg-primary' : 'border-stone-300'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-0.5">
                          <span>{quote.title}</span>
                          {quote.price === 0 && (
                            <span className="text-xs bg-success/10 text-success font-bold px-2 py-0.5 rounded-md">
                              Gratuit
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500 font-medium">
                          {quote.description} • {quote.estimatedDeliveryDays}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-black text-sm text-stone-900">
                      {quote.price === 0 ? '0,00 €' : formatPrice(quote.price)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Destination Address if shipping */}
            {selectedQuote?.deliveryType !== 'hand_delivery' && selectedQuote?.deliveryType !== 'store_pickup' && (
              <div className="pt-5 mt-2 border-t border-stone-100 space-y-4">
                <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Adresse de livraison</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField label="Nom & Prénom">
                    <Input
                      value={shippingAddress.fullName}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Téléphone">
                    <Input
                      value={shippingAddress.phone}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                    />
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField label="Adresse">
                      <Input
                        value={shippingAddress.addressLine}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, addressLine: e.target.value })}
                      />
                    </FormField>
                  </div>
                  <FormField label="Code postal">
                    <Input
                      value={shippingAddress.postalCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Ville">
                    <Input
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    />
                  </FormField>
                </div>
              </div>
            )}

            {/* Pricing Summary */}
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/60 space-y-3 text-sm font-medium">
              <div className="flex justify-between text-stone-600">
                <span>Prix de l'article {quantity > 1 && `(x${quantity})`}</span>
                <span className="font-bold text-stone-900">{formatPrice(pricing.itemSubtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Frais de livraison ({selectedQuote?.title})</span>
                <span className="font-bold text-stone-900">
                  {pricing.deliveryFee === 0 ? 'Gratuit' : formatPrice(pricing.deliveryFee)}
                </span>
              </div>
              {pricing.buyerServiceFee > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-success" />
                    <span>Protection acheteur & Séquestre</span>
                  </span>
                  <span className="font-bold text-stone-900">{formatPrice(pricing.buyerServiceFee)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-stone-200 flex justify-between text-base font-black text-stone-900">
                <span>Total à régler</span>
                <span className="text-primary text-lg">{formatPrice(pricing.buyerTotal)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Annuler
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleProceedToPayment}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Continuer vers le paiement ({formatPrice(pricing.buyerTotal)})
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Secure Payment */}
        {step === 'payment' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>2. Moyen de paiement sécurisé</span>
              </h3>
              <p className="text-xs text-stone-500">
                Fonds conservés sous séquestre bancaire jusqu'à confirmation de conformité.
              </p>
            </div>

            {/* Payment Method Selector */}
            {!isOnlinePaymentAvailable ? (
              <div className="p-4 rounded-xl bg-warning-surface border border-warning-border text-warning text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Paiement en ligne temporairement indisponible
                </p>
                <p className="text-warning">
                  Le système de séquestre en ligne est momentanément indisponible sur ce marché. Vous pouvez contacter le vendeur pour organiser une remise en main propre.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {isCardAvailable && (
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('card')}
                    className={`p-4 rounded-2xl border text-sm font-bold transition-all duration-normal cursor-pointer flex flex-col items-center gap-2 shadow-2xs hover:shadow-sm ${
                      selectedPaymentMethod === 'card'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/50 text-primary'
                        : 'border-stone-200/60 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                    }`}
                  >
                    <CreditCard className="w-6 h-6" />
                    <span>Carte</span>
                  </button>
                )}

                {isWalletAvailable && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('apple_pay')}
                      className={`p-4 rounded-2xl border text-sm font-bold transition-all duration-normal cursor-pointer flex flex-col items-center gap-2 shadow-2xs hover:shadow-sm ${
                        selectedPaymentMethod === 'apple_pay'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/50 text-primary'
                          : 'border-stone-200/60 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                      }`}
                    >
                      <span className="text-xl font-black">Pay</span>
                      <span>Apple Pay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('google_pay')}
                      className={`p-4 rounded-2xl border text-sm font-bold transition-all duration-normal cursor-pointer flex flex-col items-center gap-2 shadow-2xs hover:shadow-sm ${
                        selectedPaymentMethod === 'google_pay'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/50 text-primary'
                          : 'border-stone-200/60 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                      }`}
                    >
                      <span className="text-xl font-black text-info">GPay</span>
                      <span>Google Pay</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {isOnlinePaymentAvailable && selectedPaymentMethod === 'card' && (
              <div className="p-5 rounded-2xl border border-stone-200/60 bg-stone-50 space-y-4 shadow-inner">
                <FormField label="Numéro de carte">
                  <Input value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Date d'expiration">
                    <Input value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
                  </FormField>
                  <FormField label="Cryptogramme CVC">
                    <Input value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} />
                  </FormField>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-stone-500 pt-2">
                  <Lock className="w-4 h-4 text-success" />
                  <span>Connexion chiffrée SSL 256 bits conforme PCI-DSS</span>
                </div>
              </div>
            )}

            {paymentError && (
              <div className="p-3 bg-danger-surface border border-danger-border rounded-xl flex items-center gap-2 text-xs text-danger">
                <AlertCircle className="w-4 h-4 text-danger shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <div className="p-4 bg-success/10 text-success rounded-2xl border border-success/20 text-xs flex items-center gap-3 shadow-2xs font-medium">
              <ShieldCheck className="w-5 h-5 text-success shrink-0" />
              <span>
                <strong>Garantie Shongre :</strong> Le vendeur ne reçoit son virement qu'après réception et validation du bien.
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <Button variant="ghost" size="sm" onClick={() => setStep('delivery')} disabled={isProcessing}>
                Retour
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleExecutePayment}
                isLoading={isProcessing}
                disabled={!isOnlinePaymentAvailable || isProcessing}
                leftIcon={<Lock className="w-4 h-4" />}
              >
                {isOnlinePaymentAvailable ? `Payer ${formatPrice(pricing.buyerTotal)}` : 'Paiement indisponible'}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Success Confirmation */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto shadow-inner border border-success/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-stone-900">Achat direct confirmé !</h3>
              <p className="text-sm font-medium text-stone-500 mt-2">
                Référence commande : <span className="font-mono font-bold text-stone-800">{completedOrderId}</span>
              </p>
            </div>

            {selectedQuote?.deliveryType === 'hand_delivery' ? (
              <div className="p-5 bg-primary/5 border border-primary/20 rounded-3xl max-w-sm mx-auto text-left space-y-3 shadow-2xs">
                <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <QrCode className="w-4 h-4" />
                  <span>Code secret de remise en main propre</span>
                </div>
                <div className="text-3xl font-black font-mono text-center tracking-widest text-stone-900 py-3 bg-white rounded-2xl border border-stone-200/60 shadow-inner">
                  {pinCode}
                </div>
                <p className="text-xs font-medium text-stone-600 leading-relaxed text-center">
                  Communiquez ce code au vendeur lors du rendez-vous uniquement après avoir vérifié le produit.
                </p>
              </div>
            ) : (
              <div className="p-5 bg-stone-50 border border-stone-200/60 rounded-3xl max-w-sm mx-auto text-sm text-stone-600 text-left shadow-inner font-medium">
                <span className="font-bold text-stone-900 block mb-1">Expédition en cours</span>
                Le vendeur a été notifié et dispose de 72h pour déposer votre colis auprès du transporteur ({selectedQuote?.title}).
              </div>
            )}

            <div className="pt-3">
              <Button variant="primary" size="md" onClick={handleFinish} fullWidth>
                Voir mes achats & commandes
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
