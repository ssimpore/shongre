import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Star, Clock, MapPin, ChevronRight } from "lucide-react";
import { UserProfile, ReviewItem } from "../../../types";
import { Avatar, Badge } from "../../../design-system/primitives/Badge";
import {
  isProSeller,
  showsVerifiedBadge,
} from "../../../domains/user/user.domain";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface ListingSellerTrustSectionProps {
  seller: UserProfile;
  reviews?: ReviewItem[];
  className?: string;
}

export const ListingSellerTrustSection: React.FC<
  ListingSellerTrustSectionProps
> = ({ seller, reviews = [], className = "" }) => {
  const { t } = useTranslation();
  const isPro = isProSeller(seller);
  const profileUrl =
    isPro && seller.storeSlug
      ? `/boutique/${seller.storeSlug}`
      : `/profil/${seller.slug || seller.id}`;

  return (
    <div
      className={`bg-white rounded-3xl border border-stone-200/60 p-6 sm:p-8 space-y-5 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <h2 className="text-base font-black text-stone-900">
          {t("listings.listingSellerTrustSection.aProposDuVendeur")}
        </h2>
        <Link
          to={profileUrl}
          className="flex min-h-6 items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary-hover hover:underline"
        >
          <span>{isPro ? "Voir la boutique" : "Voir le profil"}</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Main Seller Identity Card */}
      <div className="flex items-start gap-4">
        <Link to={profileUrl} className="shrink-0 group">
          <Avatar
            src={seller.avatarUrl}
            name={seller.name}
            size="lg"
            isVerified={seller.isVerified}
            isPro={isPro}
            className="group-hover:ring-2 group-hover:ring-primary transition-all"
          />
        </Link>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={profileUrl}
              className="inline-flex min-h-6 max-w-full items-center truncate text-base font-bold text-stone-900 transition-colors hover:text-primary"
            >
              {seller.companyName || seller.name}
            </Link>
            {isPro && (
              <Badge variant="pro" size="sm">
                {t("listings.listingSellerTrustSection.vendeurPro")}
              </Badge>
            )}
            {showsVerifiedBadge(seller) && (
              <Badge variant="verified" size="sm" icon>
                {t("listings.listingSellerTrustSection.verifie")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-600 flex-wrap">
            <Link
              to={`${profileUrl}?tab=reviews`}
              className="flex min-h-6 items-center gap-1 font-bold text-stone-900 hover:text-primary"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{seller.rating ? seller.rating.toFixed(1) : "5.0"}</span>
              <span className="font-normal text-stone-500">
                ({seller.reviewCount || 0} avis)
              </span>
            </Link>
            <span>•</span>
            <span className="flex items-center gap-1 text-stone-500">
              <MapPin className="w-3 h-3 text-stone-400" />
              {seller.city} ({seller.postalCode})
            </span>
          </div>

          {seller.bio && (
            <p className="text-xs text-stone-600 pt-1 line-clamp-2 leading-relaxed">
              {seller.bio}
            </p>
          )}
        </div>
      </div>

      {/* Trust & Response metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs text-stone-600 pt-2 border-t border-border-subtle">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span className="truncate">
            Répond {seller.responseTimeText || "en quelques heures"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />
          <span className="truncate">
            Taux de réponse : {seller.responseRatePercent ?? 100}%
          </span>
        </div>
      </div>

      {/* Recent Reviews Preview (if any) */}
      {reviews.length > 0 && (
        <div className="pt-3 border-t border-border-subtle space-y-2.5">
          <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            Derniers avis acheteurs
          </div>
          <div className="space-y-2">
            {reviews.slice(0, 2).map((rev) => (
              <div
                key={rev.id}
                className="p-2.5 bg-bg-base/60 rounded-xl border border-border-base text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">
                    {rev.authorName}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < rev.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-stone-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {rev.comment && (
                  <p className="text-stone-600 text-micro italic">
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
