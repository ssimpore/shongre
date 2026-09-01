/**
 * SHONGRE DIRECT PURCHASE CHECKOUT MODAL
 * Dedicated direct purchase flow allowing immediate online purchase & payment
 * with 0 reservation requirement.
 */

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  ShieldCheck,
  Truck,
  MapPin,
  CreditCard,
  CheckCircle2,
  Lock,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { DeliveryType, Listing } from "../../types";
import { Modal } from "../../design-system/primitives/Modal";
import { Button } from "../../design-system/primitives/Button";
import { SelectableCard } from "../../design-system/primitives/SelectableCard";
import { Input, FormField } from "../../design-system/primitives/FormField";
import { formatPrice } from "../../utilities/formatters";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Image } from "../../design-system/primitives/Image";
import { useTranslation } from "../../i18n/I18nProvider";
import { digitalMessagesFr } from "../../i18n/digital.catalogue.fr";
import {
  getListingCategoryLabel,
  getListingSubCategoryLabel,
} from "../../domains/taxonomy/taxonomy.display";
import { services } from "../../api/client/service-registry";
import type { DirectPurchaseQuote } from "../../api/contracts/orders.contract";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

export interface DirectPurchaseCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  onSuccess?: (orderId: string) => void;
}

export const DirectPurchaseCheckoutModal: React.FC<
  DirectPurchaseCheckoutModalProps
