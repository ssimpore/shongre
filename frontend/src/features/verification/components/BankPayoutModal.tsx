import React, { useState } from "react";
import { CreditCard, AlertCircle, X, Lock, ShieldCheck } from "lucide-react";
import { useDialogBehavior } from "../../../design-system/primitives/useDialogBehavior";
import { Button } from "../../../design-system/primitives/Button";
import { useVerification } from "../../../domains/verification/useVerification";
import { useToast } from "../../../app/providers/ToastProvider";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface BankPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BankPayoutModal: React.FC<BankPayoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { currentUser, submitBankPayout } = useVerification();
  const toast = useToast();

  const [accountHolder, setAccountHolder] = useState(
    currentUser?.name || currentUser?.companyName || "",
  );
  const [rawIban, setRawIban] = useState("");
  const [bic, setBic] = useState("");
  const [bankName, setBankName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { containerRef, titleId } = useDialogBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .replace(/(.{4})/g, "$1 ")
      .trim();
    setRawIban(formatted);

    // Auto detect French banks if BIC empty
    if (formatted.startsWith("FR76") && !bic) {
      setBankName("Compte Bancaire Français (SEPA)");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIban = rawIban.replace(/\s+/g, "");
    const cleanBic = bic.replace(/\s+/g, "").toUpperCase();

    if (!accountHolder.trim()) {
      setError("Veuillez renseigner le nom complet du titulaire du compte.");
      return;
    }

    if (cleanIban.length < 15) {
      setError("Le numéro IBAN saisi est trop court.");
      return;
    }

    if (!/^[A-Z]{2}[0-9A-Z]+$/.test(cleanIban)) {
      setError("Le format de l'IBAN est invalide.");
      return;
    }

    if (cleanBic && (cleanBic.length < 8 || cleanBic.length > 11)) {
      setError("Le code BIC / SWIFT doit comporter entre 8 et 11 caractères.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await submitBankPayout({
        accountHolderName: accountHolder.trim(),
        iban: cleanIban,
        bic: cleanBic || "GENERICSEPA",
        bankName: bankName.trim() || "Banque SEPA Validée",
      });

      if (res.success) {
        toast.success(res.message);
        onSuccess?.();
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement bancaire.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-fast"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 relative max-h-[90vh] overflow-y-auto"
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3
              id={titleId}
              className="text-lg font-black text-stone-900 leading-tight"
            >
              {t("verification.bankPayoutModal.coordonneesBancairesDeVirement")}
            </h3>
            <p className="text-xs text-stone-500 font-semibold">
              {t(
                "verification.bankPayoutModal.sequestreSecuriseVirementsDeVentes",
              )}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              {t("verification.bankPayoutModal.nomDuTitulaireDuCompte")}
              <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder={t("verification.bankPayoutModal.exJeanDupontOuSarl")}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-semibold text-stone-900 focus:outline-none focus:border-stone-800 h-control-touch"
            />
            <p className="text-micro text-stone-500 mt-1">
              {t("verification.bankPayoutModal.leNomDoitCorrespondreA")}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              {t("verification.bankPayoutModal.numeroIbanZoneSepa")}
              <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={rawIban}
              onChange={handleIbanChange}
              placeholder="FR76 1234 5678 9012 3456 7890 123"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-sm font-mono font-bold text-stone-900 tracking-wider focus:outline-none focus:border-stone-800 uppercase h-control-touch"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Code BIC / SWIFT
              </label>
              <input
                type="text"
                value={bic}
                onChange={(e) => setBic(e.target.value.toUpperCase())}
                placeholder="BNPAFRPP"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-control text-xs font-mono font-bold text-stone-900 focus:outline-none focus:border-stone-800 uppercase h-control-touch"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t("verification.bankPayoutModal.etablissementBancaire")}
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ex: BNP Paribas, BoursoBank..."
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-control text-xs text-stone-900 focus:outline-none focus:border-stone-800 h-control-touch"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Protection bancaire :</strong> Vos fonds issus des ventes
              sont protégés en séquestre réglementé et automatiquement virés sur
              ce compte dès confirmation de la transaction.
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="md" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              rightIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Enregistrer mon IBAN
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
