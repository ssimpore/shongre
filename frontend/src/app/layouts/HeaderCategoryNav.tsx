import { breakpoints, colors, motionDurationMs } from "@shongre/design-tokens";
import type { MarketContext } from "@shongre/contracts/market-country";
import type {
  TaxonomyHeaderCategoryItem,
  TaxonomyHeaderNavigationLink,
} from "@shongre/contracts/taxonomy";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  MoreHorizontal,
  Percent,
} from "lucide-react";
import { services } from "../../api/client/service-registry";
import { routes } from "../../configuration/routes";
import { CategoryIcon } from "../../design-system/primitives/CategoryIcon";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../../design-system/utils/controlMetrics";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.labels";
import type { TaxonomyNavigationNode as TaxonomyNode } from "../../domains/taxonomy/taxonomy.types";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  filterCategoryNavigationOverview,
  findCategoryNavigationBranch,
  loadCategoryNavigationTree,
} from "./categoryMegaMenu.model";
import {
  dedicatedCategoryDestination,
  headerNavigationItems,
  headerNavigationLabel,
  headerLinkDestination,
  type HeaderNavigationItem,
} from "./headerNavigation.model";

interface HeaderCategoryNavProps {
  activeCategorySlug?: string;
  currentPath: string;
  initialCategories?: readonly TaxonomyHeaderCategoryItem[];
  initialLinks?: readonly TaxonomyHeaderNavigationLink[];
  marketContext: MarketContext;
  marketCode: string;
  disabledCategorySlugs?: readonly string[];
  disabledSubCategorySlugs?: readonly string[];
  onSelectCategory: (categorySlug: string) => void;
}

const CATEGORY_MENU_ID = "header-category-mega-menu";
const OVERVIEW_MENU_KEY = "category_overview";
const EMPTY_DISABLED_CATEGORY_KEYS: readonly string[] = [];
const EMPTY_HEADER_CATEGORIES: readonly TaxonomyHeaderCategoryItem[] = [];
const EMPTY_HEADER_LINKS: readonly TaxonomyHeaderNavigationLink[] = [];
const categoryTriggerId = (slug: string) => `header-category-trigger-${slug}`;

