import React, { useState } from 'react';
import { Landmark,  CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { UserProfile, SellerPayoutRequest } from '../../../types';
import { TRANSACTION_CONFIG } from '../../../configuration/transaction.config';
import { transactionService } from '../../../domains/transaction/transaction.service';
import { Modal } from '../../../design-system/primitives/Modal';
import { Button } from '../../../design-system/primitives/Button';
import { SelectableCard } from '../../../design-system/primitives/SelectableCard';
import { formatPrice } from '../../../utilities/formatters';
import { useTranslation } from '../../../i18n/I18nProvider';

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
  const [payoutType, setPayoutType] = useState<'standard' | 'instant'>('standard');
  const [amountStr, setAmountStr] = useState(availableBalance > 0 ? availableBalance.toFixed(2) : '0.00');
  const [bankIban, ] = useState('FR76 3000 4019 8291 8291 0029 821');
  const [bankName, ] = useState('BNP Paribas');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = parseFloat(amountStr) || 0;
  const fee = payoutType === 'instant' ? TRANSACTION_CONFIG.instantPayoutFeeCents / 100 : 0;
  const netTransfer = Math.max(0, amount - fee);

  const handleWithdraw = async () => {
    if (amount <= 0) {
      setError('Veuillez saisir un montant supérieur à 0 €.');
      return;
    }
    if (amount > availableBalance) {
      setError('Le montant demandé dépasse votre solde disponible.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const payout = await transactionService.requestPayout(
        currentUser,
        amount,
        payoutType,
        bankIban.slice(-4),
        bankName
      );
      onPayoutSuccess(payout);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors du virement bancaire.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('transactions.sellerPayoutModal.transfererMesGainsVersMon')}
      description={t('transactions.sellerPayoutModal.selectionnezLeMontantEtLe')}
    >
      <div className="space-y-4 text-xs">
        {/* Available Balance Box */}
        <div className="p-5 bg-stone-900 text-white rounded-3xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block mb-1">
              Solde Shongre disponible
            </span>
            <span className="text-3xl font-black tracking-tight text-white block">
              {formatPrice(availableBalance)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAmountStr(availableBalance.toFixed(2))}
            className="text-xs font-bold text-primary bg-primary/20 hover:bg-primary/30 px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >{t('transactions.sellerPayoutModal.toutTransferer')}</button>
        </div>

        {error && (
          <div className="p-3 bg-danger-surface border border-danger-border text-danger rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block font-bold text-stone-700 mb-2 text-sm">{t('transactions.sellerPayoutModal.montantDuVirement')}</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="1"
              max={availableBalance}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full h-12 px-4 pr-10 text-stone-900 bg-white rounded-2xl border border-stone-200/60 shadow-inner focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-black text-lg transition-colors"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-stone-500">€</span>
          </div>
        </div>

        {/* Payout Options */}
        <div className="space-y-3">
          <label className="block font-bold text-stone-700 text-sm">{t('transactions.sellerPayoutModal.typeDeVirement')}</label>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <SelectableCard
              selected={payoutType === 'standard'}
              onSelect={() => setPayoutType('standard')}
              aria-label={t('transactions.sellerPayoutModal.virementStandardGratuit24A')}
              className={`p-4 rounded-2xl border transition-all duration-normal shadow-2xs hover:shadow-sm ${
                payoutType === 'standard'
                  ? 'border-primary bg-primary-light ring-1 ring-primary/50'
                  : 'border-stone-200/60 bg-white hover:bg-stone-50 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-stone-900">Standard</span>
                <span className="text-xs font-bold text-success bg-success-surface px-2 py-0.5 rounded-md">
                  Gratuit
                </span>
              </div>
              <p className="text-xs font-medium text-stone-500">{t('transactions.sellerPayoutModal.delaiSepaClassique24A')}</p>
            </SelectableCard>

            <SelectableCard
              selected={payoutType === 'instant'}
              onSelect={() => setPayoutType('instant')}
              aria-label={t('transactions.sellerPayoutModal.virementInstantane090Credite')}
              className={`p-4 rounded-2xl border transition-all duration-normal shadow-2xs hover:shadow-sm ${
                payoutType === 'instant'
                  ? 'border-primary bg-primary-light ring-1 ring-primary/50'
                  : 'border-stone-200/60 bg-white hover:bg-stone-50 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> Instantané
                </span>
                <span className="text-xs font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                  0,90 €
                </span>
              </div>
              <p className="text-xs font-medium text-stone-500">{t('transactions.sellerPayoutModal.crediteEnMoinsDe10')}</p>
            </SelectableCard>
          </div>
        </div>

        {/* Destination Bank Account */}
        <div className="p-4 bg-stone-50 border border-stone-200/60 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-600 shrink-0 shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-stone-900 text-sm">{bankName}</p>
              <p className="text-xs text-stone-500 font-mono mt-0.5">IBAN •••• {bankIban.slice(-4)}</p>
            </div>
          </div>
          <span className="text-xs font-bold text-success bg-success-surface px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Vérifié
          </span>
        </div>

        {/* Summary Breakdown */}
        <div className="p-5 bg-stone-50 border border-stone-200/60 rounded-2xl space-y-3 shadow-inner font-medium text-sm">
          <div className="flex justify-between text-stone-600">
            <span>{t('transactions.sellerPayoutModal.montantPreleveDuSolde')}</span>
            <span className="font-black text-stone-900">{formatPrice(amount)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Frais de virement {payoutType === 'instant' ? 'instantané' : 'standard'} :</span>
            <span className="font-black text-stone-900">{formatPrice(fee)}</span>
          </div>
          <div className="border-t border-stone-200 pt-3 flex justify-between font-black text-stone-900 text-base">
            <span>{t('transactions.sellerPayoutModal.montantNetVerseSurVotre')}</span>
            <span className="text-success text-lg">{formatPrice(netTransfer)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-micro text-stone-500 pt-1">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>{t('transactions.sellerPayoutModal.virementsExecutesViaMangopayEtablissement')}</span>
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
            {isProcessing ? 'Exécution en cours...' : `Confirmer le virement de ${formatPrice(netTransfer)}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
