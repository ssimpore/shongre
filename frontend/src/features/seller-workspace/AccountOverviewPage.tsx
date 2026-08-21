import { isProSeller, showsVerifiedBadge } from '../../domains/user/user.domain';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  List,
  Heart,
  
  MessageSquare,
  Sparkles,
  
  
  ShieldCheck,
  PlusCircle,
  
  
  Shield,
  Smartphone,
  Mail,
  
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  
  Edit3,
  FileText,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { listingRepository } from '../../repositories/listing.repository';
import { messagingRepository } from '../../repositories/messaging.repository';
import { storageService } from '../../services/storage.service';
import { formatPrice } from '../../utilities/formatters';
import { Button } from '../../design-system/primitives/Button';
import { Badge } from '../../design-system/primitives/Badge';
import { useToast } from '../../app/providers/ToastProvider';
import { PhoneVerificationModal } from '../auth/components/PhoneVerificationModal';
import { MFAModal } from '../auth/components/MFAModal';
import { UpgradeToProModal } from '../auth/components/UpgradeToProModal';
import { BillingHistoryModal } from './components/BillingHistoryModal';
import { Image } from '../../design-system/primitives/Image';
import { Listing } from '../../types';
import { usePublishCta } from '../../security/usePublishCta';
import { useTranslation } from '../../i18n/I18nProvider';
import { usePageMeta } from '../../hooks/usePageMeta';

function getPhotoUrl(photo: any): string {
  if (typeof photo === 'string') return photo;
  if (photo && typeof photo.url === 'string') return photo.url;
  return 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80';
}

