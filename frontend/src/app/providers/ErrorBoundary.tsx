import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nProvider';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
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
  message?: string;
  onReload: () => void;
  onReset: () => void;
}> = ({ message, onReload, onReset }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border-base p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary mx-auto flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            {t('shell.errorBoundary.uneErreurInattendueEstSurvenue')}
          </h1>
          <p className="text-sm text-stone-600">
            {t('shell.errorBoundary.applicationARencontreUnProbleme')}
          </p>
        </div>

        {message && (
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-left text-xs font-mono text-stone-600 max-h-24 overflow-y-auto">
            {message}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onReload}
            className="flex-1 h-control-touch px-4 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('shell.errorBoundary.actualiserLaPage')}</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex-1 h-control-touch px-4 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4 text-primary" />
            <span>{t('shell.errorBoundary.retourAccueil')}</span>
          </button>
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
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          message={this.state.error?.message}
          onReload={this.handleReload}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

