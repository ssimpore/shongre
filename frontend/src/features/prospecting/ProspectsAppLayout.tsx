import { NavLink, Outlet } from "react-router-dom";
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
  const { can } = useAuth();
  const visibleNavigation = navigation.filter((item) => can(item.capability));

  return (
    <CrmSurfaceProvider paths={prospectsPaths}>
      <Container width="page" className="py-4 sm:py-6">
        <header className="mb-4 flex flex-col gap-3 border-b border-border-base pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <NavLink
              to={prospectsPaths.overview}
              end
              className="text-lg font-black tracking-tight text-text-main"
            >
              Shongre Prospects
            </NavLink>
            <p className="mt-0.5 text-micro text-text-muted">
              Prospection et CRM de votre organisation
            </p>
          </div>
          <nav
            aria-label="Navigation de Shongre Prospects"
            className="flex max-w-full gap-1 overflow-x-auto pb-1"
          >
            {visibleNavigation.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === prospectsPaths.overview}
                className={({ isActive }) =>
                  `inline-flex h-control-sm shrink-0 items-center gap-1.5 rounded-control px-2.5 text-micro font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-text-secondary hover:bg-bg-muted hover:text-text-main"
                  }`
                }
              >
                <Icon className="h-icon-sm w-icon-sm" aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>
        <Outlet />
      </Container>
    </CrmSurfaceProvider>
  );
}
