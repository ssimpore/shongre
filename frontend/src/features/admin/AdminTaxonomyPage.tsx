import { TaxonomyRevisionEditor } from "./taxonomy/components/TaxonomyRevisionEditor";
import { Layers, ListOrdered } from "lucide-react";
import React from "react";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { TaxonomyHeaderNavigationTab } from "./taxonomy/components/TaxonomyHeaderNavigationTab";
import { adminCatalogueFr } from "../../i18n/admin.catalogue.fr";

export const AdminTaxonomyPage: React.FC = () => {
  const { t } = useTranslation(adminCatalogueFr);
  usePageMeta({
    title: t("meta.adminTaxonomy.title"),
    description: t("meta.adminTaxonomy.description"),
    canonicalPath: "/admin/taxonomie",
    noIndex: true,
  });

  return (
    <div className="space-y-6">
      <header className="rounded-card border border-border-base bg-bg-surface p-6 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="rounded-control bg-primary-light p-2 text-primary">
            <Layers className="h-icon-lg w-icon-lg" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-text-main">
              {t("admin.adminTaxonomyPage.gestionAdministrationDeLaTaxonomie")}
            </h1>
            <p className="mt-1 text-xs text-text-tertiary">
              {t("admin.adminTaxonomyPage.referentielCanoniqueUniquePilotantL")}
            </p>
          </div>
        </div>
      </header>

      <TaxonomyRevisionEditor />

      <section
        aria-labelledby="taxonomy-header-navigation-title"
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <ListOrdered className="h-icon-md w-icon-md text-primary" />
          <h2
            id="taxonomy-header-navigation-title"
            className="text-sm font-bold text-text-main"
          >
            Navigation publique par marché
          </h2>
        </div>
        <TaxonomyHeaderNavigationTab />
      </section>
    </div>
  );
};