export const AccountOverviewPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t('meta.accountOverview.title'),
    description: t('meta.accountOverview.description'),
    canonicalPath: '/compte',
    noIndex: true,
  });

  const { currentUser, platformRole, isEmailVerified, isPhoneVerified, refreshUser, updateProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const publishCta = usePublishCta();

  // A verified flag with no number on file is not a verified phone — showing the
  // badge on its own contradicts the "Non renseigné" value rendered right below it.
  const hasVerifiedPhone = isPhoneVerified && Boolean(currentUser?.phone);
  const isAdmin = platformRole === 'admin' || platformRole === 'super_admin';
  const adminRoleLabel = platformRole === 'super_admin'
    ? t('shell.accountLayout.roleSuperAdministrateur')
    : t('shell.accountLayout.roleAdministrateur');
  const accountName = (currentUser?.companyName || currentUser?.name || 'Mon Compte').replace(/\s+\([^)]*\)\s*$/, '');

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  // Profile Edit
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [city, setCity] = useState(currentUser?.city || '');
  const [postalCode, setPostalCode] = useState(currentUser?.postalCode || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [isSaving, setIsSaving] = useState(false);

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [, setSavedSearchCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.id) return;

    listingRepository.getListingsBySeller(currentUser.id).then((items) => {
      setMyListings(items || []);
    }).catch(() => {
      setMyListings([]);
    });

    listingRepository.getFavorites().then((favs) => {
      setFavCount(favs.length);
    }).catch(() => {
      setFavCount(0);
    });

    try {
      setSavedSearchCount(storageService.getSavedSearches().length);
    } catch {
      setSavedSearchCount(0);
    }

    messagingRepository.getUserConversations(currentUser.id).then((convs) => {
      const unread = convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      setUnreadMsgCount(unread);
    }).catch(() => {
      setUnreadMsgCount(0);
    });
  }, [currentUser?.id]);

  const activeListings = myListings.filter((l) => l.status === 'active');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        name,
        phone,
        city,
        postalCode,
        bio,
      });
      refreshUser();
      setIsEditingProfile(false);
      toast.success('Vos coordonnées ont été mises à jour !');
    } catch {
      toast.error('Erreur lors de la sauvegarde du profil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        data-account-hero
        className="relative isolate overflow-hidden rounded-card border border-white/10 bg-stone-900 p-5 text-white shadow-sm sm:p-6 lg:p-7"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-40 w-40 rounded-full bg-primary-on-dark/10 blur-3xl" aria-hidden="true" />

        <div className="relative grid items-center gap-5 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 space-y-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-sm font-medium text-stone-300">Bonjour,</span>
              <h1 className="min-w-0 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                {accountName}
              </h1>
              {isAdmin && (
                <span
                  role="img"
                  aria-label={adminRoleLabel}
                  title={adminRoleLabel}
                  className="inline-flex h-control-sm w-control-sm shrink-0 items-center justify-center rounded-pill border border-primary-on-dark/40 bg-primary-on-dark/10 text-primary-on-dark"
                >
                  <ShieldCheck className="h-icon-sm w-icon-sm" aria-hidden="true" />
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isProSeller(currentUser) && (
                <Badge variant="pro" size="md" icon>
                  {t('shell.accountLayout.proBadge')}
                </Badge>
              )}
              {!isAdmin && showsVerifiedBadge(currentUser) && (
                <Badge variant="verified" size="md" icon>
                  {t('sellerworkspace.accountOverviewPage.verifie')}
                </Badge>
              )}
            </div>

            <p className="max-w-2xl text-sm leading-relaxed text-stone-300">
              {t('sellerworkspace.accountOverviewPage.gerezVosAnnoncesVosVentes')}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row xl:justify-end">
            <Button
              to={
                isProSeller(currentUser)
                  ? `/boutique/${currentUser.storeSlug || currentUser.slug || currentUser.id}`
                  : `/profil/${currentUser?.slug || currentUser?.id}`
              }
              variant="outline"
              size="md"
              leftIcon={<ShieldCheck className="h-icon-md w-icon-md" aria-hidden="true" />}
              className="w-full border-white/30 bg-white/5 text-white hover:border-white/60 hover:bg-white/10 focus-visible:outline-white sm:w-auto"
            >
              {isProSeller(currentUser) ? 'Voir ma boutique publique' : 'Voir mon profil public'}
            </Button>

            <Button
              to={publishCta.to}
              variant="primary"
              size="md"
              leftIcon={<PlusCircle className="h-icon-md w-icon-md" aria-hidden="true" />}
              className="w-full shadow-md shadow-primary/20 sm:w-auto"
            >
              {t('sellerworkspace.accountOverviewPage.deposerUneAnnonce')}
            </Button>
          </div>
        </div>
      </div>

      {/* Trust & Security Hub */}
      <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-success" />
            <h2 className="font-extrabold text-sm sm:text-base text-stone-900">{t('sellerworkspace.accountOverviewPage.niveauxDeSecuriteVerificationsDu')}</h2>
          </div>
          <Link
            to="/compte/verification"
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6"
          >{t('sellerworkspace.accountOverviewPage.centreDeVerificationKycKyb')}</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Email Verification */}
          <div className="flex flex-col justify-between rounded-control border border-border-base bg-bg-subtle/60 p-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-info-surface text-info flex items-center justify-center font-bold">
                  <Mail className="w-4 h-4" />
                </div>
                {isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-md border border-success-border">
                    <CheckCircle2 className="w-3 h-3" /> Vérifié
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-warning bg-warning-surface px-2 py-0.5 rounded-md border border-warning-border">
                    <AlertCircle className="w-3 h-3" /> En attente
                  </span>
                )}
              </div>
              <h3 className="text-xs font-bold text-stone-900">Adresse Email</h3>
              <p className="text-micro text-stone-600 truncate mt-0.5">
                {currentUser?.email}
              </p>
            </div>
            <div className="mt-3 border-t border-border-subtle pt-2">
              {isEmailVerified ? (
                <span className="text-micro text-stone-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-success" /> Notifications actives
                </span>
              ) : (
                <Link
                  to="/verification-email"
                  className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6"
                >
                  Confirmer mon email →
                </Link>
              )}
            </div>
          </div>

          {/* Phone Verification */}
          <div className="flex flex-col justify-between rounded-control border border-border-base bg-bg-subtle/60 p-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-success-surface text-success flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                {hasVerifiedPhone ? (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-md border border-success-border">
                    <CheckCircle2 className="w-3 h-3" /> Vérifié SMS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">{t('sellerworkspace.accountOverviewPage.nonVerifie')}</span>
                )}
              </div>
              <h3 className="text-xs font-bold text-stone-900">{t('sellerworkspace.accountOverviewPage.numeroDeTelephone')}</h3>
              <p className="text-micro text-stone-600 truncate mt-0.5">
                {currentUser?.phone || 'Non renseigné'}
              </p>
            </div>
            <div className="mt-3 border-t border-border-subtle pt-2">
              <button
                type="button"
                onClick={() => setShowPhoneModal(true)}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6 cursor-pointer"
              >
                {hasVerifiedPhone ? 'Modifier / Re-vérifier' : 'Vérifier par SMS (6 chiffres) →'}
              </button>
            </div>
          </div>

          {/* MFA 2FA */}
          <div className="flex flex-col justify-between rounded-control border border-border-base bg-bg-subtle/60 p-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                {currentUser?.mfaEnabled ? (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-md border border-success-border">
                    <CheckCircle2 className="w-3 h-3" /> 2FA Actif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">{t('sellerworkspace.accountOverviewPage.desactive')}</span>
                )}
              </div>
              <h3 className="text-xs font-bold text-stone-900">Double Authentification</h3>
              <p className="text-micro text-stone-600 mt-0.5">{t('sellerworkspace.accountOverviewPage.protectionRenforceeGoogleMicrosoftAuth')}</p>
            </div>
            <div className="mt-3 border-t border-border-subtle pt-2">
              <button
                type="button"
                onClick={() => setShowMfaModal(true)}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6 cursor-pointer"
              >
                {currentUser?.mfaEnabled ? 'Gérer les codes de secours' : 'Activer le 2FA →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to="/compte/annonces"
          className="motion-surface block rounded-control border border-border-base bg-bg-surface p-4 shadow-xs hover:border-primary hover:shadow-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center mb-2">
            <List className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-stone-900">{activeListings.length}</div>
          <div className="text-xs font-semibold text-stone-500 mt-0.5">{t('sellerworkspace.accountOverviewPage.annoncesActives')}</div>
        </Link>

        <Link
          to="/compte/messages"
          className="motion-surface block rounded-control border border-border-base bg-bg-surface p-4 shadow-xs hover:border-primary hover:shadow-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-info-surface text-info flex items-center justify-center mb-2">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-stone-900">{unreadMsgCount}</div>
          <div className="text-xs font-semibold text-stone-500 mt-0.5">Nouveau message{unreadMsgCount > 1 ? 's' : ''}</div>
        </Link>

        <Link
          to="/compte/favoris"
          className="motion-surface block rounded-control border border-border-base bg-bg-surface p-4 shadow-xs hover:border-primary hover:shadow-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center mb-2">
            <Heart className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-stone-900">{favCount}</div>
          <div className="text-xs font-semibold text-stone-500 mt-0.5">{t('sellerworkspace.accountOverviewPage.annoncesSauvegardees')}</div>
        </Link>

        {/* This card opens the billing history — it is an action, not a metric.
            It used to put the word "Factures" in the same 2xl-black slot the
            three cards beside it use for a count, so it scanned as a broken
            statistic. Same footprint, anatomy that matches what it does. */}
        <button
          type="button"
          onClick={() => setShowBillingModal(true)}
          className="motion-surface group flex cursor-pointer flex-col rounded-control border border-border-base bg-bg-surface p-4 text-left shadow-xs hover:border-primary hover:shadow-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
          <div className="mt-auto">
            <div className="text-sm font-bold text-stone-900 flex items-center gap-1">
              Factures
              <ChevronRight className="motion-interactive w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <div className="text-xs font-semibold text-stone-500 mt-0.5">{t('sellerworkspace.accountOverviewPage.recusJustificatifs')}</div>
          </div>
        </button>
      </div>

      {/* Profile details & Edit mode */}
      <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900">{t('sellerworkspace.accountOverviewPage.coordonneesInformationsDuProfil')}</h2>
            <p className="text-xs text-stone-500">{t('sellerworkspace.accountOverviewPage.visiblesSurVosAnnoncesEt')}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="inline-flex items-center gap-1.5 min-h-6 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditingProfile ? 'Fermer' : 'Modifier mes informations'}
          </button>
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 border-t border-border-subtle pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">{t('sellerworkspace.accountOverviewPage.nomEtPrenomPseudonyme')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-control-touch w-full rounded-control border border-border-base bg-bg-subtle px-3.5 py-2 text-xs font-semibold text-stone-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">{t('sellerworkspace.accountOverviewPage.numeroDeTelephone2')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="h-control-touch w-full rounded-control border border-border-base bg-bg-subtle px-3.5 py-2 text-xs font-semibold text-stone-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Paris"
                  className="h-control-touch w-full rounded-control border border-border-base bg-bg-subtle px-3.5 py-2 text-xs font-semibold text-stone-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Code Postal
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="75011"
                  className="h-control-touch w-full rounded-control border border-border-base bg-bg-subtle px-3.5 py-2 text-xs font-semibold text-stone-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">{t('sellerworkspace.accountOverviewPage.biographiePresentation')}</label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('sellerworkspace.accountOverviewPage.presentezVousBrievementAuxAutres')}
                className="min-h-control-touch w-full rounded-control border border-border-base bg-bg-subtle px-3.5 py-2 text-xs text-stone-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSaving}
              >{t('sellerworkspace.accountOverviewPage.enregistrerLesModifications')}</Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">Nom / Pseudo</span>
              <span className="font-bold text-stone-900">{accountName}</span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">Email</span>
              <span className="font-bold text-stone-900 truncate block">{currentUser?.email}</span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">{t('sellerworkspace.accountOverviewPage.telephone')}</span>
              <span className="font-bold text-stone-900">{currentUser?.phone || 'Non renseigné'}</span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">Localisation</span>
              <span className="font-bold text-stone-900">
                {currentUser?.postalCode ? `${currentUser.postalCode} ` : ''}
                {currentUser?.city || 'France'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* My Active Listings Widget */}
      <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-bold text-stone-900">
            Mes dernières annonces ({myListings.length})
          </h2>
          <Link
            to="/compte/annonces"
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6"
          >{t('sellerworkspace.accountOverviewPage.toutesMesAnnonces')}</Link>
        </div>

        {myListings.length > 0 ? (
          <div className="divide-y divide-border-subtle">
            {myListings.slice(0, 4).map((listing) => {
              const photoUrl = getPhotoUrl(listing.coverImageUrl || listing.photos?.[0]);
              return (
                <div key={listing.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Image
                      src={photoUrl}
                      alt=""
                      sizes="48px"
                      className="w-12 h-12 rounded-lg object-cover border border-border-base shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <Link
                        to={`/annonce/${listing.id}`}
                        className="font-bold text-xs sm:text-sm text-stone-900 hover:text-primary truncate block"
                      >
                        {listing.title}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                        <span className="font-bold text-stone-900">{formatPrice(listing.price)}</span>
                        <span>•</span>
                        <span>{listing.city}</span>
                        <span>•</span>
                        <span>{listing.viewsCount ?? listing.viewCount ?? 0} vues</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={listing.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {listing.status === 'active' ? 'En ligne' : 'Vendu'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-500 text-xs">{t('sellerworkspace.accountOverviewPage.vousNAvezPasEncore')}</div>
        )}
      </div>

      {/* Pro solutions callout */}
      {!isProSeller(currentUser) && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-card border border-primary-border bg-primary-light p-5 sm:flex-row">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Sparkles className="w-4 h-4" />{t('sellerworkspace.accountOverviewPage.passezALaVitesseSuperieure')}</div>
            <h2 className="font-black text-stone-900 text-sm sm:text-base">{t('sellerworkspace.accountOverviewPage.vousVendezRegulierementEnTant')}</h2>
            <p className="text-xs text-stone-600">{t('sellerworkspace.accountOverviewPage.profitezDUneBoutiqueDediee')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowProModal(true)}
            className="bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0 shadow-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" />{t('sellerworkspace.accountOverviewPage.passerEnComptePro')}</button>
        </div>
      )}

      {/* Modals */}
      {currentUser && (
        <>
          <PhoneVerificationModal
            userId={currentUser.id}
            initialPhone={currentUser.phone}
            isOpen={showPhoneModal}
            onClose={() => setShowPhoneModal(false)}
            onSuccess={(verifiedPhone) => {
              refreshUser();
              toast.success(`Numéro ${verifiedPhone} vérifié avec succès !`);
            }}
          />

          <MFAModal
            userId={currentUser.id}
            isOpen={showMfaModal}
            onClose={() => setShowMfaModal(false)}
            onSuccess={() => {
              refreshUser();
              toast.success('Double authentification (2FA) activée avec succès !');
            }}
          />

          <UpgradeToProModal
            isOpen={showProModal}
            onClose={() => setShowProModal(false)}
            onSuccess={() => {
              refreshUser();
              toast.success('Votre compte a été mis à niveau vers le statut Professionnel !');
              navigate('/compte/pro/tableau-de-bord');
            }}
          />

          <BillingHistoryModal
            isOpen={showBillingModal}
            onClose={() => setShowBillingModal(false)}
            userType={currentUser.accountType === 'professional' ? 'professional' : 'individual'}
          />
        </>
      )}
    </div>
  );
};
