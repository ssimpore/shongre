import { routes } from '../../configuration/routes';
import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  ShieldAlert,
  Users,
  Globe,
  CreditCard,
  KeyRound,
  FileSpreadsheet,
  ArrowLeft,
  
  
  
  Layers,
  Mail,
  Briefcase,
  Sparkles,
  Cpu,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { ROLE_DEFINITIONS } from '../../security/roles.config';
import { useAuthorization } from '../../security/useAuthorization';
import { Image } from '../../design-system/primitives/Image';
import { AppScrollRestoration } from '../../app/router/AppScrollRestoration';
import { useTranslation } from '../../i18n/I18nProvider';
import { SkipLink } from '../../design-system/primitives/SkipLink';

export const AdminLayout: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, role: platformRole } = useAuth();
  const { can } = useAuthorization();
  const location = useLocation();
  const [isSectionMenuOpen, setIsSectionMenuOpen] = useState(false);
  const sectionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsSectionMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isSectionMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSectionMenuOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(e.target as Node)) {
        setIsSectionMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isSectionMenuOpen]);

  const roleMeta = ROLE_DEFINITIONS[platformRole] || ROLE_DEFINITIONS.guest;
  const marketScope = currentUser?.marketScope?.countries || ['FR'];
  const marketLabel = marketScope.includes('*')
    ? 'Portée Globale (*)'
    : `Marché : ${marketScope.join(', ')}`;

  const navItems = [
    {
      to: '/admin',
      end: true,
      label: 'Vue d\'ensemble',
      icon: LayoutDashboard,
      show: true,
    },
    {
      to: '/admin/crm',
      label: 'CRM & Pipeline Ventes',
      icon: Briefcase,
      show: can('crm.access') || can('staff.commercial.access') || can('admin.access'),
    },
    {
      to: '/admin/crm/prospection',
      label: 'Prospection IA',
      icon: Sparkles,
      show: can('crm.ai_prospecting.use') || can('staff.commercial.access') || can('admin.access'),
    },
    {
      to: '/admin/moderation',
      label: 'Modération & Signalements',
      icon: ShieldAlert,
      show: can('moderation.review') || can('report.review') || can('listing.moderate'),
    },
    {
      to: '/admin/utilisateurs',
      label: 'Utilisateurs & Profils',
      icon: Users,
      show: can('user.read') || can('user.manage') || can('user.verify'),
    },
    {
      to: '/admin/verifications',
      label: 'Conformité KYC / KYB',
      icon: Shield,
      show: can('user.read') || can('user.manage') || can('user.verify'),
    },
    {
      to: '/admin/marches',
      label: 'Marchés & Territoires',
      icon: Globe,
      show: can('market.manage') || can('market.configure'),
    },
    {
      to: '/admin/fournisseurs',
      label: 'Fournisseurs & Intégrations',
      icon: Cpu,
      show: can('provider.read') || can('admin.access'),
    },
    {
      to: '/admin/newsletter',
      label: 'Newsletter & Campagnes',
      icon: Mail,
      show: can('market.manage') || can('admin.access'),
    },
    {
      to: '/admin/taxonomie',
      label: 'Taxonomie & Attributs',
      icon: Layers,
      show: can('taxonomy.manage') || can('admin.access'),
    },
    {
      to: '/admin/monetisation',
      label: 'Monétisation & Forfaits Pro',
      icon: CreditCard,
      show: can('monetization.manage') || can('staff.finance.access'),
    },
    {
      to: '/admin/roles',
      label: 'Matrice Rôles & Permissions',
      icon: KeyRound,
      show: true,
    },
    {
      to: '/admin/audit',
      label: 'Registre d\'Audit Sécurité',
      icon: FileSpreadsheet,
      show: can('audit.read'),
    },
  ];

  const visibleNavItems = navItems.filter((item) => item.show);
  // Longest matching path wins, so `/admin/crm/contacts` reports "Contacts"
  // rather than the `/admin` overview it also prefixes.
  const activeNavItem = visibleNavItems
    .filter((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
    )
    .sort((a, b) => b.to.length - a.to.length)[0];


  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans text-stone-900">
      <SkipLink />
      <AppScrollRestoration />
      {/* Top Internal Staff Bar */}
      <header className="bg-stone-900 text-white sticky top-0 z-40 border-b border-stone-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/admin" className="flex items-center gap-2 group min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                S
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-black tracking-tight flex items-center gap-1.5 min-w-0">
                  <span className="truncate">Shongre Console</span>
                  <span className="hidden sm:inline text-micro bg-stone-800 text-stone-300 font-mono px-2 py-1 rounded-sm border border-stone-700 shrink-0">
                    v2.4
                  </span>
                </span>
              </div>
            </Link>

            <span className="hidden md:inline-block text-stone-600">|</span>

            {/* Scope pill */}
            <div className="hidden md:flex items-center gap-1.5 bg-stone-800/80 border border-stone-700 text-stone-300 text-xs px-2.5 py-1 rounded-full">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>{marketLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* User identity & badge */}
            <div className="flex items-center gap-2.5">
              <Image
                src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                alt={currentUser?.name || 'Staff'}
                sizes="28px"
                className="w-7 h-7 rounded-full object-cover border border-stone-700 shrink-0"
              />
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-stone-100 leading-tight">
                  {currentUser?.name || 'Agent Shongre'}
                </span>
                <span className="text-micro text-stone-400 font-medium">
                  {roleMeta.title}
                </span>
              </div>
            </div>

            <span
              className={`hidden sm:inline text-micro font-bold px-2 py-1 rounded-full border shrink-0 ${roleMeta.badgeColor}`}
            >
              {roleMeta.shortLabel}
            </span>

            {/* Back to public marketplace. A styled Link rather than a Button
                inside a Link: nesting a <button> in an <a> is invalid and gave
                two tab stops, and Button's `outline` variant sets text-stone-900,
                which won the utility-order conflict against the override here and
                rendered the label at 1.15:1 on the dark bar.
                Collapses to an icon on phones so the staff bar fits 320px. */}
            <Link
              to={routes.home()}
              aria-label={t('admin.adminLayout.retourALaPlaceDe')}
              className="shrink-0 inline-flex items-center gap-2 h-8 px-3 rounded-xl text-xs font-bold bg-stone-800 text-stone-200 border border-stone-700 hover:bg-stone-700 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t('admin.adminLayout.placeDeMarche')}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace Container */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        {/* Compact section menu (below `lg`).
            This was a horizontal rail of every console section — fourteen items
            on one scrolling line, where finding "Taxonomie" meant swiping past
            nine others with no sense of how many remained. A disclosure showing
            the current section, opening the full list, gives the same reach in
            one tap and keeps the answer to "where am I" on screen. */}
        <div className="lg:hidden relative min-w-0" ref={sectionMenuRef}>
          <button
            type="button"
            onClick={() => setIsSectionMenuOpen((open) => !open)}
            aria-expanded={isSectionMenuOpen}
            aria-haspopup="menu"
            aria-controls="admin-section-menu"
            className="w-full flex items-center justify-between gap-3 bg-white rounded-xl border border-stone-200 shadow-xs px-3 h-control-touch cursor-pointer hover:bg-bg-base transition-colors"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              {activeNavItem ? (
                <activeNavItem.icon className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <LayoutDashboard className="w-4 h-4 text-primary shrink-0" />
              )}
              <span className="flex flex-col items-start min-w-0">
                <span className="text-micro font-bold uppercase tracking-wider text-stone-500 leading-none">
                  Console
                </span>
                <span className="text-xs font-bold text-stone-900 truncate max-w-full">
                  {activeNavItem?.label || "Vue d'ensemble"}
                </span>
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-stone-500 shrink-0 transition-transform ${
                isSectionMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isSectionMenuOpen && (
            <div
              id="admin-section-menu"
              role="menu"
              aria-label={t('admin.adminLayout.sectionsDeLaConsole')}
              className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-white rounded-xl border border-stone-200 shadow-xl py-1.5 max-h-[60vh] overflow-y-auto animate-in fade-in slide-in-from-top"
            >
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    role="menuitem"
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary-light text-primary font-bold'
                          : 'text-stone-700 hover:bg-bg-subtle'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Sidebar Nav (lg+).
            Held back to `lg`: at `md` the 256px rail left admin tables a 453px
            column, which is narrower than the phone layout they were designed
            to fall back to. */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-3 sticky top-20">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-stone-500">
              Espace Interne & Gouvernance
            </div>

            <nav className="space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-white font-bold shadow-xs'
                          : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-6 pt-4 border-t border-stone-100 px-3">
              <div className="text-xs text-stone-500 mb-2">{t('admin.adminLayout.statutDeSession')}</div>
              <div className="flex items-center gap-2 text-xs text-success font-semibold bg-success-surface px-2.5 py-1.5 rounded-md border border-success-border">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>{t('admin.adminLayout.sessionAuthentifieeRbac')}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Outlet */}
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
