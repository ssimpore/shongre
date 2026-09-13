import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { routes } from "../../configuration/routes";
import { resolveSafeReturn } from "../../security/safe-return";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import { AuthLayout } from "./components/AuthLayout";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";

export const VerifyEmailPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Vérification de l'adresse e-mail",
    description:
      "Confirmez votre adresse e-mail pour activer votre compte Shongre.",
    noIndex: true,
  });

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentUser, refreshUser } = useAuth();

  const returnTo = resolveSafeReturn(
    searchParams.get("redirect") || searchParams.get("returnTo"),
    routes.workspace.overview(),
  );
  const verifying = useRef(false);
  const lastAutoToken = useRef("");
  const [resending, setResending] = useState(false);
  const urlToken = searchParams.get("token") || "";

  const [tokenInput, setTokenInput] = useState(urlToken);
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >(urlToken ? "verifying" : "idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (urlToken && lastAutoToken.current !== urlToken) {
      lastAutoToken.current = urlToken;
      void handleVerify(urlToken);
    }
  }, [urlToken]);

  const handleVerify = async (tokenToVerify: string) => {
    if (verifying.current) return;
    verifying.current = true;
    setStatus("verifying");
    setErrorMessage(null);

    try {
      const verified = await services.auth.verifyEmail(tokenToVerify.trim());
      if (verified) {
        setStatus("success");
        await refreshUser();
        toast.success("Votre adresse email a été confirmée avec succès !");
      } else {
        setStatus("error");
        setErrorMessage("Ce lien de validation est invalide ou a expiré.");
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Erreur lors de la validation.");
    } finally {
      verifying.current = false;
    }
  };

  const handleResendVerification = async () => {
    if (!currentUser) {
      setErrorMessage(
        "Vous devez être connecté pour demander un nouveau lien de validation.",
      );
      return;
    }

    if (resending || verifying.current) return;
    setResending(true);
    setErrorMessage(null);
    setResendStatus(null);
    try {
      const res = await services.auth.resendEmailVerification(
        currentUser.email,
      );
      if (res.success)
        setResendStatus("Un nouvel email de confirmation vient d'être envoyé.");
      else setErrorMessage(res.message);
    } catch (cause) {
      setErrorMessage(
        cause instanceof Error
          ? cause.message
          : "Impossible de renvoyer le lien. Réessayez.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      width="compact"
      title={t("auth.verifyEmailPage.verificationDAdresseEmail")}
      subtitle={t("auth.verifyEmailPage.confirmezVotreAdresseEmailPour")}
      footerLink={{
        text: currentUser
          ? "Retourner à votre compte ?"
          : "Vous avez déjà un compte ?",
        linkText: currentUser ? "Mon tableau de bord" : "Se connecter",
        to: currentUser ? returnTo : routes.auth.login(returnTo),
      }}
    >
      {status === "success" ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-success-surface text-success mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-lg font-bold text-text-main">
            {t("auth.verifyEmailPage.emailValideAvecSucces")}
          </h2>
          <p className="text-xs text-text-supporting max-w-sm mx-auto leading-relaxed">
            {t("auth.verifyEmailPage.votreCompteEstDesormaisSecurise")}
          </p>

          <div className="pt-3">
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-full"
              onClick={() =>
                navigate(currentUser ? returnTo : routes.auth.login(returnTo))
              }
              rightIcon={<ArrowRight className="w-icon-md h-icon-md" />}
            >
              {t("auth.verifyEmailPage.accederAMonEspace")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2.5"
            >
              <AlertCircle className="w-icon-md h-icon-md text-danger shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {resendStatus && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-success-surface border border-success-border text-xs text-success flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-icon-md h-icon-md text-success" />
                <span>{resendStatus}</span>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-surface-soft border border-border-disabled text-xs text-text-emphasis flex items-start gap-3">
            <Mail className="w-icon-lg h-icon-lg text-primary shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Consultez la boîte de réception de votre adresse email{" "}
              {currentUser?.email && (
                <strong className="text-text-main">{currentUser.email}</strong>
              )}
              . Cliquez sur le lien reçu pour confirmer votre adresse. Vous
              pouvez aussi saisir votre code de confirmation ci-dessous.
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(tokenInput);
            }}
            className="space-y-3 pt-2"
          >
            <div>
              <label
                htmlFor="email-verification-code"
                className="block text-sm font-semibold text-text-strong mb-1.5"
              >
                {t("auth.verifyEmailPage.jetonDeValidationOuCode")}
              </label>
              <input
                type="text"
                id="email-verification-code"
                autoComplete="one-time-code"
                disabled={status === "verifying" || resending}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={t("auth.verifyEmailPage.collezIciVotreJetonDe")}
                required
                className="w-full px-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-mono text-text-main focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-ring h-control-touch"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              isLoading={status === "verifying"}
              disabled={resending}
            >
              Valider mon adresse email
            </Button>
          </form>

          {currentUser && (
            <div className="pt-2 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleResendVerification()}
                isLoading={resending}
                disabled={status === "verifying"}
                leftIcon={<RefreshCw className="w-icon-sm h-icon-sm" />}
              >
                <span>
                  {t("auth.verifyEmailPage.renvoyerUnEmailDeValidation")}
                </span>
              </Button>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  );
};
