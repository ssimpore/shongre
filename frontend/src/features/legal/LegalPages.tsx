import React from "react";
import { useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Tag,
} from "lucide-react";
import { Breadcrumbs } from "../../design-system";
import { services } from "../../api/client/service-registry";
import { Button } from "../../design-system/primitives/Button";
import { ListingCard } from "../../design-system/primitives/ListingCard";
import { ListingGrid } from "../../design-system/primitives/ListingGrid";
import { useStaticPageSeo } from "../../hooks/useStaticPageSeo";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { routes } from "../../configuration/routes";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import type { Listing } from "../../types";

const DEALS_PER_PAGE = 8;

export const AboutPage: React.FC = () => {
  const { t } = useTranslation();
  useStaticPageSeo("/a-propos");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("about.title") },
        ]}
      />
      <article className="bg-bg-surface p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-8 text-xs sm:text-sm text-text-emphasis leading-relaxed">
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            {t("about.eyebrow")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
            {t("about.title")}
          </h1>
          <p className="text-base text-text-supporting">
            {t("about.introduction")}
          </p>
        </header>
        <section className="space-y-2" aria-labelledby="about-mission">
          <h2 id="about-mission" className="text-lg font-bold text-text-main">
            {t("about.missionTitle")}
          </h2>
          <p>{t("about.missionBody")}</p>
        </section>
        <section className="space-y-2" aria-labelledby="about-trust">
          <h2 id="about-trust" className="text-lg font-bold text-text-main">
            {t("about.trustTitle")}
          </h2>
          <p>{t("about.trustBody")}</p>
        </section>
        <section className="space-y-2" aria-labelledby="about-markets">
          <h2 id="about-markets" className="text-lg font-bold text-text-main">
            {t("about.marketsTitle")}
          </h2>
          <p>{t("about.marketsBody")}</p>
        </section>
      </article>
    </div>
  );
};

export const TermsPage: React.FC = () => {
  const { t } = useTranslation();
  useStaticPageSeo("/conditions-utilisation");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: "Conditions Générales d'Utilisation" },
        ]}
      />
      <div className="bg-bg-surface p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-6 text-xs sm:text-sm text-text-emphasis leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
          {t("legal.legalPages.conditionsGeneralesDUtilisationCgu")}
        </h1>
        <p className="text-text-tertiary">
          {t("legal.legalPages.derniereMiseAJourFevrier")}
        </p>
        <section className="space-y-2">
          <h2 className="text-base font-bold text-text-main">
            {t("legal.legalPages.1ObjetDeLaPlateforme")}
          </h2>
          <p>{t("legal.legalPages.laPlateformeShongreEstUn")}</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-bold text-text-main">
            {t("legal.legalPages.2SequestreProtectionAcheteur")}
          </h2>
          <p>{t("legal.legalPages.lorsquUneTransactionEstEffectuee")}</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-bold text-text-main">
            {t("legal.legalPages.3EngagementsDesProfessionnels")}
          </h2>
          <p>{t("legal.legalPages.lesVendeursProfessionnelsSEngagent")}</p>
        </section>
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC = () => {
  const { t } = useTranslation();
  useStaticPageSeo("/confidentialite");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: "Politique de Confidentialité" },
        ]}
      />
      <div className="bg-bg-surface p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-6 text-xs sm:text-sm text-text-emphasis leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
          {t("legal.legalPages.politiqueDeConfidentialiteRgpd")}
        </h1>
        <p>{t("legal.legalPages.shongreAttacheLaPlusGrande")}</p>
        <div className="p-4 bg-success-surface text-success rounded-xl border border-success-border text-xs">
          <strong>{t("legal.legalPages.principeDeMinimisation")}</strong> Nous
          ne collectons que les données strictement nécessaires au bon
          déroulement des transactions et à la sécurité des utilisateurs.
        </div>
      </div>
    </div>
  );
};

export const LegalNoticesPage: React.FC = () => {
  const { t } = useTranslation();
  useStaticPageSeo("/mentions-legales");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs
        items={[{ label: "Accueil", href: "/" }, { label: "Mentions Légales" }]}
      />
      <div className="bg-bg-surface p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-4 text-xs sm:text-sm text-text-emphasis leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
          {t("legal.legalPages.mentionsLegales")}
        </h1>
        <p>
          <strong>{t("legal.legalPages.editeur")}</strong>{" "}
          {t("legal.legalPages.shongreSasAuCapitalDe")}
        </p>
        <p>
          <strong>{t("legal.legalPages.siegeSocial")}</strong> 14 boulevard
          Haussmann, 75009 Paris, France
        </p>
        <p>
          <strong>{t("legal.legalPages.directeurDeLaPublication")}</strong>{" "}
          {t("legal.legalPages.antoineFabrePresident")}
        </p>
        <p>
          <strong>{t("legal.legalPages.hebergement")}</strong>{" "}
          {t("legal.legalPages.serveursSecurisesSituesEnFrance")}
        </p>
      </div>
    </div>
  );
};

