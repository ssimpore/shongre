import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { routes } from "../../configuration/routes";
import { resolveSafeReturn } from "../../security/safe-return";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import { Button } from "../../design-system/primitives/Button";
import { PasswordField } from "./components/PasswordField";
import { AuthLayout } from "./components/AuthLayout";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Mot de passe oublié",
    description: "Réinitialisez le mot de passe de votre compte Shongre.",
    noIndex: true,
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const urlToken = searchParams.get("token") || "";

  const step: "request" | "reset" = urlToken ? "reset" : "request";
  const [email, setEmail] = useState("");
  const returnTo = resolveSafeReturn(
    searchParams.get("redirect") || searchParams.get("returnTo"),
    routes.home(),
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await services.auth.requestPasswordReset(email.trim());
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la demande.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage(
        "Le nouveau mot de passe doit comporter au moins 8 caractères.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await services.auth.resetPassword(
        urlToken.trim(),
        newPassword,
      );
      if (res.success) {
        toast.success(
          "Votre mot de passe a été mis à jour ! Vous pouvez vous connecter.",
        );
        navigate(routes.auth.login(returnTo));
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de la réinitialisation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      width="compact"
      title={
        step === "request" ? "Mot de passe oublié" : "Nouveau mot de passe"
      }
      subtitle={
        step === "request"
          ? "Recevez un lien de réinitialisation sécurisé par email"
          : "Définissez votre nouveau mot de passe d'accès sécurisé"
      }
      footerLink={{
        text: "Vous vous souvenez de votre mot de passe ?",
        linkText: "Se connecter",
        to: routes.auth.login(returnTo),
      }}
    >
      {errorMessage && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-xl bg-danger-surface border border-danger-border text-xs font-semibold text-danger flex items-start gap-2.5"
        >
          <AlertCircle className="w-icon-md h-icon-md text-danger shrink-0 mt-0.5" />
          <div className="leading-relaxed">{errorMessage}</div>
        </div>
      )}

      {successMessage && step === "request" && (
        <div
          role="status"
          className="mb-5 p-4 rounded-xl bg-success-surface border border-success-border text-xs text-success space-y-2"
        >
          <div className="flex items-start gap-2 font-bold text-success">
            <CheckCircle2 className="w-icon-md h-icon-md text-success shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {step === "request" ? (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div>
            <label
              htmlFor="reset-email"
              className="block text-sm font-semibold text-text-strong mb-1.5"
            >
              {t("auth.forgotPasswordPage.adresseEmailDeVotreCompte")}
              <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                id="reset-email"
                disabled={isLoading}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.forgotPasswordPage.votreEmailExempleFr")}
                required
                autoComplete="email"
                className="w-full pl-9 pr-3.5 py-2.5 bg-bg-surface border border-border-disabled rounded-control text-sm font-semibold text-text-main placeholder:text-text-tertiary focus:outline-none focus:border-primary focus:ring-2 focus:ring-focus h-control-touch"
              />
              <Mail className="w-icon-md h-icon-md text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-icon-md h-icon-md" />}
          >
            {t("auth.forgotPasswordPage.envoyerLeLienDeReinitialisation")}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <PasswordField
              id="new-password"
              disabled={isLoading}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              label={t("auth.forgotPasswordPage.nouveauMotDePasse")}
              showStrength
              required
              autoComplete="new-password"
            />
          </div>

          <PasswordField
            id="confirm-password"
            name="confirm-password"
            label={t("auth.forgotPasswordPage.confirmerLeNouveauMotDe")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            disabled={isLoading}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-icon-md h-icon-md" />}
          >
            {t("auth.forgotPasswordPage.mettreAJourMonMot")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};
