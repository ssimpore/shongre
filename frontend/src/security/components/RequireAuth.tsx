import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, ArrowRight, UserPlus } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { Button } from '../../design-system/primitives/Button';

export interface RequireAuthProps {
  children: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-stone-900 mb-2">Authentification requise</h1>
        <p className="text-sm text-stone-600 max-w-md mx-auto mb-6 leading-relaxed">
          Cette page est réservée aux membres inscrits sur Shongre. Connectez-vous ou créez un compte gratuitement en 1 minute.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to={`/connexion?redirect=${encodeURIComponent(location.pathname)}`} className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Se connecter
            </Button>
          </Link>
          <Link to="/inscription" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full" leftIcon={<UserPlus className="w-4 h-4" />}>
              Créer un compte
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
