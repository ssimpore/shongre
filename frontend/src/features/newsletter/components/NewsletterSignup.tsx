import React, { useState } from "react";
import { Mail, CheckCircle2, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "../../../app/providers/AuthProvider";
import { useToast } from "../../../app/providers/ToastProvider";
import { Button } from "../../../design-system/primitives/Button";
import { newsletterService } from "../../../domains/newsletter/newsletter.service";
import { NewsletterSubscriptionSource } from "../../../domains/newsletter/newsletter.types";
import { useTranslation } from "../../../i18n/I18nProvider";
import { services } from "../../../api/client/service-registry";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";

const publicSource = {
  homepage: "HOMEPAGE",
  footer: "FOOTER",
  registration: "REGISTRATION",
  account: "FORM",
  pro_workspace: "FORM",
  newsletter_page: "NEWSLETTER_PAGE",
  direct_link: "FORM",
} as const;

interface NewsletterSignupProps {
  showConsentCheckbox?: boolean;
  className?: string;
  source?: NewsletterSubscriptionSource;
}

export const NewsletterSignup: React.FC<NewsletterSignupProps> = ({
  showConsentCheckbox = true,
  className = "",
  source = "homepage",
}) => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { activeMarket, currentLocale } = useMarketLocation();
  const toast = useToast();

  const [email, setEmail] = useState(currentUser?.email || "");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = newsletterService.validateEmail(email);
    if (!validation.isValid) {
      setErrorMessage(validation.error || "Email invalide.");
      return;
    }

    if (showConsentCheckbox && !consent) {
      setErrorMessage("Veuillez accepter de recevoir les actualités Shongre.");
      return;
    }

    setIsSubmitting(true);
    try {
      const receipt = await services.marketing.subscribePublic({
        email: email.trim(),
        marketCode: activeMarket.code,
        locale: currentLocale,
        topics: [],
        source: publicSource[source],
        consentGiven: true,
      });

      setIsSuccess(true);
      toast.success(
        receipt.message,
        receipt.status === "PENDING_CONFIRMATION"
          ? "Confirmation requise"
          : "Inscription enregistrée",
      );
    } catch (err: any) {
      setErrorMessage(
        err.message || "Impossible d'enregistrer votre inscription. Réessayez.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        className={`p-6 rounded-3xl bg-success-surface border border-success-border text-center space-y-2 ${className}`}
      >
        <div className="w-10 h-10 rounded-full bg-success-surface text-success flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-icon-lg h-icon-lg" />
        </div>
        <h4 className="text-sm font-bold text-success">
          Vérifiez votre messagerie
        </h4>
        <p className="text-xs text-success max-w-sm mx-auto">
          Cliquez sur le lien de confirmation avant de recevoir nos sélections.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface-inverse text-text-inverse rounded-3xl p-6 sm:p-10 shadow-md relative overflow-hidden ${className}`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5 space-y-2 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-overlay text-text-inverse text-xs font-bold">
            <Mail className="w-icon-sm h-icon-sm" />
            <span>{t("newsletter.newsletterSignup.laSelectionShongre")}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {t("newsletter.newsletterSignup.recevezNosMeilleuresPepitesBons")}
          </h2>

          <p className="text-xs sm:text-sm text-text-inverse-subtle leading-relaxed">
            {t(
              "newsletter.newsletterSignup.chaqueSemaineUneSelectionExclusive",
            )}
          </p>
        </div>

        <div className="lg:col-span-7">
          <form
            data-marketplace-action="newsletter.subscribe"
            onSubmit={handleSubmit}
            className="space-y-3"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail
                  data-newsletter-email-icon="true"
                  className="w-icon-lg h-icon-lg text-text-inverse-subtle absolute left-3.5 top-1/2 -translate-y-1/2"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t(
                    "newsletter.newsletterSignup.saisissezVotreAdresseEmail",
                  )}
                  aria-label={t(
                    "newsletter.newsletterSignup.votreAdresseEmail",
                  )}
                  autoComplete="email"
                  disabled={isSubmitting}
                  className="w-full h-control-md min-h-control-md pl-11 pr-4 text-xs sm:text-sm bg-surface-inverse-hover border border-border-inverse-subtle text-text-inverse rounded-control placeholder:text-text-inverse-subtle focus:border-border-on-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-on-inverse transition-colors"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="font-semibold shrink-0 flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? "Inscription..." : "S'inscrire"}</span>
                <ArrowRight className="w-icon-md h-icon-md" />
              </Button>
            </div>

            {showConsentCheckbox && (
              <label className="flex items-start gap-2 pl-3.5 cursor-pointer select-none text-micro text-text-inverse-subtle min-h-6">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="w-4 h-4 shrink-0 rounded text-primary focus:ring-primary border-border-inverse-subtle bg-surface-inverse-hover mt-0.5"
                />
                <span>
                  {t("newsletter.newsletterSignup.jAccepteDeRecevoirLa")}
                </span>
              </label>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-critical-inverse-deep/60 border border-critical-border-strong text-critical-on-inverse-strong text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-icon-md h-icon-md shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
