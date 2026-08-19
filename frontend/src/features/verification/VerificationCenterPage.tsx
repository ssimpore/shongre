import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Smartphone,
  Mail,
  CreditCard,
  Lock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Info,
  History,
  Award,
} from 'lucide-react';
import { useVerification } from '../../domains/verification/useVerification';
import { VerificationDimensionId, TrustLevel } from '../../domains/verification/verification.types';
import { TrustBadge } from './components/TrustBadge';
import { IdentityVerificationModal } from './components/IdentityVerificationModal';
import { BusinessVerificationModal } from './components/BusinessVerificationModal';
import { BankPayoutModal } from './components/BankPayoutModal';
import { PhoneVerificationModal } from '../auth/components/PhoneVerificationModal';
import { Button } from '../../design-system/primitives/Button';
import { verificationService } from '../../domains/verification/verification.service';
import { useToast } from '../../app/providers/ToastProvider';
import { useTranslation } from '../../i18n/I18nProvider';

export const VerificationCenterPage: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    currentUser,
    summary,
    capabilities,
    dimensions,
    trustLevel,
    trustScore,
    trustLevelLabel,
    setPreset,
  } = useVerification();

  const [activeModal, setActiveModal] = useState<VerificationDimensionId | null>(null);
  const [showDemoPresets, setShowDemoPresets] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'capabilities' | 'history'>('overview');

  const auditLogs = verificationService.getAuditLogs(currentUser?.id);

  const getDimensionIcon = (id: VerificationDimensionId) => {
    switch (id) {
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'phone':
        return <Smartphone className="w-5 h-5" />;
      case 'identity':
        return <ShieldCheck className="w-5 h-5" />;
      case 'business':
        return <Building2 className="w-5 h-5" />;
      case 'bank_payout':
        return <CreditCard className="w-5 h-5" />;
      case 'mfa':
        return <Lock className="w-5 h-5" />;
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-success bg-success-surface border border-success-border px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Vérifié
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-warning bg-warning-surface border border-warning-border px-2.5 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            Examen en cours
          </span>
        );
      case 'requires_action':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            Action requise
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-danger bg-danger-surface border border-danger-border px-2.5 py-1 rounded-full">
            <XCircle className="w-3.5 h-3.5" />
            Refusé
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-full">
            Non commencé
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-micro font-black uppercase tracking-wider text-success bg-success-surface px-2.5 py-0.5 rounded-full border border-success-border">
                Centre de Confiance & Sécurité
              </span>
              <TrustBadge level={trustLevel} size="md" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {trustLevelLabel}
            </h1>
            <p className="text-sm text-stone-600 max-w-xl leading-relaxed">
              Shongre utilise un modèle de confiance progressif. Validez vos étapes au fur et à mesure pour débloquer des plafonds plus élevés et rassurer la communauté.
            </p>
          </div>

          {/* Trust Score Gauge Card */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 shrink-0 flex flex-col items-center justify-center min-w-[200px]">
            <div className="text-micro font-bold uppercase tracking-wider text-stone-500 mb-1">
              Indice de Confiance
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-stone-900">{trustScore}</span>
              <span className="text-sm font-bold text-stone-500">/ 100</span>
            </div>
            <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full transition-all duration-slow rounded-full ${
                  trustScore >= 80 ? 'bg-success' : trustScore >= 40 ? 'bg-amber-500' : 'bg-stone-400'
                }`}
                style={{ width: `${trustScore}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowDemoPresets(!showDemoPresets)}
              className="mt-3 text-micro font-bold text-success hover:text-success flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>{showDemoPresets ? 'Masquer le simulateur' : 'Simulateur de statut'}</span>
            </button>
          </div>
        </div>

        {/* Demo Preset Switcher Panel */}
        {showDemoPresets && (
          <div className="mt-6 pt-6 border-t border-stone-200 animate-in fade-in duration-fast">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-warning" />
              <span className="text-xs font-bold text-stone-900">
                Mode Démonstration : Simuler un profil utilisateur
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[
                { id: 'tier_0_unverified', label: '1. Non vérifié', color: 'border-stone-200' },
                { id: 'tier_1_email_only', label: '2. Email seul', color: 'border-stone-200' },
                { id: 'tier_2_phone_verified', label: '3. Téléphone SMS', color: 'border-info-border' },
                { id: 'kyc_pending', label: '4. KYC en cours', color: 'border-warning-border' },
                { id: 'tier_3_kyc_verified', label: '5. KYC Validé (CNI)', color: 'border-success-border' },
                { id: 'kyc_rejected', label: '6. KYC Refusé', color: 'border-danger-border' },
                { id: 'kyb_pending', label: '7. Pro KYB en cours', color: 'border-warning-border' },
                { id: 'tier_4_kyb_verified', label: '8. Pro Certifié KBIS', color: 'border-warning-border' },
                { id: 'kyb_rejected', label: '9. KYB Refusé', color: 'border-danger-border' },
                { id: 'full_trust_pro', label: '10. Full Pro 100/100', color: 'border-emerald-500' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id as any)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all hover:bg-stone-100 bg-white ${p.color} cursor-pointer`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Checklist des vérifications
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('capabilities')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'capabilities'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Capacités du compte ({Object.values(capabilities).filter(Boolean).length}/9)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Journal d'audit ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Dimensional Checklist */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* The sibling tabs each open with an h2 and a lead line; this one went
              straight from the page h1 into the cards' h3, skipping a level and
              leaving the only unlabelled panel of the three. */}
          <div className="space-y-1">
            <h2 className="text-lg font-black text-stone-900">{t('verification.verificationCenterPage.checklistDesVerifications')}</h2>
            <p className="text-xs text-stone-600">
              Complétez chaque dimension pour renforcer la confiance des acheteurs et lever
              les limites de votre compte.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(dimensions) as VerificationDimensionId[]).map((dimKey) => {
              const dim = dimensions[dimKey];
              const isVerified = dim.state === 'verified';
              const isPending = dim.state === 'pending';
              const isRejected = dim.state === 'rejected';

              return (
                <div
                  key={dimKey}
                  className={`bg-white rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                    isVerified
                      ? 'border-success-border bg-success-surface/20'
                      : isPending
                      ? 'border-warning-border bg-warning-surface/20'
                      : isRejected
                      ? 'border-danger-border bg-danger-surface/20'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isVerified
                              ? 'bg-success-surface text-success'
                              : isPending
                              ? 'bg-warning-surface text-warning'
                              : isRejected
                              ? 'bg-danger-surface text-danger'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {getDimensionIcon(dimKey)}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-stone-900">{dim.label}</h3>
                          <span className="text-micro text-stone-500">{dim.shortLabel}</span>
                        </div>
                      </div>
                      {getStateBadge(dim.state)}
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed">
                      {dim.description}
                    </p>

                    {dim.rejectionReason && (
                      <div className="p-3 rounded-xl bg-danger-surface border border-danger-border text-micro text-danger">
                        <strong>{t('verification.verificationCenterPage.motifDuRejet')}</strong> {dim.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
                    {dim.completedAt ? (
                      <span className="text-micro text-stone-500 font-semibold">
                        Validé le {new Date(dim.completedAt).toLocaleDateString('fr-FR')}
                      </span>
                    ) : (
                      <span className="text-micro text-stone-500 font-semibold">
                        {dim.isRequiredForPro ? 'Obligatoire pour les Pros' : 'Recommandé'}
                      </span>
                    )}

                    {!isVerified && (
                      <Button
                        type="button"
                        variant={isPending ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => setActiveModal(dimKey)}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        {dim.actionLabel || 'Commencer'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Capabilities Grid */}
      {activeTab === 'capabilities' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-stone-900">{t('verification.verificationCenterPage.capacitesPermissionsDuCompte')}</h2>
            <p className="text-xs text-stone-600">
              Débloquez chaque palier pour accéder aux plafonds et fonctionnalités réservées.
            </p>
          </div>

          <div className="divide-y divide-stone-100">
            {[
              {
                id: 'canBrowse',
                title: 'Consulter les annonces & le catalogue',
                desc: 'Accès public sans restriction',
                active: capabilities.canBrowse,
                req: 'Aucun',
              },
              {
                id: 'canContact',
                title: 'Contacter les vendeurs par messagerie',
                desc: 'Messagerie instantanée sécurisée',
                active: capabilities.canContact,
                req: 'Email ou Téléphone vérifié',
              },
              {
                id: 'canBuyStandard',
                title: 'Acheter des articles standards (< 1 000 €)',
                desc: 'Paiement sécurisé par séquestre Shongre',
                active: capabilities.canBuyStandard,
                req: 'Email vérifié',
              },
              {
                id: 'canBuyHighValue',
                title: 'Acheter des articles de valeur (> 1 000 €)',
                desc: 'Véhicules, montres, mobilier de collection',
                active: capabilities.canBuyHighValue,
                req: 'Identité KYC ou Téléphone 2FA',
              },
              {
                id: 'canPublishIndividualLow',
                title: 'Publier des annonces Particulier standard',
                desc: 'Jusqu\'à 1 500 € par annonce',
                active: capabilities.canPublishIndividualLow,
                req: 'Email + Téléphone vérifié',
              },
              {
                id: 'canPublishIndividualHigh',
                title: 'Publier des annonces Particulier de luxe / véhicules',
                desc: 'Plafond illimité avec protection anti-fraude',
                active: capabilities.canPublishIndividualHigh,
                req: 'Identité KYC validée (CNI/Passeport)',
              },
              {
                id: 'canPublishPro',
                title: 'Publier en tant que Professionnel',
                desc: 'Facturation automatique, multi-annonces, vitrine',
                active: capabilities.canPublishPro,
                req: 'KBIS / RCS validé (KYB)',
              },
              {
                id: 'canReceivePayouts',
                title: 'Recevoir les virements bancaires de ventes',
                desc: 'Déblocage des fonds séquestrés vers votre compte',
                active: capabilities.canReceivePayouts,
                req: 'IBAN SEPA + KYC/KYB validé',
              },
              {
                id: 'canAccessProStorefront',
                title: 'Boutique personnalisée avec logo & adresse',
                desc: 'Page publique dédiée à votre marque',
                active: capabilities.canAccessProStorefront,
                req: 'Compte Professionnel certifié',
              },
            ].map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">{item.title}</span>
                    {item.active ? (
                      <span className="text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-md">
                        Débloqué
                      </span>
                    ) : (
                      <span className="text-micro font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                        Verrouillé
                      </span>
                    )}
                  </div>
                  <p className="text-micro text-stone-500">{item.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-micro font-semibold text-stone-500">Requis : {item.req}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Audit History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-stone-900">{t('verification.verificationCenterPage.journalDesEvenementsDeConformite')}</h2>
            <p className="text-xs text-stone-600">
              Historique inaltérable des changements d'état et validations de conformité.
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-xs">
              Aucune action enregistrée pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center mt-0.5">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">
                        {log.dimension.toUpperCase()} : {log.previousState} ➔ {log.newState}
                      </div>
                      <div className="text-micro text-stone-500">
                        {log.notes || 'Mise à jour du statut'} • Par {log.performedBy}
                      </div>
                    </div>
                  </div>
                  <span className="text-micro text-stone-500 shrink-0">
                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <IdentityVerificationModal
        isOpen={activeModal === 'identity'}
        onClose={() => setActiveModal(null)}
      />
      <BusinessVerificationModal
        isOpen={activeModal === 'business'}
        onClose={() => setActiveModal(null)}
      />
      <BankPayoutModal
        isOpen={activeModal === 'bank_payout'}
        onClose={() => setActiveModal(null)}
      />
      <PhoneVerificationModal
        userId={currentUser?.id || ''}
        initialPhone={currentUser?.phone || ''}
        isOpen={activeModal === 'phone'}
        onClose={() => setActiveModal(null)}
        onSuccess={() => {
          setActiveModal(null);
          toast.success('Numéro de téléphone vérifié par SMS.');
        }}
      />
    </div>
  );
};
