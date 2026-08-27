import { createContext, useContext, type ReactNode } from "react";
import { routes } from "../../configuration/routes";

export interface CrmSurfacePaths {
  kind: "admin" | "prospects";
  overview: string;
  discover: string;
  companies: string;
  company: (id: string) => string;
  contacts: string;
  contact: (id: string) => string;
  lists: string;
  pipeline: string;
  opportunity: (id: string) => string;
  tasks: string;
  activities: string;
  campaigns: string;
  analytics: string;
  sources: string;
  team: string;
  billing: string;
  settings: string;
}

const adminPaths: CrmSurfacePaths = {
  kind: "admin",
  overview: "/admin/crm",
  discover: "/admin/crm/prospection",
  companies: "/admin/crm/entreprises",
  company: (id) => `/admin/crm/entreprises/${encodeURIComponent(id)}`,
  contacts: "/admin/crm/contacts",
  contact: (id) => `/admin/crm/contacts/${encodeURIComponent(id)}`,
  lists: "/admin/crm/entreprises",
  pipeline: "/admin/crm/pipeline",
  opportunity: (id) => `/admin/crm/opportunites/${encodeURIComponent(id)}`,
  tasks: "/admin/crm/taches",
  activities: "/admin/crm",
  campaigns: "/admin/newsletter",
  analytics: "/admin/crm/rapports",
  sources: "/admin/crm/configuration/providers",
  team: "/admin/roles",
  billing: "/admin/monetisation",
  settings: "/admin/crm/configuration",
};

export const prospectsPaths: CrmSurfacePaths = {
  kind: "prospects",
  overview: routes.prospects.workspace(),
  discover: routes.prospects.discover(),
  companies: routes.prospects.companies(),
  company: routes.prospects.company,
  contacts: routes.prospects.contacts(),
  contact: routes.prospects.contact,
  lists: routes.prospects.lists(),
  pipeline: routes.prospects.pipeline(),
  opportunity: routes.prospects.opportunity,
  tasks: routes.prospects.tasks(),
  activities: routes.prospects.activities(),
  campaigns: routes.prospects.campaigns(),
  analytics: routes.prospects.analytics(),
  sources: routes.prospects.sources(),
  team: routes.prospects.team(),
  billing: routes.prospects.billing(),
  settings: routes.prospects.settings(),
};

const CrmSurfaceContext = createContext<CrmSurfacePaths>(adminPaths);

export function CrmSurfaceProvider({
  paths,
  children,
}: {
  paths: CrmSurfacePaths;
  children: ReactNode;
}) {
  return (
    <CrmSurfaceContext.Provider value={paths}>
      {children}
    </CrmSurfaceContext.Provider>
  );
}

export function useCrmSurface(): CrmSurfacePaths {
  return useContext(CrmSurfaceContext);
}
