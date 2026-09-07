import { useEffect, useRef, useState } from "react";
import { REVIEW_CONSTRAINTS } from "@shongre/contracts/reviews";
import { services } from "../../../api/client/service-registry";
import type { OrderReviewEligibility } from "../../../api/contracts/reviews.contract";
import { Button } from "../../../design-system/primitives/Button";
import {
  FormField,
  Select,
  Textarea,
} from "../../../design-system/primitives/FormField";
import { useTranslation } from "../../../i18n/I18nProvider";

/** Remounted by the parent whenever the order or signed-in account changes. */
export function TransactionReviewForm({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const [eligibility, setEligibility] = useState<OrderReviewEligibility | null>(
    null,
  );
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadError(false);
    setEligibility(null);
    services.reviews
      .getOrderEligibility(orderId)
      .then((result) => {
        if (active) setEligibility(result);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [orderId, attempt]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending.current || !eligibility?.eligible) return;
    pending.current = true;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const review = await services.reviews.submitReview({
        transactionId: orderId,
        rating: Number(rating),
        comment: comment.trim(),
      });
      if (mounted.current)
        setEligibility({ eligible: false, reason: "ALREADY_REVIEWED", review });
    } catch {
      // An interrupted response may already have committed; recheck before retrying.
      if (mounted.current) {
        setSubmitError(true);
        setAttempt((value) => value + 1);
      }
    } finally {
      pending.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }

  return (
    <section
      className="space-y-3 rounded-2xl border border-border-base p-4"
      aria-label={t("reviews.form.title")}
    >
      <h3 className="font-semibold text-text-main">
        {t("reviews.form.title")}
      </h3>
      {loadError ? (
        <div role="alert" className="space-y-2">
          <p>{t("reviews.form.loadError")}</p>
          <Button
            variant="outline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t("common.retry")}
          </Button>
        </div>
      ) : !eligibility ? (
        <p role="status">{t("reviews.form.loading")}</p>
      ) : eligibility.review ? (
        <div role="status" className="space-y-2">
          <p>{t("reviews.form.saved")}</p>
          <p>
            {t("reviews.form.score", { rating: eligibility.review.rating })}
          </p>
          <p className="whitespace-pre-line text-text-supporting">
            {eligibility.review.comment}
          </p>
        </div>
      ) : !eligibility.eligible ? (
        <p>{t("reviews.form.notCompleted")}</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-text-supporting">
            {t("reviews.form.description")}
          </p>
          {submitError && <p role="alert">{t("reviews.form.submitError")}</p>}
          <FormField label={t("reviews.form.rating")} required>
            <Select
              labelledByAncestor
              required
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              disabled={submitting}
            >
              <option value="" disabled>
                {t("reviews.form.chooseRating")}
              </option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={value}>
                  {t("reviews.form.score", { rating: value })}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label={t("reviews.form.comment")}
            hint={t("reviews.form.commentHint")}
            required
          >
            <Textarea
              required
              minLength={REVIEW_CONSTRAINTS.commentMinLength}
              maxLength={REVIEW_CONSTRAINTS.commentMaxLength}
              rows={4}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              disabled={submitting}
            />
          </FormField>
          <Button
            type="submit"
            variant="primary"
            disabled={
              submitting ||
              !rating ||
              comment.trim().length < REVIEW_CONSTRAINTS.commentMinLength
            }
          >
            {t(submitting ? "reviews.form.submitting" : "reviews.form.submit")}
          </Button>
        </form>
      )}
    </section>
  );
}
