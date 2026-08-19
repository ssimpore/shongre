import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { Modal } from '../../../design-system/primitives/Modal';
import { Button } from '../../../design-system/primitives/Button';
import { FormField, Input } from '../../../design-system/primitives/FormField';
import { formatPrice } from '../../../utilities/formatters';
import { useTranslation } from '../../../i18n/I18nProvider';

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
  const [offerAmount, setOfferAmount] = useState<string>(Math.round(currentPrice * 0.9).toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(offerAmount);
    if (isNaN(val) || val <= 0) return;

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
      title={t('messaging.makeOfferModal.faireUneOffreDePrix')}
      description={`Prix affiché : ${formatPrice(currentPrice)}. Le vendeur pourra accepter ou refuser votre proposition.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <FormField label={t('messaging.makeOfferModal.montantDeVotreOffre')} required>
          <Input
            type="number"
            min="1"
            max={currentPrice}
            step="1"
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            required
            autoFocus
          />
        </FormField>

        {/* Quick Discount Presets */}
        <div className="flex gap-2">
          {[-5, -10, -15].map((pct) => {
            const calculated = Math.round(currentPrice * (1 + pct / 100));
            return (
              <button
                key={pct}
                type="button"
                onClick={() => setOfferAmount(calculated.toString())}
                className="flex-1 py-1.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold text-micro transition-colors"
              >
                {pct}% ({calculated} €)
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" fullWidth onClick={onClose} type="button">
            Annuler
          </Button>
          <Button
            variant="primary"
            fullWidth
            type="submit"
            isLoading={isSubmitting}
            leftIcon={<DollarSign className="w-4 h-4" />}
          >
            Transmettre l'offre
          </Button>
        </div>
      </form>
    </Modal>
  );
};
