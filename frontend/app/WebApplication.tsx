"use client";

import App from "../src/App";
import type { MarketContext } from "@shongre/contracts";
import type { ShongreApplicationId } from "../src/platform/applications/application-registry";
import type { PublicRouteData } from "../src/platform/seo/public-route-data";

export function WebApplication({
  pathname,
  marketContext,
  applicationId = "marketplace",
  initialPublicRouteData,
}: {
  pathname: string;
  marketContext: MarketContext;
  applicationId?: ShongreApplicationId;
  initialPublicRouteData?: PublicRouteData | null;
}) {
  return (
    <App
      initialPath={pathname}
      routingBasePath={marketContext.routingBasePath}
      marketContext={marketContext}
      applicationId={applicationId}
      initialPublicRouteData={initialPublicRouteData}
    />
  );
}
