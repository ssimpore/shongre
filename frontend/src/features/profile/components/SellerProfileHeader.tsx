import {
  isProSeller,
  showsVerifiedBadge,
} from "../../../domains/user/user.domain";
import React, { useEffect, useState } from "react";
import { ProBadge, VerificationBadge } from "@shongre/ui/web";

import {
  MapPin,
  Star,
  Calendar,
  MessageSquare,
  Share2,
  MoreVertical,
  Flag,
  Ban,
  Building2,
  Edit3,
  List,
} from "lucide-react";
import { PublicSellerProfile } from "../../../types";
import { Avatar } from "../../../design-system/primitives/Badge";
import { Button } from "../../../design-system/primitives/Button";
import { IconButton } from "../../../design-system/primitives/IconButton";
import { useAuth } from "../../../app/providers/AuthProvider";
import { useToast } from "../../../app/providers/ToastProvider";
import { services } from "../../../api/client/service-registry";
import { useTranslation } from "../../../i18n/I18nProvider";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { publicRouteUrl } from "../../../domains/market/market-routing";

export interface SellerProfileHeaderProps {
  seller: PublicSellerProfile;
  activeListingsCount: number;
  onTabChange: (tab: "catalog" | "reviews" | "about") => void;
  isOwnProfile: boolean;
  onContactClick: () => void;
  onOpenReportModal: () => void;
}

