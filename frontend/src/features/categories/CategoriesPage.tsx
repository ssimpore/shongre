import React, { useMemo, useState } from "react";
import { IMAGE_SIZES } from "../../design-system/primitives/responsiveImage";
import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { TAXONOMY } from "../../domains/taxonomy/taxonomy.data";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.service";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import type { Category } from "../../types";
import {
  Breadcrumbs,
  Button,
  Container,
  EmptyState,
  Heading,
  Input,
  Image,
} from "../../design-system";

const CATEGORY_VISUALS: Record<string, string> = {
  vehicules: "/images/categories/vehicules.jpg",
  immobilier: "/images/categories/immobilier.jpg",
  emploi: "/images/categories/emploi.jpg",
  services: "/images/categories/services.jpg",
  "maison-jardin": "/images/categories/maison-jardin.jpg",
  "multimedia-electronique": "/images/categories/multimedia-electronique.jpg",
  "mode-accessoires": "/images/categories/mode-accessoires.jpg",
  "bebe-puericulture-enfants":
    "/images/categories/bebe-puericulture-enfants.jpg",
  "loisirs-culture": "/images/categories/loisirs-culture.jpg",
  "sports-plein-air": "/images/categories/sports-plein-air.jpg",
  "animaux-accessoires": "/images/categories/animaux-accessoires.jpg",
  "materiel-professionnel": "/images/categories/materiel-professionnel.jpg",
  "materiel-agricole-espaces-verts":
    "/images/categories/materiel-agricole-espaces-verts.jpg",
  "energie-solaire-transition":
    "/images/categories/energie-solaire-transition.jpg",
  "informatique-pro-serveurs":
    "/images/categories/informatique-pro-serveurs.jpg",
  "dons-et-objets-gratuits": "/images/categories/dons-et-objets-gratuits.jpg",
};

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
  const visualSrc =
    CATEGORY_VISUALS[category.slug] ??
    CATEGORY_VISUALS["dons-et-objets-gratuits"];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs transition duration-normal hover:-translate-y-0.5 hover:border-primary-border hover:shadow-md focus-within:border-primary-border focus-within:ring-2 focus-within:ring-primary/15 motion-reduce:transform-none">
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
          priority={priority}
          sizes={IMAGE_SIZES.card}
          className="h-full w-full object-cover transition duration-slow group-hover:scale-105 motion-reduce:transform-none"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/25 to-transparent" />
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div>
          <Link
            to={`/categorie/${category.slug}`}
            className="inline-flex rounded-sm text-lg font-black leading-tight text-stone-950 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {categoryLabel}
          </Link>
          <p className="mt-1 text-xs font-semibold text-stone-500">
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
                className="inline-flex min-h-7 max-w-full items-center rounded-control border border-border-base bg-bg-base px-2.5 py-1 text-micro font-semibold text-stone-600 transition-colors hover:border-primary-border hover:bg-primary-light hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                title={getTaxonomyLabel(subCategory, "compact")}
              >
                <span className="truncate">
                  {getTaxonomyLabel(subCategory, "compact")}
                </span>
              </Link>
            ))}
            {hiddenSubCategoryCount > 0 && (
              <span className="inline-flex min-h-7 items-center px-1 text-micro font-bold text-stone-500">
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
            className="flex min-h-9 items-center justify-between border-t border-border-subtle pt-3 text-xs font-bold text-stone-800 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
  const { t } = useTranslation();
  usePageMeta({
    title: "Toutes les catégories d'annonces",
    description:
      "Parcourez toutes les catégories d'annonces Shongre dans votre marché : véhicules, immobilier, mode, maison, multimédia, loisirs, emploi et services.",
    canonicalPath: "/categories",
  });

  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return TAXONOMY;
    const normalizedQuery = searchQuery.toLocaleLowerCase().trim();

    return TAXONOMY.filter((category) => {
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
  }, [searchQuery]);

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
              <Heading as="h1" size="display-sm" family="display">
                {t("categories.categoriesPage.toutesNosCategories")}
              </Heading>
              <p className="max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
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
            className="text-xs font-medium text-stone-500 sm:text-sm"
            aria-live="polite"
          >
            <strong className="font-bold text-stone-700">
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

        {filteredCategories.length > 0 ? (
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
