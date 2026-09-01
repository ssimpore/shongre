import { routes } from "../../configuration/routes";
import { isProSeller } from "../../domains/user/user.domain";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import type { TaxonomyHeaderCategoryItem } from "@shongre/contracts";
import { HeaderCategoryNav } from "./HeaderCategoryNav";
import {
  PlusCircle,
  Heart,
  MessageSquare,
  User,
  ChevronDown,
  Sparkles,
  Briefcase,
  LogOut,
  ShoppingBag,
  List,
  Menu,
  BadgeCheck,
  X,
  Map as MapIcon,
  ChevronRight,
  Layers,
  Shield,
  Headphones,
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import { useMarketLocation } from "../providers/MarketLocationProvider";
import { useFavorites } from "../providers/FavoritesProvider";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.labels";
import { services } from "../../api/client/service-registry";
import { storageService } from "../../services/storage.service";
import { usePublishCta } from "../../security/usePublishCta";
import { Badge } from "../../design-system/primitives/Badge";
import { Avatar } from "../../design-system/primitives/Badge";
import { CategoryIcon } from "../../design-system/primitives/CategoryIcon";
import { NotificationBell } from "../../features/notifications/components/NotificationBell";
import { useDialogBehavior } from "../../design-system/primitives/useDialogBehavior";
import { GlobalSearchBar } from "../../design-system/primitives/GlobalSearchBar";
import { LanguageSelector } from "../../design-system/primitives/LanguageSelector";
import { DROPDOWN_PANEL_CLASSES } from "../../design-system/primitives/DropdownMenu";
import { useTranslation } from "../../i18n/I18nProvider";
import { PublishCtaButton } from "../../design-system/primitives/PublishCtaButton";
import { Container } from "../../design-system";
import { Button } from "../../design-system/primitives/Button";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../../design-system/utils/controlMetrics";
import { useStaffMarketplaceAccess } from "../../security/useStaffMarketplaceAccess";
import { useAuthorization } from "../../security/useAuthorization";
import {
  resolveHeaderAccountMenuItems,
  type HeaderAccountMenuItem,
  type HeaderAccountMenuItemId,
} from "./account-menu.model";

const HEADER_SCROLL_BEHAVIOR = {
  hideTravel: 48,
  // The category rail is one compact control tall. Keep the opposing-motion
  // threshold larger than that footprint so scroll anchoring/layout work from
  // the collapse cannot masquerade as an intentional upward gesture when the
  // main thread is busy. A real reveal gesture still needs only a short swipe.
  revealTravel: 64,
  revealAtTop: 12,
  transitionSettleMs: 300,
} as const;

interface VerifiedAccountNameProps {
  name: string;
  isVerified?: boolean;
  verifiedLabel: string;
}

function VerifiedAccountName({
  name,
  isVerified,
  verifiedLabel,
}: VerifiedAccountNameProps) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-stone-900">
      <span className="truncate">{name}</span>
      {isVerified ? (
        <span
          className="inline-flex shrink-0 text-success"
          title={verifiedLabel}
          aria-label={verifiedLabel}
        >
          <BadgeCheck className="h-icon-md w-icon-md" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );
}

function AccountMenuItemIcon({
  id,
  className,
}: {
  id: HeaderAccountMenuItemId;
  className: string;
}) {
  const props = { className, "aria-hidden": true } as const;
  switch (id) {
    case "admin":
      return <Shield {...props} />;
    case "demo_workspace":
    case "pro_solutions":
      return <Sparkles {...props} />;
    case "listings":
      return <List {...props} />;
    case "favorites":
      return <Heart {...props} />;
    case "purchases":
      return <ShoppingBag {...props} />;
    case "support":
      return <Headphones {...props} />;
    case "account":
    case "public_profile":
      return <User {...props} />;
  }
}

function AccountMenuDestinationLink({
  item,
  label,
  demoBadgeLabel,
  mobile = false,
  onNavigate,
}: {
  item: HeaderAccountMenuItem;
  label: string;
  demoBadgeLabel: string;
  mobile?: boolean;
  onNavigate: () => void;
}) {
  const tone =
    item.emphasis === "primary"
      ? "text-primary hover:bg-primary-light"
      : item.emphasis === "warning"
        ? "text-warning hover:bg-warning-surface"
        : "text-stone-800 hover:bg-bg-subtle";
  const iconTone =
    item.emphasis === "primary"
      ? "text-primary"
      : item.emphasis === "warning"
        ? "text-amber-500"
        : "text-stone-400";

  return (
    <Link
      to={item.to}
      data-account-menu-item={item.id}
      data-marketplace-action={item.marketplaceAction}
      data-staff-demo-destination={item.isDemo || undefined}
      onClick={onNavigate}
      className={`${mobile ? "touch-row w-full min-w-0 gap-2.5 rounded-xl p-2.5" : "flex items-center gap-2.5 px-4 py-2"} text-xs font-semibold transition-colors ${tone}`}
    >
      <AccountMenuItemIcon
        id={item.id}
        className={`h-icon-md w-icon-md shrink-0 ${iconTone}`}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {item.count !== undefined ? (
        <span
          className="shrink-0 text-micro tabular-nums text-stone-500"
          aria-label={`${item.count}`}
        >
          {item.count}
        </span>
      ) : null}
      {item.isDemo && !mobile ? (
        <Badge variant="warning" size="sm">
          {demoBadgeLabel}
        </Badge>
      ) : null}
    </Link>
  );
}

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  /* The results page renders its own, richer search bar — see the desktop
     search slot below. */
  const isSearchRoute = location.pathname === "/recherche";
  const { currentUser, isAuthenticated, isRestoring, logout } = useAuth();
  const { can, canAccessRoute } = useAuthorization();
  const { isStaff: isStaffIdentity, canUseDemoMarketplace } =
    useStaffMarketplaceAccess();
  const staffStatusLabel =
    currentUser?.staffStatus === "active"
      ? t("admin.staff.status.active")
      : currentUser?.staffStatus === "suspended"
        ? t("admin.staff.status.suspended")
        : currentUser?.staffStatus === "revoked"
          ? t("admin.staff.status.revoked")
          : "";
  const customerStatusLabel =
    currentUser?.status === "pending" ||
    currentUser?.status === "pending_verification"
      ? t("shell.header.accountMenu.status.pending")
      : currentUser?.status === "restricted" ||
          currentUser?.status === "limited"
        ? t("shell.header.accountMenu.status.restricted")
        : currentUser?.status === "suspended"
          ? t("shell.header.accountMenu.status.suspended")
          : currentUser?.status === "banned" ||
              currentUser?.status === "closed" ||
              currentUser?.status === "disabled" ||
              currentUser?.status === "archived" ||
              currentUser?.status === "deleted"
            ? t("shell.header.accountMenu.status.inactive")
            : null;
  const { activeMarket, currentLocale, effectiveConfig, marketContext } =
    useMarketLocation();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Smart category bar visibility across pages
  const shouldShowCategoryBar = useMemo(() => {
    const path = location.pathname;
    // Always show on homepage
    if (path === "/") return true;
    // Show on search and taxonomy exploration
    if (
      path === "/recherche" ||
      path === "/categories" ||
      path.startsWith("/categorie/")
    )
      return true;
    // Show on collections and reduced-price offers
    if (path.startsWith("/collections") || path === routes.deals()) return true;

    // Smartly hide on specialized, focused, transactional, and admin routes
    return false;
  }, [location.pathname]);

  const [isCategoryNavVisible, setIsCategoryNavVisible] = useState(true);
  const categoryNavRef = useRef<HTMLElement>(null);
  const isCategoryNavVisibleRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const scrollDirectionRef = useRef<-1 | 0 | 1>(0);
  const scrollTravelRef = useRef(0);
  const scrollSettleUntilRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);

  const updateCategoryNavVisibility = useCallback((isVisible: boolean) => {
    if (isCategoryNavVisibleRef.current === isVisible) return;

    isCategoryNavVisibleRef.current = isVisible;
    scrollDirectionRef.current = 0;
    scrollTravelRef.current = 0;
    // Collapsing a sticky element can make scroll anchoring emit a compensating
    // scroll event. Ignore that layout-driven movement until the rail's 250ms
    // transition has settled so it cannot be mistaken for a user reversal.
    scrollSettleUntilRef.current =
      Date.now() + HEADER_SCROLL_BEHAVIOR.transitionSettleMs;
    setIsCategoryNavVisible(isVisible);
  }, []);

  const revealCategoryNav = useCallback(() => {
    updateCategoryNavVisibility(true);
  }, [updateCategoryNavVisibility]);

  // One scroll strategy for every discovery page that renders the category
  // rail. Meaningful downward travel clears space for content; upward travel,
  // top-of-page, hover and focus make the navigation available again. Direction
  // hysteresis prevents touchpad/wheel noise from toggling the rail repeatedly.
  useEffect(() => {
    setIsCategoryNavVisible(true);
    isCategoryNavVisibleRef.current = true;
    scrollDirectionRef.current = 0;
    scrollTravelRef.current = 0;
    scrollSettleUntilRef.current = 0;
    const getPageScrollY = () =>
      Math.max(
        window.scrollY,
        document.scrollingElement?.scrollTop ?? 0,
        document.body?.scrollTop ?? 0,
      );

    lastScrollYRef.current = getPageScrollY();

    if (!shouldShowCategoryBar) return;

    const handleScroll = () => {
      if (scrollFrameRef.current !== null) return;

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        const currentScrollY = getPageScrollY();
        const scrollDelta = currentScrollY - lastScrollYRef.current;
        lastScrollYRef.current = currentScrollY;

        if (currentScrollY <= HEADER_SCROLL_BEHAVIOR.revealAtTop) {
          updateCategoryNavVisibility(true);
          return;
        }

        if (Date.now() < scrollSettleUntilRef.current || scrollDelta === 0)
          return;

        const direction: -1 | 1 = scrollDelta > 0 ? 1 : -1;
        if (scrollDirectionRef.current !== direction) {
          scrollDirectionRef.current = direction;
          scrollTravelRef.current = Math.abs(scrollDelta);
        } else {
          scrollTravelRef.current += Math.abs(scrollDelta);
        }

        if (
          isCategoryNavVisibleRef.current &&
          direction === 1 &&
          scrollTravelRef.current >= HEADER_SCROLL_BEHAVIOR.hideTravel &&
          !categoryNavRef.current?.contains(document.activeElement)
        ) {
          updateCategoryNavVisibility(false);
          return;
        }

        if (
          !isCategoryNavVisibleRef.current &&
          direction === -1 &&
          scrollTravelRef.current >= HEADER_SCROLL_BEHAVIOR.revealTravel
        ) {
          updateCategoryNavVisibility(true);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Some embedded/mobile layouts make body (rather than window) the scroll
    // owner. Capture document scroll events too so the same behavior applies
    // to every route and browser viewport.
    document.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", handleScroll, true);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [location.pathname, shouldShowCategoryBar, updateCategoryNavVisibility]);

  const activeCategorySlug = useMemo(() => {
    if (location.pathname === "/recherche") {
      return searchParams.get("category") || undefined;
    }
    if (location.pathname.startsWith("/categorie/")) {
      const parts = location.pathname.split("/");
      return parts[2] || undefined;
    }
    return undefined;
  }, [location.pathname, searchParams]);

  const handleCategorySelect = (slug: string | undefined) => {
    if (location.pathname === "/recherche") {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (slug) {
          next.set("category", slug);
        } else {
          next.delete("category");
        }
        next.delete("subCategory");
        return next;
      });
    } else {
      if (slug) {
        navigate(routes.search({ category: slug }));
      } else {
        navigate("/recherche");
      }
    }
  };

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const [mobileCategories, setMobileCategories] = useState<
    TaxonomyHeaderCategoryItem[]
  >([]);
  const [isHeaderSearchExpanded, setIsHeaderSearchExpanded] = useState(false);
  // Set when the drawer is opened via the search button rather than the burger,
  // so the field takes focus instead of the user having to tap it again.

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu whenever route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsHeaderSearchExpanded(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileCategoriesOpen || !marketContext) return;
    let cancelled = false;
    void services.taxonomy
      .getHeaderNavigation(marketContext)
      .then((configuration) => {
        if (!cancelled) {
          setMobileCategories(
            [...configuration.items].sort(
              (left, right) => left.displayOrder - right.displayOrder,
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setMobileCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isMobileCategoriesOpen, marketContext]);

  // Close the header dropdowns on route change, Escape, or a click outside.
  useEffect(() => {
    setIsAccountMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setIsAccountMenuOpen(false);
    };
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isAccountMenuOpen]);

  // Escape, focus trap, focus restore and body-scroll lock for the mobile drawer.
  // This replaces a bespoke scroll lock that set `overflow: unset` on cleanup and
  // so fought with the Modal primitive's own lock.
  const { containerRef: drawerRef, titleId: drawerTitleId } = useDialogBehavior(
    isMobileMenuOpen,
    () => setIsMobileMenuOpen(false),
  );

  const { count: favCount } = useFavorites();
  const listingCount = currentUser
    ? storageService
        .getListings()
        .filter((listing) => listing.sellerId === currentUser.id).length
    : 0;
  const accountMenuItems = currentUser
    ? resolveHeaderAccountMenuItems({
        user: currentUser,
        canAccessRoute,
        hasCapability: can,
        canUseDemoMarketplace,
        listingCount,
        favoriteCount: favCount,
      })
    : [];
  const unreadMessagesCount = isStaffIdentity
    ? 0
    : storageService.getUnreadMessageCount(currentUser?.id);
  const publishCta = usePublishCta();
  const handleHeaderQueryChange = useCallback((query: string) => {
    setIsHeaderSearchExpanded(query.trim().length > 0);
  }, []);
  const handleHeaderSearchFocus = useCallback(() => {
    setIsHeaderSearchExpanded(true);
  }, []);
  const handleHeaderSearchClear = useCallback(() => {
    setIsHeaderSearchExpanded(false);
  }, []);
  const handleHeaderSearchBlur = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget;
      if (
        nextTarget instanceof Node &&
        event.currentTarget.contains(nextTarget)
      )
        return;

      setIsHeaderSearchExpanded(false);
    },
    [],
  );

  return (
    <header className="sticky top-0 z-header bg-white/95 backdrop-blur-md border-b border-border-base">
      <Container>
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          {/* Logo & Category trigger.
              `min-w-0` rather than `shrink-0`: on tablet the wordmark is allowed
              to give up space to the search field instead of forcing the row
              wider than the viewport. */}
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none lg:shrink-0 lg:gap-4">
            <Link
              to={routes.home()}
              className="flex items-center gap-2 select-none group min-w-0"
            >
              <div
                className={`w-9 h-9 rounded-control bg-primary text-white flex items-center justify-center font-black text-xl shadow-xs group-hover:scale-105 ${CONTROL_MOTION_CLASS} shrink-0`}
              >
                S
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xl font-extrabold tracking-tight uppercase text-stone-900 leading-none truncate">
                  Shongre<span className="text-primary">.</span>
                </span>
                {/* The market name repeats the market selector in the actions
                    row, so tablet drops it rather than the search field. */}
                <span className="hidden lg:block text-micro font-bold text-stone-600 tracking-wider uppercase mt-0.5 truncate">
                  {activeMarket.name}
                </span>
              </div>
            </Link>

            {/* Language selector.
                A preference, not navigation, so it yields the header's width to
                the search field until `xl`. It stays reachable at every width
                from the footer and from the mobile/tablet drawer. */}
            <div className="hidden xl:block">
              <LanguageSelector idPrefix="header-desktop-lang" />
            </div>
          </div>

          {/* Global Search bar (Desktop).
              The single search surface on desktop: sticky, so it is reachable
              from any scroll position, including the homepage. The homepage hero
              used to carry a second copy with the same placeholder — one search
              per screen, and this is it.

              `/recherche` is the one route that owns a better search surface
              than this one: its page-level bar carries the same fields plus the
              radius control, and it edits the URL in place instead of
              navigating. Rendering both put two inputs with the identical
              accessible name — and two category dropdowns — on one screen. The
              wrapper stays mounted so the header keeps its three-part flex
              rhythm and the actions do not slide inward. */}
          <div
            data-header-search-shell
            onBlurCapture={handleHeaderSearchBlur}
            className={`flex-1 min-w-0 hidden md:block motion-layout ${isHeaderSearchExpanded ? "max-w-none" : "max-w-xl xl:max-w-2xl"}`}
          >
            {!isSearchRoute && (
              <GlobalSearchBar
                variant="header"
                idPrefix="header-desktop"
                showCategory={true}
                showLocation={true}
                onQueryChange={handleHeaderQueryChange}
                onFocus={handleHeaderSearchFocus}
                onClearQuery={handleHeaderSearchClear}
              />
            )}
          </div>

          {/* Header Action Items.
              `shrink-0` so the actions keep their intrinsic size and the search
              field absorbs the remaining width. Without it the flex row had no
              stable give-and-take: the search bar claimed its `flex-1` share
              first, the brand collapsed to 4px, and the actions ran 58px past
              the right edge at exactly 1024px. */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Publish CTA Button (Desktop & Tablet only - hidden on mobile) */}
            <div
              data-header-publish-cta
              aria-hidden={isHeaderSearchExpanded}
              className={`shrink-0 overflow-hidden motion-layout ${isHeaderSearchExpanded ? "max-w-0 opacity-0 pointer-events-none" : "max-w-56 opacity-100"}`}
            >
              <Button
                to={publishCta.to}
                data-marketplace-action="listing.publish"
                aria-label={t(publishCta.labelKey)}
                tabIndex={isHeaderSearchExpanded ? -1 : undefined}
                variant="pro"
                size="compact"
                leftIcon={
                  <PlusCircle className="w-icon-md h-icon-md text-primary" />
                }
                className="hidden md:flex px-3 lg:px-4 shrink-0 mr-1 lg:mr-2"
              >
                {/* Tablet keeps the publish action but not its label — it is the
                  one action that must survive the narrower row. */}
                <span className="hidden lg:inline whitespace-nowrap">
                  {t(publishCta.labelKey)}
                </span>
              </Button>
            </div>

            {/* Favorites */}
            <Link
              to="/compte/favoris"
              data-marketplace-action="favorite.manage"
              className={`relative hidden h-control-md w-control-md items-center justify-center rounded-control text-stone-600 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} hover:bg-bg-subtle hover:text-stone-950 active:bg-bg-muted lg:flex group`}
              aria-label="Favoris"
            >
              <Heart className="w-icon-lg h-icon-lg group-hover:scale-110 transition-transform duration-fast" />
              {favCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-white text-micro font-bold flex items-center justify-center shadow-xs transform translate-x-1/4 -translate-y-1/4">
                  {favCount}
                </span>
              )}
            </Link>

            {/* Messages */}
            <Link
              to="/compte/messages"
              data-marketplace-action="message.open"
              className={`relative hidden h-control-md w-control-md items-center justify-center rounded-control text-stone-600 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} hover:bg-bg-subtle hover:text-stone-950 active:bg-bg-muted lg:flex group`}
              aria-label="Messagerie"
            >
              <MessageSquare className="w-icon-lg h-icon-lg group-hover:scale-110 transition-transform duration-fast" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-white text-micro font-bold flex items-center justify-center shadow-xs transform translate-x-1/4 -translate-y-1/4">
                  {unreadMessagesCount}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <div
              data-marketplace-action="notification.open"
              className="hidden lg:flex items-center justify-center"
            >
              <NotificationBell />
            </div>

            {/* User Account Menu (Desktop) */}
            <div className="relative hidden md:block ml-1" ref={accountMenuRef}>
              {isRestoring ? (
                <div
                  data-auth-restoring
                  role="status"
                  aria-label={t("shell.header.restoringSession")}
                  aria-busy="true"
                  className="flex h-control-md w-24 items-center gap-2 rounded-control border border-border-base bg-bg-surface px-2.5 lg:w-32"
                >
                  <span className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-bg-muted motion-reduce:animate-none" />
                  <span className="hidden h-2.5 flex-1 animate-pulse rounded-full bg-bg-muted motion-reduce:animate-none lg:block" />
                </div>
              ) : isAuthenticated && currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  aria-expanded={isAccountMenuOpen}
                  /* This is a disclosure for a labelled group of links, not an
                     application menu or modal dialog. Expanded + controls
                     communicates the relationship without promising either. */
                  aria-controls="header-account-menu"
                  aria-label={`Menu du compte de ${currentUser.name}`}
                  className={`flex h-control-md items-center gap-2 rounded-control border py-1 pl-1.5 pr-2.5 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer ${isAccountMenuOpen ? "bg-bg-muted border-border-hover shadow-inner" : "bg-bg-surface border-border-base hover:bg-bg-subtle hover:border-border-hover hover:shadow-2xs"}`}
                >
                  <Avatar
                    src={currentUser.avatarUrl}
                    name={currentUser.name}
                    size="sm"
                  />
                  <span className="text-sm font-bold text-stone-800 hidden lg:inline max-w-25 truncate">
                    {currentUser.name.split(" ")[0]}
                  </span>
                  <ChevronDown
                    className={`w-icon-sm h-icon-sm text-stone-400 hidden sm:inline transition-transform duration-normal ${isAccountMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
              ) : (
                <Button
                  to="/connexion"
                  variant="ghost"
                  size="compact"
                  leftIcon={<User className="w-icon-md h-icon-md" />}
                  className="px-3"
                >
                  Se connecter
                </Button>
              )}

              {/* Account Dropdown */}
              {isAccountMenuOpen && isAuthenticated && currentUser && (
                <div
                  id="header-account-menu"
                  role="group"
                  aria-label={`Menu du compte de ${currentUser.name}`}
                  className={`absolute right-0 mt-2 w-64 ${DROPDOWN_PANEL_CLASSES}`}
                >
                  <div className="px-4 py-2.5 border-b border-border-subtle">
                    <VerifiedAccountName
                      name={currentUser.name}
                      isVerified={
                        isStaffIdentity ? false : currentUser.isVerified
                      }
                      verifiedLabel={t("ui.badge.profilVerifie")}
                    />
                    <div className="text-xs text-stone-500 truncate">
                      {currentUser.email}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {isStaffIdentity ? (
                        <Badge variant="neutral" size="sm">
                          {staffStatusLabel}
                        </Badge>
                      ) : isProSeller(currentUser) ? (
                        <Badge variant="pro" size="sm">
                          {t("shell.header.compteProfessionnel")}
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Particulier
                        </Badge>
                      )}
                      {canUseDemoMarketplace ? (
                        <Badge variant="warning" size="sm">
                          {t("shell.header.accountMenu.demoAuthorized")}
                        </Badge>
                      ) : null}
                      {!isStaffIdentity && customerStatusLabel ? (
                        <Badge variant="warning" size="sm">
                          {customerStatusLabel}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="py-1">
                    <div className="px-4 pb-1 pt-1 text-micro font-bold uppercase tracking-wider text-stone-500">
                      {t("shell.header.accountMenu.availableAccess")}
                    </div>
                    {accountMenuItems.map((item) => (
                      <React.Fragment key={item.id}>
                        {item.separatorBefore ? (
                          <div
                            role="separator"
                            className="my-1 border-t border-border-subtle"
                          />
                        ) : null}
                        <AccountMenuDestinationLink
                          item={item}
                          label={t(item.labelKey)}
                          demoBadgeLabel={t("shell.demoRoleSwitcher.modeDemo")}
                          onNavigate={() => setIsAccountMenuOpen(false)}
                        />
                      </React.Fragment>
                    ))}

                    <div
                      role="separator"
                      className="my-1 border-t border-border-subtle"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setIsAccountMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger-surface transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-icon-md h-icon-md text-danger" />
                      {t("shell.header.deconnexion")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* No separate mobile search icon: it opened the very same drawer
                as the burger beside it, so the header offered two controls for
                one panel. Search is the first thing inside that drawer. */}

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={
                isMobileMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")
              }
              aria-expanded={isMobileMenuOpen}
              className={`lg:hidden h-control-md w-control-md rounded-control text-stone-800 hover:text-stone-950 hover:bg-bg-subtle active:bg-bg-muted ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} flex items-center justify-center cursor-pointer`}
            >
              {isMobileMenuOpen ? (
                <X className="w-icon-xl h-icon-xl text-stone-900" />
              ) : (
                <Menu className="w-icon-xl h-icon-xl text-stone-900" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {/* Category Sub-Header Bar (Smartly shown on Home and Discovery surfaces) */}
      {shouldShowCategoryBar && marketContext && (
        <nav
          ref={categoryNavRef}
          aria-label={t("ui.categoryFilterRail.filtresParCategorie")}
          aria-hidden={!isCategoryNavVisible}
          data-scroll-state={isCategoryNavVisible ? "visible" : "hidden"}
          onPointerEnter={revealCategoryNav}
          onFocusCapture={revealCategoryNav}
          onTouchStart={revealCategoryNav}
          className={`bg-white/95 backdrop-blur-md motion-layout ${
            isCategoryNavVisible
              ? "visible max-h-control-md translate-y-0 overflow-visible opacity-100"
              : "invisible pointer-events-none max-h-0 -translate-y-1 overflow-hidden opacity-0"
          }`}
        >
          <Container>
            <HeaderCategoryNav
              activeCategorySlug={activeCategorySlug}
              currentPath={location.pathname}
              marketContext={marketContext}
              marketCode={activeMarket.code}
              disabledCategorySlugs={
                effectiveConfig.taxonomy?.disabledCategorySlugs
              }
              disabledSubCategorySlugs={
                effectiveConfig.taxonomy?.disabledSubCategorySlugs
              }
              onSelectCategory={handleCategorySelect}
            />
          </Container>
        </nav>
      )}

      {/* Mobile Drawer Navigation (rendered via Portal to prevent sticky header
          clipping).

          `z-drawer` puts the drawer between page chrome and dialogs: above the
          sticky header and the mobile tab bar (both `z-header`), below modals and
          toasts (`z-modal`). It once used a numeric z-index, the only non-token
          app, which stacked it over every dialog — including the ones it opens
          itself. Tapping "Changer" beside the location did open the picker; it
          just rendered underneath the drawer, so nothing appeared to happen. */}
      {isMobileMenuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-drawer lg:hidden flex justify-end">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity duration-normal"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-out Drawer Panel (Takes full screen width on mobile) */}
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={drawerTitleId}
              tabIndex={-1}
              className="relative w-full sm:w-side-sheet-width sm:max-w-95 h-side-sheet-height bg-bg-surface shadow-overlay flex flex-col z-raised sm:border-l border-border-base animate-in slide-in-from-right duration-normal"
            >
              {/* Drawer Header (Targeted element 1: Non-shrinkable, clean border & spacing) */}
              <div className="p-4 border-b border-border-base flex items-center justify-between bg-bg-subtle shrink-0 sticky top-0 z-sticky">
                <Link
                  to={routes.home()}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 select-none"
                >
                  <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    S
                  </div>
                  <div className="flex flex-col">
                    <span
                      id={drawerTitleId}
                      className="text-lg font-black text-stone-900 tracking-tight leading-none"
                    >
                      Shongre<span className="text-primary">.</span>
                    </span>
                    <span className="text-micro font-bold text-stone-500 tracking-wider uppercase mt-0.5">
                      {activeMarket.name}
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`h-control-sm w-control-sm touch-square rounded-pill text-stone-500 hover:text-stone-900 hover:bg-bg-muted ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} active:scale-95 cursor-pointer bg-bg-surface shadow-2xs border border-border-base flex items-center justify-center`}
                  aria-label={t("shell.header.fermerLeMenuMobile")}
                >
                  <X className="w-icon-md h-icon-md" />
                </button>
              </div>

              {/* Scrollable Drawer Body with generous bottom spacing */}
              <div className="flex-1 overflow-y-auto overscroll-contain pb-28">
                {/* User status card / Login CTA (Targeted element 2) */}
                <div className="p-4 sm:p-5 bg-bg-base border-b border-border-base shrink-0">
                  {isRestoring ? (
                    <div
                      data-auth-restoring
                      role="status"
                      aria-label={t("shell.header.restoringSession")}
                      aria-busy="true"
                      className="flex items-center gap-3"
                    >
                      <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-bg-muted motion-reduce:animate-none" />
                      <span className="min-w-0 flex-1 space-y-2">
                        <span className="block h-3 w-28 animate-pulse rounded-full bg-bg-muted motion-reduce:animate-none" />
                        <span className="block h-2.5 w-40 max-w-full animate-pulse rounded-full bg-bg-muted motion-reduce:animate-none" />
                      </span>
                    </div>
                  ) : isAuthenticated && currentUser ? (
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={currentUser.avatarUrl}
                        name={currentUser.name}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <VerifiedAccountName
                          name={currentUser.name}
                          isVerified={
                            isStaffIdentity ? false : currentUser.isVerified
                          }
                          verifiedLabel={t("ui.badge.profilVerifie")}
                        />
                        <div className="text-xs text-stone-500 truncate">
                          {currentUser.email}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          {isStaffIdentity ? (
                            <Badge variant="neutral" size="sm">
                              {staffStatusLabel}
                            </Badge>
                          ) : isProSeller(currentUser) ? (
                            <Badge variant="pro" size="sm">
                              Pro
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              Particulier
                            </Badge>
                          )}
                          {canUseDemoMarketplace ? (
                            <Badge variant="warning" size="sm">
                              {t("shell.header.accountMenu.demoAuthorized")}
                            </Badge>
                          ) : null}
                          {!isStaffIdentity && customerStatusLabel ? (
                            <Badge variant="warning" size="sm">
                              {customerStatusLabel}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="text-xs font-medium text-stone-600">
                        {t("shell.header.connectezVousPourGererVos")}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          to="/connexion"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`inline-flex w-full h-control-md items-center justify-center px-3 text-center text-xs font-bold text-stone-900 bg-bg-surface border border-border-base rounded-control hover:bg-bg-subtle ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} shadow-xs`}
                        >
                          Se connecter
                        </Link>
                        <Link
                          to="/inscription"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`inline-flex w-full h-control-md items-center justify-center px-3 text-center text-xs font-bold text-white bg-primary rounded-control hover:bg-primary-hover active:bg-primary-active ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} shadow-xs`}
                        >
                          S'inscrire
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Global Search Bar */}
                <div className="p-4 border-b border-border-base shrink-0">
                  <GlobalSearchBar
                    variant="minimal"
                    idPrefix="header-mobile"
                    showCategory={true}
                    showLocation={true}
                    onSubmitComplete={() => setIsMobileMenuOpen(false)}
                  />
                </div>

                {/* Mobile CTA: Déposer une annonce */}
                <div className="p-4 border-b border-border-base shrink-0">
                  <PublishCtaButton
                    fullWidth
                    onNavigate={() => setIsMobileMenuOpen(false)}
                  />
                </div>

                {/* Navigation Links */}
                <div className="p-4 space-y-1">
                  <>
                    {/* Explorer sur la carte */}
                    <Link
                      to="/recherche?view=map"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="touch-row justify-between p-2.5 rounded-xl text-xs font-bold text-primary bg-primary-light hover:bg-primary-light/80 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <MapIcon className="w-icon-md h-icon-md text-primary" />
                        {t("shell.header.explorerSurLaCarte")}
                      </span>
                      <ChevronRight className="w-icon-md h-icon-md text-primary" />
                    </Link>

                    {/* Promotions */}
                    <Link
                      to={routes.deals()}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="touch-row justify-between p-2.5 rounded-xl text-xs font-bold text-warning hover:bg-warning-surface transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Sparkles className="w-icon-md h-icon-md text-amber-500" />
                        {t("shell.header.bonsPlansPrixReduits")}
                      </span>
                      <ChevronRight className="w-icon-md h-icon-md text-amber-400" />
                    </Link>

                    {/* Boutiques Professionnelles */}
                    <Link
                      to="/professionnels"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="touch-row justify-between p-2.5 rounded-xl text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        <Briefcase className="w-icon-md h-icon-md text-primary" />
                        Boutiques Professionnelles
                      </span>
                      <ChevronRight className="w-icon-md h-icon-md text-stone-400" />
                    </Link>

                    {/* Categories Collapsible */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setIsMobileCategoriesOpen(!isMobileCategoriesOpen)
                        }
                        className="w-full touch-row justify-between p-2.5 rounded-xl text-xs font-bold text-stone-900 hover:bg-bg-subtle transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Layers className="w-icon-md h-icon-md text-primary" />
                          Catégories
                        </span>
                        <ChevronDown
                          className={`w-icon-md h-icon-md text-stone-400 transition-transform ${
                            isMobileCategoriesOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isMobileCategoriesOpen && (
                        <div className="pl-6 pr-2 py-1 space-y-0.5 animate-in fade-in duration-fast">
                          {mobileCategories.map((cat) => (
                            <Link
                              key={cat.categoryId}
                              to={`/categorie/${cat.slug}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center justify-between py-1.5 px-2 text-xs font-medium text-stone-700 hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
                              title={getTaxonomyLabel(cat, "compact")}
                            >
                              <div className="flex items-center gap-2">
                                <CategoryIcon
                                  category={cat.slug}
                                  iconName={cat.iconName}
                                  size="xs"
                                />
                                <span>
                                  {getTaxonomyLabel(cat, {
                                    compact: true,
                                    locale: currentLocale,
                                  })}
                                </span>
                              </div>
                            </Link>
                          ))}
                          {mobileCategories.length === 0 && (
                            <Link
                              to={routes.categories()}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="block rounded-lg px-2 py-2 text-xs font-semibold text-primary hover:bg-primary-light"
                            >
                              Voir toutes les catégories
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </>

                  {/* Personalized destinations use the same route policy as the
                      desktop panel and router guards. Marketplace discovery
                      links above intentionally remain identical for everyone. */}
                  {isAuthenticated && currentUser && (
                    <div className="pt-3 border-t border-border-base mt-3 space-y-1">
                      <div className="px-2.5 text-micro font-bold uppercase tracking-wider text-stone-500">
                        {t("shell.header.accountMenu.availableAccess")}
                      </div>
                      {accountMenuItems.map((item) => (
                        <React.Fragment key={item.id}>
                          {item.separatorBefore ? (
                            <div
                              role="separator"
                              className="my-1 border-t border-border-subtle"
                            />
                          ) : null}
                          <AccountMenuDestinationLink
                            item={item}
                            label={t(item.labelKey)}
                            demoBadgeLabel={t(
                              "shell.demoRoleSwitcher.modeDemo",
                            )}
                            mobile
                            onNavigate={() => setIsMobileMenuOpen(false)}
                          />
                        </React.Fragment>
                      ))}
                      <div
                        role="separator"
                        className="my-1 border-t border-border-subtle"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full touch-row gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-danger hover:bg-danger-surface transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-icon-md h-icon-md text-danger" />
                        {t("shell.header.deconnexion")}
                      </button>
                    </div>
                  )}

                  {/* Mobile Language Selector */}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
                    <div className="min-w-0 px-1 text-micro font-bold uppercase tracking-wider text-stone-500">
                      Langue d'affichage
                    </div>
                    <LanguageSelector
                      idPrefix="header-mobile-lang"
                      className="shrink-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
  );
};
