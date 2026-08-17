import { routes } from '../../configuration/routes';
import { isProSeller } from '../../domains/user/user.domain';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  MapPin,
  PlusCircle,
  Heart,
  MessageSquare,
  Bell,
  User,
  ChevronDown,
  Sparkles,
  Briefcase,
  LogOut,
  ShoppingBag,
  List,
  Sliders,
  Shield,
  Menu,
  X,
  Map as MapIcon,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useMarketLocation } from '../providers/MarketLocationProvider';
import { TAXONOMY } from '../../domains/taxonomy/taxonomy.data';
import { getTaxonomyLabel } from '../../domains/taxonomy/taxonomy.service';
import { storageService } from '../../services/storage.service';
import { Badge } from '../../design-system/primitives/Badge';
import { Avatar } from '../../design-system/primitives/Badge';
import { CategoryIcon } from '../../design-system/primitives/CategoryIcon';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { useDialogBehavior } from '../../design-system/primitives/useDialogBehavior';
import { SEARCH_PLACEHOLDER } from '../../configuration/search.config';
import { GlobalSearchBar } from '../../design-system/primitives/GlobalSearchBar';
import { LanguageSelector } from '../../design-system/primitives/LanguageSelector';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, role, logout } = useAuth();
  const { location: userLocation, openLocationModal, activeMarket } = useMarketLocation();

  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu whenever route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close the header dropdowns on route change, Escape, or a click outside.
  useEffect(() => {
    setIsAccountMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsAccountMenuOpen(false);
    };
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isAccountMenuOpen]);

  // Escape, focus trap, focus restore and body-scroll lock for the mobile drawer.
  // This replaces a bespoke scroll lock that set `overflow: unset` on cleanup and
  // so fought with the Modal primitive's own lock.
  const { containerRef: drawerRef, titleId: drawerTitleId } = useDialogBehavior(
    isMobileMenuOpen,
    () => setIsMobileMenuOpen(false)
  );

  const favCount = storageService.getFavorites().length;
  const unreadMessagesCount = storageService.getConversations().reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const unreadNotifsCount = storageService.getNotifications().filter((n) => !n.isRead).length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-6">
          
          {/* Logo & Category trigger */}
          <div className="flex items-center gap-4 shrink-0">
            <Link to={routes.home()} className="flex items-center gap-2 select-none group">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black text-xl shadow-xs group-hover:scale-105 transition-transform">
                S
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight uppercase text-stone-900 leading-none">
                  Shongre<span className="text-primary">.</span>
                </span>
                <span className="text-micro font-bold text-stone-600 tracking-wider uppercase mt-0.5">
                  {activeMarket.name}
                </span>
              </div>
            </Link>

            {/* Language selector (Desktop) */}
            <div className="hidden lg:block">
              <LanguageSelector idPrefix="header-desktop-lang" />
            </div>
          </div>

          {/* Global Search bar (Desktop) */}
          <div className="flex-1 max-w-2xl hidden md:block">
            <GlobalSearchBar
              variant="header"
              idPrefix="header-desktop"
              showCategory={true}
              showLocation={true}
            />
          </div>

          {/* Header Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Publish CTA Button (Desktop & Tablet only - hidden on mobile) */}
            <Link
              to="/deposer"
              className="hidden md:flex bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 h-10 rounded-xl shadow-xs hover:shadow-sm transition-all items-center justify-center gap-2 shrink-0 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Déposer une annonce</span>
            </Link>

            {/* Favorites */}
            <Link
              to="/compte/favoris"
              className="relative p-2 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-bg-subtle transition-colors hidden sm:flex items-center justify-center"
              aria-label="Favoris"
            >
              <Heart className="w-5 h-5" />
              {favCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-micro font-bold flex items-center justify-center">
                  {favCount}
                </span>
              )}
            </Link>

            {/* Messages */}
            <Link
              to="/compte/messages"
              className="relative p-2 rounded-xl text-stone-700 hover:text-stone-950 hover:bg-bg-subtle transition-colors hidden sm:flex items-center justify-center"
              aria-label="Messagerie"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-micro font-bold flex items-center justify-center">
                  {unreadMessagesCount}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <div className="hidden sm:block">
              <NotificationBell />
            </div>

            {/* User Account Menu (Desktop) */}
            <div className="relative hidden md:block" ref={accountMenuRef}>
              {isAuthenticated && currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  aria-expanded={isAccountMenuOpen}
                  aria-haspopup="menu"
                  aria-label={`Menu du compte de ${currentUser.name}`}
                  className="flex items-center gap-2 p-1 pl-2 rounded-xl border border-border-base hover:bg-bg-subtle transition-colors cursor-pointer"
                >
                  <Avatar
                    src={currentUser.avatarUrl}
                    name={currentUser.name}
                    size="sm"
                    isVerified={currentUser.isVerified}
                    isPro={isProSeller(currentUser)}
                  />
                  <span className="text-xs font-bold text-stone-900 hidden lg:inline max-w-[100px] truncate">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden sm:inline" />
                </button>
              ) : (
                <Link
                  to="/connexion"
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-stone-700 hover:text-stone-950 px-3 py-2 rounded-xl hover:bg-bg-subtle transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Se connecter</span>
                </Link>
              )}

              {/* Account Dropdown */}
              {isAccountMenuOpen && isAuthenticated && currentUser && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-border-base py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2.5 border-b border-border-subtle">
                    <div className="font-bold text-sm text-stone-900 truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-xs text-stone-500 truncate">{currentUser.email}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {isProSeller(currentUser) ? (
                        <Badge variant="pro" size="sm">Compte Professionnel</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Particulier</Badge>
                      )}
                      {currentUser.isVerified && (
                        <Badge variant="verified" size="sm">Vérifié</Badge>
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
                      Tableau de bord compte
                    </Link>
                    <Link
                      to="/compte/annonces"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                    >
                      <List className="w-4 h-4 text-stone-400" />
                      Mes annonces ({storageService.getListings().filter(l => l.sellerId === currentUser.id).length})
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
                      {isProSeller(currentUser) ? 'Voir ma vitrine boutique' : 'Voir mon profil public'}
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
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={isMobileMenuOpen}
              className="md:hidden p-2 rounded-xl text-stone-800 hover:text-stone-950 hover:bg-bg-subtle active:bg-bg-muted transition-colors flex items-center justify-center cursor-pointer"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-stone-900" />
              ) : (
                <Menu className="w-6 h-6 text-stone-900" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation (rendered via Portal to prevent sticky header clipping) */}
      {isMobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] md:hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity duration-200"
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
            className="relative w-full sm:w-[85vw] sm:max-w-[380px] h-[100dvh] bg-white shadow-2xl flex flex-col z-10 sm:border-l border-border-base animate-in slide-in-from-right duration-200"
          >
            
            {/* Drawer Header (Targeted element 1: Non-shrinkable, clean border & spacing) */}
            <div className="p-4 sm:p-5 border-b border-border-base flex items-center justify-between bg-bg-base shrink-0 sticky top-0 z-20 shadow-2xs">
              <Link
                to={routes.home()}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2.5 select-none"
              >
                <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-black text-lg shadow-xs">
                  S
                </div>
                <div className="flex flex-col">
                  <span id={drawerTitleId} className="text-lg font-black text-stone-900 tracking-tight leading-none">
                    Shongre<span className="text-primary">.</span>
                  </span>
                  <span className="text-micro font-bold text-stone-600 tracking-wider uppercase mt-0.5">
                    {activeMarket.name}
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 transition-colors cursor-pointer"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
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
                      <div className="text-xs text-stone-500 truncate">{currentUser.email}</div>
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {isProSeller(currentUser) ? (
                          <Badge variant="pro" size="sm">Pro</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Particulier</Badge>
                        )}
                        {currentUser.isVerified && (
                          <Badge variant="verified" size="sm">Vérifié</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="text-xs font-medium text-stone-600">
                      Connectez-vous pour gérer vos annonces et messages
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/connexion"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full py-2 px-3 text-center text-xs font-bold text-stone-900 bg-white border border-border-base rounded-xl hover:bg-stone-50 transition-colors shadow-xs"
                      >
                        Se connecter
                      </Link>
                      <Link
                        to="/inscription"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full py-2 px-3 text-center text-xs font-bold text-white bg-primary rounded-xl hover:bg-primary-hover active:bg-primary-active transition-colors shadow-xs"
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
                <Link
                  to="/deposer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs hover:bg-primary-hover active:bg-primary-active active:scale-98 transition-all"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Déposer une annonce</span>
                </Link>
              </div>

              {/* Navigation Links */}
              <div className="p-4 space-y-1">
                
                {/* Explorer sur la carte */}
                <Link
                  to="/recherche?view=map"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-primary bg-primary-light hover:bg-primary-light/80 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <MapIcon className="w-4 h-4 text-primary" />
                    Explorer sur la carte
                  </span>
                  <ChevronRight className="w-4 h-4 text-primary" />
                </Link>

                {/* Bons plans & Prix réduits */}
                <Link
                  to="/bons-plans"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-amber-800 hover:bg-amber-50 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Bons plans & Prix réduits
                  </span>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </Link>

                {/* Boutiques Professionnelles */}
                <Link
                  to="/professionnels"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
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
                    onClick={() => setIsMobileCategoriesOpen(!isMobileCategoriesOpen)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-stone-900 hover:bg-bg-subtle transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-primary" />
                      Catégories ({TAXONOMY.length})
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-stone-400 transition-transform ${
                        isMobileCategoriesOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isMobileCategoriesOpen && (
                    <div className="pl-6 pr-2 py-1 space-y-0.5 animate-in fade-in duration-150">
                      {TAXONOMY.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/categorie/${cat.slug}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center justify-between py-1.5 px-2 text-xs font-medium text-stone-700 hover:text-primary hover:bg-primary-light rounded-lg transition-colors"
                          title={cat.name}
                        >
                          <div className="flex items-center gap-2">
                            <CategoryIcon category={cat} size="xs" />
                            <span>{getTaxonomyLabel(cat, 'compact')}</span>
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
                      className="flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                    >
                      <User className="w-4 h-4 text-stone-500" />
                      Tableau de bord
                    </Link>
                    <Link
                      to="/compte/annonces"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                    >
                      <List className="w-4 h-4 text-stone-500" />
                      Mes annonces
                    </Link>
                    <Link
                      to="/compte/favoris"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                    >
                      <Heart className="w-4 h-4 text-stone-500" />
                      Mes favoris ({favCount})
                    </Link>
                    <Link
                      to="/compte/achats"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-stone-800 hover:bg-bg-subtle transition-colors"
                    >
                      <ShoppingBag className="w-4 h-4 text-stone-500" />
                      Achats & Transactions
                    </Link>
                    <Link
                      to="/solutions-pro"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
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
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      Déconnexion
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
        document.body
      )}
    </header>
  );
};