export const SellerProfileHeader: React.FC<SellerProfileHeaderProps> = ({
  seller,
  activeListingsCount,
  onTabChange,
  isOwnProfile,
  onContactClick,
  onOpenReportModal,
}) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { marketContext, activeMarket } = useMarketLocation();
  const toast = useToast();

  const [isBlocked, setIsBlocked] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isPro = isProSeller(seller);
  const displayName = seller.name;

  // Format member seniority
  const memberYear = seller.createdAt
    ? new Date(seller.createdAt).getFullYear()
    : null;

  useEffect(() => {
    if (!currentUser) {
      setIsBlocked(false);
      return;
    }
    let active = true;
    services.messaging
      .getBlockedUserIds(currentUser.id)
      .then((ids) => {
        if (active) setIsBlocked(ids.includes(seller.id));
      })
      .catch(() => {
        if (active) setIsBlocked(false);
      });
    return () => {
      active = false;
    };
  }, [currentUser, seller.id]);

  const handleShare = async () => {
    const shareUrl = publicRouteUrl({
      route: `/profil/${encodeURIComponent(seller.id)}`,
      countryCode: marketContext?.countryCode ?? activeMarket.code,
    });
    const shareData = {
      title: `${displayName} sur Shongre`,
      text: isPro
        ? `Découvrez la boutique officielle de ${displayName} sur Shongre.`
        : `Consultez les annonces de ${displayName} sur Shongre.`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Lien du profil copié dans le presse-papier !");
      } catch {
        toast.info(shareUrl);
      }
    }
  };

  const handleBlockToggle = async () => {
    if (!currentUser) {
      toast.info("Connectez-vous pour bloquer un utilisateur.");
      return;
    }
    try {
      if (isBlocked) {
        await services.messaging.unblockUser(currentUser.id, seller.id);
        setIsBlocked(false);
        toast.success(`${displayName} a été débloqué.`);
      } else {
        await services.messaging.blockUser(currentUser.id, seller.id);
        setIsBlocked(true);
        toast.warning(
          `${displayName} a été bloqué. Ses messages et offres seront masqués.`,
        );
      }
      setIsMenuOpen(false);
    } catch {
      toast.error("Cette préférence n’a pas pu être enregistrée.");
    }
  };

  return (
    <div className="bg-bg-surface rounded-3xl border border-border-disabled/60 overflow-hidden shadow-sm relative">
      {/* Cover Header for Pro or decorative header for Individual */}
      {isPro ? (
        <div className="relative h-48 sm:h-64 w-full bg-gradient-to-r from-surface-inverse via-surface-inverse-hover to-rating-inverse-deep overflow-hidden">
          <div className="w-full h-full flex items-center justify-center opacity-30">
            <Building2 className="w-24 h-24 text-text-inverse" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-surface-overlay-deep/60 via-transparent to-surface-overlay-deep/10" />

          <div className="absolute top-4 right-4 flex items-center gap-2 flex-wrap">
            <ProBadge
              size="md"
              label={t("ui.identityStatus.pro.short")}
              accessibilityLabel={t("ui.identityStatus.pro.store")}
            />
          </div>
        </div>
      ) : (
        <div className="h-28 sm:h-36 bg-gradient-to-r from-surface-soft via-surface-muted to-surface-disabled border-b border-border-disabled/60 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider bg-bg-surface/80 px-3 py-1.5 rounded-full border border-border-disabled/60 shadow-sm backdrop-blur-xs">
              Profil Particulier
            </span>
          </div>
        </div>
      )}

      {/* Main Profile Info Section */}
      {/* Only the avatar reaches up into the cover. The identity block always
          sits on the white surface, at every width.

          The whole row used to carry the lift, which put the store name over a
          near-black gradient while it was still `text-text-main` — 40px of its
          50px height at 390px, so on a phone the shop's own name was the least
          readable thing on its page, with the Pro / Vérifié badges cut by the
          boundary underneath it. Scoping the lift by breakpoint only moved the
          collision to whichever width left the identity block taller than the
          lift (768px, then 1024px). One rule removes the class of bug: the
          overlap is the avatar's alone. */}
      <div className="p-6 sm:p-8 relative">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-8">
          {/* Avatar & Main Identity */}
          <div className="flex items-start gap-5 w-full md:w-auto">
            <div className="relative shrink-0 -mt-16 sm:-mt-20">
              <Avatar
                src={seller.avatarUrl}
                name={displayName}
                size="2xl"
                isVerified={seller.isVerified}
                className="ring-4 ring-border-on-inverse shadow-md"
              />
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-main leading-tight">
                  {displayName}
                </h1>
                {isPro ? (
                  <ProBadge
                    size="xs"
                    label={t("ui.identityStatus.pro.short")}
                    accessibilityLabel={t("ui.identityStatus.pro.account")}
                  />
                ) : (
                  <span className="text-xs font-semibold text-text-tertiary bg-surface-muted px-2 py-1 rounded-full">
                    Particulier
                  </span>
                )}
                {showsVerifiedBadge(seller) && (
                  <VerificationBadge
                    label={t("ui.identityStatus.verification.generic")}
                    accessibilityLabel={t(
                      "ui.identityStatus.verification.profile",
                    )}
                  />
                )}
              </div>

              {/* Sub-header meta row */}
              <div className="mt-2 flex min-w-0 max-w-full items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap text-xs text-text-supporting sm:gap-3 sm:text-sm">
                {/* Rating trigger */}
                <button
                  type="button"
                  onClick={() => onTabChange("reviews")}
                  className="flex shrink-0 items-center gap-1.5 font-semibold text-text-main hover:text-primary transition-colors cursor-pointer group"
                  aria-label={`Note moyenne : ${seller.rating.toFixed(1)} sur 5 basée sur ${seller.reviewCount} avis`}
                >
                  <Star className="w-icon-md h-icon-md fill-rating-fill text-rating-fill group-hover:scale-110 transition-transform duration-normal" />
                  <span>{seller.rating.toFixed(1)}</span>
                  <span className="font-medium text-text-tertiary underline decoration-border-disabled group-hover:decoration-primary-border underline-offset-4">
                    ({seller.reviewCount} avis)
                  </span>
                </button>

                {seller.city ? (
                  <>
                    <span className="shrink-0 text-text-inverse-muted">•</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-text-supporting">
                      <MapPin className="h-icon-sm w-icon-sm shrink-0 text-text-inverse-subtle sm:h-4 sm:w-4" />
                      {seller.city}
                    </span>
                  </>
                ) : null}
                {memberYear ? (
                  <>
                    <span className="shrink-0 text-text-inverse-muted">•</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-text-tertiary">
                      <Calendar className="h-icon-sm w-icon-sm shrink-0 text-text-inverse-subtle sm:h-4 sm:w-4" />
                      <span className="sm:hidden">Depuis {memberYear}</span>
                      <span className="hidden sm:inline">
                        Membre depuis {memberYear}
                      </span>
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0">
            {isOwnProfile ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  to={isPro ? "/compte/pro/vitrine" : "/compte"}
                  variant="outline"
                  size="md"
                  fullWidth
                  leftIcon={<Edit3 className="w-icon-md h-icon-md" />}
                  className="flex-1 sm:flex-initial"
                >
                  Modifier mon profil
                </Button>
                <Button
                  to="/compte/annonces"
                  variant="secondary"
                  size="md"
                  fullWidth
                  leftIcon={<List className="w-icon-md h-icon-md" />}
                  className="flex-1 sm:flex-initial"
                >
                  {t("profile.sellerProfileHeader.gererMesAnnonces")}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* `min-w-0` is what makes `flex-1` able to shrink: a flex item
                    defaults to `min-width: auto`, so this button held its full
                    label width and pushed the share and overflow controls past
                    the row's right edge at 375px. The label truncates rather
                    than the row spilling. */}
                <Button
                  variant="primary"
                  size="md"
                  onClick={onContactClick}
                  leftIcon={<MessageSquare className="w-icon-md h-icon-md" />}
                  className="flex-1 sm:flex-initial min-w-0"
                >
                  {/* Short label on phones, full label from `sm`. Truncation
                      alone produced "Contacter la bo…", which reads as a broken
                      string rather than a shorter one — the row is too narrow
                      for the full label beside the share and overflow controls. */}
                  <span className="sm:hidden">Contacter</span>
                  <span className="hidden sm:inline truncate">
                    {isPro ? "Contacter la boutique" : "Contacter le vendeur"}
                  </span>
                </Button>

                <IconButton
                  variant="outline"
                  size="md"
                  onClick={handleShare}
                  ariaLabel={t("profile.sellerProfileHeader.partagerCeProfil")}
                  className="!h-control-touch !w-control-touch shrink-0"
                >
                  <Share2 className="w-icon-lg h-icon-lg" />
                </IconButton>

                {/* Overflow Menu */}
                <div className="relative">
                  <IconButton
                    variant="outline"
                    size="md"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    ariaLabel={t(
                      "profile.sellerProfileHeader.optionsSupplementaires",
                    )}
                    className="!h-control-touch !w-control-touch"
                  >
                    <MoreVertical className="w-icon-lg h-icon-lg" />
                  </IconButton>

                  {isMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 w-64 bg-bg-surface rounded-2xl shadow-xl border border-border-disabled/60 py-2 z-dropdown animate-in fade-in zoom-in-95 duration-fast"
                      onMouseLeave={() => setIsMenuOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={handleShare}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-text-emphasis hover:bg-surface-soft text-left"
                      >
                        <Share2 className="w-icon-md h-icon-md text-text-inverse-subtle" />
                        {t("profile.sellerProfileHeader.partagerCeProfil2")}
                      </button>
                      <div className="border-t border-border-soft my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenReportModal();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-warning hover:bg-warning-surface text-left"
                      >
                        <Flag className="w-icon-md h-icon-md text-warning" />
                        {t("profile.sellerProfileHeader.signalerCeProfil")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleBlockToggle()}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-danger hover:bg-danger-surface text-left"
                      >
                        <Ban className="w-icon-md h-icon-md text-danger" />
                        {isBlocked
                          ? "Débloquer cet utilisateur"
                          : "Bloquer cet utilisateur"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bio description */}
        {seller.bio && (
          <div className="border-t border-border-soft pt-5 mb-5 mt-2">
            <p className="text-sm text-text-supporting leading-relaxed max-w-4xl whitespace-pre-line font-medium">
              {seller.bio}
            </p>
          </div>
        )}

        {/* Fast Key Metrics Row */}
        <div
          className={`border-t border-border-soft grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-text-tertiary ${!seller.bio ? "mt-4 pt-5" : "pt-5"}`}
        >
          <div className="bg-surface-soft p-4 rounded-2xl border border-border-disabled/60 shadow-2xs">
            <span className="font-bold block text-text-main text-lg mb-0.5">
              {activeListingsCount}
            </span>
            <span className="text-xs">
              Annonce{activeListingsCount > 1 ? "s" : ""} en ligne
            </span>
          </div>

          <div className="bg-surface-soft p-4 rounded-2xl border border-border-disabled/60 shadow-2xs">
            <span className="font-bold block text-text-main text-lg mb-0.5">
              {seller.responseRatePercent}%
            </span>
            <span className="text-xs">
              {t("profile.sellerProfileHeader.tauxDeReponse")}
            </span>
          </div>

          {seller.responseTimeText ? (
            <div className="bg-surface-soft p-4 rounded-2xl border border-border-disabled/60 shadow-2xs">
              <span className="font-bold block text-text-main text-lg truncate mb-0.5">
                {seller.responseTimeText}
              </span>
              <span className="text-xs">
                {t("profile.sellerProfileHeader.delaiMoyen")}
              </span>
            </div>
          ) : null}

          <div className="bg-surface-soft p-4 rounded-2xl border border-border-disabled/60 shadow-2xs">
            <span className="font-bold block text-text-main text-lg mb-0.5">
              {seller.rating.toFixed(1)} / 5
            </span>
            <span className="text-xs">{seller.reviewCount} avis clients</span>
          </div>
        </div>
      </div>
    </div>
  );
};
