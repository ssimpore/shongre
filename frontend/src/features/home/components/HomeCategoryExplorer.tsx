import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { TAXONOMY } from "../../../domains/taxonomy/taxonomy.data";
import { getTaxonomyLabel } from "../../../domains/taxonomy/taxonomy.service";
import { CategoryIcon } from "../../../design-system/primitives/CategoryIcon";
import { Button } from "../../../design-system/primitives/Button";
import { Container } from "../../../design-system/primitives/Layout";
import { routes } from "../../../configuration/routes";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HomeSectionHeading } from "./HomeSectionHeading";

const HOME_CATEGORY_COUNT = 8;

export const HomeCategoryExplorer: React.FC = () => {
  const { t } = useTranslation();
  const categories = TAXONOMY.slice(0, HOME_CATEGORY_COUNT);

  return (
    <Container
      as="section"
      aria-labelledby="home-category-explorer-title"
      data-testid="home-category-explorer"
    >
      <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
        <HomeSectionHeading id="home-category-explorer-title">
          {t("home.homeCategoryExplorer.explorerParCategorie")}
        </HomeSectionHeading>

        <Button
          to={routes.categories()}
          variant="secondary"
          size="sm"
          rightIcon={
            <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
          }
          className="shrink-0"
        >
          <span className="hidden sm:inline">
            {t("home.homeCategoryExplorer.toutesLesCategories")}
          </span>
          <span className="sm:hidden">{t("home.homePage.voirTout")}</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {categories.map((category) => {
          const label = getTaxonomyLabel(category, "compact");

          return (
            <Link
              key={category.id}
              to={routes.category(category.slug)}
              className="group flex min-h-28 flex-col justify-between rounded-card border border-border-base bg-bg-surface p-4 shadow-2xs motion-surface hover:-translate-y-0.5 hover:border-primary-border hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:min-h-32"
              aria-label={`Explorer ${label}`}
            >
              <CategoryIcon
                category={category}
                size="lg"
                withBackground
                className="motion-interactive group-hover:scale-105"
              />

              <span className="flex items-end justify-between gap-2">
                <span className="text-sm font-bold leading-snug text-stone-900 motion-interactive group-hover:text-primary">
                  {label}
                </span>
                <ArrowRight
                  className="h-icon-sm w-icon-sm shrink-0 text-stone-400 motion-interactive group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden="true"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </Container>
  );
};
