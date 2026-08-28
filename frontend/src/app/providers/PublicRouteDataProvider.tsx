import React, { createContext, useContext } from "react";
import type { PublicRouteData } from "../../platform/seo/public-route-data";

const PublicRouteDataContext = createContext<PublicRouteData | null>(null);

export function PublicRouteDataProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: PublicRouteData | null;
}) {
  return (
    <PublicRouteDataContext.Provider value={initialData ?? null}>
      {children}
    </PublicRouteDataContext.Provider>
  );
}

export function usePublicRouteData(): PublicRouteData | null {
  return useContext(PublicRouteDataContext);
}
