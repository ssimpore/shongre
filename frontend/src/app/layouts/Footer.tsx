import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
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
import {
  MOBILE_STORE_LINKS,
  SOCIAL_LINKS,
  type MobileStoreId,
  type SocialNetworkId,
} from "../../configuration/footer-links.config";
import {
  AppleBrandIcon,
  FacebookBrandIcon,
  GooglePlayBrandIcon,
  InstagramBrandIcon,
  LinkedInBrandIcon,
  YouTubeBrandIcon,
} from "../../design-system/primitives/BrandIcons";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../../design-system/utils/controlMetrics";

const PANEL = "rounded-card border border-stone-800/80 bg-stone-900/40";
const EXTERNAL_CONTROL = `inline-flex items-center ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`;

type BrandIcon = ComponentType<SVGProps<SVGSVGElement>>;

const STORE_ICONS: Record<MobileStoreId, BrandIcon> = {
  "app-store": AppleBrandIcon,
  "google-play": GooglePlayBrandIcon,
};

const SOCIAL_ICONS: Record<SocialNetworkId, BrandIcon> = {
  instagram: InstagramBrandIcon,
  facebook: FacebookBrandIcon,
  linkedin: LinkedInBrandIcon,
  youtube: YouTubeBrandIcon,
};

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
        className="h-icon-sm w-icon-sm shrink-0 text-stone-600 transition-all duration-fast group-hover:translate-x-0.5 group-hover:text-primary-on-dark"
        aria-hidden="true"
      />
    </Link>
  </li>
);

const StoreBadge: React.FC<{
  name: string;
  url: string | null;
  Icon: BrandIcon;
  statusLabel: string;
  accessibleLabel: string;
  unavailableLabel: string;
}> = ({ name, url, Icon, statusLabel, accessibleLabel, unavailableLabel }) => {
  const content = (
    <>
      <Icon className="h-5 w-5 shrink-0" />
      <span className="min-w-0 text-left leading-tight">
        <span className="block text-micro font-medium text-stone-400">
          {statusLabel}
        </span>
        <span className="block truncate text-xs font-bold text-white">
          {name}
        </span>
      </span>
    </>
  );
  const className = `${EXTERNAL_CONTROL} h-control-touch min-w-0 gap-2 rounded-control border px-2.5 sm:min-w-36 sm:px-3.5 ${
    url
      ? "border-stone-700 bg-stone-950 text-white hover:border-stone-500 hover:bg-stone-900"
      : "border-stone-800 bg-stone-950/60 text-stone-400"
  }`;

  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={accessibleLabel}
      className={className}
    >
      {content}
    </a>
  ) : (
    <span aria-disabled="true" title={unavailableLabel} className={className}>
      {content}
    </span>
  );
};

const SocialLink: React.FC<{
  name: string;
  url: string | null;
  Icon: BrandIcon;
  accessibleLabel: string;
  unavailableLabel: string;
}> = ({ name, url, Icon, accessibleLabel, unavailableLabel }) => {
  const content = <Icon className="h-5 w-5" />;
  const className = `${EXTERNAL_CONTROL} h-control-touch w-control-touch justify-center rounded-control border ${
    url
      ? "border-stone-700 bg-stone-950 text-stone-300 hover:border-primary-on-dark hover:text-primary-on-dark"
      : "border-stone-800 bg-stone-950/60 text-stone-600"
  }`;

  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={accessibleLabel}
      title={name}
      className={className}
    >
      {content}
    </a>
  ) : (
    <span
      role="img"
      aria-label={unavailableLabel}
      aria-disabled="true"
      title={unavailableLabel}
      className={className}
    >
      {content}
    </span>
  );
};

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
            className={`h-icon-md w-icon-md shrink-0 transition-transform duration-normal md:hidden ${
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
          <div className="grid gap-x-6 md:grid-cols-2 md:gap-y-8 lg:grid-cols-footer lg:gap-x-0 lg:gap-y-0">
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
              <FooterLink to={routes.solutions.home()}>
                {t("footer.shongreSolutions")}
              </FooterLink>
              <FooterLink to="/solutions-pro">
                {t("footer.proSolutions")}
              </FooterLink>
              <FooterLink to={routes.prospects.product()}>
                {t("footer.shongreProspects")}
              </FooterLink>
              <FooterLink to={routes.facturation.product()}>
                {t("footer.shongreFacturation")}
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

        <div
          className={`${PANEL} flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between`}
        >
          <section
            aria-labelledby="footer-mobile-apps-heading"
            className="min-w-0 flex-1"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2
                  id="footer-mobile-apps-heading"
                  className="text-sm font-bold text-white"
                >
                  {t("footer.mobileAppsHeading")}
                </h2>
                <p className="mt-1 leading-relaxed text-stone-400">
                  {t("footer.appPitch")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {MOBILE_STORE_LINKS.map((store) => {
                  const isAvailable = Boolean(store.url);
                  return (
                    <StoreBadge
                      key={store.id}
                      name={store.name}
                      url={store.url}
                      Icon={STORE_ICONS[store.id]}
                      statusLabel={t(
                        isAvailable
                          ? "footer.downloadFrom"
                          : "footer.comingToStore",
                      )}
                      accessibleLabel={t("footer.downloadApp", {
                        store: store.name,
                      })}
                      unavailableLabel={t("footer.comingSoon", {
                        name: store.name,
                      })}
                    />
                  );
                })}
              </div>
            </div>
          </section>

          <section
            aria-labelledby="footer-social-heading"
            className="border-t border-stone-800/60 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
          >
            <h2
              id="footer-social-heading"
              className="text-sm font-bold text-white"
            >
              {t("footer.followHeading")}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {SOCIAL_LINKS.map((social) => (
                <SocialLink
                  key={social.id}
                  name={social.name}
                  url={social.url}
                  Icon={SOCIAL_ICONS[social.id]}
                  accessibleLabel={t("footer.followOn", {
                    network: social.name,
                  })}
                  unavailableLabel={t("footer.comingSoon", {
                    name: social.name,
                  })}
                />
              ))}
            </div>
          </section>
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
