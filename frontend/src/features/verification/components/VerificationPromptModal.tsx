import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  CreditCard,
  Smartphone,
  CheckCircle2,
  X,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { useDialogBehavior } from '../../../design-system/primitives/useDialogBehavior';
import { Button } from '../../../design-system/primitives/Button';
import { VerificationDimensionId } from '../../../domains/verification/verification.types';
import { useTranslation } from '../../../i18n/I18nProvider';

export interface VerificationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredDimension: VerificationDimensionId;
  actionTitle?: string;
  reason?: string;
  onStartVerification: (dimension: VerificationDimensionId) => void;
}

export const VerificationPromptModal: React.FC<VerificationPromptModalProps> = ({
  isOpen,
  onClose,
  requiredDimension,
  actionTitle = 'Vérification requise',
  reason,
  onStartVerification,
}) => {
  const { t } = useTranslation();
  const { containerRef, titleId } = useDialogBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const dimensionConfigs: Record<
    VerificationDimensionId,
    {
      icon: React.ReactNode;
      title: string;
      defaultReason: string;
      benefits: string[];
      ctaLabel: string;
      badgeColor: string;
    }
  > = {
    identity: {
      icon: <ShieldCheck className="w-6 h-6 text-success" />,
      title: 'Vérification d\'identité requise (KYC)',
      defaultReason: 'Cette action requiert une identité vérifiée (CNI ou Passeport) pour garantir la conformité financière et la sécurité des transactions sur la place de marché.',
      benefits: [
        'Publication d\'annonces de valeur élevée (véhicules, horlogerie, immobilier)',
        'Déblocage des paiements de séquestre sans plafond',
        'Badge officiel "Identité Vérifiée" affiché sur votre profil',
      ],
      ctaLabel: 'Vérifier mon identité',
      badgeColor: 'bg-success-surface border-success-border text-success',
    },
    business: {
      icon: <Building2 className="w-6 h-6 text-warning" />,
      title: 'Vérification Professionnelle requise (KYB)',
      defaultReason: 'Pour accéder aux fonctionnalités professionnelles (boutique dédiée, facturation automatisée, multi-annonces), votre immatriculation RCS doit être validée.',
      benefits: [
        'Vitrines professionnelles et URL personnalisée',
        'Génération automatique de factures avec TVA',
        'Badge "Boutique Pro Certifiée RCS"',
      ],
      ctaLabel: 'Certifier mon entreprise',
      badgeColor: 'bg-warning-surface border-warning-border text-warning',
    },
    phone: {
      icon: <Smartphone className="w-6 h-6 text-info" />,
      title: 'Vérification de téléphone requise (SMS)',
      defaultReason: 'Un numéro de mobile vérifié est indispensable pour sécuriser les remises en main propre et recevoir les codes PIN de déblocage.',
      benefits: [
        'Validation par code PIN lors des remises en mains propres',
        'Protection contre l\'usurpation de profil',
        'Prise de contact directe et rapide avec les acheteurs',
      ],
      ctaLabel: 'Vérifier par SMS',
      badgeColor: 'bg-info-surface border-info-border text-info',
    },
    bank_payout: {
      icon: <CreditCard className="w-6 h-6 text-stone-700" />,
      title: 'Compte bancaire requis (IBAN SEPA)',
      defaultReason: 'Renseignez votre compte de virement pour recevoir le produit de vos ventes sécurisées.',
      benefits: [
        'Virement automatique dès la livraison confirmée',
        'Compte séquestre réglementé conforme Banque de France',
        'Relevé fiscal et historique des versements téléchargeable',
      ],
      ctaLabel: 'Ajouter un compte bancaire',
      badgeColor: 'bg-stone-100 border-stone-200 text-stone-800',
    },
    email: {
      icon: <ShieldAlert className="w-6 h-6 text-stone-700" />,
      title: 'Confirmation d\'email requise',
      defaultReason: 'Veuillez confirmer votre adresse email pour continuer.',
      benefits: ['Réception des notifications de commandes', 'Alertes de messagerie'],
      ctaLabel: 'Confirmer mon email',
      badgeColor: 'bg-stone-50 border-stone-200 text-stone-800',
    },
    mfa: {
      icon: <Lock className="w-6 h-6 text-purple-700" />,
      title: 'Double authentification recommandée',
      defaultReason: 'Activez la sécurité 2FA pour protéger vos opérations sensibles.',
      benefits: ['Sécurité renforcée', 'Code unique à chaque connexion sensible'],
      ctaLabel: 'Activer le 2FA',
      badgeColor: 'bg-purple-50 border-purple-200 text-purple-800',
    },
  };

  const config = dimensionConfigs[requiredDimension] || dimensionConfigs.identity;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-fast"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-stone-200 relative"
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

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-center">
            {config.icon}
          </div>
          <div>
            <h3 id={titleId} className="text-base font-black text-stone-900 leading-snug">
              {actionTitle}
            </h3>
            <span className={`inline-flex items-center text-micro px-2 py-0.5 rounded-full border font-bold ${config.badgeColor} mt-0.5`}>
              {config.title}
            </span>
          </div>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed mb-4">
          {reason || config.defaultReason}
        </p>

        <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 mb-5">
          <div className="text-micro font-bold text-stone-700 uppercase tracking-wider mb-2">{t('verification.verificationPromptModal.avantagesApresVerification')}</div>
          <ul className="space-y-1.5 text-xs text-stone-700 font-semibold">
            {config.benefits.map((benefit, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="md" onClick={onClose}>{t('verification.verificationPromptModal.plusTard')}</Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => {
              onClose();
              onStartVerification(requiredDimension);
            }}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {config.ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
