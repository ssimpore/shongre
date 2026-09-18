import React, { useState, useMemo } from "react";
import {
  Star,
  MessageSquare,
  ShoppingBag,
  Calendar,
  ThumbsUp,
  CornerDownRight,
} from "lucide-react";
import { VerificationBadge } from "@shongre/ui/web";
import { ReviewItem } from "../../../types";
import { Avatar } from "../../../design-system/primitives/Badge";
import { Button } from "../../../design-system/primitives/Button";
import { ProgressBar } from "../../../design-system/primitives/ProgressBar";
import { useTranslation } from "../../../i18n/I18nProvider";
import { useRegionalFormatters } from "../../../hooks/useRegionalFormatters";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../../../design-system/utils/controlMetrics";

export interface SellerReviewsTabProps {
  reviews: ReviewItem[];
  onReport: (review: ReviewItem) => void;
  /** The signed-in reader, when there is one. */
  viewerId?: string;
  /** Present when the viewer is the person these reviews are about. */
  onReply?: (review: ReviewItem, comment: string) => Promise<void>;
  /** Present when a signed-in reader may vote; guests are sent to sign in. */
  onMarkHelpful?: (review: ReviewItem, helpful: boolean) => Promise<void>;
}

const REPLY_MIN_LENGTH = 10;
const REPLY_MAX_LENGTH = 2000;

