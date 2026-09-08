import React, { useMemo, useState } from "react";
import { IMAGE_SIZES } from "@shongre/shared";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Search } from "lucide-react";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.labels";
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
  const visualSrc = resolveCategoryPublicMediaUrl(category.slug);

  return (
    <Link
      to={`/categorie/${category.slug}`}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-listing-card border border-border-base bg-bg-surface shadow-xs motion-surface hover:-translate-y-0.5 hover:border-primary-border hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={t("categories.categoriesPage.explorerLaCategorie", {
        category: categoryLabel,
      })}
    >
      <div className="aspect-4/3 shrink-0 overflow-hidden bg-bg-subtle">
        <Image
          src={visualSrc}
          alt=""
          width={800}
          height={500}
          priority={priority}
          sizes={IMAGE_SIZES.compact}
          className="h-full w-full object-cover motion-surface group-hover:scale-105"
        />
      </div>

      <div className="p-3">
        <p className="text-micro font-semibold text-text-secondary">
          {t("categories.categoriesPage.rubriques", {
            count: subCategories.length,
          })}
        </p>
        <h2 className="mt-1 text-sm font-bold text-text-main">
          {categoryLabel}
        </h2>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
          {t("categories.categoriesPage.explorer")}
          <ArrowRight aria-hidden="true" className="h-icon-xs w-icon-xs" />
        </span>
      </div>
    </Link>
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
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
            aria-busy="true"
          >
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-listing-card border border-border-base bg-bg-surface shadow-xs"
              >
                <Skeleton className="aspect-4/3 rounded-none" />
                <div className="p-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="mt-1 h-5 w-3/4" />
                  <Skeleton className="mt-3 h-4 w-1/3" />
                </div>
              </div>
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
          <div
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
            data-testid="categories-grid"
          >
            {filteredCategories.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                priority={index < 5}
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
