import { breakpoints, motionDurationMs } from "@shongre/design-tokens";
import type {
  MarketContext,
  TaxonomyHeaderCategoryItem,
} from "@shongre/contracts";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import { routes } from "../../configuration/routes";
import { CategoryIcon } from "../../design-system/primitives/CategoryIcon";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../../design-system/utils/controlMetrics";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.labels";
import type { TaxonomyNode } from "../../domains/taxonomy/taxonomy.types";
import { useTranslation } from "../../i18n/I18nProvider";
import type { MessageKey } from "../../i18n/messages.fr";
import {
  hasCategoryMenuContent,
  loadCategoryNavigationBranch,
  loadCategoryNavigationOverview,
} from "./categoryMegaMenu.model";

interface HeaderCategoryNavProps {
  activeCategorySlug?: string;
  currentPath: string;
  initialCategories?: TaxonomyHeaderCategoryItem[];
  marketContext: MarketContext;
  marketCode: string;
  disabledCategorySlugs?: readonly string[];
  disabledSubCategorySlugs?: readonly string[];
  onSelectCategory: (categorySlug: string) => void;
}

type HeaderNavItem =
  | ({ kind: "category" } & TaxonomyHeaderCategoryItem)
  | { kind: "overview"; labelKey: MessageKey; to: string }
  | { kind: "link"; labelKey: MessageKey; to: string; emphasis?: boolean };

const HEADER_UTILITY_ITEMS: readonly HeaderNavItem[] = [
  {
    kind: "overview",
    labelKey: "nav.category.autres",
    to: routes.categories(),
  },
  {
    kind: "link",
    labelKey: "nav.category.bonsPlans",
    to: routes.deals(),
    emphasis: true,
  },
];

function localizedHeaderCategoryLabel(
  item: TaxonomyHeaderCategoryItem,
  locale: string,
): string {
  const language = locale.split("-")[0];
  const localizedEntry = (values: Record<string, string>) =>
    values[locale] ??
    Object.entries(values).find(
      ([key]) => key.split("-")[0] === language,
    )?.[1] ??
    values["fr-FR"] ??
    Object.values(values)[0];
  return (
    localizedEntry(item.shortLabels) ?? localizedEntry(item.labels) ?? item.slug
  );
}

const CATEGORY_MENU_ID = "header-category-mega-menu";
const OVERVIEW_MENU_KEY = "autres";
const EMPTY_DISABLED_CATEGORY_KEYS: readonly string[] = [];
const categoryTriggerId = (slug: string) => `header-category-trigger-${slug}`;

const getDedicatedRootDestination = (slug: string): string | undefined => {
  if (slug === "vehicules") return routes.auto.search();
  if (slug === "immobilier") return routes.immo.search();
  if (slug === "emploi") return routes.employment.search();
  if (slug === "education") return routes.courses.search();
  return undefined;
};

const getRootCategoryDestination = (slug: string): string => {
  return getDedicatedRootDestination(slug) ?? routes.search({ category: slug });
};

const getTaxonomyDestination = (
  root: TaxonomyNode,
  node?: TaxonomyNode,
): string => {
  if (!node || node.id === root.id) {
    return getRootCategoryDestination(root.slug);
  }
  return routes.category(root.slug, { subCategory: node.slug });
};

const collectDescendants = (
  node: TaxonomyNode,
  depth = 1,
  maxDepth = Number.POSITIVE_INFINITY,
): Array<{ node: TaxonomyNode; depth: number }> =>
  (node.children ?? []).flatMap((child) => [
    { node: child, depth },
    ...(depth < maxDepth ? collectDescendants(child, depth + 1, maxDepth) : []),
  ]);

const useDesktopCategoryMenu = (): boolean => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const breakpointValue = Number.parseFloat(breakpoints.lg);
    const breakpointPixels = breakpoints.lg.endsWith("rem")
      ? breakpointValue *
        Number.parseFloat(
          window.getComputedStyle(document.documentElement).fontSize,
        )
      : breakpointValue;
    // WebKit subtracts its classic scrollbar from CSS media-query width. Use
    // the actual browser viewport here so a 1024px desktop remains on the
    // desktop side of the shared 64rem token in every engine.
    const sync = () => setIsDesktop(window.innerWidth >= breakpointPixels);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return isDesktop;
};

interface CategoryGroupProps {
  root: TaxonomyNode;
  node: TaxonomyNode;
  maxDepth?: number;
  onNavigate: () => void;
}

