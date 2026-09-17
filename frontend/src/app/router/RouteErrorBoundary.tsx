import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from "react-router-dom";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "../../design-system/primitives/Button";
import { useTranslation } from "../../i18n/I18nProvider";
import { telemetryService } from "../../services/telemetry.service";

/**
 * Per-branch recovery UI for the router.
 *
 * The application has one React error boundary, mounted at the very root, and
 * the router declared no `errorElement` at all — so a render error anywhere in
 * any of ~187 routes replaced the whole product with a full-screen reload card.
 * On a marketplace that is the difference between "the reviews module failed"
 * and "the listing you were about to buy disappeared".
 *
 * Attached per layout branch, an error here unmounts only that branch: the
 * providers, session and router survive, so "go back" is a real recovery rather
 * than a full reload.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // A 404 thrown by a loader is routing, not a crash, and is reported elsewhere.
  if (!isRouteErrorResponse(error)) {
    telemetryService.captureException({ error }, "react-router-error-element");
  }

  return (
    <div
      role="alert"
      className="mx-auto flex min-h-80 w-full max-w-md flex-col items-center justify-center gap-5 px-4 py-16 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-text-main sm:text-2xl">
          {t("shell.errorBoundary.uneErreurInattendueEstSurvenue")}
        </h1>
        <p className="text-sm text-text-secondary">
          {t("shell.errorBoundary.applicationARencontreUnProbleme")}
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => navigate(0)}
          leftIcon={
            <RefreshCw className="h-icon-md w-icon-md" aria-hidden="true" />
          }
        >
          {t("shell.errorBoundary.actualiserLaPage")}
        </Button>
        <Button
          variant="outline"
          size="md"
          fullWidth
          onClick={() => navigate(-1)}
          leftIcon={
            <ArrowLeft className="h-icon-md w-icon-md" aria-hidden="true" />
          }
        >
          {t("common.back")}
        </Button>
      </div>
    </div>
  );
}
