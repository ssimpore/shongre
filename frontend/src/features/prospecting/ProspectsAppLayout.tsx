import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ContactRound,
  Database,
  FileCheck2,
  Gauge,
  History,
  ListFilter,
  MailCheck,
  Search,
  Settings2,
  Target,
  UsersRound,
  CreditCard,
} from "lucide-react";
import type { Capability } from "@shongre/contracts/access-control";
import { Container } from "../../design-system";
import { useAuth } from "../../app/providers/AuthProvider";
import { CrmSurfaceProvider, prospectsPaths } from "../crm/CrmSurfaceContext";

const navigation: ReadonlyArray<{
  label: string;
  to: string;
  capability: Capability;
  icon: typeof Gauge;
}> = [
  {
    label: "Vue d’ensemble",
    to: prospectsPaths.overview,
    capability: "crm.dashboard.read",
    icon: Gauge,
  },
  {
    label: "Découvrir",
    to: prospectsPaths.discover,
    capability: "crm.prospecting.read",
    icon: Search,
  },
  {
    label: "Entreprises",
    to: prospectsPaths.companies,
    capability: "crm.accounts.read",
    icon: Building2,
  },
  {
    label: "Contacts",
    to: prospectsPaths.contacts,
    capability: "crm.contacts.read",
    icon: ContactRound,
  },
  {
    label: "Listes",
    to: prospectsPaths.lists,
    capability: "crm.accounts.read",
    icon: ListFilter,
  },
  {
    label: "Pipeline",
    to: prospectsPaths.pipeline,
    capability: "crm.opportunities.read",
    icon: Target,
  },
  {
    label: "Tâches",
    to: prospectsPaths.tasks,
    capability: "crm.tasks.read",
    icon: FileCheck2,
  },
  {
    label: "Activités",
    to: prospectsPaths.activities,
    capability: "crm.activities.read",
    icon: History,
  },
  {
    label: "Campagnes",
    to: prospectsPaths.campaigns,
    capability: "marketing.campaigns.read",
    icon: MailCheck,
  },
  {
    label: "Analytique",
    to: prospectsPaths.analytics,
    capability: "crm.analytics.read",
    icon: BarChart3,
  },
  {
    label: "Sources",
    to: prospectsPaths.sources,
    capability: "crm.prospecting.read",
    icon: Database,
  },
  {
    label: "Équipe",
    to: prospectsPaths.team,
    capability: "crm.configuration.manage",
    icon: UsersRound,
  },
  {
    label: "Facturation",
    to: prospectsPaths.billing,
    capability: "subscription.manage.own",
    icon: CreditCard,
  },
  {
    label: "Paramètres",
    to: prospectsPaths.settings,
    capability: "crm.configuration.manage",
    icon: Settings2,
  },
];

export function ProspectsAppLayout() {
  const { can, currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const visibleNavigation = navigation.filter((item) => can(item.capability));
  const primaryNavigation = visibleNavigation.filter((item) =>
    [
      prospectsPaths.overview,
      prospectsPaths.discover,
      prospectsPaths.companies,
      prospectsPaths.contacts,
      prospectsPaths.lists,
      prospectsPaths.pipeline,
      prospectsPaths.tasks,
      prospectsPaths.campaigns,
    ].includes(item.to),
  );
  const utilityNavigation = visibleNavigation.filter(
    (item) => !primaryNavigation.includes(item),
  );
  const activePath = location.pathname.startsWith("/app/opportunities/")
    ? prospectsPaths.pipeline
    : (visibleNavigation.find((item) =>
        item.to === prospectsPaths.overview
          ? location.pathname === item.to
          : location.pathname === item.to ||
            location.pathname.startsWith(`${item.to}/`),
      )?.to ?? prospectsPaths.overview);

  const desktopLinks = (items: typeof visibleNavigation, label: string) => (
    <nav aria-label={label} className="flex flex-wrap gap-1">
      {items.map(({ label: itemLabel, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === prospectsPaths.overview}
          className={({ isActive }) =>
            `inline-flex h-control-sm items-center gap-1.5 rounded-control px-2.5 text-micro font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isActive
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-bg-muted hover:text-text-main"
            }`
          }
        >
          <Icon className="h-icon-sm w-icon-sm" aria-hidden="true" />
          {itemLabel}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <CrmSurfaceProvider paths={prospectsPaths}>
      <Container width="page" className="py-4 sm:py-6">
        <header className="mb-4 space-y-3 border-b border-border-base pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <NavLink
                to={prospectsPaths.overview}
                end
                className="text-lg font-black tracking-tight text-text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Shongre Prospects
              </NavLink>
              <p className="mt-0.5 text-micro text-text-muted">
                Prospection et CRM de votre organisation
              </p>
            </div>
            <div className="min-w-0 rounded-control border border-border-base bg-bg-subtle px-3 py-2 text-left sm:text-right">
              <p className="text-micro font-semibold uppercase tracking-wider text-text-secondary">
                Organisation active
              </p>
              <p className="truncate text-xs font-black text-text-main">
                {currentUser?.companyName ?? currentUser?.name}
              </p>
            </div>
          </div>

          <div className="lg:hidden">
            <label
              htmlFor="prospects-section-navigation"
              className="mb-1.5 block text-micro font-bold text-text-secondary"
            >
              Section de l’espace
            </label>
            <select
              id="prospects-section-navigation"
              value={activePath}
              onChange={(event) => navigate(event.target.value)}
              className="h-control-md w-full rounded-control border border-border-base bg-bg-surface px-3 text-xs font-bold text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              {visibleNavigation.map((item) => (
                <option key={item.to} value={item.to}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden space-y-2 lg:block">
            {desktopLinks(
              primaryNavigation,
              "Navigation principale de Shongre Prospects",
            )}
            {utilityNavigation.length > 0 && (
              <div className="border-t border-border-subtle pt-2">
                {desktopLinks(
                  utilityNavigation,
                  "Outils et paramètres de Shongre Prospects",
                )}
              </div>
            )}
          </div>
        </header>
        <Outlet />
      </Container>
    </CrmSurfaceProvider>
  );
}
