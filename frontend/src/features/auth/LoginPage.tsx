import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldAlert, KeyRound, CheckCircle2, User, Briefcase, Shield } from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { Button } from '../../design-system/primitives/Button';
import { PasswordField } from './components/PasswordField';
import { AuthLayout } from './components/AuthLayout';
import { routes } from '../../configuration/routes';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTranslation } from '../../i18n/I18nProvider';

// Safe redirect sanitization to prevent open redirect vulnerabilities
function getSafeRedirectUrl(target: string | null): string {
  if (!target) return routes.home();
  const trimmed = target.trim();
  // Must be a relative path starting with / and not starting with //
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  return routes.home();
}

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Connexion",
    description:
      "Connectez-vous à votre compte Shongre pour gérer vos annonces, vos favoris et vos messages.",
    canonicalPath: "/connexion",
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithMFA, switchDemoUser } = useAuth();
  const toast = useToast();

  const redirectUrl = getSafeRedirectUrl(searchParams.get('redirect') || searchParams.get('returnTo'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // MFA Challenge State
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [tempMfaToken, setTempMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (requiresMfa && tempMfaToken) {
        const result = await loginWithMFA(tempMfaToken, mfaCode);
        if (result.success) {
          toast.success('Authentification 2FA réussie. Bienvenue !');
          navigate(redirectUrl);
        } else {
          setErrorMessage(result.errorMessage || 'Code 2FA invalide.');
        }
      } else {
        const result = await login(email, password, { rememberMe });
        if (result.success) {
          toast.success('Connexion réussie ! Bienvenue sur Shongre.');
          navigate(redirectUrl);
        } else if (result.requiresMfa && result.tempMfaToken) {
          setRequiresMfa(true);
          setTempMfaToken(result.tempMfaToken);
          setErrorMessage(null);
        } else {
          setErrorMessage(result.errorMessage || 'Échec de la connexion.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur inattendue est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async (userKey: string, demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Shongre2026!');
    setIsLoading(true);
    try {
      await switchDemoUser(userKey);
      toast.success(`Connecté avec succès en tant que profil démo.`);
      navigate(redirectUrl);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={requiresMfa ? 'Validation 2FA' : 'Connexion à Shongre'}
      subtitle={
        requiresMfa
          ? 'Entrez le code de vérification à 6 chiffres ou un code de secours'
          : 'Accédez à votre espace sécurisé, vos annonces et votre messagerie'
      }
      footerLink={{
        text: 'Pas encore de compte ?',
        linkText: 'Créer un compte',
        to: '/inscription',
      }}
    >
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {requiresMfa ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              Code de sécurité 2FA ou Code de secours
            </label>
            <input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder={t('auth.loginPage.ex123456Ou84921049')}
              autoFocus
              required
              className="w-full px-4 py-3 text-center tracking-widest text-lg font-black bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white"
            />
            <p className="mt-1.5 text-micro text-stone-500 text-center">
              Pour le test : vous pouvez utiliser le code <code>123456</code>.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Valider et continuer
          </Button>

          <button
            type="button"
            onClick={() => {
              setRequiresMfa(false);
              setTempMfaToken(null);
            }}
            className="w-full text-center text-xs font-semibold text-stone-500 hover:text-stone-900 py-1"
          >
            ← Retour à l'écran de connexion
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-stone-800 mb-1.5">
              Adresse email <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.loginPage.votreEmailExempleFr')}
                required
                autoComplete="email"
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-sm font-semibold text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="block text-xs font-bold text-stone-800">
                Mot de passe <span className="text-primary">*</span>
              </label>
              <Link
                to="/mot-de-passe-oublie"
                className="text-xs font-bold text-primary hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <PasswordField
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
              // The label lives above, sharing its row with the reset link.
              label={null}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 min-h-6 text-xs font-medium text-stone-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-primary focus:ring-primary"
              />
              <span>{t('auth.loginPage.resterConnecteSurCetAppareil')}</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Se connecter
          </Button>
        </form>
      )}

      {/* Quick Demo Credentials Panel for Testers */}
      <div className="mt-7 pt-5 border-t border-stone-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-micro font-bold text-stone-600 uppercase tracking-wider">
            Connexion rapide Démo
          </span>
          <span className="text-micro font-medium text-stone-600">
            1-clic sans mot de passe
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => handleQuickDemoLogin('buyer_thomas', 'thomas.laurent@example.fr')}
            className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left transition-colors cursor-pointer group"
          >
            <div className="font-bold text-stone-900 group-hover:text-primary flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-info shrink-0" />
              <span>Thomas (Particulier)</span>
            </div>
            <div className="text-micro text-stone-600 truncate">{t('auth.loginPage.acheteurVendeur')}</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin('pro_atelier', 'contact@atelier-nordique.fr')}
            className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left transition-colors cursor-pointer group"
          >
            <div className="font-bold text-stone-900 group-hover:text-primary flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Atelier Nordique (Pro)</span>
            </div>
            <div className="text-micro text-stone-600 truncate">{t('auth.loginPage.siretVitrineVerifiee')}</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin('pro_pending_sophie', 'sophie.marchand@boutiquedeco.fr')}
            className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left transition-colors cursor-pointer group"
          >
            <div className="font-bold text-stone-900 group-hover:text-warning flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-warning shrink-0" />
              <span>Sophie (Pro en cours)</span>
            </div>
            <div className="text-micro text-stone-600 truncate">Dossier Kbis en examen</div>
          </button>

          <button
            type="button"
            onClick={() => handleQuickDemoLogin('admin_antoine', 'antoine.fabre@shongre.fr')}
            className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-left transition-colors cursor-pointer group"
          >
            <div className="font-bold text-stone-900 group-hover:text-success flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-success shrink-0" />
              <span>Antoine (Admin)</span>
            </div>
            <div className="text-micro text-stone-600 truncate">Administration globale</div>
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};
