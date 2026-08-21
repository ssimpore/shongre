import React, { useState, useMemo } from "react";
import {
  Star,
  CheckCircle2,
  MessageSquare,
  ShoppingBag,
  Calendar,
} from "lucide-react";
import { ReviewItem, UserProfile } from "../../../types";
import { Avatar } from "../../../design-system/primitives/Badge";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface SellerReviewsTabProps {
  seller: UserProfile;
  reviews: ReviewItem[];
}

export const SellerReviewsTab: React.FC<SellerReviewsTabProps> = ({
  seller,
  reviews,
}) => {
  const { t } = useTranslation();
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<
    number | null
  >(null);

  // Compute breakdown statistics
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        average: seller.rating || 5.0,
        total: 0,
        distribution: [
          { star: 5, count: 0, percentage: 0 },
          { star: 4, count: 0, percentage: 0 },
          { star: 3, count: 0, percentage: 0 },
          { star: 2, count: 0, percentage: 0 },
          { star: 1, count: 0, percentage: 0 },
        ],
      };
    }

    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    reviews.forEach((r) => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating)));
      counts[rounded] = (counts[rounded] || 0) + 1;
      sum += r.rating;
    });

    const average = sum / total;
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star] || 0,
      percentage: Math.round(((counts[star] || 0) / total) * 100),
    }));

    return { average, total, distribution };
  }, [reviews, seller.rating]);

  // Filtered reviews
  const displayedReviews = useMemo(() => {
    if (!selectedRatingFilter) return reviews;
    return reviews.filter((r) => Math.round(r.rating) === selectedRatingFilter);
  }, [reviews, selectedRatingFilter]);

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch {
      return "Récemment";
    }
  };

  return (
    <div className="space-y-6">
      {/* Review Summary Score Card */}
      <div className="bg-white rounded-2xl border border-border-base p-5 sm:p-7 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Main Average Score */}
          <div className="md:col-span-4 text-center md:text-left md:border-r md:border-border-subtle md:pr-6">
            <div className="text-4xl sm:text-5xl font-black text-stone-900 leading-none mb-2">
              {stats.average.toFixed(1)}
              <span className="text-xl sm:text-2xl font-bold text-stone-500">
                /5
              </span>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(stats.average)
                      ? "fill-amber-400 text-amber-400"
                      : "text-stone-300"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              Basé sur {stats.total} avis vérifié{stats.total > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {t("profile.sellerReviewsTab.avisCertifiesSuiteAUne")}
            </p>
          </div>

          {/* Breakdown Rating Progress Bars */}
          <div className="md:col-span-8 space-y-2">
            {stats.distribution.map((item) => (
              <button
                key={item.star}
                type="button"
                onClick={() =>
                  setSelectedRatingFilter(
                    selectedRatingFilter === item.star ? null : item.star,
                  )
                }
                className={`w-full flex items-center gap-3 text-xs py-1 px-2 rounded-lg transition-colors cursor-pointer text-left ${
                  selectedRatingFilter === item.star
                    ? "bg-warning-surface font-bold"
                    : "hover:bg-bg-base"
                }`}
              >
                <span className="flex items-center gap-1 w-12 shrink-0 font-medium text-stone-700">
                  {item.star}{" "}
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </span>

                <div className="flex-1 h-2.5 bg-border-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-normal"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>

                <span className="w-12 text-right shrink-0 text-stone-500 text-xs">
                  {item.count} ({item.percentage}%)
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Review List Filter Notification if Active */}
      {selectedRatingFilter && (
        <div className="flex items-center justify-between bg-warning-surface border border-warning-border px-4 py-2.5 rounded-xl text-xs text-warning">
          <span>
            {t("profile.sellerReviewsTab.affichageDesAvisAvecLa")}
            <strong>{selectedRatingFilter} étoile(s)</strong> (
            {displayedReviews.length})
          </span>
          <button
            type="button"
            onClick={() => setSelectedRatingFilter(null)}
            className="font-bold underline text-warning hover:text-warning"
          >
            {t("profile.sellerReviewsTab.afficherTousLesAvis")}
          </button>
        </div>
      )}

      {/* Reviews List */}
      {displayedReviews.length > 0 ? (
        <div className="space-y-3">
          {displayedReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl border border-border-base p-5 shadow-xs transition-colors hover:border-stone-300"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={rev.authorAvatarUrl}
                    name={rev.authorName}
                    size="md"
                    className="shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-stone-900">
                        {rev.authorName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success-surface px-2 py-1 rounded-full border border-success-border">
                        <CheckCircle2 className="w-3 h-3" />
                        {t("profile.sellerReviewsTab.achatVerifie")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-500">
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-stone-300"
                            }`}
                          />
                        ))}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-xs">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {formatDate(rev.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {rev.listingTitle && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500 bg-bg-base px-3 py-1.5 rounded-xl border border-border-base max-w-[240px] truncate">
                    <ShoppingBag className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{rev.listingTitle}</span>
                  </div>
                )}
              </div>

              {/* Review content */}
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line pl-1">
                {rev.comment}
              </p>

              {rev.listingTitle && (
                <div className="sm:hidden mt-3 pt-2 border-t border-border-subtle flex items-center gap-1.5 text-xs text-stone-500">
                  <ShoppingBag className="w-3 h-3 text-stone-400 shrink-0" />
                  <span className="truncate">Article : {rev.listingTitle}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-base p-10 text-center">
          <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-stone-900 mb-1">
            {selectedRatingFilter
              ? `Aucun avis avec ${selectedRatingFilter} étoile(s)`
              : "Pas encore d'avis pour ce vendeur"}
          </h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {selectedRatingFilter
              ? "Essayez de réinitialiser le filtre de note pour afficher les autres avis."
              : "Les avis clients apparaîtront ici dès que les premières transactions sécurisées auront été conclues."}
          </p>
        </div>
      )}
    </div>
  );
};
