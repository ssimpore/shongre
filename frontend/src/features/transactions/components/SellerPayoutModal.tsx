import React, { useState } from 'react';
import { Landmark, ArrowUpRight, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { UserProfile, SellerPayoutRequest } from '../../../types';
import { TRANSACTION_CONFIG } from '../../../configuration/transaction.config';
import { transactionService } from '../../../domains/transaction/transaction.service';
import { Modal } from '../../../design-system/primitives/Modal';
import { Button } from '../../../design-system/primitives/Button';
import { formatPrice } from '../../../utilities/formatters';

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
  const [payoutType, setPayoutType] = useState<'standard' | 'instant'>('standard');
  const [amountStr, setAmountStr] = useState(availableBalance > 0 ? availableBalance.toFixed(2) : '0.00');
  const [bankIban, setBankIban] = useState('FR76 3000 4019 8291 8291 0029 821');
  const [bankName, setBankName] = useState('BNP Paribas');
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
      title="Transférer mes gains vers mon compte bancaire"
      description="Sélectionnez le montant et le délai de virement souhaité."
    >
      <div className="space-y-4 text-xs">
        {/* Available Balance Box */}
        <div className="p-4 bg-stone-900 text-white rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-micro font-bold text-stone-500 uppercase tracking-wider block">
              Solde Shongre disponible
            </span>
            <span className="text-2xl font-black tracking-tight text-white mt-0.5 block">
              {formatPrice(availableBalance)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAmountStr(availableBalance.toFixed(2))}
            className="text-micro font-bold text-primary bg-primary/20 hover:bg-primary/30 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            Tout transférer
          </button>
        </div>

        {error && (
          <div className="p-3 bg-danger-surface border border-danger-border text-danger rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block font-bold text-stone-700 mb-1.5">Montant du virement (€)</label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="1"
              max={availableBalance}
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-full h-control-touch px-3.5 pr-10 text-stone-900 bg-white rounded-xl border border-stone-200 focus:outline-none focus:border-primary font-bold text-base"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-500">€</span>
          </div>
        </div>

        {/* Payout Options */}
        <div className="space-y-2">
          <label className="block font-bold text-stone-700">Type de virement</label>
          <div className="grid grid-cols-2 gap-2.5">
            <div
              onClick={() => setPayoutType('standard')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                payoutType === 'standard'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-stone-200 bg-white hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-stone-900">Standard</span>
                <span className="text-micro font-bold text-success bg-success-surface px-1.5 py-0.5 rounded">
                  Gratuit
                </span>
              </div>
              <p className="text-micro text-stone-500">Délai SEPA classique (24 à 48h ouvrées)</p>
            </div>

            <div
              onClick={() => setPayoutType('instant')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                payoutType === 'instant'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-stone-200 bg-white hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-stone-900 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Instantané
                </span>
                <span className="text-micro font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                  0,90 €
                </span>
              </div>
              <p className="text-micro text-stone-500">Crédité en moins de 10 minutes sur votre IBAN</p>
            </div>
          </div>
        </div>

        {/* Destination Bank Account */}
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-600 shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-stone-900">{bankName}</p>
              <p className="text-micro text-stone-500 font-mono">IBAN •••• {bankIban.slice(-4)}</p>
            </div>
          </div>
          <span className="text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Vérifié
          </span>
        </div>

        {/* Summary Breakdown */}
        <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-1.5">
          <div className="flex justify-between text-stone-600">
            <span>Montant prélevé du solde :</span>
            <span className="font-semibold text-stone-900">{formatPrice(amount)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Frais de virement {payoutType === 'instant' ? 'instantané' : 'standard'} :</span>
            <span className="font-semibold text-stone-900">{formatPrice(fee)}</span>
          </div>
          <div className="border-t border-stone-100 pt-1.5 flex justify-between font-bold text-stone-900 text-sm">
            <span>Montant net versé sur votre compte :</span>
            <span className="text-success">{formatPrice(netTransfer)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-micro text-stone-500 pt-1">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>Virements exécutés via Mangopay, établissement de monnaie électronique agréé ACPR.</span>
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
