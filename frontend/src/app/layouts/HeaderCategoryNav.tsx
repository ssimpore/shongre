import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { routes } from "../../configuration/routes";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../../design-system/utils/controlMetrics";
import { useTranslation } from "../../i18n/I18nProvider";
import type { MessageKey } from "../../i18n/messages.fr";
import {
  getTaxonomyLabel,
  taxonomyService,
} from "../../domains/taxonomy/taxonomy.service";

interface HeaderCategoryNavProps {
  activeCategorySlug?: string;
  currentPath: string;
  onSelectCategory: (categorySlug: string) => void;
}

type HeaderNavItem =
  | { kind: "category"; labelKey: MessageKey; slug: string }
  | { kind: "link"; labelKey: MessageKey; to: string; emphasis?: boolean };

/**
 * The intentionally edited set of primary marketplace destinations.
 *
 * The full taxonomy remains available from "Autres" and the category picker;
 * this row is navigation, not a dump of every taxonomy root. Keeping the
 * collection outside the component also prevents rebuilding it on each render.
 */
const HEADER_NAV_ITEMS: readonly HeaderNavItem[] = [
  { kind: "category", labelKey: "nav.category.immobilier", slug: "immobilier" },
  { kind: "category", labelKey: "nav.category.vehicules", slug: "vehicules" },
  {
    kind: "category",
    labelKey: "nav.category.materielPro",
    slug: "materiel-professionnel",
  },
  { kind: "category", labelKey: "nav.category.emploi", slug: "emploi" },
  { kind: "category", labelKey: "nav.category.mode", slug: "mode-accessoires" },
  {
    kind: "category",
    labelKey: "nav.category.maisonJardin",
    slug: "maison-jardin",
  },
  {
    kind: "category",
    labelKey: "nav.category.famille",
    slug: "bebe-puericulture-enfants",
  },
  {
    kind: "category",
    labelKey: "nav.category.electronique",
    slug: "multimedia-electronique",
  },
  {
    kind: "category",
    labelKey: "nav.category.loisirs",
    slug: "loisirs-culture",
  },
  { kind: "link", labelKey: "nav.category.autres", to: routes.categories() },
  { kind: "link", labelKey: "nav.category.cours", to: routes.courses.search() },
  {
    kind: "link",
    labelKey: "nav.category.bonsPlans",
    to: "/bons-plans",
    emphasis: true,
  },
];

/**
 * Editorial category navigation used directly below the global search header.
 * It deliberately uses text links and separators rather than filter chips:
 * the header is an information architecture surface, while the results page
 * owns the richer filtering controls.
 */
export const HeaderCategoryNav: React.FC<HeaderCategoryNavProps> = ({
  activeCategorySlug,
  currentPath,
  onSelectCategory,
}) => {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeItem = scrollContainerRef.current.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    activeItem?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeCategorySlug, currentPath]);

  return (
    <div
      ref={scrollContainerRef}
      role="region"
      aria-label={t("nav.categoryNavigation")}
      className="no-scrollbar overflow-x-auto scroll-smooth"
    >
      <ul className="flex min-h-control-md w-max min-w-full items-stretch justify-start sm:justify-center">
        {HEADER_NAV_ITEMS.map((item, index) => {
          const taxonomyNode =
            item.kind === "category"
              ? taxonomyService.getNodeBySlug(item.slug)
              : undefined;
          const label = taxonomyNode
            ? getTaxonomyLabel(taxonomyNode, "compact")
            : t(item.labelKey);
          const isActive =
            item.kind === "category"
              ? item.slug === "vehicules"
                ? currentPath.startsWith("/auto") ||
                  item.slug === activeCategorySlug
                : item.slug === "immobilier"
                  ? currentPath.startsWith("/immo") ||
                    item.slug === activeCategorySlug
                  : item.slug === "emploi"
                    ? currentPath.startsWith("/emploi") ||
                      item.slug === activeCategorySlug
                    : item.slug === activeCategorySlug
              : currentPath === item.to;
          const destination =
            item.kind === "category"
              ? item.slug === "vehicules"
                ? routes.auto.search()
                : item.slug === "immobilier"
                  ? routes.immo.search()
                  : item.slug === "emploi"
                    ? routes.employment.search()
                    : routes.search({ category: item.slug })
              : item.to;

          return (
            <React.Fragment key={item.labelKey}>
              {index > 0 && (
                <li
                  aria-hidden="true"
                  className="flex items-center px-1.5 text-sm font-bold text-stone-700"
                >
                  ·
                </li>
              )}
              <li className="flex shrink-0">
                <Link
                  to={destination}
                  onClick={(event) => {
                    if (item.kind !== "category") return;
                    if (item.slug === "vehicules") return;
                    if (item.slug === "immobilier") return;
                    if (item.slug === "emploi") return;
                    if (
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) {
                      return;
                    }
                    event.preventDefault();
                    onSelectCategory(item.slug);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative inline-flex min-h-control-md items-center whitespace-nowrap rounded-control px-1.5 text-sm tracking-tight ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} focus-visible:bg-primary-light focus-visible:ring-2 focus-visible:ring-primary/20 ${
                    isActive
                      ? "bg-primary-light font-bold text-primary after:absolute after:inset-x-1.5 after:bottom-0 after:h-0.5 after:rounded-sm after:bg-primary md:after:inset-x-2"
                      : item.kind === "link" && item.emphasis
                        ? "font-bold text-stone-900 hover:bg-primary-light hover:text-primary"
                        : "font-medium text-stone-800 hover:bg-bg-subtle hover:text-primary"
                  }`}
                >
                  {label}
                </Link>
              </li>
            </React.Fragment>
          );
        })}
      </ul>
    </div>
  );
};
