import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Globe2,
  LifeBuoy,
  ShoppingBag,
  Tag,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useConsent } from "../providers/ConsentProvider";
import { useMarketLocation } from "../providers/MarketLocationProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import { BrandHeaderSignature, Container } from "../../design-system";
import { routes } from "../../configuration/routes";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { usePublishCta } from "../../security/usePublishCta";
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
import { applicationHref } from "../../platform/applications/use-application-href";

type BrandIcon = ComponentType<SVGProps<SVGSVGElement>>;
const FOOTER_FOCUS = `${CONTROL_FOCUS_CLASS} focus-visible:outline-primary-on-dark`;
const EXTERNAL_CONTROL = `inline-flex items-center ${CONTROL_MOTION_CLASS} ${FOOTER_FOCUS}`;
const FOOTER_LINK = `inline-flex min-h-control-touch w-full items-center justify-between gap-3 rounded-sm py-0.5 text-sm leading-snug text-text-inverse-muted transition-colors hover:text-text-inverse ${FOOTER_FOCUS}`;
const LEGAL_CONTROL = `inline-flex min-h-control-touch items-center rounded-sm text-xs text-text-inverse-muted transition-colors hover:text-text-inverse ${FOOTER_FOCUS}`;

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
  { to: "/accessibilite", labelKey: "footer.accessibility" },
  { to: "/mentions-legales", labelKey: "footer.legalNotices" },
] as const;

const FooterLink: React.FC<{
  to: string;
  reloadDocument?: boolean;
  children: React.ReactNode;
}> = ({ to, reloadDocument = false, children }) => {
  const content = (
    <>
      <span className="min-w-0">{children}</span>
      <ChevronRight
        className="h-icon-sm w-icon-sm shrink-0 text-text-inverse-subtle"
        aria-hidden="true"
      />
    </>
  );
  return (
    <li>
      {reloadDocument ? (
        <a href={to} className={FOOTER_LINK}>
          {content}
        </a>
      ) : (
        <Link to={to} className={FOOTER_LINK}>
          {content}
        </Link>
      )}
    </li>
  );
};

