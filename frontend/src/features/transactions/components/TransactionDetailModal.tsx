import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  PackageCheck,
} from "lucide-react";
import { Transaction, UserProfile } from "../../../types";
import { services } from "../../../api/client/service-registry";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { FormField, Input } from "../../../design-system/primitives/FormField";
import { Image } from "../../../design-system/primitives/Image";
import { formatRelativeDate } from "../../../utilities/formatters";
import { DisputeModal } from "./DisputeModal";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { ORDER_HANDOVER_POLICY } from "../../../api/contracts/orders.contract";
import { routes } from "../../../configuration/routes";
import { useTranslation } from "../../../i18n/I18nProvider";
import { deliveryCatalogueFr } from "../../../i18n/delivery.catalogue.fr";

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  currentUser: UserProfile;
  onUpdate: (updatedTx: Transaction) => void;
}

const statusLabel: Record<string, string> = {
  initiated: "Paiement à démarrer",
  payment_pending: "Paiement en attente de confirmation",
  escrow_funded: "Paiement confirmé",
  payment_escrowed: "Paiement confirmé",
  pin_pending: "Code de remise actif",
  shipped: "Commande expédiée",
  disputed: "Litige en cours d’examen",
  completed: "Commande terminée",
  refund_pending: "Remboursement en cours",
  refunded: "Commande remboursée",
  cancelled: "Commande annulée",
};

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  currentUser,
  onUpdate,
}) => {
  const { activeMarket, currentLocale, formatPrice } = useMarketLocation();
  const { t } = useTranslation(deliveryCatalogueFr);
  const [tx, setTx] = useState(transaction);
  const [handoverCode, setHandoverCode] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);
  const [sellerPin, setSellerPin] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => setTx(transaction), [transaction]);

  const isBuyer = currentUser.id === tx.buyerId;
  const isSeller = currentUser.id === tx.sellerId;

  useEffect(() => {
    let active = true;
    const eligibleOrder =
      isOpen &&
      (isBuyer || isSeller) &&
      tx.deliveryMethod !== "digital" &&
      (tx.marketCode ?? activeMarket.code) === activeMarket.code &&
      ["escrow_funded", "shipped", "pin_pending"].includes(tx.status);
    if (!eligibleOrder) {
      setDeliveryAvailable(false);
      return () => {
        active = false;
      };
    }
    services.delivery
      .getAvailability(activeMarket.code)
      .then((availability) => {
        if (active) setDeliveryAvailable(availability.enabled);
      })
      .catch(() => {
        if (active) setDeliveryAvailable(false);
      });
    return () => {
      active = false;
    };
  }, [
    activeMarket.code,
    isBuyer,
    isOpen,
    isSeller,
    tx.deliveryMethod,
    tx.marketCode,
    tx.status,
  ]);

  const update = (next: Transaction) => {
    setTx(next);
    onUpdate(next);
  };

  const refresh = async () => {
    const next = await services.orders.getOrderById(tx.id);
    if (next) update(next);
  };

  const run = async (operation: () => Promise<void>) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      await operation();
    } catch (caught) {
      setFeedback({
        type: "error",
        text: caught instanceof Error ? caught.message : "Action impossible.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const issueHandoverCode = () =>
    run(async () => {
      const result = await services.orders.issueHandoverCode(tx.id);
      setHandoverCode(result);
      await refresh();
      setFeedback({
        type: "success",
        text: "Code généré. Ne le communiquez qu’au moment de la remise.",
      });
    });

  const confirmHandover = () =>
    run(async () => {
      const result = await services.orders.confirmHandoverPIN(tx.id, sellerPin);
      if (!result.success) throw new Error(result.message);
      setSellerPin("");
      await refresh();
      setFeedback({ type: "success", text: result.message });
    });

  const markShipped = () =>
    run(async () => {
      const next = await services.orders.markShipped(tx.id, {
        carrierName,
        trackingNumber,
      });
      update(next);
      setFeedback({ type: "success", text: "Expédition enregistrée." });
    });

  const confirmDelivery = () =>
    run(async () => {
      const next = await services.orders.confirmDeliveryReceived(tx.id);
      update(next);
      setFeedback({ type: "success", text: "Réception confirmée." });
    });

  const cancelUnpaid = () =>
    run(async () => {
      const next = await services.orders.cancelUnpaidOrder(tx.id);
      update(next);
      setFeedback({ type: "success", text: "Commande non payée annulée." });
    });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Commande ${tx.code || tx.id.slice(0, 8)}`}
        description={`Créée ${formatRelativeDate(tx.createdAt)}`}
        className="max-w-2xl"
      >
        <div className="space-y-5">
          {feedback && (
            <div
              role="status"
              className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
                feedback.type === "success"
                  ? "bg-success-surface text-success"
                  : "bg-danger-surface text-danger"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-icon-md w-icon-md shrink-0" />
              ) : (
                <AlertTriangle className="h-icon-md w-icon-md shrink-0" />
              )}
              {feedback.text}
            </div>
          )}

          <div className="rounded-2xl border border-border-disabled bg-surface-soft p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
              État serveur
            </p>
            <p className="mt-1 text-sm font-bold text-text-main">
              {statusLabel[tx.status] || "Commande en cours"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Image
              src={tx.listingCoverImageUrl || tx.listingPhotoUrl}
              alt=""
              sizes="72px"
              className="h-20 w-20 rounded-xl border border-border-disabled object-cover"
            />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-bold text-text-main">
                {tx.listingTitle}
              </h3>
              <p className="mt-1 text-sm text-text-tertiary">
                {isBuyer
                  ? `Vendeur : ${tx.sellerName}`
                  : `Acheteur : ${tx.buyerName}`}
              </p>
              <p className="mt-2 text-lg font-bold text-primary">
                {formatPrice(isSeller ? tx.amount : tx.totalAmount, {
                  sourceCurrency: tx.currency,
                })}
              </p>
            </div>
          </div>

          {isBuyer &&
            tx.deliveryMethod === "hand_delivery" &&
            ["escrow_funded", "payment_escrowed", "pin_pending"].includes(
              tx.status,
            ) && (
              <section className="rounded-2xl border border-primary-border bg-primary-surface-soft p-4">
                <h4 className="flex items-center gap-2 text-sm font-bold">
                  <KeyRound className="h-icon-md w-icon-md text-primary" /> Code
                  de remise
                </h4>
                {handoverCode ? (
                  <div className="mt-3">
                    <p className="rounded-xl bg-bg-surface p-3 text-center font-mono text-2xl font-bold tracking-code">
                      {handoverCode.code}
                    </p>
                    <p className="mt-2 text-xs text-text-supporting">
                      Expire à{" "}
                      {new Date(handoverCode.expiresAt).toLocaleTimeString(
                        currentLocale,
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                      .
                    </p>
                  </div>
                ) : (
                  <Button
                    className="mt-3"
                    variant="primary"
                    onClick={issueHandoverCode}
                    disabled={isLoading}
                  >
                    Générer un code valable{" "}
                    {ORDER_HANDOVER_POLICY.lifetimeMinutes} minutes
                  </Button>
                )}
              </section>
            )}

          {isSeller &&
            tx.deliveryMethod === "hand_delivery" &&
            tx.status === "pin_pending" && (
              <section className="space-y-3 rounded-2xl border border-border-disabled p-4">
                <FormField label="Code communiqué par l’acheteur">
                  <Input
                    inputMode="numeric"
                    maxLength={ORDER_HANDOVER_POLICY.codeLength}
                    value={sellerPin}
                    onChange={(event) =>
                      setSellerPin(event.target.value.replace(/\D/g, ""))
                    }
                  />
                </FormField>
                <Button
                  variant="primary"
                  onClick={confirmHandover}
                  disabled={
                    isLoading ||
                    sellerPin.length !== ORDER_HANDOVER_POLICY.codeLength
                  }
                >
                  Confirmer la remise
                </Button>
              </section>
            )}

          {isSeller &&
            tx.deliveryMethod !== "hand_delivery" &&
            ["escrow_funded", "payment_escrowed"].includes(tx.status) && (
              <section className="space-y-3 rounded-2xl border border-border-disabled p-4">
                <FormField label="Transporteur">
                  <Input
                    value={carrierName}
                    onChange={(event) => setCarrierName(event.target.value)}
                  />
                </FormField>
                <FormField label="Numéro de suivi">
                  <Input
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                  />
                </FormField>
                <Button
                  variant="primary"
                  onClick={markShipped}
                  disabled={
                    isLoading || !carrierName.trim() || !trackingNumber.trim()
                  }
                  leftIcon={<PackageCheck className="h-icon-md w-icon-md" />}
                >
                  Enregistrer l’expédition
                </Button>
              </section>
            )}

          {isBuyer &&
            tx.deliveryMethod !== "hand_delivery" &&
            tx.status === "shipped" && (
              <Button
                variant="primary"
                onClick={confirmDelivery}
                disabled={isLoading}
              >
                Confirmer la réception
              </Button>
            )}

          <div className="flex flex-wrap justify-between gap-2 border-t border-border-soft pt-4">
            {isBuyer && ["initiated", "payment_pending"].includes(tx.status) ? (
              <Button
                variant="outline"
                onClick={cancelUnpaid}
                disabled={isLoading}
              >
                Annuler la commande non payée
              </Button>
            ) : (
              <span />
            )}
            {[
              "escrow_funded",
              "payment_escrowed",
              "pin_pending",
              "shipped",
              "completed",
            ].includes(tx.status) && (
              <Button variant="outline" onClick={() => setIsDisputeOpen(true)}>
                Signaler un problème
              </Button>
            )}
          </div>
          {deliveryAvailable &&
            tx.deliveryMethod !== "digital" &&
            ["escrow_funded", "shipped", "pin_pending"].includes(tx.status) && (
              <section className="rounded-2xl border border-border-disabled bg-bg-subtle p-4">
                <p className="text-sm text-text-secondary">
                  {t("delivery.order.description")}
                </p>
                <Button
                  className="mt-3"
                  variant="secondary"
                  to={routes.delivery.create(tx.id)}
                >
                  {t("delivery.order.create")}
                </Button>
              </section>
            )}
        </div>
      </Modal>

      <DisputeModal
        isOpen={isDisputeOpen}
        onClose={() => setIsDisputeOpen(false)}
        transaction={tx}
        currentUser={currentUser}
        onSuccess={update}
      />
    </>
  );
};