const CategoryGroup: React.FC<CategoryGroupProps> = ({
  root,
  node,
  maxDepth,
  onNavigate,
}) => {
  const { locale, t } = useTranslation();
  const descendants = collectDescendants(node, 1, maxDepth);
  const headingId = `category-mega-menu-group-${node.id.replaceAll(".", "-")}`;

  return (
    <section role="group" aria-labelledby={headingId} className="min-w-0">
      <h3
        id={headingId}
        role="presentation"
        className="text-sm font-extrabold text-stone-950"
      >
        <Link
          role="menuitem"
          to={getTaxonomyDestination(root, node)}
          onClick={onNavigate}
          className={`inline-flex max-w-full rounded-sm hover:text-primary ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
        >
          <span className="truncate">
            {getTaxonomyLabel(node, { compact: true, locale })}
          </span>
        </Link>
      </h3>

      {descendants.length > 0 && (
        <ul role="none" className="mt-2 space-y-1">
          {descendants.map(({ node: child, depth }) => (
            <li role="none" key={child.id}>
              <Link
                role="menuitem"
                to={getTaxonomyDestination(root, child)}
                onClick={onNavigate}
                className={`block min-h-7 rounded-control py-1 pr-2 text-sm font-medium leading-5 text-stone-600 hover:bg-bg-subtle hover:text-primary ${depth > 1 ? "pl-4" : "pl-2"} ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
              >
                {getTaxonomyLabel(child, { compact: true, locale })}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {descendants.length > 0 && (
        <Link
          role="menuitem"
          to={getTaxonomyDestination(root, node)}
          onClick={onNavigate}
          className={`mt-2 inline-flex min-h-7 items-center rounded-control px-2 py-1 text-xs font-bold text-primary hover:bg-primary-light hover:text-primary-hover ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
        >
          {t("categories.categoriesPage.voirTout")}
        </Link>
      )}
    </section>
  );
};

interface CategoryMegaMenuSidebarProps {
  root: TaxonomyNode;
  onNavigate: () => void;
}

const CategoryMegaMenuSidebar: React.FC<CategoryMegaMenuSidebarProps> = ({
  root,
  onNavigate,
}) => {
  const { locale, t } = useTranslation();
  const label = getTaxonomyLabel(root, { compact: true, locale });

  return (
    <div
      role="group"
      aria-label={label}
      className="min-w-0 border-l-4 border-primary bg-bg-subtle p-5 xl:p-6"
    >
      <p className="text-micro font-extrabold uppercase tracking-wider text-stone-700">
        {t("nav.category.active")}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <CategoryIcon category={root} size="md" withBackground />
        <h2
          role="presentation"
          className="min-w-0 text-base font-extrabold text-stone-950"
        >
          {label}
        </h2>
      </div>
      {root.description && (
        <p className="mt-4 text-xs leading-relaxed text-stone-600">
          {root.description}
        </p>
      )}
      <Link
        role="menuitem"
        to={getTaxonomyDestination(root)}
        onClick={onNavigate}
        className={`mt-5 inline-flex min-h-8 items-center rounded-control bg-bg-surface px-3 py-1.5 text-xs font-bold text-primary shadow-2xs hover:bg-primary-light hover:text-primary-hover ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
      >
        {t("categories.categoriesPage.voirToutesLesAnnonces")}
      </Link>
    </div>
  );
};

interface CategoryMegaMenuProps {
  root: TaxonomyNode;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onNavigate: () => void;
}

const CategoryMegaMenu: React.FC<CategoryMegaMenuProps> = ({
  root,
  menuRef,
  onKeyDown,
  onNavigate,
}) => {
  const { locale } = useTranslation();
  const label = getTaxonomyLabel(root, { compact: true, locale });

  return (
    <div
      ref={menuRef}
      id={CATEGORY_MENU_ID}
      role="menu"
      aria-label={label}
      aria-labelledby={categoryTriggerId(root.slug)}
      data-active-category={root.slug}
      onKeyDown={onKeyDown}
      className="absolute inset-x-0 top-full z-dropdown block max-h-menu-max min-w-0 overflow-y-auto overscroll-contain rounded-b-card border border-t-0 border-border-base bg-bg-surface shadow-dropdown"
    >
      <div
        role="presentation"
        className="grid min-w-0 grid-cols-sidebar-compact"
      >
        <CategoryMegaMenuSidebar root={root} onNavigate={onNavigate} />
        <div
          role="presentation"
          className="grid min-w-0 grid-cols-2 content-start gap-x-8 gap-y-6 p-6 xl:grid-cols-3 xl:p-7"
        >
          {(root.children ?? []).map((node) => (
            <CategoryGroup
              key={node.id}
              root={root}
              node={node}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface CategoryOverviewMenuProps {
  roots: TaxonomyNode[];
  menuRef: React.RefObject<HTMLDivElement | null>;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onNavigate: () => void;
}

const CategoryOverviewMenu: React.FC<CategoryOverviewMenuProps> = ({
  roots,
  menuRef,
  onKeyDown,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const label = t("categories.categoriesPage.toutesLesCategories");

  return (
    <div
      ref={menuRef}
      id={CATEGORY_MENU_ID}
      role="menu"
      aria-label={label}
      aria-labelledby={categoryTriggerId(OVERVIEW_MENU_KEY)}
      data-active-category={OVERVIEW_MENU_KEY}
      onKeyDown={onKeyDown}
      className="absolute inset-x-0 top-full z-dropdown block max-h-menu-max min-w-0 overflow-y-auto overscroll-contain rounded-b-card border border-t-0 border-border-base bg-bg-surface shadow-dropdown"
    >
      <div
        role="presentation"
        className="grid min-w-0 grid-cols-sidebar-compact"
      >
        <div
          role="group"
          aria-label={label}
          className="min-w-0 border-l-4 border-primary bg-bg-subtle p-5 xl:p-6"
        >
          <p className="text-micro font-extrabold uppercase tracking-wider text-stone-700">
            {t("nav.category.autres")}
          </p>
          <h2
            role="presentation"
            className="mt-3 text-base font-extrabold text-stone-950"
          >
            {label}
          </h2>
          <Link
            role="menuitem"
            to={routes.categories()}
            onClick={onNavigate}
            className={`mt-5 inline-flex min-h-8 items-center rounded-control bg-bg-surface px-3 py-1.5 text-xs font-bold text-primary shadow-2xs hover:bg-primary-light hover:text-primary-hover ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
          >
            {t("categories.categoriesPage.voirTout")}
          </Link>
        </div>
        <div
          role="presentation"
          className="grid min-w-0 grid-cols-2 content-start gap-x-8 gap-y-6 p-6 xl:grid-cols-3 xl:p-7"
        >
          {roots.map((root) => (
            <CategoryGroup
              key={root.id}
              root={root}
              node={root}
              maxDepth={1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Editorial category navigation used directly below the global search header.
 * The horizontal rail remains the compact mobile interaction. At the desktop
 * breakpoint, its taxonomy-backed category links also disclose a shared
 * overlay panel without adding another navigation registry.
 */
export const HeaderCategoryNav: React.FC<HeaderCategoryNavProps> = ({
  activeCategorySlug,
  currentPath,
  initialCategories = [],
  marketContext,
  marketCode,
  disabledCategorySlugs = EMPTY_DISABLED_CATEGORY_KEYS,
  disabledSubCategorySlugs = EMPTY_DISABLED_CATEGORY_KEYS,
  onSelectCategory,
}) => {
  const { locale, t } = useTranslation();
  const isDesktop = useDesktopCategoryMenu();
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef(new Map<string, HTMLAnchorElement>());
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextFocusOpenRef = useRef(false);
  const [branchesBySlug, setBranchesBySlug] = useState<
    ReadonlyMap<string, TaxonomyNode>
  >(() => new Map());
  const [headerCategories, setHeaderCategories] = useState<
    TaxonomyHeaderCategoryItem[]
  >(() =>
    [...initialCategories].sort(
      (left, right) => left.displayOrder - right.displayOrder,
    ),
  );
  const [overviewRoots, setOverviewRoots] = useState<TaxonomyNode[]>([]);
  const [activeMenuSlug, setActiveMenuSlug] = useState<string | null>(null);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current === null) return;
    clearTimeout(openTimerRef.current);
    openTimerRef.current = null;
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const closeMenu = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    setActiveMenuSlug(null);
  }, [clearCloseTimer, clearOpenTimer]);

  const scheduleClose = useCallback(() => {
    clearOpenTimer();
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setActiveMenuSlug(null);
    }, motionDurationMs.fast);
  }, [clearCloseTimer, clearOpenTimer]);

  const hasMenuContent = useCallback(
    (menuKey: string) =>
      menuKey === OVERVIEW_MENU_KEY
        ? overviewRoots.length > 0
        : hasCategoryMenuContent(branchesBySlug.get(menuKey)),
    [branchesBySlug, overviewRoots.length],
  );

  const openMenu = useCallback(
    (slug: string, immediate = false) => {
      if (!isDesktop || !hasMenuContent(slug)) {
        return;
      }

      clearCloseTimer();
      clearOpenTimer();
      if (immediate) {
        setActiveMenuSlug(slug);
        return;
      }
      if (activeMenuSlug === slug) return;

      openTimerRef.current = setTimeout(() => {
        openTimerRef.current = null;
        setActiveMenuSlug(slug);
      }, motionDurationMs.fast);
    },
    [
      activeMenuSlug,
      clearCloseTimer,
      clearOpenTimer,
      hasMenuContent,
      isDesktop,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    const normalizedMarketCode = marketCode.toUpperCase();
    const disabledKeys = new Set(
      [...disabledCategorySlugs, ...disabledSubCategorySlugs].map((value) =>
        value.toLowerCase(),
      ),
    );
    const isAvailable = (node: TaxonomyNode) => {
      const marketStatus =
        node.marketOverrides?.[normalizedMarketCode]?.status ?? node.status;
      return (
        marketStatus === "active" &&
        !disabledKeys.has(node.id.toLowerCase()) &&
        !disabledKeys.has(node.slug.toLowerCase())
      );
    };

    void services.taxonomy
      .getHeaderNavigation(marketContext)
      .then(async (configuration) => {
        const categories = [...configuration.items].sort(
          (left, right) => left.displayOrder - right.displayOrder,
        );
        const promotedSlugs = new Set(categories.map((item) => item.slug));
        const [branches, overview] = await Promise.all([
          Promise.all(
            categories.map((item) =>
              loadCategoryNavigationBranch(
                services.taxonomy,
                item.slug,
                isAvailable,
              ),
            ),
          ),
          loadCategoryNavigationOverview(
            services.taxonomy,
            promotedSlugs,
            isAvailable,
          ),
        ]);
        return { categories, branches, overview };
      })
      .then(({ categories, branches, overview }) => {
        if (cancelled) return;
        setHeaderCategories(categories);
        setBranchesBySlug(
          new Map(
            branches
              .filter((branch): branch is TaxonomyNode => branch !== null)
              .map((branch) => [branch.slug, branch]),
          ),
        );
        setOverviewRoots(overview);
      })
      .catch(() => {
        if (!cancelled) {
          setHeaderCategories([]);
          setBranchesBySlug(new Map());
          setOverviewRoots([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    disabledCategorySlugs,
    disabledSubCategorySlugs,
    locale,
    marketCode,
    marketContext,
  ]);

  useEffect(() => {
    if (!isDesktop) closeMenu();
  }, [closeMenu, isDesktop]);

  useEffect(() => closeMenu(), [closeMenu, currentPath]);

  useEffect(
    () => () => {
      clearOpenTimer();
      clearCloseTimer();
    },
    [clearCloseTimer, clearOpenTimer],
  );

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

  const activeRoot = useMemo(
    () =>
      activeMenuSlug ? (branchesBySlug.get(activeMenuSlug) ?? null) : null,
    [activeMenuSlug, branchesBySlug],
  );
  const headerNavItems = useMemo<readonly HeaderNavItem[]>(
    () => [
      ...headerCategories.map((category) => ({
        kind: "category" as const,
        ...category,
      })),
      ...HEADER_UTILITY_ITEMS,
    ],
    [headerCategories],
  );

  const focusFirstMenuItem = useCallback((slug: string) => {
    setActiveMenuSlug(slug);
    window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    });
  }, []);

  const handleTopLevelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLAnchorElement>, slug?: string) => {
      if (!isDesktop) return;

      if (slug && event.key === "ArrowDown" && hasMenuContent(slug)) {
        event.preventDefault();
        openMenu(slug, true);
        focusFirstMenuItem(slug);
        return;
      }

      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }

      const items = Array.from(
        rootRef.current?.querySelectorAll<HTMLAnchorElement>(
          '[data-header-nav-item="true"]',
        ) ?? [],
      );
      if (items.length === 0) return;
      event.preventDefault();
      const currentIndex = Math.max(items.indexOf(event.currentTarget), 0);
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : event.key === "ArrowRight"
              ? (currentIndex + 1) % items.length
              : (currentIndex - 1 + items.length) % items.length;
      items[nextIndex]?.focus();
    },
    [focusFirstMenuItem, hasMenuContent, isDesktop, openMenu],
  );

  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ??
          [],
      );
      if (items.length === 0) return;
      event.preventDefault();
      const currentIndex = Math.max(
        items.indexOf(document.activeElement as HTMLElement),
        0,
      );
      const nextIndex =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : event.key === "ArrowDown"
              ? (currentIndex + 1) % items.length
              : (currentIndex - 1 + items.length) % items.length;
      items[nextIndex]?.focus();
    },
    [],
  );

  const handleRootKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Escape" || !activeMenuSlug) return;
      event.preventDefault();
      event.stopPropagation();
      const trigger = triggerRefs.current.get(activeMenuSlug);
      suppressNextFocusOpenRef.current = true;
      closeMenu();
      trigger?.focus();
      window.requestAnimationFrame(() => {
        suppressNextFocusOpenRef.current = false;
      });
    },
    [activeMenuSlug, closeMenu],
  );

  return (
    <div
      ref={rootRef}
      onPointerEnter={clearCloseTimer}
      onPointerLeave={() => {
        if (isDesktop) scheduleClose();
      }}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          nextTarget instanceof Node &&
          event.currentTarget.contains(nextTarget)
        ) {
          return;
        }
        closeMenu();
      }}
      onKeyDown={handleRootKeyDown}
      className="relative min-w-0"
    >
      <div
        ref={scrollContainerRef}
        role="region"
        aria-label={t("nav.categoryNavigation")}
        className="no-scrollbar overflow-x-auto scroll-smooth"
      >
        <ul className="flex min-h-control-md w-max min-w-full items-stretch justify-start sm:justify-center">
          {headerNavItems.map((item, index) => {
            const taxonomyNode =
              item.kind === "category"
                ? branchesBySlug.get(item.slug)
                : undefined;
            const menuKey =
              item.kind === "category"
                ? item.slug
                : item.kind === "overview"
                  ? OVERVIEW_MENU_KEY
                  : undefined;
            const label = taxonomyNode
              ? getTaxonomyLabel(taxonomyNode, { compact: true, locale })
              : item.kind === "category"
                ? localizedHeaderCategoryLabel(item, locale)
                : t(item.labelKey);
            const dedicatedDestination =
              item.kind === "category"
                ? getDedicatedRootDestination(item.slug)
                : undefined;
            const isActive =
              item.kind === "category"
                ? Boolean(
                    (dedicatedDestination &&
                      (currentPath === dedicatedDestination ||
                        currentPath.startsWith(`${dedicatedDestination}/`))) ||
                    item.slug === activeCategorySlug,
                  )
                : currentPath === item.to;
            const destination =
              item.kind === "category"
                ? getRootCategoryDestination(item.slug)
                : item.to;
            const hasMenu =
              isDesktop && menuKey !== undefined && hasMenuContent(menuKey);
            const isExpanded = hasMenu && activeMenuSlug === menuKey;

            return (
              <React.Fragment
                key={item.kind === "category" ? item.categoryId : item.labelKey}
              >
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
                    ref={(element) => {
                      if (!menuKey) return;
                      if (element) triggerRefs.current.set(menuKey, element);
                      else triggerRefs.current.delete(menuKey);
                    }}
                    id={menuKey ? categoryTriggerId(menuKey) : undefined}
                    data-header-nav-item="true"
                    to={destination}
                    onPointerEnter={(event) => {
                      if (event.pointerType !== "mouse") return;
                      if (menuKey) openMenu(menuKey);
                      else scheduleClose();
                    }}
                    onFocus={() => {
                      if (suppressNextFocusOpenRef.current) return;
                      if (menuKey) openMenu(menuKey, true);
                      else closeMenu();
                    }}
                    onKeyDown={(event) => handleTopLevelKeyDown(event, menuKey)}
                    onClick={(event) => {
                      closeMenu();
                      if (item.kind !== "category") return;
                      if (dedicatedDestination) return;
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
                    aria-haspopup={hasMenu ? "menu" : undefined}
                    aria-controls={hasMenu ? CATEGORY_MENU_ID : undefined}
                    aria-expanded={hasMenu ? isExpanded : undefined}
                    className={`relative inline-flex min-h-control-md items-center whitespace-nowrap rounded-control px-1.5 text-sm tracking-tight ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} focus-visible:bg-primary-light focus-visible:ring-2 focus-visible:ring-primary/20 ${
                      isActive || isExpanded
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

      {isDesktop && activeRoot && (
        <CategoryMegaMenu
          root={activeRoot}
          menuRef={menuRef}
          onKeyDown={handleMenuKeyDown}
          onNavigate={closeMenu}
        />
      )}
      {isDesktop &&
        activeMenuSlug === OVERVIEW_MENU_KEY &&
        overviewRoots.length > 0 && (
          <CategoryOverviewMenu
            roots={overviewRoots}
            menuRef={menuRef}
            onKeyDown={handleMenuKeyDown}
            onNavigate={closeMenu}
          />
        )}
    </div>
  );
};
