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
  X,
  Map as MapIcon,
  ChevronRight,
  Layers,
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import { useMarketLocation } from "../providers/MarketLocationProvider";
import { useFavorites } from "../providers/FavoritesProvider";
import { TAXONOMY } from "../../domains/taxonomy/taxonomy.data";
import { getTaxonomyLabel } from "../../domains/taxonomy/taxonomy.service";
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

const HEADER_SCROLL_BEHAVIOR = {
  hideTravel: 48,
  revealTravel: 32,
  revealAtTop: 12,
  transitionSettleMs: 300,
} as const;

export const Header: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  /* The results page renders its own, richer search bar — see the desktop
     search slot below. */
  const isSearchRoute = location.pathname === "/recherche";
  const { currentUser, isAuthenticated, logout } = useAuth();
  const { activeMarket } = useMarketLocation();

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
    // Show on collections and deals
    if (path.startsWith("/collections") || path === "/bons-plans") return true;

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
        navigate(`/recherche?category=${slug}`);
      } else {
        navigate("/recherche");
      }
    }
  };

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const [isHeaderSearchExpanded, setIsHeaderSearchExpanded] = useState(false);
  // Set when the drawer is opened via the search button rather than the burger,
  // so the field takes focus instead of the user having to tap it again.

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu whenever route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsHeaderSearchExpanded(false);
  }, [location.pathname]);

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
  const unreadMessagesCount = storageService.getUnreadMessageCount(
    currentUser?.id,
  );
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
          <div className="flex items-center gap-3 lg:gap-4 shrink-0">
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
                aria-label={t(publishCta.labelKey)}
                tabIndex={isHeaderSearchExpanded ? -1 : undefined}
                variant="pro"
                size="compact"
                leftIcon={<PlusCircle className="w-4 h-4 text-primary" />}
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
              className={`relative hidden h-control-md w-control-md items-center justify-center rounded-control text-stone-600 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} hover:bg-bg-subtle hover:text-stone-950 active:bg-bg-muted lg:flex group`}
              aria-label="Favoris"
            >
              <Heart className="w-5 h-5 group-hover:scale-110 transition-transform duration-fast" />
              {favCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-white text-micro font-bold flex items-center justify-center shadow-xs transform translate-x-1/4 -translate-y-1/4">
                  {favCount}
                </span>
              )}
            </Link>

            {/* Messages */}
            <Link
              to="/compte/messages"
              className={`relative hidden h-control-md w-control-md items-center justify-center rounded-control text-stone-600 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} hover:bg-bg-subtle hover:text-stone-950 active:bg-bg-muted lg:flex group`}
              aria-label="Messagerie"
            >
              <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform duration-fast" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-white text-micro font-bold flex items-center justify-center shadow-xs transform translate-x-1/4 -translate-y-1/4">
                  {unreadMessagesCount}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <div className="hidden lg:flex items-center justify-center">
              <NotificationBell />
            </div>

            {/* User Account Menu (Desktop) */}
            <div className="relative hidden md:block ml-1" ref={accountMenuRef}>
              {isAuthenticated && currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  aria-expanded={isAccountMenuOpen}
                  /* The panel is a labelled group of links, not a `menu`, and
                     it now says so on both ends — the trigger used to promise
                     `menu` while the container carried no role at all. */
                  aria-haspopup="dialog"
                  aria-controls="header-account-menu"
                  aria-label={`Menu du compte de ${currentUser.name}`}
                  className={`flex h-control-md items-center gap-2 rounded-control border py-1 pl-1.5 pr-2.5 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} cursor-pointer ${isAccountMenuOpen ? "bg-bg-muted border-border-hover shadow-inner" : "bg-bg-surface border-border-base hover:bg-bg-subtle hover:border-border-hover hover:shadow-2xs"}`}
                >
                  <Avatar
                    src={currentUser.avatarUrl}
                    name={currentUser.name}
                    size="sm"
                    isVerified={currentUser.isVerified}
                    isPro={isProSeller(currentUser)}
                  />
                  <span className="text-sm font-bold text-stone-800 hidden lg:inline max-w-[100px] truncate">
                    {currentUser.name.split(" ")[0]}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-stone-400 hidden sm:inline transition-transform duration-normal ${isAccountMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
              ) : (
                <Button
                  to="/connexion"
                  variant="ghost"
                  size="compact"
                  leftIcon={<User className="w-4 h-4" />}
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
                    <div className="font-bold text-sm text-stone-900 truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-xs text-stone-500 truncate">
                      {currentUser.email}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {isProSeller(currentUser) ? (
                        <Badge variant="pro" size="sm">
                          {t("shell.header.compteProfessionnel")}
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">
                          Particulier
                        </Badge>
                      )}
                      {currentUser.isVerified && (
                        <Badge variant="verified" size="sm">
                          {t("shell.header.verifie")}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/compte"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                    >
                      <User className="w-4 h-4 text-stone-400" />
                      {t("shell.header.tableauDeBordCompte")}
                    </Link>
                    <Link
                      to="/compte/annonces"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                    >
                      <List className="w-4 h-4 text-stone-400" />
                      Mes annonces (
                      {
                        storageService
                          .getListings()
                          .filter((l) => l.sellerId === currentUser.id).length
                      }
                      )
                    </Link>
                    <Link
                      to="/compte/favoris"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                    >
                      <Heart className="w-4 h-4 text-stone-400" />
                      Mes favoris
                    </Link>
                    <Link
                      to="/compte/achats"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                    >
                      <ShoppingBag className="w-4 h-4 text-stone-400" />
                      Achats & Transactions
                    </Link>

                    <Link
                      to={
                        isProSeller(currentUser)
                          ? `/boutique/${currentUser.storeSlug || currentUser.slug || currentUser.id}`
                          : `/profil/${currentUser.slug || currentUser.id}`
                      }
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-primary hover:bg-primary-light transition-colors"
                    >
                      <User className="w-4 h-4 text-primary" />
                      {isProSeller(currentUser)
                        ? "Voir ma vitrine boutique"
                        : "Voir mon profil public"}
                    </Link>

                    <div className="border-t border-border-subtle my-1" />

                    <Link
                      to="/solutions-pro"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-bg-subtle transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Solutions & Abonnements Pro
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setIsAccountMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger-surface transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-danger" />
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
                <X className="w-6 h-6 text-stone-900" />
              ) : (
                <Menu className="w-6 h-6 text-stone-900" />
              )}
            </button>
          </div>
        </div>
      </Container>

      {/* Category Sub-Header Bar (Smartly shown on Home and Discovery surfaces) */}
      {shouldShowCategoryBar && (
        <nav
          ref={categoryNavRef}
          aria-label={t("ui.categoryFilterRail.filtresParCategorie")}
          aria-hidden={!isCategoryNavVisible}
          data-scroll-state={isCategoryNavVisible ? "visible" : "hidden"}
          onPointerEnter={revealCategoryNav}
          onFocusCapture={revealCategoryNav}
          onTouchStart={revealCategoryNav}
          className={`overflow-hidden bg-white/95 backdrop-blur-md motion-layout ${
            isCategoryNavVisible
              ? "visible max-h-control-md translate-y-0 opacity-100"
              : "invisible pointer-events-none max-h-0 -translate-y-1 opacity-0"
          }`}
        >
          <Container>
            <HeaderCategoryNav
              activeCategorySlug={activeCategorySlug}
              currentPath={location.pathname}
              onSelectCategory={handleCategorySelect}
            />
          </Container>
        </nav>
      )}

      {/* Mobile Drawer Navigation (rendered via Portal to prevent sticky header
          clipping).

          `z-drawer` puts the drawer between page chrome and dialogs: above the
          sticky header and the mobile tab bar (both `z-header`), below modals and
          toasts (`z-modal`). It was `z-[9999]`, the only arbitrary z-index in the
          app, which stacked it over every dialog — including the ones it opens
          itself. Tapping "Changer" beside the location did open the picker; it
          just rendered underneath the drawer, so nothing appeared to happen. */}
      {isMobileMenuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-drawer lg:hidden flex justify-end">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-[2px] transition-opacity duration-normal"
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
              className="relative w-full sm:w-[85vw] sm:max-w-[380px] h-[100dvh] bg-bg-surface shadow-overlay flex flex-col z-raised sm:border-l border-border-base animate-in slide-in-from-right duration-normal"
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
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Drawer Body with generous bottom spacing */}
              <div className="flex-1 overflow-y-auto overscroll-contain pb-28">
                {/* User status card / Login CTA (Targeted element 2) */}
                <div className="p-4 sm:p-5 bg-bg-base border-b border-border-base shrink-0">
                  {isAuthenticated && currentUser ? (
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={currentUser.avatarUrl}
                        name={currentUser.name}
                        size="md"
                        isVerified={currentUser.isVerified}
                        isPro={isProSeller(currentUser)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-stone-900 truncate">
                          {currentUser.name}
                        </div>
                        <div className="text-xs text-stone-500 truncate">
                          {currentUser.email}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          {isProSeller(currentUser) ? (
                            <Badge variant="pro" size="sm">
                              Pro
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              Particulier
                            </Badge>
                          )}
                          {currentUser.isVerified && (
                            <Badge variant="verified" size="sm">
                              {t("shell.header.verifie")}
                            </Badge>
                          )}
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
                          className={`w-full h-control-md px-3 text-center text-xs font-bold text-stone-900 bg-bg-surface border border-border-base rounded-control hover:bg-bg-subtle ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} shadow-xs`}
                        >
                          Se connecter
                        </Link>
                        <Link
                          to="/inscription"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`w-full h-control-md px-3 text-center text-xs font-bold text-white bg-primary rounded-control hover:bg-primary-hover active:bg-primary-active ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} shadow-xs`}
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
                  {/* Explorer sur la carte */}
                  <Link
                    to="/recherche?view=map"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="touch-row justify-between p-2.5 rounded-xl text-xs font-bold text-primary bg-primary-light hover:bg-primary-light/80 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <MapIcon className="w-4 h-4 text-primary" />
                      {t("shell.header.explorerSurLaCarte")}
                    </span>
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </Link>

                  {/* Bons plans & Prix réduits */}
                  <Link
                    to="/bons-plans"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="touch-row justify-between p-2.5 rounded-xl text-xs font-bold text-warning hover:bg-warning-surface transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      {t("shell.header.bonsPlansPrixReduits")}
                    </span>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </Link>

                  {/* Boutiques Professionnelles */}
                  <Link
                    to="/professionnels"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="touch-row justify-between p-2.5 rounded-xl text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Briefcase className="w-4 h-4 text-primary" />
                      Boutiques Professionnelles
                    </span>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
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
                        <Layers className="w-4 h-4 text-primary" />
                        Catégories ({TAXONOMY.length})
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-stone-400 transition-transform ${
                          isMobileCategoriesOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isMobileCategoriesOpen && (
                      <div className="pl-6 pr-2 py-1 space-y-0.5 animate-in fade-in duration-fast">
                        {TAXONOMY.map((cat) => (
                          <Link
                            key={cat.id}
                            to={`/categorie/${cat.slug}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center justify-between py-1.5 px-2 text-xs font-medium text-stone-700 hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
                            title={getTaxonomyLabel(cat, "compact")}
                          >
                            <div className="flex items-center gap-2">
                              <CategoryIcon category={cat} size="xs" />
                              <span>{getTaxonomyLabel(cat, "compact")}</span>
                            </div>
                            <span className="text-micro text-stone-500">
                              {cat.subCategories.length}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* User Logged In Links */}
                  {isAuthenticated && currentUser && (
                    <div className="pt-3 border-t border-border-base mt-3 space-y-1">
                      <div className="px-2.5 text-micro font-bold uppercase tracking-wider text-stone-500">
                        Mon Espace
                      </div>
                      <Link
                        to="/compte"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="touch-row gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                      >
                        <User className="w-4 h-4 text-stone-500" />
                        {t("shell.header.tableauDeBord")}
                      </Link>
                      <Link
                        to="/compte/annonces"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="touch-row gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                      >
                        <List className="w-4 h-4 text-stone-500" />
                        {t("shell.header.mesAnnonces")}
                      </Link>
                      <Link
                        to="/compte/favoris"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="touch-row gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                      >
                        <Heart className="w-4 h-4 text-stone-500" />
                        Mes favoris ({favCount})
                      </Link>
                      <Link
                        to="/compte/achats"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="touch-row gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4 text-stone-500" />
                        Achats & Transactions
                      </Link>
                      <Link
                        to="/solutions-pro"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="touch-row gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-warning hover:bg-warning-surface transition-colors"
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Solutions Pro
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full touch-row gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-danger hover:bg-danger-surface transition-colors text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-danger" />
                        {t("shell.header.deconnexion")}
                      </button>
                    </div>
                  )}

                  {/* Mobile Language Selector */}
                  <div className="pt-4 border-t border-border-subtle mt-4">
                    <div className="text-micro font-bold uppercase tracking-wider text-stone-500 mb-2 px-1">
                      Langue d'affichage
                    </div>
                    <LanguageSelector idPrefix="header-mobile-lang" />
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
