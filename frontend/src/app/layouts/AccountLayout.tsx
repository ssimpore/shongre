import { routes } from "../../configuration/routes";
import {
  isProSeller,
  showsVerifiedBadge,
} from "../../domains/user/user.domain";
import React from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  User,
  List,
  Heart,
  Search,
  MessageSquare,
  Bell,
  ShoppingBag,
  Shield,
  ShieldCheck,
  Settings,
  Briefcase,
  BarChart3,
  Sparkles,
  LogOut,
  Headphones,
  Mail,
  GraduationCap,
  CarFront,
  Building2,
  KeyRound,
  Users,
  BadgeEuro,
  Scale,
  Target,
  FileKey2,
} from "lucide-react";
import { useAuth } from "../providers/AuthProvider";
import { useNotifications } from "../providers/NotificationProvider";
import { Avatar, Badge, Container } from "../../design-system";
import { storageService } from "../../services/storage.service";
import { useTranslation } from "../../i18n/I18nProvider";
import { useAuthorization } from "../../security/useAuthorization";

function VerifiedAccountIcon({ label }: { label: string }): React.ReactElement {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-account-verified-icon
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-control border border-success-border bg-success-surface text-success"
    >
      <ShieldCheck className="h-icon-xs w-icon-xs" aria-hidden="true" />
    </span>
  );
}

