import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useDialogBehavior } from '../../../design-system/primitives/useDialogBehavior';
import { Button } from '../../../design-system/primitives/Button';
import { KycDocumentType } from '../../../domains/verification/verification.types';
import { useVerification } from '../../../domains/verification/useVerification';
import { useToast } from '../../../app/providers/ToastProvider';
import { useTranslation } from '../../../i18n/I18nProvider';

export interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const IdentityVerificationModal: React.FC<IdentityVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { currentUser, submitKyc } = useVerification();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [documentType, setDocumentType] = useState<KycDocumentType>('national_id');
  const [issuingCountry, setIssuingCountry] = useState(currentUser?.country || 'FR');
  const [firstName, setFirstName] = useState(currentUser?.name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(currentUser?.name?.split(' ').slice(1).join(' ') || '');
  const [birthDate, setBirthDate] = useState('1990-01-01');
  const [documentNumber, setDocumentNumber] = useState('');
  const [frontUploaded, setFrontUploaded] = useState(false);
  const [backUploaded, setBackUploaded] = useState(false);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [instantApproval, setInstantApproval] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { containerRef, titleId } = useDialogBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !birthDate) {
      setError('Veuillez renseigner vos prénom, nom et date de naissance.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontUploaded) {
      setError('Veuillez téléverser le recto de votre pièce d\'identité.');
      return;
    }
    if (documentType === 'national_id' && !backUploaded) {
      setError('Veuillez téléverser le verso de votre carte d\'identité.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await submitKyc(
        {
          documentType,
          issuingCountry,
          firstName,
          lastName,
          birthDate,
          documentNumber: documentNumber.trim() || undefined,
          frontDocumentUrl: 'blob:https://shongre.market/mock-id-front.jpg',
          backDocumentUrl: backUploaded ? 'blob:https://shongre.market/mock-id-back.jpg' : undefined,
          selfieUrl: selfieCaptured ? 'blob:https://shongre.market/mock-selfie.jpg' : undefined,
        },
        instantApproval
      );

      if (res.success) {
        toast.success(res.message);
        onSuccess?.();
        onClose();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la vérification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-fast"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-stone-200 relative max-h-[90vh] overflow-y-auto"
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

        {/* Stepper Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-success-surface text-success flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 id={titleId} className="text-lg font-black text-stone-900 leading-tight">
              Vérification d'identité officielle (KYC)
            </h3>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
              <span>Étape {step} sur 3</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-success">
                <Lock className="w-3 h-3" /> Données chiffrées de bout en bout
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mb-6">
          <div
            className="bg-success h-full transition-all duration-normal rounded-full"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Personal Info & Document Type */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">
                Type de pièce d'identité officielle
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'national_id', label: 'Carte Nationale d\'Identité (CNI)' },
                  { id: 'passport', label: 'Passeport' },
                  { id: 'residence_permit', label: 'Titre de séjour' },
                  { id: 'driving_license', label: 'Permis de conduire' },
                ].map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setDocumentType(doc.id as KycDocumentType)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      documentType === doc.id
                        ? 'border-emerald-600 bg-success-surface/50 text-success ring-2 ring-emerald-600/20'
                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 mb-1.5 text-stone-500" />
                    {doc.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Prénom(s) <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jean"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Nom de famille <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Dupont"
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Date de naissance <span className="text-primary">*</span>
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Pays émetteur
                </label>
                <select
                  value={issuingCountry}
                  onChange={(e) => setIssuingCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="FR">🇫🇷 France</option>
                  <option value="BE">🇧🇪 Belgique</option>
                  <option value="CH">🇨🇭 Suisse</option>
                  <option value="LU">🇱🇺 Luxembourg</option>
                  <option value="DE">🇩🇪 Allemagne</option>
                  <option value="ES">🇪🇸 Espagne</option>
                </select>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continuer vers les documents
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Upload Documents */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <p className="text-xs text-stone-600 leading-relaxed">
              Téléversez une photo nette et non tronquée de votre document original. Les 4 coins doivent être visibles sans reflet.
            </p>

            {/* Front Upload */}
            <button
              type="button"
              onClick={() => setFrontUploaded(true)}
              className={`w-full text-left p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-fast flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                frontUploaded
                  ? 'border-success bg-success-surface text-success'
                  : 'border-stone-300 hover:border-stone-400 bg-stone-50 text-stone-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    frontUploaded ? 'bg-success text-white' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {frontUploaded ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold">
                    {frontUploaded ? 'Recto du document chargé' : 'Téléverser le recto (face photo)'}
                  </div>
                  <div className="text-micro text-stone-500">{t('verification.identityVerificationModal.formatsAcceptesJpgPngPdf')}</div>
                </div>
              </div>
              <span className="text-xs font-bold text-success">
                {frontUploaded ? 'Remplacer' : 'Sélectionner'}
              </span>
            </button>

            {/* Back Upload (for CNI & Driving License) */}
            {(documentType === 'national_id' || documentType === 'driving_license') && (
              <button
                type="button"
                onClick={() => setBackUploaded(true)}
                className={`w-full text-left p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-fast flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  backUploaded
                    ? 'border-success bg-success-surface text-success'
                    : 'border-stone-300 hover:border-stone-400 bg-stone-50 text-stone-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      backUploaded ? 'bg-success text-white' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    {backUploaded ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold">
                      {backUploaded ? 'Verso du document chargé' : 'Téléverser le verso (bande MRZ)'}
                    </div>
                    <div className="text-micro text-stone-500">{t('verification.identityVerificationModal.requisPourLaValidationOptique')}</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-success">
                  {backUploaded ? 'Remplacer' : 'Sélectionner'}
                </span>
              </button>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Numéro du document (facultatif / lu par OCR)
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ex: 190475102934"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="pt-3 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setStep(1)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Retour
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Vérification biométrique
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Biometric / Selfie Liveness Check */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-stone-600 leading-relaxed">
              Un rapide contrôle de présence vérifie que vous êtes bien le titulaire légitime de la pièce d'identité fournie.
            </p>

            <div className="bg-stone-900 rounded-2xl p-6 text-center text-white relative overflow-hidden shadow-inner">
              <div className="w-24 h-24 mx-auto rounded-full border-4 border-emerald-400/80 flex items-center justify-center mb-3 relative bg-stone-800">
                <Camera className="w-10 h-10 text-emerald-400" />
                {selfieCaptured && (
                  <div className="absolute inset-0 bg-success/90 rounded-full flex items-center justify-center text-white">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                )}
              </div>

              <h4 className="text-sm font-bold mb-1">
                {selfieCaptured ? 'Contrôle biométrique validé' : 'Positionnez votre visage au centre'}
              </h4>
              <p className="text-micro text-stone-400 max-w-xs mx-auto mb-4">
                Regardez l'objectif sans lunettes de soleil ni couvre-chef.
              </p>

              <button
                type="button"
                onClick={() => setSelfieCaptured(true)}
                className="px-4 py-2 bg-success hover:bg-success text-white text-xs font-bold rounded-xl transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{selfieCaptured ? 'Reprendre la photo' : 'Effectuer le selfie de contrôle'}</span>
              </button>
            </div>

            {/* Demo test toggle */}
            <div className="p-3.5 rounded-xl bg-warning-surface/70 border border-warning-border text-xs text-warning flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-warning shrink-0" />
                <div>
                  <div className="font-bold">{t('verification.identityVerificationModal.modeDemonstrationShongre')}</div>
                  <div className="text-micro text-warning">
                    Validation instantanée par simulation OCR / Liveness
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={instantApproval}
                  onChange={(e) => setInstantApproval(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success" />
              </label>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setStep(2)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Retour
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleFinalSubmit}
                isLoading={isLoading}
                rightIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Transmettre mon dossier
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
