import React, { useRef, useState } from "react";
import { CheckCircle2, Lock, MapPin, ShieldCheck } from "lucide-react";
import { Listing, Transaction, UserProfile } from "../../../types";
import { services } from "../../../api/client/service-registry";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { FormField, Input } from "../../../design-system/primitives/FormField";
import { Image } from "../../../design-system/primitives/Image";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";

interface ReservationCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: Listing;
  currentUser?: UserProfile | null;
  onReservationComplete: (transaction: Transaction) => void;
}

export const ReservationCheckoutModal: React.FC<
  ReservationCheckoutModalProps
> = ({ isOpen, onClose, listing, onReservationComplete }) => {
  const { formatPrice } = useMarketLocation();
  const [agreedLocation, setAgreedLocation] = useState(
    `${listing.city} (${listing.postalCode})`,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const operationKey = useRef(
    `reservation:${listing.id}:${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`,
  );

  const handleReserve = async () => {
    if (!agreedLocation.trim()) {
      setError("Indiquez le lieu de remise convenu avec le vendeur.");
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const result = await services.orders.createReservation({
        listingId: listing.id,
        agreedLocation: agreedLocation.trim(),
        idempotencyKey: operationKey.current,
      });
      if (result.checkout?.url) {
        window.location.assign(result.checkout.url);
        return;
      }
      setOrderNumber(result.orderNumber ?? result.id);
      setIsComplete(true);
      const order = await services.orders.getOrderById(result.id);
      if (order) onReservationComplete(order);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "La réservation n’a pas pu être initialisée.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isComplete ? "Réservation enregistrée" : "Réserver l’annonce"}
      description={
        isComplete
          ? "La réservation est disponible dans vos achats."
          : "Le montant de l’acompte est calculé par Shongre selon le marché, puis réglé sur la page sécurisée du prestataire."
      }
    >
      {isComplete ? (
        <div className="space-y-5 py-4 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <p className="text-sm text-text-supporting">
            Référence : <strong>{orderNumber}</strong>
          </p>
          <Button variant="primary" fullWidth onClick={onClose}>
            Voir mes réservations
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-4 rounded-2xl border border-border-disabled/60 bg-surface-soft p-4">
            <Image
              src={listing.coverImageUrl}
              alt={listing.title}
              sizes="64px"
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-text-main">
                {listing.title}
              </h3>
              <p className="mt-1 text-base font-bold text-primary">
                {formatPrice(listing.price, {
                  sourceCurrency: listing.currency,
                })}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Vendeur : {listing.sellerName}
              </p>
            </div>
          </div>

          <FormField label="Lieu de remise convenu">
            <Input
              value={agreedLocation}
              onChange={(event) => setAgreedLocation(event.target.value)}
              placeholder="Ex. devant la mairie, samedi à 14 h"
            />
          </FormField>

          <div className="rounded-2xl border border-primary-border bg-primary-surface-soft p-4 text-xs text-text-emphasis">
            <p className="flex items-center gap-2 font-bold text-text-main">
              <ShieldCheck className="h-icon-md w-icon-md text-primary" />
              Acompte défini par le marché
            </p>
            <p className="mt-2 leading-relaxed">
              Le navigateur ne choisit ni l’acompte ni le solde. Le montant
              exact et les frais sont calculés côté serveur avant le paiement.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border-disabled bg-surface-soft p-4 text-xs text-text-supporting">
            <Lock className="h-icon-lg w-icon-lg shrink-0 text-success" />
            <span>
              Vous serez redirigé vers le paiement hébergé. La réservation ne
              devient financée qu’après confirmation du prestataire.
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-danger-surface p-3 text-xs text-danger"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border-soft pt-4">
            <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={handleReserve}
              isLoading={isProcessing}
              disabled={isProcessing}
              leftIcon={<MapPin className="h-icon-md w-icon-md" />}
            >
              Continuer vers le paiement
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