const StoreBadge: React.FC<{
  id: MobileStoreId;
  name: string;
  url: string | null;
  Icon: BrandIcon;
  statusLabel: string;
  accessibleLabel: string;
  unavailableLabel: string;
}> = ({
  id,
  name,
  url,
  Icon,
  statusLabel,
  accessibleLabel,
  unavailableLabel,
}) => {
  const content = (
    <>
      <Icon className="h-icon-xl w-icon-xl shrink-0" />
      <span className="min-w-0 text-left leading-tight">
        <span className="block text-micro font-semibold uppercase tracking-wide text-text-inverse-muted">
          {statusLabel}
        </span>
        <span className="block whitespace-nowrap text-sm font-bold text-text-inverse">
          {name}
        </span>
      </span>
    </>
  );
  const className = `${EXTERNAL_CONTROL} h-control-lg min-w-32 flex-1 gap-2 rounded-control border border-border-inverse-muted bg-surface-inverse-deep px-3 text-text-inverse shadow-xs ${url ? "hover:border-border-on-inverse hover:bg-surface-inverse-hover" : ""}`;
  return url ? (
    <a
      data-store-badge={id}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={accessibleLabel}
      className={className}
    >
      {content}
    </a>
  ) : (
    <span
      data-store-badge={id}
      aria-label={unavailableLabel}
      aria-disabled="true"
      title={unavailableLabel}
      className={className}
    >
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
  const content = <Icon className="h-icon-lg w-icon-lg" />;
  const className = `${EXTERNAL_CONTROL} h-control-md w-control-md justify-center rounded-full bg-surface-inverse-hover text-text-inverse-muted ${url ? "hover:bg-surface-inverse hover:text-primary-on-dark" : ""}`;
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
  Icon: LucideIcon;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}> = ({ id, title, Icon, isOpen, onToggle, children }) => {
  const panelId = `footer-panel-${id}`;
  const heading = (
    <span className="flex items-center gap-3">
      <Icon
        className="h-icon-lg w-icon-lg shrink-0 text-primary-on-dark"
        aria-hidden="true"
      />
      <span>{title}</span>
    </span>
  );
  return (
    <div
      data-footer-column={id}
      className="min-w-0 border-b border-border-inverse-subtle py-1 md:border-b-0 md:border-l md:px-4 md:first:border-l-0 md:first:pl-0 md:last:pr-0 lg:first:border-l lg:first:pl-4 xl:px-6 xl:first:pl-6"
    >
      <h2 className="text-sm font-bold text-text-inverse">
        <button
          type="button"
          onClick={() => onToggle(id)}
          className={`flex min-h-control-lg w-full items-center justify-between gap-3 rounded-sm text-left md:hidden ${FOOTER_FOCUS}`}
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          {heading}
          <ChevronDown
            className={`h-icon-md w-icon-md transition-transform ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
        <span className="hidden md:block">{heading}</span>
      </h2>
      <ul
        id={panelId}
        className={`pb-3 md:mt-5 md:pb-0 ${isOpen ? "block" : "hidden md:block"}`}
      >
        {children}
      </ul>
    </div>
  );
};

export const Footer: React.FC = () => {
  const { openPreferences } = useConsent();
  const { activeMarket, openPreferencesModal } = useMarketLocation();
  const { t } = useTranslation();
  const publishCta = usePublishCta();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = (id: string) =>
    setOpenSections((previous) => ({ ...previous, [id]: !previous[id] }));

  return (
    <footer className="bg-surface-inverse pb-28 pt-10 text-text-inverse-muted sm:pt-12 lg:pb-0">
      <Container width="full" data-footer-container>
        <div
          data-footer-main
          className="grid gap-8 pb-10 md:gap-10 lg:grid-cols-12 lg:gap-8 xl:gap-12 2xl:pb-12"
        >
          <div className="min-w-0 lg:col-span-3">
            <Link
              to={routes.home()}
              aria-label={t("footer.home")}
              className={`inline-flex max-w-full rounded-sm ${FOOTER_FOCUS}`}
            >
              <BrandHeaderSignature variant="reverse" decorative />
            </Link>
            <p className="mt-4 text-sm font-bold leading-relaxed text-text-inverse">
              {t("footer.brandTagline")}
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-text-inverse-muted">
              {t("footer.brandDescription")}
            </p>
            <section
              aria-label={t("footer.followHeading")}
              className="mt-4 flex flex-wrap gap-3"
            >
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
            </section>
            <section
              aria-label={t("footer.mobileAppsHeading")}
              className="mt-4 flex w-full max-w-xs flex-wrap gap-3"
            >
              {MOBILE_STORE_LINKS.map((store) => (
                <StoreBadge
                  key={store.id}
                  id={store.id}
                  name={store.name}
                  url={store.url}
                  Icon={STORE_ICONS[store.id]}
                  statusLabel={t(
                    store.url ? "footer.downloadFrom" : "footer.comingToStore",
                  )}
                  accessibleLabel={t("footer.downloadApp", {
                    store: store.name,
                  })}
                  unavailableLabel={t("footer.comingSoon", {
                    name: store.name,
                  })}
                />
              ))}
            </section>
            <p className="mt-3 text-xs leading-relaxed text-text-inverse-subtle">
              {t("footer.mobileAppsTagline")}
            </p>
          </div>
          <div className="grid min-w-0 md:grid-cols-4 lg:col-span-9 lg:pt-2">
            <FooterColumn
              id="buy"
              title={t("footer.buy")}
              Icon={ShoppingBag}
              isOpen={isDesktop || Boolean(openSections.buy)}
              onToggle={toggleSection}
            >
              <FooterLink to={routes.search()}>
                {t("footer.allListings")}
              </FooterLink>
              <FooterLink to={routes.categories()}>
                {t("footer.categories")}
              </FooterLink>
              <FooterLink to={routes.deals()}>{t("footer.deals")}</FooterLink>
              <FooterLink to={routes.collections.list()}>
                {t("footer.collections")}
              </FooterLink>
              <FooterLink to={routes.search({ sortBy: "date_desc" })}>
                {t("footer.newListings")}
              </FooterLink>
              <FooterLink to="/professionnels">
                {t("footer.professionalSellers")}
              </FooterLink>
            </FooterColumn>
            <FooterColumn
              id="sell"
              title={t("footer.sell")}
              Icon={Tag}
              isOpen={isDesktop || Boolean(openSections.sell)}
              onToggle={toggleSection}
            >
              <FooterLink to={publishCta.to}>
                {t(publishCta.labelKey)}
              </FooterLink>
              <FooterLink to="/tarifs">{t("footer.pricingOptions")}</FooterLink>
              <FooterLink to={routes.workspace.listings()}>
                {t("footer.sellerWorkspace")}
              </FooterLink>
              <FooterLink to="/solutions-pro">
                {t("footer.proSolutions")}
              </FooterLink>
              <FooterLink to={applicationHref("solutions")} reloadDocument>
                {t("footer.shongreSolutions")}
              </FooterLink>
            </FooterColumn>
            <FooterColumn
              id="help"
              title={t("footer.help")}
              Icon={LifeBuoy}
              isOpen={isDesktop || Boolean(openSections.help)}
              onToggle={toggleSection}
            >
              <FooterLink to={routes.help()}>
                {t("footer.helpCenter")}
              </FooterLink>
              <FooterLink to={routes.safety()}>{t("footer.safety")}</FooterLink>
              <FooterLink to={routes.delivery.marketplace()}>
                {t("delivery.nav")}
              </FooterLink>
              <FooterLink to={routes.contact()}>
                {t("footer.contact")}
              </FooterLink>
            </FooterColumn>
            <FooterColumn
              id="about"
              title={t("footer.about")}
              Icon={UsersRound}
              isOpen={isDesktop || Boolean(openSections.about)}
              onToggle={toggleSection}
            >
              <FooterLink to={routes.about()}>
                {t("footer.whoWeAre")}
              </FooterLink>
              <FooterLink to={`${routes.about()}#about-mission`}>
                {t("about.missionTitle")}
              </FooterLink>
              <FooterLink to={`${routes.about()}#about-trust`}>
                {t("about.trustTitle")}
              </FooterLink>
              <FooterLink to={`${routes.about()}#about-markets`}>
                {t("about.marketsTitle")}
              </FooterLink>
              <FooterLink to="/newsletter">
                {t("footer.newsletterHeading")}
              </FooterLink>
            </FooterColumn>
          </div>
        </div>
        <div
          data-footer-bottom
          className="flex flex-col gap-4 border-t border-border-inverse-subtle py-6 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8 2xl:py-8"
        >
          <button
            id="footer-market-button"
            type="button"
            onClick={openPreferencesModal}
            aria-label={t("footer.marketPreferences", {
              market: activeMarket.name,
            })}
            aria-haspopup="dialog"
            className={`inline-flex min-h-control-touch w-fit shrink-0 items-center gap-2 rounded-sm text-sm text-text-inverse-muted transition-colors hover:text-text-inverse lg:border-r lg:border-border-inverse-subtle lg:pr-8 ${FOOTER_FOCUS}`}
          >
            <Globe2 className="h-icon-lg w-icon-lg" aria-hidden="true" />
            {activeMarket.name}
            <ChevronDown className="h-icon-md w-icon-md" aria-hidden="true" />
          </button>
          <nav
            aria-label={t("footer.legalHeading")}
            className="min-w-0 lg:flex-1"
          >
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 xl:gap-x-6">
              {LEGAL_LINKS.map(({ to, labelKey }) => (
                <li key={to}>
                  <Link to={to} className={LEGAL_CONTROL}>
                    {t(labelKey)}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openPreferences}
                  className={LEGAL_CONTROL}
                >
                  {t("footer.cookies")}
                </button>
              </li>
            </ul>
          </nav>
          <span className="inline-flex min-h-control-touch items-center text-xs leading-relaxed text-text-inverse-subtle">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </span>
        </div>
      </Container>
    </footer>
  );
};
