import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { Button } from "../../design-system/primitives/Button";
import { telemetryService } from "../../services/telemetry.service";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * The fallback, as a function component.
 *
 * The boundary itself has to stay a class — `componentDidCatch` has no hook
 * equivalent — but hooks are illegal inside it, so its UI cannot call
 * `useTranslation`. Splitting the presentation out is the standard way round
 * that, and it keeps the fallback translatable like every other surface.
 */
const ErrorFallback: React.FC<{
  onReload: () => void;
  onReset: () => void;
}> = ({ onReload, onReset }) => {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="min-h-screen bg-bg-base flex items-center justify-center p-4"
    >
      <div className="max-w-md w-full bg-white rounded-2xl border border-border-base p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary mx-auto flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-text-main">
            {t("shell.errorBoundary.uneErreurInattendueEstSurvenue")}
          </h1>
          <p className="text-sm text-text-secondary">
            {t("shell.errorBoundary.applicationARencontreUnProbleme")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            onClick={onReload}
            variant="primary"
            size="md"
            fullWidth
            leftIcon={
              <RefreshCw className="h-icon-md w-icon-md" aria-hidden="true" />
            }
          >
            {t("shell.errorBoundary.actualiserLaPage")}
          </Button>

          <Button
            onClick={onReset}
            variant="outline"
            size="md"
            fullWidth
            leftIcon={
              <Home
                className="h-icon-md w-icon-md text-primary"
                aria-hidden="true"
              />
            }
          >
            {t("shell.errorBoundary.retourAccueil")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    telemetryService.captureException(
      { error, errorInfo },
      "react-error-boundary",
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.href = "/";
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          onReload={this.handleReload}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