export const SellerReviewsTab: React.FC<SellerReviewsTabProps> = ({
  reviews,
  onReport,
  viewerId,
  onReply,
  onMarkHelpful,
}) => {
  const { t } = useTranslation();
  const { formatDate: formatRegionalDate } = useRegionalFormatters();
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<
    number | null
  >(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [votingOn, setVotingOn] = useState<string | null>(null);

  const startReply = (review: ReviewItem) => {
    setReplyingTo(review.id);
    setReplyDraft(review.reply?.comment ?? "");
    setReplyError(null);
  };
  const submitReply = async (review: ReviewItem) => {
    if (!onReply) return;
    const comment = replyDraft.trim();
    if (
      comment.length < REPLY_MIN_LENGTH ||
      comment.length > REPLY_MAX_LENGTH
    ) {
      setReplyError(t("reviews.reply.lengthError"));
      return;
    }
    setReplySubmitting(true);
    setReplyError(null);
    try {
      await onReply(review, comment);
      setReplyingTo(null);
      setReplyDraft("");
    } catch {
      setReplyError(t("reviews.reply.submitError"));
    } finally {
      setReplySubmitting(false);
    }
  };
  const toggleHelpful = async (review: ReviewItem) => {
    if (!onMarkHelpful || votingOn) return;
    setVotingOn(review.id);
    try {
      await onMarkHelpful(review, !review.viewerMarkedHelpful);
    } finally {
      setVotingOn(null);
    }
  };

  // Compute breakdown statistics
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        average: 0,
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
  }, [reviews]);

  // Filtered reviews
  const displayedReviews = useMemo(() => {
    if (!selectedRatingFilter) return reviews;
    return reviews.filter((r) => Math.round(r.rating) === selectedRatingFilter);
  }, [reviews, selectedRatingFilter]);

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      return formatRegionalDate(isoString, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return t("reviews.dateUnavailable");
    }
  };

  return (
    <div className="space-y-6">
      {/* Review Summary Score Card */}
      <div className="bg-bg-surface rounded-2xl border border-border-base p-5 sm:p-7 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Main Average Score */}
          <div className="md:col-span-4 text-center md:text-left md:border-r md:border-border-subtle md:pr-6">
            <div className="text-4xl sm:text-5xl font-bold text-text-main leading-none mb-2">
              {stats.total ? stats.average.toFixed(1) : "—"}
              <span className="text-xl sm:text-2xl font-bold text-text-tertiary">
                /5
              </span>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-icon-lg h-icon-lg ${
                    star <= Math.round(stats.average)
                      ? "fill-rating-fill text-rating-fill"
                      : "text-text-inverse-muted"
                  }`}
                />
              ))}
            </div>

            <p className="text-xs sm:text-sm text-text-supporting font-medium">
              {t("reviews.summary", { count: stats.total })}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              {t("reviews.verificationExplanation")}
            </p>
          </div>

          {/* Breakdown Rating Progress Bars */}
          <div className="md:col-span-8 space-y-2">
            {stats.distribution.map((item) => (
              <button
                key={item.star}
                type="button"
                aria-pressed={selectedRatingFilter === item.star}
                aria-label={t("reviews.form.score", { rating: item.star })}
                onClick={() =>
                  setSelectedRatingFilter(
                    selectedRatingFilter === item.star ? null : item.star,
                  )
                }
                className={`w-full flex items-center gap-3 text-xs py-1 px-2 rounded-lg transition-colors cursor-pointer text-left ${
                  selectedRatingFilter === item.star
                    ? "bg-warning-surface font-semibold"
                    : "hover:bg-bg-base"
                }`}
              >
                <span className="flex items-center gap-1 w-12 shrink-0 font-medium text-text-emphasis">
                  {item.star}{" "}
                  <Star className="w-icon-sm h-icon-sm fill-rating-fill text-rating-fill" />
                </span>

                <ProgressBar
                  value={item.percentage}
                  label={t("reviews.ratingBreakdown", {
                    percentage: item.percentage,
                    rating: item.star,
                  })}
                  variant="warning"
                  className="flex-1"
                />

                <span className="w-12 text-right shrink-0 text-text-tertiary text-xs">
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
            {t("reviews.filtered", {
              rating: selectedRatingFilter,
              count: displayedReviews.length,
            })}
          </span>
          <button
            type="button"
            onClick={() => setSelectedRatingFilter(null)}
            className="font-semibold underline text-warning hover:text-warning"
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
              data-review-item={rev.id}
              className="bg-bg-surface rounded-2xl border border-border-base p-5 shadow-xs transition-colors hover:border-border-prominent"
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
                      <span className="text-xs sm:text-sm font-bold text-text-main">
                        {rev.authorName}
                      </span>
                      {rev.verifiedTransaction && (
                        <VerificationBadge
                          size="xs"
                          label={t("reviews.verified")}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-text-tertiary">
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-icon-sm h-icon-sm ${
                              star <= rev.rating
                                ? "fill-rating-fill text-rating-fill"
                                : "text-text-inverse-muted"
                            }`}
                          />
                        ))}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-xs">
                        <Calendar className="w-icon-xs h-icon-xs text-text-inverse-subtle" />
                        {formatDate(rev.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {rev.listingTitle && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-tertiary bg-bg-base px-3 py-1.5 rounded-xl border border-border-base max-w-60 truncate">
                    <ShoppingBag className="w-icon-sm h-icon-sm text-text-inverse-subtle shrink-0" />
                    <span className="truncate">{rev.listingTitle}</span>
                  </div>
                )}
              </div>

              {/* Review content */}
              <p className="text-xs sm:text-sm text-text-emphasis leading-relaxed whitespace-pre-line pl-1">
                {rev.comment}
              </p>

              {rev.reply && replyingTo !== rev.id && (
                <div
                  className="mt-3 ml-1 flex gap-2 rounded-xl border border-border-subtle bg-bg-base p-3"
                  data-review-reply={rev.id}
                >
                  <CornerDownRight className="w-icon-sm h-icon-sm shrink-0 text-text-inverse-subtle mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-main">
                      {t("reviews.reply.heading")}
                      <span className="ml-1.5 font-normal text-text-tertiary">
                        {formatDate(rev.reply.updatedAt)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-text-emphasis leading-relaxed whitespace-pre-line">
                      {rev.reply.comment}
                    </p>
                  </div>
                </div>
              )}

              {onReply && replyingTo === rev.id && (
                <form
                  className="mt-3 ml-1 space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitReply(rev);
                  }}
                >
                  <label
                    htmlFor={`review-reply-${rev.id}`}
                    className="block text-xs font-semibold text-text-main"
                  >
                    {t("reviews.reply.label")}
                  </label>
                  <textarea
                    id={`review-reply-${rev.id}`}
                    value={replyDraft}
                    onChange={(event) => setReplyDraft(event.target.value)}
                    maxLength={REPLY_MAX_LENGTH}
                    rows={3}
                    aria-describedby={`review-reply-${rev.id}-hint`}
                    aria-invalid={replyError ? true : undefined}
                    className="w-full p-3 bg-bg-base border border-border-base rounded-control text-xs text-text-main focus:bg-bg-surface focus:outline-hidden focus:border-primary min-h-control-touch"
                  />
                  <p
                    id={`review-reply-${rev.id}-hint`}
                    className="text-micro text-text-tertiary"
                  >
                    {t("reviews.reply.hint")}
                  </p>
                  {replyError && (
                    <p role="alert" className="text-xs text-danger">
                      {replyError}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Button type="submit" size="sm" isLoading={replySubmitting}>
                      {t("reviews.reply.submit")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setReplyingTo(null)}
                      disabled={replySubmitting}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </form>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-1">
                <button
                  type="button"
                  aria-pressed={rev.viewerMarkedHelpful === true}
                  disabled={
                    votingOn === rev.id ||
                    (viewerId !== undefined &&
                      (viewerId === rev.authorId ||
                        viewerId === rev.targetUserId))
                  }
                  onClick={() => void toggleHelpful(rev)}
                  className={`inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} ${
                    rev.viewerMarkedHelpful
                      ? "bg-primary-light text-text-main"
                      : "text-text-supporting hover:bg-bg-base"
                  }`}
                  data-review-helpful={rev.id}
                >
                  <ThumbsUp className="w-icon-sm h-icon-sm" aria-hidden />
                  <span>
                    {t("reviews.helpful.action")}
                    {rev.helpfulCount > 0 && (
                      <span className="ml-1 text-text-tertiary font-normal">
                        · {rev.helpfulCount}
                      </span>
                    )}
                  </span>
                </button>
                {onReply &&
                  viewerId === rev.targetUserId &&
                  replyingTo !== rev.id && (
                    <button
                      type="button"
                      className={`text-xs font-semibold text-primary underline underline-offset-2 rounded-control ${CONTROL_FOCUS_CLASS}`}
                      onClick={() => startReply(rev)}
                    >
                      {rev.reply
                        ? t("reviews.reply.edit")
                        : t("reviews.reply.start")}
                    </button>
                  )}
                {/* Reporting one's own review is meaningless and the API
                    refuses it; the author edits or lets moderation act on
                    someone else's report instead. */}
                {viewerId !== rev.authorId && (
                  <button
                    type="button"
                    className={`text-xs text-text-supporting underline rounded-control ${CONTROL_FOCUS_CLASS}`}
                    onClick={() => onReport(rev)}
                  >
                    {t("reviews.report")}
                  </button>
                )}
              </div>

              {rev.listingTitle && (
                <div className="sm:hidden mt-3 pt-2 border-t border-border-subtle flex items-center gap-1.5 text-xs text-text-tertiary">
                  <ShoppingBag className="w-icon-xs h-icon-xs text-text-inverse-subtle shrink-0" />
                  <span className="truncate">
                    {t("reviews.listing", { title: rev.listingTitle })}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-bg-surface rounded-2xl border border-border-base p-10 text-center">
          <MessageSquare className="w-12 h-12 text-text-inverse-muted mx-auto mb-3" />
          <h4 className="text-base font-bold text-text-main mb-1">
            {selectedRatingFilter
              ? t("reviews.noFiltered", { rating: selectedRatingFilter })
              : t("reviews.empty")}
          </h4>
          <p className="text-xs text-text-tertiary max-w-sm mx-auto">
            {selectedRatingFilter
              ? t("reviews.filterHint")
              : t("reviews.emptyHint")}
          </p>
        </div>
      )}
    </div>
  );
};
