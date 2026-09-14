import { routes } from "../../configuration/routes";
import React from "react";

import { AlertCircle, Home, Search, ArrowRight } from "lucide-react";
import { Button } from "../../design-system/primitives/Button";
import { CategoryIcon } from "../../design-system/primitives/CategoryIcon";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.labels";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useRootTaxonomyCategories } from "../../hooks/useRootTaxonomyCategories";
import { useTranslation } from "../../i18n/I18nProvider";
import { Link, useLocation } from "react-router-dom";
import { resolveNotFoundPresentation } from "../../platform/seo/not-found-presentation";

/**
 * A 404 that offers a way forward.
 *
 * This page used to be an icon, a sentence and two buttons — 120 characters of
 * content for a visitor who has, by definition, just failed to find something.
 * A marketplace's dead end is the cheapest place to recover a session: the
 * person arrived with an intent, and the catalogue is one click away.
 *
 * So the two original actions stay, and the root categories are offered beneath
 * them. They come from the taxonomy service rather than a hardcoded list, so the
 * page cannot drift from the catalogue it points into.
 */
export const NotFoundPage: React.FC = () => {
  const { locale, t } = useTranslation();
  const location = useLocation();
  /* The same copy the server 404 boundary resolves, so a dead listing says
     "Annonce introuvable" and points at `/recherche` on both paths instead of
     the generic wording drifting from the per-resource wording. */
  const presentation = resolveNotFoundPresentation(
    undefined,
    location.pathname,
  );
  usePageMeta({
    title: presentation.title,
    description: presentation.description,
    noIndex: true,
  });

  const { categories: rootCategories } = useRootTaxonomyCategories(locale);
  const categories = rootCategories.slice(0, 8);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20 space-y-10">
      <div className="text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="w-8 h-8" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-text-main">
            {presentation.title}
          </h1>
          <p className="text-xs sm:text-sm text-text-tertiary mt-2 leading-relaxed max-w-md mx-auto">
            {presentation.description}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            to={presentation.returnHref}
            variant="primary"
            leftIcon={<Home className="w-icon-md h-icon-md" />}
          >
            {presentation.returnLabel}
          </Button>
          <Button
            to={routes.search()}
            variant="outline"
            leftIcon={<Search className="w-icon-md h-icon-md" />}
          >
            {t("errors.notFoundPage.rechercherUneAnnonce")}
          </Button>
        </div>
      </div>

      {categories.length > 0 && (
        <section aria-labelledby="not-found-categories" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="not-found-categories"
              className="text-sm font-bold text-text-main"
            >
              {t("errors.notFoundPage.explorerLesCategories")}
            </h2>
            <Link
              to={routes.categories()}
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 min-h-6"
            >
              {t("errors.notFoundPage.toutesLesCategories")}
              <ArrowRight className="w-icon-sm h-icon-sm" aria-hidden="true" />
            </Link>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  to={routes.category(cat.slug)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-bg-surface border border-border-base hover:border-primary-border hover:bg-primary-light transition-colors min-h-control-touch"
                >
                  <CategoryIcon category={cat} size="xs" />
                  <span className="text-xs font-semibold text-text-strong truncate">
                    {getTaxonomyLabel(cat, "compact")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
