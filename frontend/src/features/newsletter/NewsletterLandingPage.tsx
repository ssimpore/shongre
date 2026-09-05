import React from "react";
import { Mail, Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";
import { NewsletterSignup } from "./components/NewsletterSignup";
import { newsletterTopicsService } from "../../domains/newsletter/newsletter.topics";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";

export const NewsletterLandingPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Newsletter Shongre",
    description:
      "Recevez les meilleures annonces, les baisses de prix et les nouveautés Shongre dans votre boîte mail. Désinscription en un clic.",
    canonicalPath: "/newsletter",
  });

  const topics = newsletterTopicsService.getAllTopics();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">
      {/* 1. Header & Value Proposition */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-bold">
          <Mail className="w-icon-sm h-icon-sm" />
          <span>
            {t("newsletter.newsletterLandingPage.laNewsletterShongre")}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-main tracking-tight leading-tight">
          {t("newsletter.newsletterLandingPage.neManquezPlusAucunePepite")}
        </h1>

        <p className="text-xs sm:text-base text-text-supporting leading-relaxed">
          {t("newsletter.newsletterLandingPage.chaqueSemaineRecevezDansVotre")}
        </p>
      </div>

      {/* 2. Embedded Main Signup Band */}
      <div className="max-w-3xl mx-auto">
        <NewsletterSignup variant="band" source="newsletter_page" />
      </div>

      {/* 3. Topics Grid */}
      <div className="space-y-6 pt-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-text-main">
            {t("newsletter.newsletterLandingPage.ceQueVousTrouverezDans")}
          </h2>
          <p className="text-xs sm:text-sm text-text-tertiary">
            {t("newsletter.newsletterLandingPage.vousGardezLeControleTotal")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((topic) => (
            <div
              key={topic.id}
              className="bg-bg-surface border border-border-base rounded-2xl p-5 space-y-2 shadow-xs"
            >
              <h3 className="font-bold text-sm text-text-main">
                {topic.label}
              </h3>
              <p className="text-xs text-text-tertiary leading-relaxed">
                {topic.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Trust & Privacy Guarantees */}
      <div className="bg-surface-soft border border-border-base rounded-3xl p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-text-supporting">
        <div className="space-y-1">
          <div className="w-8 h-8 rounded-full bg-success-surface text-success flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-icon-md h-icon-md" />
          </div>
          <h4 className="font-bold text-text-main">
            {t("newsletter.newsletterLandingPage.100SansSpam")}
          </h4>
          <p>
            {t("newsletter.newsletterLandingPage.uneFrequenceRaisonneeDUn")}
          </p>
        </div>

        <div className="space-y-1">
          <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-icon-md h-icon-md" />
          </div>
          <h4 className="font-bold text-text-main">
            {t("newsletter.newsletterLandingPage.contenuEditorialSoigne")}
          </h4>
          <p>
            {t(
              "newsletter.newsletterLandingPage.desSelectionsManuellesPrepareesPar",
            )}
          </p>
        </div>

        <div className="space-y-1">
          <div className="w-8 h-8 rounded-full bg-surface-disabled text-text-emphasis flex items-center justify-center mx-auto mb-2">
            <ShieldCheck className="w-icon-md h-icon-md" />
          </div>
          <h4 className="font-bold text-text-main">
            {t("newsletter.newsletterLandingPage.desinscriptionInstantanee")}
          </h4>
          <p>{t("newsletter.newsletterLandingPage.unLienDeDesabonnementEn")}</p>
        </div>
      </div>
    </div>
  );
};
