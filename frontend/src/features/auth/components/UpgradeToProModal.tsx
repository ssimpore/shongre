import React, { useState } from 'react';
import { Briefcase,  ShieldCheck,  AlertCircle, X, ArrowRight } from 'lucide-react';
import { useDialogBehavior } from '../../../design-system/primitives/useDialogBehavior';
import { useAuth } from '../../../app/providers/AuthProvider';
import { Button } from '../../../design-system/primitives/Button';
import { SUPPORTED_MARKETS, validateBusinessIdentifier } from '../../../configuration/market.config';
import { useTranslation } from '../../../i18n/I18nProvider';

export interface UpgradeToProModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UpgradeToProModal: React.FC<UpgradeToProModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { currentUser, upgradeToPro } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [sirenSiret, setSirenSiret] = useState('');
  const [legalForm, setLegalForm] = useState('Micro-entreprise / Auto-entrepreneur');
  const [vatNumber, setVatNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const currentMarket = SUPPORTED_MARKETS[currentUser.country || 'FR'] || SUPPORTED_MARKETS['FR'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError('La raison sociale de votre entreprise est obligatoire.');
      return;
    }

    if (!validateBusinessIdentifier(sirenSiret, currentUser.country || 'FR')) {
      setError(`Identifiant légal invalide. ${currentMarket.businessIdentifierHelper}`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await upgradeToPro({
        companyName: companyName.trim(),
        sirenSiret: sirenSiret.trim(),
        legalForm,
        vatNumber: vatNumber.trim() || undefined,
        businessAddress: businessAddress.trim(),
        phone: phone.trim() || undefined,
      });

      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setError(res.errorMessage || 'Erreur lors de la mise à niveau vers le statut Professionnel.');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à niveau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Escape, focus trap, focus restore and scroll lock — this overlay
  // bypassed the shared Modal primitive and had none of them.
  const { containerRef, titleId } = useDialogBehavior(true, onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-fast"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 relative max-h-[90vh] overflow-y-auto"
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

        <div className="w-12 h-12 rounded-xl bg-primary-light text-primary flex items-center justify-center mb-4">
          <Briefcase className="w-6 h-6" />
        </div>

        <h3 id={titleId} className="text-xl font-extrabold text-stone-900 mb-1">{t('auth.upgradeToProModal.passerEnCompteProfessionnel')}</h3>
        <p className="text-xs text-stone-600 mb-5 leading-relaxed">{t('auth.upgradeToProModal.conservezToutesVosAnnoncesAvis')}</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              Raison sociale / Nom commercial <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t('auth.upgradeToProModal.exAtelierEbenisterieDupont')}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">
                {currentMarket.businessIdentifierLabel} <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={sirenSiret}
                onChange={(e) => setSirenSiret(e.target.value)}
                placeholder={currentMarket.businessIdentifierFormatPlaceholder}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">
                Statut / Forme juridique <span className="text-primary">*</span>
              </label>
              <select
                value={legalForm}
                onChange={(e) => setLegalForm(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {currentMarket.supportedLegalForms.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">{t('auth.upgradeToProModal.numeroDeTvaIntracommunautaire')}</label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                placeholder={currentMarket.vatNumberFormatPlaceholder}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">{t('auth.upgradeToProModal.telephoneProfessionnel')}</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01 23 45 67 89"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">{t('auth.upgradeToProModal.adresseDuSiegeSocialBoutique')}<span className="text-primary">*</span>
            </label>
            <input
              type="text"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder={t('auth.upgradeToProModal.12RueDuCommerce75011')}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-warning-surface/70 border border-warning-border/80 text-xs text-warning flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>{t('auth.upgradeToProModal.verificationLegale')}</strong> Votre immatriculation fera l'objet d'un examen par nos services de conformité. Votre badge Vendeur Pro sera délivré dès validation du dossier.
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >{t('auth.upgradeToProModal.confirmerLaMiseANiveau')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
