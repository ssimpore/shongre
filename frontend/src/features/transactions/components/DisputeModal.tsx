import React, { useState } from 'react';
import { AlertTriangle, UploadCloud, CheckCircle2 } from 'lucide-react';
import { Transaction, UserProfile } from '../../../types';
import { TRANSACTION_CONFIG } from '../../../configuration/transaction.config';
import { transactionService } from '../../../domains/transaction/transaction.service';
import { Modal } from '../../../design-system/primitives/Modal';
import { Button } from '../../../design-system/primitives/Button';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  currentUser: UserProfile;
  onSuccess: (updatedTx: Transaction) => void;
}

export const DisputeModal: React.FC<DisputeModalProps> = ({
  isOpen,
  onClose,
  transaction,
  currentUser,
  onSuccess,
}) => {
  const [reason, setReason] = useState(TRANSACTION_CONFIG.disputeReasons[0].id);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.length < 15) {
      setError('Veuillez décrire le problème en détail (au moins 15 caractères).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedReason = TRANSACTION_CONFIG.disputeReasons.find((r) => r.id === reason)?.label || reason;
      const updated = await transactionService.openDispute(transaction.id, currentUser, {
        reason: selectedReason,
        description: description.trim(),
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'ouverture du litige.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Signaler un problème / Ouvrir un litige"
      description="Les fonds sous séquestre resteront gelés jusqu'à résolution par le service client Shongre."
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-warning-surface border border-warning-border rounded-xl text-warning flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-warning">Protection Acheteur & Vendeur active</p>
            <p className="text-micro text-warning mt-0.5">
              En ouvrant ce dossier, aucun versement ne sera exécuté tant que la situation n'est pas clarifiée entre les deux parties ou arbitrée par nos équipes.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-danger-surface border border-danger-border text-danger rounded-xl font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block font-bold text-stone-700 mb-1.5">
            Motif principal du litige <span className="text-danger">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full h-10 px-3 bg-white text-stone-900 rounded-xl border border-stone-200 focus:outline-none focus:border-primary font-medium"
          >
            {TRANSACTION_CONFIG.disputeReasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-stone-700 mb-1.5">
            Description détaillée des faits <span className="text-danger">*</span>
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Expliquez ce qui s'est passé (état du colis, non-conformité, échange avec l'autre partie...)"
            className="w-full p-3 bg-white text-stone-900 rounded-xl border border-stone-200 focus:outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="p-3 border border-dashed border-stone-300 rounded-xl bg-stone-50 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-stone-100 transition-colors">
          <UploadCloud className="w-6 h-6 text-stone-400 mb-1" />
          <span className="font-semibold text-stone-700">Ajouter des photos ou justificatifs</span>
          <span className="text-micro text-stone-500 mt-0.5">JPG, PNG ou PDF (max 10 Mo)</span>
        </div>

        <div className="flex gap-2.5 pt-2">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
            {isSubmitting ? 'Envoi du dossier...' : 'Déposer la réclamation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