const getRootCategoryDestination = (slug: string): string => {
  return (
    dedicatedCategoryDestination(slug) ?? routes.search({ category: slug })
  );
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
  const { locale } = useTranslation();
  const descendants = collectDescendants(node, 1, maxDepth);
  const headingId = `category-mega-menu-group-${node.id.replaceAll(".", "-")}`;

  return (
    <section
      role="group"
      aria-labelledby={headingId}
      data-category-id={node.id}
      className="min-w-0 rounded-xl border border-border-subtle p-2"
    >
      <h3
        id={headingId}
        role="presentation"
        className="text-sm font-bold text-text-main"
      >
        <Link
          role="menuitem"
          to={getTaxonomyDestination(root, node)}
          onClick={onNavigate}
          className={`group flex min-h-control-md w-full items-center justify-between gap-3 rounded-control px-3 py-2 hover:bg-primary-surface-soft focus-visible:bg-primary-surface-soft ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
        >
          <span className="min-w-0 leading-5">
            {getTaxonomyLabel(node, { compact: true, locale })}
          </span>
          <ArrowRight
            aria-hidden="true"
            className="h-icon-sm w-icon-sm shrink-0 text-text-muted group-hover:text-primary group-focus-visible:text-primary"
          />
        </Link>
      </h3>

      {descendants.length > 0 && (
        <ul
          role="none"
          className="mt-1 space-y-0.5 border-t border-border-soft pt-1"
        >
          {descendants.map(({ node: child, depth }) => (
            <li role="none" key={child.id}>
              <Link
                role="menuitem"
                to={getTaxonomyDestination(root, child)}
                onClick={onNavigate}
                className={`group flex min-h-8 items-center justify-between gap-2 rounded-control py-1.5 pr-3 text-sm leading-5 text-text-muted hover:bg-primary-surface-soft hover:text-text-main focus-visible:bg-primary-surface-soft focus-visible:text-text-main ${depth > 1 ? "pl-6" : "pl-3"} ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
              >
                <span className="min-w-0">
                  {getTaxonomyLabel(child, { compact: true, locale })}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-icon-sm w-icon-sm shrink-0 text-primary opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
              </Link>
            </li>
          ))}
        </ul>
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
      className="min-w-0 border-r border-border-subtle bg-primary-surface-faint p-6"
    >
      <p className="text-micro font-bold uppercase tracking-wider text-text-muted">
        {t("nav.category.active")}
      </p>
      <div className="mt-5 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary"
        >
          <CategoryIcon
            category={root}
            size="lg"
            color={colors.action.onPrimary}
          />
        </span>
        <h2
          role="presentation"
          className="min-w-0 text-lg font-bold leading-snug text-text-main"
        >
          {label}
        </h2>
      </div>
      {root.description && (
        <p className="mt-4 text-sm leading-relaxed text-text-muted">
          {root.description}
        </p>
      )}
      <Link
        role="menuitem"
        to={getTaxonomyDestination(root)}
        onClick={onNavigate}
        className={`mt-6 flex min-h-control-md items-center justify-between gap-2 rounded-control bg-surface-inverse px-3 py-2 text-xs font-bold text-text-inverse shadow-2xs hover:bg-surface-inverse-hover ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
      >
        {t("categories.categoriesPage.voirToutesLesAnnonces")}
        <ArrowRight
          className="h-icon-sm w-icon-sm shrink-0"
          aria-hidden="true"
        />
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
      <div role="presentation" className="grid min-w-0 grid-cols-sidebar">
        <CategoryMegaMenuSidebar root={root} onNavigate={onNavigate} />
        <div
          role="presentation"
          className="grid min-w-0 grid-cols-2 content-start items-start gap-4 p-5 xl:grid-cols-3 xl:p-6"
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
  label: string;
  roots: TaxonomyNode[];
  menuRef: React.RefObject<HTMLDivElement | null>;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onNavigate: () => void;
}

const CategoryOverviewMenu: React.FC<CategoryOverviewMenuProps> = ({
  label: headingLabel,
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
      <div role="presentation" className="grid min-w-0 grid-cols-sidebar">
        <div
          role="group"
          aria-label={label}
          className="min-w-0 border-r border-border-subtle bg-primary-surface-faint p-6"
        >
          <p className="text-micro font-bold uppercase tracking-wider text-text-muted">
            {headingLabel}
          </p>
          <span
            aria-hidden="true"
            className="mt-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-on-primary"
          >
            <Layers className="h-icon-xl w-icon-xl" />
          </span>
          <h2
            role="presentation"
            className="mt-4 text-lg font-bold leading-snug text-text-main"
          >
            {label}
          </h2>
          <Link
            role="menuitem"
            to={routes.categories()}
            onClick={onNavigate}
            className={`mt-6 flex min-h-control-md items-center justify-between gap-2 rounded-control bg-surface-inverse px-3 py-2 text-xs font-bold text-text-inverse shadow-2xs hover:bg-surface-inverse-hover ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS}`}
          >
            {t("categories.categoriesPage.voirTout")}
            <ArrowRight
              className="h-icon-sm w-icon-sm shrink-0"
              aria-hidden="true"
            />
          </Link>
        </div>
        <div
          role="presentation"
          className="grid min-w-0 grid-cols-2 content-start items-start gap-4 p-5 xl:grid-cols-3 xl:p-6"
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
  initialCategories = EMPTY_HEADER_CATEGORIES,
  initialLinks = EMPTY_HEADER_LINKS,
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
  const loadingMenuKeysRef = useRef(new Set<string>());
  const marketContextRef = useRef(marketContext);
  marketContextRef.current = marketContext;
  const headerConfigurationRequestRef = useRef<{
    scope: string;
    promise: Promise<TaxonomyHeaderCategoryItem[]>;
  } | null>(null);
  const navigationTreeRequestRef = useRef<{
    scope: string;
    promise: Promise<TaxonomyNode[]>;
  } | null>(null);
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
  const initialHeaderCategories = useMemo(
    () =>
      [...initialCategories].sort(
        (left, right) => left.displayOrder - right.displayOrder,
      ),
    [initialCategories],
  );
  const [overviewRoots, setOverviewRoots] = useState<TaxonomyNode[]>([]);
  const [headerLoadFailed, setHeaderLoadFailed] = useState(false);
  const [headerLinks, setHeaderLinks] =
    useState<readonly TaxonomyHeaderNavigationLink[]>(initialLinks);
  const [activeMenuSlug, setActiveMenuSlug] = useState<string | null>(null);
  const [scrollAffordance, setScrollAffordance] = useState({
    previous: false,
    next: false,
  });
  const headerConfigurationScope = `${marketCode}:${locale}:${marketContext.countryCode ?? ""}`;
  const currentHeaderConfigurationScopeRef = useRef(headerConfigurationScope);
  currentHeaderConfigurationScopeRef.current = headerConfigurationScope;

  const disabledKeys = useMemo(
    () =>
      new Set(
        [...disabledCategorySlugs, ...disabledSubCategorySlugs].map((value) =>
          value.toLowerCase(),
        ),
      ),
    [disabledCategorySlugs, disabledSubCategorySlugs],
  );
  const navigationTreeScope = `${headerConfigurationScope}:${[...disabledKeys]
    .sort()
    .join(",")}`;
  const isAvailable = useCallback(
    (node: TaxonomyNode) => {
      return (
        node.status === "active" &&
        !disabledKeys.has(node.id.toLowerCase()) &&
        !disabledKeys.has(node.slug.toLowerCase())
      );
    },
    [disabledKeys],
  );

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

  const loadHeaderConfiguration = useCallback(() => {
    const existing = headerConfigurationRequestRef.current;
    if (existing?.scope === headerConfigurationScope) return existing.promise;

    const promise = services.taxonomy
      .getHeaderNavigation(marketContextRef.current)
      .then((configuration) => {
        if (
          currentHeaderConfigurationScopeRef.current ===
          headerConfigurationScope
        ) {
          setHeaderLinks(configuration.links ?? EMPTY_HEADER_LINKS);
          setHeaderLoadFailed(false);
        }
        return [...configuration.items].sort(
          (left, right) => left.displayOrder - right.displayOrder,
        );
      })
      .then((items) => {
        if (
          currentHeaderConfigurationScopeRef.current ===
          headerConfigurationScope
        ) {
          setHeaderCategories(items);
          setBranchesBySlug(new Map());
          setOverviewRoots([]);
          loadingMenuKeysRef.current.clear();
        }
        return items;
      })
      .catch(() => {
        if (
          currentHeaderConfigurationScopeRef.current ===
          headerConfigurationScope
        ) {
          headerConfigurationRequestRef.current = null;
          setHeaderCategories([]);
          setHeaderLinks(EMPTY_HEADER_LINKS);
          setHeaderLoadFailed(true);
          closeMenu();
        }
        return [];
      });

    headerConfigurationRequestRef.current = {
      scope: headerConfigurationScope,
      promise,
    };
    return promise;
  }, [closeMenu, headerConfigurationScope]);

  const loadNavigationTree = useCallback(() => {
    const existing = navigationTreeRequestRef.current;
    if (existing?.scope === navigationTreeScope) return existing.promise;

    const promise = loadCategoryNavigationTree(
      services.taxonomy,
      marketContextRef.current,
      locale,
      isAvailable,
    ).catch((error) => {
      if (navigationTreeRequestRef.current?.scope === navigationTreeScope) {
        navigationTreeRequestRef.current = null;
      }
      throw error;
    });
    navigationTreeRequestRef.current = {
      scope: navigationTreeScope,
      promise,
    };
    return promise;
  }, [isAvailable, locale, navigationTreeScope]);

  const loadMenuContent = useCallback(
    async (menuKey: string) => {
      if (
        loadingMenuKeysRef.current.has(menuKey) ||
        (menuKey === OVERVIEW_MENU_KEY
          ? overviewRoots.length > 0
          : branchesBySlug.has(menuKey))
      ) {
        return;
      }

      loadingMenuKeysRef.current.add(menuKey);
      try {
        const [configuredCategories, navigationRoots] = await Promise.all([
          loadHeaderConfiguration(),
          loadNavigationTree(),
        ]);
        if (menuKey === OVERVIEW_MENU_KEY) {
          const promotedCategoryIds = new Set(
            configuredCategories.map((item) => item.categoryId),
          );
          const roots = filterCategoryNavigationOverview(
            navigationRoots,
            promotedCategoryIds,
          );
          setOverviewRoots(roots);
          return;
        }

        const configuredCategory = configuredCategories.find(
          (category) => category.slug === menuKey,
        );
        const branch = findCategoryNavigationBranch(
          navigationRoots,
          configuredCategory
            ? {
                id: configuredCategory.categoryId,
                slug: configuredCategory.slug,
              }
            : menuKey,
        );
        if (branch) {
          const projectedBranch = configuredCategory
            ? {
                ...branch,
                slug: configuredCategory.slug,
                labels: configuredCategory.labels,
                shortLabels: configuredCategory.shortLabels,
                name: headerNavigationLabel(configuredCategory, locale),
              }
            : branch;
          setBranchesBySlug((current) =>
            new Map(current).set(menuKey, projectedBranch),
          );
        }
      } catch {
        // HTTP telemetry owns diagnostics. Keeping the rejection inside this
        // user-triggered load prevents a recoverable menu failure from becoming
        // an unhandled Next.js runtime error; the next interaction retries it.
      } finally {
        loadingMenuKeysRef.current.delete(menuKey);
      }
    },
    [
      branchesBySlug,
      loadHeaderConfiguration,
      loadNavigationTree,
      locale,
      overviewRoots.length,
    ],
  );

  const openMenu = useCallback(
    (slug: string, immediate = false) => {
      if (!isDesktop) {
        return;
      }

      void loadMenuContent(slug);
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
      isDesktop,
      loadMenuContent,
    ],
  );

  useEffect(() => {
    setHeaderCategories(initialHeaderCategories);
    setHeaderLinks(initialLinks);
    setHeaderLoadFailed(false);
    setBranchesBySlug(new Map());
    setOverviewRoots([]);
    loadingMenuKeysRef.current.clear();
    headerConfigurationRequestRef.current = null;
  }, [initialHeaderCategories, headerConfigurationScope, initialLinks]);

  useEffect(() => {
    void loadHeaderConfiguration();
  }, [loadHeaderConfiguration]);

  useEffect(() => {
    const rail = scrollContainerRef.current;
    if (!rail) return;
    const sync = () => {
      const maximum = Math.max(rail.scrollWidth - rail.clientWidth, 0);
      setScrollAffordance({
        previous: rail.scrollLeft > 4,
        next: rail.scrollLeft < maximum - 4,
      });
    };
    sync();
    rail.addEventListener("scroll", sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(rail);
    const list = rail.firstElementChild;
    if (list) observer.observe(list);
    return () => {
      rail.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [headerCategories, headerLinks]);

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
  const headerNavItems = useMemo<readonly HeaderNavigationItem[]>(
    () =>
      headerNavigationItems({
        items: headerCategories,
        links: [...headerLinks],
      }).filter((item) => item.isActive),
    [headerCategories, headerLinks],
  );
  const overviewLink = headerLinks.find(
    (link) => link.target === "category_overview" && link.isActive,
  );

  const focusFirstMenuItem = useCallback(
    async (slug: string) => {
      setActiveMenuSlug(slug);
      await loadMenuContent(slug);
      window.requestAnimationFrame(() => {
        menuRef.current
          ?.querySelector<HTMLElement>('[role="menuitem"]')
          ?.focus();
      });
    },
    [loadMenuContent],
  );

  const handleTopLevelKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLAnchorElement>, slug?: string) => {
      if (!isDesktop) return;

      if (slug && event.key === "ArrowDown") {
        event.preventDefault();
        openMenu(slug, true);
        void focusFirstMenuItem(slug);
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
    [focusFirstMenuItem, isDesktop, openMenu],
  );

  const scrollCategories = useCallback((direction: -1 | 1) => {
    const rail = scrollContainerRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * Math.max(rail.clientWidth * 0.7, 180),
      behavior: "smooth",
    });
  }, []);

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
      onPointerEnter={() => {
        clearCloseTimer();
        if (!headerLoadFailed) void loadHeaderConfiguration();
      }}
      onFocusCapture={() => {
        if (!headerLoadFailed) void loadHeaderConfiguration();
      }}
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
      <div className="relative min-w-0">
        {scrollAffordance.previous ? (
          <button
            type="button"
            aria-label={t("nav.category.scrollPrevious")}
            aria-controls="header-category-rail"
            onClick={() => scrollCategories(-1)}
            className={`absolute inset-y-0 left-0 z-raised flex w-9 items-center justify-center bg-gradient-to-r from-bg-surface via-bg-surface to-transparent text-text-emphasis ${CONTROL_FOCUS_CLASS}`}
          >
            <ChevronLeft className="h-icon-md w-icon-md" aria-hidden="true" />
          </button>
        ) : null}
        <div
          id="header-category-rail"
          ref={scrollContainerRef}
          role="region"
          aria-label={t("nav.categoryNavigation")}
          className="no-scrollbar overflow-x-auto scroll-smooth"
        >
          <ul className="flex min-h-control-touch w-max min-w-full items-stretch justify-start sm:justify-center">
            {headerLoadFailed ? (
              <li className="flex items-center gap-2 text-xs text-text-muted">
                <span role="status">{t("nav.category.unavailable")}</span>
                <button
                  type="button"
                  onClick={() => void loadHeaderConfiguration()}
                  className={`min-h-control-md rounded-control px-2 font-semibold text-text-main underline decoration-primary underline-offset-4 ${CONTROL_FOCUS_CLASS}`}
                >
                  {t("common.retry")}
                </button>
              </li>
            ) : null}
            {headerNavItems.map((item, index) => {
              const menuKey =
                item.kind === "category"
                  ? item.slug
                  : item.target === "category_overview"
                    ? OVERVIEW_MENU_KEY
                    : undefined;
              const label = headerNavigationLabel(item, locale);
              const dedicatedDestination =
                item.kind === "category"
                  ? dedicatedCategoryDestination(item.slug)
                  : undefined;
              const isActive =
                item.kind === "category"
                  ? Boolean(
                      (dedicatedDestination &&
                        (currentPath === dedicatedDestination ||
                          currentPath.startsWith(
                            `${dedicatedDestination}/`,
                          ))) ||
                      item.slug === activeCategorySlug,
                    )
                  : currentPath === headerLinkDestination(item.target);
              const destination =
                item.kind === "category"
                  ? getRootCategoryDestination(item.slug)
                  : headerLinkDestination(item.target);
              const hasMenu = isDesktop && menuKey !== undefined;
              const isExpanded = hasMenu && activeMenuSlug === menuKey;

              return (
                <React.Fragment
                  key={item.kind === "category" ? item.categoryId : item.target}
                >
                  <li
                    className={`flex shrink-0 ${item.kind === "link" && item.target === "promotions" && index > 0 ? "ml-2 border-l border-border-subtle pl-2" : ""}`}
                  >
                    <Link
                      ref={(element) => {
                        if (!menuKey) return;
                        if (element) triggerRefs.current.set(menuKey, element);
                        else triggerRefs.current.delete(menuKey);
                      }}
                      id={categoryTriggerId(
                        item.kind === "category" ? item.slug : item.target,
                      )}
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
                      onKeyDown={(event) =>
                        handleTopLevelKeyDown(event, menuKey)
                      }
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
                      className={`relative inline-flex min-h-control-touch items-center gap-2 whitespace-nowrap rounded-control px-2.5 text-sm tracking-tight lg:px-3 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} focus-visible:bg-primary-light focus-visible:ring-2 focus-visible:ring-focus ${
                        isActive || isExpanded
                          ? "bg-primary-light font-bold text-text-main after:absolute after:inset-x-1.5 after:bottom-0 after:h-0.5 after:rounded-sm after:bg-primary md:after:inset-x-2"
                          : "font-medium text-text-strong hover:bg-bg-subtle hover:text-text-main"
                      }`}
                    >
                      <span aria-hidden="true" className="shrink-0">
                        {item.kind === "category" ? (
                          <CategoryIcon category={item} size="md" />
                        ) : item.target === "promotions" ? (
                          <Percent className="h-icon-md w-icon-md text-primary" />
                        ) : (
                          <MoreHorizontal className="h-icon-md w-icon-md" />
                        )}
                      </span>
                      <span>{label}</span>
                    </Link>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        </div>
        {scrollAffordance.next ? (
          <button
            type="button"
            aria-label={t("nav.category.scrollNext")}
            aria-controls="header-category-rail"
            onClick={() => scrollCategories(1)}
            className={`absolute inset-y-0 right-0 z-raised flex w-9 items-center justify-center bg-gradient-to-l from-bg-surface via-bg-surface to-transparent text-text-emphasis ${CONTROL_FOCUS_CLASS}`}
          >
            <ChevronRight className="h-icon-md w-icon-md" aria-hidden="true" />
          </button>
        ) : null}
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
        overviewLink &&
        activeMenuSlug === OVERVIEW_MENU_KEY &&
        overviewRoots.length > 0 && (
          <CategoryOverviewMenu
            label={headerNavigationLabel(overviewLink, locale)}
            roots={overviewRoots}
            menuRef={menuRef}
            onKeyDown={handleMenuKeyDown}
            onNavigate={closeMenu}
          />
        )}
    </div>
  );
};
