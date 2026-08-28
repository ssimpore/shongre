"use client";

import App from "../src/App";
import type { MarketContext } from "@shongre/contracts";
import type { ShongreApplicationId } from "../src/platform/applications/application-registry";

export function WebApplication({
  pathname,
  marketContext,
  applicationId = "marketplace",
}: {
  pathname: string;
  marketContext: MarketContext;
  applicationId?: ShongreApplicationId;
}) {
  return (
    <App
      initialPath={pathname}
      routingBasePath={marketContext.routingBasePath}
      marketContext={marketContext}
      applicationId={applicationId}
    />
  );
}