export const AccountLayout: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, logout } = useAuth();
  const { unreadCount: unreadNotifCount } = useNotifications();
  const { canAccessRoute } = useAuthorization();
  const navigate = useNavigate();
  const location = useLocation();
  const isMessagingRoute = location.pathname.startsWith("/compte/messages");

  const isPro = isProSeller(currentUser);
  const isVerified = showsVerifiedBadge(currentUser);
  const accountName = (
    currentUser?.companyName ||
    currentUser?.name ||
    "Mon Compte"
  ).replace(/\s+\([^)]*\)\s*$/, "");

  // Every badge here must be scoped to the signed-in user — see
  // storageService.getUnreadMessageCount for why.
  const unreadMsgCount = storageService.getUnreadMessageCount(currentUser?.id);
  const favCount = currentUser ? storageService.getFavorites().length : 0;
  const savedSearchCount = currentUser
    ? storageService.getSavedSearches().length
    : 0;
  const myListingsCount = currentUser
    ? storageService.getListings().filter((l) => l.sellerId === currentUser.id)
        .length
    : 0;

  const navItems = [
    {
      to: "/compte",
      label: "Vue d'ensemble",
      icon: <User className="w-icon-md h-icon-md" />,
      end: true,
      visible: canAccessRoute("accountOverview"),
    },
    {
      to: "/compte/annonces",
      label: "Mes annonces",
      icon: <List className="w-icon-md h-icon-md" />,
      count: myListingsCount,
      visible: canAccessRoute("accountListings"),
    },
    {
      to: "/compte/education",
      label: t("verticals.education.workspace"),
      icon: <GraduationCap className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountCourse"),
    },
    {
      to: "/compte/emploi",
      label: t("employment.nav.candidate"),
      icon: <Briefcase className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountEmploymentCandidate"),
    },
    {
      to: "/compte/favoris",
      label: "Mes favoris",
      icon: <Heart className="w-icon-md h-icon-md" />,
      count: favCount,
      visible: canAccessRoute("accountFavorites"),
    },
    {
      to: "/compte/recherches",
      label: "Recherches sauvegardées",
      icon: <Search className="w-icon-md h-icon-md" />,
      count: savedSearchCount,
      visible: canAccessRoute("accountSavedSearches"),
    },
    {
      to: "/compte/messages",
      label: "Messages & Offres",
      icon: <MessageSquare className="w-icon-md h-icon-md" />,
      count: unreadMsgCount,
      visible: canAccessRoute("accountMessages"),
    },
    {
      to: "/compte/notifications",
      label: "Notifications",
      icon: <Bell className="w-icon-md h-icon-md" />,
      count: unreadNotifCount,
      visible: canAccessRoute("accountNotifications"),
    },
    {
      to: "/compte/achats",
      label: "Transactions & Paiements",
      icon: <ShoppingBag className="w-icon-md h-icon-md" />,
      visible: canAccessRoute("accountPurchases"),
    },
    {
      to: routes.workspace.digitalPurchases(),
      label: t("digital.nav.purchases"),
      icon: <FileKey2 className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountDigitalPurchases"),
    },
    {
      to: routes.workspace.digitalSeller(),
      label: t("digital.nav.seller"),
      icon: <FileKey2 className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountDigitalSeller"),
    },
    {
      to: routes.workspace.finances(),
      label: "Paiements & Revenus",
      icon: <BadgeEuro className="w-icon-md h-icon-md" />,
      visible: canAccessRoute("accountFinances"),
    },
    {
      to: "/compte/verification",
      label: "Sécurité & Vérification",
      icon: <Shield className="w-icon-md h-icon-md text-success" />,
      visible: canAccessRoute("accountVerification"),
    },
    {
      to: "/compte/securite-compte",
      label: "Connexion & sécurité",
      icon: <KeyRound className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountSecurity"),
    },
    {
      to: "/compte/support",
      label: "Aide & Assistance",
      icon: <Headphones className="w-icon-md h-icon-md" />,
      visible: canAccessRoute("accountSupport"),
    },
    {
      to: routes.workspace.moderationAppeals(),
      label: "Décisions & Recours",
      icon: <Scale className="w-icon-md h-icon-md" />,
      visible: canAccessRoute("accountModerationAppeals"),
    },
    {
      to: "/compte/newsletter",
      label: "Newsletter & Alertes",
      icon: <Mail className="w-icon-md h-icon-md" />,
      visible: canAccessRoute("accountNewsletter"),
    },
    {
      to: "/compte/profil",
      label: "Mon profil & Coordonnées",
      icon: <Settings className="w-icon-md h-icon-md" />,
      visible: canAccessRoute("accountProfile"),
    },
  ].filter((item) => item.visible);

  const proNavItems = [
    {
      to: routes.immo.workspace(),
      label: "Espace Immo",
      icon: <Building2 className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountRealEstate"),
    },
    {
      to: routes.auto.workspace(),
      label: "Espace Auto",
      icon: <CarFront className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountAuto"),
    },
    {
      to: routes.courses.organization(),
      label: t("verticals.education.organizationWorkspace"),
      icon: <GraduationCap className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountCourseOrganization"),
    },
    {
      to: routes.employment.recruiterWorkspace(),
      label: t("employment.nav.recruiter"),
      icon: <Users className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountEmploymentRecruiter"),
    },
    {
      to: routes.workspace.pro.dashboard(),
      label: "Dashboard Pro",
      icon: <BarChart3 className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountProDashboard"),
    },
    {
      to: routes.workspace.pro.prospects(),
      label: "Prospects B2B",
      icon: <Target className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountProProspects"),
    },
    {
      to: routes.workspace.pro.storefront(),
      label: "Personnaliser ma vitrine",
      icon: <Briefcase className="w-icon-md h-icon-md text-primary" />,
      visible: canAccessRoute("accountProStorefront"),
    },
    {
      to: routes.workspace.pro.subscriptions(),
      label: "Mon forfait & Facturation",
      icon: <Sparkles className="w-icon-md h-icon-md text-amber-500" />,
      visible: canAccessRoute("accountProSubscriptions"),
    },
    {
      to: routes.workspace.pro.finances(),
      label: "Finances de l’organisation",
      icon: <BadgeEuro className="w-icon-md h-icon-md text-success" />,
      visible: canAccessRoute("accountProFinances"),
    },
  ].filter((item) => item.visible);

  return (
    <Container
      width={isMessagingRoute ? "full" : "page"}
      gutter={isMessagingRoute ? "none" : "standard"}
      className={
        isMessagingRoute
          ? "py-0 md:max-w-page md:px-6 md:py-7 lg:px-8"
          : "py-5 sm:py-7"
      }
    >
      <div
        className={`grid min-w-0 grid-cols-1 lg:grid-cols-4 ${
          isMessagingRoute ? "gap-0 md:gap-7" : "gap-5 sm:gap-7"
        }`}
      >
        {/* Mobile & Tablet Navigation Header (< lg).
            `min-w-0` is required: a grid item defaults to `min-width:auto`, so
            without it the nested `overflow-x-auto` rail stretches the whole
            track and the page scrolls sideways on phones. */}
        <div
          className={`${
            isMessagingRoute ? "hidden" : "block"
          } min-w-0 space-y-3 rounded-card border border-border-base bg-bg-surface p-4 shadow-xs lg:hidden`}
        >
          {/* User Quick Info */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={currentUser?.avatarUrl}
                name={accountName}
                size="md"
                isVerified={currentUser?.isVerified}
              />
              <div className="min-w-0">
                <div
                  className="flex min-w-0 items-center gap-1"
                  data-account-identity
                >
                  <span
                    className="min-w-0 truncate font-bold text-xs text-stone-900 sm:text-sm"
                    title={accountName}
                  >
                    {accountName}
                  </span>
                  {isVerified && (
                    <VerifiedAccountIcon label={t("ui.badge.profilVerifie")} />
                  )}
                </div>
                <div
                  className="text-xs text-stone-500 truncate"
                  title={currentUser?.email}
                >
                  {currentUser?.email}
                </div>
              </div>
            </div>
            <div>
              {isPro ? (
                <Badge variant="pro" size="sm" icon>
                  {t("shell.accountLayout.proBadge")}
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  Particulier
                </Badge>
              )}
            </div>
          </div>

          {/* Horizontally scrollable navigation tabs */}
          <nav
            aria-label={t("shell.accountLayout.navigationDuCompte")}
            className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1 -mx-1 px-1 no-scrollbar"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-control-sm items-center gap-1.5 px-3 text-xs font-semibold rounded-control whitespace-nowrap motion-interactive shrink-0 ${
                    isActive
                      ? "bg-primary text-white shadow-xs"
                      : "bg-bg-subtle text-stone-700 hover:bg-bg-muted hover:text-stone-900"
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
                    `flex min-h-control-sm items-center gap-1.5 px-3 text-xs font-semibold rounded-control whitespace-nowrap motion-interactive shrink-0 ${
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : "bg-warning-surface text-warning border border-warning-border hover:bg-warning-surface"
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
          <div className="bg-bg-surface rounded-card border border-border-base p-5 sticky top-20 shadow-xs">
            {/* User Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-border-subtle">
              <Avatar
                src={currentUser?.avatarUrl}
                name={accountName}
                size="xl"
                isVerified={currentUser?.isVerified}
              />
              <div className="min-w-0 flex-1">
                <div
                  className="flex min-w-0 items-center gap-1"
                  data-account-identity
                >
                  <span
                    className="min-w-0 truncate text-sm font-bold text-stone-900"
                    title={accountName}
                  >
                    {accountName}
                  </span>
                  {isVerified && (
                    <VerifiedAccountIcon label={t("ui.badge.profilVerifie")} />
                  )}
                </div>
                <div
                  className="text-xs text-stone-500 truncate"
                  title={currentUser?.email}
                >
                  {currentUser?.email}
                </div>
                <div className="mt-1.5">
                  {isPro ? (
                    <Badge variant="pro" size="sm" icon>
                      {t("shell.accountLayout.proBadge")}
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Particulier
                    </Badge>
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
                    `flex min-h-control-sm items-center justify-between px-3 text-xs font-semibold rounded-control motion-interactive ${
                      isActive
                        ? "bg-primary-light text-primary"
                        : "text-stone-700 hover:bg-bg-subtle hover:text-stone-900"
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
                        `flex min-h-control-sm items-center justify-between px-3 text-xs font-semibold rounded-control motion-interactive ${
                          isActive
                            ? "bg-primary-light text-primary"
                            : "text-stone-700 hover:bg-bg-subtle hover:text-stone-900"
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
                  className="w-full min-h-control-sm flex items-center gap-2.5 px-3 text-xs font-semibold text-danger hover:bg-danger-surface rounded-control motion-interactive cursor-pointer text-left"
                >
                  <LogOut className="w-icon-md h-icon-md text-danger" />
                  <span>{t("shell.accountLayout.seDeconnecter")}</span>
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
    </Container>
  );
};
