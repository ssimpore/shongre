import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ShieldCheck,
} from "lucide-react";
import { TAXONOMY } from "../../domains/taxonomy/taxonomy.data";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.service";
import { LanguageSelector } from "../../design-system/primitives/LanguageSelector";
import { NewsletterSignup } from "../../features/newsletter/components/NewsletterSignup";
import { useConsent } from "../providers/ConsentProvider";
import { useMarketLocation } from "../providers/MarketLocationProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { Container } from "../../design-system";
import { routes } from "../../configuration/routes";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const PANEL = "rounded-card border border-stone-800/80 bg-stone-900/40";

const LEGAL_LINKS = [
  { to: "/conditions-utilisation", labelKey: "footer.terms" },
  { to: "/confidentialite", labelKey: "footer.privacy" },
  { to: "/mentions-legales", labelKey: "footer.legalNotices" },
  { to: "/accessibilite", labelKey: "footer.accessibility" },
] as const;

const FooterLink: React.FC<{
  to: string;
  title?: string;
  children: React.ReactNode;
}> = ({ to, title, children }) => (
  <li>
    <Link
      to={to}
      title={title}
      className="group touch-row flex items-center justify-between gap-2 py-1.5 font-medium text-stone-400 transition-colors hover:text-white"
    >
      <span>{children}</span>
      <ChevronRight
        className="h-3.5 w-3.5 shrink-0 text-stone-600 transition-all duration-fast group-hover:translate-x-0.5 group-hover:text-primary-on-dark"
        aria-hidden="true"
      />
    </Link>
  </li>
);

const FooterColumn: React.FC<{
  id: string;
  title: string;
  Icon: typeof LayoutGrid;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}> = ({ id, title, Icon, isOpen, onToggle, children }) => {
  const panelId = `footer-panel-${id}`;

  return (
    <div className="border-b border-stone-800/60 py-3.5 md:border-b-0 md:py-0 lg:border-l lg:px-5 lg:first:border-l-0 lg:first:pl-0">
      <h2>
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="group flex min-h-6 w-full cursor-pointer items-center justify-between gap-2 py-1 text-left text-xs font-bold uppercase tracking-wider text-white transition-colors hover:text-primary-on-dark md:pointer-events-none md:mb-5 md:min-h-0 md:cursor-default md:py-0 md:hover:text-white"
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          <span className="flex items-center gap-2">
            <Icon
              className="h-4 w-4 shrink-0 text-primary-on-dark"
              aria-hidden="true"
            />
            <span>{title}</span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-normal md:hidden ${
              isOpen ? "rotate-180 text-primary-on-dark" : "text-stone-400"
            }`}
            aria-hidden="true"
          />
        </button>
      </h2>
      <ul
        id={panelId}
        className={`mt-3 space-y-1 md:mt-0 ${isOpen ? "block" : "hidden md:block"}`}
      >
        {children}
      </ul>
    </div>
  );
};

export const Footer: React.FC = () => {
  const { openPreferences } = useConsent();
  const { activeMarket } = useMarketLocation();
  const { t } = useTranslation();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: false,
    professionals: false,
    help: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections((previousSections) => ({
      ...previousSections,
      [sectionKey]: !previousSections[sectionKey],
    }));
  };

  return (
    <footer className="border-t border-stone-800 bg-stone-950 pb-36 pt-10 text-xs text-stone-300 lg:pb-10">
      <Container className="space-y-6">
        <div className={`${PANEL} p-5 sm:p-7`}>
          <div className="grid gap-x-6 md:grid-cols-2 md:gap-y-8 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(16rem,1.25fr)] lg:gap-x-0 lg:gap-y-0">
            <FooterColumn
              id="categories"
              title={t("footer.sectionCategories")}
              Icon={LayoutGrid}
              isOpen={isDesktop || openSections.categories}
              onToggle={toggleSection}
            >
              {TAXONOMY.slice(0, 6).map((category) => (
                <FooterLink
                  key={category.id}
                  to={routes.category(category.slug)}
                  title={getTaxonomyLabel(category, "compact")}
                >
                  {getTaxonomyLabel(category, "compact")}
                </FooterLink>
              ))}
            </FooterColumn>

            <FooterColumn
              id="professionals"
              title={t("footer.sectionProfessionals")}
              Icon={Briefcase}
              isOpen={isDesktop || openSections.professionals}
              onToggle={toggleSection}
            >
              <FooterLink to="/solutions-pro">
                {t("footer.proSolutions")}
              </FooterLink>
              <FooterLink to="/professionnels">
                {t("footer.storeDirectory")}
              </FooterLink>
              <FooterLink to="/tarifs">{t("footer.boostGrid")}</FooterLink>
            </FooterColumn>

            <FooterColumn
              id="help"
              title={t("footer.sectionHelp")}
              Icon={ShieldCheck}
              isOpen={isDesktop || openSections.help}
              onToggle={toggleSection}
            >
              <FooterLink to="/aide">{t("footer.helpCenter")}</FooterLink>
              <FooterLink to="/securite">{t("footer.safetyTips")}</FooterLink>
              <FooterLink to="/contact">
                {t("footer.contactSupport")}
              </FooterLink>
              <FooterLink to="/bons-plans">
                {t("footer.currentDeals")}
              </FooterLink>
            </FooterColumn>

            <aside
              aria-label={t("footer.newsletterHeading")}
              className="pt-6 md:pt-0 lg:border-l lg:border-stone-800/60 lg:pl-6"
            >
              <h2 className="text-sm font-bold text-white">
                {t("footer.newsletterHeading")}
              </h2>
              <p className="mb-4 mt-2 max-w-sm leading-relaxed text-stone-400">
                {t("footer.newsletterPitch")}
              </p>
              <NewsletterSignup variant="footer" source="footer" />
            </aside>
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-1 text-xs text-stone-400 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              {t("footer.copyright", { year: new Date().getFullYear() })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true">{activeMarket.flag}</span>
              {t("footer.marketLabel", { market: activeMarket.name })}
            </span>
            <LanguageSelector variant="footer" idPrefix="footer-lang" />
          </div>

          <nav aria-label={t("footer.legalHeading")}>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {LEGAL_LINKS.map(({ to, labelKey }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="inline-flex min-h-6 items-center py-1 transition-colors hover:text-white"
                  >
                    {t(labelKey)}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openPreferences}
                  className="inline-flex min-h-6 cursor-pointer items-center py-1 transition-colors hover:text-white"
                >
                  {t("footer.cookies")}
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </Container>
    </footer>
  );
};
