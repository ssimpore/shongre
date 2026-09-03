import { useTranslation } from "../../i18n/I18nProvider";
import type { ListingOnboardingLoadState } from "./useListingOnboardingController";

export function ListingOnboardingStatus({
  state,
  error,
  onRetry,
}: {
  state: ListingOnboardingLoadState;
  error?: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  if (state === "ready") return null;
  if (state === "loading") {
    return (
      <div
        role="status"
        className="rounded-control bg-bg-base p-4 text-xs text-text-muted"
      >
        {t("publishing.publishWizard.taxonomyLoading")}
      </div>
    );
  }
  if (state === "empty") {
    return (
      <div
        role="status"
        className="rounded-control bg-bg-base p-4 text-xs text-text-muted"
      >
        {t("publishing.publishWizard.taxonomyEmpty")}
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="rounded-control border border-danger-border bg-danger-surface p-4 text-xs text-danger"
    >
      <p>
        {error === "MARKET_UNAVAILABLE"
          ? t("publishing.publishWizard.marketUnavailable")
          : t("publishing.publishWizard.taxonomyError")}
      </p>
      <button
        type="button"
        className="mt-2 font-semibold underline"
        onClick={onRetry}
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
