import { isProSeller } from "../../domains/user/user.domain";
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  ChevronRight,
  Store,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { listingRepository } from "../../repositories/listing.repository";
import { messagingRepository } from "../../repositories/messaging.repository";
import { storageService } from "../../services/storage.service";
import { Button } from "../../design-system/primitives/Button";
import { Badge } from "../../design-system/primitives/Badge";
import { useToast } from "../../app/providers/ToastProvider";
import { PhoneVerificationModal } from "../auth/components/PhoneVerificationModal";
import { UpgradeToProModal } from "../auth/components/UpgradeToProModal";
import { BillingHistoryModal } from "./components/BillingHistoryModal";
import { Image } from "../../design-system/primitives/Image";
import { Listing } from "../../types";
import { usePublishCta } from "../../security/usePublishCta";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { StaffBadge } from "../../design-system/components/IdentityBadges";
import { STAFF_ROLE_PRESENTATION } from "../../security/roles.config";

function getPhotoUrl(photo: any): string {
  if (typeof photo === "string") return photo;
  if (photo && typeof photo.url === "string") return photo.url;
  return "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80";
}

export const AccountOverviewPage: React.FC = () => {
  const { activeMarket, formatPrice } = useMarketLocation();
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.accountOverview.title"),
    description: t("meta.accountOverview.description"),
    canonicalPath: "/compte",
    noIndex: true,
  });

  const {
    currentUser,
    isEmailVerified,
    isPhoneVerified,
    refreshUser,
    updateProfile,
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const publishCta = usePublishCta();

  // A verified flag with no number on file is not a verified phone — showing the
  // badge on its own contradicts the "Non renseigné" value rendered right below it.
  const hasVerifiedPhone = isPhoneVerified && Boolean(currentUser?.phone);
  const activeStaffRole =
    currentUser?.staffStatus === "active" && currentUser.staffRole
      ? currentUser.staffRole
      : null;
  const accountName = (
    currentUser?.companyName ||
    currentUser?.name ||
    "Mon Compte"
  ).replace(/\s+\([^)]*\)\s*$/, "");

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);

  useEffect(() => {
    if (searchParams.get("onboarding") !== "professional") return;
    setShowProModal(true);
    const next = new URLSearchParams(searchParams);
    next.delete("onboarding");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Profile Edit
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [city, setCity] = useState(currentUser?.city || "");
  const [postalCode, setPostalCode] = useState(currentUser?.postalCode || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [isSaving, setIsSaving] = useState(false);

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [favCount, setFavCount] = useState(0);
  const [, setSavedSearchCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.id) return;

    listingRepository
      .getListingsBySeller(currentUser.id)
      .then((items) => {
        setMyListings(items || []);
      })
      .catch(() => {
        setMyListings([]);
      });

    listingRepository
      .getFavorites()
      .then((favs) => {
        setFavCount(favs.length);
      })
      .catch(() => {
        setFavCount(0);
      });

    try {
      setSavedSearchCount(storageService.getSavedSearches().length);
    } catch {
      setSavedSearchCount(0);
    }

    messagingRepository
      .getUserConversations(currentUser.id)
      .then((convs) => {
        const unread = convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadMsgCount(unread);
      })
      .catch(() => {
        setUnreadMsgCount(0);
      });
  }, [currentUser?.id]);

  const activeListings = myListings.filter((l) => l.status === "active");

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
      toast.success("Vos coordonnées ont été mises à jour !");
    } catch {
      toast.error("Erreur lors de la sauvegarde du profil.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        data-account-hero
        className="rounded-card border border-white/10 bg-stone-900 p-4 text-white shadow-sm"
      >
        <div className="grid items-center gap-3 lg:grid-cols-content-action">
          <div className="min-w-0 space-y-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="min-w-0 text-lg font-extrabold tracking-tight text-white sm:text-xl">
                <span className="font-medium text-stone-300">Bonjour, </span>
                {accountName}
              </h1>
              {activeStaffRole && (
                <StaffBadge
                  status="active"
                  roleLabel={
                    STAFF_ROLE_PRESENTATION[activeStaffRole].shortLabel
                  }
                />
              )}
            </div>

            <p className="max-w-2xl text-xs leading-relaxed text-stone-300 sm:text-sm">
              {t(
                "sellerworkspace.accountOverviewPage.gerezVosAnnoncesVosVentes",
              )}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row lg:justify-end">
            <Button
              to={
                isProSeller(currentUser)
                  ? `/boutique/${currentUser?.storeSlug || currentUser?.slug || currentUser?.id || ""}`
                  : `/profil/${currentUser?.slug || currentUser?.id}`
              }
              variant="outline"
              size="compact"
              leftIcon={
                isProSeller(currentUser) ? (
                  <Store className="h-icon-sm w-icon-sm" aria-hidden="true" />
                ) : (
                  <ShieldCheck
                    className="h-icon-sm w-icon-sm"
                    aria-hidden="true"
                  />
                )
              }
              className="w-full border-white/30 bg-white/5 text-white hover:border-white/60 hover:bg-white/10 focus-visible:outline-white sm:w-auto"
            >
              {isProSeller(currentUser) ? "Ma boutique" : "Mon profil"}
            </Button>

            <Button
              to={publishCta.to}
              variant="primary"
              size="compact"
              leftIcon={
                <PlusCircle
                  className="h-icon-sm w-icon-sm"
                  aria-hidden="true"
                />
              }
              className="w-full shadow-md shadow-primary/20 sm:w-auto"
            >
              {t(publishCta.labelKey)}
            </Button>
          </div>
        </div>
      </div>

      {/* Trust & Security Hub */}
      <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-icon-lg h-icon-lg text-success" />
            <h2 className="font-extrabold text-sm sm:text-base text-stone-900">
              {t(
                "sellerworkspace.accountOverviewPage.niveauxDeSecuriteVerificationsDu",
              )}
            </h2>
          </div>
          <Link
            to="/compte/verification"
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6"
          >
            {t(
              "sellerworkspace.accountOverviewPage.centreDeVerificationKycKyb",
            )}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Email Verification */}
          <div className="flex flex-col justify-between rounded-control border border-border-base bg-bg-subtle/60 p-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-info-surface text-info flex items-center justify-center font-bold">
                  <Mail className="w-icon-md h-icon-md" />
                </div>
                {isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-md border border-success-border">
                    <CheckCircle2 className="w-icon-xs h-icon-xs" /> Vérifié
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-warning bg-warning-surface px-2 py-0.5 rounded-md border border-warning-border">
                    <AlertCircle className="w-icon-xs h-icon-xs" /> En attente
                  </span>
                )}
              </div>
              <h3 className="text-xs font-bold text-stone-900">
                Adresse Email
              </h3>
              <p className="text-micro text-stone-600 truncate mt-0.5">
                {currentUser?.email}
              </p>
            </div>
            <div className="mt-3 border-t border-border-subtle pt-2">
              {isEmailVerified ? (
                <span className="text-micro text-stone-500 flex items-center gap-1">
                  <CheckCircle2 className="w-icon-xs h-icon-xs text-success" />{" "}
                  Notifications actives
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
                  <Smartphone className="w-icon-md h-icon-md" />
                </div>
                {hasVerifiedPhone ? (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-md border border-success-border">
                    <CheckCircle2 className="w-icon-xs h-icon-xs" /> Vérifié SMS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                    {t("sellerworkspace.accountOverviewPage.nonVerifie")}
                  </span>
                )}
              </div>
              <h3 className="text-xs font-bold text-stone-900">
                {t("sellerworkspace.accountOverviewPage.numeroDeTelephone")}
              </h3>
              <p className="text-micro text-stone-600 truncate mt-0.5">
                {currentUser?.phone || "Non renseigné"}
              </p>
            </div>
            <div className="mt-3 border-t border-border-subtle pt-2">
              <button
                type="button"
                onClick={() => setShowPhoneModal(true)}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6 cursor-pointer"
              >
                {hasVerifiedPhone
                  ? "Modifier / Re-vérifier"
                  : "Vérifier par SMS (6 chiffres) →"}
              </button>
            </div>
          </div>

          {/* MFA 2FA */}
          <div className="flex flex-col justify-between rounded-control border border-border-base bg-bg-subtle/60 p-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-icon-md h-icon-md" />
                </div>
                {currentUser?.mfaEnabled ? (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-md border border-success-border">
                    <CheckCircle2 className="w-icon-xs h-icon-xs" /> 2FA Actif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                    {t("sellerworkspace.accountOverviewPage.desactive")}
                  </span>
                )}
              </div>
              <h3 className="text-xs font-bold text-stone-900">
                Double Authentification
              </h3>
              <p className="text-micro text-stone-600 mt-0.5">
                {t(
                  "sellerworkspace.accountOverviewPage.protectionRenforceeGoogleMicrosoftAuth",
                )}
              </p>
            </div>
            <div className="mt-3 border-t border-border-subtle pt-2">
              <button
                type="button"
                onClick={() => navigate("/compte/securite-compte")}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6 cursor-pointer"
              >
                {currentUser?.mfaEnabled
                  ? "Gérer les codes de secours"
                  : "Activer le 2FA →"}
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
            <List className="w-icon-md h-icon-md" />
          </div>
          <div className="text-2xl font-black text-stone-900">
            {activeListings.length}
          </div>
          <div className="text-xs font-semibold text-stone-500 mt-0.5">
            {t("sellerworkspace.accountOverviewPage.annoncesActives")}
          </div>
        </Link>

        <Link
          to="/compte/messages"
          className="motion-surface block rounded-control border border-border-base bg-bg-surface p-4 shadow-xs hover:border-primary hover:shadow-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-info-surface text-info flex items-center justify-center mb-2">
            <MessageSquare className="w-icon-md h-icon-md" />
          </div>
          <div className="text-2xl font-black text-stone-900">
            {unreadMsgCount}
          </div>
          <div className="text-xs font-semibold text-stone-500 mt-0.5">
            Nouveau message{unreadMsgCount > 1 ? "s" : ""}
          </div>
        </Link>

        <Link
          to="/compte/favoris"
          className="motion-surface block rounded-control border border-border-base bg-bg-surface p-4 shadow-xs hover:border-primary hover:shadow-sm"
        >
          <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center mb-2">
            <Heart className="w-icon-md h-icon-md" />
          </div>
          <div className="text-2xl font-black text-stone-900">{favCount}</div>
          <div className="text-xs font-semibold text-stone-500 mt-0.5">
            {t("sellerworkspace.accountOverviewPage.annoncesSauvegardees")}
          </div>
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
            <FileText className="w-icon-md h-icon-md" />
          </div>
          <div className="mt-auto">
            <div className="text-sm font-bold text-stone-900 flex items-center gap-1">
              Factures
              <ChevronRight className="motion-interactive w-icon-sm h-icon-sm text-stone-400 group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <div className="text-xs font-semibold text-stone-500 mt-0.5">
              {t("sellerworkspace.accountOverviewPage.recusJustificatifs")}
            </div>
          </div>
        </button>
      </div>

      {/* Profile details & Edit mode */}
      <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900">
              {t(
                "sellerworkspace.accountOverviewPage.coordonneesInformationsDuProfil",
              )}
            </h2>
            <p className="text-xs text-stone-500">
              {t(
                "sellerworkspace.accountOverviewPage.visiblesSurVosAnnoncesEt",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="inline-flex items-center gap-1.5 min-h-6 text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            <Edit3 className="w-icon-sm h-icon-sm" />
            {isEditingProfile ? "Fermer" : "Modifier mes informations"}
          </button>
        </div>

        {isEditingProfile ? (
          <form
            onSubmit={handleSaveProfile}
            className="space-y-4 border-t border-border-subtle pt-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  {t(
                    "sellerworkspace.accountOverviewPage.nomEtPrenomPseudonyme",
                  )}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-control-touch w-full rounded-control border border-border-base bg-bg-subtle px-3.5 py-2 text-xs font-semibold text-stone-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  {t("sellerworkspace.accountOverviewPage.numeroDeTelephone2")}
                </label>
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
              <label className="block text-xs font-bold text-stone-800 mb-1">
                {t(
                  "sellerworkspace.accountOverviewPage.biographiePresentation",
                )}
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t(
                  "sellerworkspace.accountOverviewPage.presentezVousBrievementAuxAutres",
                )}
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
              >
                {t(
                  "sellerworkspace.accountOverviewPage.enregistrerLesModifications",
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">
                Nom / Pseudo
              </span>
              <span className="font-bold text-stone-900">{accountName}</span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">
                Email
              </span>
              <span className="font-bold text-stone-900 truncate block">
                {currentUser?.email}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">
                {t("sellerworkspace.accountOverviewPage.telephone")}
              </span>
              <span className="font-bold text-stone-900">
                {currentUser?.phone || "Non renseigné"}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block mb-0.5 font-medium">
                Localisation
              </span>
              <span className="font-bold text-stone-900">
                {currentUser?.postalCode ? `${currentUser.postalCode} ` : ""}
                {currentUser?.city || activeMarket.name}
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
          >
            {t("sellerworkspace.accountOverviewPage.toutesMesAnnonces")}
          </Link>
        </div>

        {myListings.length > 0 ? (
          <div className="divide-y divide-border-subtle">
            {myListings.slice(0, 4).map((listing) => {
              const photoUrl = getPhotoUrl(
                listing.coverImageUrl || listing.photos?.[0],
              );
              return (
                <div
                  key={listing.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
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
                        <span className="font-bold text-stone-900">
                          {formatPrice(listing.price, {
                            sourceCurrency: listing.currency,
                          })}
                        </span>
                        <span>•</span>
                        <span>{listing.city}</span>
                        <span>•</span>
                        <span>
                          {listing.viewsCount ?? listing.viewCount ?? 0} vues
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={
                        listing.status === "active" ? "success" : "neutral"
                      }
                      size="sm"
                    >
                      {listing.status === "active" ? "En ligne" : "Vendu"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-500 text-xs">
            {t("sellerworkspace.accountOverviewPage.vousNAvezPasEncore")}
          </div>
        )}
      </div>

      {/* Pro solutions callout */}
      {!isProSeller(currentUser) && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-card border border-primary-border bg-primary-light p-5 sm:flex-row">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Sparkles className="w-icon-md h-icon-md" />
              {t(
                "sellerworkspace.accountOverviewPage.passezALaVitesseSuperieure",
              )}
            </div>
            <h2 className="font-black text-stone-900 text-sm sm:text-base">
              {t(
                "sellerworkspace.accountOverviewPage.vousVendezRegulierementEnTant",
              )}
            </h2>
            <p className="text-xs text-stone-600">
              {t(
                "sellerworkspace.accountOverviewPage.profitezDUneBoutiqueDediee",
              )}
            </p>
          </div>
          <Button
            variant="primary"
            size="compact"
            onClick={() => setShowProModal(true)}
            className="shrink-0"
            leftIcon={<Briefcase className="h-icon-sm w-icon-sm" />}
          >
            {t("sellerworkspace.accountOverviewPage.passerEnComptePro")}
          </Button>
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

          <UpgradeToProModal
            isOpen={showProModal}
            onClose={() => setShowProModal(false)}
            onSuccess={() => {
              refreshUser();
              toast.success(
                "Votre compte a été mis à niveau vers le statut Professionnel !",
              );
              navigate("/compte/pro/tableau-de-bord");
            }}
          />

          <BillingHistoryModal
            isOpen={showBillingModal}
            onClose={() => setShowBillingModal(false)}
            userType={
              currentUser.accountType === "professional"
                ? "professional"
                : "individual"
            }
          />
        </>
      )}
    </div>
  );
};
