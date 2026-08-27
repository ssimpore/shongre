import React, { useState } from "react";
import { DollarSign } from "lucide-react";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { FormField, Input } from "../../../design-system/primitives/FormField";
import { useTranslation } from "../../../i18n/I18nProvider";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { OFFER_INPUT_CONSTRAINTS } from "../../../domains/messaging/messaging.types";

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrice: number;
  onSendOffer: (amount: number) => Promise<void>;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({
  isOpen,
  onClose,
  currentPrice,
  onSendOffer,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useMarketLocation();
  const [offerAmount, setOfferAmount] = useState<string>(
    Math.round(
      currentPrice *
        (1 -
          OFFER_INPUT_CONSTRAINTS.defaultDiscountPercent /
            OFFER_INPUT_CONSTRAINTS.percentageScale),
    ).toString(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(offerAmount);
    if (isNaN(val) || val < OFFER_INPUT_CONSTRAINTS.minimumMajor) return;

    setIsSubmitting(true);
    try {
      await onSendOffer(val);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("messaging.makeOfferModal.faireUneOffreDePrix")}
      description={t("messaging.makeOfferModal.displayedPriceDescription", {
        price: formatPrice(currentPrice),
      })}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <FormField
          label={t("messaging.makeOfferModal.montantDeVotreOffre")}
          required
        >
          <Input
            type="number"
            min={OFFER_INPUT_CONSTRAINTS.minimumMajor}
            max={currentPrice}
            step={OFFER_INPUT_CONSTRAINTS.stepMajor}
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            required
            autoFocus
          />
        </FormField>

        {/* Quick Discount Presets */}
        <div className="flex gap-2">
          {OFFER_INPUT_CONSTRAINTS.quickDiscountPercents.map((discount) => {
            const calculated = Math.round(
              currentPrice *
                (1 - discount / OFFER_INPUT_CONSTRAINTS.percentageScale),
            );
            return (
              <button
                key={discount}
                type="button"
                onClick={() => setOfferAmount(calculated.toString())}
                className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-micro transition-colors"
              >
                -{discount}% ({formatPrice(calculated)})
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" fullWidth onClick={onClose} type="button">
            {t("messaging.makeOfferModal.cancel")}
          </Button>
          <Button
            variant="primary"
            fullWidth
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<DollarSign className="w-icon-md h-icon-md" />}
          >
            {t("messaging.makeOfferModal.submitOffer")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
