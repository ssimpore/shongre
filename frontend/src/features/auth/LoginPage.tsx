import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, ArrowRight, ShieldAlert } from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import { PasswordField } from "./components/PasswordField";
import { AuthLayout } from "./components/AuthLayout";
import { routes } from "../../configuration/routes";
import { usePageMeta } from "../../hooks/usePageMeta";
import { hasEffectiveCapability } from "@shongre/contracts/access-control";
import { useTranslation } from "../../i18n/I18nProvider";
import { SocialLoginButtons } from "./components/SocialLoginButtons";
import { resolveSafeReturn } from "../../security/safe-return";

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
  const { login, loginWithMFA } = useAuth();
  const toast = useToast();

  const redirectUrl = resolveSafeReturn(
    searchParams.get("redirect") || searchParams.get("returnTo"),
    routes.home(),
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // MFA Challenge State
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [tempMfaToken, setTempMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (requiresMfa && tempMfaToken) {
        const result = await loginWithMFA(tempMfaToken, mfaCode);
        if (result.success) {
          toast.success("Authentification 2FA réussie. Bienvenue !");
          navigate(
            hasEffectiveCapability(result.user, "staff.internal.access")
              ? "/admin"
              : redirectUrl,
          );
        } else {
          setErrorMessage(result.errorMessage || "Code 2FA invalide.");
        }
      } else {
        const result = await login(email, password, { rememberMe });
        if (result.success) {
          toast.success("Connexion réussie ! Bienvenue sur Shongre.");
          navigate(
            hasEffectiveCapability(result.user, "staff.internal.access")
              ? "/securite-interne"
              : redirectUrl,
          );
        } else if (result.requiresMfa && result.tempMfaToken) {
          setRequiresMfa(true);
          setTempMfaToken(result.tempMfaToken);
          setErrorMessage(null);
        } else {
          setErrorMessage(result.errorMessage || "Échec de la connexion.");
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={requiresMfa ? "Validation 2FA" : "Connexion à Shongre"}
      subtitle={
        requiresMfa
          ? "Entrez le code de vérification à 6 chiffres ou un code de secours"
          : "Accédez à votre espace sécurisé, vos annonces et votre messagerie"
      }
      footerLink={{
        text: "Pas encore de compte ?",
        linkText: "Créer un compte",
        to: routes.auth.register(redirectUrl),
      }}
    >
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2.5">
          <ShieldAlert className="w-icon-md h-icon-md text-danger shrink-0 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {requiresMfa ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-strong mb-1.5">
              {t("auth.loginPage.codeDeSecurite2faOu")}
            </label>
            <input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder={t("auth.loginPage.ex123456Ou84921049")}
              autoFocus
              required
              className="w-full px-4 py-3 text-center tracking-widest text-lg font-bold bg-surface-soft border border-border-prominent rounded-control text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-ring focus:bg-bg-surface h-control-touch"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-icon-md h-icon-md" />}
          >
            {t("auth.loginPage.validerEtContinuer")}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setRequiresMfa(false);
              setTempMfaToken(null);
            }}
            className="w-full text-text-tertiary"
          >
            {t("auth.loginPage.retourALEcranDe")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-text-strong mb-1.5"
            >
              Adresse email <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.loginPage.votreEmailExempleFr")}
                required
                autoComplete="email"
                className="w-full pl-9 pr-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-ring h-control-touch"
              />
              <Mail className="w-icon-md h-icon-md text-text-inverse-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-text-strong"
              >
                {t("auth.loginPage.motDePasse")}
                <span className="text-primary">*</span>
              </label>
              <Link
                to="/mot-de-passe-oublie"
                className="text-xs font-bold text-primary hover:underline"
              >
                {t("auth.loginPage.motDePasseOublie")}
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
            <label className="flex items-center gap-2 min-h-6 text-xs font-medium text-text-emphasis cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border-prominent text-primary focus:ring-primary"
              />
              <span>{t("auth.loginPage.resterConnecteSurCetAppareil")}</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-icon-md h-icon-md" />}
          >
            Se connecter
          </Button>
        </form>
      )}

      {!requiresMfa ? <SocialLoginButtons returnTo={redirectUrl} /> : null}
    </AuthLayout>
  );
};