export const AccessibilityPage: React.FC = () => {
  const { t } = useTranslation();
  useStaticPageSeo("/accessibilite");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: "Déclaration d'Accessibilité" },
        ]}
      />
      <div className="bg-bg-surface p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-4 text-xs sm:text-sm text-text-emphasis leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
          {t("legal.legalPages.declarationDAccessibiliteWcag2")}
        </h1>
        <p>{t("legal.legalPages.shongreSEngageARendre")}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t("legal.legalPages.navigationIntegraleAuClavierAvec")}</li>
          <li>
            {t("legal.legalPages.contrastesTypographiquesSuperieursAuxRatios")}
          </li>
          <li>{t("legal.legalPages.labelsEtAttributsAriaSur")}</li>
        </ul>
      </div>
    </div>
  );
};

export const HelpSafetyPage: React.FC = () => {
  const { t } = useTranslation();
  useStaticPageSeo("/securite");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: "Centre d'Aide & Sécurité" },
        ]}
      />
      <div className="bg-bg-surface p-6 sm:p-10 rounded-2xl border border-border-base shadow-xs space-y-6 text-xs sm:text-sm text-text-emphasis leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
          {t("legal.legalPages.conseilsDeSecuriteAntiFraude")}
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-danger-surface border border-danger-border text-danger space-y-1">
            <h2 className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-icon-md h-icon-md text-danger" /> Ne
              payez jamais hors plateforme
            </h2>
            <p className="text-xs">
              {t("legal.legalPages.refusezLesVirementsDirectsMandats")}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-success-surface border border-success-border text-success space-y-1">
            <h2 className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-icon-md h-icon-md text-success" />{" "}
              {t("legal.legalPages.utilisezLeSequestreShongre")}
            </h2>
            <p className="text-xs">
              {t("legal.legalPages.votreArgentEstProtegeJusqu")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const DealsPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeMarket } = useMarketLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dealsSectionRef = React.useRef<HTMLElement>(null);
  const [deals, setDeals] = React.useState<Listing[]>([]);
  const [pageCount, setPageCount] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  usePageMeta({
    title: "Offres à prix réduit",
    description:
      "Les annonces dont le prix vient de baisser et les meilleures affaires du moment sur Shongre.",
    canonicalPath: routes.deals(),
  });

  const requestedPage = Number(searchParams.get("page") ?? "1");
  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const previousPageRef = React.useRef(currentPage);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    void services.search
      .search({
        marketCode: activeMarket.code,
        onlyDeals: true,
        page: currentPage,
        limit: DEALS_PER_PAGE,
        sortBy: "date_desc",
      })
      .then((result) => {
        if (!active) return;
        setDeals(result.items);
        setPageCount(Math.max(1, result.totalPages));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code, currentPage]);

  React.useEffect(() => {
    if (previousPageRef.current === currentPage) return;

    previousPageRef.current = currentPage;
    dealsSectionRef.current?.scrollIntoView({ block: "start" });
  }, [currentPage]);

  const setPage = (page: number) => {
    const nextSearchParams = new URLSearchParams(searchParams);

    if (page <= 1) {
      nextSearchParams.delete("page");
    } else {
      nextSearchParams.set("page", String(page));
    }

    setSearchParams(nextSearchParams);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: "Accueil", href: "/" },
          { label: "Offres à prix réduit" },
        ]}
      />
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning-surface border border-warning-border text-warning text-xs font-bold mb-2">
          <Tag className="w-icon-sm h-icon-sm text-warning" />
          {t("legal.legalPages.offresVerifieesAPrixReduits")}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main">
          Les meilleures réductions du moment ({deals.length})
        </h1>
        <p className="text-xs sm:text-sm text-text-tertiary mt-1">
          {t("legal.legalPages.articlesDontLePrixA")}
        </p>
      </div>

      {/* The card titles are h3, so the results grid needs its own section
          heading rather than jumping straight from the page h1. */}
      <section
        ref={dealsSectionRef}
        aria-labelledby="deals-results-heading"
        className="scroll-mt-40"
      >
        <h2 id="deals-results-heading" className="sr-only">
          {t("legal.legalPages.annoncesEnPromotion")}
        </h2>
        <div
          role="region"
          aria-label={t("legal.legalPages.annoncesEnPromotion")}
        >
          <ListingGrid fluid>
            {deals.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ListingGrid>
          {loading ? (
            <p
              role="status"
              className="py-8 text-center text-xs text-text-tertiary"
            >
              Chargement des offres…
            </p>
          ) : null}
        </div>

        {pageCount > 1 && (
          <nav
            aria-label={t("legal.legalPages.paginationLabel")}
            className="mt-6 flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              leftIcon={<ChevronLeft className="h-icon-sm w-icon-sm" />}
            >
              {t("legal.legalPages.previousPage")}
            </Button>
            <span
              aria-live="polite"
              className="min-w-24 text-center text-xs font-semibold text-text-supporting"
            >
              {t("legal.legalPages.pageStatus", {
                current: currentPage,
                total: pageCount,
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}
              rightIcon={<ChevronRight className="h-icon-sm w-icon-sm" />}
            >
              {t("legal.legalPages.nextPage")}
            </Button>
          </nav>
        )}
      </section>
    </div>
  );
};
