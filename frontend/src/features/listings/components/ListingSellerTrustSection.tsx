import React from "react";
import { Link } from "react-router-dom";
import { ProBadge, VerificationBadge } from "@shongre/ui/web";
import { ShieldCheck, Star, Clock, MapPin, ChevronRight } from "lucide-react";
import { PublicSellerProfile, ReviewItem } from "../../../types";
import { Avatar } from "../../../design-system/primitives/Badge";
import { isProSeller } from "../../../domains/user/user.domain";
import { useTranslation } from "../../../i18n/I18nProvider";
import { routes } from "../../../configuration/routes";

export interface ListingSellerTrustSectionProps {
  seller: PublicSellerProfile;
  reviews?: ReviewItem[];
  className?: string;
}

export const ListingSellerTrustSection: React.FC<
  ListingSellerTrustSectionProps
> = ({ seller, reviews = [], className = "" }) => {
  const { locale, t } = useTranslation();
  const isPro = isProSeller(seller);
  const isVerified = seller.isVerified || seller.isBusinessVerified;
  const hasRating =
    Number.isFinite(seller.rating) &&
    seller.rating >= 0 &&
    seller.rating <= 5 &&
    Number.isFinite(seller.reviewCount) &&
    seller.reviewCount > 0;
  const formattedRating = hasRating
    ? new Intl.NumberFormat(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(seller.rating)
    : undefined;
  const formattedReviewCount = hasRating
    ? new Intl.NumberFormat(locale).format(seller.reviewCount)
    : undefined;
  const locationLabel = seller.city || seller.country;
  const responseTime = seller.responseTimeText?.trim();
  const hasResponseRate =
    Number.isFinite(seller.responseRatePercent) &&
    seller.responseRatePercent >= 0 &&
    seller.responseRatePercent <= 100;
  const profileUrl = routes.seller.publicPage({
    id: seller.id,
    slug: seller.slug,
    isProfessional: isPro,
  });

  return (
    <div
      className={`bg-bg-surface rounded-3xl border border-border-disabled/60 p-6 sm:p-8 space-y-5 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-soft">
        <h2 className="text-base font-bold text-text-main">
          {t("listings.listingSellerTrustSection.aProposDuVendeur")}
        </h2>
        <Link
          to={profileUrl}
          className="flex min-h-6 items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary-hover hover:underline"
        >
          <span>
            {t(
              isPro
                ? "listings.listingSellerTrustSection.viewStore"
                : "listings.listingSellerTrustSection.viewProfile",
            )}
          </span>
          <ChevronRight className="w-icon-md h-icon-md" />
        </Link>
      </div>

      {/* Main Seller Identity Card */}
      <div className="flex items-start gap-4">
        <Link to={profileUrl} className="shrink-0 group">
          <Avatar
            src={seller.avatarUrl}
            name={seller.name}
            size="lg"
            isVerified={isVerified}
            className="group-hover:ring-2 group-hover:ring-primary transition-all"
          />
        </Link>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={profileUrl}
              className="inline-flex min-h-6 max-w-full items-center truncate text-base font-bold text-text-main transition-colors hover:text-primary"
            >
              {seller.name}
            </Link>
            {isPro && (
              <ProBadge
                label={t("ui.identityStatus.pro.short")}
                accessibilityLabel={t("ui.identityStatus.pro.seller")}
              />
            )}
            {isVerified && (
              <VerificationBadge
                label={t("ui.identityStatus.verification.generic")}
                accessibilityLabel={t("ui.identityStatus.verification.profile")}
              />
            )}
          </div>

          {hasRating || locationLabel ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-supporting">
              {hasRating ? (
                <Link
                  to={`${profileUrl}?tab=reviews`}
                  aria-label={t("ui.listingCard.noteAvis", {
                    rating: formattedRating,
                  }).replace("{count}", formattedReviewCount!)}
                  className="flex min-h-6 items-center gap-1 font-bold text-text-main hover:text-primary"
                >
                  <Star className="w-icon-sm h-icon-sm fill-rating-fill text-rating-fill" />
                  <span>{formattedRating}</span>
                  <span className="font-normal text-text-tertiary">
                    {t("listings.listingSellerTrustSection.reviews").replace(
                      "{count}",
                      formattedReviewCount!,
                    )}
                  </span>
                </Link>
              ) : null}
              {hasRating && locationLabel ? (
                <span aria-hidden="true">•</span>
              ) : null}
              {locationLabel ? (
                <span className="flex items-center gap-1 text-text-tertiary">
                  <MapPin className="w-icon-xs h-icon-xs text-text-inverse-subtle" />
                  {locationLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          {seller.bio && (
            <p className="text-xs text-text-supporting pt-1 line-clamp-2 leading-relaxed">
              {seller.bio}
            </p>
          )}
        </div>
      </div>

      {/* Trust & Response metrics */}
      {responseTime || hasResponseRate ? (
        <div className="grid grid-cols-1 gap-2 border-t border-border-subtle pt-2 text-xs text-text-supporting sm:grid-cols-2">
          {responseTime ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <Clock className="w-icon-sm h-icon-sm shrink-0 text-text-inverse-subtle" />
              <span className="truncate">
                {t("listings.listingSellerTrustSection.responds", {
                  responseTime,
                })}
              </span>
            </div>
          ) : null}
          {hasResponseRate ? (
            <div className="flex min-w-0 items-center gap-1.5">
              <ShieldCheck className="w-icon-sm h-icon-sm shrink-0 text-success" />
              <span className="truncate">
                {t("listings.listingSellerTrustSection.responseRate", {
                  rate: new Intl.NumberFormat(locale).format(
                    seller.responseRatePercent,
                  ),
                })}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Recent Reviews Preview (if any) */}
      {reviews.length > 0 && (
        <div className="pt-3 border-t border-border-subtle space-y-2.5">
          <div className="text-xs font-bold text-text-emphasis uppercase tracking-wider">
            {t("listings.listingSellerTrustSection.recentBuyerReviews")}
          </div>
          <div className="space-y-2">
            {reviews.slice(0, 2).map((rev) => (
              <div
                key={rev.id}
                className="p-2.5 bg-bg-base/60 rounded-xl border border-border-base text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text-strong">
                    {rev.authorName}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-icon-xs h-icon-xs ${
                          i < rev.rating
                            ? "fill-rating-fill text-rating-fill"
                            : "text-text-inverse-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {rev.comment && (
                  <p className="text-text-supporting text-micro italic">
                    « {rev.comment} »
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
