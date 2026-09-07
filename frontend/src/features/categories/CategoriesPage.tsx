import React, { useMemo, useState } from "react";
import { IMAGE_SIZES } from "@shongre/shared";
import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.service";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useRootTaxonomyCategories } from "../../hooks/useRootTaxonomyCategories";
import { useTranslation } from "../../i18n/I18nProvider";
import { resolveCategoryPublicMediaUrl } from "../../platform/runtime-config/public-runtime-config";
import type { Category } from "../../types";
import {
  Breadcrumbs,
  Button,
  Container,
  EmptyState,
  Heading,
  Input,
  Image,
  Skeleton,
} from "../../design-system";

interface CategoryCardProps {
  category: Category;
  priority: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, priority }) => {
  const { t } = useTranslation();
  const categoryLabel = getTaxonomyLabel(category, "compact");
  const subCategories = category.subCategories ?? [];
  const visibleSubCategories = subCategories.slice(0, 3);
  const hiddenSubCategoryCount = Math.max(
    subCategories.length - visibleSubCategories.length,
    0,
  );
  const visualSrc = resolveCategoryPublicMediaUrl(category.slug);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs transition duration-normal hover:-translate-y-0.5 hover:border-primary-border hover:shadow-md focus-within:border-primary-border focus-within:ring-2 focus-within:ring-primary-ring motion-reduce:transform-none">
      <Link
        to={`/categorie/${category.slug}`}
        className="relative block aspect-16/10 overflow-hidden bg-bg-subtle focus-visible:outline-none"
        aria-label={t("categories.categoriesPage.explorerLaCategorie", {
          category: categoryLabel,
        })}
      >
        <Image
          src={visualSrc}
          alt=""
          width={800}
          height={500}
          priority={priority}
          sizes={IMAGE_SIZES.card}
          className="h-full w-full object-cover transition duration-slow group-hover:scale-105 motion-reduce:transform-none"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-surface-overlay-deep/25 to-transparent" />
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div>
          <Link
            to={`/categorie/${category.slug}`}
            className="inline-flex rounded-sm text-lg font-bold leading-tight text-text-deep transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {categoryLabel}
          </Link>
          <p className="mt-1 text-xs font-semibold text-text-tertiary">
            {t("categories.categoriesPage.rubriques", {
              count: subCategories.length,
            })}
          </p>
        </div>

        {visibleSubCategories.length > 0 && (
          <div
            className="mt-4 flex flex-wrap gap-1.5"
            aria-label={categoryLabel}
          >
            {visibleSubCategories.map((subCategory) => (
              <Link
                key={subCategory.id}
                to={`/categorie/${category.slug}?subCategory=${subCategory.slug}`}
                className="inline-flex min-h-7 max-w-full items-center rounded-control border border-border-base bg-bg-base px-2.5 py-1 text-micro font-semibold text-text-supporting transition-colors hover:border-primary-border hover:bg-primary-light hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                title={getTaxonomyLabel(subCategory, "compact")}
              >
                <span className="truncate">
                  {getTaxonomyLabel(subCategory, "compact")}
                </span>
              </Link>
            ))}
            {hiddenSubCategoryCount > 0 && (
              <span className="inline-flex min-h-7 items-center px-1 text-micro font-bold text-text-tertiary">
                {t("categories.categoriesPage.rubriquesSupplementaires", {
                  count: hiddenSubCategoryCount,
                })}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-5">
          <Link
            to={`/categorie/${category.slug}`}
            className="flex min-h-9 items-center justify-between border-t border-border-subtle pt-3 text-xs font-bold text-text-strong transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span>
              {t("categories.categoriesPage.explorerLaCategorie", {
                category: categoryLabel,
              })}
            </span>
            <ChevronRight
              aria-hidden="true"
              className="h-icon-md w-icon-md transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
            />
          </Link>
        </div>
      </div>
    </article>
  );
};

export const CategoriesPage: React.FC = () => {
  const { locale, t } = useTranslation();
  usePageMeta({
    title: "Toutes les catégories d'annonces",
    description:
      "Parcourez toutes les catégories d'annonces Shongre dans votre marché : véhicules, immobilier, mode, maison, multimédia, loisirs, emploi et services.",
    canonicalPath: "/categories",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const {
    categories,
    error: categoriesError,
    isLoading: categoriesLoading,
    reload: reloadCategories,
  } = useRootTaxonomyCategories(locale);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const normalizedQuery = searchQuery.toLocaleLowerCase().trim();

    return categories.filter((category) => {
      const matchesCategory =
        category.name.toLocaleLowerCase().includes(normalizedQuery) ||
        getTaxonomyLabel(category, "compact")
          .toLocaleLowerCase()
          .includes(normalizedQuery) ||
        category.slug.toLocaleLowerCase().includes(normalizedQuery) ||
        category.description?.toLocaleLowerCase().includes(normalizedQuery);

      const matchesSubCategory = category.subCategories?.some(
        (subCategory) =>
          subCategory.name.toLocaleLowerCase().includes(normalizedQuery) ||
          getTaxonomyLabel(subCategory, "compact")
            .toLocaleLowerCase()
            .includes(normalizedQuery) ||
          subCategory.slug.toLocaleLowerCase().includes(normalizedQuery),
      );

      return matchesCategory || matchesSubCategory;
    });
  }, [categories, searchQuery]);

  return (
    <div className="min-h-screen bg-bg-base pb-20">
      <div className="border-b border-border-base bg-bg-surface">
        <Container className="py-3">
          <Breadcrumbs
            items={[
              { label: t("nav.home"), href: "/" },
              { label: t("categories.categoriesPage.toutesLesCategories") },
            ]}
          />
        </Container>
      </div>

      <section className="border-b border-border-base bg-bg-surface py-8 sm:py-10">
        <Container>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2.5">
              <Heading as="h1" size="display-sm">
                {t("categories.categoriesPage.toutesNosCategories")}
              </Heading>
              <p className="max-w-xl text-sm leading-relaxed text-text-supporting sm:text-base">
                {t("categories.categoriesPage.explorezLEnsembleDesCategories")}
              </p>
            </div>

            <div className="w-full shrink-0 sm:w-96">
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t(
                  "categories.categoriesPage.filtrerUneCategorieSousCategorie",
                )}
                aria-label={t(
                  "categories.categoriesPage.filtrerUneCategorieSousCategorie",
                )}
                leftIcon={
                  <Search aria-hidden="true" className="h-icon-md w-icon-md" />
                }
                className="h-control-touch bg-bg-base shadow-2xs"
              />
            </div>
          </div>
        </Container>
      </section>

      <Container className="mt-7 sm:mt-9">
        <div className="mb-5 flex items-center justify-between gap-4">
          <p
            className="text-xs font-medium text-text-tertiary sm:text-sm"
            aria-live="polite"
          >
            <strong className="font-bold text-text-emphasis">
              {t("categories.categoriesPage.univers", {
                count: filteredCategories.length,
              })}
            </strong>
            {searchQuery.trim() && (
              <span>
                {" "}
                {t("categories.categoriesPage.pourLaRecherche", {
                  query: searchQuery.trim(),
                })}
              </span>
            )}
          </p>

          <Link
            to="/recherche"
            className="inline-flex min-h-7 shrink-0 items-center gap-1 whitespace-nowrap text-xs font-bold text-primary transition-colors hover:text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
          >
            <span className="hidden sm:inline">
              {t("categories.categoriesPage.voirToutesLesAnnonces")}
            </span>
            <span className="sm:hidden">
              {t("categories.categoriesPage.voirTout")}
            </span>
            <ChevronRight aria-hidden="true" className="h-icon-md w-icon-md" />
          </Link>
        </div>

        {categoriesLoading ? (
          <div
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
            aria-busy="true"
          >
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="aspect-4/3 rounded-2xl" />
            ))}
          </div>
        ) : categoriesError ? (
          <EmptyState
            icon={<Search aria-hidden="true" className="h-icon-xl w-icon-xl" />}
            title={t("categories.categoriesPage.catalogueIndisponible")}
            description={t(
              "categories.categoriesPage.catalogueIndisponibleDescription",
            )}
            action={
              <Button variant="pro" size="sm" onClick={reloadCategories}>
                {t("common.retry")}
              </Button>
            }
            className="mx-auto max-w-md"
          />
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCategories.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                priority={index < 4}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search aria-hidden="true" className="h-icon-xl w-icon-xl" />}
            title={t("categories.categoriesPage.aucuneCategorieTrouvee")}
            description={t(
              "categories.categoriesPage.aucuneCategorieNeCorrespond",
              { query: searchQuery.trim() },
            )}
            action={
              <Button
                variant="pro"
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                {t("categories.categoriesPage.afficherToutesLesCategories")}
              </Button>
            }
            className="mx-auto max-w-md"
          />
        )}
      </Container>
    </div>
  );
};
