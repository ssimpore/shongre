import React, { useRef, useState } from "react";
import { Landmark, CheckCircle2, ShieldCheck } from "lucide-react";
import { UserProfile, SellerPayoutRequest } from "../../../types";
import { services } from "../../../api/client/service-registry";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { useTranslation } from "../../../i18n/I18nProvider";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { PAYOUT_REQUEST_CONSTRAINTS } from "../../../api/contracts/payments.contract";

interface SellerPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  availableBalance: number;
  onPayoutSuccess: (payout: SellerPayoutRequest) => void;
}

export const SellerPayoutModal: React.FC<SellerPayoutModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  availableBalance,
  onPayoutSuccess,
}) => {
  const { t } = useTranslation();
  const { currentCurrency, currencySymbol, formatPrice } = useMarketLocation();
  const [amountStr, setAmountStr] = useState(
    availableBalance > 0 ? availableBalance.toFixed(2) : "0.00",
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKey = useRef(
    `seller-payout:${currentUser.id}:${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`,
  );
  const payoutAccount = currentUser.bankPayoutVerification;
  const payoutConfigured =
    payoutAccount?.status === "verified" &&
    Boolean(payoutAccount.providerReference);
  const payoutLast4 = payoutAccount?.accountLast4 || "••••";

  const amount = parseFloat(amountStr) || 0;
  const fee = 0;
  const netTransfer = amount;

  const handleWithdraw = async () => {
    if (
      amount <
      PAYOUT_REQUEST_CONSTRAINTS.minimumAmountMinor /
        PAYOUT_REQUEST_CONSTRAINTS.minorUnitsPerMajor
    ) {
      setError(
        t("transactions.sellerPayoutModal.amountMustBePositive", {
          currency: currencySymbol,
        }),
      );
      return;
    }
    if (amount > availableBalance) {
      setError("Le montant demandé dépasse votre solde disponible.");
      return;
    }
    if (!payoutConfigured) {
      setError(
        "Configurez d’abord votre compte de versement dans le centre de vérification.",
      );
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await services.payments.requestSellerPayout({
        amountMinor: Math.round(
          amount * PAYOUT_REQUEST_CONSTRAINTS.minorUnitsPerMajor,
        ),
        currency: currentCurrency,
        idempotencyKey: idempotencyKey.current,
      });
      const now = new Date().toISOString();
      const payout: SellerPayoutRequest = {
        id: result.payoutId,
        sellerId: currentUser.id,
        sellerName: currentUser.name,
        amount,
        fee: 0,
        netAmount: amount,
        payoutType: "standard",
        ibanLast4: payoutLast4,
        bankName: "Compte de versement vérifié",
        status: result.status === "completed" ? "completed" : "processing",
        requestedAt: now,
        completedAt: result.status === "completed" ? now : undefined,
      };
      onPayoutSuccess(payout);
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors du virement bancaire.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("transactions.sellerPayoutModal.transfererMesGainsVersMon")}
      description={t(
        "transactions.sellerPayoutModal.selectionnezLeMontantEtLe",
      )}
    >
      <div className="space-y-4 text-xs">
        {/* Available Balance Box */}
        <div className="p-5 bg-stone-900 text-white rounded-3xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">
              Solde disponible chez le prestataire de paiement
            </span>
            <span className="text-3xl font-black tracking-tight text-white block">
              {formatPrice(availableBalance)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAmountStr(availableBalance.toFixed(2))}
            className="text-xs font-bold text-primary bg-primary/20 hover:bg-primary/30 px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            {t("transactions.sellerPayoutModal.toutTransferer")}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-danger-surface border border-danger-border text-danger rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block font-bold text-stone-700 mb-2 text-sm">
            {t("transactions.sellerPayoutModal.montantDuVirement")}
          </label>
          <div className="relative">
            <input
              type="number"
              step={PAYOUT_REQUEST_CONSTRAINTS.majorInputStep}
              min={
                PAYOUT_REQUEST_CONSTRAINTS.minimumAmountMinor /
                PAYOUT_REQUEST_CONSTRAINTS.minorUnitsPerMajor
              }
              max={availableBalance}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full h-control-lg px-4 pr-10 text-stone-900 bg-white rounded-control border border-stone-200/60 shadow-inner focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-black text-lg transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-stone-500">
              {currencySymbol}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
          Le prestataire exécute un virement standard vers le compte vérifié. Le
          délai bancaire exact est indiqué dans son statut de versement.
        </div>

        {/* Destination Bank Account */}
        <div className="p-4 bg-stone-50 border border-stone-200/60 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-600 shrink-0 shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-stone-900 text-sm">
                Compte vérifié par le prestataire de paiement
              </p>
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                Compte •••• {payoutLast4}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-success bg-success-surface px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {payoutConfigured ? "Vérifié" : "À configurer"}
          </span>
        </div>

        {/* Summary Breakdown */}
        <div className="p-5 bg-stone-50 border border-stone-200/60 rounded-2xl space-y-3 shadow-inner font-medium text-sm">
          <div className="flex justify-between text-stone-600">
            <span>
              {t("transactions.sellerPayoutModal.montantPreleveDuSolde")}
            </span>
            <span className="font-black text-stone-900">
              {formatPrice(amount)}
            </span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Frais de virement standard :</span>
            <span className="font-black text-stone-900">
              {formatPrice(fee)}
            </span>
          </div>
          <div className="border-t border-stone-200 pt-3 flex justify-between font-black text-stone-900 text-base">
            <span>
              {t("transactions.sellerPayoutModal.montantNetVerseSurVotre")}
            </span>
            <span className="text-success text-lg">
              {formatPrice(netTransfer)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-micro text-stone-500 pt-1">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>
            Virement exécuté par le prestataire de paiement vers le compte
            vérifié.
          </span>
        </div>

        <div className="flex gap-2.5 pt-2">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="primary"
            fullWidth
            disabled={isProcessing || amount <= 0 || amount > availableBalance}
            onClick={handleWithdraw}
          >
            {isProcessing
              ? "Exécution en cours..."
              : `Confirmer le virement de ${formatPrice(netTransfer)}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
