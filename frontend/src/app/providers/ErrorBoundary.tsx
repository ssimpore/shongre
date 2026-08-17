import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

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
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-border-base p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-primary-light text-primary mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">
                Une erreur inattendue est survenue
              </h1>
              <p className="text-sm text-stone-600">
                L'application a rencontré un problème temporaire d'affichage.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-left text-xs font-mono text-stone-600 max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 h-11 px-4 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualiser la page</span>
              </button>
              
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 h-11 px-4 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4 text-primary" />
                <span>Retour accueil</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

