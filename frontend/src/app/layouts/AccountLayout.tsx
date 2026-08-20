import { routes } from '../../configuration/routes';
import { isProSeller } from '../../domains/user/user.domain';
import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  User,
  List,
  Heart,
  Search,
  MessageSquare,
  Bell,
  ShoppingBag,
  
  
  Shield,
  Settings,
  Briefcase,
  BarChart3,
  Sparkles,
  LogOut,
  Headphones,
  Mail
} from 'lucide-react';
import { useAuth } from '../providers/AuthProvider';
import { useNotifications } from '../providers/NotificationProvider';
import { Avatar, Badge } from '../../design-system/primitives/Badge';
import { storageService } from '../../services/storage.service';
import { useTranslation } from '../../i18n/I18nProvider';

export const AccountLayout: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, logout } = useAuth();
  const { unreadCount: unreadNotifCount } = useNotifications();
  const navigate = useNavigate();

  const isPro = isProSeller(currentUser);

  // Every badge here must be scoped to the signed-in user — see
  // storageService.getUnreadMessageCount for why.
  const unreadMsgCount = storageService.getUnreadMessageCount(currentUser?.id);
  const favCount = currentUser ? storageService.getFavorites().length : 0;
  const savedSearchCount = currentUser ? storageService.getSavedSearches().length : 0;
  const myListingsCount = currentUser
    ? storageService.getListings().filter((l) => l.sellerId === currentUser.id).length
    : 0;

  const navItems = [
    { to: '/compte', label: 'Vue d\'ensemble', icon: <User className="w-4 h-4" />, end: true },
    { to: '/compte/annonces', label: 'Mes annonces', icon: <List className="w-4 h-4" />, count: myListingsCount },
    { to: '/compte/favoris', label: 'Mes favoris', icon: <Heart className="w-4 h-4" />, count: favCount },
    { to: '/compte/recherches', label: 'Recherches sauvegardées', icon: <Search className="w-4 h-4" />, count: savedSearchCount },
    { to: '/compte/messages', label: 'Messages & Offres', icon: <MessageSquare className="w-4 h-4" />, count: unreadMsgCount },
    { to: '/compte/notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, count: unreadNotifCount },
    { to: '/compte/achats', label: 'Transactions & Séquestre', icon: <ShoppingBag className="w-4 h-4" /> },
    { to: '/compte/verification', label: 'Sécurité & Vérification', icon: <Shield className="w-4 h-4 text-success" /> },
    { to: '/compte/support', label: 'Aide & Assistance', icon: <Headphones className="w-4 h-4" /> },
    { to: '/compte/newsletter', label: 'Newsletter & Alertes', icon: <Mail className="w-4 h-4" /> },
    { to: '/compte/profil', label: 'Mon profil & Coordonnées', icon: <Settings className="w-4 h-4" /> },
  ];

  const proNavItems = [
    { to: '/compte/pro/tableau-de-bord', label: 'Dashboard Pro', icon: <BarChart3 className="w-4 h-4 text-primary" /> },
    { to: '/compte/pro/vitrine', label: 'Personnaliser ma vitrine', icon: <Briefcase className="w-4 h-4 text-primary" /> },
    { to: '/compte/pro/abonnements', label: 'Mon forfait & Facturation', icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        
        {/* Mobile & Tablet Navigation Header (< lg).
            `min-w-0` is required: a grid item defaults to `min-width:auto`, so
            without it the nested `overflow-x-auto` rail stretches the whole
            track and the page scrolls sideways on phones. */}
        <div className="lg:hidden min-w-0 bg-white rounded-2xl border border-border-base p-4 shadow-xs space-y-3">
          {/* User Quick Info */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={currentUser?.avatarUrl}
                name={currentUser?.name || 'Utilisateur'}
                size="md"
                isVerified={currentUser?.isVerified}
                isPro={isPro}
              />
              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm text-stone-900 truncate">
                  {currentUser?.companyName || currentUser?.name || 'Mon Compte'}
                </div>
                <div className="text-xs text-stone-500 truncate">{currentUser?.email}</div>
              </div>
            </div>
            <div>
              {isPro ? (
                <Badge variant="pro" size="sm">{t('shell.accountLayout.comptePro')}</Badge>
              ) : (
                <Badge variant="neutral" size="sm">Particulier</Badge>
              )}
            </div>
          </div>

          {/* Horizontally scrollable navigation tabs */}
          <nav
            aria-label={t('shell.accountLayout.navigationDuCompte')}
            className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1 -mx-1 px-1 no-scrollbar"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors shrink-0 ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-bg-subtle text-stone-700 hover:bg-bg-muted hover:text-stone-900'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="text-micro font-bold px-2 py-1 rounded-full bg-white/20 text-current">
                    {item.count}
                  </span>
                )}
              </NavLink>
            ))}

            {isPro &&
              proNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors shrink-0 ${
                      isActive
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-warning-surface text-warning border border-warning-border hover:bg-warning-surface'
                    }`
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
          </nav>
        </div>

        {/* Desktop Navigation Sidebar (>= lg) */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="bg-white rounded-2xl border border-border-base p-5 sticky top-20 shadow-xs">
            
            {/* User Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
              <Avatar
                src={currentUser?.avatarUrl}
                name={currentUser?.name || 'Utilisateur'}
                size="lg"
                isVerified={currentUser?.isVerified}
                isPro={isPro}
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-stone-900 truncate">
                  {currentUser?.companyName || currentUser?.name || 'Mon Compte'}
                </div>
                <div className="text-xs text-stone-500 truncate">{currentUser?.email}</div>
                <div className="mt-1">
                  {isPro ? (
                    <Badge variant="pro" size="sm">{t('shell.accountLayout.comptePro')}</Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">Particulier</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Standard Nav Links */}
            <nav className="mt-4 space-y-1">
              <div className="text-micro font-bold text-stone-500 uppercase tracking-wider px-3 mb-1">
                Espace Personnel
              </div>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-light text-primary'
                        : 'text-stone-700 hover:bg-bg-subtle hover:text-stone-900'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-micro font-bold px-2 py-1 rounded-full bg-stone-100 text-stone-700">
                      {item.count}
                    </span>
                  )}
                </NavLink>
              ))}

              {/* Pro Section */}
              {isPro && (
                <div className="pt-3 mt-3 border-t border-border-subtle space-y-1">
                  <div className="text-micro font-bold text-primary uppercase tracking-wider px-3 mb-1">
                    Outils Professionnels
                  </div>
                  {proNavItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary-light text-primary'
                            : 'text-stone-700 hover:bg-bg-subtle hover:text-stone-900'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                    </NavLink>
                  ))}
                </div>
              )}

              {/* Logout */}
              <div className="pt-3 mt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate(routes.home());
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger-surface rounded-lg transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4 text-danger" />
                  <span>{t('shell.accountLayout.seDeconnecter')}</span>
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Right Content Area. `min-w-0` keeps wide children (tables, rails,
            long unbroken strings) inside the track instead of widening it. */}
        <section className="lg:col-span-3 min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
};
