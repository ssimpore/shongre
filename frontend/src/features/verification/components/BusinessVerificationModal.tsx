import React, { useState } from 'react';
import {
  Building2,
  FileCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Search,
  Sparkles,
  ShieldCheck
  
} from 'lucide-react';
import { useDialogBehavior } from '../../../design-system/primitives/useDialogBehavior';
import { Button } from '../../../design-system/primitives/Button';
import { useVerification } from '../../../domains/verification/useVerification';
import { verificationService } from '../../../domains/verification/verification.service';
import { useToast } from '../../../app/providers/ToastProvider';
import { SUPPORTED_MARKETS, validateBusinessIdentifier } from '../../../configuration/market.config';
import { useTranslation } from '../../../i18n/I18nProvider';

export interface BusinessVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BusinessVerificationModal: React.FC<BusinessVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { currentUser, submitKyb } = useVerification();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [siret, setSiret] = useState(currentUser?.siret || currentUser?.sirenSiret || '');
  const [companyName, setCompanyName] = useState(currentUser?.companyName || '');
  const [legalForm, setLegalForm] = useState(currentUser?.legalForm || 'Société par actions simplifiée (SAS)');
  const [vatNumber, setVatNumber] = useState(currentUser?.vatNumber || '');
  const [businessAddress, setBusinessAddress] = useState(currentUser?.businessAddress || '');
  const [city, setCity] = useState(currentUser?.city || 'Paris');
  const [postalCode, setPostalCode] = useState(currentUser?.postalCode || '75001');
  const [country, ] = useState(currentUser?.country || 'FR');
  
  const [legalRepName, setLegalRepName] = useState(currentUser?.name || '');
  const [legalRepRole, setLegalRepRole] = useState('Gérant / Président');
  
  const [kbisUploaded, setKbisUploaded] = useState(false);
  const [ribUploaded, setRibUploaded] = useState(false);
  const [uboAccepted, setUboAccepted] = useState(false);
  
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupFound, setLookupFound] = useState(false);
  const [instantApproval, setInstantApproval] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { containerRef, titleId } = useDialogBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const currentMarket = SUPPORTED_MARKETS[country] || SUPPORTED_MARKETS['FR'];

  const handleSiretLookup = () => {
    setError(null);
    if (!siret.trim()) {
      setError('Veuillez renseigner un numéro SIRET.');
      return;
    }

    setIsLookingUp(true);
    // The registry lookup is a service call, not a timer. The 400ms wait here
    // only made the spinner visible; whether the lookup is instant (demo) or a
    // real round trip (backend) is the adapter's business.
    try {
      const info = verificationService.lookupCompanyBySiret(siret);
      if (info) {
        setCompanyName(info.companyName);
        setLegalForm(info.legalForm);
        setVatNumber(info.vatNumber);
        setBusinessAddress(info.address);
        setCity(info.city);
        setPostalCode(info.postalCode);
        setLookupFound(true);
      } else {
        setError('Aucune entreprise trouvée pour ce numéro. Vous pouvez saisir les informations manuellement.');
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !siret.trim() || !businessAddress.trim()) {
      setError('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    if (!validateBusinessIdentifier(siret, country)) {
      setError(`Identifiant légal invalide pour le marché ${country}.`);
      return;
    }

    setError(null);
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalRepName.trim() || !legalRepRole.trim()) {
      setError('Veuillez renseigner les informations du mandataire social.');
      return;
    }
    setError(null);
    setStep(3);
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbisUploaded) {
      setError('Veuillez téléverser votre extrait KBIS ou avis SIRENE récent.');
      return;
    }
    setError(null);
    setStep(4);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uboAccepted) {
      setError('Vous devez certifier la déclaration des bénéficiaires effectifs.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await submitKyb(
        {
          companyName: companyName.trim(),
          siret: siret.trim(),
          legalForm,
          vatNumber: vatNumber.trim() || undefined,
          businessAddress: businessAddress.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country,
          legalRepresentativeName: legalRepName.trim(),
          legalRepresentativeRole: legalRepRole.trim(),
          kbisDocumentUrl: 'blob:https://shongre.market/mock-kbis.pdf',
          ribDocumentUrl: ribUploaded ? 'blob:https://shongre.market/mock-rib.pdf' : undefined,
          uboDeclarationAccepted: true,
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
      setError(err.message || 'Erreur lors de la validation entreprise.');
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
          <div className="w-10 h-10 rounded-xl bg-warning-surface text-warning flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 id={titleId} className="text-lg font-black text-stone-900 leading-tight">{t('verification.businessVerificationModal.verificationEntrepriseKybKbis')}</h3>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-500">
              <span>Étape {step} sur 4</span>
              <span>•</span>
              <span className="text-warning font-bold">Immatriculation RCS & INSEE</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mb-6">
          <div
            className="bg-amber-600 h-full transition-all duration-normal rounded-full"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Legal Registration & Auto-fill */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">
                {currentMarket.businessIdentifierLabel} (SIRET / SIREN) <span className="text-primary">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  placeholder="Ex: 98765432100012"
                  required
                  className="flex-1 px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:outline-none focus:border-amber-600"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleSiretLookup}
                  isLoading={isLookingUp}
                  leftIcon={<Search className="w-4 h-4" />}
                >{t('verification.businessVerificationModal.verifier')}</Button>
              </div>
              <p className="text-micro text-stone-500 mt-1">{t('verification.businessVerificationModal.saisissezVotreSiretPourRemplir')}</p>
            </div>

            {lookupFound && (
              <div className="p-3 rounded-xl bg-success-surface border border-success-border text-xs text-success flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span>{t('verification.businessVerificationModal.entrepriseIdentifieeDansLeRepertoire')}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Raison sociale / Nom commercial <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Atelier Nordique SAS"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Forme juridique
                </label>
                <select
                  value={legalForm}
                  onChange={(e) => setLegalForm(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-600"
                >
                  {currentMarket.supportedLegalForms.map((form) => (
                    <option key={form} value={form}>
                      {form}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  TVA Intracommunautaire
                </label>
                <input
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="FR 54 987654321"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">{t('verification.businessVerificationModal.adresseDuSiegeSocial')}<span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder={t('verification.businessVerificationModal.14RueDeLArtisanat')}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Code postal <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-amber-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Ville <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >{t('verification.businessVerificationModal.representantLegal')}</Button>
            </div>
          </form>
        )}

        {/* Step 2: Legal Representative */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <p className="text-xs text-stone-600 leading-relaxed">{t('verification.businessVerificationModal.indiquezLIdentiteDuMandataire')}</p>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">{t('verification.businessVerificationModal.nomCompletDuRepresentantLegal')}<span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={legalRepName}
                onChange={(e) => setLegalRepName(e.target.value)}
                placeholder="Ex: Sophie Laurent"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 focus:outline-none focus:border-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">{t('verification.businessVerificationModal.fonctionQualiteAuSeinDe')}<span className="text-primary">*</span>
              </label>
              <select
                value={legalRepRole}
                onChange={(e) => setLegalRepRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-600"
              >
                <option value="Gérant / Président">{t('verification.businessVerificationModal.presidentDirecteurGeneralGerant')}</option>
                <option value="Entrepreneur individuel">Entrepreneur individuel / Auto-entrepreneur</option>
                <option value="Mandataire habilité">{t('verification.businessVerificationModal.mandataireExpressementHabiliteDelegationDe')}</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
              <div>
                <strong>Lutte contre l'usurpation :</strong> Le représentant légal devra également disposer d'un compte utilisateur authentifié avec pièce d'identité valide.
              </div>
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
                Justificatifs officiels
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Document Upload (KBIS + RIB) */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="space-y-4">
            <p className="text-xs text-stone-600 leading-relaxed">{t('verification.businessVerificationModal.televersezLesDocumentsOfficielsAttestant')}</p>

            {/* KBIS Upload */}
            <button
              type="button"
              onClick={() => setKbisUploaded(true)}
              className={`w-full text-left p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-fast flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                kbisUploaded
                  ? 'border-success bg-success-surface text-success'
                  : 'border-stone-300 hover:border-stone-400 bg-stone-50 text-stone-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    kbisUploaded ? 'bg-success text-white' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {kbisUploaded ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold">
                    {kbisUploaded ? 'Extrait KBIS / Avis SIRENE chargé' : 'Extrait KBIS de moins de 3 mois (PDF/JPG)'}
                  </div>
                  <div className="text-micro text-stone-500">{t('verification.businessVerificationModal.documentObligatoireDelivreParLe')}</div>
                </div>
              </div>
              <span className="text-xs font-bold text-warning">
                {kbisUploaded ? 'Remplacer' : 'Sélectionner'}
              </span>
            </button>

            {/* RIB Upload */}
            <button
              type="button"
              onClick={() => setRibUploaded(true)}
              className={`w-full text-left p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-fast flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                ribUploaded
                  ? 'border-success bg-success-surface text-success'
                  : 'border-stone-300 hover:border-stone-400 bg-stone-50 text-stone-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    ribUploaded ? 'bg-success text-white' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {ribUploaded ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-xs font-bold">
                    {ribUploaded ? 'Relevé RIB professionnel chargé' : 'RIB bancaire professionnel (Optionnel)'}
                  </div>
                  <div className="text-micro text-stone-500">{t('verification.businessVerificationModal.pourAccelererLaValidationDes')}</div>
                </div>
              </div>
              <span className="text-xs font-bold text-warning">
                {ribUploaded ? 'Remplacer' : 'Sélectionner'}
              </span>
            </button>

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
                type="submit"
                variant="primary"
                size="md"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >{t('verification.businessVerificationModal.declarationDeConformite')}</Button>
            </div>
          </form>
        )}

        {/* Step 4: UBO & Confirmation */}
        {step === 4 && (
          <form onSubmit={handleFinalSubmit} className="space-y-4">
            <div className="p-4 rounded-xl bg-warning-surface/70 border border-warning-border/80 text-xs text-warning space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-warning" />{t('verification.businessVerificationModal.declarationDesBeneficiairesEffectifsRbe')}</div>
              <p className="text-micro leading-relaxed text-warning">{t('verification.businessVerificationModal.enApplicationDeLaDirective')}</p>
            </div>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer hover:bg-stone-100 transition-colors">
              <input
                type="checkbox"
                checked={uboAccepted}
                onChange={(e) => setUboAccepted(e.target.checked)}
                className="mt-0.5 rounded text-warning focus:ring-amber-800"
              />
              <span className="text-xs font-semibold text-stone-800 leading-snug">{t('verification.businessVerificationModal.jeCertifieSurLHonneur')}</span>
            </label>

            {/* Demo simulation toggle */}
            <div className="p-3.5 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-warning shrink-0" />
                <div>
                  <div className="font-bold">{t('verification.businessVerificationModal.modeDemonstrationShongre')}</div>
                  <div className="text-micro text-stone-600">{t('verification.businessVerificationModal.validationInstantaneeParSimulationDu')}</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={instantApproval}
                  onChange={(e) => setInstantApproval(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600" />
              </label>
            </div>

            <div className="pt-3 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setStep(3)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Retour
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                rightIcon={<Building2 className="w-4 h-4" />}
              >
                Valider l'entreprise
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
