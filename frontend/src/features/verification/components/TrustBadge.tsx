import React from 'react';
import { ShieldCheck, Building2, CheckCircle2, Smartphone, Lock, Award } from 'lucide-react';
import { TrustLevel, VerificationDimensionId } from '../../../domains/verification/verification.types';
import { useTranslation } from '../../../i18n/I18nProvider';

export interface TrustBadgeProps {
  level?: TrustLevel;
  dimension?: VerificationDimensionId;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  level,
  dimension,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const { t } = useTranslation();
  const sizeClasses = {
    sm: 'text-micro px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-black',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  if (dimension) {
    switch (dimension) {
      case 'identity':
        return (
          <span
            className={`inline-flex items-center rounded-full bg-success-surface text-success border border-success-border ${sizeClasses[size]} ${className}`}
            title={t('verification.trustBadge.identiteOfficielleVerifieeCniPasseport')}
          >
            <ShieldCheck className={iconSizes[size]} />
            {showLabel && <span>{t('verification.trustBadge.identiteVerifiee')}</span>}
          </span>
        );
      case 'business':
        return (
          <span
            className={`inline-flex items-center rounded-full bg-warning-surface text-warning border border-warning-border ${sizeClasses[size]} ${className}`}
            title={t('verification.trustBadge.entrepriseCertifieeAuRegistreDu')}
          >
            <Building2 className={iconSizes[size]} />
            {showLabel && <span>{t('verification.trustBadge.proCertifieRcs')}</span>}
          </span>
        );
      case 'phone':
        return (
          <span
            className={`inline-flex items-center rounded-full bg-info-surface text-info border border-info-border ${sizeClasses[size]} ${className}`}
            title={t('verification.trustBadge.numeroDeTelephoneVerifiePar')}
          >
            <Smartphone className={iconSizes[size]} />
            {showLabel && <span>{t('verification.trustBadge.telephoneCertifie')}</span>}
          </span>
        );
      case 'bank_payout':
        return (
          <span
            className={`inline-flex items-center rounded-full bg-stone-100 text-stone-800 border border-stone-300 ${sizeClasses[size]} ${className}`}
            title={t('verification.trustBadge.compteBancaireSepaValidePour')}
          >
            <CheckCircle2 className={iconSizes[size]} />
            {showLabel && <span>{t('verification.trustBadge.ibanVerifie')}</span>}
          </span>
        );
      case 'mfa':
        return (
          <span
            className={`inline-flex items-center rounded-full bg-purple-50 text-purple-800 border border-purple-200 ${sizeClasses[size]} ${className}`}
            title="Double authentification active"
          >
            <Lock className={iconSizes[size]} />
            {showLabel && <span>{t('verification.trustBadge.compte2fa')}</span>}
          </span>
        );
      default:
        return null;
    }
  }

  // Level based badge
  switch (level) {
    case 'tier_4_verified_pro':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-stone-900 text-amber-300 border border-amber-400/50 shadow-2xs ${sizeClasses[size]} ${className}`}
        >
          <Building2 className={iconSizes[size]} />
          {showLabel && <span>{t('verification.trustBadge.boutiqueProVerifiee')}</span>}
        </span>
      );
    case 'tier_3_trusted_seller':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-success text-white shadow-2xs ${sizeClasses[size]} ${className}`}
        >
          <Award className={iconSizes[size]} />
          {showLabel && <span>{t('verification.trustBadge.vendeurDeConfiance')}</span>}
        </span>
      );
    case 'tier_2_verified_member':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-success-surface text-success border border-success-border ${sizeClasses[size]} ${className}`}
        >
          <CheckCircle2 className={iconSizes[size]} />
          {showLabel && <span>{t('verification.trustBadge.membreVerifie')}</span>}
        </span>
      );
    case 'tier_1_starter':
      return (
        <span
          className={`inline-flex items-center rounded-full bg-stone-100 text-stone-700 border border-stone-200 ${sizeClasses[size]} ${className}`}
        >
          <ShieldCheck className={iconSizes[size]} />
          {showLabel && <span>{t('verification.trustBadge.compteDebutant')}</span>}
        </span>
      );
    default:
      return null;
  }
};