> = ({ isOpen, onClose, listing, onSuccess }) => {
  const { t } = useTranslation(digitalMessagesFr);
  const { currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  const toast = useToast();
  const requiresPhysicalDelivery = listing.requiresPhysicalDelivery !== false;

  const [step, setStep] = useState<"delivery" | "payment" | "success">(
    "delivery",
  );
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(
    listing.deliveryOptions.find((option) => option.available)?.type ||
      "hand_delivery",
  );
  const [shippingAddress, setShippingAddress] = useState({
    fullName: currentUser?.name || "",
    addressLine: "",
    postalCode: "",
    city: "",
    phone: "",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [authoritativeQuote, setAuthoritativeQuote] =
    useState<DirectPurchaseQuote | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string>("");
  const operationKey = useRef(
    `order:${listing.id}:${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`}`,
  );

  // 1. Display only the fulfilment options exposed by the listing adapter.
  const quotes = useMemo(() => {
    const labels: Record<DeliveryType, { title: string; description: string }> =
      {
        hand_delivery: {
          title: "Remise en main propre",
          description: "Rendez-vous convenu directement avec le vendeur",
        },
        relay_point: {
          title: "Livraison en point relais",
          description:
            "Transporteur et point de retrait confirmés dans la commande",
        },
        home_delivery: {
          title: "Livraison à domicile",
          description: "Expédition suivie par le vendeur",
        },
        custom_carrier: {
          title: "Livraison convenue avec le vendeur",
          description: "Modalités précisées avant l’expédition",
        },
        cocolis: {
          title: "Livraison d’objet volumineux",
          description: "Transport suivi selon les modalités de la commande",
        },
        express: {
          title: "Livraison express",
          description: "Délai confirmé dans la commande",
        },
        digital: {
          title: t("digital.common.noShipping"),
          description: t("digital.purchases.processing"),
        },
      };
    return listing.deliveryOptions
      .filter((option) => option.available)
      .map((option) => ({
        id: option.type,
        deliveryType: option.type,
        title: option.courierName || labels[option.type].title,
        description: labels[option.type].description,
        price: option.price || 0,
      }));
  }, [listing.deliveryOptions, t]);

  // Set default quote if selected is not found
  const selectedQuote = useMemo(() => {
    return quotes.find((q) => q.id === selectedQuoteId) || quotes[0];
  }, [quotes, selectedQuoteId]);

  const deliveryMethod: DeliveryType =
    selectedQuote?.deliveryType === "custom_carrier"
      ? "home_delivery"
      : selectedQuote?.deliveryType ||
        (requiresPhysicalDelivery ? "hand_delivery" : "digital");

  // 2. Price is always quoted by the same backend service that creates checkout.
  useEffect(() => {
    let active = true;
    setAuthoritativeQuote(null);
    setIsQuoteLoading(true);
    setPaymentError(null);
    services.orders
      .quoteDirectPurchase({ listingId: listing.id, deliveryMethod })
      .then((quote) => {
        if (active) setAuthoritativeQuote(quote);
      })
      .catch((cause) => {
        if (active) {
          setPaymentError(
            cause instanceof Error
              ? cause.message
              : "Le prix de la commande n’a pas pu être calculé.",
          );
        }
      })
      .finally(() => {
        if (active) setIsQuoteLoading(false);
      });
    return () => {
      active = false;
    };
  }, [deliveryMethod, listing.id]);

  const handleProceedToPayment = () => {
    if (
      requiresPhysicalDelivery &&
      selectedQuote?.deliveryType !== "hand_delivery"
    ) {
      if (
        !shippingAddress.addressLine.trim() ||
        !shippingAddress.postalCode.trim()
      ) {
        toast.error("Veuillez renseigner votre adresse de livraison complète.");
        return;
      }
    }
    if (!authoritativeQuote) {
      toast.error("Le prix final de la commande n’est pas disponible.");
      return;
    }
    setPaymentError(null);
    setStep("payment");
  };

  const handleExecutePayment = async () => {
    setIsProcessing(true);
    setPaymentError(null);
    try {
      const result = await services.orders.createDirectPurchase({
        listingId: listing.id,
        deliveryMethod,
        shippingAddress: requiresPhysicalDelivery
          ? {
              street: shippingAddress.addressLine,
              postalCode: shippingAddress.postalCode,
              city: shippingAddress.city,
              country: listing.marketCode || activeMarket.countryCode,
            }
          : undefined,
        idempotencyKey: operationKey.current,
      });

      if (result.checkout?.url) {
        window.location.assign(result.checkout.url);
        return;
      }

      setCompletedOrderId(result.orderNumber ?? result.id);
      setStep("success");
      toast.success("Commande enregistrée.");

      if (onSuccess) {
        onSuccess(result.id);
      }
    } catch {
      setPaymentError(
        "Le paiement n’a pas pu être initialisé. Vérifiez les informations puis réessayez.",
      );
      toast.error("Impossible d’ouvrir le paiement sécurisé.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    onClose();
    setStep("delivery");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === "success" ? handleFinish : onClose}
      title={
        step === "success"
          ? "Commande enregistrée"
          : step === "payment"
            ? "Paiement Sécurisé"
            : "Finaliser votre achat"
      }
      description={
        step === "success"
          ? "Votre demande a été enregistrée. Consultez vos achats pour suivre son état."
          : "Choisissez votre mode de réception et réglez en toute sécurité."
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
              sizes="64px"
              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-stone-200"
            />
            <div className="min-w-0">
              <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-0.5">
                {getListingCategoryLabel(listing)} ›{" "}
                {getListingSubCategoryLabel(listing)}
              </span>
              <h4 className="text-sm font-black text-stone-900 truncate mb-1">
                {listing.title}
              </h4>
              <div className="text-xs font-medium text-stone-500 flex items-center gap-2">
                <span>Vendeur : {listing.sellerName}</span>
                <span>•</span>
                <span className="font-bold text-stone-900">
                  {formatPrice(listing.price)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: Delivery Mode Selection */}
        {step === "delivery" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Truck className="w-icon-md h-icon-md text-primary" />
                <span>
                  {t(
                    "transactions.directPurchaseCheckoutModal.1ChoisissezVotreModeDe",
                  )}
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                {t(
                  "transactions.directPurchaseCheckoutModal.selectionnezParmiLesOptionsReellement",
                )}
              </p>
            </div>

            <div className="space-y-3">
              {quotes.map((quote) => {
                const isSelected = selectedQuote?.id === quote.id;
                return (
                  <SelectableCard
                    key={quote.id}
                    selected={isSelected}
                    onSelect={() => setSelectedQuoteId(quote.id)}
                    className={`p-4 rounded-2xl border transition-all duration-normal flex items-center justify-between shadow-2xs hover:shadow-sm ${
                      isSelected
                        ? "border-primary bg-primary-light ring-1 ring-primary/50"
                        : "border-stone-200/60 bg-white hover:bg-stone-50 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-stone-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-stone-900 mb-0.5">
                          {quote.title}
                        </div>
                        <div className="text-xs text-stone-500 font-medium">
                          {quote.description}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-black text-sm text-stone-900">
                      {quote.price === 0 ? "Gratuit" : formatPrice(quote.price)}
                    </div>
                  </SelectableCard>
                );
              })}
            </div>

            {/* Destination Address if shipping */}
            {requiresPhysicalDelivery &&
              selectedQuote?.deliveryType !== "hand_delivery" && (
                <div className="pt-5 mt-2 border-t border-stone-100 space-y-4">
                  <h4 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-icon-md h-icon-md text-primary" />
                    <span>
                      {t(
                        "transactions.directPurchaseCheckoutModal.adresseDeLivraison",
                      )}
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField
                      label={t(
                        "transactions.directPurchaseCheckoutModal.nomPrenom",
                      )}
                    >
                      <Input
                        value={shippingAddress.fullName}
                        onChange={(e) =>
                          setShippingAddress({
                            ...shippingAddress,
                            fullName: e.target.value,
                          })
                        }
                      />
                    </FormField>
                    <FormField
                      label={t(
                        "transactions.directPurchaseCheckoutModal.telephone",
                      )}
                    >
                      <Input
                        value={shippingAddress.phone}
                        onChange={(e) =>
                          setShippingAddress({
                            ...shippingAddress,
                            phone: e.target.value,
                          })
                        }
                      />
                    </FormField>
                    <div className="sm:col-span-2">
                      <FormField label="Adresse">
                        <Input
                          value={shippingAddress.addressLine}
                          onChange={(e) =>
                            setShippingAddress({
                              ...shippingAddress,
                              addressLine: e.target.value,
                            })
                          }
                        />
                      </FormField>
                    </div>
                    <FormField label="Code postal">
                      <Input
                        value={shippingAddress.postalCode}
                        onChange={(e) =>
                          setShippingAddress({
                            ...shippingAddress,
                            postalCode: e.target.value,
                          })
                        }
                      />
                    </FormField>
                    <FormField label="Ville">
                      <Input
                        value={shippingAddress.city}
                        onChange={(e) =>
                          setShippingAddress({
                            ...shippingAddress,
                            city: e.target.value,
                          })
                        }
                      />
                    </FormField>
                  </div>
                </div>
              )}

            {/* Pricing Summary */}
            <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/60 space-y-3 text-sm font-medium">
              <div className="flex justify-between text-stone-600">
                <span>Prix de l'article</span>
                <span className="font-bold text-stone-900">
                  {authoritativeQuote
                    ? formatPrice(authoritativeQuote.itemAmountMinor / 100)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>
                  {requiresPhysicalDelivery
                    ? `Frais de livraison (${selectedQuote?.title})`
                    : t("digital.common.noShipping")}
                </span>
                <span className="font-bold text-stone-900">
                  {authoritativeQuote?.shippingFeeMinor === 0
                    ? "Gratuit"
                    : authoritativeQuote
                      ? formatPrice(authoritativeQuote.shippingFeeMinor / 100)
                      : "—"}
                </span>
              </div>
              {(authoritativeQuote?.protectionFeeMinor || 0) > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-icon-md h-icon-md text-success" />
                    <span>
                      {t(
                        "transactions.directPurchaseCheckoutModal.protectionAcheteurSequestre",
                      )}
                    </span>
                  </span>
                  <span className="font-bold text-stone-900">
                    {formatPrice(
                      (authoritativeQuote?.protectionFeeMinor || 0) / 100,
                    )}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t border-stone-200 flex justify-between text-base font-black text-stone-900">
                <span>
                  {t("transactions.directPurchaseCheckoutModal.totalARegler")}
                </span>
                <span className="text-primary text-lg">
                  {authoritativeQuote
                    ? formatPrice(authoritativeQuote.totalAmountMinor / 100)
                    : "—"}
                </span>
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
                disabled={isQuoteLoading || !authoritativeQuote}
                rightIcon={<ChevronRight className="w-icon-md h-icon-md" />}
              >
                {isQuoteLoading
                  ? "Calcul du total…"
                  : `Continuer vers le paiement (${authoritativeQuote ? formatPrice(authoritativeQuote.totalAmountMinor / 100) : "—"})`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Secure Payment */}
        {step === "payment" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CreditCard className="w-icon-md h-icon-md text-primary" />
                <span>
                  {t(
                    "transactions.directPurchaseCheckoutModal.2MoyenDePaiementSecurise",
                  )}
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                {t(
                  "transactions.directPurchaseCheckoutModal.fondsConservesSousSequestreBancaire",
                )}
              </p>
            </div>

            {/* Provider-hosted payment */}
            <div className="p-5 rounded-2xl border border-stone-200/60 bg-stone-50 space-y-3 shadow-inner">
              <div className="flex items-center gap-3">
                <Lock className="w-icon-lg h-icon-lg text-success shrink-0" />
                <div>
                  <p className="text-sm font-bold text-stone-900">
                    Paiement hébergé et sécurisé
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    Vous serez redirigé vers notre prestataire. La commande ne
                    sera confirmée qu’après validation du paiement par celui-ci.
                  </p>
                </div>
              </div>
            </div>

            {paymentError && (
              <div className="p-3 bg-danger-surface border border-danger-border rounded-xl flex items-center gap-2 text-xs text-danger">
                <AlertCircle className="w-icon-md h-icon-md text-danger shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <div className="p-4 bg-success-surface text-success rounded-2xl border border-success-border text-xs flex items-center gap-3 shadow-2xs font-medium">
              <ShieldCheck className="w-icon-lg h-icon-lg text-success shrink-0" />
              <span>
                <strong>Garantie Shongre :</strong> Le vendeur ne reçoit son
                virement qu'après réception et validation du bien.
              </span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("delivery")}
                disabled={isProcessing}
              >
                Retour
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleExecutePayment}
                isLoading={isProcessing}
                disabled={!authoritativeQuote || isProcessing}
                leftIcon={<Lock className="w-icon-md h-icon-md" />}
              >
                {`Continuer vers le paiement (${authoritativeQuote ? formatPrice(authoritativeQuote.totalAmountMinor / 100) : "—"})`}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Success Confirmation */}
        {step === "success" && (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-success-surface text-success rounded-full flex items-center justify-center mx-auto shadow-inner border border-success-border">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-2xl font-black text-stone-900">
                Commande enregistrée
              </h3>
              <p className="text-sm font-medium text-stone-500 mt-2">
                {t(
                  "transactions.directPurchaseCheckoutModal.referenceCommande",
                )}
                <span className="font-mono font-bold text-stone-800">
                  {completedOrderId}
                </span>
              </p>
            </div>

            <div className="p-5 bg-stone-50 border border-stone-200/60 rounded-3xl max-w-sm mx-auto text-sm text-stone-600 text-left shadow-inner font-medium">
              Le statut final du paiement et, le cas échéant, le code de remise
              sont disponibles depuis vos achats. Un code de remise n’est créé
              qu’après confirmation du paiement.
            </div>

            <div className="pt-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleFinish}
                fullWidth
              >
                Voir mes achats & commandes
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
