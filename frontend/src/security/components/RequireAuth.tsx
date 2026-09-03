import React from "react";
import { useLocation } from "react-router-dom";
import { Lock, ArrowRight, UserPlus } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { Button } from "../../design-system/primitives/Button";
import { useTranslation } from "../../i18n/I18nProvider";
import { routes } from "../../configuration/routes";

export interface RequireAuthProps {
  children: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { t } = useTranslation();
  const { isAuthenticated, isRestoring, currentUser } = useAuth();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  if (isRestoring) {
    return (
      <div
        className="max-w-xl mx-auto px-4 py-16 text-center text-sm text-stone-600"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        Vérification de votre session…
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-warning-surface border border-warning-border text-warning flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900 mb-2">
          Authentification requise
        </h1>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6 leading-relaxed">
          {t("security.requireAuth.cettePageEstReserveeAux")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            to={routes.auth.login(returnTo)}
            variant="primary"
            size="md"
            rightIcon={<ArrowRight className="w-icon-md h-icon-md" />}
            className="w-full sm:w-auto"
          >
            Se connecter
          </Button>
          <Button
            to={routes.auth.register(returnTo)}
            variant="outline"
            size="md"
            leftIcon={<UserPlus className="w-icon-md h-icon-md" />}
            className="w-full sm:w-auto"
          >
            {t("security.requireAuth.creerUnCompte")}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
